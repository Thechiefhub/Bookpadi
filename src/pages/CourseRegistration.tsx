import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { ClipboardList, Plus, Trash2, BookOpen, AlertCircle, Loader2 } from "lucide-react";

interface CourseReg {
  id: string;
  course_code: string;
  course_title: string;
  units: number;
  semester: number;
  level: number;
  session: string;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-muted text-muted-foreground",
  registered: "bg-primary/15 text-primary",
  approved: "bg-accent/15 text-accent",
  dropped: "bg-destructive/15 text-destructive",
};

const MAX_UNITS = 24;

export default function CourseRegistration() {
  const { user, profile } = useAuth();
  const [registrations, setRegistrations] = useState<CourseReg[]>([]);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState("2024/2025");
  const [selectedSemester, setSelectedSemester] = useState("1");

  const [form, setForm] = useState({
    course_code: "",
    course_title: "",
    units: "3",
    semester: "1",
    level: String(profile?.level || 100),
    session: "2024/2025",
  });

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, profile]);

  const fetchData = async () => {
    const [regsRes, coursesRes] = await Promise.all([
      supabase.from("course_registrations").select("*").eq("user_id", user!.id).order("created_at"),
      profile?.department_id
        ? supabase.from("courses").select("*").eq("department_id", profile.department_id).order("course_code")
        : Promise.resolve({ data: [] }),
    ]);
    setRegistrations((regsRes.data as CourseReg[]) || []);
    setAvailableCourses(coursesRes.data || []);
    setLoading(false);
  };

  const addRegistration = async () => {
    if (!form.course_code || !form.course_title) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    await supabase.from("course_registrations").insert({
      user_id: user!.id,
      course_code: form.course_code.toUpperCase(),
      course_title: form.course_title,
      units: parseInt(form.units),
      semester: parseInt(form.semester),
      level: parseInt(form.level),
      session: form.session,
    });
    setDialogOpen(false);
    setForm({ course_code: "", course_title: "", units: "3", semester: "1", level: String(profile?.level || 100), session: "2024/2025" });
    fetchData();
    toast({ title: "Course added to plan!" });
  };

  const addFromCatalog = async (course: any) => {
    await supabase.from("course_registrations").insert({
      user_id: user!.id,
      course_code: course.course_code,
      course_title: course.title,
      units: course.units,
      semester: course.semester,
      level: course.level,
      session: selectedSession,
    });
    fetchData();
    toast({ title: `${course.course_code} added!` });
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("course_registrations").update({ status }).eq("id", id);
    fetchData();
  };

  const deleteReg = async (id: string) => {
    await supabase.from("course_registrations").delete().eq("id", id);
    fetchData();
    toast({ title: "Course removed" });
  };

  const filtered = registrations.filter(
    (r) => r.session === selectedSession && r.semester === parseInt(selectedSemester)
  );
  const totalUnits = filtered.filter((r) => r.status !== "dropped").reduce((s, r) => s + r.units, 0);
  const unitsExceeded = totalUnits > MAX_UNITS;

  const alreadyRegistered = new Set(registrations.map((r) => r.course_code));
  const unregisteredCourses = availableCourses.filter(
    (c) => !alreadyRegistered.has(c.course_code) && c.semester === parseInt(selectedSemester)
  );

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-primary" /> Course Registration
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Plan and track your course registrations</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Add Custom</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Course Manually</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Course Code</Label>
                    <Input placeholder="CSC 101" value={form.course_code} onChange={(e) => setForm({ ...form, course_code: e.target.value })} />
                  </div>
                  <div>
                    <Label>Units</Label>
                    <Select value={form.units} onValueChange={(v) => setForm({ ...form, units: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 6].map((u) => <SelectItem key={u} value={String(u)}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Course Title</Label>
                  <Input placeholder="Introduction to Computer Science" value={form.course_title} onChange={(e) => setForm({ ...form, course_title: e.target.value })} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Semester</Label>
                    <Select value={form.semester} onValueChange={(v) => setForm({ ...form, semester: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st</SelectItem>
                        <SelectItem value="2">2nd</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Level</Label>
                    <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[100, 200, 300, 400, 500].map((l) => <SelectItem key={l} value={String(l)}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Session</Label>
                    <Select value={form.session} onValueChange={(v) => setForm({ ...form, session: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["2024/2025", "2023/2024"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={addRegistration} className="w-full">Add Course</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Unit Summary */}
        <Card className={unitsExceeded ? "border-destructive" : ""}>
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Units ({selectedSession}, Sem {selectedSemester})</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-3xl font-bold ${unitsExceeded ? "text-destructive" : "text-primary"}`}>{totalUnits}</span>
                <span className="text-muted-foreground">/ {MAX_UNITS} max</span>
              </div>
            </div>
            {unitsExceeded && (
              <div className="flex items-center gap-1 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" /> Exceeds limit!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex gap-3">
          <Select value={selectedSession} onValueChange={setSelectedSession}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["2024/2025", "2023/2024"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedSemester} onValueChange={setSelectedSemester}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1st Semester</SelectItem>
              <SelectItem value="2">2nd Semester</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Registered Courses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Courses</CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No courses planned yet. Add from the catalog below or manually.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead className="hidden sm:table-cell">Title</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono font-medium">{r.course_code}</TableCell>
                      <TableCell className="hidden sm:table-cell max-w-[180px] truncate">{r.course_title}</TableCell>
                      <TableCell>{r.units}</TableCell>
                      <TableCell>
                        <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
                          <SelectTrigger className="h-7 w-28">
                            <Badge className={STATUS_COLORS[r.status]}>{r.status}</Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {["planned", "registered", "approved", "dropped"].map((s) => (
                              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteReg(r.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Available from Catalog */}
        {unregisteredCourses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5" /> Available from Your Department
              </CardTitle>
              <CardDescription>Click to add courses from your department's catalog</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2">
                {unregisteredCourses.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => addFromCatalog(c)}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left w-full"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-medium">{c.course_code}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.title}</p>
                    </div>
                    <Badge variant="outline">{c.units}u</Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
