import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Timetable } from "./types";

interface Props {
  timetable: Timetable;
}

export default function GoogleCalendarSync({ timetable }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Check for tokens from OAuth callback on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokensParam = params.get("gcal_tokens");
    const errorParam = params.get("gcal_error");

    if (errorParam) {
      toast.error(`Google Calendar authorization failed: ${errorParam}`);
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (tokensParam) {
      try {
        const tokens = JSON.parse(decodeURIComponent(tokensParam));
        setAccessToken(tokens.access_token);
        // Store refresh token for future use
        if (tokens.refresh_token) {
          localStorage.setItem("gcal_refresh_token", tokens.refresh_token);
        }
        toast.success("Google Calendar connected! Click 'Sync to Google Calendar' to add your events.");
        // Clean URL
        window.history.replaceState({}, "", window.location.pathname);
      } catch {
        toast.error("Failed to parse Google Calendar tokens");
      }
    }
  }, []);

  const handleConnect = async () => {
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-auth`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            redirectUri: window.location.origin + window.location.pathname,
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Failed to start authorization");
      }

      const { authUrl } = await resp.json();
      window.location.href = authUrl;
    } catch (e: any) {
      toast.error(e.message || "Failed to connect to Google Calendar");
    }
  };

  const handleSync = async () => {
    if (!accessToken) return;
    setSyncing(true);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ accessToken, timetable }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Sync failed");
      }

      const data = await resp.json();
      setSynced(true);
      toast.success(data.message);
    } catch (e: any) {
      toast.error(e.message || "Failed to sync with Google Calendar");
    } finally {
      setSyncing(false);
    }
  };

  if (synced) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <Check className="w-4 h-4 text-green-500" />
        Synced to Google Calendar
      </Button>
    );
  }

  if (accessToken) {
    return (
      <Button onClick={handleSync} disabled={syncing} size="sm" variant="outline" className="gap-2">
        {syncing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ExternalLink className="w-4 h-4" />
        )}
        {syncing ? "Syncing…" : "Sync to Google Calendar"}
      </Button>
    );
  }

  return (
    <Button onClick={handleConnect} size="sm" variant="outline" className="gap-2">
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Connect Google Calendar
    </Button>
  );
}
