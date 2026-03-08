import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, ArrowLeft, Pin, PinOff, BookOpen, ExternalLink, Youtube, Sparkles, FileText, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Course {
  id: string;
  course_code: string;
  title: string;
  description: string | null;
  units: number;
}

interface Topic {
  id: string;
  title: string;
  content: string | null;
  sort_order: number;
  external_links: any;
}

interface PinRecord {
  id: string;
  topic_id: string;
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [pins, setPins] = useState<PinRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [allExpanded, setAllExpanded] = useState(true);

  // AI Explain state
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainTopic, setExplainTopic] = useState<Topic | null>(null);
  const [explainText, setExplainText] = useState("");
  const [explainLoading, setExplainLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const [courseRes, topicsRes, pinsRes] = await Promise.all([
        supabase.from("courses").select("*").eq("id", id).single(),
        supabase.from("topics").select("*").eq("course_id", id).order("sort_order"),
        user
          ? supabase.from("pins").select("id, topic_id").eq("user_id", user.id)
          : Promise.resolve({ data: [] }),
      ]);
      if (courseRes.data) setCourse(courseRes.data);
      if (topicsRes.data) setTopics(topicsRes.data);
      if (pinsRes.data) setPins(pinsRes.data as PinRecord[]);
      setLoading(false);
    };
    fetch();
  }, [id, user]);

  const isPinned = (topicId: string) => pins.some((p) => p.topic_id === topicId);

  const togglePin = async (topicId: string) => {
    if (!user) return;
    const existing = pins.find((p) => p.topic_id === topicId);
    if (existing) {
      await supabase.from("pins").delete().eq("id", existing.id);
      setPins(pins.filter((p) => p.id !== existing.id));
      toast.success("Topic unpinned");
    } else {
      const { data } = await supabase
        .from("pins")
        .insert({ user_id: user.id, topic_id: topicId })
        .select("id, topic_id")
        .single();
      if (data) {
        setPins([...pins, data]);
        toast.success("Topic pinned!");
      }
    }
  };

  const handleExplain = useCallback(async (topic: Topic) => {
    setExplainTopic(topic);
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
            topicTitle: topic.title,
            topicContent: topic.content,
            courseTitle: course?.title || "",
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
  }, [course]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!course) {
    return (
      <AppLayout>
        <p className="text-center py-20 text-muted-foreground">Course not found.</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to courses
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <Badge variant="secondary" className="font-mono mb-2">{course.course_code}</Badge>
            <h1 className="text-2xl md:text-3xl font-bold">{course.title}</h1>
            {course.description && (
              <p className="mt-2 text-muted-foreground leading-relaxed">{course.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Link to={`/course/${id}/guide`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <FileText className="w-4 h-4" /> Study Guide
              </Button>
            </Link>
            <Link to={`/course/${id}/questions`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <BookOpen className="w-4 h-4" /> Practice Questions
              </Button>
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Topics ({topics.length})</h2>
            {topics.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => setAllExpanded(!allExpanded)}
              >
                {allExpanded ? (
                  <>
                    <ChevronsDownUp className="w-4 h-4" /> Collapse All
                  </>
                ) : (
                  <>
                    <ChevronsUpDown className="w-4 h-4" /> Expand All
                  </>
                )}
              </Button>
            )}
          </div>
          {topics.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No topics available for this course yet.</p>
              </CardContent>
            </Card>
          ) : (
            topics.map((topic, idx) => {
              const links = Array.isArray(topic.external_links) ? topic.external_links : [];
              return (
                <Card key={topic.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <span className="text-sm font-mono text-muted-foreground mt-0.5 shrink-0">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{topic.title}</CardTitle>
                          {links.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium shrink-0">
                              <ExternalLink className="w-3 h-3" />
                              {links.length}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleExplain(topic)}
                          title="Explain with AI"
                        >
                          <Sparkles className="w-4 h-4 text-amber-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => togglePin(topic.id)}
                        >
                          {isPinned(topic.id) ? (
                            <PinOff className="w-4 h-4 text-primary" />
                          ) : (
                            <Pin className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {allExpanded && (
                    <CardContent className="border-t bg-muted/30">
                      {topic.content ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{topic.content}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No content available for this topic.</p>
                      )}
                      {links.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h4 className="text-sm font-semibold">Resources</h4>
                          {links.map((link: any, i: number) => (
                            <a
                              key={i}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              {link.url?.includes("youtube") ? (
                                <Youtube className="w-4 h-4" />
                              ) : (
                                <ExternalLink className="w-4 h-4" />
                              )}
                              {link.title || link.url}
                            </a>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>
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
              {explainTopic?.title}
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
