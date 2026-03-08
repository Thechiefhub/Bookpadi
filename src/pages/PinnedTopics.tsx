import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Pin, Save, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface PinnedTopic {
  id: string;
  topic_id: string;
  notes: string | null;
  topics: {
    id: string;
    title: string;
    content: string | null;
    courses: {
      course_code: string;
      title: string;
    };
  };
}

export default function PinnedTopics() {
  const { user } = useAuth();
  const [pinned, setPinned] = useState<PinnedTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  // AI Explain state
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainPin, setExplainPin] = useState<PinnedTopic | null>(null);
  const [explainText, setExplainText] = useState("");
  const [explainLoading, setExplainLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("pins")
      .select("id, topic_id, notes, topics(id, title, content, courses(course_code, title))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setPinned(data as unknown as PinnedTopic[]);
        setLoading(false);
      });
  }, [user]);

  const saveNotes = async (pinId: string) => {
    setSaving(pinId);
    const { error } = await supabase
      .from("pins")
      .update({ notes: editingNotes[pinId] ?? "" })
      .eq("id", pinId);
    setSaving(null);
    if (error) {
      toast.error("Failed to save notes");
    } else {
      toast.success("Notes saved!");
      setPinned(pinned.map(p => p.id === pinId ? { ...p, notes: editingNotes[pinId] ?? "" } : p));
    }
  };

  const removePin = async (pinId: string) => {
    await supabase.from("pins").delete().eq("id", pinId);
    setPinned(pinned.filter(p => p.id !== pinId));
    toast.success("Topic unpinned");
  };

  const handleExplain = useCallback(async (pin: PinnedTopic) => {
    setExplainPin(pin);
    setExplainText("");
    setExplainOpen(true);
    setExplainLoading(true);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/explain-topic`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            topicTitle: pin.topics.title,
            topicContent: pin.topics.content,
            courseTitle: pin.topics.courses.title,
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "AI service error" }));
        toast.error(err.error || "Failed to get explanation");
        setExplainLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setExplainText(accumulated);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error("Explain error:", e);
      toast.error("Failed to get AI explanation");
    } finally {
      setExplainLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Pin className="w-6 h-6 text-primary" /> Pinned Topics
          </h1>
          <p className="text-muted-foreground mt-1">Your saved topics with personal notes</p>
        </div>

        {pinned.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Pin className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No pinned topics yet. Pin topics from your courses to save them here.</p>
            </CardContent>
          </Card>
        ) : (
          pinned.map((pin) => (
            <Card key={pin.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-mono text-muted-foreground">
                      {pin.topics.courses.course_code} · {pin.topics.courses.title}
                    </p>
                    <CardTitle className="text-base mt-1">{pin.topics.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleExplain(pin)}
                      title="Explain with AI"
                    >
                      <Sparkles className="w-4 h-4 text-amber-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removePin(pin.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {pin.topics.content && (
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {pin.topics.content}
                  </p>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Notes</label>
                  <Textarea
                    placeholder="Write your notes here..."
                    value={editingNotes[pin.id] ?? pin.notes ?? ""}
                    onChange={(e) => setEditingNotes({ ...editingNotes, [pin.id]: e.target.value })}
                    rows={4}
                  />
                  <Button
                    size="sm"
                    onClick={() => saveNotes(pin.id)}
                    disabled={saving === pin.id}
                    className="gap-1"
                  >
                    {saving === pin.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Save Notes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* AI Explain Dialog */}
      <Dialog open={explainOpen} onOpenChange={setExplainOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              AI Explanation
            </DialogTitle>
            <DialogDescription>
              {explainPin?.topics.title}
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {explainLoading && !explainText && (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating explanation…
              </div>
            )}
            {explainText && <ReactMarkdown>{explainText}</ReactMarkdown>}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
