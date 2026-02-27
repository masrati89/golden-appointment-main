/**
 * google-calendar-callback — OAuth token exchange (Frontend Proxy pattern)
 * ─────────────────────────────────────────────────────────────────────────
 * JWT Verification: ON  ← Supabase platform validates the Bearer token.
 *
 * Flow (see GoogleCallback.tsx for the frontend side):
 *  1. User clicks "Connect Google Calendar" → redirected to Google consent screen
 *  2. Google redirects the browser to /admin/auth/google-callback?code=...&state=...
 *  3. That frontend route calls supabase.functions.invoke('google-calendar-callback',
 *       { body: { code, state } })
 *     supabase.functions.invoke automatically attaches the admin's JWT as Bearer token.
 *  4. This function:
 *       a. Gets admin_user_id from the verified JWT
 *       b. Validates the state CSRF timestamp
 *       c. Exchanges code → refresh_token with Google
 *       d. Saves refresh_token via set_google_calendar_tokens RPC (tenant-scoped)
 *       e. Returns { success: true }
 *  5. Frontend navigates to /admin/settings?connected=1
 *
 * Deploy (no --no-verify-jwt needed):
 *   npx supabase functions deploy google-calendar-callback
 *
 * Google Cloud Console:
 *   Authorized redirect URIs must include:
 *     http://localhost:8080/admin/auth/google-callback   (dev)
 *     https://<your-domain>/admin/auth/google-callback  (prod)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const supabaseUrl  = Deno.env.get("SUPABASE_URL")!;
  const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const clientId     = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  // ── Identify the authenticated admin from the JWT ──────────────────────
  // Supabase platform has already verified the JWT signature at this point.
  // We use getUser() to resolve the user ID rather than trusting a self-decoded
  // payload, which provides a second layer of validation.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ success: false, error: "Authorization required" }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authErr || !user) {
    console.error("[google-calendar-callback] Auth failed:", authErr?.message);
    return json({ success: false, error: "Unauthorized" }, 401);
  }
  const adminUserId = user.id;

  // ── Parse POST body ────────────────────────────────────────────────────
  let code: string | undefined;
  let state: string | undefined;
  let redirectUri: string | undefined;
  try {
    const body = await req.json();
    code        = body.code;
    state       = body.state;
    redirectUri = body.redirect_uri; // sent explicitly by the frontend
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400);
  }

  if (!code) {
    return json({ success: false, error: "Missing code" }, 400);
  }

  // ── CSRF: validate state timestamp ────────────────────────────────────
  if (state) {
    try {
      const parsed = JSON.parse(atob(state));
      if (!parsed.ts || Date.now() - parsed.ts > 10 * 60 * 1000) {
        console.error("[google-calendar-callback] State timestamp missing or expired");
        return json({ success: false, error: "OAuth state expired — please try again" }, 400);
      }
      // Prefer redirect_uri embedded in state (set at the moment the OAuth was initiated)
      // over the one derived at callback time — eliminates any port/origin drift.
      if (!redirectUri && parsed.redirect_uri) {
        redirectUri = parsed.redirect_uri;
      }
    } catch {
      console.error("[google-calendar-callback] Invalid state parameter format");
      return json({ success: false, error: "Invalid state parameter" }, 400);
    }
  }

  if (!clientId || !clientSecret) {
    console.error("[google-calendar-callback] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set");
    return json({ success: false, error: "Server misconfiguration" }, 500);
  }

  if (!redirectUri) {
    console.error("[google-calendar-callback] redirect_uri missing from body and state");
    return json({ success: false, error: "Missing redirect_uri" }, 400);
  }

  // ── Exchange authorization code → refresh token ───────────────────────
  // redirect_uri must exactly match the value used in the authorization request.
  console.log(`[google-calendar-callback] Exchanging code for admin ${adminUserId.slice(0, 8)}... | redirect_uri: ${redirectUri}`);

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error("[google-calendar-callback] Token exchange failed:", tokenRes.status, errText);
    // Use 400 so the Supabase JS client surfaces the body in fnError.context
    return json({ success: false, error: `Google token exchange failed (${tokenRes.status}): ${errText}` }, 400);
  }

  const tokenData = await tokenRes.json();
  const refreshToken = tokenData.refresh_token;

  if (!refreshToken) {
    console.error("[google-calendar-callback] No refresh_token returned — ensure prompt=consent and access_type=offline");
    return json({
      success: false,
      error: "Google did not return a refresh token. Please disconnect and reconnect to grant offline access.",
    }, 400);
  }

  // ── Save tokens scoped to this admin's settings row (tenant-isolated) ──
  // Use the RPC rather than a direct .from().update() — the RPC runs inside
  // Postgres and doesn't require PostgREST to have the column in its schema
  // cache (which can be stale). Direct REST updates hit PGRST204 when the
  // column cache lags behind the actual schema.
  const { error: rpcErr } = await supabase.rpc("set_google_calendar_tokens", {
    p_refresh_token: refreshToken,
    p_admin_user_id: adminUserId,
  });

  if (rpcErr) {
    console.error("[google-calendar-callback] set_google_calendar_tokens RPC failed:", rpcErr.message, rpcErr.code);
    return json({
      success: false,
      error: `Failed to save calendar tokens: ${rpcErr.message} (code: ${rpcErr.code})`,
    }, 500);
  }

  console.log(`[google-calendar-callback] Google Calendar connected for admin ${adminUserId.slice(0, 8)}...`);
  return json({ success: true });
});
