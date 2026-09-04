-- Ý kiến Phòng TCTH 04/09/2026 — ba tập thể chưa có chỗ trong chương trình Sao:
--   1. Ban Giám đốc: các PGĐ nhận sao cá nhân nhưng phiếu bị xếp vào Phòng KHDN
--      (cả 3 PGĐ, 4 phiếu) vì chương trình Sao không có nhánh Ban Giám đốc.
--   2. Tổ FDI thuộc Phòng KHDN: cần ghi nhận cho cán bộ của tổ.
--   3. Tổ truyền thông: tập thể nhỏ LIÊN PHÒNG.
--
-- Cách làm: danh mục "tập thể nhỏ" (star_sub_units) do TCTH tự quản ở khu Quản lý
-- Sao — không hardcode, đúng bài học đợt đổi tên Phòng Yên Mỹ. Phiếu cá nhân gắn
-- thêm sub_unit khi cán bộ thuộc một tổ; phiếu tập thể cho tổ ghi department = tên
-- tổ (như 2 phiếu Tổ FDI đang có) nên dữ liệu cũ không phải sửa.

-- 1. Danh mục tập thể nhỏ
create table public.star_sub_units (
  id uuid primary key default gen_random_uuid(),
  nhan text not null unique,
  -- nhãn phòng cha trong chương trình Sao (VD 'Phòng KHDN'); null = liên phòng
  phong_cha text,
  mo_ta text,
  dang_dung boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.star_sub_units enable row level security;
revoke all on table public.star_sub_units from anon, public;

create policy "Staff can view star sub units" on public.star_sub_units
  for select to authenticated using (public.is_staff(auth.uid()));
create policy "Admins can manage star sub units" on public.star_sub_units
  for all to authenticated
  using (public.has_role(auth.uid(),'system_admin'::app_role) or public.has_role(auth.uid(),'tcth_admin'::app_role))
  with check (public.has_role(auth.uid(),'system_admin'::app_role) or public.has_role(auth.uid(),'tcth_admin'::app_role));

insert into public.star_sub_units (nhan, phong_cha, mo_ta) values
  ('Tổ FDI', 'Phòng KHDN', 'Tổ khách hàng FDI thuộc Phòng KHDN'),
  ('Tổ truyền thông', null, 'Tập thể liên phòng — hạt nhân văn hóa và tổ truyền thông')
on conflict (nhan) do nothing;

-- Hai bảng sổ sao đợt 29/08 mới chỉ dựa vào RLS (policy chỉ cấp cho authenticated);
-- thu hồi anon cho đúng quy ước repo.
revoke all on table public.star_serials from anon, public;
revoke all on table public.star_handovers from anon, public;

-- 2. Phiếu gắn tổ
alter table public.star_records add column sub_unit text;
update public.star_records set sub_unit = 'Tổ FDI'
 where department = 'Tổ FDI' and sub_unit is null;

-- 3. award_star nhận p_sub_unit. Phải DROP: thêm tham số là đổi chữ ký, để hai
--    bản chồng nhau thì PostgREST không chọn được hàm khi client gọi.
drop function public.award_star(text,integer[],boolean,uuid,text,text,text,text,date,uuid,text);

create function public.award_star(
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
  elsif p_entry_mode = 'proxy' then
    if not v_is_admin then
      raise exception 'Chỉ Phòng TCTH được nhập hộ lãnh đạo';
    end if;
    if p_holder_profile_id is null then
      raise exception 'Chưa chọn lãnh đạo được nhập hộ';
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
  if btrim(coalesce(p_result,'')) = '' then
    raise exception 'Thiếu vế "đem lại [kết quả cụ thể]"';
  end if;

  -- Tổ / tập thể nhỏ phải có trong danh mục và đang dùng — chặn gõ tay tên tổ lạ
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
    (v_name, v_dept, v_n, btrim(p_reason), btrim(p_result),
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
    raise exception 'Số serial không dùng được: %. Số đã tặng rồi, chưa khai báo lô, hoặc không thuộc số sao người tặng đang giữ.', v_bad;
  end if;

  return v_record_id;
end $$;

revoke all on function public.award_star(text,integer[],boolean,uuid,text,text,text,text,date,uuid,text,text) from anon, public;
grant execute on function public.award_star(text,integer[],boolean,uuid,text,text,text,text,date,uuid,text,text) to authenticated;

-- 4. Phiếu cá nhân của thành viên Ban Giám đốc về đúng tập thể. Trước đó cả 3 PGĐ
--    bị xếp vào Phòng KHDN (kể cả PGĐ phụ trách DVKH) vì form Lark cũ chỉ có ô phòng.
update public.star_records r
   set department = 'Ban Giám đốc'
 where not r.is_collective
   and r.department <> 'Ban Giám đốc'
   and exists (
     select 1 from public.profiles p
     join public.departments d on d.id = p.department_id
     where d.name = 'Ban Giám đốc' and p.status = 'active'
       and lower(p.full_name) = lower(r.name)
   );
