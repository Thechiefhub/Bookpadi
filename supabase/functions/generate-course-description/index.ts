import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { courseCode, courseTitle, fileText } = await req.json();

    if (!courseTitle || !courseCode) {
      return new Response(
        JSON.stringify({ error: "courseCode and courseTitle are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedFile = (fileText || "").toString().slice(0, 12000).trim();

    const userPrompt = trimmedFile.length > 50
      ? `Course Code: ${courseCode}\nCourse Title: ${courseTitle}\n\nBelow is the extracted text from the course material/syllabus. Use it as the primary source.\n\n---\n${trimmedFile}\n---\n\nWrite a concise, engaging student-friendly description of what this course is about, what students will learn, and why it matters. 3–5 sentences. Plain prose, no markdown headers, no bullet points.`
      : `Course Code: ${courseCode}\nCourse Title: ${courseTitle}\n\nNo course material was provided. Based on the course title and code, write a concise, engaging student-friendly description of what this course is typically about, what students will learn, and why it matters. 3–5 sentences. Plain prose, no markdown headers, no bullet points.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You write clear, friendly course descriptions for university students. IMPORTANT MATH RULE: never use LaTeX or KaTeX delimiters ($, $$, \\(, \\[). Write all math in plain text using standard symbols (^, *, /, sqrt(), etc.).",
          },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI service error");
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ success: true, description }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-course-description error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
