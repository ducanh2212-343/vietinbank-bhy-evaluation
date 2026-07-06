// Gửi email HR nội bộ qua hàng đợi transactional_emails:
// - kind = 'quarterly_letter': thư tổng kết phát triển cá nhân cuối kỳ (nội dung do
//   admin duyệt/sửa từ AI trước khi gửi)
// - kind = 'submission_reminder': nhắc cán bộ chưa nộp phiếu trước hạn chu kỳ,
//   kèm deep-link về trang Tự đánh giá
// - kind = 'council_report': gửi kết quả đánh giá công tác đầu mối (điểm trọng số
//   theo nhóm, ẩn danh người chấm) cho chính cán bộ được đánh giá
// Quyền gọi: BGĐ / TCTH admin / system admin / trưởng phòng TCTH (is_tcth_leader).
// Tôn trọng suppressed_emails + unsubscribe token; chống gửi trùng theo idempotency_key
// (thư: 1 lần/kỳ/người; nhắc hạn: tối đa 1 lần/ngày/kỳ/người).
import { createClient } from 'npm:@supabase/supabase-js@2';

const SITE_NAME = 'chieuthuc3';
const SENDER_DOMAIN = 'notify.343skill.com';
const FROM_DOMAIN = '343skill.com';
const APP_URL = 'https://343skill.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Chuyển markdown đơn giản của thư AI (heading/bold/bullet/paragraph) sang HTML an toàn.
function letterMarkdownToHtml(md: string): string {
  const lines = escapeHtml(md.trim()).split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  const closeList = () => { if (inList) { out.push('</ul>'); inList = false; } };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeList(); continue; }
    const bolded = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    if (/^#{1,3}\s+/.test(line)) {
      closeList();
      out.push(`<h3 style="margin:18px 0 6px;font-size:15px;color:#0b2e59;">${bolded.replace(/^#{1,3}\s+/, '')}</h3>`);
    } else if (/^[-*]\s+/.test(line)) {
      if (!inList) { out.push('<ul style="margin:6px 0;padding-left:20px;">'); inList = true; }
      out.push(`<li style="margin:3px 0;">${bolded.replace(/^[-*]\s+/, '')}</li>`);
    } else {
      closeList();
      out.push(`<p style="margin:8px 0;line-height:1.6;">${bolded}</p>`);
    }
  }
  closeList();
  return out.join('\n');
}

function wrapEmail(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="vi"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f2f4f8;font-family:Arial,Helvetica,sans-serif;color:#1a202c;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#0b2e59;border-radius:10px 10px 0 0;padding:18px 24px;">
      <div style="color:#ffffff;font-size:16px;font-weight:bold;">343 Phát triển nhân sự</div>
      <div style="color:#9fb6d4;font-size:11px;">VietinBank Bắc Hưng Yên · 20 năm Vun gốc bền rễ</div>
    </div>
    <div style="background:#ffffff;border-radius:0 0 10px 10px;padding:24px;font-size:14px;">
      <h2 style="margin:0 0 12px;font-size:17px;color:#0b2e59;">${escapeHtml(title)}</h2>
      ${bodyHtml}
    </div>
    <p style="text-align:center;font-size:11px;color:#8a94a6;margin-top:14px;">
      Email tự động từ hệ thống 343 Phát triển nhân sự — ${escapeHtml(APP_URL)}
    </p>
  </div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization') || '';

    // Xác thực: user thật + vai trò đủ quyền
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Cần đăng nhập' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRows } = await admin.from('user_roles').select('role').eq('user_id', user.id);
    const roles = (roleRows || []).map((r: { role: string }) => r.role);
    let allowed = roles.some((r) => ['bgd', 'tcth_admin', 'system_admin'].includes(r));
    if (!allowed) {
      const { data: isTcth } = await admin.rpc('is_tcth_leader', { _user_id: user.id });
      allowed = isTcth === true;
    }
    if (!allowed) return json({ error: 'Chỉ BGĐ / Phòng TCTH được gửi email này' }, 403);

    const body = await req.json();
    const kind = body.kind as string;
    const profileId = body.recipient_profile_id as string;
    const cycleName = (body.cycle_name as string) || '';
    if (!['quarterly_letter', 'submission_reminder', 'council_report'].includes(kind) || !profileId || !cycleName) {
      return json({ error: 'Thiếu kind / recipient_profile_id / cycle_name' }, 400);
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('id, full_name, email, personal_email, status')
      .eq('id', profileId)
      .maybeSingle();
    if (!profile || profile.status !== 'active') return json({ error: 'Không tìm thấy cán bộ active' }, 404);
    const recipient = (profile.email || profile.personal_email || '').trim().toLowerCase();
    if (!recipient) return json({ success: false, skipped: 'no_email' });

    // Nội dung theo loại
    let subject = '';
    let bodyHtml = '';
    let text = '';
    let label = '';
    let idempotencyKey = '';
    const firstName = profile.full_name || 'bạn';

    if (kind === 'quarterly_letter') {
      const letter = (body.letter_markdown as string || '').trim();
      if (!letter) return json({ error: 'Thiếu letter_markdown' }, 400);
      label = 'quarterly-letter';
      subject = `🌱 Thư phát triển cá nhân ${cycleName} — 343 Phát triển nhân sự`;
      idempotencyKey = `qletter-${cycleName}-${profileId}`;
      bodyHtml = letterMarkdownToHtml(letter);
      text = letter;
    } else if (kind === 'council_report') {
      const scoreText = (body.score_text as string || '').trim();
      const submittedCount = Number(body.submitted_count) || 0;
      const totalMembers = Number(body.total_members) || 0;
      const weightPresent = (body.weight_present as string || '').trim();
      const groups = Array.isArray(body.groups) ? body.groups as {
        label: string; votes: number; raw_avg: string; weight: string; contribution: string;
      }[] : [];
      if (!scoreText || groups.length === 0) return json({ error: 'Thiếu score_text / groups' }, 400);
      label = 'council-report';
      subject = `📊 Kết quả đánh giá công tác đầu mối ${cycleName} — 343 Phát triển nhân sự`;
      const today = new Date().toISOString().slice(0, 10);
      // Cho phép gửi lại trong ngày nếu điểm thay đổi (có thêm phiếu mới)
      idempotencyKey = `creport-${cycleName}-${profileId}-${today}-${scoreText}`;
      const groupRows = groups.map((g) => `
        <tr>
          <td style="border:1px solid #d7dde6;padding:6px 8px;">${escapeHtml(g.label)}</td>
          <td style="border:1px solid #d7dde6;padding:6px 8px;text-align:center;">${escapeHtml(String(g.votes))}</td>
          <td style="border:1px solid #d7dde6;padding:6px 8px;text-align:center;">${escapeHtml(g.raw_avg)}</td>
          <td style="border:1px solid #d7dde6;padding:6px 8px;text-align:center;">${escapeHtml(g.weight)}</td>
          <td style="border:1px solid #d7dde6;padding:6px 8px;text-align:center;">${escapeHtml(g.contribution)}</td>
        </tr>`).join('');
      const ctaUrl = `${APP_URL}/bao-cao-dau-moi`;
      bodyHtml = `
<p style="margin:8px 0;line-height:1.6;">Kính gửi <strong>${escapeHtml(firstName)}</strong>,</p>
<p style="margin:8px 0;line-height:1.6;">Hội đồng đánh giá công tác đầu mối đã tổng hợp kết quả kỳ
<strong>${escapeHtml(cycleName)}</strong> của ông/bà (${submittedCount}/${totalMembers} phiếu, danh tính người chấm được ẩn danh).</p>
<div style="text-align:center;margin:16px 0;padding:14px;background:#f2f6fc;border-radius:8px;">
  <div style="font-size:12px;color:#5a6577;">ĐIỂM QUY VỀ THANG 100</div>
  <div style="font-size:28px;font-weight:bold;color:#0b2e59;">${escapeHtml(scoreText)}</div>
  ${weightPresent ? `<div style="font-size:11px;color:#8a94a6;">Tổng trọng số bỏ phiếu hiện có: ${escapeHtml(weightPresent)}</div>` : ''}
</div>
<table style="border-collapse:collapse;width:100%;font-size:12px;">
  <tr style="background:#eef1f6;">
    <th style="border:1px solid #d7dde6;padding:6px 8px;text-align:left;">Nhóm đánh giá</th>
    <th style="border:1px solid #d7dde6;padding:6px 8px;">Số phiếu</th>
    <th style="border:1px solid #d7dde6;padding:6px 8px;">Điểm TB nhóm</th>
    <th style="border:1px solid #d7dde6;padding:6px 8px;">Trọng số</th>
    <th style="border:1px solid #d7dde6;padding:6px 8px;">Điểm thành phần</th>
  </tr>
  ${groupRows}
</table>
<p style="margin:18px 0;text-align:center;">
  <a href="${ctaUrl}" style="background:#0b2e59;color:#ffffff;text-decoration:none;padding:11px 26px;border-radius:6px;font-weight:bold;display:inline-block;">Xem báo cáo chi tiết trên hệ thống</a>
</p>
<p style="margin:8px 0;line-height:1.6;font-size:12px;color:#5a6577;">Báo cáo chi tiết gồm điểm từng tiêu chí, ý kiến đóng góp và minh chứng ghi nhận từ các thành viên Hội đồng (ẩn danh).</p>`;
      text = `Kính gửi ${firstName},\n\nKết quả đánh giá công tác đầu mối ${cycleName}: ${scoreText} điểm (thang 100), tổng hợp từ ${submittedCount}/${totalMembers} phiếu.\n\n${groups.map((g) => `- ${g.label}: ${g.votes} phiếu, TB ${g.raw_avg}, trọng số ${g.weight}`).join('\n')}\n\nXem báo cáo chi tiết: ${ctaUrl}`;
    } else {
      const deadlineText = (body.deadline_text as string || '').trim();
      const statusLabel = (body.status_label as string || 'Chưa nộp').trim();
      label = 'submission-reminder';
      subject = `⏰ Nhắc nộp phiếu đánh giá ${cycleName} — 343 Phát triển nhân sự`;
      const today = new Date().toISOString().slice(0, 10);
      idempotencyKey = `reminder-${cycleName}-${profileId}-${today}`;
      const ctaUrl = `${APP_URL}/tu-danh-gia`;
      bodyHtml = `
<p style="margin:8px 0;line-height:1.6;">Chào <strong>${escapeHtml(firstName)}</strong>,</p>
<p style="margin:8px 0;line-height:1.6;">Phiếu tự đánh giá <strong>${escapeHtml(cycleName)}</strong> của bạn đang ở trạng thái
<strong>${escapeHtml(statusLabel)}</strong>${deadlineText ? ` — hạn nộp: <strong>${escapeHtml(deadlineText)}</strong>` : ''}.</p>
<p style="margin:8px 0;line-height:1.6;">Nộp sau hạn sẽ bị trừ điểm KPI nộp biểu mẫu của kỳ. Bạn chỉ cần vài phút để hoàn tất phiếu còn dở:</p>
<p style="margin:18px 0;text-align:center;">
  <a href="${ctaUrl}" style="background:#0b2e59;color:#ffffff;text-decoration:none;padding:11px 26px;border-radius:6px;font-weight:bold;display:inline-block;">Mở phiếu Tự đánh giá</a>
</p>
<p style="margin:8px 0;line-height:1.6;font-size:12px;color:#5a6577;">Nếu bạn đã nộp trong hôm nay, vui lòng bỏ qua email này.</p>`;
      text = `Chào ${firstName},\n\nPhiếu tự đánh giá ${cycleName} của bạn đang ở trạng thái: ${statusLabel}${deadlineText ? ` (hạn nộp: ${deadlineText})` : ''}.\nNộp sau hạn sẽ bị trừ điểm KPI. Hoàn tất phiếu tại: ${ctaUrl}\n\nNếu bạn đã nộp trong hôm nay, vui lòng bỏ qua email này.`;
    }

    // Chống gửi trùng theo idempotency_key (đã pending/sent thì bỏ qua)
    const { data: dup } = await admin
      .from('email_send_log')
      .select('id')
      .eq('template_name', label)
      .eq('recipient_email', recipient)
      .in('status', ['pending', 'sent'])
      .contains('metadata', { idempotency_key: idempotencyKey })
      .limit(1);
    if (dup && dup.length > 0) return json({ success: false, skipped: 'duplicate' });

    const messageId = crypto.randomUUID();

    // Suppression check (fail-closed)
    const { data: suppressed, error: supErr } = await admin
      .from('suppressed_emails')
      .select('id')
      .eq('email', recipient)
      .maybeSingle();
    if (supErr) return json({ error: 'Không kiểm tra được danh sách chặn email' }, 500);
    if (suppressed) {
      await admin.from('email_send_log').insert({
        message_id: messageId, template_name: label, recipient_email: recipient,
        status: 'suppressed', metadata: { idempotency_key: idempotencyKey },
      });
      return json({ success: false, skipped: 'suppressed' });
    }

    // Unsubscribe token: tái dùng token chưa dùng, tạo mới nếu chưa có
    let unsubscribeToken: string | null = null;
    const { data: existingToken } = await admin
      .from('email_unsubscribe_tokens')
      .select('token, used_at')
      .eq('email', recipient)
      .maybeSingle();
    if (existingToken && !existingToken.used_at) {
      unsubscribeToken = existingToken.token;
    } else if (!existingToken) {
      const newToken = generateToken();
      await admin.from('email_unsubscribe_tokens')
        .upsert({ token: newToken, email: recipient }, { onConflict: 'email', ignoreDuplicates: true });
      const { data: stored } = await admin
        .from('email_unsubscribe_tokens')
        .select('token')
        .eq('email', recipient)
        .maybeSingle();
      unsubscribeToken = stored?.token || null;
      if (!unsubscribeToken) return json({ error: 'Không chuẩn bị được unsubscribe token' }, 500);
    } else {
      // Token đã dùng nhưng email chưa vào suppression — an toàn: không gửi
      await admin.from('email_send_log').insert({
        message_id: messageId, template_name: label, recipient_email: recipient,
        status: 'suppressed', error_message: 'Unsubscribe token used but not suppressed',
        metadata: { idempotency_key: idempotencyKey },
      });
      return json({ success: false, skipped: 'suppressed' });
    }

    const html = wrapEmail(
      kind === 'quarterly_letter'
        ? `Thư phát triển cá nhân ${cycleName}`
        : kind === 'council_report'
          ? `Kết quả đánh giá công tác đầu mối ${cycleName}`
          : `Nhắc nộp phiếu đánh giá ${cycleName}`,
      bodyHtml,
    );

    await admin.from('email_send_log').insert({
      message_id: messageId, template_name: label, recipient_email: recipient,
      status: 'pending', metadata: { idempotency_key: idempotencyKey },
    });

    const { error: enqueueError } = await admin.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to: recipient,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: 'transactional',
        label,
        idempotency_key: idempotencyKey,
        unsubscribe_token: unsubscribeToken,
        queued_at: new Date().toISOString(),
      },
    });
    if (enqueueError) {
      await admin.from('email_send_log').insert({
        message_id: messageId, template_name: label, recipient_email: recipient,
        status: 'failed', error_message: 'Failed to enqueue email',
        metadata: { idempotency_key: idempotencyKey },
      });
      return json({ error: 'Không đưa được email vào hàng đợi' }, 500);
    }

    return json({ success: true, message_id: messageId });
  } catch (e) {
    console.error('send-hr-notification error', e);
    return json({ error: e instanceof Error ? e.message : 'Lỗi không xác định' }, 500);
  }
});
