import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen, Users, Pin, Upload, Save, X, Pencil, ArrowLeft, FileText, BarChart3, Layers,
} from "lucide-react";
import { Loader2 } from "lucide-react";

const ADMIN_EMAIL = "chieftolulope@gmail.com";

interface Course {
  id: string;
  course_code: string;
  title: string;
  description: string | null;
  level: number;
  semester: number;
  units: number;
  department_id: string;
}

interface Topic {
  id: string;
  title: string;
  content: string | null;
  sort_order: number;
  course_id: string;
  course_code?: string;
}

export default function Admin() {
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [totalPins, setTotalPins] = useState<number>(0);
  const [dataLoading, setDataLoading] = useState(true);

  // Inline editing state
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editCourseData, setEditCourseData] = useState<Partial<Course>>({});
  const [editTopicData, setEditTopicData] = useState<Partial<Topic>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setDataLoading(true);
    const [coursesRes, topicsRes, profilesRes, pinsRes] = await Promise.all([
      supabase.from("courses").select("*").order("level").order("course_code"),
      supabase.from("topics").select("*, courses(course_code)").order("sort_order"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("pins").select("id", { count: "exact", head: true }),
    ]);

    if (coursesRes.data) setCourses(coursesRes.data);
    if (topicsRes.data) {
      setTopics(
        topicsRes.data.map((t: any) => ({
          ...t,
          course_code: t.courses?.course_code ?? "—",
        }))
      );
    }
    setTotalUsers(profilesRes.count ?? 0);
    setTotalPins(pinsRes.count ?? 0);
    setDataLoading(false);
  };

  const startEditCourse = (course: Course) => {
    setEditingCourseId(course.id);
    setEditCourseData({ title: course.title, course_code: course.course_code, units: course.units });
  };

  const cancelEditCourse = () => {
    setEditingCourseId(null);
    setEditCourseData({});
  };

  const saveCourse = async (id: string) => {
    setSaving(true);
    const { error } = await supabase.from("courses").update(editCourseData).eq("id", id);
    setSaving(false);
    if (error) {
      toast({ title: "Error saving course", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Course updated" });
      cancelEditCourse();
      fetchData();
    }
  };

  const startEditTopic = (topic: Topic) => {
    setEditingTopicId(topic.id);
    setEditTopicData({ title: topic.title, sort_order: topic.sort_order });
  };

  const cancelEditTopic = () => {
    setEditingTopicId(null);
    setEditTopicData({});
  };

  const saveTopic = async (id: string) => {
    setSaving(true);
    const { error } = await supabase.from("topics").update(editTopicData).eq("id", id);
    setSaving(false);
    if (error) {
      toast({ title: "Error saving topic", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Topic updated" });
      cancelEditTopic();
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b glass">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <BookOpen className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg tracking-tight" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                Admin Panel
              </span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {user.email}
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 animate-fade-in">
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-card hover-lift">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{dataLoading ? "…" : totalUsers}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card hover-lift">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="w-11 h-11 rounded-xl gradient-secondary flex items-center justify-center">
                <Pin className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pins</p>
                <p className="text-2xl font-bold">{dataLoading ? "…" : totalPins}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card hover-lift">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="w-11 h-11 rounded-xl gradient-warm flex items-center justify-center">
                <Layers className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Courses</p>
                <p className="text-2xl font-bold">{dataLoading ? "…" : courses.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card hover-lift">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Topics</p>
                <p className="text-2xl font-bold">{dataLoading ? "…" : topics.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PDF Uploader */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="w-5 h-5 text-primary" />
              PDF Uploader
            </CardTitle>
            <CardDescription>Upload curriculum PDFs to auto-populate courses and topics.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center gap-3 text-center">
              <FileText className="w-12 h-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground font-medium">
                Drag & drop a PDF here, or click to select
              </p>
              <Button variant="outline" size="sm" disabled>
                Select PDF
              </Button>
              <Badge variant="secondary" className="mt-2">
                PDF parsing coming soon
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Data Tables */}
        <Tabs defaultValue="courses">
          <TabsList>
            <TabsTrigger value="courses">Courses ({courses.length})</TabsTrigger>
            <TabsTrigger value="topics">Topics ({topics.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="courses">
            <Card className="shadow-card">
              <CardContent className="p-0">
                {dataLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : courses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">No courses found.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className="hidden md:table-cell">Level</TableHead>
                        <TableHead className="hidden md:table-cell">Semester</TableHead>
                        <TableHead className="hidden sm:table-cell">Units</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courses.map((course) => (
                        <TableRow key={course.id}>
                          <TableCell className="font-mono text-xs">
                            {editingCourseId === course.id ? (
                              <Input
                                value={editCourseData.course_code ?? ""}
                                onChange={(e) => setEditCourseData({ ...editCourseData, course_code: e.target.value })}
                                className="h-8 w-28"
                              />
                            ) : (
                              course.course_code
                            )}
                          </TableCell>
                          <TableCell>
                            {editingCourseId === course.id ? (
                              <Input
                                value={editCourseData.title ?? ""}
                                onChange={(e) => setEditCourseData({ ...editCourseData, title: e.target.value })}
                                className="h-8"
                              />
                            ) : (
                              course.title
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{course.level}L</TableCell>
                          <TableCell className="hidden md:table-cell">{course.semester}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {editingCourseId === course.id ? (
                              <Input
                                type="number"
                                value={editCourseData.units ?? 0}
                                onChange={(e) => setEditCourseData({ ...editCourseData, units: Number(e.target.value) })}
                                className="h-8 w-16"
                              />
                            ) : (
                              course.units
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {editingCourseId === course.id ? (
                              <div className="flex justify-end gap-1">
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveCourse(course.id)} disabled={saving}>
                                  <Save className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEditCourse}>
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEditCourse(course)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="topics">
            <Card className="shadow-card">
              <CardContent className="p-0">
                {dataLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : topics.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">No topics found.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">#</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className="hidden sm:table-cell">Course</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topics.map((topic) => (
                        <TableRow key={topic.id}>
                          <TableCell className="text-muted-foreground text-xs">
                            {editingTopicId === topic.id ? (
                              <Input
                                type="number"
                                value={editTopicData.sort_order ?? 0}
                                onChange={(e) => setEditTopicData({ ...editTopicData, sort_order: Number(e.target.value) })}
                                className="h-8 w-16"
                              />
                            ) : (
                              topic.sort_order
                            )}
                          </TableCell>
                          <TableCell>
                            {editingTopicId === topic.id ? (
                              <Input
                                value={editTopicData.title ?? ""}
                                onChange={(e) => setEditTopicData({ ...editTopicData, title: e.target.value })}
                                className="h-8"
                              />
                            ) : (
                              topic.title
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline" className="text-xs font-mono">
                              {topic.course_code}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {editingTopicId === topic.id ? (
                              <div className="flex justify-end gap-1">
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveTopic(topic.id)} disabled={saving}>
                                  <Save className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEditTopic}>
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEditTopic(topic)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
