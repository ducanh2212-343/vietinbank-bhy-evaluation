-- DỪNG HẲN đường tự cập nhật sao bằng Excel của Phòng TCTH (quyết định 04/09/2026).
-- Từ nay mọi phiếu Sao chỉ vào bằng màn Ghi nhận Sao trên cổng.
--
-- VÌ SAO PHẢI CHẶN Ở TẦNG CSDL, KHÔNG CHỈ Ở GIAO DIỆN: khóa phía giao diện
-- (starImportLock) nằm trên nhánh chưa merge, nên production vẫn chạy bản cũ và
-- vẫn xóa sạch bảng rồi ghi lại được — đã xảy ra BA lần (21/08, 28/08, 03/09),
-- lần nào cũng làm đứt liên kết sổ sao ↔ phiếu và xóa cả các bản sửa dữ liệu
-- (tên phòng PGD Ocean City bị trả về "Phòng Yên Mỹ" sau lần 03/09). Chặn ở
-- policy thì bản cũ hay bản mới, ai bấm nút nào cũng không ghi thẳng được nữa.
--
-- Cách chặn: bỏ policy ALL của quản trị, chỉ còn quyền ĐỌC. Mọi thao tác ghi đi
-- qua RPC security definer (award_star, revoke_star_record, doi_soat_so_sao) —
-- các hàm này tự kiểm quyền bằng has_role nên không nới lỏng gì.

drop policy if exists "Admins can manage star records" on public.star_records;

-- Quyền đọc giữ nguyên: mọi cán bộ vẫn xem được bảng tổng hợp.
-- (policy "Staff can view star records" đã có từ trước, không đụng)

-- Gỡ phiếu: trước chỉ cho phiếu ghi trên cổng (source='form'). Nay đường Excel
-- đã dừng nên TCTH cần sửa được cả phiếu nhập cũ — vẫn qua RPC để số serial
-- luôn quay về đúng nơi giữ, không bao giờ mồ côi.
create or replace function public.revoke_star_record(p_record_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_returned integer;
  v_ten text;
begin
  if not (has_role(auth.uid(),'tcth_admin'::app_role) or has_role(auth.uid(),'system_admin'::app_role)) then
    raise exception 'Chỉ Phòng TCTH được gỡ phiếu Sao';
  end if;

  select name into v_ten from star_records where id = p_record_id;
  if not found then
    raise exception 'Không tìm thấy phiếu cần gỡ';
  end if;

  -- Số serial của phiếu quay về nơi đang giữ (nếu đã bàn giao) hoặc về kho
  update star_serials
     set status = case when holder_profile_id is not null then 'handed_over' else 'in_stock' end,
         record_id = null
   where record_id = p_record_id and status = 'awarded';
  get diagnostics v_returned = row_count;

  delete from star_records where id = p_record_id;

  return jsonb_build_object('serials_returned', v_returned, 'ten', v_ten);
end $$;

revoke all on function public.revoke_star_record(uuid) from anon, public;
grant execute on function public.revoke_star_record(uuid) to authenticated;
