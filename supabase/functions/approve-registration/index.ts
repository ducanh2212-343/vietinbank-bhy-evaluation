import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with caller's token to check permissions
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    // Check caller has approval role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const allowedRoles = ["system_admin", "bgd", "tcth_admin"];
    const hasPermission = callerRoles?.some((r: any) => allowedRoles.includes(r.role));
    if (!hasPermission) throw new Error("Insufficient permissions");

    const { request_id, assigned_role, review_comment, temp_password, action } = await req.json();

    // Handle rejection
    if (action === "reject") {
      if (!request_id) throw new Error("Missing request_id");

      const { data: regReq, error: reqError } = await adminClient
        .from("registration_requests")
        .select("*")
        .eq("id", request_id)
        .single();

      if (reqError || !regReq) throw new Error("Registration request not found");
      if (regReq.status !== "pending") throw new Error("Request is not pending");

      const { data: callerProfile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      await adminClient
        .from("registration_requests")
        .update({
          status: "rejected",
          reviewed_by: callerProfile?.id || null,
          reviewed_at: new Date().toISOString(),
          review_comment: review_comment || null,
        })
        .eq("id", request_id);

      // Send rejection email
      try {
        await adminClient.functions.invoke("send-transactional-email", {
          body: {
            templateName: "registration-rejected",
            recipientEmail: regReq.email,
            idempotencyKey: `reg-rejected-${request_id}`,
            templateData: {
              fullName: regReq.full_name,
              reviewComment: review_comment || null,
            },
          },
        });
      } catch (emailErr) {
        console.error("Failed to send rejection email:", emailErr);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle approval (default)
    if (!request_id || !temp_password) throw new Error("Missing required fields");
    if (temp_password.length < 6) throw new Error("Temporary password too short");

    // Get the registration request
    const { data: regReq, error: reqError } = await adminClient
      .from("registration_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (reqError || !regReq) throw new Error("Registration request not found");
    if (regReq.status !== "pending") throw new Error("Request is not pending");

    // Get caller's profile id
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    // Create auth user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: regReq.email,
      password: temp_password,
      email_confirm: true,
      user_metadata: { full_name: regReq.full_name, must_change_password: true },
    });

    if (createError) throw new Error(`Failed to create user: ${createError.message}`);

    const newUserId = newUser.user.id;

    // Create profile
    // Resolve position name for display
    let positionName: string | null = null;
    if (regReq.position_id) {
      const { data: posData } = await adminClient.from("positions").select("name").eq("id", regReq.position_id).single();
      positionName = posData?.name || null;
    }

    const { data: newProfile, error: profileError } = await adminClient
      .from("profiles")
      .insert({
        user_id: newUserId,
        full_name: regReq.full_name,
        email: regReq.email,
        phone: regReq.phone_number,
        department_id: regReq.department_id,
        position_id: regReq.position_id,
        position: positionName,
        status: "active",
      })
      .select("id")
      .single();

    if (profileError) throw new Error(`Failed to create profile: ${profileError.message}`);

    // Assign role
    const roleToAssign = assigned_role || "employee";
    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({ user_id: newUserId, role: roleToAssign });

    if (roleError) throw new Error(`Failed to assign role: ${roleError.message}`);

    // Update registration request
    await adminClient
      .from("registration_requests")
      .update({
        status: "approved",
        reviewed_by: callerProfile?.id || null,
        reviewed_at: new Date().toISOString(),
        review_comment: review_comment || null,
        created_auth_user_id: newUserId,
        created_profile_id: newProfile.id,
      })
      .eq("id", request_id);

    // Send approval email
    try {
      await adminClient.functions.invoke("send-transactional-email", {
        body: {
          templateName: "registration-approved",
          recipientEmail: regReq.email,
          idempotencyKey: `reg-approved-${request_id}`,
          templateData: {
            fullName: regReq.full_name,
            email: regReq.email,
            tempPasswordHint: "8 số cuối của số điện thoại đã đăng ký",
          },
        },
      });
    } catch (emailErr) {
      console.error("Failed to send approval email:", emailErr);
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUserId, profile_id: newProfile.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});