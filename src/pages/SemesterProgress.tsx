import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BarChart3, BookOpen, CheckCircle2, Clock, AlertTriangle, TrendingUp, Award, Target, Loader2 } from "lucide-react";

interface GpaRecord {
  id: string;
  course_code: string;
  course_title: string;
  units: number;
  grade: string;
  semester: number;
  level: number;
  session: string;
}

interface Assignment {
  id: string;
  title: string;
  course_code: string | null;
  due_date: string;
  priority: string;
  status: string;
}

const GRADE_POINTS: Record<string, number> = { A: 5.0, B: 4.0, C: 3.0, D: 2.0, E: 1.0, F: 0.0 };

export default function SemesterProgress() {
  const { user, profile } = useAuth();
  const [gpaRecords, setGpaRecords] = useState<GpaRecord[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("gpa_records").select("*").eq("user_id", user.id),
      supabase.from("assignments").select("*").eq("user_id", user.id),
      profile?.department_id && profile?.level
        ? supabase.from("courses").select("*").eq("department_id", profile.department_id).eq("level", profile.level)
        : Promise.resolve({ data: [] }),
    ]).then(([gpa, asn, crs]) => {
      setGpaRecords((gpa.data as GpaRecord[]) || []);
      setAssignments((asn.data as Assignment[]) || []);
      setCourses(crs.data || []);
      setLoading(false);
    });
  }, [user, profile]);

  const calcGPA = (recs: GpaRecord[]) => {
    if (recs.length === 0) return 0;
    const tp = recs.reduce((s, r) => s + (GRADE_POINTS[r.grade] || 0) * r.units, 0);
    const tu = recs.reduce((s, r) => s + r.units, 0);
    return tu > 0 ? tp / tu : 0;
  };

  const cgpa = calcGPA(gpaRecords);
  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter((a) => a.status === "completed").length;
  const overdueAssignments = assignments.filter((a) => new Date(a.due_date) < new Date() && a.status !== "completed").length;
  const assignmentCompletion = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

  const totalCourseUnits = courses.reduce((s: number, c: any) => s + (c.units || 0), 0);
  const gradedUnits = gpaRecords.reduce((s, r) => s + r.units, 0);
  const gradeDistribution = Object.keys(GRADE_POINTS).map((g) => ({
    grade: g,
    count: gpaRecords.filter((r) => r.grade === g).length,
  }));
  const maxGradeCount = Math.max(...gradeDistribution.map((g) => g.count), 1);

  const getClassification = (gpa: number) => {
    if (gpa >= 4.5) return { label: "First Class", color: "text-accent" };
    if (gpa >= 3.5) return { label: "2nd Class Upper", color: "text-primary" };
    if (gpa >= 2.5) return { label: "2nd Class Lower", color: "text-secondary" };
    if (gpa >= 1.5) return { label: "Third Class", color: "text-muted-foreground" };
    return { label: "Pass/Fail", color: "text-destructive" };
  };

  const classification = getClassification(cgpa);

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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" /> Semester Progress
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Your academic performance overview at a glance</p>
        </div>

        {/* Hero Stats */}
        <div className="rounded-2xl gradient-primary p-6 text-primary-foreground">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold">{cgpa.toFixed(2)}</div>
              <p className="text-sm opacity-80">CGPA</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{gradedUnits}</div>
              <p className="text-sm opacity-80">Units Graded</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{completedAssignments}/{totalAssignments}</div>
              <p className="text-sm opacity-80">Tasks Done</p>
            </div>
            <div className="text-center">
              <Award className="w-6 h-6 mx-auto mb-1" />
              <div className="text-sm font-semibold">{classification.label}</div>
              <p className="text-xs opacity-80">Standing</p>
            </div>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> GPA Target
              </CardTitle>
              <CardDescription>Progress toward First Class (4.50)</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={Math.min((cgpa / 4.5) * 100, 100)} className="h-3 mb-2" />
              <p className="text-sm text-muted-foreground">{cgpa.toFixed(2)} / 4.50 — {cgpa >= 4.5 ? "Achieved! 🎉" : `${(4.5 - cgpa).toFixed(2)} points to go`}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent" /> Assignment Completion
              </CardTitle>
              <CardDescription>{completedAssignments} of {totalAssignments} completed</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={assignmentCompletion} className="h-3 mb-2" />
              <div className="flex gap-3 text-sm">
                {overdueAssignments > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertTriangle className="w-3 h-3" /> {overdueAssignments} overdue
                  </span>
                )}
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" /> {totalAssignments - completedAssignments - overdueAssignments} in progress
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grade Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Grade Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gpaRecords.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No grades recorded yet. Add grades in the GPA Calculator.</p>
            ) : (
              <div className="flex items-end gap-3 h-32">
                {gradeDistribution.map((g) => (
                  <div key={g.grade} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-muted-foreground">{g.count}</span>
                    <div
                      className="w-full rounded-t-md bg-primary/80 transition-all"
                      style={{ height: `${(g.count / maxGradeCount) * 100}%`, minHeight: g.count > 0 ? "8px" : "2px" }}
                    />
                    <span className="text-xs font-bold">{g.grade}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Course Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-secondary" /> Registered Courses
            </CardTitle>
            <CardDescription>{courses.length} courses · {totalCourseUnits} total units</CardDescription>
          </CardHeader>
          <CardContent>
            {courses.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No courses found for your level.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {courses.map((c: any) => {
                  const graded = gpaRecords.find((r) => r.course_code === c.course_code);
                  return (
                    <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
                      {graded ? (
                        <Badge className="text-xs">{graded.grade}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">—</Badge>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-medium truncate">{c.course_code}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.units}u</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
