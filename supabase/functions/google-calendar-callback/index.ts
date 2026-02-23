import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // optional: redirect URL back to app
  const errorParam = url.searchParams.get("error");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  // H-4: Parse base64-JSON state for CSRF validation and admin user identification.
  // State format: btoa(JSON.stringify({ origin, admin_user_id, ts }))
  let redirectBase: string | null = null;
  let adminUserId: string | null = null;

  if (state) {
    try {
      const parsed = JSON.parse(atob(state));
      if (parsed.origin) {
        try { redirectBase = new URL(parsed.origin).origin; } catch { /* ignore bad origin */ }
      }
      // CSRF: reject state older than 10 minutes
      if (!parsed.ts || Date.now() - parsed.ts > 10 * 60 * 1000) {
        console.error("Google OAuth: state timestamp missing or expired (CSRF protection)");
        const failUrl = redirectBase ? `${redirectBase}/admin/settings?connected=0` : "/admin/settings?connected=0";
        return Response.redirect(failUrl, 302);
      }
      adminUserId = parsed.admin_user_id ?? null;
    } catch {
      // Not base64-JSON — reject (old plain-URL state format is no longer accepted)
      console.error("Google OAuth: invalid state parameter format");
      return Response.redirect("/admin/settings?connected=0", 302);
    }
  }

  if (!adminUserId) {
    console.error("Google OAuth: admin_user_id missing from state");
    const failUrl = redirectBase ? `${redirectBase}/admin/settings?connected=0` : "/admin/settings?connected=0";
    return Response.redirect(failUrl, 302);
  }

  const defaultRedirect = redirectBase ? `${redirectBase}/admin/settings?connected=1` : "/admin/settings?connected=1";
  const failRedirect = redirectBase ? `${redirectBase}/admin/settings?connected=0` : "/admin/settings?connected=0";

  if (errorParam) {
    const redirectUrl = redirectBase ? `${redirectBase}/admin/settings?connected=0&error=${encodeURIComponent(errorParam)}` : failRedirect;
    return Response.redirect(redirectUrl, 302);
  }

  if (!code) {
    return Response.redirect(failRedirect, 302);
  }

  if (!clientId || !clientSecret) {
    console.error("Google OAuth: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set");
    return Response.redirect(failRedirect, 302);
  }

  const callbackUrl = `${supabaseUrl}/functions/v1/google-calendar-callback`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: callbackUrl,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error("Google token exchange failed:", errText);
    return Response.redirect(failRedirect, 302);
  }

  const tokenData = await tokenRes.json();
  const refreshToken = tokenData.refresh_token;
  if (!refreshToken) {
    console.error("Google did not return refresh_token (ensure prompt=consent and access_type=offline)");
    return Response.redirect(failRedirect, 302);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  // Pass admin_user_id so the RPC updates only the correct tenant's settings row.
  const { error } = await supabase.rpc("set_google_calendar_tokens", {
    p_refresh_token: refreshToken,
    p_admin_user_id: adminUserId,
  });

  if (error) {
    console.error("set_google_calendar_tokens failed:", error);
    return Response.redirect(failRedirect, 302);
  }

  return Response.redirect(defaultRedirect, 302);
});
