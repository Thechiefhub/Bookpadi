import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { courses, studyHoursPerDay, preferredStartTime, preferredEndTime, daysOff } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const courseList = courses.map((c: any) => `- ${c.course_code}: ${c.title} (${c.units} units)`).join("\n");

    const systemPrompt = `You are an academic study planner for Nigerian university students. Generate a realistic weekly study timetable in JSON format.

Rules:
- Allocate more study hours to courses with higher units
- Each study session should be 1-2 hours max
- Include short breaks between sessions
- Spread each course across multiple days for better retention
- Respect the student's preferred study window and days off
- Return ONLY valid JSON, no markdown or extra text

Return format:
{
  "schedule": [
    {
      "day": "Monday",
      "sessions": [
        { "time": "08:00 - 09:30", "course_code": "CSC201", "title": "Computer Programming II", "activity": "Review lecture notes & practice coding" },
        { "time": "09:30 - 09:45", "course_code": null, "title": "Break", "activity": "Rest" }
      ]
    }
  ],
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}`;

    const userPrompt = `Create a weekly study timetable for these courses:
${courseList}

Study preferences:
- Available study hours per day: ${studyHoursPerDay}
- Preferred study window: ${preferredStartTime} to ${preferredEndTime}
- Days off (no study): ${daysOff?.length ? daysOff.join(", ") : "None"}

Generate a balanced timetable that covers all courses proportionally to their unit weight.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_timetable",
              description: "Generate a weekly study timetable",
              parameters: {
                type: "object",
                properties: {
                  schedule: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day: { type: "string" },
                        sessions: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              time: { type: "string" },
                              course_code: { type: "string", nullable: true },
                              title: { type: "string" },
                              activity: { type: "string" },
                            },
                            required: ["time", "title", "activity"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["day", "sessions"],
                      additionalProperties: false,
                    },
                  },
                  tips: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["schedule", "tips"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_timetable" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Failed to generate timetable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const timetable = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(timetable), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-timetable error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
