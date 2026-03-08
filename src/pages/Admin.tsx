import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen, Users, Pin, Upload, Save, X, Pencil, ArrowLeft, FileText, BarChart3, Layers,
  CheckCircle, AlertCircle, Trash2, Plus, Eye,
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

interface Department {
  id: string;
  name: string;
  faculty: string;
}

interface ParsedTopic {
  title: string;
  content?: string;
  sort_order: number;
}

interface ParsedCourse {
  course_code: string;
  title: string;
  description?: string;
  level: number;
  semester: number;
  units: number;
  topics: ParsedTopic[];
}

export default function Admin() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [courses, setCourses] = useState<Course[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [totalPins, setTotalPins] = useState<number>(0);
  const [dataLoading, setDataLoading] = useState(true);

  // Inline editing state
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editCourseData, setEditCourseData] = useState<Partial<Course>>({});
  const [editTopicData, setEditTopicData] = useState<Partial<Topic>>({});
  const [saving, setSaving] = useState(false);

  // PDF upload state
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Preview state
  const [previewCourses, setPreviewCourses] = useState<ParsedCourse[] | null>(null);
  const [savingCurriculum, setSavingCurriculum] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    coursesInserted?: number;
    topicsInserted?: number;
    totalCoursesParsed?: number;
  } | null>(null);

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) fetchData();
  }, [user]);

  const fetchData = async () => {
    setDataLoading(true);
    const [coursesRes, topicsRes, profilesRes, pinsRes, deptsRes] = await Promise.all([
      supabase.from("courses").select("*").order("level").order("course_code"),
      supabase.from("topics").select("*, courses(course_code)").order("sort_order"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("pins").select("id", { count: "exact", head: true }),
      supabase.from("departments").select("*").order("name"),
    ]);
    if (coursesRes.data) setCourses(coursesRes.data);
    if (topicsRes.data) {
      setTopics(topicsRes.data.map((t: any) => ({ ...t, course_code: t.courses?.course_code ?? "—" })));
    }
    if (deptsRes.data) setDepartments(deptsRes.data);
    setTotalUsers(profilesRes.count ?? 0);
    setTotalPins(pinsRes.count ?? 0);
    setDataLoading(false);
  };

  // --- PDF text extraction ---
  const extractTextFromPdf = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const raw = decoder.decode(bytes);
    let text = "";
    const btPattern = /BT\s([\s\S]*?)ET/g;
    let match;
    while ((match = btPattern.exec(raw)) !== null) {
      const block = match[1];
      const tjPattern = /\(([^)]*)\)\s*Tj/g;
      let tjMatch;
      while ((tjMatch = tjPattern.exec(block)) !== null) text += tjMatch[1] + " ";
      const tjArrayPattern = /\[([^\]]*)\]\s*TJ/g;
      let tjArrMatch;
      while ((tjArrMatch = tjArrayPattern.exec(block)) !== null) {
        const inner = tjArrMatch[1];
        const strPattern = /\(([^)]*)\)/g;
        let strMatch;
        while ((strMatch = strPattern.exec(inner)) !== null) text += strMatch[1];
        text += " ";
      }
    }
    if (text.trim().length < 50) {
      text = raw.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s{3,}/g, "\n").trim();
    }
    return text;
  };

  // --- Step 1: Parse PDF ---
  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "Invalid file", description: "Please upload a PDF file.", variant: "destructive" });
      return;
    }
    if (!selectedDepartment) {
      toast({ title: "Select department", description: "Please select a department first.", variant: "destructive" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 20MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    setUploadResult(null);
    setPreviewCourses(null);

    try {
      const pdfText = await extractTextFromPdf(file);
      if (pdfText.trim().length < 20) {
        toast({ title: "Extraction failed", description: "Could not extract enough text. Try a text-based PDF.", variant: "destructive" });
        setUploading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("parse-curriculum", {
        body: { pdfText },
      });

      if (error) {
        toast({ title: "Parse error", description: error.message, variant: "destructive" });
      } else if (data?.error) {
        toast({ title: "Parse error", description: data.error, variant: "destructive" });
      } else if (data?.courses) {
        setPreviewCourses(data.courses);
        toast({ title: "PDF parsed!", description: `Found ${data.courses.length} courses. Review and confirm below.` });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Unexpected error", variant: "destructive" });
    }
    setUploading(false);
  };

  // --- Step 2: Save confirmed curriculum ---
  const handleSaveCurriculum = async () => {
    if (!previewCourses || previewCourses.length === 0) return;
    setSavingCurriculum(true);
    setUploadResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("save-curriculum", {
        body: { courses: previewCourses, departmentId: selectedDepartment },
      });

      if (error || data?.error) {
        setUploadResult({ success: false, message: error?.message || data?.error || "Save failed" });
      } else {
        setUploadResult({
          success: true,
          message: `Saved ${data.totalCoursesParsed} courses with ${data.topicsInserted} topics.`,
          coursesInserted: data.coursesInserted,
          topicsInserted: data.topicsInserted,
          totalCoursesParsed: data.totalCoursesParsed,
        });
        setPreviewCourses(null);
        fetchData();
      }
    } catch (err: any) {
      setUploadResult({ success: false, message: err.message || "Unexpected error" });
    }
    setSavingCurriculum(false);
  };

  // --- Preview editing helpers ---
  const updatePreviewCourse = (idx: number, field: keyof ParsedCourse, value: any) => {
    setPreviewCourses((prev) => {
      if (!prev) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const removePreviewCourse = (idx: number) => {
    setPreviewCourses((prev) => prev ? prev.filter((_, i) => i !== idx) : prev);
  };

  const updatePreviewTopic = (courseIdx: number, topicIdx: number, field: keyof ParsedTopic, value: any) => {
    setPreviewCourses((prev) => {
      if (!prev) return prev;
      const updated = [...prev];
      const topics = [...updated[courseIdx].topics];
      topics[topicIdx] = { ...topics[topicIdx], [field]: value };
      updated[courseIdx] = { ...updated[courseIdx], topics };
      return updated;
    });
  };

  const removePreviewTopic = (courseIdx: number, topicIdx: number) => {
    setPreviewCourses((prev) => {
      if (!prev) return prev;
      const updated = [...prev];
      updated[courseIdx] = {
        ...updated[courseIdx],
        topics: updated[courseIdx].topics.filter((_, i) => i !== topicIdx),
      };
      return updated;
    });
  };

  const addPreviewTopic = (courseIdx: number) => {
    setPreviewCourses((prev) => {
      if (!prev) return prev;
      const updated = [...prev];
      const maxOrder = updated[courseIdx].topics.reduce((m, t) => Math.max(m, t.sort_order), 0);
      updated[courseIdx] = {
        ...updated[courseIdx],
        topics: [...updated[courseIdx].topics, { title: "New Topic", sort_order: maxOrder + 1 }],
      };
      return updated;
    });
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  // --- Inline table editing ---
  const startEditCourse = (course: Course) => {
    setEditingCourseId(course.id);
    setEditCourseData({ title: course.title, course_code: course.course_code, units: course.units });
  };
  const cancelEditCourse = () => { setEditingCourseId(null); setEditCourseData({}); };
  const saveCourse = async (id: string) => {
    setSaving(true);
    const { error } = await supabase.from("courses").update(editCourseData).eq("id", id);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Course updated" }); cancelEditCourse(); fetchData(); }
  };
  const startEditTopic = (topic: Topic) => {
    setEditingTopicId(topic.id);
    setEditTopicData({ title: topic.title, sort_order: topic.sort_order });
  };
  const cancelEditTopic = () => { setEditingTopicId(null); setEditTopicData({}); };
  const saveTopic = async (id: string) => {
    setSaving(true);
    const { error } = await supabase.from("topics").update(editTopicData).eq("id", id);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Topic updated" }); cancelEditTopic(); fetchData(); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.email !== ADMIN_EMAIL) return <Navigate to="/dashboard" replace />;

  const totalPreviewTopics = previewCourses?.reduce((sum, c) => sum + c.topics.length, 0) ?? 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b glass">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="h-9 w-9"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <BookOpen className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg tracking-tight" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Admin Panel</span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">{user.email}</Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 animate-fade-in">
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: totalUsers, icon: Users, gradient: "gradient-primary" },
            { label: "Total Pins", value: totalPins, icon: Pin, gradient: "gradient-secondary" },
            { label: "Total Courses", value: courses.length, icon: Layers, gradient: "gradient-warm" },
            { label: "Total Topics", value: topics.length, icon: BarChart3, gradient: "bg-muted", iconClass: "text-muted-foreground" },
          ].map((card) => (
            <Card key={card.label} className="shadow-card hover-lift">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`w-11 h-11 rounded-xl ${card.gradient} flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${card.iconClass ?? "text-primary-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold">{dataLoading ? "…" : card.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* PDF Uploader */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="w-5 h-5 text-primary" />
              PDF Curriculum Uploader
            </CardTitle>
            <CardDescription>
              Upload a curriculum PDF → AI extracts courses & topics → review & edit → save to database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger><SelectValue placeholder="Select department…" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name} — {dept.faculty}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Drop zone — hidden when previewing */}
            {!previewCourses && (
              <div
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 text-center transition-colors cursor-pointer ${
                  dragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
                } ${uploading ? "pointer-events-none opacity-60" : ""}`}
                onClick={() => !uploading && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={onFileChange} />
                {uploading ? (
                  <>
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <p className="text-sm font-medium text-foreground">Parsing PDF with AI…</p>
                    <p className="text-xs text-muted-foreground">This may take up to 30 seconds</p>
                  </>
                ) : (
                  <>
                    <FileText className="w-12 h-12 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground font-medium">Drag & drop a curriculum PDF here, or click to select</p>
                    <Button variant="outline" size="sm" disabled={!selectedDepartment}>Select PDF</Button>
                    {!selectedDepartment && <p className="text-xs text-destructive">Please select a department above first</p>}
                  </>
                )}
              </div>
            )}

            {/* Result banner */}
            {uploadResult && (
              <div className={`flex items-start gap-3 rounded-lg p-4 ${
                uploadResult.success ? "bg-accent/10 border border-accent/30" : "bg-destructive/10 border border-destructive/30"
              }`}>
                {uploadResult.success ? <CheckCircle className="w-5 h-5 text-accent mt-0.5 shrink-0" /> : <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />}
                <div>
                  <p className="text-sm font-medium">{uploadResult.success ? "Saved successfully!" : "Save failed"}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{uploadResult.message}</p>
                  {uploadResult.success && (
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Courses: <strong className="text-foreground">{uploadResult.totalCoursesParsed}</strong></span>
                      <span>New: <strong className="text-foreground">{uploadResult.coursesInserted}</strong></span>
                      <span>Topics: <strong className="text-foreground">{uploadResult.topicsInserted}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview / Review Step */}
        {previewCourses && previewCourses.length > 0 && (
          <Card className="shadow-card border-primary/30">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Eye className="w-5 h-5 text-primary" />
                    Review Parsed Curriculum
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {previewCourses.length} courses · {totalPreviewTopics} topics — Edit, remove, or add items before saving.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setPreviewCourses(null); setUploadResult(null); }}>
                    <X className="w-3.5 h-3.5 mr-1" /> Discard
                  </Button>
                  <Button size="sm" onClick={handleSaveCurriculum} disabled={savingCurriculum}>
                    {savingCurriculum ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                    Confirm & Save
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="space-y-2">
                {previewCourses.map((course, ci) => (
                  <AccordionItem key={ci} value={`course-${ci}`} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 text-left flex-1 min-w-0">
                        <Badge variant="outline" className="font-mono text-xs shrink-0">{course.course_code}</Badge>
                        <span className="text-sm font-medium truncate">{course.title}</span>
                        <Badge variant="secondary" className="text-xs shrink-0 ml-auto mr-2">
                          {course.topics.length} topics
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 space-y-4">
                      {/* Course fields */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                        <div className="col-span-2 sm:col-span-1">
                          <label className="text-xs text-muted-foreground">Code</label>
                          <Input value={course.course_code} onChange={(e) => updatePreviewCourse(ci, "course_code", e.target.value)} className="h-8 mt-1" />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-muted-foreground">Title</label>
                          <Input value={course.title} onChange={(e) => updatePreviewCourse(ci, "title", e.target.value)} className="h-8 mt-1" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Level</label>
                          <Select value={String(course.level)} onValueChange={(v) => updatePreviewCourse(ci, "level", Number(v))}>
                            <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {[100, 200, 300, 400, 500].map((l) => <SelectItem key={l} value={String(l)}>{l}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Semester</label>
                          <Select value={String(course.semester)} onValueChange={(v) => updatePreviewCourse(ci, "semester", Number(v))}>
                            <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1st</SelectItem>
                              <SelectItem value="2">2nd</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Units</label>
                          <Input type="number" value={course.units} onChange={(e) => updatePreviewCourse(ci, "units", Number(e.target.value))} className="h-8 mt-1" min={1} max={6} />
                        </div>
                      </div>

                      {/* Topics */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-muted-foreground">Topics</p>
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => addPreviewTopic(ci)}>
                            <Plus className="w-3 h-3 mr-1" /> Add topic
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {course.topics.map((topic, ti) => (
                            <div key={ti} className="flex items-start gap-2 bg-muted/40 rounded-lg p-2.5">
                              <Input
                                type="number"
                                value={topic.sort_order}
                                onChange={(e) => updatePreviewTopic(ci, ti, "sort_order", Number(e.target.value))}
                                className="h-7 w-14 text-xs shrink-0"
                              />
                              <div className="flex-1 space-y-1.5">
                                <Input
                                  value={topic.title}
                                  onChange={(e) => updatePreviewTopic(ci, ti, "title", e.target.value)}
                                  className="h-7 text-xs"
                                  placeholder="Topic title"
                                />
                                <Input
                                  value={topic.content ?? ""}
                                  onChange={(e) => updatePreviewTopic(ci, ti, "content", e.target.value)}
                                  className="h-7 text-xs"
                                  placeholder="Description (optional)"
                                />
                              </div>
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive" onClick={() => removePreviewTopic(ci, ti)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive text-xs" onClick={() => removePreviewCourse(ci)}>
                          <Trash2 className="w-3 h-3 mr-1" /> Remove course
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {/* Bottom action bar */}
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                <Button variant="outline" onClick={() => { setPreviewCourses(null); setUploadResult(null); }}>
                  Discard All
                </Button>
                <Button onClick={handleSaveCurriculum} disabled={savingCurriculum || previewCourses.length === 0}>
                  {savingCurriculum ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save {previewCourses.length} Courses to Database
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
                  <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
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
                              <Input value={editCourseData.course_code ?? ""} onChange={(e) => setEditCourseData({ ...editCourseData, course_code: e.target.value })} className="h-8 w-28" />
                            ) : course.course_code}
                          </TableCell>
                          <TableCell>
                            {editingCourseId === course.id ? (
                              <Input value={editCourseData.title ?? ""} onChange={(e) => setEditCourseData({ ...editCourseData, title: e.target.value })} className="h-8" />
                            ) : course.title}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{course.level}L</TableCell>
                          <TableCell className="hidden md:table-cell">{course.semester}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {editingCourseId === course.id ? (
                              <Input type="number" value={editCourseData.units ?? 0} onChange={(e) => setEditCourseData({ ...editCourseData, units: Number(e.target.value) })} className="h-8 w-16" />
                            ) : course.units}
                          </TableCell>
                          <TableCell className="text-right">
                            {editingCourseId === course.id ? (
                              <div className="flex justify-end gap-1">
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveCourse(course.id)} disabled={saving}><Save className="w-3.5 h-3.5" /></Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEditCourse}><X className="w-3.5 h-3.5" /></Button>
                              </div>
                            ) : (
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEditCourse(course)}><Pencil className="w-3.5 h-3.5" /></Button>
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
                  <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
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
                              <Input type="number" value={editTopicData.sort_order ?? 0} onChange={(e) => setEditTopicData({ ...editTopicData, sort_order: Number(e.target.value) })} className="h-8 w-16" />
                            ) : topic.sort_order}
                          </TableCell>
                          <TableCell>
                            {editingTopicId === topic.id ? (
                              <Input value={editTopicData.title ?? ""} onChange={(e) => setEditTopicData({ ...editTopicData, title: e.target.value })} className="h-8" />
                            ) : topic.title}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline" className="text-xs font-mono">{topic.course_code}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {editingTopicId === topic.id ? (
                              <div className="flex justify-end gap-1">
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveTopic(topic.id)} disabled={saving}><Save className="w-3.5 h-3.5" /></Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEditTopic}><X className="w-3.5 h-3.5" /></Button>
                              </div>
                            ) : (
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEditTopic(topic)}><Pencil className="w-3.5 h-3.5" /></Button>
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
