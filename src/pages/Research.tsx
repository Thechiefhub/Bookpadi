import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Sparkles, ExternalLink, Microscope, BrainCircuit } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ReactMarkdown from "react-markdown";

type SourceKey = "google_scholar" | "arxiv" | "research_gate" | "ieee" | "semantic_scholar";

type ResearchResult = {
  success: boolean;
  report: {
    project_title: string;
    abstract: string;
    objectives: string[];
    literature_themes: string[];
    methodology: string[];
    project_ideas: { title: string; rationale: string }[];
    action_plan: { phase: string; tasks: string[] }[];
    references: { title: string; url: string; source: string; note: string }[];
  };
  collected_sources: { title: string; url: string; source: SourceKey; snippet: string }[];
  search_queries: { source: string; query: string }[];
};

const sourceOptions: { value: SourceKey; label: string }[] = [
  { value: "google_scholar", label: "Google Scholar" },
  { value: "arxiv", label: "arXiv" },
  { value: "research_gate", label: "ResearchGate" },
  { value: "ieee", label: "IEEE Xplore" },
  { value: "semantic_scholar", label: "Semantic Scholar" },
];

export default function Research() {
  const { profile } = useAuth();
  const [topic, setTopic] = useState("");
  const [projectGoal, setProjectGoal] = useState("Produce a rigorous undergraduate research project proposal and implementation roadmap.");
  const [programme, setProgramme] = useState("BSc Statistics");
  const [level, setLevel] = useState("300");
  const [depth, setDepth] = useState("standard");
  const [sources, setSources] = useState<SourceKey[]>(["google_scholar", "arxiv", "research_gate"]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);

  useEffect(() => {
    if (profile?.level) setLevel(String(profile.level));
  }, [profile?.level]);

  const selectedSourceLabels = useMemo(
    () => sourceOptions.filter((option) => sources.includes(option.value)).map((option) => option.label),
    [sources],
  );

  const toggleSource = (source: SourceKey) => {
    setSources((prev) => {
      if (prev.includes(source)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== source);
      }
      return [...prev, source];
    });
  };

  const runResearch = async () => {
    if (topic.trim().length < 5) {
      toast.error("Please enter a clearer research topic.");
      return;
    }

    setLoading(true);
    setResult(null);

    const { data, error } = await supabase.functions.invoke("ai-research-agent", {
      body: {
        topic: topic.trim(),
        projectGoal: projectGoal.trim(),
        programme: programme.trim() || "BSc Statistics",
        level,
        depth,
        sources,
      },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message || "Failed to run research agent.");
      return;
    }

    if (data?.error) {
      toast.error(data.error);
      return;
    }

    setResult(data as ResearchResult);
    toast.success("Research brief generated.");
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="rounded-2xl border bg-card p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold">AI Research Lab</h1>
              <p className="text-muted-foreground">
                Build undergraduate research projects with scholarly source discovery from Google Scholar and other research indexes.
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedSourceLabels.map((label) => (
                  <Badge key={label} variant="secondary">{label}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Research Setup</CardTitle>
            <CardDescription>Describe your topic and generate a complete project brief.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Programme</p>
                <Input value={programme} onChange={(e) => setProgramme(e.target.value)} placeholder="e.g. BSc Statistics" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Level</p>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {["100", "200", "300", "400", "500"].map((item) => (
                      <SelectItem key={item} value={item}>{item} Level</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Research Topic</p>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Bayesian forecasting of inflation trends in Nigeria"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Research Goal</p>
              <Textarea
                value={projectGoal}
                onChange={(e) => setProjectGoal(e.target.value)}
                rows={4}
                placeholder="What should the project deliver?"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Depth</p>
                <Select value={depth} onValueChange={setDepth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose depth" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quick">Quick</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="deep">Deep</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Source Engines</p>
                <div className="flex flex-wrap gap-2">
                  {sourceOptions.map((option) => {
                    const active = sources.includes(option.value);
                    return (
                      <Button
                        key={option.value}
                        type="button"
                        variant={active ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => toggleSource(option.value)}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>

            <Button onClick={runResearch} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate AI Research Brief
            </Button>
          </CardContent>
        </Card>

        {result?.report && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Microscope className="w-5 h-5" />
                  {result.report.project_title}
                </CardTitle>
                <CardDescription>{programme} · {level} Level</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="font-semibold mb-2">Abstract</p>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{result.report.abstract}</ReactMarkdown>
                  </div>
                </div>

                <Separator />

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="font-semibold mb-2">Objectives</p>
                    <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                      {result.report.objectives.map((objective, index) => (
                        <li key={index}>{objective}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold mb-2">Literature Themes</p>
                    <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                      {result.report.literature_themes.map((theme, index) => (
                        <li key={index}>{theme}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="font-semibold mb-2">Methodology</p>
                  <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                    {result.report.methodology.map((method, index) => (
                      <li key={index}>{method}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Project Idea Variants</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                {result.report.project_ideas.map((idea, index) => (
                  <div key={index} className="rounded-lg border p-4 space-y-2">
                    <p className="font-medium">{idea.title}</p>
                    <p className="text-sm text-muted-foreground">{idea.rationale}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Execution Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.report.action_plan.map((phase, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <p className="font-medium mb-2">{phase.phase}</p>
                    <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
                      {phase.tasks.map((task, taskIndex) => (
                        <li key={taskIndex}>{task}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>References</CardTitle>
                <CardDescription>{result.report.references.length} citations generated from scholarly sources</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.report.references.map((reference, index) => (
                  <div key={`${reference.url}-${index}`} className="rounded-lg border p-4 space-y-2">
                    <p className="font-medium">{reference.title}</p>
                    <p className="text-sm text-muted-foreground">{reference.note}</p>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <Badge variant="outline">{reference.source}</Badge>
                      <a
                        href={reference.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        Open source <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
