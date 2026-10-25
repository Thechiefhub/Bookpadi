import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen, Check, Loader2, X } from "lucide-react";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

type UsernameStatus =
  | { state: "idle" }
  | { state: "invalid"; hint: string }
  | { state: "checking" }
  | { state: "available" }
  | { state: "taken" };

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>({ state: "idle" });
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const handleUsernameChange = (raw: string) => {
    const value = raw.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(value);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    if (!value) {
      setUsernameStatus({ state: "idle" });
      return;
    }
    if (!USERNAME_RE.test(value)) {
      const hint =
        value.length < 3
          ? "At least 3 characters needed."
          : value.length > 20
          ? "Maximum 20 characters."
          : "Only letters, numbers and underscores.";
      setUsernameStatus({ state: "invalid", hint });
      return;
    }

    setUsernameStatus({ state: "checking" });
    debounceRef.current = window.setTimeout(async () => {
      const { data, error } = await supabase.rpc("is_username_available", {
        _username: value,
      });
      if (error) {
        setUsernameStatus({ state: "idle" });
        return;
      }
      setUsernameStatus(data ? { state: "available" } : { state: "taken" });
    }, 400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!USERNAME_RE.test(username)) {
      toast.error("Username must be 3–20 characters: letters, numbers and underscores.");
      return;
    }
    if (usernameStatus.state !== "available") {
      toast.error(usernameStatus.state === "taken" ? "That username is already taken." : "Please confirm your username is available first.");
      return;
    }
    setLoading(true);
    // Re-check at submit time so two people picking the same name never both pass.
    const { data: stillAvailable, error: checkError } = await supabase.rpc(
      "is_username_available",
      { _username: username }
    );
    if (checkError || !stillAvailable) {
      setLoading(false);
      setUsernameStatus({ state: "taken" });
      toast.error("That username was just taken — try another.");
      return;
    }
    const { error } = await signUp(email, password, fullName, username);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Check your email for a confirmation link!");
    }
  };

  const usernameFeedback = () => {
    switch (usernameStatus.state) {
      case "checking":
        return (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking availability…
          </span>
        );
      case "available":
        return (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
            <Check className="w-3.5 h-3.5" /> @{username} is available!
          </span>
        );
      case "taken":
        return (
          <span className="flex items-center gap-1.5 text-sm text-destructive font-medium">
            <X className="w-3.5 h-3.5" /> @{username} is already taken
          </span>
        );
      case "invalid":
        return <span className="text-sm text-destructive font-medium">{usernameStatus.hint}</span>;
      default:
        return <span className="text-sm text-muted-foreground">3–20 characters: letters, numbers, underscores.</span>;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full gradient-primary opacity-10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full gradient-warm opacity-10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-72 h-72 rounded-full gradient-secondary opacity-10 blur-3xl" />
      </div>
      <Card className="w-full max-w-md shadow-elevated relative">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-2">
            <BookOpen className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
          <CardDescription>Join Bookpadi and start studying smarter</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <Input
                  id="username"
                  placeholder="tolu_x"
                  className="pl-8"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  autoComplete="off"
                  required
                />
                {usernameStatus.state === "available" && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                )}
                {usernameStatus.state === "taken" && (
                  <X className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
                )}
              </div>
              {usernameFeedback()}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full gradient-primary hover:opacity-90" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
