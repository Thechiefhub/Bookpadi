import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Sparkles, Calendar, Brain, Zap, ArrowRight, GraduationCap,
  Layers, FileText, Microscope, Calculator, MessageCircle, Mic, Flame,
} from "lucide-react";
import studyImg from "@/assets/bookpadi-study.jpg";

const marqueeItems = [
  "Course Explorer", "AI Explanations", "Exam Practice", "Flashcards",
  "Essay Reviewer", "Research Hub", "GPA Tracker", "Study Timetable",
  "Schoolmate Messaging", "Voice Notes", "Study Guides", "Assignments",
];

const features = [
  {
    icon: BookOpen,
    title: "Course Explorer",
    desc: "Your department's full CCMAS curriculum — every course, topic and resource.",
    className: "gradient-primary text-primary-foreground",
    cardClass: "md:col-span-2",
  },
  {
    icon: Sparkles,
    title: "AI Explanations",
    desc: "Any topic explained simply, in plain language that actually lands.",
    className: "gradient-warm text-primary-foreground",
    cardClass: "",
  },
  {
    icon: Layers,
    title: "Flashcards",
    desc: "Auto-generated decks from your course topics for spaced repetition.",
    className: "gradient-secondary text-secondary-foreground",
    cardClass: "",
  },
  {
    icon: MessageCircle,
    title: "Schoolmate Messaging",
    desc: "Search and chat with students from your school by name or username.",
    className: "gradient-primary text-primary-foreground",
    cardClass: "",
  },
  {
    icon: Microscope,
    title: "Research Hub",
    desc: "An elite AI research companion that digs through scholarly sources.",
    className: "gradient-warm text-primary-foreground",
    cardClass: "",
  },
  {
    icon: FileText,
    title: "Essay Reviewer",
    desc: "AI grading with real feedback, strengths and a model answer outline.",
    className: "gradient-secondary text-secondary-foreground",
    cardClass: "",
  },
  {
    icon: Calculator,
    title: "GPA Tracker",
    desc: "Track your 5.0-scale GPA, plan targets, and watch your standing live.",
    className: "gradient-primary text-primary-foreground",
    cardClass: "",
  },
  {
    icon: Calendar,
    title: "Smart Timetable",
    desc: "Weekly study schedules built around your courses and free hours.",
    className: "gradient-warm text-primary-foreground",
    cardClass: "md:col-span-2",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b glass">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <BookOpen className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl tracking-tight" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
              Bookpadi
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold shadow-glow">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-14 pb-10 md:pt-20 md:pb-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-48 -right-40 w-[520px] h-[520px] rounded-full gradient-primary opacity-[0.12] blur-3xl animate-float" />
          <div className="absolute -bottom-40 -left-40 w-[420px] h-[420px] rounded-full gradient-warm opacity-[0.1] blur-3xl animate-float" style={{ animationDelay: "3s" }} />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full gradient-secondary opacity-[0.12] blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="grid items-center gap-10 lg:grid-cols-2 max-w-6xl mx-auto">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold mb-6 animate-fade-in">
                <Zap className="w-3.5 h-3.5" />
                <span>Built for Nigerian university students</span>
              </div>

              <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tighter leading-[0.95] animate-fade-in-up">
                Your campus brain,{" "}
                <span className="relative inline-block">
                  <span className="text-gradient-primary">unlocked</span>
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none" preserveAspectRatio="none">
                    <path d="M2 9C60 3 140 3 198 8" stroke="hsl(var(--secondary))" strokeWidth="5" strokeLinecap="round" />
                  </svg>
                </span>
                .
              </h1>

              <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed animate-fade-in-up stagger-2">
                Your full CCMAS curriculum, AI that explains anything, exam practice,
                flashcards, GPA tracking and classmates you can actually message —
                <span className="text-foreground font-semibold"> all in one place.</span>
              </p>

              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mt-8 animate-fade-in-up stagger-3">
                <Link to="/signup">
                  <Button size="lg" className="gradient-primary hover:opacity-90 shadow-glow h-13 px-8 text-base gap-2 font-semibold">
                    Start studying free <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg" className="h-13 px-8 text-base">
                    I have an account
                  </Button>
                </Link>
              </div>

              <div className="flex items-center gap-8 mt-10 animate-fade-in-up stagger-4">
                {[
                  { value: "50+", label: "Departments" },
                  { value: "500+", label: "Courses" },
                  { value: "100%", label: "Free" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero visual */}
            <div className="relative animate-fade-in-up stagger-3 hidden md:block">
              <div className="relative rounded-3xl overflow-hidden border-4 border-secondary shadow-elevated rotate-2 hover:rotate-0 transition-transform duration-500">
                <img src={studyImg} alt="Nigerian student studying with Bookpadi" className="w-full h-[420px] object-cover" />
                <div className="absolute inset-0 gradient-hero opacity-20" />
              </div>
              <div className="absolute -top-5 -left-6 rounded-2xl gradient-secondary text-secondary-foreground px-4 py-3 shadow-elevated -rotate-6 animate-float">
                <p className="text-xs font-semibold opacity-70">GPA TRACKER</p>
                <p className="text-2xl font-bold">4.42 / 5.0</p>
              </div>
              <div className="absolute -bottom-5 -right-4 rounded-2xl gradient-primary text-primary-foreground px-4 py-3 shadow-elevated rotate-3 animate-float" style={{ animationDelay: "1.5s" }}>
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5" />
                  <div>
                    <p className="text-xs font-semibold opacity-80">STUDY STREAK</p>
                    <p className="text-lg font-bold">12 days 🔥</p>
                  </div>
                </div>
              </div>
              <div className="absolute top-1/2 -right-8 rounded-xl bg-card border px-3 py-2 shadow-elevated -rotate-2">
                <p className="text-xs font-medium text-muted-foreground">CSC201 explained ✓</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <section className="py-6 overflow-hidden">
        <div className="relative">
          <div className="flex gap-4 whitespace-nowrap animate-marquee w-max">
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold ${
                  i % 3 === 0
                    ? "gradient-primary text-primary-foreground"
                    : i % 3 === 1
                    ? "gradient-secondary text-secondary-foreground"
                    : "gradient-warm text-primary-foreground"
                }`}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 relative">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="outline" className="mb-4 border-secondary text-foreground">Everything you need</Badge>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight animate-fade-in">
              Stop juggling apps.{" "}
              <span className="text-gradient-primary">Own your semester.</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg animate-fade-in stagger-1">
              Bookpadi combines real NUC curriculum data with AI to give you the ultimate study companion.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`group relative rounded-2xl border bg-card p-6 hover-lift animate-fade-in-up stagger-${Math.min(i + 1, 6)} ${f.cardClass}`}
              >
                <div className={`w-11 h-11 rounded-xl ${f.className} flex items-center justify-center mb-4`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="relative rounded-3xl gradient-hero p-10 md:p-16 text-center overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-60 h-60 rounded-full gradient-secondary opacity-20 -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full gradient-lime opacity-20 translate-y-1/2 -translate-x-1/2" />
            </div>
            <div className="relative">
              <GraduationCap className="w-12 h-12 text-primary-foreground/90 mx-auto mb-6" />
              <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground tracking-tight">
                Your best semester starts now.
              </h2>
              <p className="mt-4 text-primary-foreground/85 text-lg max-w-xl mx-auto">
                Join Nigerian students using Bookpadi to prep for exams, understand their
                curriculum, and build study habits that actually stick.
              </p>
              <Link to="/signup">
                <Button
                  size="lg"
                  className="mt-8 bg-secondary text-secondary-foreground hover:bg-secondary/90 h-13 px-8 text-base gap-2 font-bold shadow-elevated"
                >
                  Create free account <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Bookpadi</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Bookpadi. Built for Nigerian students.
          </p>
        </div>
      </footer>
    </div>
  );
}
