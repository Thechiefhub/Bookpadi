import { Timetable, DAYS, getCourseColor } from "./types";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  timetable: Timetable;
  allCourseCodes: string[];
}

/** Parse "08:00" → 8, "08:00 - 09:30" → 8 */
function parseHour(time: string): number {
  const match = time.match(/^(\d{1,2})/);
  return match ? parseInt(match[1], 10) : 0;
}

/** Build a lookup: day → hour → session[] */
function buildGrid(timetable: Timetable) {
  const grid: Record<string, Record<number, { time: string; course_code: string | null; title: string; activity: string }[]>> = {};
  for (const day of timetable.schedule) {
    grid[day.day] = {};
    for (const s of day.sessions) {
      const h = parseHour(s.time);
      if (!grid[day.day][h]) grid[day.day][h] = [];
      grid[day.day][h].push(s);
    }
  }
  return grid;
}

/** Determine the min/max hours to display */
function getHourRange(timetable: Timetable): [number, number] {
  let min = 23, max = 0;
  for (const day of timetable.schedule) {
    for (const s of day.sessions) {
      const h = parseHour(s.time);
      if (h < min) min = h;
      if (h > max) max = h;
    }
  }
  if (min > max) return [8, 18];
  return [Math.max(0, min), Math.min(23, max + 1)];
}

export default function TimetableGrid({ timetable, allCourseCodes }: Props) {
  const grid = buildGrid(timetable);
  const [minH, maxH] = getHourRange(timetable);
  const hours = Array.from({ length: maxH - minH + 1 }, (_, i) => minH + i);
  const activeDays = timetable.schedule.filter(d => d.sessions.length > 0).map(d => d.day);
  const displayDays = activeDays.length > 0 ? activeDays : DAYS.slice(0, 5);

  return (
    <TooltipProvider delayDuration={200}>
      <ScrollArea className="w-full rounded-lg border">
        <div className="min-w-[640px]">
          {/* Header row */}
          <div
            className="grid border-b bg-muted/50 sticky top-0 z-10"
            style={{ gridTemplateColumns: `80px repeat(${displayDays.length}, 1fr)` }}
          >
            <div className="p-2 text-xs font-semibold text-muted-foreground border-r text-center">Time</div>
            {displayDays.map(day => (
              <div key={day} className="p-2 text-xs font-semibold text-center border-r last:border-r-0">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.slice(0, 3)}</span>
              </div>
            ))}
          </div>

          {/* Time rows */}
          {hours.map(hour => {
            const label = `${hour.toString().padStart(2, "0")}:00`;
            return (
              <div
                key={hour}
                className="grid border-b last:border-b-0"
                style={{ gridTemplateColumns: `80px repeat(${displayDays.length}, 1fr)` }}
              >
                <div className="p-2 text-xs font-mono text-muted-foreground border-r flex items-start justify-center pt-3">
                  {label}
                </div>
                {displayDays.map(day => {
                  const sessions = grid[day]?.[hour] || [];
                  return (
                    <div key={day} className="border-r last:border-r-0 p-1 min-h-[56px]">
                      {sessions.map((s, i) => (
                        <Tooltip key={i}>
                          <TooltipTrigger asChild>
                            <div
                              className={`rounded-md px-2 py-1.5 text-xs mb-1 border cursor-default ${getCourseColor(s.course_code, allCourseCodes)}`}
                            >
                              <p className="font-semibold truncate">
                                {s.course_code || s.title}
                              </p>
                              <p className="truncate opacity-75 text-[10px]">{s.time}</p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[220px]">
                            <p className="font-semibold text-sm">{s.title}</p>
                            <p className="text-xs text-muted-foreground">{s.time}</p>
                            <p className="text-xs mt-1">{s.activity}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </TooltipProvider>
  );
}
