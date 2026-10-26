import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/AppLayout";
import { ArrowLeft, Loader2, MessageCircle, Search, Send, Users } from "lucide-react";

interface Peer {
  user_id: string;
  full_name: string;
  username: string;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count?: number;
}

interface Schoolmate extends Peer {
  department_name: string;
  level: number;
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export default function Messages() {
  const { user, profile } = useAuth();
  const [peers, setPeers] = useState<Peer[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Schoolmate[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState<Peer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingPeers, setLoadingPeers] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const loadPeers = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_message_peers");
    if (!error && data) setPeers(data);
    setLoadingPeers(false);
  }, []);

  useEffect(() => {
    loadPeers();
  }, [loadPeers]);

  // Refresh the conversation list after messages change
  useEffect(() => {
    if (messages.length) loadPeers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const loadConversation = useCallback(async (peer: Peer) => {
    setActive(peer);
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user!.id},recipient_id.eq.${peer.user_id}),and(sender_id.eq.${peer.user_id},recipient_id.eq.${user!.id})`
      )
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
    await supabase.rpc("mark_direct_messages_read", { _sender_id: peer.user_id });
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, active]);

  // Realtime: receive incoming messages
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dms-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const msg = payload.new as Message;
          if (msg.recipient_id === user.id) {
            if (active && msg.sender_id === active.user_id) {
              setMessages((prev) => [...prev, msg]);
              supabase.rpc("mark_direct_messages_read", { _sender_id: msg.sender_id });
            } else {
              loadPeers();
            }
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, active, loadPeers]);

  const runSearch = useCallback(async (value: string) => {
    if (!value.trim()) {
      setResults(null);
      return;
    }
    setSearching(true);
    const { data } = await supabase.rpc("search_schoolmates", { _query: value.trim() });
    setResults(data ?? []);
    setSearching(false);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => runSearch(query), 350);
    return () => window.clearTimeout(t);
  }, [query, runSearch]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !active) return;
    setSending(true);
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      sender_id: user!.id,
      recipient_id: active.user_id,
      body,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    const { error } = await supabase.from("direct_messages").insert({
      sender_id: user!.id,
      recipient_id: active.user_id,
      body,
    });
    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(body);
    }
    setSending(false);
  };

  const canChat = (peer: Peer) => peer.user_id !== user?.id;

  const peerList = results
    ? results.filter(canChat)
    : peers.filter(canChat);

  const conversationPane = (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search schoolmates by name or @username"
            className="pl-9"
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
        <p className="text-xs text-muted-foreground">
          {profile?.institution ? `Only students from ${profile.institution} appear here.` : "Only students from your school appear here."}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loadingPeers && !results ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : peerList.length === 0 ? (
          <div className="text-center py-10 px-4 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">
              {results
                ? "No schoolmates match that search."
                : "No conversations yet — search for a schoolmate above to start chatting."}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {peerList.map((peer) => (
              <button
                key={peer.user_id}
                onClick={() => loadConversation(peer)}
                className={`w-full text-left px-3 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors ${active?.user_id === peer.user_id ? "bg-accent" : ""}`}
              >
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="gradient-primary text-primary-foreground text-sm font-semibold">
                    {initials(peer.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate">{peer.full_name}</p>
                    {peer.last_message_at && (
                      <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(peer.last_message_at)}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {peer.last_message ?? (peer.username ? `@${peer.username}` : "No username yet")}
                  </p>
                </div>
                {(peer.unread_count ?? 0) > 0 && (
                  <Badge className="shrink-0 rounded-full px-2">{peer.unread_count}</Badge>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const chatPane = active ? (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-3 border-b">
        <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" onClick={() => setActive(null)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-9 h-9">
          <AvatarFallback className="gradient-primary text-primary-foreground text-xs font-semibold">
            {initials(active.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{active.full_name}</p>
          <p className="text-xs text-muted-foreground truncate">@{active.username}</p>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => {
          const mine = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${
                  mine
                    ? "gradient-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted rounded-bl-sm"
                }`}
              >
                {msg.body}
                {mine && msg.read_at && (
                  <span className="block text-[10px] opacity-70 mt-0.5 text-right">Read</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={send} className="p-3 border-t flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          className="flex-1"
        />
        <Button type="submit" size="icon" className="gradient-primary shrink-0 h-10 w-10" disabled={sending || !draft.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  ) : (
    <div className="hidden lg:flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-glow">
        <MessageCircle className="w-8 h-8 text-primary-foreground" />
      </div>
      <h3 className="font-bold text-lg mb-1">Your school, one chat away</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Search for students from {profile?.institution || "your school"} by full name or username and start a conversation.
      </p>
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
            <p className="text-sm text-muted-foreground">Chat with students from your school.</p>
          </div>
        </div>
        <Card className="overflow-hidden">
          <div className="grid lg:grid-cols-[320px_1fr] h-[calc(100vh-220px)] min-h-[420px]">
            <div className={`border-r h-full ${active ? "hidden lg:block" : "block"}`}>{conversationPane}</div>
            <div className={`h-full ${active ? "block" : "hidden lg:flex"}`}>{chatPane}</div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
