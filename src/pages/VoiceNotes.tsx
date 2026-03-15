import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Save, Trash2, Loader2, Clock, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SavedNote {
  id: string;
  title: string;
  data: { transcript: string; duration: number };
  created_at: string;
}

export default function VoiceNotes() {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [duration, setDuration] = useState(0);
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [saving, setSaving] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    loadNotes();
  }, [user]);

  const loadNotes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("study_plans")
      .select("id, title, data, created_at")
      .eq("user_id", user.id)
      .eq("type", "voice-note")
      .order("created_at", { ascending: false });
    setSavedNotes((data as any) || []);
  };

  const startRecording = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-NG";

    let fullTranscript = transcript;

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          fullTranscript += t + " ";
          setTranscript(fullTranscript);
        } else {
          interim += t;
        }
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech") {
        toast({ title: "Recording error", description: event.error, variant: "destructive" });
      }
    };

    recognition.onend = () => {
      // Restart if still recording (browser may stop after silence)
      if (recognitionRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
    setDuration(0);
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterimText("");
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const saveNote = async () => {
    if (!user || !transcript.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("study_plans").insert({
        user_id: user.id,
        title: noteTitle || `Voice Note — ${new Date().toLocaleDateString()}`,
        type: "voice-note",
        data: { transcript: transcript.trim(), duration } as any,
      });
      if (error) throw error;
      toast({ title: "Saved!", description: "Voice note saved successfully." });
      setTranscript("");
      setNoteTitle("");
      setDuration(0);
      loadNotes();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (id: string) => {
    await supabase.from("study_plans").delete().eq("id", id);
    setSavedNotes(prev => prev.filter(n => n.id !== id));
    toast({ title: "Deleted" });
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  if (!supported) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto py-16 text-center">
          <MicOff className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Speech Recognition Not Supported</h2>
          <p className="text-muted-foreground mt-2">Please use Chrome, Edge, or Safari for voice-to-notes.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Voice-to-Notes</h1>
          <p className="text-muted-foreground text-sm mt-1">Speak and let AI transcribe your lecture notes</p>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-center gap-4">
              <Button
                size="lg"
                variant={isRecording ? "destructive" : "default"}
                onClick={isRecording ? stopRecording : startRecording}
                className="rounded-full w-16 h-16"
              >
                {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </Button>
            </div>

            <div className="text-center">
              {isRecording && (
                <div className="flex items-center justify-center gap-2 text-destructive">
                  <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Recording — {formatTime(duration)}</span>
                </div>
              )}
              {!isRecording && duration > 0 && (
                <span className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Duration: {formatTime(duration)}
                </span>
              )}
            </div>

            <Textarea
              placeholder="Your transcription will appear here..."
              value={transcript + (interimText ? ` ${interimText}` : "")}
              onChange={e => setTranscript(e.target.value)}
              className="min-h-[150px] text-sm"
            />

            {transcript.trim() && (
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Note title (optional)"
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setTranscript(""); setDuration(0); }}>
                    <Trash2 className="w-4 h-4" /> Clear
                  </Button>
                  <Button onClick={saveNote} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {savedNotes.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Saved Notes</h2>
            {savedNotes.map(note => (
              <Card key={note.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <h3 className="font-medium text-sm truncate">{note.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {(note.data as any)?.transcript}
                      </p>
                      <span className="text-xs text-muted-foreground mt-1 block">
                        {new Date(note.created_at).toLocaleDateString()} · {formatTime((note.data as any)?.duration || 0)}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => deleteNote(note.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
