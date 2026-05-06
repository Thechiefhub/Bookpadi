import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type SourceKey = "google_scholar" | "arxiv" | "research_gate" | "ieee" | "semantic_scholar";

type SearchResult = {
  title: string;
  url: string;
  description: string;
  snippet: string;
  source: SourceKey;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const sourceLabels: Record<SourceKey, string> = {
  google_scholar: "Google Scholar",
  arxiv: "arXiv",
  research_gate: "ResearchGate",
  ieee: "IEEE Xplore",
  semantic_scholar: "Semantic Scholar",
};

const buildSourceQuery = (source: SourceKey, topic: string, programme: string) => {
  switch (source) {
    case "google_scholar":
      return `site:scholar.google.com ${topic} ${programme}`;
    case "arxiv":
      return `site:arxiv.org ${topic} ${programme}`;
    case "research_gate":
      return `site:researchgate.net ${topic} ${programme}`;
    case "ieee":
      return `site:ieeexplore.ieee.org ${topic}`;
    case "semantic_scholar":
      return `site:semanticscholar.org ${topic} ${programme}`;
    default:
      return topic;
  }
};

const depthToLimit = (depth: string) => {
  if (depth === "deep") return 8;
  if (depth === "quick") return 3;
  return 5;
};

const callFirecrawlSearch = async (
  apiKey: string,
  query: string,
  source: SourceKey,
  limit: number,
): Promise<SearchResult[]> => {
  const response = await fetch("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      limit,
      scrapeOptions: {
        formats: ["markdown"],
      },
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Scholarly search failed [${response.status}]: ${JSON.stringify(payload)}`);
  }

  const rows = payload?.data || [];

  return rows
    .filter((row: any) => row?.url && row?.title)
    .map((row: any) => ({
      title: String(row.title),
      url: String(row.url),
      description: String(row.description || ""),
      snippet: String(row.markdown || row.description || "").replace(/\s+/g, " ").slice(0, 420),
      source,
    }));
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, programme, level, projectGoal, depth = "standard", sources } = await req.json();

    if (!topic || String(topic).trim().length < 5) {
      return new Response(JSON.stringify({ error: "Please provide a research topic with at least 5 characters." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      throw new Error("FIRECRAWL_API_KEY is not configured");
    }

    const requestedSources: SourceKey[] = Array.isArray(sources) && sources.length
      ? sources.filter((s): s is SourceKey => Object.keys(sourceLabels).includes(s))
      : ["google_scholar", "arxiv", "research_gate"];

    const perSourceLimit = depthToLimit(String(depth));

    const searchQueries = requestedSources.map((source) => ({
      source,
      query: buildSourceQuery(source, String(topic), String(programme || "BSc Statistics")),
    }));

    const searchResultsNested = await Promise.all(
      searchQueries.map(({ source, query }) => callFirecrawlSearch(FIRECRAWL_API_KEY, query, source, perSourceLimit)),
    );

    const allResults = searchResultsNested.flat();
    const dedupedResults: SearchResult[] = [];
    const seen = new Set<string>();

    for (const item of allResults) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      dedupedResults.push(item);
      if (dedupedResults.length >= 18) break;
    }

    if (!dedupedResults.length) {
      return new Response(JSON.stringify({ error: "No scholarly sources found for this topic. Try broadening your query." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const digest = dedupedResults
      .map((result, index) => {
        const source = sourceLabels[result.source];
        return `[${index + 1}] ${result.title}\nSource: ${source}\nURL: ${result.url}\nSnippet: ${result.snippet}`;
      })
      .join("\n\n");

    const systemPrompt = `You are an expert undergraduate research supervisor.
Build practical, academically-sound research outputs for university students.
Always stay grounded in provided sources and avoid hallucinations.
Prioritize clarity, feasibility, and measurable outcomes.

CRITICAL MATH FORMATTING RULE: Never use LaTeX or KaTeX syntax. Do NOT use $, $$, \\frac, \\sqrt, \\sum, \\int, etc. Write ALL mathematics in plain text using ^ for powers, * for multiplication, / for division, sqrt() for roots. Plain solving only.`;

    const userPrompt = `Create a complete undergraduate AI-powered research brief.

Topic: ${topic}
Programme: ${programme || "BSc Statistics"}
Level: ${level || "300"}
Project goal: ${projectGoal || "Build a strong project proposal and execution plan"}

Use only the sources below for citations and evidence.
${digest}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              name: "build_research_brief",
              description: "Create a complete undergraduate research brief with citations and execution plan",
              parameters: {
                type: "object",
                properties: {
                  project_title: { type: "string" },
                  abstract: { type: "string" },
                  objectives: {
                    type: "array",
                    items: { type: "string" },
                  },
                  literature_themes: {
                    type: "array",
                    items: { type: "string" },
                  },
                  methodology: {
                    type: "array",
                    items: { type: "string" },
                  },
                  project_ideas: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        rationale: { type: "string" },
                      },
                      required: ["title", "rationale"],
                      additionalProperties: false,
                    },
                  },
                  action_plan: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        phase: { type: "string" },
                        tasks: {
                          type: "array",
                          items: { type: "string" },
                        },
                      },
                      required: ["phase", "tasks"],
                      additionalProperties: false,
                    },
                  },
                  references: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        url: { type: "string" },
                        source: { type: "string" },
                        note: { type: "string" },
                      },
                      required: ["title", "url", "source", "note"],
                      additionalProperties: false,
                    },
                  },
                },
                required: [
                  "project_title",
                  "abstract",
                  "objectives",
                  "literature_themes",
                  "methodology",
                  "project_ideas",
                  "action_plan",
                  "references",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "build_research_brief" },
        },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up and retry." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const errorText = await aiResponse.text();
      throw new Error(`Research AI request failed [${aiResponse.status}]: ${errorText}`);
    }

    const aiPayload = await aiResponse.json();
    const toolCall = aiPayload?.choices?.[0]?.message?.tool_calls?.find(
      (call: any) => call?.function?.name === "build_research_brief",
    );

    if (!toolCall?.function?.arguments) {
      throw new Error("AI response did not contain a structured research brief");
    }

    const report = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        success: true,
        report,
        collected_sources: dedupedResults,
        search_queries: searchQueries.map((item) => ({
          source: sourceLabels[item.source],
          query: item.query,
        })),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("ai-research-agent error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
