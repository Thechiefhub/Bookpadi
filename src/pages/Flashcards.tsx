import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RotateCcw, ChevronLeft, ChevronRight, Sparkles, Shuffle, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Flashcard {
  front: string;
  back: string;
}

interface Course {
  id: string;
  course_code: string;
  title: string;
}

interface Topic {
  id: string;
  title: string;
  content: string | null;
}

export default function Flashcards() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    loadCourses();
  }, [user]);

  const loadCourses = async () => {
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("department_id").eq("user_id", user.id).single();
    if (!profile?.department_id) { setLoadingCourses(false); return; }
    const { data } = await supabase.from("courses").select("id, course_code, title").eq("department_id", profile.department_id).order("course_code");
    setCourses(data || []);
    setLoadingCourses(false);
  };

  const generateFlashcards = async () => {
    if (!selectedCourse) return;
    const course = courses.find(c => c.id === selectedCourse);
    if (!course) return;

    setGenerating(true);
    setFlashcards([]);
    setCurrentIndex(0);
    setFlipped(false);

    try {
      const { data: topics } = await supabase.from("topics").select("title, content").eq("course_id", selectedCourse).order("sort_order");
      if (!topics?.length) {
        toast({ title: "No topics found", description: "This course has no topics to generate flashcards from.", variant: "destructive" });
        setGenerating(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("generate-flashcards", {
        body: { courseTitle: course.title, courseCode: course.course_code, topics, count: 15 },
      });

      if (error) throw error;
      if (data?.flashcards?.length > 0) {
        setFlashcards(data.flashcards);
        toast({ title: "Flashcards ready!", description: `${data.flashcards.length} flashcards generated.` });
      } else {
        toast({ title: "Generation failed", description: "Could not generate flashcards. Try again.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to generate flashcards", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const saveFlashcards = async () => {
    if (!user || flashcards.length === 0) return;
    const course = courses.find(c => c.id === selectedCourse);
    setSaving(true);
    try {
      const { error } = await supabase.from("study_plans").insert({
        user_id: user.id,
        title: `Flashcards: ${course?.course_code || "Course"}`,
        type: "flashcards",
        data: { flashcards, courseId: selectedCourse, courseCode: course?.course_code } as any,
      });
      if (error) throw error;
      toast({ title: "Saved!", description: "Flashcards saved to your library." });
    } catch (e: any) {
      toast({ title: "Error saving", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const shuffleCards = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentIndex(0);
    setFlipped(false);
  };

  const current = flashcards[currentIndex];

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Flashcard Generator</h1>
          <p className="text-muted-foreground text-sm mt-1">AI-powered flashcards from your course topics</p>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={selectedCourse} onValueChange={setSelectedCourse} disabled={loadingCourses}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={loadingCourses ? "Loading courses..." : "Select a course"} />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.course_code} — {c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={generateFlashcards} disabled={!selectedCourse || generating}>
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate
              </Button>
            </div>
          </CardContent>
        </Card>

        {generating && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Generating flashcards with AI...</p>
          </div>
        )}

        {flashcards.length > 0 && !generating && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {currentIndex + 1} / {flashcards.length}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={shuffleCards}>
                  <Shuffle className="w-3.5 h-3.5" /> Shuffle
                </Button>
                <Button variant="outline" size="sm" onClick={saveFlashcards} disabled={saving}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </Button>
              </div>
            </div>

            <div
              className="cursor-pointer perspective-1000"
              onClick={() => setFlipped(!flipped)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === " " && setFlipped(!flipped)}
            >
              <div
                className={`relative w-full min-h-[260px] transition-transform duration-500 transform-style-3d ${flipped ? "rotate-y-180" : ""}`}
              >
                {/* Front */}
                <Card className={`absolute inset-0 backface-hidden ${flipped ? "invisible" : ""}`}>
                  <CardContent className="p-6 flex flex-col items-center justify-center min-h-[260px] text-center">
                    <span className="text-xs uppercase tracking-wider text-primary font-semibold mb-3">Question</span>
                    <p className="text-lg font-medium leading-relaxed">{current?.front}</p>
                    <span className="text-xs text-muted-foreground mt-4">Tap to reveal answer</span>
                  </CardContent>
                </Card>

                {/* Back */}
                <Card className={`absolute inset-0 backface-hidden rotate-y-180 bg-primary/5 ${!flipped ? "invisible" : ""}`}>
                  <CardContent className="p-6 flex flex-col items-center justify-center min-h-[260px] text-center">
                    <span className="text-xs uppercase tracking-wider text-accent font-semibold mb-3">Answer</span>
                    <p className="text-base leading-relaxed">{current?.back}</p>
                    <span className="text-xs text-muted-foreground mt-4">Tap to see question</span>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setCurrentIndex(Math.max(0, currentIndex - 1)); setFlipped(false); }}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setCurrentIndex(0); setFlipped(false); }}>
                <RotateCcw className="w-4 h-4" /> Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setCurrentIndex(Math.min(flashcards.length - 1, currentIndex + 1)); setFlipped(false); }}
                disabled={currentIndex === flashcards.length - 1}
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
