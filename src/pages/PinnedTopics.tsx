import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Pin, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PinnedTopic {
  id: string;
  topic_id: string;
  notes: string | null;
  topics: {
    id: string;
    title: string;
    content: string | null;
    courses: {
      course_code: string;
      title: string;
    };
  };
}

export default function PinnedTopics() {
  const { user } = useAuth();
  const [pinned, setPinned] = useState<PinnedTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("pins")
      .select("id, topic_id, notes, topics(id, title, content, courses(course_code, title))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setPinned(data as unknown as PinnedTopic[]);
        setLoading(false);
      });
  }, [user]);

  const saveNotes = async (pinId: string) => {
    setSaving(pinId);
    const { error } = await supabase
      .from("pins")
      .update({ notes: editingNotes[pinId] ?? "" })
      .eq("id", pinId);
    setSaving(null);
    if (error) {
      toast.error("Failed to save notes");
    } else {
      toast.success("Notes saved!");
      setPinned(pinned.map(p => p.id === pinId ? { ...p, notes: editingNotes[pinId] ?? "" } : p));
    }
  };

  const removePin = async (pinId: string) => {
    await supabase.from("pins").delete().eq("id", pinId);
    setPinned(pinned.filter(p => p.id !== pinId));
    toast.success("Topic unpinned");
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

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Pin className="w-6 h-6 text-primary" /> Pinned Topics
          </h1>
          <p className="text-muted-foreground mt-1">Your saved topics with personal notes</p>
        </div>

        {pinned.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Pin className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No pinned topics yet. Pin topics from your courses to save them here.</p>
            </CardContent>
          </Card>
        ) : (
          pinned.map((pin) => (
            <Card key={pin.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-mono text-muted-foreground">
                      {pin.topics.courses.course_code} · {pin.topics.courses.title}
                    </p>
                    <CardTitle className="text-base mt-1">{pin.topics.title}</CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removePin(pin.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {pin.topics.content && (
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {pin.topics.content}
                  </p>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Notes</label>
                  <Textarea
                    placeholder="Write your notes here..."
                    value={editingNotes[pin.id] ?? pin.notes ?? ""}
                    onChange={(e) => setEditingNotes({ ...editingNotes, [pin.id]: e.target.value })}
                    rows={4}
                  />
                  <Button
                    size="sm"
                    onClick={() => saveNotes(pin.id)}
                    disabled={saving === pin.id}
                    className="gap-1"
                  >
                    {saving === pin.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Save Notes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppLayout>
  );
}
