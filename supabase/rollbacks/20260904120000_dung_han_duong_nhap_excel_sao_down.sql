-- Mở lại đường ghi thẳng vào star_records (khôi phục quyền quản trị như trước 04/09).
-- CẢNH BÁO: mở lại là mở lại đúng đường đã ba lần phá dữ liệu (21/08, 28/08, 03/09) —
-- replaceAll xóa sạch bảng rồi ghi lại, làm đứt liên kết sổ sao và xóa các bản sửa.
create policy "Admins can manage star records" on public.star_records
  for all to authenticated
  using (public.has_role(auth.uid(),'system_admin'::app_role) or public.has_role(auth.uid(),'tcth_admin'::app_role))
  with check (public.has_role(auth.uid(),'system_admin'::app_role) or public.has_role(auth.uid(),'tcth_admin'::app_role));

-- revoke_star_record trở lại bản chỉ gỡ được phiếu ghi trên cổng
create or replace function public.revoke_star_record(p_record_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_returned integer;
begin
  if not (has_role(auth.uid(),'tcth_admin'::app_role) or has_role(auth.uid(),'system_admin'::app_role)) then
    raise exception 'Chỉ Phòng TCTH được gỡ phiếu Sao';
  end if;
  if not exists (select 1 from star_records where id = p_record_id and source = 'form') then
    raise exception 'Chỉ gỡ được phiếu ghi nhận trên cổng (source=form)';
  end if;

  update star_serials
     set status = case when holder_profile_id is not null then 'handed_over' else 'in_stock' end,
         record_id = null
   where record_id = p_record_id and status = 'awarded';
  get diagnostics v_returned = row_count;

  delete from star_records where id = p_record_id;

  return jsonb_build_object('serials_returned', v_returned);
end $$;

revoke all on function public.revoke_star_record(uuid) from anon, public;
grant execute on function public.revoke_star_record(uuid) to authenticated;
