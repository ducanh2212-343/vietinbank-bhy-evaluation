-- ============================================================================
-- CHIÊU THỨC 2 — Thông báo CHỈ push + chuông trong app, KHÔNG email
--
-- Quyết định của Giám đốc Chi nhánh 08/2026: Resend có hạn mức (~100
-- email/ngày gói miễn phí) — 150 cán bộ nhận tin vận hành qua email là vỡ
-- hạn ngay tuần đầu. Web Push đi qua hạ tầng trình duyệt (Google/Mozilla/
-- Apple), miễn phí và không giới hạn ở quy mô này.
--
-- Thực trạng lúc đổi: kênh 'email' trong CT2 CHƯA TỪNG gửi email nào —
-- notify-ct2 chỉ đọc kênh 'push', chữ 'email' trong mảng kênh là dự định
-- chưa nối vào Resend. Cắt bây giờ là cắt trước khi nó kịp thành chi phí.
--
-- Ba tầng nhận tin sau thay đổi:
--   🔔 Chuông trong app  — nguồn sự thật, ghi nhận 100%
--   📲 Web Push          — kênh đẩy duy nhất ra ngoài app, mọi mức
--   ✉️ Email             — để dành: đặt lại mật khẩu + digest tuần lãnh đạo
--
-- Điểm yếu biết trước: iPhone chưa «Thêm vào màn hình chính» không nhận
-- push (giới hạn iOS) — đã có EnablePushBanner hướng dẫn; nhịp sáng buộc mở
-- app hằng ngày nên chuông không bị bỏ sót lâu.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ct2_dat_thong_bao(
  _ma_su_kien text, _nguoi_nhan uuid, _tieu_de text, _noi_dung text,
  _muc text DEFAULT 'NHE', _dau_viec_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $ct2tb$
DECLARE
  moc_phat timestamptz;
  tran int := (public.ct2_cau_hinh()).tran_thong_bao;
  da_gui int;
BEGIN
  IF _nguoi_nhan IS NULL THEN RETURN false; END IF;
  IF _nguoi_nhan = public.get_my_profile_id() THEN RETURN false; END IF;

  -- Lưới an toàn: một phép nối chuỗi gặp NULL không được làm hỏng lệnh ghi
  _tieu_de  := COALESCE(NULLIF(trim(_tieu_de), ''), 'Có cập nhật mới');
  _noi_dung := COALESCE(NULLIF(trim(_noi_dung), ''), _tieu_de);

  moc_phat := CASE WHEN _muc = 'CHAN' THEN now() ELSE public.ct2_moc_phat_gan_nhat() END;

  IF _muc = 'NHE' AND _ma_su_kien <> 'N12' THEN
    SELECT count(*) INTO da_gui FROM public.ct2_thong_bao t
     WHERE t.nguoi_nhan = _nguoi_nhan
       AND t.muc = 'NHE'
       AND (t.phat_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
           = (moc_phat AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
    IF da_gui >= tran THEN RETURN false; END IF;
  END IF;

  INSERT INTO public.ct2_thong_bao
    (ma_su_kien, nguoi_nhan, dau_viec_id, tieu_de, noi_dung, muc, kenh, phat_luc)
  VALUES (_ma_su_kien, _nguoi_nhan, _dau_viec_id, _tieu_de, _noi_dung, _muc,
          ARRAY['push','bell'], moc_phat);

  RETURN moc_phat <= now();
END $ct2tb$;
