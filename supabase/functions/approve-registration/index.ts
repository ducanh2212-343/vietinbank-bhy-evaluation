import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Mật khẩu tạm ngẫu nhiên (giống _shared/staff.ts — giữ bản sao để hàm tự chứa khi deploy). */
function generatePassword(length = 16): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

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

    // temp_password từ client bị BỎ QUA có chủ đích: trước đây là 8 số cuối SĐT
    // (đoán được — ai biết SĐT có thể đăng nhập trước chủ tài khoản). Server tự
    // sinh mật khẩu ngẫu nhiên và trả về đúng 1 lần cho người duyệt bàn giao riêng.
    const { request_id, assigned_role, review_comment, action } = await req.json();

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

      // Audit log (best-effort)
      try {
        await adminClient.from("audit_logs").insert({
          user_id: user.id,
          action: "reject_registration",
          entity_type: "staff_account",
          entity_id: null,
          new_data: { request_id, target_email: regReq.email },
        });
      } catch (auditErr) {
        console.error("audit_logs insert failed:", auditErr);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle approval (default)
    if (!request_id) throw new Error("Missing required fields");
    const tempPassword = generatePassword();

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
      password: tempPassword,
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

    // Send approval email — KHÔNG kèm mật khẩu/gợi ý mật khẩu qua email;
    // mật khẩu tạm được người duyệt bàn giao riêng (Zalo/SMS).
    try {
      await adminClient.functions.invoke("send-transactional-email", {
        body: {
          templateName: "registration-approved",
          recipientEmail: regReq.email,
          idempotencyKey: `reg-approved-${request_id}`,
          templateData: {
            fullName: regReq.full_name,
            email: regReq.email,
            tempPasswordHint: "người phê duyệt sẽ gửi riêng cho bạn qua Zalo/SMS",
          },
        },
      });
    } catch (emailErr) {
      console.error("Failed to send approval email:", emailErr);
    }

    // Audit log (best-effort)
    try {
      await adminClient.from("audit_logs").insert({
        user_id: user.id,
        action: "approve_registration",
        entity_type: "staff_account",
        entity_id: newUserId,
        new_data: {
          request_id,
          target_email: regReq.email,
          role: roleToAssign,
          profile_id: newProfile.id,
        },
      });
    } catch (auditErr) {
      console.error("audit_logs insert failed:", auditErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUserId,
        profile_id: newProfile.id,
        email: regReq.email,
        full_name: regReq.full_name,
        // Trả về đúng 1 lần cho màn hình người duyệt để bàn giao riêng.
        temp_password: tempPassword,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});