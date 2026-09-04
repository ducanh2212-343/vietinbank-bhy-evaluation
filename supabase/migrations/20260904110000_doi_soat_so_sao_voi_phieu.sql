-- Công cụ ĐỐI SOÁT SỔ SAO ↔ PHIẾU cho Phòng TCTH.
--
-- VÌ SAO CẦN: đường nhập Excel (replaceAll) xóa sạch star_records rồi ghi lại.
-- Khóa ngoại star_serials.record_id có `on delete set null`, nên MỖI LẦN nhập là
-- một lần sổ sao đứt liên kết với phiếu — đã xảy ra 21/08, 28/08 và 03/09. Ba lần
-- đều phải sửa tay bằng migration. Nay TCTH tự đối soát được bằng một nút.
--
-- Hàm chỉ ĐỌC khi p_sua = false (mặc định) — bấm xem trước rồi mới sửa.
--
-- Ba loại lệch:
--   thiếu liên kết — phiếu có số serial nhưng sổ chưa đánh dấu số đó đã tặng
--   mồ côi         — sổ ghi đã tặng nhưng không phiếu nào còn dùng số đó
--   trùng phiếu    — một số bị hai phiếu trở lên cùng dùng (lỗi ghi tay, phải
--                    tra sao vật lý mới chốt được nên KHÔNG tự sửa)

create or replace function public.doi_soat_so_sao(p_sua boolean default false)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_thieu jsonb;
  v_mo_coi jsonb;
  v_trung jsonb;
  v_da_noi integer := 0;
  v_da_tra integer := 0;
begin
  if not (has_role(auth.uid(),'tcth_admin'::app_role) or has_role(auth.uid(),'system_admin'::app_role)) then
    raise exception 'Chỉ Phòng TCTH được đối soát sổ sao';
  end if;

  -- Bảng tạm: mỗi số serial xuất hiện trên phiếu nào (lấy phiếu sớm nhất khi trùng)
  create temp table if not exists _tok (so integer, record_id uuid, awarded_on date) on commit drop;
  delete from _tok;
  insert into _tok (so, record_id, awarded_on)
  select (m[1])::int, r.id, r.awarded_on
  from star_records r,
       lateral (select regexp_matches(coalesce(r.serial,''), '([0-9]+)', 'g') as m) x;

  -- 1. Phiếu có số nhưng sổ chưa đánh dấu đã tặng
  select coalesce(jsonb_agg(jsonb_build_object(
           'serial', t.so, 'phieu', r.name, 'nguoi_tang', r.sender,
           'trang_thai_so', coalesce(ss.status, 'chưa khai báo')
         ) order by t.so), '[]'::jsonb)
    into v_thieu
  from (select distinct on (so) so, record_id from _tok order by so, awarded_on, record_id) t
  join star_records r on r.id = t.record_id
  left join star_serials ss on ss.serial_no = t.so
  where ss.serial_no is null or ss.status <> 'awarded' or ss.record_id is distinct from t.record_id;

  -- 2. Sổ ghi đã tặng nhưng không phiếu nào dùng
  select coalesce(jsonb_agg(jsonb_build_object('serial', ss.serial_no) order by ss.serial_no), '[]'::jsonb)
    into v_mo_coi
  from star_serials ss
  where ss.status = 'awarded'
    and not exists (select 1 from _tok t where t.so = ss.serial_no);

  -- 3. Một số bị nhiều phiếu cùng dùng — chỉ báo, không tự sửa
  select coalesce(jsonb_agg(jsonb_build_object(
           'serial', x.so, 'so_phieu', x.n, 'cac_phieu', x.ds
         ) order by x.so), '[]'::jsonb)
    into v_trung
  from (
    select t.so, count(*) as n,
           string_agg(r.name || ' (' || to_char(r.awarded_on,'DD/MM') || ')', ', ' order by r.awarded_on) as ds
    from _tok t join star_records r on r.id = t.record_id
    group by t.so having count(*) > 1
  ) x;

  if p_sua then
    -- Nối lại: số đã bàn giao thì GIỮ người giữ (sao ra từ túi họ), số khác thì chỉ
    -- gắn phiếu. Không đụng số đã hủy.
    update star_serials ss
       set status = 'awarded', record_id = t.record_id
      from (select distinct on (so) so, record_id from _tok order by so, awarded_on, record_id) t
     where ss.serial_no = t.so
       and ss.status <> 'void'
       and (ss.status <> 'awarded' or ss.record_id is distinct from t.record_id);
    get diagnostics v_da_noi = row_count;

    -- Số không còn phiếu nào dùng: trả về nơi giữ, hoặc về kho nếu chưa bàn giao
    update star_serials ss
       set status = case when ss.holder_profile_id is not null then 'handed_over' else 'in_stock' end,
           record_id = null
     where ss.status = 'awarded'
       and not exists (select 1 from _tok t where t.so = ss.serial_no);
    get diagnostics v_da_tra = row_count;
  end if;

  return jsonb_build_object(
    'da_sua', p_sua,
    'thieu_lien_ket', v_thieu,
    'mo_coi', v_mo_coi,
    'trung_phieu', v_trung,
    'so_da_noi', v_da_noi,
    'so_da_tra_ve', v_da_tra
  );
end $$;

revoke all on function public.doi_soat_so_sao(boolean) from anon, public;
grant execute on function public.doi_soat_so_sao(boolean) to authenticated;
