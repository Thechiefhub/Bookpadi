import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { gpaRecords, courses, assignments } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert academic advisor at a Nigerian university. Analyze the student's academic data and provide a personalized, actionable study plan.

Your analysis must include:
1. **Performance Overview**: Summary of current academic standing
2. **Weak Areas Identified**: Courses/subjects where improvement is needed, ranked by urgency
3. **Strength Areas**: What the student is doing well
4. **Root Cause Analysis**: Why they might be struggling (based on patterns)
5. **Personalized Study Plan**: Specific, actionable recommendations for each weak area
6. **Time Allocation Guide**: How to distribute study hours across subjects
7. **Quick Wins**: Easy improvements they can make immediately
8. **Long-term Strategy**: Semester-level improvement plan

Use the Nigerian grading system (A=5.0, B=4.0, C=3.0, D=2.0, E=1.0, F=0).
Use markdown formatting with clear headings and bullet points.
Be motivational but realistic. Reference specific courses by code.`;

    let dataDescription = "Here is the student's academic data:\n\n";
    
    if (gpaRecords?.length > 0) {
      dataDescription += "**GPA Records:**\n";
      gpaRecords.forEach((r: any) => {
        dataDescription += `- ${r.course_code} (${r.course_title}): Grade ${r.grade}, ${r.units} units, Level ${r.level}, Semester ${r.semester}\n`;
      });
      dataDescription += "\n";
    }

    if (courses?.length > 0) {
      dataDescription += "**Registered Courses:**\n";
      courses.forEach((c: any) => {
        dataDescription += `- ${c.course_code}: ${c.course_title} (${c.units} units)\n`;
      });
      dataDescription += "\n";
    }

    if (assignments?.length > 0) {
      dataDescription += "**Assignments:**\n";
      assignments.forEach((a: any) => {
        dataDescription += `- ${a.title} (${a.course_code || "General"}): Status=${a.status}, Priority=${a.priority}, Due=${a.due_date}\n`;
      });
    }

    if (!gpaRecords?.length && !courses?.length && !assignments?.length) {
      dataDescription += "No academic data available yet. Provide general study advice for a Nigerian university student.";
    }

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
          { role: "user", content: dataDescription },
        ],
        stream: true,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("analyze-weak-areas error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
