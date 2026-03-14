import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Calculator, Plus, Trash2, TrendingUp, Award, BookOpen, Loader2 } from "lucide-react";

const GRADE_POINTS: Record<string, number> = {
  A: 5.0, B: 4.0, C: 3.0, D: 2.0, E: 1.0, F: 0.0,
};

const GRADE_COLORS: Record<string, string> = {
  A: "bg-accent text-accent-foreground",
  B: "bg-primary/80 text-primary-foreground",
  C: "bg-secondary text-secondary-foreground",
  D: "bg-muted text-muted-foreground",
  E: "bg-destructive/60 text-destructive-foreground",
  F: "bg-destructive text-destructive-foreground",
};

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

export default function GpaCalculator() {
  const { user, profile } = useAuth();
  const [records, setRecords] = useState<GpaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState("2024/2025");
  const [selectedSemester, setSelectedSemester] = useState("1");

  const [form, setForm] = useState({
    course_code: "",
    course_title: "",
    units: "3",
    grade: "A",
    semester: "1",
    level: String(profile?.level || 100),
    session: "2024/2025",
  });

  useEffect(() => {
    if (!user) return;
    fetchRecords();
  }, [user]);

  const fetchRecords = async () => {
    const { data } = await supabase
      .from("gpa_records")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setRecords((data as GpaRecord[]) || []);
    setLoading(false);
  };

  const addRecord = async () => {
    if (!form.course_code || !form.course_title) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    await supabase.from("gpa_records").insert({
      user_id: user!.id,
      course_code: form.course_code.toUpperCase(),
      course_title: form.course_title,
      units: parseInt(form.units),
      grade: form.grade,
      semester: parseInt(form.semester),
      level: parseInt(form.level),
      session: form.session,
    });
    setDialogOpen(false);
    setForm({ course_code: "", course_title: "", units: "3", grade: "A", semester: "1", level: String(profile?.level || 100), session: "2024/2025" });
    fetchRecords();
    toast({ title: "Course grade added!" });
  };

  const deleteRecord = async (id: string) => {
    await supabase.from("gpa_records").delete().eq("id", id);
    fetchRecords();
    toast({ title: "Record deleted" });
  };

  const filteredRecords = records.filter(
    (r) => r.session === selectedSession && r.semester === parseInt(selectedSemester)
  );

  const calcGPA = (recs: GpaRecord[]) => {
    if (recs.length === 0) return 0;
    const totalPoints = recs.reduce((sum, r) => sum + (GRADE_POINTS[r.grade] || 0) * r.units, 0);
    const totalUnits = recs.reduce((sum, r) => sum + r.units, 0);
    return totalUnits > 0 ? totalPoints / totalUnits : 0;
  };

  const semesterGPA = calcGPA(filteredRecords);
  const cumulativeGPA = calcGPA(records);
  const totalUnits = records.reduce((s, r) => s + r.units, 0);
  const semesterUnits = filteredRecords.reduce((s, r) => s + r.units, 0);

  const getClassification = (gpa: number) => {
    if (gpa >= 4.5) return "First Class";
    if (gpa >= 3.5) return "Second Class Upper";
    if (gpa >= 2.5) return "Second Class Lower";
    if (gpa >= 1.5) return "Third Class";
    if (gpa >= 1.0) return "Pass";
    return "Fail";
  };

  const sessions = [...new Set(records.map((r) => r.session)), "2024/2025", "2023/2024"].filter(
    (v, i, a) => a.indexOf(v) === i
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
              <Calculator className="w-6 h-6 text-primary" /> GPA Calculator
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Track your grades and monitor academic performance</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Add Grade</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Course Grade</DialogTitle>
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
                        {[1, 2, 3, 4, 6].map((u) => <SelectItem key={u} value={String(u)}>{u} units</SelectItem>)}
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
                    <Label>Grade</Label>
                    <Select value={form.grade} onValueChange={(v) => setForm({ ...form, grade: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(GRADE_POINTS).map((g) => <SelectItem key={g} value={g}>{g} ({GRADE_POINTS[g].toFixed(1)})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
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
                </div>
                <div>
                  <Label>Session</Label>
                  <Select value={form.session} onValueChange={(v) => setForm({ ...form, session: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["2024/2025", "2023/2024", "2022/2023", "2021/2022"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addRecord} className="w-full">Add Grade</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="hover-lift">
            <CardContent className="pt-5 pb-4 text-center">
              <div className="text-3xl font-bold text-primary">{semesterGPA.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">Semester GPA</p>
            </CardContent>
          </Card>
          <Card className="hover-lift">
            <CardContent className="pt-5 pb-4 text-center">
              <div className="text-3xl font-bold text-accent">{cumulativeGPA.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">Cumulative GPA</p>
            </CardContent>
          </Card>
          <Card className="hover-lift">
            <CardContent className="pt-5 pb-4 text-center">
              <div className="text-3xl font-bold text-secondary">{totalUnits}</div>
              <p className="text-xs text-muted-foreground mt-1">Total Units</p>
            </CardContent>
          </Card>
          <Card className="hover-lift">
            <CardContent className="pt-5 pb-4 text-center">
              <Award className="w-5 h-5 mx-auto text-primary mb-1" />
              <div className="text-sm font-semibold">{getClassification(cumulativeGPA)}</div>
              <p className="text-xs text-muted-foreground mt-1">Classification</p>
            </CardContent>
          </Card>
        </div>

        {/* GPA Progress Bar */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">CGPA Progress</span>
              <span className="text-sm text-muted-foreground">{cumulativeGPA.toFixed(2)} / 5.00</span>
            </div>
            <Progress value={(cumulativeGPA / 5) * 100} className="h-3" />
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex gap-3">
          <Select value={selectedSession} onValueChange={setSelectedSession}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {sessions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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

        {/* Records Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              {selectedSession} — {selectedSemester === "1" ? "1st" : "2nd"} Semester
              <Badge variant="secondary">{semesterUnits} units</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredRecords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>No grades recorded for this semester yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead className="hidden sm:table-cell">Title</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono font-medium">{r.course_code}</TableCell>
                      <TableCell className="hidden sm:table-cell max-w-[200px] truncate">{r.course_title}</TableCell>
                      <TableCell>{r.units}</TableCell>
                      <TableCell>
                        <Badge className={GRADE_COLORS[r.grade] || ""}>{r.grade}</Badge>
                      </TableCell>
                      <TableCell>{((GRADE_POINTS[r.grade] || 0) * r.units).toFixed(1)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteRecord(r.id)} className="h-8 w-8 text-destructive">
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
      </div>
    </AppLayout>
  );
}
