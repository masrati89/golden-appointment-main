/**
 * GoogleCallback — intermediate page for the Google Calendar OAuth flow.
 *
 * Google redirects here with ?code=...&state=...
 * We use onAuthStateChange (not getSession on mount) to wait for the Supabase
 * session to be available after the full-page redirect from Google.
 *
 * Key fix: Supabase fires 'INITIAL_SESSION' on every new subscription, not
 * 'INITIALIZED' (which is not a real event name).
 *
 * Route: /admin/auth/google-callback  (ProtectedRoute — user must be signed in)
 */

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

export default function GoogleCallback() {
  const navigate = useNavigate();
  // Prevent double-run in React Strict Mode or multiple auth events
  const hasRun = useRef(false);

  useEffect(() => {
    // Subscribe BEFORE reading URL params — event fires synchronously on subscribe
    // if the session is already loaded (INITIAL_SESSION), or asynchronously once
    // Supabase finishes reading localStorage (SIGNED_IN after token refresh).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[google-callback] Auth Event: ${event} | session: ${!!session}`);

      // 'INITIAL_SESSION' fires immediately on subscribe with the current auth state.
      // 'SIGNED_IN'       fires after a token refresh completes.
      // NOTE: 'INITIALIZED' is NOT a real Supabase event — the correct name is 'INITIAL_SESSION'.
      if (
        (event === "INITIAL_SESSION" || event === "SIGNED_IN") &&
        session &&
        !hasRun.current
      ) {
        hasRun.current = true;
        subscription.unsubscribe(); // stop listening — we have what we need
        await handleCallback(session);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCallback(session: Session, retryCount = 0) {
    const params = new URLSearchParams(window.location.search);
    const code  = params.get("code");
    const state = params.get("state");
    const error = params.get("error"); // Google sends this when user denies

    // ── Google returned an error ──────────────────────────────────────────
    if (error) {
      navigate(
        `/admin/settings?connected=0&error=${encodeURIComponent(error)}`,
        { replace: true }
      );
      return;
    }

    if (!code) {
      navigate("/admin/settings?connected=0", { replace: true });
      return;
    }

    // Log the first 10 chars of the JWT to confirm it exists
    console.log("JWT used:", session.access_token.substring(0, 10) + "...");

    // Build redirect_uri from current origin — must match what GoogleSyncStatus
    // sent to Google AND what the edge function sends to Google's token endpoint.
    const redirectUri = `${window.location.origin}/admin/auth/google-callback`;
    console.log("[google-callback] redirect_uri:", redirectUri);

    // Use raw fetch so we can read the response body directly on non-2xx.
    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-callback`;

    try {
      const res = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        // redirect_uri sent explicitly so the edge function uses the exact same
        // value that was registered with Google — no derivation, no drift.
        body: JSON.stringify({ code, state, redirect_uri: redirectUri }),
      });

      const resData = await res.json().catch(() => ({}));
      console.log("[google-callback] Response:", res.status, resData);

      if (!res.ok || !(resData as { success?: boolean })?.success) {
        const msg = (resData as { error?: string })?.error || `HTTP ${res.status}`;
        // 4xx = deterministic failure (invalid code, mismatch, bad credentials).
        // Retrying consumes the single-use code without any chance of success.
        // Only retry on 5xx (transient server errors).
        if (res.status >= 400 && res.status < 500) {
          throw new Error(msg); // goes straight to the catch → navigate with error
        }
        throw new Error(msg);
      }

      navigate("/admin/settings?connected=1", { replace: true });
    } catch (err: unknown) {
      // Only retry on network errors (res is undefined) or 5xx — not 4xx.
      const is5xx = err instanceof Error && err.message.startsWith("HTTP 5");
      const isNetwork = err instanceof TypeError; // fetch threw (no response at all)
      if ((is5xx || isNetwork) && retryCount < 3) {
        console.warn(`[google-callback] Retry ${retryCount + 1}/3 in 1s... (${String(err)})`);
        setTimeout(() => handleCallback(session, retryCount + 1), 1000);
      } else {
        console.error("[google-callback] Failed:", err);
        const msg = err instanceof Error ? err.message : "Calendar connection failed";
        navigate(
          `/admin/settings?connected=0&error=${encodeURIComponent(msg)}`,
          { replace: true }
        );
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">מחבר את יומן Google...</p>
    </div>
  );
}
