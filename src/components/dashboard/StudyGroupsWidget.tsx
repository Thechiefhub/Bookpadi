import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Send, Plus, MessageSquare, Check, LogOut } from "lucide-react";
import { toast } from "sonner";

export interface StudyGroupMessage {
  id: string;
  senderName: string;
  senderRole: string;
  body: string;
  courseTag?: string;
  createdAt: string;
  isMe?: boolean;
}

export interface StudyGroupRoom {
  id: string;
  name: string;
  department: string;
  description: string;
  memberCount: number;
  activeTopic: string;
}

interface StudyGroupsWidgetProps {
  userId?: string;
  userName?: string | null;
  userDepartment?: string | null;
  userLevel?: number | null;
  courses?: Array<{ id: string; course_code: string; title: string }>;
}

const DEFAULT_ROOMS: StudyGroupRoom[] = [
  {
    id: "room-csc",
    name: "Computer Science Study Hub",
    department: "Computer Science",
    description: "Algorithms, programming labs, data structures & CCMAS past questions.",
    memberCount: 48,
    activeTopic: "CSC 101 & MTH 101 Exam Prep",
  },
  {
    id: "room-eee",
    name: "Electrical & Electronics Circle",
    department: "Electrical & Electronics Engineering",
    description: "Circuit theory, digital logic, electromagnetics & lab report discussions.",
    memberCount: 34,
    activeTopic: "EEE 201 Norton & Thevenin Theorems",
  },
  {
    id: "room-mcb",
    name: "Microbiology & Biosciences Lab",
    department: "Microbiology",
    description: "Cell biology, microbial genetics, biochemistry & practical taxonomy.",
    memberCount: 29,
    activeTopic: "MCB 101 Staining Techniques",
  },
  {
    id: "room-eco",
    name: "Economics & Quantitative Forum",
    department: "Economics",
    description: "Microeconomics, macro policy, econometrics & statistical methods.",
    memberCount: 41,
    activeTopic: "ECO 101 Elasticity & Market Equilibrium",
  },
  {
    id: "room-med",
    name: "Clinical & Basic Medical Sciences",
    department: "Medicine & Surgery",
    description: "Anatomy, physiology, medical biochemistry & flashcards review.",
    memberCount: 53,
    activeTopic: "ANA 201 Upper Limb Osteology",
  },
];

const INITIAL_MESSAGES: Record<string, StudyGroupMessage[]> = {
  "room-csc": [
    {
      id: "msg-csc-1",
      senderName: "Adebayo Ogunlesi",
      senderRole: "200L · UNILAG",
      body: "Hey everyone! For CSC 101 binary subtraction using two's complement, remember to invert all bits and add 1 before adding to the minuend.",
      courseTag: "CSC 101",
      createdAt: "10:15 AM",
    },
    {
      id: "msg-csc-2",
      senderName: "Chidinma Okafor",
      senderRole: "100L · UNILAG",
      body: "Thanks @bayo! Does anyone have the summary notes for MTH 101 Mathematical Induction? Let's solve 3 past questions together tonight at 8 PM.",
      courseTag: "MTH 101",
      createdAt: "10:22 AM",
    },
  ],
  "room-eee": [
    {
      id: "msg-eee-1",
      senderName: "Ibrahim Danjuma",
      senderRole: "200L · ABU Zaria",
      body: "Sharing a quick tip for nodal analysis: always pick the node with the most connected branches as your reference ground.",
      courseTag: "EEE 201",
      createdAt: "09:40 AM",
    },
  ],
  "room-mcb": [
    {
      id: "msg-mcb-1",
      senderName: "Tunde Bakare",
      senderRole: "200L · OAU",
      body: "Quick reminder: Gram-positive bacteria retain crystal violet because of their thick peptidoglycan cell wall.",
      courseTag: "MCB 101",
      createdAt: "11:05 AM",
    },
  ],
  "room-eco": [
    {
      id: "msg-eco-1",
      senderName: "Ngozi Eze",
      senderRole: "200L · UNN",
      body: "Let's review price elasticity of demand formulas and cross-price elasticity examples before Friday's test.",
      courseTag: "ECO 101",
      createdAt: "Yesterday",
    },
  ],
  "room-med": [
    {
      id: "msg-med-1",
      senderName: "Zainab Lawal",
      senderRole: "300L · UI",
      body: "We're running a 45-minute brachial plexus flashcard drill this evening. Drop your questions here!",
      courseTag: "ANA 201",
      createdAt: "12:10 PM",
    },
  ],
};

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "ST";

export default function StudyGroupsWidget({
  userId,
  userName,
  userDepartment,
  userLevel,
  courses = [],
}: StudyGroupsWidgetProps) {
  const storagePrefix = `bookpadi_study_groups_v1_${userId || "guest"}`;

  const [rooms, setRooms] = useState<StudyGroupRoom[]>(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}_rooms`);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_ROOMS;
  });

  const [joinedRoomIds, setJoinedRoomIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}_joined`);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return ["room-csc"];
  });

  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, StudyGroupMessage[]>>(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}_messages`);
      if (saved) return { ...INITIAL_MESSAGES, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return INITIAL_MESSAGES;
  });

  const [activeRoomId, setActiveRoomId] = useState<string>("room-csc");
  const [draft, setDraft] = useState("");
  const [selectedCourseTag, setSelectedCourseTag] = useState<string>("");
  const [showNewGroupForm, setShowNewGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDept, setNewGroupDept] = useState(userDepartment || "Computer Science");
  const [newGroupTopic, setNewGroupTopic] = useState("");
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Automatically match the user's department room on first load if available
  useEffect(() => {
    if (!userDepartment) return;
    const matched = rooms.find(
      (r) => r.department.toLowerCase() === userDepartment.toLowerCase()
    );
    if (matched) {
      setActiveRoomId(matched.id);
      setJoinedRoomIds((prev) =>
        prev.includes(matched.id) ? prev : [...prev, matched.id]
      );
    }
  }, [userDepartment, rooms]);

  useEffect(() => {
    try {
      localStorage.setItem(`${storagePrefix}_rooms`, JSON.stringify(rooms));
      localStorage.setItem(`${storagePrefix}_joined`, JSON.stringify(joinedRoomIds));
      localStorage.setItem(`${storagePrefix}_messages`, JSON.stringify(messagesByRoom));
    } catch {
      // ignore
    }
  }, [rooms, joinedRoomIds, messagesByRoom, storagePrefix]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messagesByRoom, activeRoomId]);

  const activeRoom = rooms.find((r) => r.id === activeRoomId) || rooms[0];
  const isJoined = joinedRoomIds.includes(activeRoom.id);
  const roomMessages = messagesByRoom[activeRoom.id] || [];

  const handleToggleJoin = (roomId: string) => {
    const alreadyJoined = joinedRoomIds.includes(roomId);
    if (alreadyJoined) {
      setJoinedRoomIds((prev) => prev.filter((id) => id !== roomId));
      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId ? { ...r, memberCount: Math.max(1, r.memberCount - 1) } : r
        )
      );
      toast.info("Left study group room.");
    } else {
      setJoinedRoomIds((prev) => [...prev, roomId]);
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, memberCount: r.memberCount + 1 } : r))
      );
      setActiveRoomId(roomId);
      toast.success("Joined department study group!");
    }
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !newGroupDept.trim()) {
      toast.error("Please enter a group name and department.");
      return;
    }
    const newId = `room-${Date.now()}`;
    const created: StudyGroupRoom = {
      id: newId,
      name: newGroupName.trim(),
      department: newGroupDept.trim(),
      description: `Collaborative study room for ${newGroupDept.trim()} students.`,
      memberCount: 1,
      activeTopic: newGroupTopic.trim() || "General Course Revision",
    };
    setRooms((prev) => [created, ...prev]);
    setJoinedRoomIds((prev) => [...prev, newId]);
    setMessagesByRoom((prev) => ({
      ...prev,
      [newId]: [
        {
          id: `msg-init-${Date.now()}`,
          senderName: userName || "Student",
          senderRole: `${userLevel || 100}L · ${newGroupDept.trim()}`,
          body: `Welcome to ${created.name}! Share your study notes, questions, and topic summaries here.`,
          createdAt: "Just now",
          isMe: true,
        },
      ],
    }));
    setActiveRoomId(newId);
    setNewGroupName("");
    setNewGroupTopic("");
    setShowNewGroupForm(false);
    toast.success(`Created "${created.name}" study room!`);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;

    if (!isJoined) {
      handleToggleJoin(activeRoom.id);
    }

    const nowTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const newMsg: StudyGroupMessage = {
      id: `msg-${Date.now()}`,
      senderName: userName || "You",
      senderRole: `${userLevel || 100}L · ${userDepartment || activeRoom.department}`,
      body: text,
      courseTag: selectedCourseTag || undefined,
      createdAt: nowTime,
      isMe: true,
    };

    setMessagesByRoom((prev) => ({
      ...prev,
      [activeRoom.id]: [...(prev[activeRoom.id] || []), newMsg],
    }));
    setDraft("");
    setSelectedCourseTag("");
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Department Study Groups
            </CardTitle>
            <CardDescription className="mt-1 text-xs sm:text-sm">
              Join department-specific chat rooms to solve past questions and collaborate with peers
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant={showNewGroupForm ? "ghost" : "outline"}
            onClick={() => setShowNewGroupForm(!showNewGroupForm)}
            className="gap-1.5 h-8 text-xs whitespace-nowrap shrink-0 self-start sm:self-center"
          >
            <Plus className="w-3.5 h-3.5" />
            {showNewGroupForm ? "Cancel" : "Create Study Room"}
          </Button>
        </div>

        {showNewGroupForm && (
          <form
            onSubmit={handleCreateGroup}
            className="mt-3 p-3.5 rounded-xl bg-muted/40 border grid gap-3 sm:grid-cols-3"
          >
            <Input
              placeholder="Room name (e.g. CSC 200L Algorithms)"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="h-9 text-sm"
              required
            />
            <Input
              placeholder="Department (e.g. Computer Science)"
              value={newGroupDept}
              onChange={(e) => setNewGroupDept(e.target.value)}
              className="h-9 text-sm"
              required
            />
            <div className="flex gap-2">
              <Input
                placeholder="Focus topic (optional)"
                value={newGroupTopic}
                onChange={(e) => setNewGroupTopic(e.target.value)}
                className="h-9 text-sm flex-1"
              />
              <Button type="submit" size="sm" className="h-9 whitespace-nowrap shrink-0">
                Create
              </Button>
            </div>
          </form>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid lg:grid-cols-12 border rounded-xl overflow-hidden min-h-[400px]">
          {/* Left column: Department Rooms List */}
          <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r divide-y bg-muted/10 max-h-[420px] overflow-y-auto">
            {rooms.map((room) => {
              const joined = joinedRoomIds.includes(room.id);
              const selected = room.id === activeRoom.id;
              const isUserDept =
                userDepartment &&
                room.department.toLowerCase() === userDepartment.toLowerCase();

              return (
                <div
                  key={room.id}
                  onClick={() => setActiveRoomId(room.id)}
                  className={`p-3.5 cursor-pointer transition-colors ${
                    selected ? "bg-primary/[0.08]" : "hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {room.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span>{room.department}</span>
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        <span className="tabular-nums">{room.memberCount} members</span>
                        {isUserDept && (
                          <>
                            <span className="mx-1.5" aria-hidden="true">·</span>
                            <span className="text-primary font-medium">Your Dept</span>
                          </>
                        )}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant={joined ? "ghost" : "secondary"}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleJoin(room.id);
                      }}
                      className="h-7 px-2.5 text-xs gap-1 whitespace-nowrap shrink-0"
                    >
                      {joined ? (
                        <>
                          <Check className="w-3 h-3 text-primary" /> Joined
                        </>
                      ) : (
                        "Join"
                      )}
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                    Topic: <span className="text-foreground/80">{room.activeTopic}</span>
                  </p>
                </div>
              );
            })}
          </div>

          {/* Right column: Active Study Room Chat */}
          <div className="lg:col-span-7 flex flex-col h-[420px] bg-card">
            {/* Chat Header */}
            <div className="p-3.5 border-b flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary shrink-0" />
                  <h4 className="font-semibold text-sm truncate">{activeRoom.name}</h4>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {activeRoom.department} · {activeRoom.activeTopic}
                </p>
              </div>

              <Button
                size="sm"
                variant={isJoined ? "outline" : "default"}
                onClick={() => handleToggleJoin(activeRoom.id)}
                className="h-8 text-xs gap-1.5 whitespace-nowrap shrink-0"
              >
                {isJoined ? (
                  <>
                    <LogOut className="w-3.5 h-3.5" /> Leave Room
                  </>
                ) : (
                  "Join Room to Chat"
                )}
              </Button>
            </div>

            {/* Chat Messages */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {roomMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.isMe ? "justify-end" : "justify-start"}`}
                >
                  {!msg.isMe && (
                    <Avatar className="w-7 h-7 shrink-0 mt-0.5">
                      <AvatarFallback className="bg-muted text-foreground text-[11px] font-semibold">
                        {getInitials(msg.senderName)}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      msg.isMe
                        ? "gradient-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted/60 text-foreground rounded-bl-sm"
                    }`}
                  >
                    <div
                      className={`flex items-center gap-1.5 text-[11px] mb-1 ${
                        msg.isMe ? "text-primary-foreground/80" : "text-muted-foreground"
                      }`}
                    >
                      <span className="font-semibold">{msg.senderName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{msg.senderRole}</span>
                      {msg.courseTag && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono font-semibold">{msg.courseTag}</span>
                        </>
                      )}
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>
                    <span
                      className={`block text-[10px] mt-1 text-right tabular-nums ${
                        msg.isMe ? "text-primary-foreground/75" : "text-muted-foreground"
                      }`}
                    >
                      {msg.createdAt}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Composer */}
            <form onSubmit={handleSendMessage} className="p-3 border-t space-y-2">
              {courses.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                    Tag course:
                  </span>
                  {courses.slice(0, 5).map((c) => {
                    const active = selectedCourseTag === c.course_code;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() =>
                          setSelectedCourseTag(active ? "" : c.course_code)
                        }
                        className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {c.course_code}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={
                    isJoined
                      ? `Message ${activeRoom.name}…`
                      : `Post to join and message ${activeRoom.name}…`
                  }
                  className="flex-1 h-9 text-sm"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!draft.trim()}
                  className="h-9 px-3 gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send
                </Button>
              </div>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
