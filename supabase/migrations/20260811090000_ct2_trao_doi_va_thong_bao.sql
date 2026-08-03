-- ============================================================================
-- TRAO ĐỔI TRÊN MỌI BÀN KANBAN + THÔNG BÁO ĐẨY KHI CÓ CẬP NHẬT
--
-- RÀ SOÁT TRƯỚC KHI LÀM — ba khoảng trống:
--   1. Bàn Phê duyệt tín dụng KHÔNG có trao đổi, chỉ có nhật ký một chiều.
--      Cán bộ muốn hỏi «hồ sơ này vướng gì» phải gọi điện.
--   2. Kanban 38 skill (kanban_cards, gồm cả thẻ Dấu ấn) cũng KHÔNG có bình
--      luận — chỉ có log tiến độ, không ai trả lời được vào đó.
--   3. Chiêu thức 2 có bảng ct2_binh_luan nhưng @nhắc tên chưa nối (giao diện
--      luôn gửi mảng rỗng), và bảng hàng đợi ct2_thong_bao dựng ra rồi CHƯA AI
--      GHI VÀO — tức là toàn bộ N1–N17 vẫn là giấy tờ.
--
-- CÁCH LÀM: một bảng bình luận duy nhất cho MỌI bàn, thay vì mỗi bàn một bảng.
-- Mở rộng pham_vi của ct2_binh_luan thêm hai giá trị — hồ sơ tín dụng và thẻ
-- Kanban 38 skill. Nhờ vậy @nhắc tên, «Cần trả lời», cảm xúc và thu hồi chỉ
-- phải viết một lần, dùng được ở khắp nơi.
--
-- NGUYÊN TẮC ĐẨY THÔNG BÁO (đặc tả §0 quyết định 5 và §6.2):
--   · Chỉ đẩy khi LỆCH CHUẨN hoặc khi việc ĐỔI TAY. Tuyệt đối không đẩy mỗi
--     lần ghi nhịp bình thường — sau ba tuần mọi người sẽ tắt thông báo.
--   · Trần 3 thông báo nhóm nhắc nhở/người/ngày. @nhắc tên và mức 🔴/⛔ không
--     tính vào trần.
--   · Im lặng trước 7h00, sau 18h00 và ngày nghỉ — trừ mức ⛔.
--
-- (Kanban 38 skill vẫn giữ luật riêng của nó: push 2 cấp trên mỗi lần cập nhật,
--  theo yêu cầu trực tiếp của Giám đốc 26/07. Hai bàn hai luật, không trộn.)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Một bảng bình luận cho mọi bàn
-- ---------------------------------------------------------------------------
ALTER TABLE public.ct2_binh_luan DROP CONSTRAINT IF EXISTS ct2_binh_luan_pham_vi_check;
ALTER TABLE public.ct2_binh_luan ADD CONSTRAINT ct2_binh_luan_pham_vi_check
  CHECK (pham_vi IN ('DAU_VIEC','PHONG','CHIEN_DICH','HO_SO_TIN_DUNG','THE_KANBAN'));

COMMENT ON COLUMN public.ct2_binh_luan.pham_vi IS
  'DAU_VIEC = thẻ Chiêu thức 2 · HO_SO_TIN_DUNG = hồ sơ PDTD · THE_KANBAN = thẻ Kanban 38 skill/Dấu ấn · PHONG, CHIEN_DICH = kênh chung';

-- Quyền xem/viết cho hai phạm vi mới. Hồ sơ tín dụng đi theo đúng phạm vi hẹp
-- của chính nó (không mở cho phòng khác); thẻ Kanban đi theo can_view_profile
-- sẵn có của hệ 38 skill.
CREATE OR REPLACE FUNCTION public.ct2_xem_duoc_doi_tuong(_pham_vi text, _doi_tuong uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $ct2v$
DECLARE r record;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RETURN false; END IF;

  IF _pham_vi = 'DAU_VIEC' THEN
    SELECT d.phong, d.cac_phong_tham_gia INTO r
      FROM public.ct2_dau_viec d WHERE d.id = _doi_tuong;
    RETURN FOUND AND public.ct2_xem_duoc_dau_viec(r.phong, r.cac_phong_tham_gia);

  ELSIF _pham_vi = 'HO_SO_TIN_DUNG' THEN
    SELECT h.phong INTO r FROM public.ct2_ho_so_tin_dung h WHERE h.id = _doi_tuong;
    RETURN FOUND AND (public.can_view_all_action_plans()
                      OR public.is_my_scope_department(r.phong));

  ELSIF _pham_vi = 'THE_KANBAN' THEN
    SELECT c.profile_id INTO r FROM public.kanban_cards c WHERE c.id = _doi_tuong;
    RETURN FOUND AND (r.profile_id = public.get_my_profile_id()
                      OR public.can_view_profile(r.profile_id));

  ELSIF _pham_vi = 'PHONG' THEN
    RETURN public.ct2_xem_duoc_dau_viec(_doi_tuong, '{}');

  ELSIF _pham_vi = 'CHIEN_DICH' THEN
    SELECT c.phong_chu_tri AS phong, c.cac_phong_tham_gia INTO r
      FROM public.ct2_chien_dich c WHERE c.id = _doi_tuong;
    RETURN FOUND AND public.ct2_xem_duoc_dau_viec(r.phong, r.cac_phong_tham_gia);
  END IF;
  RETURN false;
END $ct2v$;

REVOKE ALL ON FUNCTION public.ct2_xem_duoc_doi_tuong(text, uuid) FROM PUBLIC, anon;

-- Ba policy cũ liệt kê tay từng phạm vi — thay bằng một hàm để không phải sửa
-- policy mỗi lần thêm bàn mới.
DROP POLICY IF EXISTS "ct2 xem binh luan" ON public.ct2_binh_luan;
CREATE POLICY "ct2 xem binh luan" ON public.ct2_binh_luan FOR SELECT TO authenticated
  USING (public.ct2_xem_duoc_doi_tuong(pham_vi, doi_tuong_id));

DROP POLICY IF EXISTS "ct2 viet binh luan" ON public.ct2_binh_luan;
CREATE POLICY "ct2 viet binh luan" ON public.ct2_binh_luan FOR INSERT TO authenticated
  WITH CHECK (
    nguoi_gui = public.get_my_profile_id()
    AND public.ct2_xem_duoc_doi_tuong(pham_vi, doi_tuong_id)
  );

DROP POLICY IF EXISTS "ct2 sua binh luan" ON public.ct2_binh_luan;
CREATE POLICY "ct2 sua binh luan" ON public.ct2_binh_luan FOR UPDATE TO authenticated
  USING (public.ct2_xem_duoc_doi_tuong(pham_vi, doi_tuong_id))
  WITH CHECK (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- 2) Đặt thông báo vào hàng đợi — nơi duy nhất áp trần và im lặng ngoài giờ
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ct2_dat_thong_bao(
  _ma_su_kien text,
  _nguoi_nhan uuid,
  _tieu_de text,
  _noi_dung text,
  _muc text DEFAULT 'NHE',
  _dau_viec_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $ct2n$
DECLARE
  gio_vn time := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::time;
  thu int := EXTRACT(dow FROM (now() AT TIME ZONE 'Asia/Ho_Chi_Minh'));
  da_gui int;
BEGIN
  IF _nguoi_nhan IS NULL THEN RETURN false; END IF;
  -- Không tự nhắc chính mình về việc mình vừa làm
  IF _nguoi_nhan = public.get_my_profile_id() THEN RETURN false; END IF;

  -- Im lặng ngoài giờ và ngày nghỉ — trừ mức chặn (đặc tả §6.2 quy tắc 3)
  IF _muc <> 'CHAN' AND (gio_vn < time '07:00' OR gio_vn > time '18:00'
                         OR thu = 0 OR thu = 6) THEN
    RETURN false;
  END IF;

  -- Trần 3 thông báo/người/ngày cho nhóm nhắc nhẹ. @nhắc tên (N12) và mức
  -- đỏ/chặn không tính vào trần — đó là thứ người ta cần biết ngay.
  IF _muc = 'NHE' AND _ma_su_kien <> 'N12' THEN
    SELECT count(*) INTO da_gui FROM public.ct2_thong_bao t
     WHERE t.nguoi_nhan = _nguoi_nhan
       AND t.muc = 'NHE'
       AND (t.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
           = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
    IF da_gui >= 3 THEN RETURN false; END IF;
  END IF;

  INSERT INTO public.ct2_thong_bao
    (ma_su_kien, nguoi_nhan, dau_viec_id, tieu_de, noi_dung, muc, kenh)
  VALUES (_ma_su_kien, _nguoi_nhan, _dau_viec_id, _tieu_de, _noi_dung, _muc,
          CASE WHEN _muc IN ('DO','CHAN') THEN ARRAY['push','bell','email']
               ELSE ARRAY['push','bell'] END);
  RETURN true;
END $ct2n$;

REVOKE ALL ON FUNCTION public.ct2_dat_thong_bao(text, uuid, text, text, text, uuid) FROM PUBLIC, anon, authenticated;

-- Gọi edge function phát push cho các thông báo còn tồn trong hàng đợi
CREATE OR REPLACE FUNCTION public.ct2_kich_hoat_phat_push()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $ct2k$
BEGIN
  -- Dùng đúng khoá đã có trong vault như notify_kanban_update_push, không đẻ
  -- thêm một nơi cất khoá thứ hai.
  PERFORM net.http_post(
    url := 'https://whlysprzsguehxmrjwha.supabase.co/functions/v1/notify-ct2',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets
                                     WHERE name = 'email_queue_service_role_key')
    ),
    body := '{}'::jsonb
  );
EXCEPTION WHEN OTHERS THEN
  -- Push hỏng thì thông báo vẫn nằm trong hàng đợi và hiện ở chuông trong
  -- ứng dụng; tuyệt đối không để việc gửi push làm hỏng giao dịch nghiệp vụ.
  NULL;
END $ct2k$;

REVOKE ALL ON FUNCTION public.ct2_kich_hoat_phat_push() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) N12 — có người trao đổi trên thẻ / @nhắc tên
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_thong_bao_binh_luan()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $ct2bl$
DECLARE
  ten_nguoi_gui text;
  tieu_de_dt text := 'Trao đổi mới';
  nguoi uuid;
  ds_nhan uuid[] := '{}';
  co_gui boolean := false;
BEGIN
  SELECT p.full_name INTO ten_nguoi_gui FROM public.profiles p WHERE p.id = NEW.nguoi_gui;

  -- Người liên quan theo từng loại đối tượng
  IF NEW.pham_vi = 'DAU_VIEC' THEN
    SELECT d.tieu_de, ARRAY[d.nguoi_chiu_trach_nhiem] || COALESCE(d.nguoi_phoi_hop, '{}')
      INTO tieu_de_dt, ds_nhan
      FROM public.ct2_dau_viec d WHERE d.id = NEW.doi_tuong_id;
  ELSIF NEW.pham_vi = 'HO_SO_TIN_DUNG' THEN
    SELECT h.khach_hang, ARRAY[h.can_bo] || COALESCE(ARRAY[h.nguoi_dang_giu], '{}')
      INTO tieu_de_dt, ds_nhan
      FROM public.ct2_ho_so_tin_dung h WHERE h.id = NEW.doi_tuong_id;
  ELSIF NEW.pham_vi = 'THE_KANBAN' THEN
    SELECT c.title, ARRAY[c.profile_id] INTO tieu_de_dt, ds_nhan
      FROM public.kanban_cards c WHERE c.id = NEW.doi_tuong_id;
  END IF;

  -- Người viết bình luận cha (trả lời theo luồng)
  IF NEW.cha_id IS NOT NULL THEN
    SELECT ds_nhan || b.nguoi_gui INTO ds_nhan
      FROM public.ct2_binh_luan b WHERE b.id = NEW.cha_id;
  END IF;

  -- @nhắc tên cộng vào cuối để chắc chắn được nhận
  ds_nhan := COALESCE(ds_nhan, '{}') || COALESCE(NEW.nhac_ten, '{}');

  -- Bỏ NULL và bỏ trùng: một người chỉ nhận đúng một thông báo cho một bình luận
  SELECT COALESCE(ARRAY(SELECT DISTINCT x FROM unnest(ds_nhan) AS x WHERE x IS NOT NULL), '{}')
    INTO ds_nhan;

  FOREACH nguoi IN ARRAY ds_nhan
  LOOP
    IF public.ct2_dat_thong_bao(
         'N12', nguoi,
         CASE WHEN nguoi = ANY(COALESCE(NEW.nhac_ten, '{}'))
              THEN ten_nguoi_gui || ' nhắc tên anh/chị'
              ELSE ten_nguoi_gui || ' vừa trao đổi' END,
         '«' || tieu_de_dt || '»: ' || left(NEW.noi_dung, 160)
           || CASE WHEN NEW.can_tra_loi THEN E'\n↳ Được đánh dấu «Cần trả lời».' ELSE '' END,
         'NHE', CASE WHEN NEW.pham_vi = 'DAU_VIEC' THEN NEW.doi_tuong_id ELSE NULL END
       ) THEN co_gui := true;
    END IF;
  END LOOP;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $ct2bl$;

DROP TRIGGER IF EXISTS trg_ct2_thong_bao_binh_luan ON public.ct2_binh_luan;
CREATE TRIGGER trg_ct2_thong_bao_binh_luan
  AFTER INSERT ON public.ct2_binh_luan
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_thong_bao_binh_luan();

-- ---------------------------------------------------------------------------
-- 4) Đầu việc Chiêu thức 2: giao việc mới · trọng điểm BGĐ · đổi tay
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_thong_bao_dau_viec()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $ct2dv$
DECLARE co_gui boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- N13: được giao đầu việc mới
    IF public.ct2_dat_thong_bao(
         'N13', NEW.nguoi_chiu_trach_nhiem, 'Anh/chị vừa được giao một việc',
         '«' || NEW.tieu_de || '» — hạn '
           || COALESCE(to_char(NEW.han_hoan_thanh, 'DD/MM/YYYY'), 'chưa đặt')
           || '. Khi bắt tay làm, mở thẻ bấm «Bắt đầu làm».',
         'NHE', NEW.id) THEN co_gui := true;
    END IF;

  ELSE
    -- N14: BGĐ đặt mức trọng điểm — mọi người liên quan cần biết ngay
    IF NEW.muc_uu_tien = 'TRONG_DIEM_BGD' AND OLD.muc_uu_tien <> 'TRONG_DIEM_BGD' THEN
      IF public.ct2_dat_thong_bao(
           'N14', NEW.nguoi_chiu_trach_nhiem, 'Ban Giám đốc đặt việc này là TRỌNG ĐIỂM',
           '«' || NEW.tieu_de || '» nay là việc trọng điểm của BGĐ.', 'DO', NEW.id)
      THEN co_gui := true; END IF;
      IF public.ct2_dat_thong_bao(
           'N14', NEW.lanh_dao_theo_doi, 'Ban Giám đốc đặt việc này là TRỌNG ĐIỂM',
           '«' || NEW.tieu_de || '» nay là việc trọng điểm của BGĐ.', 'DO', NEW.id)
      THEN co_gui := true; END IF;
    END IF;

    -- Việc ĐỔI TAY: người nhận cần biết ngay, nếu không thẻ nằm im ở cột chờ
    IF NEW.nguoi_dang_giu IS NOT NULL
       AND NEW.nguoi_dang_giu IS DISTINCT FROM OLD.nguoi_dang_giu THEN
      IF public.ct2_dat_thong_bao(
           'N7', NEW.nguoi_dang_giu, 'Có việc đang chờ ý kiến của anh/chị',
           '«' || NEW.tieu_de || '» vừa được chuyển sang chờ anh/chị. '
             || 'Đồng hồ chờ tính từ bây giờ.', 'NHE', NEW.id)
      THEN co_gui := true; END IF;
    END IF;

    -- N15: thẻ chuyển Hoàn thành → lãnh đạo vào chốt
    IF NEW.trang_thai = 'HOAN_THANH' AND OLD.trang_thai <> 'HOAN_THANH' THEN
      IF public.ct2_dat_thong_bao(
           'N15', NEW.lanh_dao_theo_doi, 'Có việc chờ anh/chị chốt',
           '«' || NEW.tieu_de || '» đã báo hoàn thành, mời anh/chị rà và đóng thẻ.',
           'NHE', NEW.id)
      THEN co_gui := true; END IF;
    END IF;
  END IF;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $ct2dv$;

DROP TRIGGER IF EXISTS trg_ct2_thong_bao_dau_viec ON public.ct2_dau_viec;
CREATE TRIGGER trg_ct2_thong_bao_dau_viec
  AFTER INSERT OR UPDATE ON public.ct2_dau_viec
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_thong_bao_dau_viec();

-- ---------------------------------------------------------------------------
-- 5) Hồ sơ tín dụng: trình lên ai thì người đó biết ngay
--
-- Đây là chỗ push có giá trị nhất trên bàn PDTD: hồ sơ nằm ở cột trình mà
-- người duyệt không biết là mất ngày công, có khi mất cả cơ hội của khách.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_thong_bao_ho_so()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $ct2hs$
DECLARE
  co_gui boolean := false;
  tien text;
BEGIN
  tien := CASE WHEN NEW.so_tien >= 1000
               THEN round(NEW.so_tien / 1000.0, 1)::text || ' tỷ'
               ELSE NEW.so_tien::text || ' triệu' END;

  IF TG_OP = 'INSERT' THEN
    IF public.ct2_dat_thong_bao(
         'HS_GIAO', NEW.can_bo, 'Anh/chị được giao một hồ sơ tín dụng',
         NEW.khach_hang || ' — ' || tien || ', hạn xử lý '
           || COALESCE(to_char(NEW.han_xu_ly, 'DD/MM/YYYY'), 'chưa đặt') || '.', 'NHE', NULL)
    THEN co_gui := true; END IF;

  ELSE
    -- Trình lên cấp trên: người giữ hồ sơ nhận ngay
    IF NEW.nguoi_dang_giu IS NOT NULL
       AND NEW.nguoi_dang_giu IS DISTINCT FROM OLD.nguoi_dang_giu THEN
      IF public.ct2_dat_thong_bao(
           'HS_TRINH', NEW.nguoi_dang_giu, 'Có hồ sơ tín dụng chờ anh/chị',
           NEW.khach_hang || ' — ' || tien
             || '. Hồ sơ vừa được trình lên, đồng hồ chờ tính từ bây giờ.',
           'DO', NULL)
      THEN co_gui := true; END IF;
    END IF;

    -- Duyệt xong quay về cán bộ: họ cần biết để làm bước tiếp
    IF OLD.nguoi_dang_giu IS NOT NULL AND NEW.nguoi_dang_giu IS NULL
       AND NEW.trang_thai <> OLD.trang_thai THEN
      IF public.ct2_dat_thong_bao(
           'HS_TRA', NEW.can_bo, 'Hồ sơ đã có ý kiến cấp trên',
           NEW.khach_hang || ' — ' || tien || ' đã chuyển sang bước tiếp theo.',
           'NHE', NULL)
      THEN co_gui := true; END IF;
    END IF;

    -- Từ chối/dừng: cán bộ phải biết ngay, đây là tin nặng
    IF NEW.trang_thai = 'TU_CHOI' AND OLD.trang_thai <> 'TU_CHOI' THEN
      IF public.ct2_dat_thong_bao(
           'HS_TU_CHOI', NEW.can_bo, 'Hồ sơ bị dừng',
           NEW.khach_hang || ' — ' || tien || '. Lý do: '
             || left(COALESCE(NEW.ly_do_tu_choi, ''), 160), 'DO', NULL)
      THEN co_gui := true; END IF;
    END IF;
  END IF;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $ct2hs$;

DROP TRIGGER IF EXISTS trg_ct2_thong_bao_ho_so ON public.ct2_ho_so_tin_dung;
CREATE TRIGGER trg_ct2_thong_bao_ho_so
  AFTER INSERT OR UPDATE ON public.ct2_ho_so_tin_dung
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_thong_bao_ho_so();

REVOKE ALL ON FUNCTION public.f_ct2_thong_bao_binh_luan() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.f_ct2_thong_bao_dau_viec() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.f_ct2_thong_bao_ho_so() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6) Chuông trong ứng dụng — kênh dự phòng luôn có, kể cả khi từ chối quyền push
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ct2_tb_chua_doc
  ON public.ct2_thong_bao(nguoi_nhan, created_at DESC)
  WHERE doc_luc IS NULL;

CREATE INDEX IF NOT EXISTS idx_ct2_tb_chua_gui
  ON public.ct2_thong_bao(created_at)
  WHERE gui_luc IS NULL;

CREATE OR REPLACE FUNCTION public.ct2_danh_dau_da_doc(_ids uuid[])
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $ct2dd$
DECLARE n int;
BEGIN
  UPDATE public.ct2_thong_bao
     SET doc_luc = now()
   WHERE id = ANY(_ids)
     AND nguoi_nhan = public.get_my_profile_id()
     AND doc_luc IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $ct2dd$;

REVOKE ALL ON FUNCTION public.ct2_danh_dau_da_doc(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_danh_dau_da_doc(uuid[]) TO authenticated;

COMMENT ON TABLE public.ct2_thong_bao IS
  'Hàng đợi thông báo Chiêu thức 2 + PDTD. Trigger nghiệp vụ ghi vào đây qua ct2_dat_thong_bao (đã áp trần 3/ngày và im lặng ngoài giờ); edge function notify-ct2 đọc ra phát Web Push và đánh dấu gui_luc. Chuông trong ứng dụng đọc thẳng bảng này nên luôn hoạt động kể cả khi người dùng từ chối quyền push.';
