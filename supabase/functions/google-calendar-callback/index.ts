import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      const redirectUri = state ? decodeURIComponent(state) : '/';
      return Response.redirect(`${redirectUri}?gcal_error=${encodeURIComponent(error)}`, 302);
    }

    if (!code) {
      return new Response('Missing authorization code', { status: 400 });
    }

    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return new Response('Google OAuth not configured', { status: 500 });
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${SUPABASE_URL}/functions/v1/google-calendar-callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokens);
      const redirectUri = state ? decodeURIComponent(state) : '/';
      return Response.redirect(`${redirectUri}?gcal_error=token_exchange_failed`, 302);
    }

    // Redirect back to the app with tokens as fragment (not query params for security)
    const redirectUri = state ? decodeURIComponent(state) : '/';
    const tokenData = encodeURIComponent(JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
    }));

    return Response.redirect(`${redirectUri}?gcal_tokens=${tokenData}`, 302);
  } catch (error) {
    console.error('Callback error:', error);
    return new Response('Internal server error', { status: 500 });
  }
});
