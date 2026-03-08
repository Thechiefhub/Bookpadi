import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Loader2, Sparkles, Lightbulb, ArrowLeft, Save, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Course {
  id: string;
  course_code: string;
  title: string;
  units: number;
}

interface Session {
  time: string;
  course_code: string | null;
  title: string;
  activity: string;
}

interface DaySchedule {
  day: string;
  sessions: Session[];
}

interface Timetable {
  schedule: DaySchedule[];
  tips: string[];
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIME_OPTIONS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00",
];

// Simple hash-based color assignment for courses
const COURSE_COLORS = [
  "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800",
  "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800",
  "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800",
  "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
  "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800",
];

function getCourseColor(courseCode: string | null, allCodes: string[]): string {
  if (!courseCode) return "bg-muted text-muted-foreground border-border";
  const idx = allCodes.indexOf(courseCode);
  return COURSE_COLORS[idx % COURSE_COLORS.length];
}

export default function StudyPlanner() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [studyHours, setStudyHours] = useState("4");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("18:00");
  const [daysOff, setDaysOff] = useState<string[]>(["Sunday"]);
  const [loading, setLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"setup" | "result">("setup");

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("department_id, level")
        .eq("user_id", user.id)
        .single();
      if (!profile?.department_id || !profile?.level) {
        setCoursesLoading(false);
        return;
      }
      const { data } = await supabase
        .from("courses")
        .select("id, course_code, title, units")
        .eq("department_id", profile.department_id)
        .eq("level", profile.level)
        .order("semester")
        .order("course_code");
      if (data) setCourses(data);
      setCoursesLoading(false);
    };
    fetchCourses();
  }, [user]);

  const toggleCourse = (id: string) => {
    setSelectedCourses((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleDayOff = (day: string) => {
    setDaysOff((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleGenerate = async () => {
    if (selectedCourses.length === 0) {
      toast.error("Please select at least one course");
      return;
    }

    const chosen = courses.filter((c) => selectedCourses.includes(c.id));
    setLoading(true);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-timetable`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            courses: chosen,
            studyHoursPerDay: parseInt(studyHours),
            preferredStartTime: startTime,
            preferredEndTime: endTime,
            daysOff,
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed to generate timetable" }));
        toast.error(err.error || "Failed to generate timetable");
        return;
      }

      const data: Timetable = await resp.json();
      setTimetable(data);
      setView("result");
      toast.success("Timetable generated!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate timetable");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!timetable || !user) return;
    setSaving(true);
    const { error } = await supabase.from("study_plans").insert({
      user_id: user.id,
      title: `Study Timetable - ${new Date().toLocaleDateString()}`,
      type: "timetable",
      data: timetable as any,
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to save timetable");
    } else {
      toast.success("Timetable saved!");
    }
  };

  const allCourseCodes = courses.filter((c) => selectedCourses.includes(c.id)).map((c) => c.course_code);

  if (view === "result" && timetable) {
    return (
      <AppLayout>
        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button
              onClick={() => setView("setup")}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="w-4 h-4" /> Back to settings
            </button>
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Timetable
            </Button>
          </div>

          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="w-6 h-6 text-primary" /> Your Study Timetable
            </h1>
            <p className="text-muted-foreground mt-1">AI-generated weekly schedule</p>
          </div>

          {/* Course Legend */}
          <div className="flex flex-wrap gap-2">
            {allCourseCodes.map((code) => (
              <span
                key={code}
                className={`text-xs px-2 py-1 rounded-md border font-mono ${getCourseColor(code, allCourseCodes)}`}
              >
                {code}
              </span>
            ))}
          </div>

          {/* Timetable Grid */}
          <div className="space-y-4">
            {timetable.schedule.map((day) => (
              <Card key={day.day}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{day.day}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {day.sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Day off — rest and recharge!</p>
                  ) : (
                    day.sessions.map((session, i) => (
                      <div
                        key={i}
                        className={`flex gap-3 p-3 rounded-lg border ${getCourseColor(session.course_code, allCourseCodes)}`}
                      >
                        <div className="shrink-0 w-28 text-xs font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {session.time}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {session.course_code && (
                              <span className="font-mono mr-1.5">{session.course_code}</span>
                            )}
                            {session.title}
                          </p>
                          <p className="text-xs opacity-80 mt-0.5">{session.activity}</p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Study Tips */}
          {timetable.tips?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" /> Study Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {timetable.tips.map((tip, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" /> Study Planner
          </h1>
          <p className="text-muted-foreground mt-1">Generate an AI-powered weekly study timetable</p>
        </div>

        {/* Course Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Courses</CardTitle>
            <CardDescription>Choose the courses you want included in your timetable</CardDescription>
          </CardHeader>
          <CardContent>
            {coursesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : courses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No courses found for your department and level.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {courses.map((course) => (
                  <label
                    key={course.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedCourses.includes(course.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <Checkbox
                      checked={selectedCourses.includes(course.id)}
                      onCheckedChange={() => toggleCourse(course.id)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight">
                        <span className="font-mono text-xs text-muted-foreground mr-1">{course.course_code}</span>
                        {course.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{course.units} units</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {courses.length > 0 && (
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCourses(courses.map((c) => c.id))}
                >
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedCourses([])}>
                  Clear
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Study Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Study Preferences</CardTitle>
            <CardDescription>Customize your study schedule parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Study hours/day</Label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={studyHours}
                  onChange={(e) => setStudyHours(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Start time</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>End time</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Days off</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <Badge
                    key={day}
                    variant={daysOff.includes(day) ? "default" : "outline"}
                    className="cursor-pointer select-none"
                    onClick={() => toggleDayOff(day)}
                  >
                    {day.slice(0, 3)}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={loading || selectedCourses.length === 0}
          className="w-full gradient-primary hover:opacity-90 h-12 text-base"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating your timetable…
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Study Timetable
            </>
          )}
        </Button>
      </div>
    </AppLayout>
  );
}
