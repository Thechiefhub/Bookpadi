import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Pin, PinOff, BookOpen, ExternalLink, Youtube } from "lucide-react";
import { toast } from "sonner";

interface Course {
  id: string;
  course_code: string;
  title: string;
  description: string | null;
  units: number;
}

interface Topic {
  id: string;
  title: string;
  content: string | null;
  sort_order: number;
  external_links: any;
}

interface PinRecord {
  id: string;
  topic_id: string;
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [pins, setPins] = useState<PinRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const [courseRes, topicsRes, pinsRes] = await Promise.all([
        supabase.from("courses").select("*").eq("id", id).single(),
        supabase.from("topics").select("*").eq("course_id", id).order("sort_order"),
        user
          ? supabase.from("pins").select("id, topic_id").eq("user_id", user.id)
          : Promise.resolve({ data: [] }),
      ]);
      if (courseRes.data) setCourse(courseRes.data);
      if (topicsRes.data) setTopics(topicsRes.data);
      if (pinsRes.data) setPins(pinsRes.data as PinRecord[]);
      setLoading(false);
    };
    fetch();
  }, [id, user]);

  const isPinned = (topicId: string) => pins.some((p) => p.topic_id === topicId);

  const togglePin = async (topicId: string) => {
    if (!user) return;
    const existing = pins.find((p) => p.topic_id === topicId);
    if (existing) {
      await supabase.from("pins").delete().eq("id", existing.id);
      setPins(pins.filter((p) => p.id !== existing.id));
      toast.success("Topic unpinned");
    } else {
      const { data } = await supabase
        .from("pins")
        .insert({ user_id: user.id, topic_id: topicId })
        .select("id, topic_id")
        .single();
      if (data) {
        setPins([...pins, data]);
        toast.success("Topic pinned!");
      }
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!course) {
    return (
      <AppLayout>
        <p className="text-center py-20 text-muted-foreground">Course not found.</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> Back to courses
        </Link>

        <div>
          <Badge variant="secondary" className="font-mono mb-2">{course.course_code}</Badge>
          <h1 className="text-2xl md:text-3xl font-bold">{course.title}</h1>
          {course.description && (
            <p className="mt-2 text-muted-foreground leading-relaxed">{course.description}</p>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Topics ({topics.length})</h2>
          {topics.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No topics available for this course yet.</p>
              </CardContent>
            </Card>
          ) : (
            topics.map((topic, idx) => {
              const links = Array.isArray(topic.external_links) ? topic.external_links : [];
              return (
                <Card key={topic.id} className="overflow-hidden">
                  <CardHeader
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <span className="text-sm font-mono text-muted-foreground mt-0.5 shrink-0">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <CardTitle className="text-base">{topic.title}</CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePin(topic.id);
                        }}
                      >
                        {isPinned(topic.id) ? (
                          <PinOff className="w-4 h-4 text-primary" />
                        ) : (
                          <Pin className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  {expandedTopic === topic.id && (
                    <CardContent className="border-t bg-muted/30">
                      {topic.content ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{topic.content}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No content available for this topic.</p>
                      )}
                      {links.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h4 className="text-sm font-semibold">Resources</h4>
                          {links.map((link: any, i: number) => (
                            <a
                              key={i}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              {link.url?.includes("youtube") ? (
                                <Youtube className="w-4 h-4" />
                              ) : (
                                <ExternalLink className="w-4 h-4" />
                              )}
                              {link.title || link.url}
                            </a>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
