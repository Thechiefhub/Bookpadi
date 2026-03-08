import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const { pdfText, departmentId } = await req.json();

    if (!pdfText || !departmentId) {
      return new Response(
        JSON.stringify({ error: "pdfText and departmentId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Lovable AI to parse the curriculum text into structured data
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `You are a curriculum parser. Extract courses and their topics from university curriculum PDF text. 
Return structured data using the provided tool.
Rules:
- course_code should be like "CSC 101", "MTH 201", etc.
- level is 100, 200, 300, 400, or 500
- semester is 1 or 2
- units is typically 1-6
- Each course can have multiple topics (the syllabus/content outline)
- If you can't determine a field, use reasonable defaults
- Sort topics in logical order (sort_order starting from 1)`
          },
          {
            role: "user",
            content: `Parse this curriculum PDF text and extract all courses with their topics:\n\n${pdfText.slice(0, 15000)}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_curriculum",
              description: "Save parsed curriculum courses and topics",
              parameters: {
                type: "object",
                properties: {
                  courses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        course_code: { type: "string", description: "e.g. CSC 101" },
                        title: { type: "string" },
                        description: { type: "string" },
                        level: { type: "number", enum: [100, 200, 300, 400, 500] },
                        semester: { type: "number", enum: [1, 2] },
                        units: { type: "number" },
                        topics: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              title: { type: "string" },
                              content: { type: "string", description: "Brief description of the topic" },
                              sort_order: { type: "number" }
                            },
                            required: ["title", "sort_order"],
                            additionalProperties: false
                          }
                        }
                      },
                      required: ["course_code", "title", "level", "semester", "units", "topics"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["courses"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "save_curriculum" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error("AI parsing failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("AI did not return structured data");
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const { courses } = parsed;

    if (!courses || courses.length === 0) {
      return new Response(
        JSON.stringify({ error: "No courses found in the PDF text" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert into database using service role (bypasses RLS)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let coursesInserted = 0;
    let topicsInserted = 0;

    for (const course of courses) {
      // Check if course already exists
      const { data: existing } = await supabaseAdmin
        .from("courses")
        .select("id")
        .eq("course_code", course.course_code)
        .eq("department_id", departmentId)
        .maybeSingle();

      let courseId: string;

      if (existing) {
        courseId = existing.id;
        // Update existing course
        await supabaseAdmin
          .from("courses")
          .update({
            title: course.title,
            description: course.description || null,
            level: course.level,
            semester: course.semester,
            units: course.units,
          })
          .eq("id", courseId);
      } else {
        const { data: inserted, error: insertErr } = await supabaseAdmin
          .from("courses")
          .insert({
            course_code: course.course_code,
            title: course.title,
            description: course.description || null,
            level: course.level,
            semester: course.semester,
            units: course.units,
            department_id: departmentId,
          })
          .select("id")
          .single();

        if (insertErr) {
          console.error("Course insert error:", insertErr);
          continue;
        }
        courseId = inserted.id;
        coursesInserted++;
      }

      // Insert topics for this course
      if (course.topics && course.topics.length > 0) {
        const topicRows = course.topics.map((t: any) => ({
          course_id: courseId,
          title: t.title,
          content: t.content || null,
          sort_order: t.sort_order || 0,
        }));

        // Delete existing topics for this course first to avoid duplicates
        await supabaseAdmin.from("topics").delete().eq("course_id", courseId);

        const { error: topicErr } = await supabaseAdmin.from("topics").insert(topicRows);
        if (topicErr) {
          console.error("Topics insert error:", topicErr);
        } else {
          topicsInserted += topicRows.length;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        coursesInserted,
        topicsInserted,
        totalCoursesParsed: courses.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("parse-curriculum error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
