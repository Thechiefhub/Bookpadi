import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Plus, Trash2, AlertTriangle } from "lucide-react";
import type { ExamCountdownItem } from "@/lib/studentEngagement";
import { toast } from "sonner";

interface CourseOption {
  id: string;
  course_code: string;
  title: string;
}

interface ExamCountdownWidgetProps {
  exams: ExamCountdownItem[];
  courses: CourseOption[];
  onAddExam: (exam: Omit<ExamCountdownItem, "id">) => void;
  onRemoveExam: (id: string) => void;
}

interface TimeRemaining {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeRemaining(targetIso: string, nowMs: number): TimeRemaining {
  const totalMs = new Date(targetIso).getTime() - nowMs;
  if (totalMs <= 0) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const totalSeconds = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { totalMs, days, hours, minutes, seconds };
}

export default function ExamCountdownWidget({
  exams,
  courses,
  onAddExam,
  onRemoveExam,
}: ExamCountdownWidgetProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [showAddForm, setShowAddForm] = useState(false);
  const [courseCode, setCourseCode] = useState("");
  const [subjectTitle, setSubjectTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examTime, setExamTime] = useState("09:00");
  const [venue, setVenue] = useState("");

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const handleSelectCourse = (selectedCode: string) => {
    setCourseCode(selectedCode);
    const found = courses.find((c) => c.course_code === selectedCode);
    if (found) {
      setSubjectTitle(found.title);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode.trim() || !subjectTitle.trim() || !examDate) {
      toast.error("Please enter the subject code, title, and exam date.");
      return;
    }
    const isoDate = new Date(`${examDate}T${examTime || "09:00"}:00`);
    if (Number.isNaN(isoDate.getTime())) {
      toast.error("Invalid exam date or time.");
      return;
    }
    onAddExam({
      courseCode: courseCode.trim().toUpperCase(),
      subjectTitle: subjectTitle.trim(),
      examDate: isoDate.toISOString(),
      venue: venue.trim() || undefined,
    });
    setCourseCode("");
    setSubjectTitle("");
    setExamDate("");
    setVenue("");
    setShowAddForm(false);
  };

  return (
    <Card className="border-border h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Exam Countdown
            </CardTitle>
            <CardDescription className="mt-1 text-xs sm:text-sm">
              Track upcoming exam dates with live subject countdown timers
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant={showAddForm ? "ghost" : "outline"}
            onClick={() => setShowAddForm(!showAddForm)}
            className="gap-1.5 h-8 text-xs whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            {showAddForm ? "Cancel" : "Add Exam"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1">
        {showAddForm && (
          <form onSubmit={handleSubmit} className="p-3.5 rounded-xl bg-muted/40 border space-y-3">
            {courses.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Quick-fill from your courses</Label>
                <div className="flex flex-wrap gap-1.5">
                  {courses.slice(0, 6).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCourse(c.course_code)}
                      className="text-xs px-2.5 py-1 rounded-md border bg-card hover:border-primary transition-colors font-mono whitespace-nowrap"
                    >
                      {c.course_code}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="exam-code" className="text-xs">Course Code</Label>
                <Input
                  id="exam-code"
                  placeholder="e.g. CSC 201"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className="h-9 text-sm"
                  required
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="exam-title" className="text-xs">Subject Title</Label>
                <Input
                  id="exam-title"
                  placeholder="e.g. Computer Programming I"
                  value={subjectTitle}
                  onChange={(e) => setSubjectTitle(e.target.value)}
                  className="h-9 text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="exam-date" className="text-xs">Exam Date</Label>
                <Input
                  id="exam-date"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="h-9 text-sm"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="exam-time" className="text-xs">Start Time</Label>
                <Input
                  id="exam-time"
                  type="time"
                  value={examTime}
                  onChange={(e) => setExamTime(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="exam-venue" className="text-xs">Venue (Optional)</Label>
                <Input
                  id="exam-venue"
                  placeholder="e.g. CBT Centre"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="submit" size="sm" className="h-8 text-xs">
                Save Exam Countdown
              </Button>
            </div>
          </form>
        )}

        {exams.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No upcoming exams scheduled.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 h-8 text-xs"
              onClick={() => setShowAddForm(true)}
            >
              Add First Exam Date
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {exams.map((exam) => {
              const remaining = getTimeRemaining(exam.examDate, nowMs);
              const isPast = remaining.totalMs <= 0;
              const isUrgent = !isPast && remaining.days < 3;
              const formattedDate = new Date(exam.examDate).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div key={exam.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono font-semibold text-foreground">{exam.courseCode}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formattedDate}</span>
                      {exam.venue && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{exam.venue}</span>
                        </>
                      )}
                    </div>
                    <p className="font-medium text-sm text-foreground mt-0.5 truncate">
                      {exam.subjectTitle}
                    </p>
                    {isUrgent && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1 font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        Approaching within 72 hours — prioritize revision
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    {isPast ? (
                      <span className="text-xs font-medium text-muted-foreground">
                        Exam date passed
                      </span>
                    ) : (
                      <div className="grid grid-cols-4 gap-1.5 text-center font-mono tabular-nums">
                        <div className="px-2 py-1 rounded-md bg-muted/60 min-w-[44px]">
                          <div className="text-sm font-bold text-foreground">
                            {String(remaining.days).padStart(2, "0")}
                          </div>
                          <div className="text-[10px] text-muted-foreground">days</div>
                        </div>
                        <div className="px-2 py-1 rounded-md bg-muted/60 min-w-[44px]">
                          <div className="text-sm font-bold text-foreground">
                            {String(remaining.hours).padStart(2, "0")}
                          </div>
                          <div className="text-[10px] text-muted-foreground">hrs</div>
                        </div>
                        <div className="px-2 py-1 rounded-md bg-muted/60 min-w-[44px]">
                          <div className="text-sm font-bold text-foreground">
                            {String(remaining.minutes).padStart(2, "0")}
                          </div>
                          <div className="text-[10px] text-muted-foreground">min</div>
                        </div>
                        <div className="px-2 py-1 rounded-md bg-muted/60 min-w-[44px]">
                          <div className="text-sm font-bold text-primary">
                            {String(remaining.seconds).padStart(2, "0")}
                          </div>
                          <div className="text-[10px] text-muted-foreground">sec</div>
                        </div>
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveExam(exam.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      title="Remove exam"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
