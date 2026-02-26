/**
 * payment-webhook
 * ───────────────
 * Receives server-to-server payment success notifications from Morning
 * (Green Invoice) and Meshulam and updates the bookings table accordingly.
 *
 * Called automatically by the gateways via the notifyUrl we pass when
 * creating the checkout session. The notifyUrl includes a ?gateway= query
 * param so we know which gateway is calling without having to guess:
 *
 *   Morning:  …/payment-webhook?gateway=morning
 *   Meshulam: …/payment-webhook?gateway=meshulam
 *
 * On success the function:
 *   1. Extracts booking_id from the gateway payload
 *   2. Updates bookings.payment_status → 'paid'
 *   3. Saves the generated invoice/receipt URL → bookings.invoice_url (if present)
 *
 * ALWAYS returns HTTP 200 to prevent the gateway from retrying.
 * Internal errors are logged but do not affect the response code.
 *
 * Auth: No Supabase JWT — this is an external callback.
 *   Security: booking_id is a UUID (128-bit random) — essentially unguessable.
 *   We verify the booking exists in our DB before writing.
 *
 * Deploy:
 *   npx supabase functions deploy payment-webhook --no-verify-jwt
 *
 * ──────────────────────────────────────────────────────────────────────────
 * Morning webhook payload (POST JSON):
 *   {
 *     "type":    "paymentForm",
 *     "status":  "success",              // or "failure"
 *     "remarks": "booking_id:<uuid>",    // echoed from our createTransaction call
 *     "amount":  100,
 *     "doc": {
 *       "id":  "...",
 *       "url": "https://api.greeninvoice.co.il/..."  // generated invoice PDF link
 *     }
 *   }
 *
 * Meshulam webhook payload (POST JSON or form-encoded):
 *   {
 *     "transactionId": "<booking-uuid>",  // echoed from our createTransaction call
 *     "status":        "success",
 *     "paymentId":     "...",
 *     "sum":           "100",
 *     "fullName":      "...",
 *     "email":         "...",
 *     "receiptUrl":    "..."              // present if Meshulam generates a receipt
 *   }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Always respond 200 — gateways should not retry on non-2xx
const ok = (body: Record<string, unknown> = { received: true }) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

serve(async (req) => {
  // CORS pre-flight (gateways don't send OPTIONS, but be safe)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type",
      },
    });
  }

  // ── Service-role client — bypasses RLS for server-side writes ─────────
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ── Detect gateway from query param ───────────────────────────────────
  const url     = new URL(req.url);
  const gateway = url.searchParams.get("gateway"); // "morning" | "meshulam" | null

  // ── Parse body ────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      // Some gateway integrations POST form-encoded data
      const text   = await req.text();
      const params = new URLSearchParams(text);
      body = Object.fromEntries(params.entries());
    } else {
      body = await req.json();
    }
  } catch (e) {
    console.error("[webhook] Failed to parse request body:", e);
    return ok({ received: true, error: "parse_error" });
  }

  console.log(`[webhook] gateway=${gateway ?? "unknown"} payload=${JSON.stringify(body)}`);

  // ── Extract booking_id, invoice_url, and status per gateway ──────────
  let bookingId:  string | null = null;
  let invoiceUrl: string | null = null;
  let isSuccess = false;

  // ── Morning ───────────────────────────────────────────────────────────
  // Identify Morning payload: has a "remarks" field containing "booking_id:"
  if (
    gateway === "morning" ||
    (typeof body.remarks === "string" && body.remarks.startsWith("booking_id:"))
  ) {
    // remarks = "booking_id:<uuid>"
    const remarks = (body.remarks as string | undefined) ?? "";
    if (remarks.startsWith("booking_id:")) {
      bookingId = remarks.replace("booking_id:", "").trim();
    }

    // Morning sends the generated document URL inside doc.url
    const doc = body.doc as Record<string, unknown> | undefined;
    invoiceUrl = (doc?.url as string | undefined) ?? null;

    // Morning status: "success" on payment completion
    isSuccess = body.status === "success";

    console.log(
      `[morning] booking=${bookingId} status=${body.status} invoice=${invoiceUrl ?? "none"}`
    );
  }

  // ── Meshulam ──────────────────────────────────────────────────────────
  // Identify Meshulam payload: has "transactionId" (our booking UUID)
  else if (
    gateway === "meshulam" ||
    typeof body.transactionId === "string"
  ) {
    bookingId = (body.transactionId as string) || null;

    // Meshulam may include a receipt link when the merchant has accounting enabled
    invoiceUrl =
      (body.receiptUrl  as string | undefined) ??
      (body.documentUrl as string | undefined) ??
      null;

    // Meshulam status: "success" string, or absence of an "err" field
    isSuccess = body.status === "success" || (!body.err && !body.error);

    console.log(
      `[meshulam] booking=${bookingId} status=${body.status} invoice=${invoiceUrl ?? "none"}`
    );
  }

  // ── Unknown gateway ───────────────────────────────────────────────────
  else {
    console.warn("[webhook] Unrecognised payload — cannot extract booking_id:", JSON.stringify(body));
    return ok({ received: true, error: "unrecognised_gateway" });
  }

  // ── Guard: must have a booking_id ─────────────────────────────────────
  if (!bookingId) {
    console.error("[webhook] Could not extract booking_id from payload");
    return ok({ received: true, error: "missing_booking_id" });
  }

  // ── Guard: only process successful payments ───────────────────────────
  if (!isSuccess) {
    console.log(`[webhook] Non-success event for booking ${bookingId} — no DB update`);
    return ok({ received: true, skipped: true, reason: "non_success_event" });
  }

  // ── Verify booking exists before writing ──────────────────────────────
  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("id, payment_status")
    .eq("id", bookingId)
    .maybeSingle();

  if (fetchErr || !booking) {
    console.error(`[webhook] Booking ${bookingId} not found:`, fetchErr);
    return ok({ received: true, error: "booking_not_found" });
  }

  // Idempotency — skip if already marked paid
  if (booking.payment_status === "paid") {
    console.log(`[webhook] Booking ${bookingId} already paid — skipping`);
    return ok({ received: true, skipped: true, reason: "already_paid" });
  }

  // ── Update booking ─────────────────────────────────────────────────────
  const updatePayload: Record<string, unknown> = { payment_status: "paid" };
  if (invoiceUrl) {
    updatePayload.invoice_url = invoiceUrl;
  }

  const { error: updateErr } = await supabase
    .from("bookings")
    .update(updatePayload)
    .eq("id", bookingId);

  if (updateErr) {
    console.error(`[webhook] Failed to update booking ${bookingId}:`, updateErr);
    return ok({ received: true, error: "db_update_failed" });
  }

  console.log(
    `[webhook] ✓ Booking ${bookingId} marked paid` +
    (invoiceUrl ? ` | invoice saved: ${invoiceUrl}` : "")
  );

  return ok({ received: true, booking_id: bookingId, invoice_saved: !!invoiceUrl });
});
