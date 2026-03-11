import { Timetable } from "./types";

/**
 * Generate an .ics (iCalendar) file from a timetable.
 * Each session becomes a recurring weekly event with a 30-minute reminder.
 */
export function generateICS(timetable: Timetable): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bookpadi//StudyPlanner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  const dayMap: Record<string, { offset: number; rruleDay: string }> = {
    Monday: { offset: 0, rruleDay: "MO" },
    Tuesday: { offset: 1, rruleDay: "TU" },
    Wednesday: { offset: 2, rruleDay: "WE" },
    Thursday: { offset: 3, rruleDay: "TH" },
    Friday: { offset: 4, rruleDay: "FR" },
    Saturday: { offset: 5, rruleDay: "SA" },
    Sunday: { offset: 6, rruleDay: "SU" },
  };

  // Find next Monday as the base date
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun,1=Mon,...
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);

  let uid = 0;

  for (const day of timetable.schedule) {
    const info = dayMap[day.day];
    if (!info) continue;

    for (const session of day.sessions) {
      if (!session.course_code) continue; // skip breaks

      // Parse time like "08:00 - 09:30" or "08:00-09:30"
      const parts = session.time.split(/\s*-\s*/);
      if (parts.length < 2) continue;

      const [startH, startM] = parts[0].split(":").map(Number);
      const [endH, endM] = parts[1].split(":").map(Number);

      const eventDate = new Date(nextMonday);
      eventDate.setDate(nextMonday.getDate() + info.offset);

      const dtStart = formatDT(eventDate, startH, startM);
      const dtEnd = formatDT(eventDate, endH, endM);

      uid++;
      lines.push(
        "BEGIN:VEVENT",
        `UID:bookpadi-${uid}-${Date.now()}@studyplanner`,
        `DTSTAMP:${formatDTNow()}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `RRULE:FREQ=WEEKLY;BYDAY=${info.rruleDay};COUNT=16`,
        `SUMMARY:📚 ${session.course_code} - ${session.title}`,
        `DESCRIPTION:${session.activity}`,
        "BEGIN:VALARM",
        "TRIGGER:-PT30M",
        "ACTION:DISPLAY",
        `DESCRIPTION:Study reminder: ${session.course_code} starts in 30 minutes`,
        "END:VALARM",
        "END:VEVENT"
      );
    }
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatDT(date: Date, h: number, m: number): string {
  const y = date.getFullYear();
  const mo = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  return `${y}${mo}${d}T${pad(h)}${pad(m)}00`;
}

function formatDTNow(): string {
  const n = new Date();
  return `${n.getFullYear()}${pad(n.getMonth() + 1)}${pad(n.getDate())}T${pad(n.getHours())}${pad(n.getMinutes())}${pad(n.getSeconds())}Z`;
}

export function downloadICS(timetable: Timetable) {
  const ics = generateICS(timetable);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "study-timetable.ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
