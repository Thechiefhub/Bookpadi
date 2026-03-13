import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileAttachment } from "./fileParser";
import { ACCEPTED_FILE_TYPES } from "./fileParser";

type Props = {
  attachments: FileAttachment[];
  onAdd: (files: FileList) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function FileUploadArea({ attachments, onAdd, onRemove, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex gap-2 flex-wrap px-1 pb-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="relative group flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-xs max-w-[200px]"
            >
              {att.type === "image" && att.thumbnail ? (
                <img
                  src={att.thumbnail}
                  alt={att.name}
                  className="w-8 h-8 rounded object-cover shrink-0"
                />
              ) : att.type === "pdf" ? (
                <FileText className="w-5 h-5 text-red-500 shrink-0" />
              ) : (
                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{att.name}</p>
                <p className="text-muted-foreground">{formatSize(att.size)}</p>
              </div>
              <button
                onClick={() => onRemove(att.id)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={disabled}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload trigger button */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onAdd(e.target.files);
          e.target.value = "";
        }}
        disabled={disabled}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="h-11 w-11 rounded-xl shrink-0"
        title="Attach files (images, PDFs, documents)"
      >
        <Paperclip className="w-4 h-4" />
      </Button>
    </>
  );
}
