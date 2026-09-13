-- Sự cố 03/09/2026 + tính năng bàn giao giữa kỳ.
--
-- SỰ CỐ: 03/09 lúc 08:54 có người nhập đè Excel trên PRODUCTION (bản đang chạy
-- chưa có starImportLock vì PR chưa merge). Đường replaceAll xóa sạch star_records
-- rồi ghi lại → khóa ngoại `record_id` của star_serials có `on delete set null`,
-- nên toàn bộ 168 số đang "awarded" mất liên kết phiếu, chỉ còn trạng thái treo.
-- Không mất sao: cột `serial` trên phiếu vẫn còn, nối lại được bằng chính chuỗi đó
-- (giống migration seed 29/08). Đây là lần nhập đè thứ BA — 21/08, 28/08 và 03/09.
--
-- BÀN GIAO GIỮA KỲ: sổ sao ra đời khi 168 sao đã phát từ trước, nên dải số TCTH
-- thực tế đã đưa cho một lãnh đạo luôn lẫn cả số đã tặng. Bản đầu chặn cứng cả dải
-- → TCTH phải tự dò từng đoạn trống, rất nặng. Nay handover_stars nhận cả dải và
-- TỰ PHÂN LOẠI từng số (xem phần 2).
--
-- GHI CHÚ: trên project thật, file này được áp làm 3 bước ngày 04/09 —
-- `noi_lai_so_sao_sau_nhap_de_va_ban_giao_giua_ky`, rồi
-- `hoi_to_ban_giao_khop_ten_bo_dau` (khớp tên phải bỏ dấu: phiếu ghi "Thuý",
-- danh bạ ghi "Thúy"), rồi `sua_thong_bao_ban_giao_thua_ky_tu` (RAISE dùng '%'
-- chứ không phải '%s'). Nội dung dưới đây là BẢN CUỐI, chạy lại từ đầu ra đúng
-- trạng thái production.

-- ===========================================================================
-- 1. NỐI LẠI SỔ SAO VỚI PHIẾU
-- ===========================================================================

-- Mỗi số lấy phiếu SỚM NHẤT dùng nó (serial 62 và 90 đang bị hai phiếu cùng dùng
-- — ca trùng thật, chờ chi nhánh tra sao vật lý; gắn phiếu sớm hơn cho có căn cứ).
WITH tok AS (
  SELECT r.id AS record_id, r.awarded_on, (m[1])::int AS so
  FROM public.star_records r,
       LATERAL (SELECT regexp_matches(coalesce(r.serial, ''), '([0-9]+)', 'g') AS m) x
), chon AS (
  SELECT DISTINCT ON (so) so, record_id
  FROM tok ORDER BY so, awarded_on, record_id
)
UPDATE public.star_serials ss
   SET status = 'awarded', record_id = c.record_id
  FROM chon c
 WHERE ss.serial_no = c.so
   -- Không đụng số đang nằm tay lãnh đạo: nếu có phiếu dùng số đó thì là lỗi khác,
   -- phải xem bằng mắt chứ không sửa mù.
   AND ss.status <> 'handed_over';

-- ===========================================================================
-- 2. BÀN GIAO GIỮA KỲ — handover_stars tự phân loại từng số trong dải
-- ===========================================================================
--
-- Bốn nhóm:
--   in_stock                      → bàn giao bình thường (handed_over)
--   awarded, người tặng LÀ người nhận bàn giao → ghi hồi tố: giữ nguyên 'awarded',
--                                   chỉ gắn holder + handover_id để biết số này ra
--                                   từ túi ai (thống kê theo quý mới đúng, và khi gỡ
--                                   phiếu số quay về đúng người)
--   awarded, người tặng KHÁC      → BỎ QUA, không gán bừa. Gán nhầm là ghi sao của
--                                   Giám đốc thành sao của Trưởng phòng.
--   handed_over người khác đang giữ → CHẶN cả lệnh: đây là xung đột thật.
--
-- Khớp người tặng theo họ tên (cột sender là chuỗi từ form Lark cũ, chưa có
-- sender_profile_id với phiếu nhập). So khớp bỏ hoa/thường và khoảng trắng thừa.
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

  -- Xung đột thật: số đang nằm tay lãnh đạo KHÁC (chưa tặng)
  select string_agg(ss.serial_no::text || ' (' || coalesce(p.full_name,'?') || ')', ', ' order by ss.serial_no)
    into v_bad
  from star_serials ss left join profiles p on p.id = ss.holder_profile_id
  where ss.serial_no between p_from and p_to
    and ss.status = 'handed_over'
    and ss.holder_profile_id is distinct from p_holder_profile_id;
  if v_bad is not null then
    raise exception 'Các số đang do lãnh đạo khác giữ, phải thu hồi trước: %', v_bad;
  end if;

  -- Số đã hủy thì không bàn giao được
  select string_agg(ss.serial_no::text, ', ' order by ss.serial_no) into v_bad
  from star_serials ss
  where ss.serial_no between p_from and p_to and ss.status = 'void';
  if v_bad is not null then
    raise exception 'Các số đã hủy (sao hỏng): %. Chọn dải khác hoặc bỏ các số này.', v_bad;
  end if;

  insert into star_handovers (holder_profile_id, serial_from, serial_to, quarter, handed_at, note, created_by)
  values (p_holder_profile_id, p_from, p_to, p_quarter, current_date, p_note, auth.uid())
  returning id into v_id;

  -- a) Số còn trong kho → bàn giao
  update star_serials
     set status = 'handed_over', holder_profile_id = p_holder_profile_id, handover_id = v_id
   where serial_no between p_from and p_to and status = 'in_stock';
  get diagnostics v_moi = row_count;

  -- b) Số đã tặng BỞI CHÍNH lãnh đạo này → ghi hồi tố nguồn gốc, giữ 'awarded'
  update star_serials ss
     set holder_profile_id = p_holder_profile_id, handover_id = v_id
   where ss.serial_no between p_from and p_to
     and ss.status = 'awarded'
     and ss.holder_profile_id is null
     and exists (
       select 1 from star_records r
       where r.id = ss.record_id
         -- Khớp tên phải BỎ DẤU: phiếu ghi "Dương Thị Thanh Thuý", danh bạ ghi
         -- "Dương Thị Thanh Thúy" — so thẳng chuỗi bỏ sót 16 sao của chị. Dùng lại
         -- bhy_chuan_hoa_ten đã có từ đợt BHY Ideas, không đẻ hàm chuẩn hóa thứ hai.
         and bhy_chuan_hoa_ten(coalesce(r.sender,'')) = bhy_chuan_hoa_ten(v_ten_holder)
     );
  get diagnostics v_hoi_to = row_count;

  -- c) Số đã tặng bởi người khác (hoặc không rõ người tặng) → bỏ qua, báo lại
  select count(*), string_agg(ss.serial_no::text, ', ' order by ss.serial_no)
    into v_bo_qua, v_ds_bo_qua
  from star_serials ss
  where ss.serial_no between p_from and p_to
    and ss.status = 'awarded'
    and ss.holder_profile_id is distinct from p_holder_profile_id;

  -- d) Số vốn đã do chính người này giữ từ đợt trước
  select count(*) into v_da_giu
  from star_serials ss
  where ss.serial_no between p_from and p_to
    and ss.status = 'handed_over'
    and ss.holder_profile_id = p_holder_profile_id
    and ss.handover_id is distinct from v_id;

  -- Cả dải không đóng góp gì thì đừng để lại đợt bàn giao rỗng
  if v_moi = 0 and v_hoi_to = 0 then
    delete from star_handovers where id = v_id;
    -- RAISE của plpgsql chỉ dùng '%'; viết '%s' làm chữ 's' rơi vào cuối câu.
    raise exception 'Dải %–% không có số nào bàn giao được cho %: % số đã tặng bởi người khác (%). Sao đã trao thì không chuyển sang người khác được — chọn dải còn tồn kho.',
      p_from, p_to, v_ten_holder, v_bo_qua, coalesce(v_ds_bo_qua, '—');
  end if;

  return jsonb_build_object(
    'handover_id', v_id,
    'count', v_moi,
    'moi', v_moi,
    'hoi_to', v_hoi_to,
    'bo_qua', v_bo_qua,
    'da_giu', v_da_giu,
    'ds_bo_qua', v_ds_bo_qua
  );
end $$;

revoke all on function public.handover_stars(uuid,integer,integer,text,text) from anon, public;
grant execute on function public.handover_stars(uuid,integer,integer,text,text) to authenticated;

-- revoke_handover: số ghi hồi tố (đã tặng) chỉ gỡ dấu nguồn gốc, KHÔNG trả về kho —
-- sao đã trao rồi thì không rút lại được.
create or replace function public.revoke_handover(p_handover_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_returned integer;
  v_go_dau_vet integer;
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

  update star_serials
     set holder_profile_id = null, handover_id = null
   where handover_id = p_handover_id and status = 'awarded';
  get diagnostics v_go_dau_vet = row_count;

  return jsonb_build_object('returned', v_returned, 'go_dau_vet', v_go_dau_vet);
end $$;

revoke all on function public.revoke_handover(uuid) from anon, public;
grant execute on function public.revoke_handover(uuid) to authenticated;
