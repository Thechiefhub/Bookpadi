import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Flame,
  Zap,
  Award,
  Trophy,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Target,
  Lock,
} from "lucide-react";
import type { BadgeItem } from "@/lib/studentEngagement";

interface BadgesWidgetProps {
  streakDays: number;
  bestStreak: number;
  checkedInToday: boolean;
  completedModulesCount: number;
  completedTopicsCount: number;
  badges: BadgeItem[];
  onCheckInStreak: () => void;
}

const ICON_MAP = {
  flame: Flame,
  zap: Zap,
  award: Award,
  trophy: Trophy,
  book: BookOpen,
  "check-circle": CheckCircle2,
  "graduation-cap": GraduationCap,
  target: Target,
};

export default function BadgesWidget({
  streakDays,
  bestStreak,
  checkedInToday,
  completedModulesCount,
  completedTopicsCount,
  badges,
  onCheckInStreak,
}: BadgesWidgetProps) {
  const [filter, setFilter] = useState<"all" | "streak" | "module">("all");

  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const filteredBadges = badges.filter((b) => {
    if (filter === "all") return true;
    if (filter === "streak") return b.category === "streak";
    return b.category === "module" || b.category === "goal";
  });

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Study Streaks & Achievements
            </CardTitle>
            <CardDescription className="mt-1 text-xs sm:text-sm">
              <span className="tabular-nums font-medium text-foreground">
                {unlockedCount} of {badges.length} badges earned
              </span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span className="tabular-nums">{completedModulesCount} modules finished</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span className="tabular-nums">{completedTopicsCount} topics completed</span>
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5 font-bold text-base tabular-nums">
                <Flame className="w-4 h-4 text-accent" />
                <span>{streakDays} day streak</span>
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">
                Best: {bestStreak} days
              </p>
            </div>
            <Button
              size="sm"
              variant={checkedInToday ? "outline" : "default"}
              onClick={onCheckInStreak}
              className="whitespace-nowrap shrink-0 h-9"
            >
              {checkedInToday ? "Checked in today" : "Log Daily Streak"}
            </Button>
          </div>
        </div>

        {/* Interactive segmented filter */}
        <div className="flex items-center justify-between pt-3 border-t mt-3">
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === "all"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Badges ({badges.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("streak")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === "streak"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Study Streaks
            </button>
            <button
              type="button"
              onClick={() => setFilter("module")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === "module"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Course Modules & Goals
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0">
          {filteredBadges.map((badge) => {
            const IconComponent = ICON_MAP[badge.iconName] || Award;
            return (
              <div
                key={badge.id}
                className={`pt-3 sm:pt-0 sm:p-3.5 sm:rounded-xl sm:border transition-opacity ${
                  badge.unlocked
                    ? "bg-primary/[0.04] border-primary/25"
                    : "bg-muted/20 border-border/60 opacity-80"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      badge.unlocked
                        ? "gradient-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 tabular-nums">
                    {badge.unlocked ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                        Unlocked
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" />
                        {badge.progress}%
                      </>
                    )}
                  </span>
                </div>

                <h4 className="font-semibold text-sm text-foreground">{badge.name}</h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {badge.description}
                </p>

                <div className="mt-3 space-y-1">
                  <Progress value={badge.progress} className="h-1.5" />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                    <span>{badge.progressLabel}</span>
                    <span>{badge.unlocked ? "Complete" : "In progress"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
