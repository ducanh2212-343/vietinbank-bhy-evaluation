-- NHẬP BÙ SAO ĐÃ TRAO — chế độ thứ tư của award_star (04/09/2026).
--
-- VÌ SAO CẦN: đường nhập Excel vừa dừng hẳn, nhưng chi nhánh vẫn đang phát sao
-- thật ngoài đời và một số phiếu chưa kịp vào cổng — đối chiếu tin Zalo (Lark đẩy
-- ra nhóm chi nhánh) ngày 04/09 thấy 6 phiếu đã trao mà cổng chưa có. Không có
-- đường nhập bù thì giai đoạn chuyển đổi sẽ MẤT SAO của cán bộ.
--
-- KHÁC ba chế độ cũ ở hai điểm:
--   1. Số serial nhận cả 'in_stock' LẪN 'handed_over' — sao đã trao rồi, có thể
--      lãnh đạo lấy từ dải đã bàn giao (như serial 241, 250 của anh Thái Hoàng)
--      hoặc từ sao chưa kịp ghi bàn giao (như 64, 65, 75, 287).
--   2. Người tặng do TCTH chọn, không suy từ tài khoản đăng nhập.
--
-- VẾ "ĐEM LẠI": form Lark cũ KHÔNG có trường này, nên phiếu nhập bù từ Zalo không
-- thể có. Nới thành không bắt buộc cho 'proxy' và 'backfill' — hai chế độ TCTH ghi
-- lại lịch sử. Chế độ 'self' (lãnh đạo tự ghi sao mới) VẪN bắt buộc đủ ba vế theo
-- văn bản mục 3: người đang trao thì phải nói được kết quả đem lại.

create or replace function public.award_star(
  p_entry_mode text,
  p_serials integer[],
  p_is_collective boolean,
  p_recipient_profile_id uuid default null,
  p_recipient_name text default null,
  p_department text default null,
  p_reason text default '',
  p_result text default '',
  p_awarded_on date default current_date,
  p_holder_profile_id uuid default null,
  p_program_name text default null,
  p_sub_unit text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_is_leader boolean;
  v_holder uuid;
  v_sender text;
  v_sender_profile uuid;
  v_name text;
  v_dept text;
  v_sub_unit text;
  v_n integer;
  v_claimed integer;
  v_bad text;
  v_record_id uuid;
begin
  if v_uid is null then
    raise exception 'Chưa đăng nhập';
  end if;
  v_is_admin := has_role(v_uid,'tcth_admin'::app_role) or has_role(v_uid,'system_admin'::app_role);
  v_is_leader := v_is_admin or has_role(v_uid,'manager'::app_role)
                 or has_role(v_uid,'pgd'::app_role) or has_role(v_uid,'bgd'::app_role);

  v_n := coalesce(array_length(p_serials, 1), 0);
  if v_n < 1 or v_n > 3 then
    raise exception 'Mỗi phiếu ghi nhận từ 1 đến 3 sao (mỗi sao một số serial)';
  end if;
  if (select count(distinct s) from unnest(p_serials) s) <> v_n then
    raise exception 'Danh sách số serial có số bị lặp';
  end if;

  if p_entry_mode = 'self' then
    if not v_is_leader then
      raise exception 'Chỉ Trưởng phòng / Ban Giám đốc được ghi nhận Sao';
    end if;
    v_holder := get_my_profile_id();
    if v_holder is null then
      raise exception 'Tài khoản chưa gắn hồ sơ cán bộ';
    end if;
  elsif p_entry_mode in ('proxy', 'backfill') then
    if not v_is_admin then
      raise exception 'Chỉ Phòng TCTH được nhập hộ / nhập bù sao';
    end if;
    if p_holder_profile_id is null then
      raise exception 'Chưa chọn người tặng Sao';
    end if;
    v_holder := p_holder_profile_id;
  elsif p_entry_mode = 'program' then
    if not v_is_admin then
      raise exception 'Chỉ Phòng TCTH được ghi Sao chương trình động lực';
    end if;
    if coalesce(btrim(p_program_name), '') = '' then
      raise exception 'Thiếu tên chương trình động lực';
    end if;
    v_holder := null;
  else
    raise exception 'Chế độ ghi nhận không hợp lệ';
  end if;

  if p_entry_mode = 'program' then
    v_sender := btrim(p_program_name);
    v_sender_profile := null;
  else
    select full_name into v_sender from profiles where id = v_holder;
    if not found then
      raise exception 'Không tìm thấy hồ sơ người tặng';
    end if;
    v_sender_profile := v_holder;
  end if;

  if p_recipient_profile_id is not null then
    select p.full_name, d.name into v_name, v_dept
    from profiles p left join departments d on d.id = p.department_id
    where p.id = p_recipient_profile_id;
    if not found then
      raise exception 'Không tìm thấy hồ sơ người nhận';
    end if;
    v_dept := coalesce(nullif(btrim(coalesce(p_department,'')),''), v_dept, '');
  else
    v_name := btrim(coalesce(p_recipient_name, ''));
    v_dept := btrim(coalesce(p_department, ''));
  end if;
  if v_name = '' then raise exception 'Thiếu tên người/tập thể nhận Sao'; end if;
  if v_dept = '' then raise exception 'Thiếu phòng ban của người/tập thể nhận Sao'; end if;
  if btrim(coalesce(p_reason,'')) = '' then
    raise exception 'Thiếu vế "vì đã [hành vi cụ thể]"';
  end if;
  -- Chỉ lãnh đạo tự ghi mới bắt buộc đủ ba vế; TCTH ghi lại lịch sử từ Lark thì
  -- không có vế "đem lại" để mà điền.
  if p_entry_mode = 'self' and btrim(coalesce(p_result,'')) = '' then
    raise exception 'Thiếu vế "đem lại [kết quả cụ thể]"';
  end if;

  if p_awarded_on > current_date then
    raise exception 'Ngày trao Sao không thể ở tương lai';
  end if;

  v_sub_unit := nullif(btrim(coalesce(p_sub_unit, '')), '');
  if v_sub_unit is not null and not exists (
    select 1 from star_sub_units su where su.nhan = v_sub_unit and su.dang_dung
  ) then
    raise exception 'Tổ / tập thể nhỏ «%» không có trong danh mục hoặc đã ngừng dùng', v_sub_unit;
  end if;

  insert into star_records
    (name, department, stars, reason, result, awarded_on, sender, serial,
     is_collective, source, created_by, sender_profile_id, recipient_profile_id,
     entry_mode, program_name, sub_unit)
  values
    (v_name, v_dept, v_n, btrim(p_reason), nullif(btrim(coalesce(p_result,'')), ''),
     coalesce(p_awarded_on, current_date), v_sender,
     (select string_agg(s::text, ', ' order by s) from unnest(p_serials) s),
     coalesce(p_is_collective, false), 'form', v_uid, v_sender_profile,
     p_recipient_profile_id, p_entry_mode,
     case when p_entry_mode = 'program' then btrim(p_program_name) end,
     v_sub_unit)
  returning id into v_record_id;

  if p_entry_mode = 'program' then
    update star_serials set status = 'awarded', record_id = v_record_id
     where serial_no = any(p_serials) and status = 'in_stock';
  elsif p_entry_mode = 'backfill' then
    -- Sao đã trao ngoài đời: nhận cả số còn trong kho lẫn số đang ở tay lãnh đạo,
    -- và ghi luôn người giữ để biết sao ra từ túi ai.
    update star_serials
       set status = 'awarded', record_id = v_record_id, holder_profile_id = v_holder
     where serial_no = any(p_serials) and status in ('in_stock', 'handed_over');
  else
    update star_serials set status = 'awarded', record_id = v_record_id
     where serial_no = any(p_serials) and status = 'handed_over'
       and holder_profile_id = v_holder;
  end if;
  get diagnostics v_claimed = row_count;

  if v_claimed <> v_n then
    select string_agg(s::text, ', ' order by s) into v_bad
    from unnest(p_serials) s
    where not exists (
      select 1 from star_serials ss
      where ss.serial_no = s and ss.record_id = v_record_id
    );
    if p_entry_mode = 'backfill' then
      raise exception 'Số serial không dùng được: %. Số đã gắn phiếu khác, đã hủy, hoặc chưa khai báo lô in.', v_bad;
    end if;
    raise exception 'Số serial không dùng được: %. Số đã tặng rồi, chưa khai báo lô, hoặc không thuộc số sao người tặng đang giữ.', v_bad;
  end if;

  return v_record_id;
end $$;

revoke all on function public.award_star(text,integer[],boolean,uuid,text,text,text,text,date,uuid,text,text) from anon, public;
grant execute on function public.award_star(text,integer[],boolean,uuid,text,text,text,text,date,uuid,text,text) to authenticated;

alter table public.star_records drop constraint if exists star_records_entry_mode_check;
alter table public.star_records add constraint star_records_entry_mode_check
  check (entry_mode is null or entry_mode in ('self','proxy','program','backfill'));
