import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Target, Clock, BookOpen, CheckCircle2, Settings2, Plus } from "lucide-react";
import type { StudyGoal, GoalCadence } from "@/lib/studentEngagement";

interface StudyGoalsWidgetProps {
  goals: StudyGoal[];
  onUpdateGoalTarget: (goalId: string, newTarget: number, newCurrent?: number) => void;
  onLogMinutes: (minutes: number) => void;
  onLogTopic: (count?: number) => void;
}

export default function StudyGoalsWidget({
  goals,
  onUpdateGoalTarget,
  onLogMinutes,
  onLogTopic,
}: StudyGoalsWidgetProps) {
  const [cadenceTab, setCadenceTab] = useState<GoalCadence>("daily");
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [targetDraft, setTargetDraft] = useState<string>("");

  const activeGoals = goals.filter((g) => g.cadence === cadenceTab);

  const startEditing = (goal: StudyGoal) => {
    setEditingGoalId(goal.id);
    setTargetDraft(String(goal.target));
  };

  const saveEdit = (goalId: string) => {
    const parsed = parseInt(targetDraft, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      onUpdateGoalTarget(goalId, parsed);
    }
    setEditingGoalId(null);
  };

  return (
    <Card className="border-border h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Study Goals
            </CardTitle>
            <CardDescription className="mt-1 text-xs sm:text-sm">
              Set daily or weekly targets for topics completed and study time
            </CardDescription>
          </div>

          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => setCadenceTab("daily")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                cadenceTab === "daily"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setCadenceTab("weekly")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                cadenceTab === "weekly"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Weekly
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
        <div className="divide-y">
          {activeGoals.map((goal) => {
            const pct = Math.min(100, Math.round((goal.current / Math.max(1, goal.target)) * 100));
            const isComplete = goal.current >= goal.target;
            const unitLabel = goal.metric === "topics" ? "topics" : "mins";

            return (
              <div key={goal.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {goal.metric === "topics" ? (
                      <BookOpen className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-primary shrink-0" />
                    )}
                    <span className="font-medium text-sm truncate">{goal.title}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono tabular-nums text-muted-foreground">
                      <strong className="text-foreground">{goal.current}</strong> / {goal.target} {unitLabel} ({pct}%)
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        editingGoalId === goal.id ? setEditingGoalId(null) : startEditing(goal)
                      }
                      title="Edit target"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <Progress value={pct} className="h-2.5" />

                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {isComplete ? (
                      <span className="text-primary font-medium inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Target achieved!
                      </span>
                    ) : (
                      <span className="tabular-nums">
                        {goal.target - goal.current} {unitLabel} remaining
                      </span>
                    )}
                  </span>

                  {editingGoalId === goal.id && (
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor={`target-${goal.id}`} className="sr-only">
                        New Target
                      </Label>
                      <Input
                        id={`target-${goal.id}`}
                        type="number"
                        min={1}
                        value={targetDraft}
                        onChange={(e) => setTargetDraft(e.target.value)}
                        className="h-7 w-20 text-xs tabular-nums"
                      />
                      <Button
                        size="sm"
                        className="h-7 px-2.5 text-xs"
                        onClick={() => saveEdit(goal.id)}
                      >
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick-log actions */}
        <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Quick log progress:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onLogTopic(1)}
              className="h-8 text-xs gap-1 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3 h-3" /> 1 Topic
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onLogMinutes(15)}
              className="h-8 text-xs gap-1 whitespace-nowrap shrink-0 tabular-nums"
            >
              <Plus className="w-3 h-3" /> 15m
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onLogMinutes(30)}
              className="h-8 text-xs gap-1 whitespace-nowrap shrink-0 tabular-nums"
            >
              <Plus className="w-3 h-3" /> 30m
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onLogMinutes(60)}
              className="h-8 text-xs gap-1 whitespace-nowrap shrink-0 tabular-nums"
            >
              <Plus className="w-3 h-3" /> 60m
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
