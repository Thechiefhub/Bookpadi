import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, HelpCircle, Sparkles, BookCheck, Save, ClipboardList, CheckCircle2, XCircle, Trophy, Timer, AlertTriangle } from "lucide-react";
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

interface ParsedQuestion {
  number: number;
  text: string;
  options: { letter: string; text: string }[];
}

type Mode = "quiz" | "theory";

// ── Parse MCQ markdown into structured questions ──
function parseQuizQuestions(markdown: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  // Split on **Question X:** pattern
  const blocks = markdown.split(/\*\*Question\s+(\d+):\*\*/i);
  // blocks: ["preamble", "1", "body...", "2", "body...", ...]
  for (let i = 1; i < blocks.length; i += 2) {
    const num = parseInt(blocks[i], 10);
    const body = (blocks[i + 1] || "").trim();

    // Extract options A-D
    const optionRegex = /^([A-D])\)\s*(.+)$/gm;
    const options: { letter: string; text: string }[] = [];
    let match: RegExpExecArray | null;
    while ((match = optionRegex.exec(body)) !== null) {
      options.push({ letter: match[1], text: match[2].trim() });
    }

    // Question text is everything before the first option
    const firstOptionIdx = body.search(/^[A-D]\)\s/m);
    const questionText = firstOptionIdx > -1 ? body.slice(0, firstOptionIdx).trim() : body.trim();

    if (options.length >= 2) {
      questions.push({ number: num, text: questionText, options });
    }
  }
  return questions;
}

// ── Parse correct answers from AI answer markdown ──
function parseCorrectAnswers(markdown: string): Record<number, string> {
  const answers: Record<number, string> = {};
  // Pattern: **Question X: LETTER)**
  const regex = /\*\*Question\s+(\d+):\s*([A-D])\)/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    answers[parseInt(match[1], 10)] = match[2].toUpperCase();
  }
  return answers;
}

// ── SSE streaming helper ──
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

// ── Interactive Question Card ──
function QuestionCard({
  q,
  selected,
  onSelect,
  correctAnswer,
  submitted,
}: {
  q: ParsedQuestion;
  selected: string | undefined;
  onSelect: (letter: string) => void;
  correctAnswer: string | undefined;
  submitted: boolean;
}) {
  const isCorrect = submitted && correctAnswer && selected === correctAnswer;
  const isWrong = submitted && correctAnswer && selected && selected !== correctAnswer;

  return (
    <Card className={`transition-all ${submitted ? (isCorrect ? "border-green-500/50 bg-green-500/5" : isWrong ? "border-destructive/50 bg-destructive/5" : "border-muted") : ""}`}>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-start gap-2">
          <span className="text-sm font-mono text-muted-foreground shrink-0 mt-0.5">
            {String(q.number).padStart(2, "0")}
          </span>
          <p className="text-sm font-medium leading-relaxed">{q.text}</p>
          {submitted && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
          {submitted && isWrong && <XCircle className="w-5 h-5 text-destructive shrink-0" />}
        </div>
        <div className="grid gap-2 pl-7">
          {q.options.map((opt) => {
            const isThisCorrect = submitted && correctAnswer === opt.letter;
            const isThisSelected = selected === opt.letter;
            const isThisWrong = submitted && isThisSelected && correctAnswer !== opt.letter;

            return (
              <button
                key={opt.letter}
                onClick={() => !submitted && onSelect(opt.letter)}
                disabled={submitted}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left text-sm transition-all
                  ${!submitted && isThisSelected ? "border-primary bg-primary/10 font-medium" : ""}
                  ${!submitted && !isThisSelected ? "border-border hover:border-primary/50 hover:bg-accent/50" : ""}
                  ${isThisCorrect ? "border-green-500 bg-green-500/10 font-medium text-green-700 dark:text-green-400" : ""}
                  ${isThisWrong ? "border-destructive bg-destructive/10 text-destructive line-through" : ""}
                  ${submitted && !isThisCorrect && !isThisWrong ? "border-border opacity-60" : ""}
                  disabled:cursor-default
                `}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border
                  ${!submitted && isThisSelected ? "bg-primary text-primary-foreground border-primary" : ""}
                  ${!submitted && !isThisSelected ? "border-muted-foreground/30" : ""}
                  ${isThisCorrect ? "bg-green-500 text-white border-green-500" : ""}
                  ${isThisWrong ? "bg-destructive text-destructive-foreground border-destructive" : ""}
                  ${submitted && !isThisCorrect && !isThisWrong ? "border-muted-foreground/20" : ""}
                `}>
                  {opt.letter}
                </span>
                {opt.text}
              </button>
            );
          })}
        </div>
        {submitted && !selected && correctAnswer && (
          <p className="text-xs text-muted-foreground pl-7 italic">You didn't answer this question. Correct answer: {correctAnswer})</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Score Summary ──
function ScoreSummary({ correct, total }: { correct: number; total: number }) {
  const pct = Math.round((correct / total) * 100);
  const color = pct >= 70 ? "text-green-500" : pct >= 50 ? "text-amber-500" : "text-destructive";

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardContent className="py-6 flex flex-col items-center gap-3">
        <Trophy className={`w-10 h-10 ${color}`} />
        <div className="text-center">
          <p className={`text-3xl font-bold ${color}`}>{correct}/{total}</p>
          <p className="text-sm text-muted-foreground mt-1">
            You scored {pct}% — {pct >= 70 ? "Excellent!" : pct >= 50 ? "Good effort, keep studying!" : "Keep practicing, you'll improve!"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Timer Display ──
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function TimerBar({ secondsLeft, totalSeconds }: { secondsLeft: number; totalSeconds: number }) {
  const pct = (secondsLeft / totalSeconds) * 100;
  const isLow = secondsLeft <= 60;
  const isCritical = secondsLeft <= 30;

  return (
    <div className={`sticky top-0 z-20 py-2.5 px-4 rounded-lg border flex items-center gap-3 transition-colors ${
      isCritical ? "bg-destructive/10 border-destructive/30" : isLow ? "bg-amber-500/10 border-amber-500/30" : "bg-card border-border"
    }`}>
      <Timer className={`w-5 h-5 shrink-0 ${isCritical ? "text-destructive animate-pulse" : isLow ? "text-amber-500" : "text-primary"}`} />
      <div className="flex-1 min-w-0">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isCritical ? "bg-destructive" : isLow ? "bg-amber-500" : "bg-primary"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className={`font-mono text-lg font-bold tabular-nums shrink-0 ${
        isCritical ? "text-destructive" : isLow ? "text-amber-500" : "text-foreground"
      }`}>
        {formatTime(secondsLeft)}
      </span>
      {isLow && !isCritical && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
    </div>
  );
}

const TIMER_OPTIONS = [
  { label: "No Timer", value: "0" },
  { label: "10 minutes", value: "600" },
  { label: "15 minutes", value: "900" },
  { label: "20 minutes", value: "1200" },
  { label: "30 minutes", value: "1800" },
  { label: "45 minutes", value: "2700" },
  { label: "1 hour", value: "3600" },
];

// ── Main Page ──
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

  // Interactive quiz state
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Timer state
  const [timerDuration, setTimerDuration] = useState(0); // seconds, 0 = no timer
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const autoSubmitRef = useRef(false);

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

  const parsedQuestions = useMemo(() => {
    if (mode !== "quiz" || !questionsText) return [];
    return parseQuizQuestions(questionsText);
  }, [mode, questionsText]);

  const correctAnswers = useMemo(() => {
    if (!answersText) return {};
    return parseCorrectAnswers(answersText);
  }, [answersText]);

  const score = useMemo(() => {
    if (!submitted || Object.keys(correctAnswers).length === 0) return null;
    let correct = 0;
    parsedQuestions.forEach((q) => {
      if (selections[q.number] && selections[q.number] === correctAnswers[q.number]) {
        correct++;
      }
    });
    return { correct, total: parsedQuestions.length };
  }, [submitted, correctAnswers, parsedQuestions, selections]);

  const handleGenerate = useCallback(async (selectedMode: Mode) => {
    if (!course) return;
    setMode(selectedMode);
    setQuestionsText("");
    setAnswersText("");
    setSelections({});
    setSubmitted(false);
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

  const handleSubmitQuiz = useCallback(async () => {
    if (!course || !questionsText) return;
    const answered = Object.keys(selections).length;
    if (answered === 0) {
      toast.error("Please answer at least one question before submitting");
      return;
    }

    setSubmitted(true);
    setAnswersText("");
    setGeneratingAnswers(true);

    try {
      await streamFromEdge(
        {
          courseTitle: course.title,
          courseCode: course.course_code,
          topics: topics.map((t) => ({ title: t.title, content: t.content })),
          mode: "quiz",
          questions: questionsText,
        },
        (text) => setAnswersText(text)
      );
    } catch (e: any) {
      toast.error(e.message || "Failed to generate answers");
    } finally {
      setGeneratingAnswers(false);
    }
  }, [course, topics, questionsText, selections]);

  const handleShowTheoryAnswers = useCallback(async () => {
    if (!course || !questionsText) return;
    setAnswersText("");
    setGeneratingAnswers(true);

    try {
      await streamFromEdge(
        {
          courseTitle: course.title,
          courseCode: course.course_code,
          topics: topics.map((t) => ({ title: t.title, content: t.content })),
          mode: "theory",
          questions: questionsText,
        },
        (text) => setAnswersText(text)
      );
    } catch (e: any) {
      toast.error(e.message || "Failed to generate answers");
    } finally {
      setGeneratingAnswers(false);
    }
  }, [course, topics, questionsText]);

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
        score: score ? `${score.correct}/${score.total}` : null,
      } as any,
    });
    setSaving(false);
    if (error) toast.error("Failed to save questions");
    else toast.success("Questions saved!");
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

  const answeredCount = Object.keys(selections).length;
  const isQuizInteractive = mode === "quiz" && !generating && parsedQuestions.length > 0;

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
                <Button onClick={() => handleGenerate("quiz")} className="gap-2 gradient-primary hover:opacity-90" size="lg">
                  <ClipboardList className="w-5 h-5" /> Objective / Quiz (MCQ)
                </Button>
                <Button onClick={() => handleGenerate("theory")} variant="outline" size="lg" className="gap-2">
                  <BookCheck className="w-5 h-5" /> Theory / Essay
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading state while generating */}
        {generating && !questionsText && (
          <Card>
            <CardContent className="py-10">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating {mode === "quiz" ? "quiz" : "theory"} questions…
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quiz interactive mode */}
        {mode === "quiz" && questionsText && (
          <>
            {/* Action bar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Objective / Quiz</Badge>
                {!submitted && isQuizInteractive && (
                  <span className="text-xs text-muted-foreground">
                    {answeredCount}/{parsedQuestions.length} answered
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {!generating && (
                  <Button variant="outline" size="sm" onClick={() => handleGenerate("quiz")}>
                    <Sparkles className="w-4 h-4" /> New Questions
                  </Button>
                )}
                {submitted && questionsText && (
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                  </Button>
                )}
              </div>
            </div>

            {/* Score summary */}
            {score && <ScoreSummary correct={score.correct} total={score.total} />}

            {/* Interactive question cards */}
            {isQuizInteractive && (
              <div className="space-y-4">
                {parsedQuestions.map((q) => (
                  <QuestionCard
                    key={q.number}
                    q={q}
                    selected={selections[q.number]}
                    onSelect={(letter) =>
                      setSelections((prev) => ({ ...prev, [q.number]: letter }))
                    }
                    correctAnswer={correctAnswers[q.number]}
                    submitted={submitted}
                  />
                ))}
              </div>
            )}

            {/* Still generating questions (streaming) */}
            {generating && questionsText && (
              <Card>
                <CardContent className="py-6">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{questionsText}</ReactMarkdown>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground mt-4 text-sm">
                    <Loader2 className="w-3 h-3 animate-spin" /> Still generating…
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit button */}
            {isQuizInteractive && !submitted && (
              <div className="text-center pt-2">
                <Button
                  onClick={handleSubmitQuiz}
                  className="gap-2 gradient-primary hover:opacity-90"
                  size="lg"
                  disabled={answeredCount === 0}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Submit & Check Answers ({answeredCount}/{parsedQuestions.length})
                </Button>
              </div>
            )}

            {/* Detailed explanations */}
            {submitted && (generatingAnswers || answersText) && (
              <Card>
                <CardContent className="py-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <BookCheck className="w-5 h-5 text-primary" /> Detailed Explanations
                  </h3>
                  {generatingAnswers && !answersText && (
                    <div className="flex items-center gap-2 text-muted-foreground py-4">
                      <Loader2 className="w-4 h-4 animate-spin" /> Generating explanations…
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
          </>
        )}

        {/* Theory mode (non-interactive, markdown) */}
        {mode === "theory" && (generating || questionsText) && (
          <>
            <div className="flex justify-end gap-2 flex-wrap">
              {questionsText && !generating && (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleGenerate("theory")}>
                    <Sparkles className="w-4 h-4" /> Regenerate
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                  </Button>
                </>
              )}
            </div>
            <Card>
              <CardContent className="py-6">
                <Badge variant="secondary" className="mb-3">Theory / Essay</Badge>
                {generating && !questionsText && (
                  <div className="flex items-center gap-2 text-muted-foreground py-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating theory questions…
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

            {questionsText && !generating && (
              <div className="space-y-4">
                {!answersText && !generatingAnswers && (
                  <div className="text-center">
                    <Button onClick={handleShowTheoryAnswers} className="gap-2 gradient-primary hover:opacity-90" size="lg">
                      <BookCheck className="w-5 h-5" /> Show Answers
                    </Button>
                  </div>
                )}
                {(generatingAnswers || answersText) && (
                  <Card>
                    <CardContent className="py-6">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <BookCheck className="w-5 h-5 text-primary" /> Answers
                      </h3>
                      {generatingAnswers && !answersText && (
                        <div className="flex items-center gap-2 text-muted-foreground py-4">
                          <Loader2 className="w-4 h-4 animate-spin" /> Generating answers…
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
