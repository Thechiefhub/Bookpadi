import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ChevronRight, Loader2, GraduationCap } from "lucide-react";
import AppLayout from "@/components/AppLayout";

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
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.department_id || !profile?.level) return;

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
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                Welcome, {profile?.full_name || "Student"}! 👋
              </h1>
              <p className="opacity-90">
                {profile?.institution && <>{profile.institution} · </>}
                {department?.name} · {profile?.level} Level
              </p>
            </div>
          </div>
        </div>

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
                  {data.map((course) => (
                    <Link key={course.id} to={`/course/${course.id}`}>
                      <Card className="hover:shadow-elevated transition-all duration-200 hover:border-primary/30 cursor-pointer group h-full">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <Badge variant="secondary" className="text-xs font-mono">
                              {course.course_code}
                            </Badge>
                            <Badge variant="outline">{course.units} units</Badge>
                          </div>
                          <CardTitle className="text-base mt-2 group-hover:text-primary transition-colors">
                            {course.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <span>View topics</span>
                            <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
