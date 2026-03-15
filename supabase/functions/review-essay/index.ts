import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { essay, courseTitle, courseCode, question, rubric } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a senior university lecturer and expert essay grader at a Nigerian university. You grade essays/answers with precision, fairness, and helpful feedback.

Your review must include:
1. **Overall Score**: X/100 with letter grade (A, B, C, D, E, F)
2. **Content & Accuracy** (40%): Are facts correct? Is the topic well-covered?
3. **Structure & Organization** (20%): Logical flow, introduction, body, conclusion
4. **Depth of Analysis** (20%): Critical thinking, examples, real-world applications
5. **Language & Grammar** (10%): Clarity, academic tone, grammar
6. **Referencing & Evidence** (10%): Use of supporting evidence

Then provide:
- **Key Strengths**: 2-3 things done well
- **Areas for Improvement**: 2-3 specific suggestions
- **Model Answer Outline**: Brief outline of what an A-grade answer would include
- **Final Verdict**: One paragraph summary

Use markdown formatting. Be encouraging but honest. Grade like a real Nigerian university lecturer would.`;

    const userPrompt = `Please review and grade this essay/answer:

${courseCode ? `Course: ${courseCode} — ${courseTitle}` : ""}
${question ? `Question: ${question}` : ""}
${rubric ? `Additional rubric/instructions: ${rubric}` : ""}

---
STUDENT'S SUBMISSION:
${essay}
---`;

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
    console.error("review-essay error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
