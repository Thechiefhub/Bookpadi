import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, FileText, Sparkles, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
}

export default function StudyGuide() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [guideText, setGuideText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [courseRes, topicsRes] = await Promise.all([
        supabase.from("courses").select("*").eq("id", id).single(),
        supabase.from("topics").select("id, title, content, sort_order").eq("course_id", id).order("sort_order"),
      ]);
      if (courseRes.data) setCourse(courseRes.data);
      if (topicsRes.data) setTopics(topicsRes.data);
      setLoading(false);
    };
    load();
  }, [id]);

  const handleGenerate = useCallback(async () => {
    if (!course) return;
    setGuideText("");
    setGenerating(true);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-study-guide`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            courseTitle: course.title,
            courseCode: course.course_code,
            topics: topics.map((t) => ({ title: t.title, content: t.content })),
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "AI service error" }));
        toast.error(err.error || "Failed to generate study guide");
        setGenerating(false);
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
              setGuideText(accumulated);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error("Study guide error:", e);
      toast.error("Failed to generate study guide");
    } finally {
      setGenerating(false);
    }
  }, [course, topics]);

  const handleSave = async () => {
    if (!guideText || !user || !course) return;
    setSaving(true);
    const { error } = await supabase.from("study_plans").insert({
      user_id: user.id,
      title: `Study Guide - ${course.course_code}`,
      type: "guide",
      data: { courseId: course.id, courseCode: course.course_code, courseTitle: course.title, content: guideText } as any,
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to save study guide");
    } else {
      toast.success("Study guide saved!");
    }
  };

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
        <Link to={`/course/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> Back to course
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <Badge variant="secondary" className="font-mono mb-2">{course.course_code}</Badge>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" /> Study Guide
            </h1>
            <p className="text-muted-foreground mt-1">{course.title}</p>
          </div>
        </div>

        {!guideText && !generating && (
          <Card>
            <CardContent className="py-10 text-center space-y-4">
              <Sparkles className="w-12 h-12 mx-auto text-amber-500 opacity-60" />
              <div>
                <p className="font-medium">Generate a study guide for this course</p>
                <p className="text-sm text-muted-foreground mt-1">
                  AI will create a comprehensive guide covering all {topics.length} topics
                </p>
              </div>
              <Button onClick={handleGenerate} className="gradient-primary hover:opacity-90">
                <Sparkles className="w-4 h-4" /> Generate Study Guide
              </Button>
            </CardContent>
          </Card>
        )}

        {(generating || guideText) && (
          <>
            <div className="flex justify-end gap-2">
              {guideText && !generating && (
                <>
                  <Button variant="outline" size="sm" onClick={handleGenerate}>
                    <Sparkles className="w-4 h-4" /> Regenerate
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Guide
                  </Button>
                </>
              )}
            </div>
            <Card>
              <CardContent className="py-6">
                {generating && !guideText && (
                  <div className="flex items-center gap-2 text-muted-foreground py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating study guide…
                  </div>
                )}
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {guideText && <ReactMarkdown>{guideText}</ReactMarkdown>}
                </div>
                {generating && guideText && (
                  <div className="flex items-center gap-2 text-muted-foreground mt-4 text-sm">
                    <Loader2 className="w-3 h-3 animate-spin" /> Still generating…
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
