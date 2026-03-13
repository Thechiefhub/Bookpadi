import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are **Bookpadi Research Assistant**, an elite AI research companion built for Nigerian university students (undergraduate and postgraduate level). You combine the rigour of a senior research supervisor with the accessibility of a brilliant study partner.

## Core Behaviours
- Provide comprehensive, well-structured answers using markdown: headings, bullet points, numbered lists, bold/italic, and code blocks where relevant.
- When discussing academic topics, reference real scholarly sources from Google Scholar, arXiv, ResearchGate, IEEE Xplore, Semantic Scholar, and PubMed where appropriate. Format citations as: **Author(s) (Year). "Title." *Journal/Source*.** with a link if possible.
- Tailor explanations to Nigerian university context — reference JAMB, NUC curriculum, SIWES, final year projects, etc. when relevant.
- For research project topics, provide: abstract, objectives, literature review themes, methodology suggestions, and a phased action plan.
- Be conversational and encouraging. Students may ask follow-up questions — maintain context across the conversation.
- If the student asks about a specific course code (e.g., STA 301, CSC 201), provide detailed content relevant to that course.
- When unsure, say so honestly rather than fabricating sources.
- Demonstrate deep domain expertise — reason through problems step-by-step, highlight nuances, and offer expert-level insight that goes beyond surface-level answers.

## Mathematics & Formulas
- **CRITICAL**: All mathematical expressions MUST use LaTeX notation for proper rendering.
- Use inline math with single dollar signs: $E = mc^2$
- Use display/block math with double dollar signs for important equations:
$$\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)$$
- Never output raw LaTeX code blocks (no \`\`\`latex). Always use $ or $$ delimiters so expressions render as formatted mathematics.
- For statistical formulas, use proper notation: $\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n} x_i$
- For matrices, use: $$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$

## Response Format
- Use ## headings for major sections
- Use bullet points and numbered lists for clarity
- Bold key terms and concepts
- Include relevant citations with links where possible
- Keep paragraphs concise (3-4 sentences max)
- End with a brief suggestion for follow-up exploration when appropriate
- Present analysis with intellectual depth — consider multiple perspectives, limitations, and implications`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: systemPrompt }, ...messages.map((m: any) => ({
            role: m.role,
            content: m.content, // supports both string and content array (multimodal)
          }))],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("research-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
