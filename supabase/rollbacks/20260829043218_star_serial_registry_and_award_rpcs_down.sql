-- Gỡ toàn bộ hạ tầng sổ sao + RPC tặng sao. CHÚ Ý: xóa bảng star_serials /
-- star_handovers là mất trạng thái tồn kho, bàn giao và liên kết số↔phiếu —
-- chỉ dùng khi rút cả tính năng. Phiếu trong star_records không bị đụng
-- (các cột mới bị gỡ, dữ liệu cột đó mất theo).

drop function if exists public.revoke_star_record(uuid);
drop function if exists public.award_star(text,integer[],boolean,uuid,text,text,text,text,date,uuid,text);
drop function if exists public.revoke_handover(uuid);
drop function if exists public.handover_stars(uuid,integer,integer,text,text);
drop function if exists public.declare_star_batch(integer,integer,text);

-- Khôi phục policy INSERT cũ (nguyên văn trước khi migration gỡ nó)
create policy "Staff can submit form star records" on public.star_records
  for insert to authenticated
  with check (
    is_staff(auth.uid()) and (source = 'form'::text)
    and (created_by = auth.uid()) and (stars <= (3)::numeric)
  );

alter table public.star_records
  drop column if exists sender_profile_id,
  drop column if exists recipient_profile_id,
  drop column if exists entry_mode,
  drop column if exists program_name;

drop table if exists public.star_serials;
drop table if exists public.star_handovers;
drop function if exists public.touch_updated_at();
