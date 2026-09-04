-- SỐ SAO CỦA MỘT ĐỢT BÀN GIAO PHẢI KHỚP DẢI SỐ (TCTH báo 04/09/2026).
--
-- HIỆN TƯỢNG: đợt Quý III của chị Nguyễn Thị Huyền (Phòng DVKH) ghi dải 285–290,
-- dòng tổng phía trên đếm đúng 6 sao nhưng dòng chi tiết phía dưới chỉ ra 5.
--
-- VÌ SAO: dòng chi tiết đếm theo `star_serials.handover_id`, và số 287 không được
-- gắn vào đợt nào. Số 287 là sao NHẬP BÙ (phiếu Chu Hồng Hải, người tặng chính chị
-- Huyền, nhập ngày 04/09 từ tin Lark). Nhánh 'backfill' của `award_star` ghi
-- `holder_profile_id` để biết sao ra từ túi ai, nhưng KHÔNG gắn `handover_id`.
-- Sau đó `handover_stars` bàn giao dải 285–290 cho chị Huyền: nhánh ghi hồi tố của
-- nó có điều kiện `holder_profile_id is null` — 287 đã có người giữ nên bị bỏ qua.
--
-- Tệ hơn: 287 rơi ra khỏi MỌI ô đếm của handover_stars (không phải 'moi', không
-- 'hoi_to', không 'bo_qua' vì người giữ đúng là chị Huyền, không 'da_giu' vì trạng
-- thái là awarded chứ không phải handed_over) — nên máy báo bàn giao thành công mà
-- không hé một chữ nào về số bị rớt. Lệch âm thầm là loại lỗi khó phát hiện nhất;
-- lần này TCTH nhìn ra vì hai con số cạnh nhau, lần sau chưa chắc.
--
-- SỬA HAI ĐẦU, vì hai thứ tự thao tác đều xảy ra thật:
--   1. Nhập bù TRƯỚC, bàn giao SAU  → handover_stars phải nhận cả số đã có người
--      giữ đúng là lãnh đạo này (ca 287, và 64, 65, 75).
--   2. Bàn giao TRƯỚC, nhập bù SAU  → award_star nhánh backfill phải giữ nguyên
--      handover_id sẵn có, và tự gắn vào đợt đang mở nếu số lấy từ kho.
-- Cuối file vá lại 4 số đang lệch.

-- 1. handover_stars: ghi hồi tố nhận thêm số ĐÃ TẶNG mà người giữ đã đúng là lãnh
--    đạo này, miễn là số chưa thuộc đợt nào (`handover_id is null`) — không giành
--    số của đợt cũ, vì đợt cũ mới là nơi sao đó thật sự phát ra.
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

  -- Ghi hồi tố: sao ĐÃ TẶNG mà nguồn gốc là chính lãnh đạo này. Hai đường nhận diện
  -- nguồn gốc — tên người tặng trên phiếu (phiếu nhập từ Lark, chưa có người giữ),
  -- HOẶC người giữ đã ghi sẵn (phiếu nhập bù). Đường thứ hai là phần bổ sung 04/09.
  update star_serials ss
     set holder_profile_id = p_holder_profile_id, handover_id = v_id
   where ss.serial_no between p_from and p_to
     and ss.status = 'awarded'
     and ss.handover_id is null
     and (
       ss.holder_profile_id = p_holder_profile_id
       or (
         ss.holder_profile_id is null
         and exists (
           select 1 from star_records r
           where r.id = ss.record_id
             and bhy_chuan_hoa_ten(coalesce(r.sender,'')) = bhy_chuan_hoa_ten(v_ten_holder)
         )
       )
     );
  get diagnostics v_hoi_to = row_count;

  select count(*), string_agg(ss.serial_no::text, ', ' order by ss.serial_no)
    into v_bo_qua, v_ds_bo_qua
  from star_serials ss
  where ss.serial_no between p_from and p_to
    and ss.status = 'awarded'
    and ss.holder_profile_id is distinct from p_holder_profile_id;

  -- Số của đợt TRƯỚC (đã bàn giao hoặc đã tặng, vẫn thuộc đợt cũ) — không tính vào
  -- đợt này nhưng phải nói ra, nếu không TCTH lại thấy con số hụt mà không hiểu vì sao.
  select count(*) into v_da_giu
  from star_serials ss
  where ss.serial_no between p_from and p_to
    and ss.holder_profile_id = p_holder_profile_id
    and ss.handover_id is distinct from v_id;

  if v_moi = 0 and v_hoi_to = 0 then
    delete from star_handovers where id = v_id;
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

-- 2. award_star nhánh 'backfill': số lấy từ kho mà rơi đúng vào một đợt bàn giao
--    đang mở của chính người tặng thì gắn luôn vào đợt đó, để số của đợt khớp dải.
--    Số đang ở tay lãnh đạo thì GIỮ NGUYÊN handover_id sẵn có.
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
    -- ghi luôn người giữ để biết sao ra từ túi ai. Số lấy từ kho mà nằm trong một
    -- đợt bàn giao đang mở của chính người tặng thì gắn vào đợt đó — nếu không,
    -- số của đợt sẽ hụt so với dải mà không ai giải thích được (ca 285–290 ngày 04/09).
    update star_serials ss
       set status = 'awarded',
           record_id = v_record_id,
           holder_profile_id = v_holder,
           handover_id = coalesce(
             ss.handover_id,
             (select h.id from star_handovers h
               where h.holder_profile_id = v_holder
                 and h.revoked_at is null
                 and ss.serial_no between h.serial_from and h.serial_to
               order by h.created_at desc limit 1)
           )
     where ss.serial_no = any(p_serials) and ss.status in ('in_stock', 'handed_over');
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

-- 3. Vá 4 số đang lệch: sao nhập bù ngày 04/09 rơi vào dải của một đợt đang mở của
--    chính người tặng nhưng chưa gắn đợt — 64, 65 (Phạm Minh Hải Q2), 75 (Đỗ Việt
--    Anh Q1), 287 (Nguyễn Thị Huyền Q3). Viết theo điều kiện, không theo số cứng,
--    để chạy lại không hỏng gì.
update star_serials ss
   set handover_id = h.id
  from star_handovers h
 where ss.handover_id is null
   and ss.status = 'awarded'
   and h.revoked_at is null
   and h.holder_profile_id = ss.holder_profile_id
   and ss.serial_no between h.serial_from and h.serial_to;
