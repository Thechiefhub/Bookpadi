import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, HelpCircle, Sparkles, BookCheck, Save, ClipboardList } from "lucide-react";
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

type Mode = "quiz" | "theory";

async function streamFromEdge(
  body: Record<string, unknown>,
  onDelta: (text: string) => void
) {
  const resp = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-questions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "AI service error" }));
    throw new Error(err.error || "Failed to generate content");
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
          onDelta(accumulated);
        }
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }
  return accumulated;
}

export default function CourseQuestions() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<Mode | null>(null);
  const [questionsText, setQuestionsText] = useState("");
  const [answersText, setAnswersText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatingAnswers, setGeneratingAnswers] = useState(false);
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

  const handleGenerate = useCallback(async (selectedMode: Mode) => {
    if (!course) return;
    setMode(selectedMode);
    setQuestionsText("");
    setAnswersText("");
    setGenerating(true);

    try {
      await streamFromEdge(
        {
          courseTitle: course.title,
          courseCode: course.course_code,
          topics: topics.map((t) => ({ title: t.title, content: t.content })),
          mode: selectedMode,
        },
        (text) => setQuestionsText(text)
      );
    } catch (e: any) {
      toast.error(e.message || "Failed to generate questions");
    } finally {
      setGenerating(false);
    }
  }, [course, topics]);

  const handleShowAnswers = useCallback(async () => {
    if (!course || !questionsText) return;
    setAnswersText("");
    setGeneratingAnswers(true);

    try {
      await streamFromEdge(
        {
          courseTitle: course.title,
          courseCode: course.course_code,
          topics: topics.map((t) => ({ title: t.title, content: t.content })),
          mode,
          questions: questionsText,
        },
        (text) => setAnswersText(text)
      );
    } catch (e: any) {
      toast.error(e.message || "Failed to generate answers");
    } finally {
      setGeneratingAnswers(false);
    }
  }, [course, topics, mode, questionsText]);

  const handleSave = async () => {
    if (!user || !course || !questionsText) return;
    setSaving(true);
    const { error } = await supabase.from("study_plans").insert({
      user_id: user.id,
      title: `${mode === "quiz" ? "Quiz" : "Theory"} Questions - ${course.course_code}`,
      type: "questions",
      data: {
        courseId: course.id,
        courseCode: course.course_code,
        courseTitle: course.title,
        mode,
        questions: questionsText,
        answers: answersText || null,
      } as any,
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to save questions");
    } else {
      toast.success("Questions saved!");
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

        <div>
          <Badge variant="secondary" className="font-mono mb-2">{course.course_code}</Badge>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-primary" /> Practice Questions
          </h1>
          <p className="text-muted-foreground mt-1">{course.title}</p>
        </div>

        {/* Mode selection */}
        {!questionsText && !generating && (
          <Card>
            <CardContent className="py-10 text-center space-y-6">
              <Sparkles className="w-12 h-12 mx-auto text-amber-500 opacity-60" />
              <div>
                <p className="font-medium text-lg">Choose question format</p>
                <p className="text-sm text-muted-foreground mt-1">
                  AI will generate exam-style questions covering all {topics.length} topics
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => handleGenerate("quiz")}
                  className="gap-2 gradient-primary hover:opacity-90"
                  size="lg"
                >
                  <ClipboardList className="w-5 h-5" />
                  Objective / Quiz (MCQ)
                </Button>
                <Button
                  onClick={() => handleGenerate("theory")}
                  variant="outline"
                  size="lg"
                  className="gap-2"
                >
                  <BookCheck className="w-5 h-5" />
                  Theory / Essay
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Questions display */}
        {(generating || questionsText) && (
          <>
            <div className="flex justify-end gap-2 flex-wrap">
              {questionsText && !generating && (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleGenerate(mode!)}>
                    <Sparkles className="w-4 h-4" /> Regenerate
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </Button>
                </>
              )}
            </div>

            <Card>
              <CardContent className="py-6">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary">
                    {mode === "quiz" ? "Objective / Quiz" : "Theory / Essay"}
                  </Badge>
                </div>
                {generating && !questionsText && (
                  <div className="flex items-center gap-2 text-muted-foreground py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating {mode === "quiz" ? "quiz" : "theory"} questions…
                  </div>
                )}
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {questionsText && <ReactMarkdown>{questionsText}</ReactMarkdown>}
                </div>
                {generating && questionsText && (
                  <div className="flex items-center gap-2 text-muted-foreground mt-4 text-sm">
                    <Loader2 className="w-3 h-3 animate-spin" /> Still generating…
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Show Answers section */}
            {questionsText && !generating && (
              <div className="space-y-4">
                {!answersText && !generatingAnswers && (
                  <div className="text-center">
                    <Button
                      onClick={handleShowAnswers}
                      className="gap-2 gradient-primary hover:opacity-90"
                      size="lg"
                    >
                      <BookCheck className="w-5 h-5" />
                      Show Answers
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      AI will generate detailed answers for all the questions above
                    </p>
                  </div>
                )}

                {(generatingAnswers || answersText) && (
                  <Card>
                    <CardContent className="py-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                          Answers
                        </Badge>
                      </div>
                      {generatingAnswers && !answersText && (
                        <div className="flex items-center gap-2 text-muted-foreground py-4">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating answers…
                        </div>
                      )}
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {answersText && <ReactMarkdown>{answersText}</ReactMarkdown>}
                      </div>
                      {generatingAnswers && answersText && (
                        <div className="flex items-center gap-2 text-muted-foreground mt-4 text-sm">
                          <Loader2 className="w-3 h-3 animate-spin" /> Still generating…
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
