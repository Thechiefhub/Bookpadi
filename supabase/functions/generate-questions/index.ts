import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { courseTitle, courseCode, topics, mode, questions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const topicList = topics.map((t: any, i: number) => `${i + 1}. ${t.title}${t.content ? ` — ${t.content}` : ""}`).join("\n");

    let systemPrompt: string;
    let userPrompt: string;

    if (questions) {
      // Answer mode — user is asking for answers to previously generated questions
      if (mode === "quiz") {
        systemPrompt = `You are an expert university tutor providing detailed answers for Nigerian university students. Use markdown formatting.

CRITICAL FORMAT: For each question, you MUST start the answer with the correct letter in this EXACT format:
**Question X: LETTER)**
Then explain why that answer is correct and why the others are wrong.

Example:
**Question 1: B)**
The correct answer is B because... Option A is incorrect because... Option C is incorrect because... Option D is incorrect because...

Be thorough and educational. Help students understand, not just memorise.`;
      } else {
        systemPrompt = `You are an expert university tutor providing detailed answers for Nigerian university students. Use markdown formatting with clear headings and explanations.

Provide comprehensive, exam-worthy answers that would score full marks. Include definitions, explanations, examples, and relevant points.

Be thorough and educational. Help students understand, not just memorise.`;
      }

      userPrompt = `Provide detailed answers to these ${mode === "quiz" ? "objective/quiz" : "theory"} questions for:

Course: ${courseCode} — ${courseTitle}

Here are the questions:
${questions}

Provide clear, detailed answers for each question.`;
    } else {
      // Question generation mode
      if (mode === "quiz") {
        systemPrompt = `You are an expert university examiner creating objective/multiple-choice questions for Nigerian university students. Use markdown formatting.

Generate 20 well-crafted multiple-choice questions that:
- Cover all the topics in the course outline
- Range from basic recall to application and analysis
- Have 4 options (A, B, C, D) each
- Are similar to what students would encounter in actual university exams
- Are clearly numbered

Format each question as:
**Question X:**
[Question text]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]

Do NOT include answers. Only generate the questions.`;
      } else {
        systemPrompt = `You are an expert university examiner creating theory/essay questions for Nigerian university students. Use markdown formatting.

Generate 10 well-crafted theory questions that:
- Cover all the topics in the course outline
- Range from short-answer to essay-type questions
- Include "define", "explain", "discuss", "compare and contrast", "enumerate" style questions
- Are similar to what students would encounter in actual university exams
- Are clearly numbered

Format each question as:
**Question X:**
[Question text]

Do NOT include answers. Only generate the questions.`;
      }

      userPrompt = `Generate ${mode === "quiz" ? "objective/multiple-choice" : "theory/essay"} practice questions for:

Course: ${courseCode} — ${courseTitle}

Topics covered:
${topicList}

Create exam-style questions that thoroughly cover these topics.`;
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
    console.error("generate-questions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
