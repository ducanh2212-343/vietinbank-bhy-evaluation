-- admin_email_overview() — dữ liệu cho trang "Quản trị Email" (chỉ admin).
-- Gom 1 lần: nhật ký gửi gần nhất, thống kê 7 ngày, độ sâu hàng đợi/DLQ,
-- trạng thái cron, số email bị chặn (suppressed).
-- SECURITY DEFINER vì email_send_log / pgmq / cron không mở cho client;
-- chặn ngay từ dòng đầu nếu người gọi không phải admin.

create or replace function public.admin_email_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  result jsonb;
begin
  if v_uid is null or not (
    public.has_role(v_uid, 'system_admin'::app_role)
    or public.has_role(v_uid, 'tcth_admin'::app_role)
    or public.has_role(v_uid, 'bgd'::app_role)
  ) then
    raise exception 'Chỉ quản trị viên được xem tổng quan email';
  end if;

  select jsonb_build_object(
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object(
        'template', l.template_name,
        'recipient', l.recipient_email,
        'status', l.status,
        'error', l.error_message,
        'at', l.created_at
      ) order by l.created_at desc)
      from (
        select template_name, recipient_email, status, error_message, created_at
        from public.email_send_log
        order by created_at desc
        limit 30
      ) l
    ), '[]'::jsonb),
    'stats_7d', coalesce((
      select jsonb_agg(jsonb_build_object(
        'day', d.day, 'sent', d.sent, 'failed', d.failed, 'pending', d.pending
      ) order by d.day desc)
      from (
        select date_trunc('day', created_at)::date as day,
               count(*) filter (where status = 'sent') as sent,
               count(*) filter (where status = 'failed') as failed,
               count(*) filter (where status = 'pending') as pending
        from public.email_send_log
        where created_at >= now() - interval '7 days'
        group by 1
      ) d
    ), '[]'::jsonb),
    'queues', coalesce((
      select jsonb_agg(jsonb_build_object(
        'queue', m.queue_name,
        'length', m.queue_length,
        'oldest_sec', m.oldest_msg_age_sec
      ))
      from (
        select q.queue_name, (pgmq.metrics(q.queue_name)).queue_length,
               (pgmq.metrics(q.queue_name)).oldest_msg_age_sec
        from pgmq.list_queues() q
      ) m
    ), '[]'::jsonb),
    'crons', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', j.jobname,
        'schedule', j.schedule,
        'active', j.active,
        'last_status', r.status,
        'last_run', r.start_time
      ))
      from cron.job j
      left join lateral (
        select status, start_time from cron.job_run_details
        where jobid = j.jobid order by start_time desc limit 1
      ) r on true
      where j.jobname in ('process-email-queue', 'send-reminders-daily')
    ), '[]'::jsonb),
    'suppressed', (select count(*) from public.suppressed_emails)
  ) into result;

  return result;
end;
$$;

revoke execute on function public.admin_email_overview() from public;
revoke execute on function public.admin_email_overview() from anon;
grant execute on function public.admin_email_overview() to authenticated;
