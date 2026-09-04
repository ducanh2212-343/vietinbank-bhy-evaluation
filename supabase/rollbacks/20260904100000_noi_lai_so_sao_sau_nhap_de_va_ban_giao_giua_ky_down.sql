-- Gỡ đợt "nối lại sổ sao + bàn giao giữa kỳ" (04/09/2026).
--
-- KHÔNG gỡ phần nối lại record_id: đó là SỬA DỮ LIỆU HỎNG do lần nhập đè 03/09,
-- trả về trạng thái đứt liên kết là làm hỏng lại. Chỉ đưa hai hàm về bản cũ.
--
-- Lưu ý: bản cũ của handover_stars CHẶN cả dải nếu có bất kỳ số nào không còn
-- tồn kho — sau khi gỡ, các số đã ghi hồi tố (status='awarded' mà có
-- holder_profile_id) sẽ không còn ý nghĩa với hàm; gỡ dấu vết đó về null.

update public.star_serials
   set holder_profile_id = null, handover_id = null
 where status = 'awarded' and holder_profile_id is not null;

create or replace function public.handover_stars(
  p_holder_profile_id uuid, p_from integer, p_to integer,
  p_quarter text default null, p_note text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_count integer;
  v_bad text;
begin
  if not (has_role(auth.uid(),'tcth_admin'::app_role) or has_role(auth.uid(),'system_admin'::app_role)) then
    raise exception 'Chỉ Phòng TCTH được bàn giao sao';
  end if;
  if p_from is null or p_to is null or p_from < 1 or p_to < p_from or p_to - p_from >= 500 then
    raise exception 'Dải số bàn giao không hợp lệ (tối đa 500 số một lần)';
  end if;
  if not exists (select 1 from profiles where id = p_holder_profile_id) then
    raise exception 'Không tìm thấy hồ sơ lãnh đạo nhận bàn giao';
  end if;

  select string_agg(s::text, ', ' order by s) into v_bad
  from generate_series(p_from, p_to) s
  where not exists (select 1 from star_serials ss where ss.serial_no = s);
  if v_bad is not null then
    raise exception 'Các số chưa được khai báo lô in: %. Hãy khai báo lô trước khi bàn giao.', v_bad;
  end if;

  select string_agg(ss.serial_no::text, ', ' order by ss.serial_no) into v_bad
  from star_serials ss
  where ss.serial_no between p_from and p_to and ss.status <> 'in_stock';
  if v_bad is not null then
    raise exception 'Các số không còn trong kho (đã bàn giao/đã tặng/đã hủy): %', v_bad;
  end if;

  insert into star_handovers (holder_profile_id, serial_from, serial_to, quarter, handed_at, note, created_by)
  values (p_holder_profile_id, p_from, p_to, p_quarter, current_date, p_note, auth.uid())
  returning id into v_id;

  update star_serials
     set status = 'handed_over', holder_profile_id = p_holder_profile_id, handover_id = v_id
   where serial_no between p_from and p_to and status = 'in_stock';
  get diagnostics v_count = row_count;

  return jsonb_build_object('handover_id', v_id, 'count', v_count);
end $$;

revoke all on function public.handover_stars(uuid,integer,integer,text,text) from anon, public;
grant execute on function public.handover_stars(uuid,integer,integer,text,text) to authenticated;

create or replace function public.revoke_handover(p_handover_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_returned integer;
begin
  if not (has_role(auth.uid(),'tcth_admin'::app_role) or has_role(auth.uid(),'system_admin'::app_role)) then
    raise exception 'Chỉ Phòng TCTH được thu hồi bàn giao';
  end if;

  update star_handovers set revoked_at = now()
   where id = p_handover_id and revoked_at is null;
  if not found then
    raise exception 'Không tìm thấy đợt bàn giao (hoặc đã thu hồi trước đó)';
  end if;

  update star_serials
     set status = 'in_stock', holder_profile_id = null, handover_id = null
   where handover_id = p_handover_id and status = 'handed_over';
  get diagnostics v_returned = row_count;

  return jsonb_build_object('returned', v_returned);
end $$;

revoke all on function public.revoke_handover(uuid) from anon, public;
grant execute on function public.revoke_handover(uuid) to authenticated;
