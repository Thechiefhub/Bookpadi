import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles, Calendar, Pin, Search, ArrowRight, GraduationCap, Zap, Brain } from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Course Explorer",
    desc: "Browse your department's full curriculum with topics, resources, and learning outcomes.",
    gradient: "gradient-primary",
  },
  {
    icon: Sparkles,
    title: "AI Explanations",
    desc: "Get instant, student-friendly explanations of any topic powered by AI.",
    gradient: "gradient-secondary",
  },
  {
    icon: Calendar,
    title: "Smart Timetable",
    desc: "Generate personalised weekly study schedules based on your courses and preferences.",
    gradient: "gradient-warm",
  },
  {
    icon: Brain,
    title: "Study Guides",
    desc: "AI-generated comprehensive study guides tailored to your course curriculum.",
    gradient: "gradient-primary",
  },
  {
    icon: Pin,
    title: "Pin & Annotate",
    desc: "Save important topics and add your personal notes for quick revision.",
    gradient: "gradient-secondary",
  },
  {
    icon: Search,
    title: "Cross-Department Search",
    desc: "Find any course or topic across all departments in seconds.",
    gradient: "gradient-warm",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
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
              <Button size="sm" className="gradient-primary hover:opacity-90 shadow-glow">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full gradient-hero opacity-[0.07] blur-3xl animate-float" />
          <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full gradient-secondary opacity-[0.06] blur-3xl animate-float" style={{ animationDelay: "3s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full gradient-primary opacity-[0.03] blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border bg-card/80 text-sm text-muted-foreground mb-8 animate-fade-in">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span>Built for Nigerian university students</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] animate-fade-in-up">
              Study smarter with{" "}
              <span className="bg-clip-text text-transparent gradient-primary">
                AI-powered
              </span>{" "}
              course tools
            </h1>

            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-in-up stagger-2">
              Access your department's full curriculum, get AI explanations for any topic,
              generate study timetables, and prepare for exams — all in one place.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 animate-fade-in-up stagger-3">
              <Link to="/signup">
                <Button size="lg" className="gradient-primary hover:opacity-90 shadow-glow h-12 px-8 text-base gap-2">
                  Start studying free <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                  I have an account
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-8 md:gap-12 mt-16 animate-fade-in-up stagger-4">
              {[
                { value: "50+", label: "Departments" },
                { value: "500+", label: "Courses" },
                { value: "AI", label: "Powered" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 md:py-28 relative">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight animate-fade-in">
              Everything you need to{" "}
              <span className="bg-clip-text text-transparent gradient-secondary">ace your courses</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg animate-fade-in stagger-1">
              Bookpadi combines curriculum data with AI to give you the ultimate study companion.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`group relative rounded-2xl border bg-card p-6 hover-lift animate-fade-in-up stagger-${Math.min(i + 1, 6)}`}
              >
                <div className={`w-11 h-11 rounded-xl ${f.gradient} flex items-center justify-center mb-4 shadow-glow`}>
                  <f.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="relative rounded-3xl gradient-hero p-10 md:p-16 text-center overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-60 h-60 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />
            </div>
            <div className="relative">
              <GraduationCap className="w-12 h-12 text-primary-foreground/80 mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground tracking-tight">
                Ready to study smarter?
              </h2>
              <p className="mt-4 text-primary-foreground/80 text-lg max-w-xl mx-auto">
                Join thousands of Nigerian students using Bookpadi to prepare for exams, understand their curriculum, and build better study habits.
              </p>
              <Link to="/signup">
                <Button
                  size="lg"
                  className="mt-8 bg-white text-foreground hover:bg-white/90 h-12 px-8 text-base gap-2 shadow-elevated"
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
