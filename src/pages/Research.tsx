import { useCallback, useEffect, useRef, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Send,
  Microscope,
  Plus,
  Save,
  Trash2,
  FileDown,
  ChevronLeft,
  User,
  Bot,
  Sparkles,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { exportChatToPdf } from "@/components/research/exportPdf";
import { useAuth } from "@/hooks/useAuth";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";
import { processFile, buildMessageContent, type FileAttachment } from "@/components/research/fileParser";
import FileUploadArea from "@/components/research/FileUploadArea";

type MsgContent = string | any[];
type Msg = { role: "user" | "assistant"; content: MsgContent };
type DisplayMsg = { role: "user" | "assistant"; content: string; attachments?: FileAttachment[] };

type SavedConversation = {
  id: string;
  title: string;
  created_at: string;
  data: { messages: Msg[] };
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research-chat`;

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    const errBody = await resp.json().catch(() => null);
    onError(errBody?.error || `Request failed (${resp.status})`);
    return;
  }

  if (!resp.body) {
    onError("No response body");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") {
        onDone();
        return;
      }
      try {
        const parsed = JSON.parse(json);
        const c = parsed.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch {
        /* partial */
      }
    }
  }
  onDone();
}

// ─── Suggestion chips for empty state ────────────────────
const suggestions = [
  "Help me find a research topic on machine learning for healthcare in Nigeria",
  "What are the key components of a good undergraduate research proposal?",
  "Explain Bayesian statistics and how it applies to economic forecasting",
  "Compare qualitative and quantitative research methodologies",
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <Bot className="w-5 h-5 text-primary shrink-0" />
      <div className="flex gap-1 ml-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function ChatBubble({ msg, isLast }: { msg: DisplayMsg; isLast: boolean }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-3 px-4 py-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}
      <div
        className={cn(
          "rounded-2xl px-4 py-3 max-w-[85%] md:max-w-[75%] text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md"
        )}
      >
        {/* Attachment thumbnails */}
        {msg.attachments && msg.attachments.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-2">
            {msg.attachments.map((att) =>
              att.type === "image" && att.thumbnail ? (
                <img key={att.id} src={att.thumbnail} alt={att.name} className="w-20 h-20 rounded-lg object-cover" />
              ) : (
                <div key={att.id} className="flex items-center gap-1.5 rounded-md bg-background/20 px-2 py-1 text-xs">
                  <span>📎</span>
                  <span className="truncate max-w-[120px]">{att.name}</span>
                </div>
              )
            )}
          </div>
        )}
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:mt-2 [&_h3]:mb-1 [&_.katex]:text-[0.95em]">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{msg.content}</ReactMarkdown>
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
          <User className="w-4 h-4 text-secondary-foreground" />
        </div>
      )}
    </div>
  );
}

export default function Research() {
  const { user } = useAuth();
  const [displayMessages, setDisplayMessages] = useState<DisplayMsg[]>([]);
  const [apiMessages, setApiMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [processingFiles, setProcessingFiles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [savedConvos, setSavedConvos] = useState<SavedConversation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages, isStreaming, scrollToBottom]);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoadingHistory(true);
    const { data } = await supabase
      .from("study_plans")
      .select("id, title, created_at, data")
      .eq("user_id", user.id)
      .eq("type", "research_chat")
      .order("created_at", { ascending: false });
    setSavedConvos((data as unknown as SavedConversation[]) || []);
    setLoadingHistory(false);
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleAddFiles = async (files: FileList) => {
    setProcessingFiles(true);
    try {
      const newAttachments: FileAttachment[] = [];
      for (const file of Array.from(files)) {
        const att = await processFile(file);
        newAttachments.push(att);
      }
      setAttachments((prev) => [...prev, ...newAttachments]);
    } catch (err: any) {
      toast.error(err.message || "Failed to process file.");
    }
    setProcessingFiles(false);
  };

  const handleRemoveFile = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const send = async (text?: string) => {
    const content = (text || input).trim();
    if ((!content && attachments.length === 0) || isStreaming) return;
    setInput("");
    const currentAttachments = [...attachments];
    setAttachments([]);

    // Build display message
    const displayMsg: DisplayMsg = { role: "user", content, attachments: currentAttachments.length > 0 ? currentAttachments : undefined };
    const newDisplayMessages = [...displayMessages, displayMsg];
    setDisplayMessages(newDisplayMessages);

    // Build API message with multimodal content
    const apiContent = buildMessageContent(content, currentAttachments);
    const apiMsg: Msg = { role: "user", content: apiContent };
    const newApiMessages = [...apiMessages, apiMsg];
    setApiMessages(newApiMessages);

    setIsStreaming(true);

    let assistantContent = "";
    const upsert = (chunk: string) => {
      assistantContent += chunk;
      setDisplayMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
      setApiMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      await streamChat({
        messages: newApiMessages,
        onDelta: upsert,
        onDone: () => setIsStreaming(false),
        onError: (msg) => {
          toast.error(msg);
          setIsStreaming(false);
        },
      });
    } catch {
      toast.error("Failed to connect to research assistant.");
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleNewChat = () => {
    setDisplayMessages([]);
    setApiMessages([]);
    setAttachments([]);
    setInput("");
    setShowHistory(false);
    inputRef.current?.focus();
  };

  const handleSave = async () => {
    if (!user || displayMessages.length < 2) return;
    setSaving(true);
    const title = typeof displayMessages[0].content === "string" ? displayMessages[0].content.slice(0, 80) : "Research";
    const { error } = await supabase.from("study_plans").insert({
      user_id: user.id,
      title: `Research — ${title}`,
      type: "research_chat",
      data: { messages: displayMessages.map(m => ({ role: m.role, content: m.content })) } as any,
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to save conversation.");
      return;
    }
    toast.success("Conversation saved!");
    fetchHistory();
  };

  const handleDeleteConvo = async (id: string) => {
    const { error } = await supabase.from("study_plans").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete.");
      return;
    }
    toast.success("Deleted.");
    fetchHistory();
  };

  const handleLoadConvo = (convo: SavedConversation) => {
    const msgs = convo.data.messages || [];
    setDisplayMessages(msgs.map(m => ({ role: m.role, content: m.content as string })));
    setApiMessages(msgs);
    setShowHistory(false);
  };

  const hasMessages = displayMessages.length > 0;

  // ─── History sidebar view ───
  if (showHistory) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <h2 className="text-lg font-semibold">Saved Research Conversations</h2>
          </div>

          {loadingHistory && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loadingHistory && savedConvos.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-8">No saved conversations yet.</p>
          )}

          <div className="space-y-2">
            {savedConvos.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border p-3 gap-3 bg-card">
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => handleLoadConvo(c)}
                >
                  <p className="text-sm font-medium truncate">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString()} · {c.data.messages?.length || 0} messages
                  </p>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive shrink-0"
                  onClick={() => handleDeleteConvo(c.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  // ─── Main chat view ───
  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-5rem)] max-w-4xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between py-2 px-1 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Microscope className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">Research Assistant</h1>
              <p className="text-xs text-muted-foreground">Ask anything · Get scholarly answers</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {hasMessages && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    exportChatToPdf(displayMessages.map(m => ({ role: m.role, content: m.content })));
                    toast.success("Generating PDF…");
                  }}
                  disabled={isStreaming}
                  className="gap-1 text-xs"
                >
                  <FileDown className="w-3.5 h-3.5" /> PDF
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || isStreaming}
                  className="gap-1 text-xs"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={handleNewChat} className="gap-1 text-xs">
                  <Plus className="w-3.5 h-3.5" /> New
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowHistory(true);
                fetchHistory();
              }}
              className="gap-1 text-xs"
            >
              <History className="w-3.5 h-3.5" />
              History
            </Button>
          </div>
        </div>

        {/* Chat area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto border rounded-xl bg-card mb-3">
          {!hasMessages ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-1">AI Research Lab</h2>
              <p className="text-muted-foreground text-sm mb-6 max-w-md">
                Ask any research question, explore scholarly topics, or get help building your undergraduate project.
              </p>
              <div className="grid gap-2 w-full max-w-md">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left text-sm rounded-lg border p-3 hover:bg-muted transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-2">
              {displayMessages.map((m, i) => (
                <ChatBubble key={i} msg={m} isLast={i === displayMessages.length - 1} />
              ))}
              {isStreaming && displayMessages[displayMessages.length - 1]?.role !== "assistant" && <TypingIndicator />}
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="shrink-0 pb-2">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a research question…"
              rows={1}
              className="resize-none min-h-[44px] max-h-[120px] rounded-xl"
              disabled={isStreaming}
            />
            <Button
              size="icon"
              onClick={() => send()}
              disabled={isStreaming || !input.trim()}
              className="h-11 w-11 rounded-xl shrink-0"
            >
              {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            AI can make mistakes. Verify important information with your lecturer or official sources.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
