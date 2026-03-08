import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { courseTitle, courseCode, topics } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const topicList = topics.map((t: any, i: number) => `${i + 1}. ${t.title}${t.content ? ` — ${t.content}` : ""}`).join("\n");

    const systemPrompt = `You are an expert university tutor creating comprehensive study guides for Nigerian university students. Write in clear, student-friendly language. Use markdown formatting with headings, bullet points, bold terms, and numbered lists.

Structure the study guide as follows:
1. **Course Overview** — Brief summary of what the course covers and why it matters
2. **Key Concepts by Topic** — For each topic, explain the core concepts, definitions, and principles
3. **Important Formulas/Frameworks** — If applicable, list key formulas, models, or frameworks
4. **Common Exam Questions** — Likely exam question types with brief answer strategies
5. **Study Tips** — Specific advice for mastering this course
6. **Recommended Study Order** — Suggest the best sequence to study the topics

Be thorough but concise. Focus on what students need to know for exams.`;

    const userPrompt = `Generate a comprehensive study guide for:

Course: ${courseCode} — ${courseTitle}

Topics covered:
${topicList}

Create a detailed study guide that covers all these topics and helps students prepare effectively for exams.`;

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
    console.error("generate-study-guide error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
