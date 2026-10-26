import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Trophy, Flame, CheckCircle2, Medal } from "lucide-react";

export interface LeaderboardStudent {
  id: string;
  name: string;
  username: string;
  department: string;
  institution: string;
  completedModules: number;
  streakDays: number;
  isCurrentUser?: boolean;
}

interface CampusLeaderboardWidgetProps {
  currentUserId?: string;
  currentUserName?: string | null;
  currentUsername?: string | null;
  currentDepartment?: string | null;
  currentInstitution?: string | null;
  userCompletedModules: number;
  userStreakDays: number;
}

const CAMPUS_PEERS: LeaderboardStudent[] = [
  {
    id: "peer-1",
    name: "Adebayo Ogunlesi",
    username: "bayo_codes",
    department: "Computer Science",
    institution: "UNILAG",
    completedModules: 8,
    streakDays: 19,
  },
  {
    id: "peer-2",
    name: "Chidinma Okafor",
    username: "chidinma_o",
    department: "Computer Science",
    institution: "UNILAG",
    completedModules: 7,
    streakDays: 15,
  },
  {
    id: "peer-3",
    name: "Ibrahim Danjuma",
    username: "ibrahim_ee",
    department: "Electrical & Electronics Engineering",
    institution: "ABU Zaria",
    completedModules: 6,
    streakDays: 14,
  },
  {
    id: "peer-4",
    name: "Zainab Lawal",
    username: "zainab_med",
    department: "Medicine & Surgery",
    institution: "UI",
    completedModules: 6,
    streakDays: 11,
  },
  {
    id: "peer-5",
    name: "Ngozi Eze",
    username: "ngozi_e",
    department: "Economics",
    institution: "UNN",
    completedModules: 4,
    streakDays: 9,
  },
  {
    id: "peer-6",
    name: "Tunde Bakare",
    username: "tunde_b",
    department: "Microbiology",
    institution: "OAU",
    completedModules: 3,
    streakDays: 6,
  },
];

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "ST";

export default function CampusLeaderboardWidget({
  currentUserId,
  currentUserName,
  currentUsername,
  currentDepartment,
  currentInstitution,
  userCompletedModules,
  userStreakDays,
}: CampusLeaderboardWidgetProps) {
  const [sortMetric, setSortMetric] = useState<"combined" | "modules" | "streak">("combined");
  const [scope, setScope] = useState<"all" | "department">("all");

  const rankedStudents = useMemo(() => {
    const me: LeaderboardStudent = {
      id: currentUserId || "current-user",
      name: currentUserName ? `${currentUserName} (You)` : "You",
      username: currentUsername || "student",
      department: currentDepartment || "Computer Science",
      institution: currentInstitution
        ? currentInstitution.replace(/.*?\((.*?)\).*/, "$1")
        : "UNILAG",
      completedModules: userCompletedModules,
      streakDays: userStreakDays,
      isCurrentUser: true,
    };

    const all = [...CAMPUS_PEERS, me];
    const filtered =
      scope === "department" && currentDepartment
        ? all.filter(
            (s) =>
              s.department.toLowerCase() === currentDepartment.toLowerCase() || s.isCurrentUser
          )
        : all;

    return filtered
      .map((s) => ({
        ...s,
        shortName: s.isCurrentUser ? "You" : s.name.split(" ")[0],
        score: s.completedModules * 10 + s.streakDays * 3,
      }))
      .sort((a, b) => {
        if (sortMetric === "modules") {
          return b.completedModules - a.completedModules || b.streakDays - a.streakDays;
        }
        if (sortMetric === "streak") {
          return b.streakDays - a.streakDays || b.completedModules - a.completedModules;
        }
        return b.score - a.score;
      });
  }, [
    currentUserId,
    currentUserName,
    currentUsername,
    currentDepartment,
    currentInstitution,
    userCompletedModules,
    userStreakDays,
    sortMetric,
    scope,
  ]);

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Campus Leaderboard
            </CardTitle>
            <CardDescription className="mt-1 text-xs sm:text-sm">
              Top students ranked by completed course modules and active study streaks
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => setScope("all")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  scope === "all"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Campus
              </button>
              <button
                type="button"
                onClick={() => setScope("department")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  scope === "department"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                My Department
              </button>
            </div>

            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => setSortMetric("combined")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  sortMetric === "combined"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Combined
              </button>
              <button
                type="button"
                onClick={() => setSortMetric("modules")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  sortMetric === "modules"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Modules
              </button>
              <button
                type="button"
                onClick={() => setSortMetric("streak")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  sortMetric === "streak"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Streaks
              </button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Bar Chart Visualization */}
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rankedStudents}
              margin={{ top: 8, right: 12, left: -16, bottom: 4 }}
              barGap={6}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="shortName"
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "0.75rem",
                  fontSize: "12px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
              {(sortMetric === "combined" || sortMetric === "modules") && (
                <Bar
                  dataKey="completedModules"
                  name="Completed Modules"
                  fill="hsl(var(--primary))"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                />
              )}
              {(sortMetric === "combined" || sortMetric === "streak") && (
                <Bar
                  dataKey="streakDays"
                  name="Study Streak (Days)"
                  fill="hsl(var(--accent))"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* High-Density Leaderboard Table */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-12 gap-2 px-3 pb-2 text-xs font-medium text-muted-foreground border-b">
            <div className="col-span-1">Rank</div>
            <div className="col-span-6 sm:col-span-5">Student</div>
            <div className="hidden sm:block sm:col-span-2 text-right">Modules</div>
            <div className="col-span-3 sm:col-span-2 text-right">Streak</div>
            <div className="col-span-2 text-right">Points</div>
          </div>

          <div className="divide-y">
            {rankedStudents.map((student, idx) => {
              const rank = idx + 1;
              return (
                <div
                  key={student.id}
                  className={`grid grid-cols-12 gap-2 items-center px-3 py-2.5 text-sm transition-colors ${
                    student.isCurrentUser ? "bg-primary/[0.06] font-medium" : "hover:bg-muted/30"
                  }`}
                >
                  <div className="col-span-1 font-mono tabular-nums text-xs flex items-center gap-1">
                    {rank <= 3 ? (
                      <Medal
                        className={`w-4 h-4 shrink-0 ${
                          rank === 1
                            ? "text-amber-500"
                            : rank === 2
                            ? "text-slate-400"
                            : "text-amber-700"
                        }`}
                      />
                    ) : (
                      <span className="text-muted-foreground pl-1">{rank}.</span>
                    )}
                  </div>

                  <div className="col-span-6 sm:col-span-5 flex items-center gap-2.5 min-w-0">
                    <Avatar className="w-7 h-7 shrink-0">
                      <AvatarFallback
                        className={`text-[11px] font-semibold ${
                          student.isCurrentUser
                            ? "gradient-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {getInitials(student.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm truncate text-foreground">{student.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {student.department} · {student.institution}
                      </p>
                    </div>
                  </div>

                  <div className="hidden sm:flex sm:col-span-2 items-center justify-end gap-1 font-mono tabular-nums text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{student.completedModules}</span>
                  </div>

                  <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-1 font-mono tabular-nums text-xs">
                    <Flame className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span>{student.streakDays}d</span>
                  </div>

                  <div className="col-span-2 text-right font-mono tabular-nums text-xs font-semibold text-foreground">
                    {student.score}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
