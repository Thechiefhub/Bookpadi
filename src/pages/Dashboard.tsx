import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Calendar,
  Calculator,
  ChevronRight,
  Loader2,
  GraduationCap,
  MessageCircle,
  CheckCircle2,
  Flame,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useStudentEngagement } from "@/lib/studentEngagement";
import BadgesWidget from "@/components/dashboard/BadgesWidget";
import ExamCountdownWidget from "@/components/dashboard/ExamCountdownWidget";
import StudyGoalsWidget from "@/components/dashboard/StudyGoalsWidget";
import CampusLeaderboardWidget from "@/components/dashboard/CampusLeaderboardWidget";
import StudyGroupsWidget from "@/components/dashboard/StudyGroupsWidget";
import SharedResourceLibraryWidget from "@/components/dashboard/SharedResourceLibraryWidget";

interface Course {
  id: string;
  course_code: string;
  title: string;
  units: number;
  semester: number;
  description: string | null;
}

interface Department {
  id: string;
  name: string;
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    streakDays,
    bestStreak,
    checkedInToday,
    completedTopicIds,
    completedCourseIds,
    goals,
    exams,
    badges,
    checkInStudyStreak,
    markCourseModuleComplete,
    logStudyMinutes,
    logCompletedTopicDirect,
    updateGoalTarget,
    addExam,
    removeExam,
  } = useStudentEngagement(user?.id);

  useEffect(() => {
    if (!profile?.department_id || !profile?.level) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      const [coursesRes, deptRes] = await Promise.all([
        supabase
          .from("courses")
          .select("*")
          .eq("department_id", profile.department_id!)
          .eq("level", profile.level!)
          .order("course_code"),
        supabase
          .from("departments")
          .select("*")
          .eq("id", profile.department_id!)
          .single(),
      ]);
      if (coursesRes.data) setCourses(coursesRes.data);
      if (deptRes.data) setDepartment(deptRes.data);
      setLoading(false);
    };
    fetchData();
  }, [profile]);

  const sem1 = courses.filter((c) => c.semester === 1);
  const sem2 = courses.filter((c) => c.semester === 2);

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
        {/* Welcome banner */}
        <div className="rounded-2xl gradient-primary p-6 md:p-8 text-primary-foreground">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-1">
                  Welcome, {profile?.full_name || "Student"}!
                </h1>
                <p className="opacity-90 text-sm sm:text-base">
                  {profile?.institution && <>{profile.institution} · </>}
                  {department?.name} · {profile?.level} Level
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-center bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5">
              <Flame className="w-5 h-5 text-secondary shrink-0" />
              <div className="tabular-nums">
                <p className="text-xs uppercase tracking-wider opacity-80 font-medium">
                  Active Streak
                </p>
                <p className="text-lg font-bold leading-tight">
                  {streakDays} {streakDays === 1 ? "Day" : "Days"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          <Link to="/messages">
            <Button variant="secondary" size="sm" className="gap-1.5 h-9 whitespace-nowrap shrink-0">
              <MessageCircle className="w-3.5 h-3.5" /> Message schoolmates
            </Button>
          </Link>
          <Link to="/planner">
            <Button variant="outline" size="sm" className="gap-1.5 h-9 whitespace-nowrap shrink-0">
              <Calendar className="w-3.5 h-3.5" /> Build timetable
            </Button>
          </Link>
          <Link to="/gpa">
            <Button variant="outline" size="sm" className="gap-1.5 h-9 whitespace-nowrap shrink-0">
              <Calculator className="w-3.5 h-3.5" /> Track GPA
            </Button>
          </Link>
        </div>

        {/* Study Goals & Exam Countdown Grid */}
        <div className="grid gap-6 lg:grid-cols-2 items-stretch">
          <StudyGoalsWidget
            goals={goals}
            onUpdateGoalTarget={updateGoalTarget}
            onLogMinutes={logStudyMinutes}
            onLogTopic={logCompletedTopicDirect}
          />
          <ExamCountdownWidget
            exams={exams}
            courses={courses}
            onAddExam={addExam}
            onRemoveExam={removeExam}
          />
        </div>

        {/* Student Badges & Streak System */}
        <BadgesWidget
          streakDays={streakDays}
          bestStreak={bestStreak}
          checkedInToday={checkedInToday}
          completedModulesCount={completedCourseIds.length}
          completedTopicsCount={completedTopicIds.length}
          badges={badges}
          onCheckInStreak={checkInStudyStreak}
        />

        {/* Global Campus Leaderboard (Bar Chart + Ranked Table) */}
        <CampusLeaderboardWidget
          currentUserId={user?.id}
          currentUserName={profile?.full_name}
          currentUsername={profile?.username}
          currentDepartment={department?.name}
          currentInstitution={profile?.institution}
          userCompletedModules={completedCourseIds.length}
          userStreakDays={streakDays}
        />

        {/* Department-Specific Collaborative Study Groups */}
        <StudyGroupsWidget
          userId={user?.id}
          userName={profile?.full_name}
          userDepartment={department?.name}
          userLevel={profile?.level}
          courses={courses}
        />

        {/* Shared Campus Resource Library (PDF Lecture Notes & Past Questions) */}
        <SharedResourceLibraryWidget
          userId={user?.id}
          userName={profile?.full_name}
          userDepartment={department?.name}
          userLevel={profile?.level}
          courses={courses}
        />

        {/* Courses */}
        <Tabs defaultValue="1" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Your Courses</h2>
            <TabsList>
              <TabsTrigger value="1">1st Semester</TabsTrigger>
              <TabsTrigger value="2">2nd Semester</TabsTrigger>
            </TabsList>
          </div>

          {[
            { value: "1", data: sem1 },
            { value: "2", data: sem2 },
          ].map(({ value, data }) => (
            <TabsContent key={value} value={value} className="space-y-3">
              {data.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p>No courses found for this semester yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {data.map((course) => {
                    const isCompleted = completedCourseIds.includes(course.id);
                    return (
                      <Card
                        key={course.id}
                        className="hover:border-primary/30 transition-colors h-full flex flex-col justify-between"
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="font-semibold text-foreground">
                                {course.course_code}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums">{course.units} units</span>
                            </div>
                            {isCompleted && (
                              <span className="inline-flex items-center gap-1 text-primary font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Module Completed
                              </span>
                            )}
                          </div>
                          <Link to={`/course/${course.id}`} className="group">
                            <CardTitle className="text-base mt-1.5 group-hover:text-primary transition-colors">
                              {course.title}
                            </CardTitle>
                          </Link>
                        </CardHeader>
                        <CardContent className="pt-2 flex items-center justify-between gap-2">
                          <Link
                            to={`/course/${course.id}`}
                            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <span>View topics</span>
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Link>
                          {!isCompleted && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-primary"
                              onClick={() =>
                                markCourseModuleComplete(course.id, [], course.course_code)
                              }
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Complete Module
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
