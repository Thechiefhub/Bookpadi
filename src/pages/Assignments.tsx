import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format, isPast, isToday, isTomorrow, differenceInDays } from "date-fns";
import { CalendarIcon, Plus, Trash2, CheckCircle2, Clock, AlertTriangle, ListTodo, Loader2 } from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  course_code: string | null;
  description: string | null;
  due_date: string;
  priority: string;
  status: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-destructive/15 text-destructive border-destructive/30",
  medium: "bg-primary/15 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground border-border",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4 text-muted-foreground" />,
  "in-progress": <ListTodo className="w-4 h-4 text-primary" />,
  completed: <CheckCircle2 className="w-4 h-4 text-accent" />,
};

export default function Assignments() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [date, setDate] = useState<Date>();

  const [form, setForm] = useState({
    title: "",
    course_code: "",
    description: "",
    priority: "medium",
  });

  useEffect(() => {
    if (!user) return;
    fetchAssignments();
  }, [user]);

  const fetchAssignments = async () => {
    const { data } = await supabase
      .from("assignments")
      .select("*")
      .eq("user_id", user!.id)
      .order("due_date", { ascending: true });
    setAssignments((data as Assignment[]) || []);
    setLoading(false);
  };

  const addAssignment = async () => {
    if (!form.title || !date) {
      toast({ title: "Title and due date are required", variant: "destructive" });
      return;
    }
    await supabase.from("assignments").insert({
      user_id: user!.id,
      title: form.title,
      course_code: form.course_code || null,
      description: form.description || null,
      due_date: date.toISOString(),
      priority: form.priority,
    });
    setDialogOpen(false);
    setForm({ title: "", course_code: "", description: "", priority: "medium" });
    setDate(undefined);
    fetchAssignments();
    toast({ title: "Assignment added!" });
  };

  const toggleStatus = async (a: Assignment) => {
    const next = a.status === "pending" ? "in-progress" : a.status === "in-progress" ? "completed" : "pending";
    await supabase.from("assignments").update({ status: next }).eq("id", a.id);
    fetchAssignments();
  };

  const deleteAssignment = async (id: string) => {
    await supabase.from("assignments").delete().eq("id", id);
    fetchAssignments();
    toast({ title: "Assignment deleted" });
  };

  const getDueLabel = (d: string) => {
    const due = new Date(d);
    if (isToday(due)) return { text: "Due today", urgent: true };
    if (isTomorrow(due)) return { text: "Due tomorrow", urgent: true };
    if (isPast(due)) return { text: "Overdue", urgent: true };
    const days = differenceInDays(due, new Date());
    return { text: `${days} days left`, urgent: days <= 3 };
  };

  const filtered = assignments.filter((a) => {
    if (filter === "all") return true;
    if (filter === "overdue") return isPast(new Date(a.due_date)) && a.status !== "completed";
    return a.status === filter;
  });

  const overdue = assignments.filter((a) => isPast(new Date(a.due_date)) && a.status !== "completed").length;
  const pending = assignments.filter((a) => a.status === "pending").length;
  const completed = assignments.filter((a) => a.status === "completed").length;

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
              <ListTodo className="w-6 h-6 text-primary" /> Assignments
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Track deadlines and manage your assignments</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Add</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Assignment</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label>Title</Label>
                  <Input placeholder="e.g. CSC 301 Lab Report" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Course Code (optional)</Label>
                    <Input placeholder="CSC 301" value={form.course_code} onChange={(e) => setForm({ ...form, course_code: e.target.value })} />
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">🔴 High</SelectItem>
                        <SelectItem value="medium">🟡 Medium</SelectItem>
                        <SelectItem value="low">🟢 Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Textarea placeholder="Details about the assignment..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <Button onClick={addAssignment} className="w-full">Add Assignment</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="cursor-pointer hover-lift" onClick={() => setFilter("pending")}>
            <CardContent className="pt-4 pb-3 text-center">
              <Clock className="w-5 h-5 mx-auto mb-1 text-primary" />
              <div className="text-2xl font-bold">{pending}</div>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover-lift" onClick={() => setFilter("overdue")}>
            <CardContent className="pt-4 pb-3 text-center">
              <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-destructive" />
              <div className="text-2xl font-bold">{overdue}</div>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover-lift" onClick={() => setFilter("completed")}>
            <CardContent className="pt-4 pb-3 text-center">
              <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-accent" />
              <div className="text-2xl font-bold">{completed}</div>
              <p className="text-xs text-muted-foreground">Done</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "in-progress", "completed", "overdue"].map((f) => (
            <Button key={f} variant={filter === f ? "secondary" : "ghost"} size="sm" onClick={() => setFilter(f)} className="capitalize">
              {f === "in-progress" ? "In Progress" : f}
            </Button>
          ))}
        </div>

        {/* Assignment List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <ListTodo className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>No assignments found.</p>
              </CardContent>
            </Card>
          ) : (
            filtered.map((a) => {
              const due = getDueLabel(a.due_date);
              return (
                <Card key={a.id} className={cn("transition-all hover:shadow-elevated", a.status === "completed" && "opacity-60")}>
                  <CardContent className="py-4 flex items-start gap-3">
                    <button onClick={() => toggleStatus(a)} className="mt-1 shrink-0">
                      {STATUS_ICONS[a.status]}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("font-medium", a.status === "completed" && "line-through")}>{a.title}</span>
                        {a.course_code && <Badge variant="outline" className="text-xs">{a.course_code}</Badge>}
                        <Badge variant="outline" className={cn("text-xs", PRIORITY_COLORS[a.priority])}>{a.priority}</Badge>
                      </div>
                      {a.description && <p className="text-sm text-muted-foreground mt-1 truncate">{a.description}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <CalendarIcon className="w-3 h-3 text-muted-foreground" />
                        <span className={cn("text-xs", due.urgent && a.status !== "completed" ? "text-destructive font-medium" : "text-muted-foreground")}>
                          {format(new Date(a.due_date), "MMM d, yyyy")} · {due.text}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => deleteAssignment(a.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
