import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentIntentId, bookingId } = await req.json();

    if (!paymentIntentId || !bookingId) {
      return new Response(
        JSON.stringify({ error: "Missing paymentIntentId or bookingId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get settings
    const { data: settings } = await supabase
      .from("settings")
      .select("stripe_secret_key")
      .maybeSingle();

    if (!settings?.stripe_secret_key) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(settings.stripe_secret_key, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Retrieve payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Update booking status based on payment status
    const updateData: any = {
      stripe_payment_status: paymentIntent.status,
    };

    if (paymentIntent.status === "succeeded") {
      updateData.payment_status = "paid";
      updateData.status = "confirmed";
    } else if (paymentIntent.status === "canceled" || paymentIntent.status === "payment_failed") {
      updateData.payment_status = "failed";
    }

    await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId);

    return new Response(
      JSON.stringify({
        success: paymentIntent.status === "succeeded",
        status: paymentIntent.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
