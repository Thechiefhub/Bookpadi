export interface Course {
  id: string;
  course_code: string;
  title: string;
  units: number;
}

export interface Session {
  time: string;
  course_code: string | null;
  title: string;
  activity: string;
}

export interface DaySchedule {
  day: string;
  sessions: Session[];
}

export interface Timetable {
  schedule: DaySchedule[];
  tips: string[];
}

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const TIME_OPTIONS_24H = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, "0");
  return `${h}:00`;
});

export const COURSE_COLORS = [
  "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800",
  "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800",
  "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800",
  "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
  "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800",
];

export const COURSE_BG_HEX = [
  "#dbeafe", "#d1fae5", "#ede9fe", "#fef3c7", "#ffe4e6", "#cffafe", "#ffedd5", "#fce7f3",
];

export function getCourseColor(courseCode: string | null, allCodes: string[]): string {
  if (!courseCode) return "bg-muted text-muted-foreground border-border";
  const idx = allCodes.indexOf(courseCode);
  return COURSE_COLORS[idx % COURSE_COLORS.length];
}

export function getCourseHex(courseCode: string | null, allCodes: string[]): string {
  if (!courseCode) return "#f3f4f6";
  const idx = allCodes.indexOf(courseCode);
  return COURSE_BG_HEX[idx % COURSE_BG_HEX.length];
}
