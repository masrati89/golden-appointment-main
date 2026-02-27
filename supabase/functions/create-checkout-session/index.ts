/**
 * create-checkout-session
 * ───────────────────────
 * Creates a hosted payment page URL for Morning or Meshulam.
 *
 * Called from BookingVertical.tsx immediately after the booking row is
 * inserted with payment_status = 'pending'.
 *
 * Request body:
 *   booking_id      — UUID of the just-created booking row
 *   business_id     — UUID of the business (for fetching gateway creds)
 *   amount          — numeric amount to charge (full price or deposit)
 *   customer_name   — pre-filled on gateway page
 *   customer_email  — pre-filled; Morning also uses this for auto-emailed invoice
 *   customer_phone  — pre-filled on gateway page
 *   service_name    — (optional) service label used as the income line item description
 *
 * Response:
 *   { checkoutUrl: string }             — success (HTTP 200)
 *   { error: string, details: string }  — gateway / config error (HTTP 400)
 *
 * Auth: caller must supply a valid Supabase user JWT (anon or authenticated).
 *       The function uses the service-role key internally to read gateway secrets.
 *
 * Deploy:
 *   npx supabase functions deploy create-checkout-session --no-verify-jwt
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Return a consistent JSON error response — always HTTP 400 (client / gateway config error). */
function errResponse(error: string, details?: string, status = 400) {
  console.error(`[checkout] ${error}${details ? ": " + details : ""}`);
  return new Response(
    JSON.stringify({ error, details: details ?? error }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── 1. Parse request ───────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errResponse("Invalid JSON body");
  }

  const {
    booking_id,
    business_id,
    amount,
    customer_name,
    customer_email,
    customer_phone,
    service_name,       // optional — used as the invoice line-item description
  } = body as Record<string, any>;

  if (!booking_id || !business_id || !amount) {
    return errResponse("Missing required fields: booking_id, business_id, amount");
  }

  console.log(`[checkout] booking=${booking_id} business=${business_id} amount=${amount}`);

  // ── 2. Fetch gateway credentials via service-role (bypasses RLS) ───────
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: settings, error: settingsErr } = await supabaseAdmin
    .from("settings")
    .select("payment_gateway, morning_api_key, morning_api_secret, meshulam_page_code, meshulam_api_token, is_payment_required")
    .eq("business_id", business_id)
    .single();

  if (settingsErr || !settings) {
    return errResponse("Could not load payment settings for this business", settingsErr?.message, 404);
  }

  if (!settings.is_payment_required) {
    return errResponse("Payment is not required for this business");
  }

  // ── 3. Build checkout URL per gateway ──────────────────────────────────
  // All gateway calls are wrapped in try/catch. If a gateway rejects the
  // credentials (401, 400, unexpected JSON) we throw an Error so the catch
  // can format a clean 400 response. We NEVER return 500 / 502 here.
  const webhookBase = `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook`;
  let checkoutUrl: string;

  try {
    switch (settings.payment_gateway) {

      // ── Morning (formerly Green Invoice) ────────────────────────────
      case "morning": {
        const apiKey    = settings.morning_api_key;
        const apiSecret = settings.morning_api_secret;
        if (!apiKey || !apiSecret) {
          throw new Error("Morning API Key or API Secret is not configured");
        }

        // ── Step 1: obtain a short-lived JWT from Morning ──────────────
        // SANDBOX mode — switch to https://api.greeninvoice.co.il for production
        const morningBase = "https://sandbox.d.greeninvoice.co.il/api/v1";
        // Standard browser headers to pass Morning's Cloudflare WAF
        const morningHeaders = {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        };
        console.log("[morning] Step 1 — fetching auth token");

        const tokenRes = await fetch(`${morningBase}/account/token`, {
          method: "POST",
          headers: morningHeaders,
          body: JSON.stringify({ id: apiKey, secret: apiSecret }),
        });

        console.log("[morning] token response status:", tokenRes.status);
        if (!tokenRes.ok) {
          const errText = await tokenRes.text().catch(() => "(unreadable)");
          throw new Error(`Morning auth failed (HTTP ${tokenRes.status}): ${errText}`);
        }

        const tokenData = await tokenRes.json();
        const jwt = tokenData?.token ?? tokenData?.jwt ?? tokenData?.data?.token;
        if (!jwt) {
          throw new Error(
            `Morning returned OK on /account/token but no token found. Response: ${JSON.stringify(tokenData).slice(0, 200)}`
          );
        }
        console.log("[morning] auth token obtained");

        // ── Step 2: create the payment form ───────────────────────────
        const lineDescription = (service_name as string | undefined)
          ?? `שירות תור #${(booking_id as string).slice(0, 8)}`;

        const morningApiUrl = `${morningBase}/payments/form`;
        console.log("[morning] Step 2 — POST", morningApiUrl, {
          booking_id, amount, description: `תור #${(booking_id as string).slice(0, 8)}`,
          customer_name, customer_email: !!customer_email,
        });

        const morningRes = await fetch(morningApiUrl, {
          method: "POST",
          headers: {
            ...morningHeaders,
            "Authorization": `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            description:  `תור #${(booking_id as string).slice(0, 8)}`,
            type:         320,           // receipt + tax invoice
            lang:         "he",
            currency:     "ILS",
            vatType:      0,             // inclusive VAT
            amount:       Number(amount),
            maxPayments:  1,
            pluginId:     "appointment-booking",
            sendByEmail:  true,          // Morning auto-emails the invoice PDF
            client: {
              name:   (customer_name  as string) ?? "",
              emails: customer_email ? [(customer_email as string)] : [],
              phone:  (customer_phone as string) ?? "",
            },
            income: [
              {
                price:       Number(amount),
                quantity:    1,
                description: lineDescription,
                vatType:     0,
              },
            ],
            successUrl: `${req.headers.get("origin") ?? ""}/b/success?booking=${booking_id}&status=paid`,
            failureUrl: `${req.headers.get("origin") ?? ""}/b/success?booking=${booking_id}&status=failed`,
            notifyUrl:  `${webhookBase}?gateway=morning`,
            remarks:    `booking_id:${booking_id}`,
          }),
        });

        console.log("[morning] response status:", morningRes.status);
        if (!morningRes.ok) {
          const errText = await morningRes.text().catch(() => "(unreadable)");
          throw new Error(`Morning rejected the request (HTTP ${morningRes.status}): ${errText}`);
        }

        const morningData = await morningRes.json();
        const url = morningData?.url ?? morningData?.data?.url;
        if (!url) {
          throw new Error(
            `Morning returned OK but no checkout URL. Response: ${JSON.stringify(morningData).slice(0, 200)}`
          );
        }

        checkoutUrl = url;
        console.log("[morning] checkout URL created:", checkoutUrl);
        break;
      }

      // ── Meshulam ─────────────────────────────────────────────────────
      case "meshulam": {
        const pageCode = settings.meshulam_page_code;
        const apiToken = settings.meshulam_api_token;
        if (!pageCode || !apiToken) {
          throw new Error("Meshulam page code or API token is not configured");
        }

        // ── SANDBOX mode — switch back to secure.meshulam.co.il for production ──
        const meshulamApiUrl = "https://sandbox.meshulam.co.il/payme/api/createTransaction.json";
        console.log("[meshulam] POST", meshulamApiUrl, {
          booking_id, sum: amount, hasPageCode: !!pageCode, hasApiToken: !!apiToken,
          customer_name, customer_email: !!customer_email,
        });

        const meshulamRes = await fetch(meshulamApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageCode,
            userId:        apiToken,
            fullName:      (customer_name  as string) ?? "",
            email:         (customer_email as string) ?? "",
            phone:         (customer_phone as string) ?? "",
            sum:           Number(amount),
            description:   (service_name as string | undefined)
                             ?? `תור #${(booking_id as string).slice(0, 8)}`,
            transactionId: booking_id,
            successUrl:    `${req.headers.get("origin") ?? ""}/b/success?booking=${booking_id}&status=paid`,
            errorUrl:      `${req.headers.get("origin") ?? ""}/b/success?booking=${booking_id}&status=failed`,
            notifyUrl:     `${webhookBase}?gateway=meshulam`,
          }),
        });

        console.log("[meshulam] response status:", meshulamRes.status);
        if (!meshulamRes.ok) {
          const errText = await meshulamRes.text().catch(() => "(unreadable)");
          throw new Error(`Meshulam rejected the request (HTTP ${meshulamRes.status}): ${errText}`);
        }

        const meshulamData = await meshulamRes.json();

        // Meshulam returns { err: "..." } on logical errors even with HTTP 200
        if (meshulamData.err) {
          throw new Error(`Meshulam returned an error: ${meshulamData.err}`);
        }

        const url = meshulamData?.data?.url ?? meshulamData?.url;
        if (!url) {
          throw new Error(
            `Meshulam returned OK but no checkout URL. Response: ${JSON.stringify(meshulamData).slice(0, 200)}`
          );
        }

        checkoutUrl = url;
        console.log("[meshulam] checkout URL created:", checkoutUrl);
        break;
      }

      default:
        throw new Error(`Unknown payment gateway: "${settings.payment_gateway}"`);
    }

  } catch (gatewayErr: unknown) {
    // Any gateway rejection (bad token, wrong credentials, network error, etc.)
    // is returned as 400 so the frontend receives a parseable JSON body.
    const details = gatewayErr instanceof Error ? gatewayErr.message : String(gatewayErr);
    return errResponse("Gateway error", details, 400);
  }

  // ── 4. Return the checkout URL ─────────────────────────────────────────
  return new Response(
    JSON.stringify({ checkoutUrl }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
