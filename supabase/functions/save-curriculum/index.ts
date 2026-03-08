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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const { courses, departmentId } = await req.json();

    if (!courses || !Array.isArray(courses) || courses.length === 0 || !departmentId) {
      return new Response(
        JSON.stringify({ error: "courses array and departmentId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let coursesInserted = 0;
    let topicsInserted = 0;

    for (const course of courses) {
      const { data: existing } = await supabaseAdmin
        .from("courses")
        .select("id")
        .eq("course_code", course.course_code)
        .eq("department_id", departmentId)
        .maybeSingle();

      let courseId: string;

      if (existing) {
        courseId = existing.id;
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

      if (course.topics && course.topics.length > 0) {
        const topicRows = course.topics.map((t: any) => ({
          course_id: courseId,
          title: t.title,
          content: t.content || null,
          sort_order: t.sort_order || 0,
        }));

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
      JSON.stringify({ success: true, coursesInserted, topicsInserted, totalCoursesParsed: courses.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("save-curriculum error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
