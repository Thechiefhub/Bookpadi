import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, FileText, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

export default function EssayReviewer() {
  const [courseCode, setCourseCode] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [essay, setEssay] = useState("");
  const [rubric, setRubric] = useState("");
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);

  const submitEssay = async () => {
    if (!essay.trim()) {
      toast({ title: "Empty submission", description: "Please paste or type your essay.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setReview("");

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/review-essay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ essay, courseTitle, courseCode, question, rubric }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to review essay");
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) { result += content; setReview(result); }
          } catch {}
        }
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setEssay("");
    setQuestion("");
    setReview("");
    setCourseCode("");
    setCourseTitle("");
    setRubric("");
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Essay Reviewer</h1>
          <p className="text-muted-foreground text-sm mt-1">Get detailed AI grading and feedback on your essays</p>
        </div>

        {!review && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Course code (e.g. CSC 201)" value={courseCode} onChange={e => setCourseCode(e.target.value)} />
                <Input placeholder="Course title (optional)" value={courseTitle} onChange={e => setCourseTitle(e.target.value)} />
              </div>
              <Input placeholder="Question/prompt you're answering (optional)" value={question} onChange={e => setQuestion(e.target.value)} />
              <Textarea
                placeholder="Paste or type your essay/answer here..."
                value={essay}
                onChange={e => setEssay(e.target.value)}
                className="min-h-[200px]"
              />
              <Input placeholder="Additional rubric or instructions (optional)" value={rubric} onChange={e => setRubric(e.target.value)} />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{essay.split(/\s+/).filter(Boolean).length} words</span>
                <Button onClick={submitEssay} disabled={loading || !essay.trim()}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Review Essay
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {(review || loading) && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" /> AI Review
                </CardTitle>
                {!loading && (
                  <Button variant="outline" size="sm" onClick={reset}>
                    <RotateCcw className="w-3.5 h-3.5" /> New Review
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading && !review && (
                <div className="flex items-center gap-3 py-8 justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-muted-foreground text-sm">Reviewing your essay...</span>
                </div>
              )}
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{review}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
