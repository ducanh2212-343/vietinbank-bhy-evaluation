// auth-email-hook — Send Email Hook chuẩn của Supabase Auth (đã bỏ Lovable).
//
// Supabase Auth gọi hook này cho MỌI email xác thực (đặt lại mật khẩu, xác nhận
// đăng ký, magic link, đổi email, mã xác minh). Hook render template tiếng Việt
// rồi enqueue vào hàng đợi 'auth_emails' (ưu tiên cao) — dispatcher
// process-email-queue gửi qua Resend từ noreply@343skill.com.
//
// Xác thực: chữ ký standardwebhooks với secret SEND_EMAIL_HOOK_SECRET
// (Dashboard → Authentication → Hooks → Send Email → tạo hook HTTPS sẽ sinh secret).
// Chưa cấu hình secret → trả 500 rõ ràng, Auth fallback báo lỗi thay vì gửi lặng lẽ sai.
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { Webhook } from 'npm:standardwebhooks@1.0.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SignupEmail } from './email-templates/signup.tsx'
import { InviteEmail } from './email-templates/invite.tsx'
import { MagicLinkEmail } from './email-templates/magic-link.tsx'
import { RecoveryEmail } from './email-templates/recovery.tsx'
import { EmailChangeEmail } from './email-templates/email-change.tsx'
import { ReauthenticationEmail } from './email-templates/reauthentication.tsx'

const SITE_NAME = '343 Phát triển nhân sự'
const FROM_DOMAIN = '343skill.com'
const SENDER_DOMAIN = 'notify.343skill.com'
const APP_URL = Deno.env.get('APP_URL') || 'https://343skill.com'

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: 'Xác nhận email đăng ký — 343 Phát triển nhân sự',
  invite: 'Bạn được mời tham gia — 343 Phát triển nhân sự',
  magiclink: 'Liên kết đăng nhập — 343 Phát triển nhân sự',
  recovery: 'Đặt lại mật khẩu — 343 Phát triển nhân sự',
  email_change: 'Xác nhận thay đổi email — 343 Phát triển nhân sự',
  reauthentication: 'Mã xác minh của bạn — 343 Phát triển nhân sự',
}

const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

// email_action_type của Auth → key template + type trên URL /auth/v1/verify.
// email_change có 2 biến thể (xác nhận ở địa chỉ cũ / mới) dùng chung template.
function normalizeAction(action: string): { template: string; verifyType: string } {
  if (action === 'email_change_current' || action === 'email_change_new' || action === 'email_change') {
    return { template: 'email_change', verifyType: 'email_change' }
  }
  return { template: action, verifyType: action }
}

Deno.serve(async (req) => {
  try {
    const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET')
    if (!hookSecret) {
      console.error('SEND_EMAIL_HOOK_SECRET chưa được cấu hình')
      return Response.json(
        { error: 'SEND_EMAIL_HOOK_SECRET not configured' },
        { status: 500 },
      )
    }

    // ---- Xác minh chữ ký standardwebhooks (bắt buộc) ----
    const rawBody = await req.text()
    let payload: any
    try {
      const wh = new Webhook(hookSecret.replace(/^v1,whsec_/, ''))
      payload = wh.verify(rawBody, {
        'webhook-id': req.headers.get('webhook-id') ?? '',
        'webhook-timestamp': req.headers.get('webhook-timestamp') ?? '',
        'webhook-signature': req.headers.get('webhook-signature') ?? '',
      })
    } catch (e) {
      console.error('Chữ ký webhook không hợp lệ', { error: String(e) })
      return Response.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const user = payload?.user
    const emailData = payload?.email_data
    if (!user?.email || !emailData?.email_action_type) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const action = String(emailData.email_action_type)
    const { template, verifyType } = normalizeAction(action)
    const EmailTemplate = EMAIL_TEMPLATES[template]
    if (!EmailTemplate) {
      console.error('Loại email không hỗ trợ', { action })
      return Response.json({ error: `Unknown email type: ${action}` }, { status: 400 })
    }

    // Người nhận: biến thể email_change_new gửi tới địa chỉ MỚI.
    const recipient = action === 'email_change_new' && emailData.new_email
      ? String(emailData.new_email)
      : String(user.email)

    // Link xác nhận qua /auth/v1/verify (đổi token_hash lấy phiên rồi chuyển về app).
    const tokenHash = action === 'email_change_new' && emailData.token_hash_new
      ? String(emailData.token_hash_new)
      : String(emailData.token_hash ?? '')
    const redirectTo = String(emailData.redirect_to || APP_URL)
    const confirmationUrl =
      `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${encodeURIComponent(tokenHash)}` +
      `&type=${encodeURIComponent(verifyType)}&redirect_to=${encodeURIComponent(redirectTo)}`

    const templateProps = {
      siteName: SITE_NAME,
      siteUrl: APP_URL,
      recipient,
      confirmationUrl,
      token: emailData.token,
      email: user.email,
      newEmail: emailData.new_email,
    }

    const html = await renderAsync(React.createElement(EmailTemplate, templateProps))
    const text = await renderAsync(React.createElement(EmailTemplate, templateProps), {
      plainText: true,
    })

    // ---- Enqueue vào hàng đợi ưu tiên auth_emails ----
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const messageId = crypto.randomUUID()

    // Ghi 'pending' TRƯỚC khi enqueue để luôn có dấu vết kể cả khi enqueue lỗi.
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: template,
      recipient_email: recipient,
      status: 'pending',
    })

    const { error: enqueueError } = await supabase.rpc('enqueue_email', {
      queue_name: 'auth_emails',
      payload: {
        message_id: messageId,
        to: recipient,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: EMAIL_SUBJECTS[template] || 'Thông báo',
        html,
        text,
        purpose: 'transactional',
        label: template,
        // Auth có thể retry hook — khóa idempotency theo token để không gửi trùng.
        idempotency_key: `auth:${action}:${tokenHash || messageId}`,
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      console.error('Enqueue auth email thất bại', { error: enqueueError, action })
      await supabase.from('email_send_log')
        .update({ status: 'failed', error_message: 'Failed to enqueue email' })
        .eq('message_id', messageId)
      return Response.json({ error: 'Failed to enqueue email' }, { status: 500 })
    }

    console.log('Auth email đã vào hàng đợi', { action, recipient, messageId })
    return Response.json({})
  } catch (error) {
    console.error('auth-email-hook error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
})
