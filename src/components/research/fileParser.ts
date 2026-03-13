import * as pdfjsLib from "pdfjs-dist";

// Use CDN worker to avoid bundling issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

export type FileAttachment = {
  id: string;
  name: string;
  type: "image" | "pdf" | "document";
  mimeType: string;
  /** base64 data URL for images */
  dataUrl?: string;
  /** Extracted text for PDFs/docs */
  extractedText?: string;
  /** thumbnail for preview */
  thumbnail?: string;
  size: number;
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function getFileCategory(mime: string): "image" | "pdf" | "document" {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  return "document";
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  const maxPages = Math.min(pdf.numPages, 50);

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: any) => item.str)
      .join(" ");
    pages.push(`--- Page ${i} ---\n${text}`);
  }

  return pages.join("\n\n");
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export async function processFile(file: File): Promise<FileAttachment> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File "${file.name}" exceeds 20MB limit.`);
  }

  const category = getFileCategory(file.type);
  const attachment: FileAttachment = {
    id: generateId(),
    name: file.name,
    type: category,
    mimeType: file.type,
    size: file.size,
  };

  if (category === "image") {
    attachment.dataUrl = await readAsDataUrl(file);
    attachment.thumbnail = attachment.dataUrl;
  } else if (category === "pdf") {
    const buffer = await readAsArrayBuffer(file);
    attachment.extractedText = await extractPdfText(buffer);
    attachment.thumbnail = undefined;
  } else {
    // Text-based documents (.txt, .md, .csv, .docx plaintext fallback)
    try {
      attachment.extractedText = await readAsText(file);
    } catch {
      throw new Error(`Cannot read file "${file.name}". Unsupported format.`);
    }
  }

  return attachment;
}

/** Build the OpenAI-compatible message content array */
export function buildMessageContent(
  text: string,
  attachments: FileAttachment[]
): any {
  if (attachments.length === 0) return text;

  const parts: any[] = [];

  // Add file context
  for (const att of attachments) {
    if (att.type === "image" && att.dataUrl) {
      parts.push({
        type: "image_url",
        image_url: { url: att.dataUrl, detail: "high" },
      });
    } else if (att.extractedText) {
      parts.push({
        type: "text",
        text: `[Uploaded file: ${att.name}]\n\n${att.extractedText}`,
      });
    }
  }

  // Add user text
  if (text) {
    parts.push({ type: "text", text });
  }

  return parts;
}

export const ACCEPTED_FILE_TYPES =
  "image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/markdown,text/csv,.txt,.md,.csv,.pdf,.jpg,.jpeg,.png,.gif,.webp";
