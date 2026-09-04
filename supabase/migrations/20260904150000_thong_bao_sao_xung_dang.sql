-- THÔNG BÁO SAO XỨNG ĐÁNG (yêu cầu chủ chương trình 04/09/2026).
--
-- Ba việc được đặt ra: (1) push toàn chi nhánh khi có người được tặng sao,
-- (2) đưa cá nhân nhận sao của tháng lên trang chủ, (3) push kích thích cán bộ
-- theo mốc quà gần nhất. Mục (2) thuần giao diện; file này lo (1) và (3).
--
-- VÌ SAO KHÔNG BẮN THẲNG 100 TIN MỖI LẦN CÓ SAO. Số thật ngày 04/09: 100 cán bộ
-- đang hoạt động, 71 người bật push, cổng đã phát 4.895 tin trong 30 ngày từ 19
-- loại tin. Chi nhánh trao ~35 phiếu sao/tháng. Bắn mỗi phiếu tới cả 100 người là
-- +3.500 tin/tháng — tăng 71% tổng lượng thông báo chỉ từ MỘT loại tin mới, và
-- CLAUDE.md đã ghi rõ đây là cách nhanh nhất khiến cán bộ tắt push, mất luôn cả
-- các tin điều hành. Chủ chương trình chốt phương án gộp ngày (04/09).
--
-- Vì vậy hai loại tin, không phải một:
--   SAO_NHAN     — tới ĐÚNG người vừa được tặng, ngay khi phiếu ghi xong. Tin vui
--                  (mức KHEN 🔥, không đội mũ cảnh báo). Kèm luôn câu nhắc mốc quà
--                  kế tiếp — đó là việc (3), gộp vào tin đã có đúng như quy ước
--                  "mặc định là gộp, đừng đẻ loại tin mới".
--   SAO_BAN_TIN  — MỘT tin gộp tới mọi cán bộ vào cuối ngày làm việc, liệt kê ai
--                  được tặng hôm nay. Toàn chi nhánh vẫn biết, nhưng 1 tin/ngày
--                  thay vì 100 tin/phiếu.

-- ---------------------------------------------------------------------------
-- 1. Câu nhắc mốc quà kế tiếp
-- ---------------------------------------------------------------------------
-- ⚠ BẢN TYPESCRIPT SONG SINH: `nhacMocQuaKeTiep` trong src/components/one/star/starMath.ts
-- soạn đúng câu này cho thẻ trang chủ và tab Tổng hợp. Mốc và chữ phải trùng nhau
-- từng dòng — lệch là cán bộ đọc push một đằng, mở cổng ra thấy một nẻo.
-- Bảng mốc lấy từ STAR_REWARD_TIERS (văn bản triển khai mục 5.2).
create or replace function public.sao_moc_qua_ke_tiep(_sao integer)
returns text
language sql immutable as $$
  select case
    when _sao < 1  then 'Còn ' || (1  - _sao) || ' Sao nữa tới mốc 1 Sao — Voucher Cafe / Ăn uống / Tiền mặt'
    when _sao < 3  then 'Còn ' || (3  - _sao) || ' Sao nữa tới mốc 3 Sao — Giftset VietinBank (Logo Chi nhánh)'
    when _sao < 6  then 'Còn ' || (6  - _sao) || ' Sao nữa tới mốc 6 Sao — Voucher Siêu thị / Quà tặng tiện ích'
    when _sao < 8  then 'Còn ' || (8  - _sao) || ' Sao nữa tới mốc 8 Sao — Loa / Tai nghe Bluetooth chính hãng'
    when _sao < 12 then 'Còn ' || (12 - _sao) || ' Sao nữa tới mốc 12 Sao — Túi xách / Giày công sở cao cấp'
    when _sao < 15 then 'Còn ' || (15 - _sao) || ' Sao nữa tới mốc 15 Sao — Apple Watch Series đời mới nhất'
    when _sao < 18 then 'Còn ' || (18 - _sao) || ' Sao nữa tới mốc 18 Sao — Voucher Du lịch (Vé máy bay + Khách sạn)'
    when _sao < 20 then 'Còn ' || (20 - _sao) || ' Sao nữa tới mốc 20 Sao — iPhone 18 Pro Max mới nhất'
    -- Chạm mốc cao nhất thì thôi treo: treo thêm là chế nhạo, không phải khích lệ.
    else null
  end
$$;

-- ---------------------------------------------------------------------------
-- 2. Tổng sao tích lũy của một cán bộ
-- ---------------------------------------------------------------------------
-- Nhận diện phiếu của một người theo hai đường, vì dữ liệu có hai thế hệ:
--   · phiếu ghi trên cổng có `recipient_profile_id` — khớp thẳng, chắc chắn nhất;
--   · phiếu cũ nhập từ Lark chỉ có họ tên chữ, phải so tên đã bỏ dấu KÈM phòng.
--
-- Phải kèm phòng vì chi nhánh có cán bộ TRÙNG HỌ TÊN (hai chị Nguyễn Thị Phượng —
-- Phòng TCTH và Phòng Ân Thi); so mỗi tên là cộng sao của đồng nghiệp vào rồi push
-- sai mốc quà cho cả hai người.
--
-- So phòng phải NỚI, không so bằng: nhãn phòng trên phiếu Sao ngắn hơn tên danh bạ
-- ("Phòng DVKH" ≠ "Phòng Dịch vụ khách hàng"). Luật quy nhãn đầy đủ sống ở
-- TypeScript (`standardizeDepartment`) và CỐ Ý không chép sang SQL — chép là đẻ
-- nguồn sự thật thứ hai, đúng thứ CLAUDE.md cấm. Ở đây chỉ cần trả lời "có phải
-- cùng phòng không", nên so kiểu chuỗi này nằm trong chuỗi kia là đủ và không bao
-- giờ lệch khi ai đó đổi tên phòng.
create or replace function public.sao_tong_cua_can_bo(_profile_id uuid)
returns integer
language sql stable set search_path = public as $$
  with toi as (
    select p.full_name, coalesce(d.name, '') as phong
      from profiles p left join departments d on d.id = p.department_id
     where p.id = _profile_id
  )
  select coalesce(sum(r.stars), 0)::int
    from star_records r, toi
   where not r.is_collective
     and (
       r.recipient_profile_id = _profile_id
       or (
         r.recipient_profile_id is null
         and bhy_chuan_hoa_ten(r.name) = bhy_chuan_hoa_ten(toi.full_name)
         and (
           toi.phong = ''
           or bhy_chuan_hoa_ten(coalesce(r.department, '')) = bhy_chuan_hoa_ten(toi.phong)
           or position(bhy_chuan_hoa_ten(coalesce(r.department, '')) in bhy_chuan_hoa_ten(toi.phong)) > 0
           or position(bhy_chuan_hoa_ten(toi.phong) in bhy_chuan_hoa_ten(coalesce(r.department, ''))) > 0
         )
       )
     )
$$;

-- ---------------------------------------------------------------------------
-- 3. SAO_NHAN — tin tới đúng người vừa được tặng
-- ---------------------------------------------------------------------------
create or replace function public.sao_bao_nguoi_nhan()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_tong integer;
  v_moc text;
  v_noi_dung text;
begin
  -- Phiếu tập thể không có "người nhận" để báo — tập thể xuất hiện ở bản tin ngày.
  if new.is_collective or new.recipient_profile_id is null then
    return new;
  end if;
  -- Nhập bù là chép lại lịch sử, không phải tin vui vừa xảy ra. Báo "bạn vừa nhận
  -- Sao" cho một phiếu trao từ tháng trước là làm cán bộ tưởng có sao mới.
  if new.entry_mode = 'backfill' then
    return new;
  end if;

  v_tong := sao_tong_cua_can_bo(new.recipient_profile_id);
  v_moc  := sao_moc_qua_ke_tiep(v_tong);

  -- Chuẩn hình thức push 09/08: mỗi dòng một nhãn, không nối bằng «·».
  v_noi_dung :=
        'Người tặng: ' || ct2_cat(coalesce(new.sender, 'Chương trình'), 70)
    || E'\nVì đã: '    || ct2_cat(coalesce(new.reason, ''), 140)
    || E'\nSao tích lũy: ' || v_tong || ' Sao'
    || coalesce(E'\n' || v_moc, '');

  -- Tiêu đề ngắn mang con số; mức KHEN để notify-ct2 gắn 🔥 thay vì mũ cảnh báo.
  perform ct2_dat_thong_bao(
    'SAO_NHAN', new.recipient_profile_id,
    'Bạn vừa nhận ' || new.stars || ' Sao Xứng Đáng',
    v_noi_dung, 'KHEN', null, null);

  perform ct2_kich_hoat_phat_push();
  return new;
end $$;

drop trigger if exists trg_sao_bao_nguoi_nhan on public.star_records;
create trigger trg_sao_bao_nguoi_nhan
  after insert on public.star_records
  for each row execute function public.sao_bao_nguoi_nhan();

-- ---------------------------------------------------------------------------
-- 4. SAO_BAN_TIN — một tin gộp cuối ngày cho toàn chi nhánh
-- ---------------------------------------------------------------------------
-- `_that = false` (mặc định) chỉ XEM TRƯỚC, không ghi tin nào — cùng khuôn với
-- ct2_khen_chuoi_moc / ct2_nhac_nhip_sang để TCTH thử được trước khi bật lịch.
create or replace function public.sao_ban_tin_ngay(
  _that boolean default false,
  _moc timestamptz default now()
) returns table(nguoi_nhan integer, so_phieu integer, so_sao integer, tieu_de text, noi_dung text)
language plpgsql security definer set search_path = public as $$
declare
  ngay_vn date := (_moc at time zone 'Asia/Ho_Chi_Minh')::date;
  v_phieu integer;
  v_sao integer;
  v_dong text;
  v_tieu_de text;
  v_noi_dung text;
  v_gui integer := 0;
  r record;
begin
  if ct2_can_kiem_quyen() and not (
    has_role(auth.uid(), 'system_admin'::app_role)
    or has_role(auth.uid(), 'tcth_admin'::app_role)
  ) then
    raise exception 'Chỉ TCTH/quản trị hệ thống được chạy bản tin Sao';
  end if;

  if not ct2_la_ngay_lam_viec(_moc) then
    return;
  end if;

  -- Phiếu GHI HÔM NAY, không phải phiếu có ngày trao hôm nay: bản tin nói "hôm nay
  -- chi nhánh trao", nên căn theo lúc phiếu vào cổng. Bỏ phiếu nhập bù vì đó là
  -- chép lại lịch sử — đưa vào bản tin là báo tin cũ thành tin mới.
  select count(*)::int, coalesce(sum(stars), 0)::int
    into v_phieu, v_sao
    from star_records
   where (created_at at time zone 'Asia/Ho_Chi_Minh')::date = ngay_vn
     and coalesce(entry_mode, '') <> 'backfill';

  if v_phieu = 0 then
    return;
  end if;

  -- Mỗi phiếu một dòng, nhãn đầu dòng theo chuẩn 09/08. Cắt còn 6 dòng để tin
  -- không tràn màn hình khóa; dư thì gộp thành một dòng đếm.
  select string_agg(dong, E'\n' order by thu_tu)
    into v_dong
    from (
      select row_number() over (order by created_at) as thu_tu,
             'Sao: ' || ct2_cat(name, 55)
               || ' (' || ct2_cat(coalesce(department, 'chưa rõ phòng'), 30) || ')'
               || case when stars > 1 then ' — ' || stars || ' Sao' else '' end as dong
        from star_records
       where (created_at at time zone 'Asia/Ho_Chi_Minh')::date = ngay_vn
         and coalesce(entry_mode, '') <> 'backfill'
       order by created_at
       limit 6
    ) x;

  v_tieu_de := 'Hôm nay chi nhánh trao ' || v_sao || ' Sao Xứng Đáng';
  v_noi_dung := v_dong
    || case when v_phieu > 6 then E'\nvà ' || (v_phieu - 6) || ' phiếu nữa.' else '' end;

  if _that then
    for r in
      select p.id from profiles p where p.status = 'active'
    loop
      perform ct2_dat_thong_bao('SAO_BAN_TIN', r.id, v_tieu_de, v_noi_dung, 'KHEN', null, null);
      v_gui := v_gui + 1;
    end loop;
    perform ct2_kich_hoat_phat_push();
  end if;

  nguoi_nhan := case when _that then v_gui
                     else (select count(*)::int from profiles where status = 'active') end;
  so_phieu := v_phieu;
  so_sao := v_sao;
  tieu_de := v_tieu_de;
  noi_dung := v_noi_dung;
  return next;
end $$;

revoke all on function public.sao_ban_tin_ngay(boolean, timestamptz) from anon, public;
grant execute on function public.sao_ban_tin_ngay(boolean, timestamptz) to authenticated;
revoke all on function public.sao_moc_qua_ke_tiep(integer) from anon;
revoke all on function public.sao_tong_cua_can_bo(uuid) from anon;

-- ---------------------------------------------------------------------------
-- 5. Lịch phát bản tin ngày
-- ---------------------------------------------------------------------------
-- 09:30 UTC = 16:30 giờ Việt Nam — cuối ngày làm việc, và nằm trong khung yên
-- tĩnh 07:00–18:00 nên tin phát ngay chứ không nằm chờ sang sáng hôm sau.
-- Hàm tự bỏ qua ngày nghỉ (ct2_la_ngay_lam_viec đọc lịch nghỉ lễ) và tự im lặng
-- khi hôm đó không có phiếu nào — không có "bản tin rỗng".
select cron.schedule('sao-ban-tin-ngay', '30 9 * * 1-5', $cron$ SELECT public.sao_ban_tin_ngay(true); $cron$);
