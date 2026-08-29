-- ============================================================================
-- SỔ SAO VẬT LÝ + BÀN GIAO + TẶNG SAO CÓ KIỂM SOÁT
--
-- Nguyên tắc chi nhánh (đã chốt 08/2026): sao được ghi nhận theo SỐ SERIAL.
-- Mỗi số serial là một ngôi sao vật lý đã in và đóng số tay — một số chỉ được
-- dùng đúng một lần. Văn bản triển khai mục 6: Phòng TCTH phát (bàn giao) sao
-- cho BGĐ + Trưởng phòng trước mùng 5 tháng đầu quý; lãnh đạo ghi nhận trước
-- khi trao.
--
-- Vòng đời một số serial:
--   in_stock (kho TCTH) → handed_over (lãnh đạo giữ) → awarded (đã tặng)
--   in_stock → void (hỏng/hủy)
-- Gỡ phiếu ghi trên cổng → số quay về trạng thái trước đó.
-- ============================================================================

-- 1. Bàn giao sao cho lãnh đạo (một dòng = một dải số bàn giao)
create table public.star_handovers (
  id uuid primary key default gen_random_uuid(),
  holder_profile_id uuid not null references public.profiles(id),
  serial_from integer not null check (serial_from > 0),
  serial_to integer not null,
  quarter text,
  handed_at date not null default current_date,
  note text,
  revoked_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  check (serial_to >= serial_from)
);

-- 2. Sổ sao: mỗi dòng một ngôi sao vật lý
create table public.star_serials (
  serial_no integer primary key check (serial_no > 0),
  status text not null default 'in_stock'
    check (status in ('in_stock','handed_over','awarded','void')),
  holder_profile_id uuid references public.profiles(id),
  handover_id uuid references public.star_handovers(id),
  record_id uuid references public.star_records(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index star_serials_status_idx on public.star_serials(status);
create index star_serials_holder_idx on public.star_serials(holder_profile_id);
create index star_serials_record_idx on public.star_serials(record_id);
create index star_handovers_holder_idx on public.star_handovers(holder_profile_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger star_serials_touch before update on public.star_serials
  for each row execute function public.touch_updated_at();

-- 3. Cột mới trên phiếu: người tặng/người nhận gắn hồ sơ + cách ghi nhận
alter table public.star_records
  add column sender_profile_id uuid references public.profiles(id),
  add column recipient_profile_id uuid references public.profiles(id),
  add column entry_mode text check (entry_mode in ('self','proxy','program')),
  add column program_name text;

-- 4. RLS
alter table public.star_serials enable row level security;
alter table public.star_handovers enable row level security;

create policy "Staff can view star serials" on public.star_serials
  for select to authenticated using (public.is_staff(auth.uid()));
create policy "Admins can manage star serials" on public.star_serials
  for all to authenticated
  using (public.has_role(auth.uid(),'system_admin'::app_role) or public.has_role(auth.uid(),'tcth_admin'::app_role))
  with check (public.has_role(auth.uid(),'system_admin'::app_role) or public.has_role(auth.uid(),'tcth_admin'::app_role));

create policy "Staff can view star handovers" on public.star_handovers
  for select to authenticated using (public.is_staff(auth.uid()));
create policy "Admins can manage star handovers" on public.star_handovers
  for all to authenticated
  using (public.has_role(auth.uid(),'system_admin'::app_role) or public.has_role(auth.uid(),'tcth_admin'::app_role))
  with check (public.has_role(auth.uid(),'system_admin'::app_role) or public.has_role(auth.uid(),'tcth_admin'::app_role));

-- Đường INSERT tự do cũ (mọi cán bộ ghi thẳng phiếu source='form') đi vòng qua
-- sổ sao nên vô hiệu hóa hàng rào chống trùng — mọi phiếu form từ nay đi qua
-- RPC award_star bên dưới.
drop policy if exists "Staff can submit form star records" on public.star_records;

-- ============================================================================
-- 5. RPC — chạy security definer, tự kiểm quyền bằng has_role
-- ============================================================================

-- 5a. Khai báo lô sao đã in (TCTH)
create or replace function public.declare_star_batch(
  p_from integer, p_to integer, p_note text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_inserted integer;
begin
  if not (has_role(auth.uid(),'tcth_admin'::app_role) or has_role(auth.uid(),'system_admin'::app_role)) then
    raise exception 'Chỉ Phòng TCTH được khai báo lô sao';
  end if;
  if p_from is null or p_to is null or p_from < 1 or p_to < p_from or p_to - p_from >= 2000 then
    raise exception 'Dải số không hợp lệ (tối đa 2000 số một lần khai báo)';
  end if;

  insert into star_serials (serial_no, note)
  select s, p_note from generate_series(p_from, p_to) s
  on conflict (serial_no) do nothing;
  get diagnostics v_inserted = row_count;

  return jsonb_build_object('inserted', v_inserted, 'skipped', (p_to - p_from + 1) - v_inserted);
end $$;

-- 5b. Bàn giao dải số cho lãnh đạo (TCTH). Chỉ nhận số đang tồn kho.
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

-- 5c. Thu hồi bàn giao: số chưa tặng quay về kho, số đã tặng giữ nguyên.
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

-- 5d. TẶNG SAO — giao dịch nguyên tử: ghi phiếu + trừ số khỏi sổ sao.
-- Hàng rào chống trùng nằm ở đây: UPDATE có điều kiện trạng thái; thiếu một số
-- là toàn bộ giao dịch hủy, không có phiếu nửa vời, không có số dùng hai lần.
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
  p_program_name text default null
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

  insert into star_records
    (name, department, stars, reason, result, awarded_on, sender, serial,
     is_collective, source, created_by, sender_profile_id, recipient_profile_id,
     entry_mode, program_name)
  values
    (v_name, v_dept, v_n, btrim(p_reason), btrim(p_result),
     coalesce(p_awarded_on, current_date), v_sender,
     (select string_agg(s::text, ', ' order by s) from unnest(p_serials) s),
     coalesce(p_is_collective, false), 'form', v_uid, v_sender_profile,
     p_recipient_profile_id, p_entry_mode,
     case when p_entry_mode = 'program' then btrim(p_program_name) end)
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

-- 5e. Gỡ phiếu ghi trên cổng (TCTH) — trả số về pool người giữ / kho.
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

-- Cho client authenticated gọi các RPC (kiểm quyền nằm trong thân hàm)
revoke all on function public.declare_star_batch(integer,integer,text) from public;
revoke all on function public.handover_stars(uuid,integer,integer,text,text) from public;
revoke all on function public.revoke_handover(uuid) from public;
revoke all on function public.award_star(text,integer[],boolean,uuid,text,text,text,text,date,uuid,text) from public;
revoke all on function public.revoke_star_record(uuid) from public;
grant execute on function public.declare_star_batch(integer,integer,text) to authenticated;
grant execute on function public.handover_stars(uuid,integer,integer,text,text) to authenticated;
grant execute on function public.revoke_handover(uuid) to authenticated;
grant execute on function public.award_star(text,integer[],boolean,uuid,text,text,text,text,date,uuid,text) to authenticated;
grant execute on function public.revoke_star_record(uuid) to authenticated;
