import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Sparkles,
  Calendar,
  ArrowRight,
  GraduationCap,
  Layers,
  FileText,
  Microscope,
  Calculator,
  MessageCircle,
  Flame,
  Trophy,
} from "lucide-react";
import studyImg from "@/assets/bookpadi-study.jpg";

const features = [
  {
    index: "01",
    icon: BookOpen,
    title: "Department Curriculum Vault",
    desc: "Every NUC CCMAS course, syllabus breakdown, and peer-uploaded lecture PDF organized by your exact level and semester.",
    className: "gradient-primary text-primary-foreground",
    cardClass: "md:col-span-2",
  },
  {
    index: "02",
    icon: Sparkles,
    title: "2 AM Topic Translator",
    desc: "Dense 80-page lecturer handouts translated into crisp, exam-ready plain English in seconds.",
    className: "gradient-warm text-primary-foreground",
    cardClass: "",
  },
  {
    index: "03",
    icon: Layers,
    title: "Spaced-Repetition Decks",
    desc: "Instant flashcards built directly from your department’s course modules for rapid recall before tests.",
    className: "gradient-secondary text-secondary-foreground",
    cardClass: "",
  },
  {
    index: "04",
    icon: MessageCircle,
    title: "Department Study Rooms",
    desc: "Live course chat rooms and direct messaging with schoolmates solving the exact same past questions.",
    className: "gradient-primary text-primary-foreground",
    cardClass: "",
  },
  {
    index: "05",
    icon: Microscope,
    title: "Final-Year Research Studio",
    desc: "Literature synthesis, project structuring, and academic citation tools built for seminar and thesis defense.",
    className: "gradient-warm text-primary-foreground",
    cardClass: "",
  },
  {
    index: "06",
    icon: FileText,
    title: "Theory & Essay Grader",
    desc: "Test your written answers against strict university marking schemes before the real exam paper lands.",
    className: "gradient-secondary text-secondary-foreground",
    cardClass: "",
  },
  {
    index: "07",
    icon: Calculator,
    title: "5.00 CGPA Target Engine",
    desc: "Simulate semester grades, calculate exact units needed for First Class, and track every course credit live.",
    className: "gradient-primary text-primary-foreground",
    cardClass: "",
  },
  {
    index: "08",
    icon: Calendar,
    title: "Exam Countdown & Timetable",
    desc: "Live subject countdown timers, daily study goals, and conflict-free weekly reading blocks.",
    className: "gradient-warm text-primary-foreground",
    cardClass: "md:col-span-2",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Top Bar Contract: Zone 1 (Wordmark) — Zone 2 (4 single-line links) — Zone 3 (1 Primary CTA) */}
      <header className="sticky top-0 z-40 border-b glass">
        <div className="container mx-auto flex h-16 items-center justify-between gap-8 px-4 max-w-7xl">
          <Link
            to="/"
            className="text-xl font-extrabold tracking-tight text-foreground whitespace-nowrap shrink-0"
          >
            Bookpadi
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
            <a
              href="#curriculum"
              className="hover:text-foreground transition-colors whitespace-nowrap shrink-0"
            >
              Curriculum
            </a>
            <a
              href="#features"
              className="hover:text-foreground transition-colors whitespace-nowrap shrink-0"
            >
              Study Engine
            </a>
            <Link
              to="/login"
              className="hover:text-foreground transition-colors whitespace-nowrap shrink-0"
            >
              Study Rooms
            </Link>
            <Link
              to="/login"
              className="hover:text-foreground transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </Link>
          </nav>

          <div className="flex items-center shrink-0">
            <Link to="/signup">
              <Button
                size="sm"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold px-5 h-9 whitespace-nowrap shrink-0"
              >
                Start Free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Redesigned Hero Section — High-Class Gen-Z Scriptwriter Voice */}
      <section id="curriculum" className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-48 -right-40 w-[520px] h-[520px] rounded-full gradient-primary opacity-[0.11] blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[420px] h-[420px] rounded-full gradient-secondary opacity-[0.1] blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative max-w-7xl">
          <div className="grid items-stretch gap-12 lg:grid-cols-12">
            {/* Left Copy Column */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <p className="text-xs sm:text-sm font-semibold tracking-wide text-primary mb-4">
                Built for Nigerian Campuses · NUC CCMAS Aligned · 100L to Final Year
              </p>

              <h1 className="text-4xl sm:text-6xl lg:text-[4.15rem] font-extrabold tracking-tight leading-[1.02] text-foreground max-w-2xl">
                Outsmart the syllabus.{" "}
                <span className="text-gradient-primary">Bag the 5.0.</span>{" "}
                Still have a life.
              </h1>

              <p className="mt-6 text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
                300-page lecturer handouts? Turned into 5-minute plain-English breakdowns.
                Verified department past questions, live exam countdowns, and campus study rooms
                built for how you actually lock in—whether that’s two weeks early or 2 AM before the paper.
              </p>

              <div className="flex flex-wrap items-center gap-4 mt-8">
                <Link to="/signup">
                  <Button
                    size="lg"
                    className="gradient-primary text-primary-foreground hover:opacity-95 shadow-glow h-12 px-7 text-base gap-2 font-bold whitespace-nowrap shrink-0"
                  >
                    Claim Your Semester <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 px-6 text-base font-medium whitespace-nowrap shrink-0"
                  >
                    Enter Student Portal
                  </Button>
                </Link>
              </div>

              <div className="mt-8 pt-6 border-t flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-muted-foreground">
                <span>Zero subscription fees</span>
                <span aria-hidden="true">·</span>
                <span>Peer-vetted PDF notes & past questions</span>
                <span aria-hidden="true">·</span>
                <span>Federal, State & Private Universities</span>
              </div>
            </div>

            {/* Right Visual Showcase Column */}
            <div className="lg:col-span-5 relative flex flex-col justify-between">
              <div className="relative rounded-2xl overflow-hidden border bg-card shadow-elevated h-full min-h-[380px]">
                <img
                  src={studyImg}
                  alt="Nigerian university student locking in for semester exams with Bookpadi"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover min-h-[380px]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

                {/* Bottom Overlay Editorial Card */}
                <div className="absolute bottom-0 inset-x-0 p-6 text-white space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-white/80 tabular-nums">
                    <span>FIRST CLASS TRAJECTORY</span>
                    <span>CGPA 4.78 / 5.00</span>
                  </div>
                  <p className="text-lg font-bold leading-snug">
                    “Went from drowning in CSC & MTH PDFs to finishing every module a week before exams.”
                  </p>
                  <p className="text-xs text-white/75">
                    Chidinma Okafor · 200L Computer Science, UNILAG
                  </p>
                </div>
              </div>

              {/* Floating Streak Callout */}
              <div className="hidden sm:flex items-center gap-3 absolute -top-4 -left-5 rounded-xl bg-card border px-4 py-2.5 shadow-elevated">
                <Flame className="w-5 h-5 text-accent shrink-0" />
                <div className="tabular-nums">
                  <p className="text-[11px] font-medium text-muted-foreground">Active Campus Streak</p>
                  <p className="text-sm font-bold text-foreground">14 Days Locked In</p>
                </div>
              </div>

              {/* Floating Leaderboard Callout */}
              <div className="hidden sm:flex items-center gap-2.5 absolute top-6 -right-4 rounded-xl bg-secondary text-secondary-foreground px-3.5 py-2 shadow-elevated">
                <Trophy className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold tabular-nums">Top 1% Dept Rank</span>
              </div>
            </div>
          </div>

          {/* Full-Width 4-Column Quantitative Proof Strip Below Hero Split */}
          <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-6 pt-8 border-t">
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono tabular-nums">
                50+ Departments
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Full NUC CCMAS syllabus coverage from 100L to 500L
              </p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono tabular-nums">
                500+ Courses
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Structured modules, past questions, and summary sheets
              </p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-primary font-mono tabular-nums">
                5.00 Scale
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Real-time Nigerian university CGPA & target grade simulator
              </p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono tabular-nums">
                100% Free
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Built for students across Federal, State & Private campuses
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Bento Grid */}
      <section id="features" className="py-16 md:py-24 border-t relative">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="max-w-2xl mb-14">
            <p className="text-xs sm:text-sm font-semibold text-primary mb-2">
              The Complete Academic Arsenal
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
              Stop juggling ten WhatsApp groups.{" "}
              <span className="text-gradient-primary">Own your semester.</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-base sm:text-lg">
              Every tool you need to decode tough lecturers, drill past questions, and stay ahead of exam week.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className={`group relative rounded-2xl border bg-card p-6 hover-lift ${f.cardClass}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl ${f.className} flex items-center justify-center`}>
                    <f.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono tabular-nums text-muted-foreground">
                    {f.index}
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bright CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="relative rounded-3xl gradient-cta-bright p-10 md:p-16 text-center overflow-hidden border-2 border-secondary shadow-elevated">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/35 blur-2xl" />
              <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-primary/20 blur-2xl" />
            </div>
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-slate-950/10 flex items-center justify-center mx-auto mb-6">
                <GraduationCap className="w-8 h-8 text-slate-950" />
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-slate-950 tracking-tight">
                Your best semester starts now.
              </h2>
              <p className="mt-4 text-slate-900/85 text-lg max-w-xl mx-auto font-medium">
                Join Nigerian students using Bookpadi to prep for exams, understand their
                curriculum, and build study habits that actually stick.
              </p>
              <Link to="/signup">
                <Button
                  size="lg"
                  className="mt-8 gradient-primary text-primary-foreground hover:opacity-95 h-12 px-8 text-base gap-2 font-bold shadow-elevated whitespace-nowrap shrink-0"
                >
                  Create free account <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t py-10">
        <div className="container mx-auto px-4 max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight">Bookpadi</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Bookpadi. Built for Nigerian university students.
          </p>
        </div>
      </footer>
    </div>
  );
}
