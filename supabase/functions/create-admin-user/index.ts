import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { email, password, business_id } = await req.json();

    // בדיקה שכל הפרטים הועברו
    if (!email || !password || !business_id) {
      return new Response(
        JSON.stringify({ success: false, error: "חסרים פרטים: email, password, business_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. צור משתמש חדש
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !newUser?.user) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ success: false, error: createError?.message || "שגיאה ביצירת משתמש" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = newUser.user.id;

    // 2. תן לו role=admin
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });

    if (roleError) {
      console.error("Error setting role:", roleError);
      // מחק את המשתמש אם הוספת ה-role נכשלה
      await supabase.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ success: false, error: "שגיאה בהגדרת הרשאות" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. קשר אותו לעסק — צור שורת settings אם לא קיימת, ועדכן admin_user_id תמיד
    const { data: existingSettings } = await supabase
      .from("settings")
      .select("id")
      .eq("business_id", business_id)
      .maybeSingle();

    if (!existingSettings) {
      // טען את שם העסק
      const { data: business } = await supabase
        .from("businesses")
        .select("name, phone")
        .eq("id", business_id)
        .single();

      await supabase.from("settings").insert({
        business_id,
        business_name: business?.name || "עסק חדש",
        business_phone: business?.phone || null,
        admin_user_id: userId,
      });
    } else {
      // settings קיים — עדכן admin_user_id למשתמש החדש
      await supabase
        .from("settings")
        .update({ admin_user_id: userId })
        .eq("business_id", business_id);
    }

    console.log(`[create-admin-user] Created admin ${email} for business ${business_id}`);

    return new Response(
      JSON.stringify({ success: true, user_id: userId, email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});