import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const dayMap: Record<string, string> = {
  Monday: "MO", Tuesday: "TU", Wednesday: "WE", Thursday: "TH",
  Friday: "FR", Saturday: "SA", Sunday: "SU",
};

const dayOffsets: Record<string, number> = {
  Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3,
  Friday: 4, Saturday: 5, Sunday: 6,
};

function getNextMonday(): Date {
  const now = new Date();
  const dow = now.getDay();
  const daysUntil = dow === 0 ? 1 : dow === 1 ? 0 : 8 - dow;
  const d = new Date(now);
  d.setDate(now.getDate() + daysUntil);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toRFC3339(date: Date, h: number, m: number): string {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accessToken, timetable } = await req.json();

    if (!accessToken || !timetable) {
      return new Response(JSON.stringify({ error: 'accessToken and timetable are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const nextMonday = getNextMonday();
    const results: { success: boolean; summary: string; error?: string }[] = [];

    for (const day of timetable.schedule) {
      const offset = dayOffsets[day.day];
      if (offset === undefined) continue;
      const rruleDay = dayMap[day.day];

      for (const session of day.sessions) {
        if (!session.course_code) continue;

        const parts = session.time.split(/\s*-\s*/);
        if (parts.length < 2) continue;

        const [startH, startM] = parts[0].split(':').map(Number);
        const [endH, endM] = parts[1].split(':').map(Number);

        const eventDate = new Date(nextMonday);
        eventDate.setDate(nextMonday.getDate() + offset);

        const event = {
          summary: `📚 ${session.course_code} - ${session.title}`,
          description: session.activity,
          start: {
            dateTime: toRFC3339(eventDate, startH, startM),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Lagos',
          },
          end: {
            dateTime: toRFC3339(eventDate, endH, endM),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Lagos',
          },
          recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${rruleDay};COUNT=16`],
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 30 },
              { method: 'email', minutes: 30 },
            ],
          },
        };

        try {
          const resp = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          });

          if (!resp.ok) {
            const err = await resp.json();
            console.error(`Failed to create event for ${session.course_code}:`, err);
            results.push({ success: false, summary: event.summary, error: err.error?.message || 'Unknown error' });
          } else {
            results.push({ success: true, summary: event.summary });
          }
        } catch (e) {
          results.push({ success: false, summary: event.summary, error: e.message });
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(JSON.stringify({
      message: `${successCount} events added to Google Calendar${failCount > 0 ? `, ${failCount} failed` : ''}`,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
