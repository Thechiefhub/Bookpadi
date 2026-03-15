import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Brain, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

export default function WeakAreaAnalysis() {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState<boolean | null>(null);

  useEffect(() => {
    checkData();
  }, [user]);

  const checkData = async () => {
    if (!user) return;
    const { count } = await supabase.from("gpa_records").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    setHasData((count || 0) > 0);
  };

  const runAnalysis = async () => {
    if (!user) return;
    setLoading(true);
    setAnalysis("");

    try {
      const [gpaRes, regRes, assignRes] = await Promise.all([
        supabase.from("gpa_records").select("*").eq("user_id", user.id),
        supabase.from("course_registrations").select("*").eq("user_id", user.id),
        supabase.from("assignments").select("*").eq("user_id", user.id),
      ]);

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-weak-areas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          gpaRecords: gpaRes.data || [],
          courses: regRes.data || [],
          assignments: assignRes.data || [],
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Analysis failed");
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) { result += content; setAnalysis(result); }
          } catch {}
        }
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Weak-Area Analysis</h1>
          <p className="text-muted-foreground text-sm mt-1">AI-powered insights into your academic performance</p>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm">
                  {hasData === false
                    ? "Add GPA records first for a data-driven analysis, or get general study advice."
                    : "Analyze your GPA records, assignments, and courses to identify areas needing improvement."}
                </p>
              </div>
              <Button onClick={runAnalysis} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                {analysis ? "Re-analyze" : "Analyze"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {(analysis || loading) && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" /> Analysis Report
                </CardTitle>
                {!loading && (
                  <Button variant="outline" size="sm" onClick={runAnalysis}>
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading && !analysis && (
                <div className="flex items-center gap-3 py-8 justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-muted-foreground text-sm">Analyzing your academic data...</span>
                </div>
              )}
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{analysis}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
