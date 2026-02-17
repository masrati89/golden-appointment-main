/**
 * Google OAuth callback - receives redirect from Google after user authorizes.
 *
 * IMPORTANT: Deploy with --no-verify-jwt because Google redirects here WITHOUT
 * an Authorization header. The function does not require or check auth.
 *
 * State param format: base64(JSON.stringify({ origin, business_id }))
 * - origin: app URL for redirect back (e.g. https://myapp.com)
 * - business_id: settings.id to update in business_settings
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function parseState(state: string | null): { origin: string | null; businessId: string | null } {
  if (!state || !state.trim()) return { origin: null, businessId: null };
  // Legacy: state = plain URL (origin)
  if (state.startsWith("http")) {
    try {
      return { origin: new URL(state).origin, businessId: null };
    } catch {
      return { origin: null, businessId: null };
    }
  }
  // New: state = base64(JSON.stringify({ origin, business_id }))
  try {
    const decoded = atob(state.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = JSON.parse(decoded) as { origin?: string; business_id?: string };
    const origin = parsed.origin && parsed.origin.startsWith("http") ? new URL(parsed.origin).origin : null;
    const businessId = typeof parsed.business_id === "string" ? parsed.business_id : null;
    return { origin, businessId };
  } catch {
    return { origin: null, businessId: null };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const { origin: redirectBase, businessId } = parseState(state);
  const defaultRedirect = redirectBase ? `${redirectBase}/admin/settings?connected=1` : "/admin/settings?connected=1";
  const failRedirect = redirectBase ? `${redirectBase}/admin/settings?connected=0` : "/admin/settings?connected=0";

  if (errorParam) {
    const redirectUrl = redirectBase ? `${redirectBase}/admin/settings?connected=0&error=${encodeURIComponent(errorParam)}` : failRedirect;
    return Response.redirect(redirectUrl, 302);
  }

  if (!code) {
    return Response.redirect(failRedirect, 302);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    console.error("Google OAuth: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set");
    return Response.redirect(failRedirect, 302);
  }

  const callbackUrl = `${supabaseUrl}/functions/v1/google-auth-callback`;
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
    console.error("Google did not return refresh_token (use access_type=offline&prompt=consent)");
    return Response.redirect(failRedirect, 302);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const rpcParams: { p_refresh_token: string; p_settings_id?: string } = {
    p_refresh_token: refreshToken,
  };
  if (businessId) rpcParams.p_settings_id = businessId;

  const { error } = await supabase.rpc("set_business_google_tokens", rpcParams);

  if (error) {
    console.error("set_business_google_tokens failed:", error);
    return Response.redirect(failRedirect, 302);
  }

  return Response.redirect(defaultRedirect, 302);
});
