import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'
// Domain gửi + link đích cấu hình tập trung (secret APP_URL / EMAIL_FROM_DOMAIN /
// EMAIL_SENDER_DOMAIN) — xem _shared/email-config.ts.
import { FROM_DOMAIN, FROM_NAME, SENDER_DOMAIN } from '../_shared/email-config.ts'

const SITE_NAME = FROM_NAME

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

// Generate a cryptographically random 32-byte hex token
function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Địa chỉ email hợp lệ ở mức thô — chặn luôn giá trị chứa dấu phẩy/ngoặc để
// không bao giờ có chuỗi lạ lọt vào bộ lọc PostgREST.
const EMAIL_RE = /^[^\s@,()"'\\]+@[^\s@,()"'\\]+\.[^\s@,()"'\\]+$/

/**
 * Địa chỉ này hệ thống đã biết chưa? Trả về nguồn khớp (để ghi log) hoặc null.
 *
 * Dùng cho ĐƯỜNG TƯƠNG THÍCH: phía gọi cũ truyền thẳng `recipientEmail`. Ta
 * không cấm hẳn tham số đó (sẽ làm chết thư duyệt/từ chối đăng ký đang chạy),
 * nhưng chỉ nhận địa chỉ ĐÃ CÓ SẴN trong hệ thống — nhờ vậy hàm không còn là
 * công cụ gửi thư "chính chủ ngân hàng" tới địa chỉ bất kỳ.
 *
 * VÌ SAO CÓ NHÁNH registration_requests (đừng bỏ): thư `registration-rejected`
 * gửi cho người bị TỪ CHỐI đăng ký, mà dòng `profiles` chỉ được tạo khi DUYỆT.
 * Chỉ tra `profiles` là thư báo từ chối im lặng biến mất.
 *
 * VÀ VÌ SAO NHÁNH ĐÓ PHẢI SIẾT HAI LẦN (`registration-rejected` + đơn đã ở trạng
 * thái `rejected`): bảng `registration_requests` mở INSERT cho cả `anon`
 * (chính sách «Anyone can submit registration request», WITH CHECK (true)) — ai
 * cũng nộp được một đơn mang địa chỉ bất kỳ. Nếu chỉ hỏi «email này có trong
 * registration_requests không» thì kẻ tấn công nộp đơn mang địa chỉ nạn nhân là
 * biến địa chỉ đó thành «hệ thống đã biết», và đường gửi tới địa chỉ tuỳ ý vừa
 * bịt lại mở ra y nguyên. Đơn tự nộp luôn ở trạng thái `pending`; chỉ người có
 * quyền duyệt (qua approve-registration) mới đẩy được sang `rejected` — và luồng
 * đó cập nhật trạng thái TRƯỚC khi gọi gửi thư nên thư từ chối thật vẫn đi bình
 * thường.
 *
 * So khớp bằng `in` với đúng hai biến thể (nguyên văn + chữ thường) thay vì
 * `ilike`: `ilike` coi `%` và `_` là ký tự đại diện nên "%@bachungyenone.com"
 * sẽ khớp mọi hồ sơ — đúng lỗ hổng vừa vá. Phía gọi thật luôn truyền đúng
 * chuỗi đã lưu trong DB (cùng lấy từ một dòng registration_requests) nên khớp
 * chính xác là đủ.
 */
async function nguonBietDiaChi(
  admin: any,
  diaChi: string,
  emailNguoiGoi: string | null,
  templateName: string,
): Promise<string | null> {
  const sach = diaChi.trim()
  if (!EMAIL_RE.test(sach)) return null
  if (emailNguoiGoi && emailNguoiGoi.trim().toLowerCase() === sach.toLowerCase()) {
    return 'nguoi_goi'
  }
  const bienThe = [...new Set([sach, sach.toLowerCase()])]
  // Chỉ `profiles` mới là danh sách địa chỉ mà người ngoài KHÔNG tự ghi vào được.
  const cho: Array<[string, string, string]> = [
    ['profiles', 'email', 'ho_so'],
    ['profiles', 'personal_email', 'ho_so_email_ca_nhan'],
  ]
  for (const [bang, cot, nguon] of cho) {
    // Lỗi truy vấn → coi như KHÔNG biết địa chỉ (fail-closed): thà không gửi
    // được một thư còn hơn mở lại đường gửi tới địa chỉ tuỳ ý.
    const { data, error } = await admin.from(bang).select('id').in(cot, bienThe).limit(1)
    if (error) {
      console.error('Không tra được địa chỉ người nhận', { bang, cot, error })
      return null
    }
    if (data && data.length > 0) return nguon
  }

  // Nhánh đơn đăng ký — bảng anon ghi được nên khoá đúng một trường hợp dùng thật
  // (xem ghi chú dài ở đầu hàm): thư báo TỪ CHỐI gửi cho đơn ĐÃ bị từ chối.
  if (templateName === 'registration-rejected') {
    const { data, error } = await admin
      .from('registration_requests')
      .select('id')
      .in('email', bienThe)
      .eq('status', 'rejected')
      .limit(1)
    if (error) {
      console.error('Không tra được đơn đăng ký của người nhận', { error })
      return null
    }
    if (data && data.length > 0) return 'don_dang_ky'
  }
  return null
}

// Auth note: this function uses verify_jwt = true in config.toml. We additionally
// require the caller to be either service_role (internal invocation) or an
// authenticated admin user — otherwise anyone with the public anon key could
// trigger emails to arbitrary recipients from our verified domain.

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    console.error('Missing required environment variables')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // Authorization: allow service_role tokens (internal callers) or admin users.
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  let authorized = false
  // Email của chính người gọi — dùng cho đường tương thích bên dưới (admin được
  // phép tự gửi thư về hòm thư của mình để thử template).
  let emailNguoiGoi: string | null = null
  try {
    const payloadB64 = token.split('.')[1] || ''
    const padded = payloadB64 + '='.repeat((4 - (payloadB64.length % 4)) % 4)
    const payload = JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/')))
    if (payload.role === 'service_role') {
      authorized = true
    } else if (payload.sub) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: { user } } = await userClient.auth.getUser()
      if (user) {
        emailNguoiGoi = user.email ?? null
        const adminCheck = createClient(supabaseUrl, supabaseServiceKey)
        const { data: roles } = await adminCheck
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
        const adminRoles = ['bgd', 'tcth_admin', 'system_admin']
        if ((roles || []).some((r: any) => adminRoles.includes(r.role))) {
          authorized = true
        }
      }
    }
  } catch (e) {
    console.error('Auth parse failed', e)
  }

  if (!authorized) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }


  // Parse request body
  let templateName: string
  let recipientEmail: string | null
  let recipientProfileId: string | null
  let idempotencyKey: string
  let messageId: string
  let templateData: Record<string, any> = {}
  try {
    const body = await req.json()
    templateName = body.templateName || body.template_name
    // Cách MỚI (nên dùng): phía gọi nêu MÃ HỒ SƠ, máy chủ tự tra email.
    const maHoSo = body.recipientProfileId || body.recipient_profile_id
    recipientProfileId = typeof maHoSo === 'string' && maHoSo.trim() ? maHoSo.trim() : null
    // Cách CŨ: địa chỉ email do phía gọi truyền — nay phải qua kiểm chứng bên dưới.
    // Ép về chuỗi ngay tại đây: phía gọi truyền số/đối tượng thì các bước sau
    // gọi .trim() sẽ nổ 500 thay vì trả lỗi 400 tử tế.
    const diaChiTho = body.recipientEmail || body.recipient_email
    recipientEmail = typeof diaChiTho === 'string' && diaChiTho.trim() ? diaChiTho.trim() : null
    messageId = crypto.randomUUID()
    idempotencyKey = body.idempotencyKey || body.idempotency_key || messageId
    if (body.templateData && typeof body.templateData === 'object') {
      templateData = body.templateData
    }
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  if (!templateName) {
    return new Response(
      JSON.stringify({ error: 'templateName is required' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // 1. Look up template from registry (early — needed to resolve recipient)
  const template = TEMPLATES[templateName]

  if (!template) {
    console.error('Template not found in registry', { templateName })
    return new Response(
      JSON.stringify({
        error: `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`,
      }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // Create Supabase client with service role (bypasses RLS).
  // Tạo sớm hơn trước đây vì bước chọn người nhận ngay dưới đã cần tra bảng.
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // ---- Chọn người nhận (siết 24/08/2026) ----------------------------------
  // TRƯỚC ĐÂY: gửi thẳng tới `recipientEmail` do phía gọi truyền. Thư lại đi từ
  // tên miền đã xác thực của ngân hàng (noreply@bachungyenone.com), nên chỉ cần
  // một lần lọt quyền quản trị hoặc rò service key là có ngay công cụ gửi thư
  // lừa đảo trông y như thật tới ĐỊA CHỈ BẤT KỲ — mồi lừa đảo lợi hại nhất mà
  // hệ thống này có thể tự trao cho kẻ tấn công.
  // NAY: địa chỉ do MÁY CHỦ tra ra từ hồ sơ (cùng khuôn send-hr-notification),
  // phía gọi chỉ được nêu mã hồ sơ; ai vẫn truyền email thì địa chỉ đó bắt buộc
  // phải đã tồn tại trong hệ thống.
  let effectiveRecipient: string | null = null
  let nguonNguoiNhan = ''

  if (template.to) {
    // Template khai người nhận cố định (vd hòm thư quản trị) — không phụ thuộc
    // phía gọi, nên luôn được ưu tiên. Giữ nguyên hành vi cũ.
    effectiveRecipient = template.to
    nguonNguoiNhan = 'template'
  } else if (recipientProfileId) {
    const { data: hoSo, error: loiHoSo } = await supabase
      .from('profiles')
      .select('id, email, personal_email, status')
      .eq('id', recipientProfileId)
      .maybeSingle()
    if (loiHoSo) {
      console.error('Lỗi tra hồ sơ người nhận', { error: loiHoSo, recipientProfileId })
      return new Response(
        JSON.stringify({ error: 'Không tra được hồ sơ người nhận' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!hoSo || hoSo.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Không tìm thấy cán bộ đang hoạt động với mã hồ sơ này' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    effectiveRecipient = (hoSo.email || hoSo.personal_email || '').trim() || null
    if (!effectiveRecipient) {
      return new Response(
        JSON.stringify({ error: 'Hồ sơ cán bộ này chưa có email — không gửi được' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    nguonNguoiNhan = 'ma_ho_so'
  } else if (recipientEmail) {
    const nguon = await nguonBietDiaChi(supabase, recipientEmail, emailNguoiGoi, templateName)
    if (!nguon) {
      console.warn('Từ chối gửi tới địa chỉ hệ thống không biết', { templateName })
      return new Response(
        JSON.stringify({
          error:
            'Địa chỉ người nhận không thuộc hệ thống. Hãy truyền recipient_profile_id thay cho recipientEmail.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    effectiveRecipient = recipientEmail.trim()
    nguonNguoiNhan = nguon
  }

  if (!effectiveRecipient) {
    return new Response(
      JSON.stringify({
        error: 'recipient_profile_id is required (unless the template defines a fixed recipient)',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // 2. Check suppression list (fail-closed: if we can't verify, don't send)
  const { data: suppressed, error: suppressionError } = await supabase
    .from('suppressed_emails')
    .select('id')
    .eq('email', effectiveRecipient.toLowerCase())
    .maybeSingle()

  if (suppressionError) {
    console.error('Suppression check failed — refusing to send', {
      error: suppressionError,
      effectiveRecipient,
    })
    return new Response(
      JSON.stringify({ error: 'Failed to verify suppression status' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  if (suppressed) {
    // Log the suppressed attempt
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'suppressed',
    })

    console.log('Email suppressed', { effectiveRecipient, templateName })
    return new Response(
      JSON.stringify({ success: false, reason: 'email_suppressed' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // 3. Get or create unsubscribe token (one token per email address)
  const normalizedEmail = effectiveRecipient.toLowerCase()
  let unsubscribeToken: string

  // Check for existing token for this email
  const { data: existingToken, error: tokenLookupError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (tokenLookupError) {
    console.error('Token lookup failed', {
      error: tokenLookupError,
      email: normalizedEmail,
    })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'Failed to look up unsubscribe token',
    })
    return new Response(
      JSON.stringify({ error: 'Failed to prepare email' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  if (existingToken && !existingToken.used_at) {
    // Reuse existing unused token
    unsubscribeToken = existingToken.token
  } else if (!existingToken) {
    // Create new token — upsert handles concurrent inserts gracefully
    unsubscribeToken = generateToken()
    const { error: tokenError } = await supabase
      .from('email_unsubscribe_tokens')
      .upsert(
        { token: unsubscribeToken, email: normalizedEmail },
        { onConflict: 'email', ignoreDuplicates: true }
      )

    if (tokenError) {
      console.error('Failed to create unsubscribe token', {
        error: tokenError,
      })
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'failed',
        error_message: 'Failed to create unsubscribe token',
      })
      return new Response(
        JSON.stringify({ error: 'Failed to prepare email' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // If another request raced us, our upsert was silently ignored.
    // Re-read to get the actual stored token.
    const { data: storedToken, error: reReadError } = await supabase
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (reReadError || !storedToken) {
      console.error('Failed to read back unsubscribe token after upsert', {
        error: reReadError,
        email: normalizedEmail,
      })
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'failed',
        error_message: 'Failed to confirm unsubscribe token storage',
      })
      return new Response(
        JSON.stringify({ error: 'Failed to prepare email' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    unsubscribeToken = storedToken.token
  } else {
    // Token exists but is already used — email should have been caught by suppression check above.
    // This is a safety fallback; log and skip sending.
    console.warn('Unsubscribe token already used but email not suppressed', {
      email: normalizedEmail,
    })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'suppressed',
      error_message:
        'Unsubscribe token used but email missing from suppressed list',
    })
    return new Response(
      JSON.stringify({ success: false, reason: 'email_suppressed' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // 4. Render React Email template to HTML and plain text
  const html = await renderAsync(
    React.createElement(template.component, templateData)
  )
  const plainText = await renderAsync(
    React.createElement(template.component, templateData),
    { plainText: true }
  )

  // Resolve subject — supports static string or dynamic function
  const resolvedSubject =
    typeof template.subject === 'function'
      ? template.subject(templateData)
      : template.subject

  // 5. Enqueue the pre-rendered email for async processing by the dispatcher.
  // The dispatcher (process-email-queue) handles sending, retries, and rate-limit backoff.

  // Log pending BEFORE enqueue so we have a record even if enqueue crashes
  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: effectiveRecipient,
    status: 'pending',
  })

  const { error: enqueueError } = await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: effectiveRecipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: resolvedSubject,
      html,
      text: plainText,
      purpose: 'transactional',
      label: templateName,
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    console.error('Failed to enqueue email', {
      error: enqueueError,
      templateName,
      effectiveRecipient,
    })

    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'Failed to enqueue email',
    })

    return new Response(JSON.stringify({ error: 'Failed to enqueue email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Ghi kèm nguồn người nhận: sau vài tuần nhìn log là biết còn nơi nào dùng
  // đường tương thích cũ, để gỡ hẳn tham số recipientEmail.
  console.log('Transactional email enqueued', { templateName, effectiveRecipient, nguonNguoiNhan })

  return new Response(
    JSON.stringify({ success: true, queued: true }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
})
