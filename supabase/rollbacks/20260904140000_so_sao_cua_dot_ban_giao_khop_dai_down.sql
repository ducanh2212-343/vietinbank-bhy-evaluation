-- GỠ bản vá "số sao của đợt bàn giao phải khớp dải" (20260904140000).
--
-- LƯU Ý: file này chỉ trả HAI HÀM về hành vi cũ. Phần vá dữ liệu (gắn handover_id
-- cho 4 số nhập bù 64, 65, 75, 287) CỐ Ý KHÔNG GỠ — gỡ ra là dựng lại đúng con số
-- lệch mà Phòng TCTH đã báo. Nếu thật sự cần trả về trạng thái cũ:
--   update star_serials set handover_id = null where serial_no in (64, 65, 75, 287);
--
-- Sau khi gỡ, hai lỗi cũ quay lại: (1) handover_stars bỏ qua sao đã tặng có sẵn
-- người giữ nên số của đợt hụt so với dải, và hụt trong im lặng; (2) award_star
-- nhánh backfill không gắn số lấy từ kho vào đợt đang mở.

-- 1. handover_stars: ghi hồi tố trở lại điều kiện `holder_profile_id is null`
create or replace function public.handover_stars(
  p_holder_profile_id uuid, p_from integer, p_to integer,
  p_quarter text default null, p_note text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_ten_holder text;
  v_bad text;
  v_moi integer := 0;
  v_hoi_to integer := 0;
  v_bo_qua integer := 0;
  v_da_giu integer := 0;
  v_ds_bo_qua text;
begin
  if not (has_role(auth.uid(),'tcth_admin'::app_role) or has_role(auth.uid(),'system_admin'::app_role)) then
    raise exception 'Chỉ Phòng TCTH được bàn giao sao';
  end if;
  if p_from is null or p_to is null or p_from < 1 or p_to < p_from or p_to - p_from >= 500 then
    raise exception 'Dải số bàn giao không hợp lệ (tối đa 500 số một lần)';
  end if;

  select full_name into v_ten_holder from profiles where id = p_holder_profile_id;
  if not found then
    raise exception 'Không tìm thấy hồ sơ lãnh đạo nhận bàn giao';
  end if;

  select string_agg(s::text, ', ' order by s) into v_bad
  from generate_series(p_from, p_to) s
  where not exists (select 1 from star_serials ss where ss.serial_no = s);
  if v_bad is not null then
    raise exception 'Các số chưa được khai báo lô in: %. Hãy khai báo lô trước khi bàn giao.', v_bad;
  end if;

  select string_agg(ss.serial_no::text || ' (' || coalesce(p.full_name,'?') || ')', ', ' order by ss.serial_no)
    into v_bad
  from star_serials ss left join profiles p on p.id = ss.holder_profile_id
  where ss.serial_no between p_from and p_to
    and ss.status = 'handed_over'
    and ss.holder_profile_id is distinct from p_holder_profile_id;
  if v_bad is not null then
    raise exception 'Các số đang do lãnh đạo khác giữ, phải thu hồi trước: %', v_bad;
  end if;

  select string_agg(ss.serial_no::text, ', ' order by ss.serial_no) into v_bad
  from star_serials ss
  where ss.serial_no between p_from and p_to and ss.status = 'void';
  if v_bad is not null then
    raise exception 'Các số đã hủy (sao hỏng): %. Chọn dải khác hoặc bỏ các số này.', v_bad;
  end if;

  insert into star_handovers (holder_profile_id, serial_from, serial_to, quarter, handed_at, note, created_by)
  values (p_holder_profile_id, p_from, p_to, p_quarter, current_date, p_note, auth.uid())
  returning id into v_id;

  update star_serials
     set status = 'handed_over', holder_profile_id = p_holder_profile_id, handover_id = v_id
   where serial_no between p_from and p_to and status = 'in_stock';
  get diagnostics v_moi = row_count;

  update star_serials ss
     set holder_profile_id = p_holder_profile_id, handover_id = v_id
   where ss.serial_no between p_from and p_to
     and ss.status = 'awarded'
     and ss.holder_profile_id is null
     and exists (
       select 1 from star_records r
       where r.id = ss.record_id
         and bhy_chuan_hoa_ten(coalesce(r.sender,'')) = bhy_chuan_hoa_ten(v_ten_holder)
     );
  get diagnostics v_hoi_to = row_count;

  select count(*), string_agg(ss.serial_no::text, ', ' order by ss.serial_no)
    into v_bo_qua, v_ds_bo_qua
  from star_serials ss
  where ss.serial_no between p_from and p_to
    and ss.status = 'awarded'
    and ss.holder_profile_id is distinct from p_holder_profile_id;

  select count(*) into v_da_giu
  from star_serials ss
  where ss.serial_no between p_from and p_to
    and ss.status = 'handed_over'
    and ss.holder_profile_id = p_holder_profile_id
    and ss.handover_id is distinct from v_id;

  if v_moi = 0 and v_hoi_to = 0 then
    delete from star_handovers where id = v_id;
    raise exception 'Dải %–% không có số nào bàn giao được cho %: % số đã tặng bởi người khác (%). Sao đã trao thì không chuyển sang người khác được — chọn dải còn tồn kho.',
      p_from, p_to, v_ten_holder, v_bo_qua, coalesce(v_ds_bo_qua, '—');
  end if;

  return jsonb_build_object(
    'handover_id', v_id, 'count', v_moi, 'moi', v_moi, 'hoi_to', v_hoi_to,
    'bo_qua', v_bo_qua, 'da_giu', v_da_giu, 'ds_bo_qua', v_ds_bo_qua
  );
end $$;

revoke all on function public.handover_stars(uuid,integer,integer,text,text) from anon, public;
grant execute on function public.handover_stars(uuid,integer,integer,text,text) to authenticated;

-- 2. award_star: nhánh backfill trở lại bản 20260904130000 (không gắn handover_id).
--    Chạy lại nguyên file 20260904130000_nhap_bu_sao_da_trao.sql là đủ:
--      \i supabase/migrations/20260904130000_nhap_bu_sao_da_trao.sql
