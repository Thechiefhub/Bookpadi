import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Calendar, FileText, Trash2, Clock, Lightbulb, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ReactMarkdown from "react-markdown";

interface StudyPlan {
  id: string;
  title: string;
  type: string;
  data: any;
  created_at: string;
}

export default function SavedPlans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("study_plans")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setPlans(data);
        setLoading(false);
      });
  }, [user]);

  const deletePlan = async (id: string) => {
    await supabase.from("study_plans").delete().eq("id", id);
    setPlans(plans.filter((p) => p.id !== id));
    toast.success("Plan deleted");
  };

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
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-primary" /> Saved Plans
            </h1>
            <p className="text-muted-foreground mt-1">Your generated timetables and study guides</p>
          </div>
          <Link to="/planner">
            <Button size="sm" className="gradient-primary hover:opacity-90">
              + New Plan
            </Button>
          </Link>
        </div>

        {plans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No saved plans yet.</p>
              <p className="text-sm mt-1">Generate a timetable or study guide to see it here.</p>
            </CardContent>
          </Card>
        ) : (
          plans.map((plan) => {
            const isExpanded = expandedPlan === plan.id;
            const isTimetable = plan.type === "timetable";
            const isGuide = plan.type === "guide";

            return (
              <Card key={plan.id} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {isTimetable ? (
                          <Calendar className="w-5 h-5 text-primary" />
                        ) : (
                          <FileText className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base">{plan.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {isTimetable ? "Timetable" : "Study Guide"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(plan.created_at).toLocaleDateString("en-NG", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deletePlan(plan.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="border-t bg-muted/30">
                    {isTimetable && plan.data?.schedule && (
                      <div className="space-y-4">
                        {plan.data.schedule.map((day: any) => (
                          <div key={day.day}>
                            <h4 className="text-sm font-semibold mb-2">{day.day}</h4>
                            {day.sessions?.length === 0 ? (
                              <p className="text-sm text-muted-foreground italic">Day off</p>
                            ) : (
                              <div className="space-y-1.5">
                                {day.sessions?.map((s: any, i: number) => (
                                  <div key={i} className="flex gap-3 text-sm p-2 rounded-md bg-background border">
                                    <span className="font-mono text-xs text-muted-foreground shrink-0 flex items-center gap-1 w-28">
                                      <Clock className="w-3 h-3" /> {s.time}
                                    </span>
                                    <div className="min-w-0">
                                      <span className="font-medium">
                                        {s.course_code && <span className="font-mono text-xs mr-1">{s.course_code}</span>}
                                        {s.title}
                                      </span>
                                      <p className="text-xs text-muted-foreground">{s.activity}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {plan.data.tips?.length > 0 && (
                          <div className="pt-3 border-t">
                            <h4 className="text-sm font-semibold flex items-center gap-1 mb-2">
                              <Lightbulb className="w-4 h-4 text-amber-500" /> Tips
                            </h4>
                            <ul className="space-y-1">
                              {plan.data.tips.map((tip: string, i: number) => (
                                <li key={i} className="text-sm text-muted-foreground">
                                  {i + 1}. {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {isGuide && plan.data?.content && (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{plan.data.content}</ReactMarkdown>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </AppLayout>
  );
}
