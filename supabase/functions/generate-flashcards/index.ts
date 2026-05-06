import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { courseTitle, courseCode, topics, count = 15 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const topicList = topics.map((t: any, i: number) => `${i + 1}. ${t.title}${t.content ? ` — ${t.content}` : ""}`).join("\n");

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
            content: `You are an expert educator creating flashcards for Nigerian university students. Generate exactly ${count} flashcards from the given course topics.

Return ONLY a valid JSON array of objects with "front" (question/prompt) and "back" (answer/explanation) fields. No markdown, no code blocks, just the raw JSON array.

Guidelines:
- Cover all topics proportionally
- Mix question types: definitions, explanations, comparisons, applications
- Keep fronts concise (1-2 sentences)
- Keep backs thorough but focused (2-4 sentences)
- Use exam-relevant language

CRITICAL MATH FORMATTING RULE: Never use LaTeX or KaTeX (no $, $$, \\frac, \\sqrt, etc.). Write ALL math in plain text using ^ for powers, * for multiplication, / for division, sqrt() for roots. Plain solving only.`
          },
          {
            role: "user",
            content: `Generate ${count} flashcards for:\n\nCourse: ${courseCode} — ${courseTitle}\n\nTopics:\n${topicList}`
          }
        ],
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
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Try to parse JSON from the response
    let flashcards;
    try {
      // Handle cases where AI wraps in markdown code blocks
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      flashcards = JSON.parse(cleaned);
    } catch {
      flashcards = [];
    }

    return new Response(JSON.stringify({ flashcards }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-flashcards error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
