-- BỎ TRẦN THÔNG BÁO (09/08/2026) — theo yêu cầu Giám đốc: "bỏ trần tin đi, tôi không
-- thấy có giá trị".
--
-- Đối chiếu số liệu trước khi bỏ: trần chỉ từng chặn đúng MỘT loại tin là 'N15' —
-- «Có việc chờ anh/chị chốt», tức thẻ cán bộ đã báo hoàn thành và đang đợi lãnh đạo rà
-- rồi đóng. Đã chặn 7 lượt (người, ngày). Nghĩa là hôm nào một lãnh đạo có từ 4 việc chờ
-- chốt trở lên thì từ việc thứ tư trở đi KHÔNG AI BÁO — đúng loại tin cần hành động nhất
-- lại là loại bị nuốt. Hai loại ồn nhất (NHIP, N12) vốn đã được miễn trừ từ trước, nên
-- trần không hề làm được việc mà nó sinh ra để làm.
--
-- Hàng rào chống phiền còn lại vẫn nguyên: tin sinh ngoài khung 07:00–18:00 vẫn bị HOÃN
-- sang mốc phát kế tiếp (ct2_moc_phat_gan_nhat), và mức ⛔ CHAN vẫn báo ngay bất kể giờ.
-- Bỏ trần chỉ bỏ việc đếm số tin, không bỏ khung giờ yên tĩnh.
--
-- Cột ct2_cau_hinh_thoi_gian.tran_thong_bao giữ lại để không phá kiểu dữ liệu phía client
-- đang select, nhưng từ nay KHÔNG CÒN ĐƯỢC ĐỌC. Ô nhập tương ứng trên màn «Cài đặt ngày
-- giờ» đã gỡ trong cùng đợt — để lại một ô chỉnh được mà không có tác dụng gì là cái bẫy
-- cho người đến sau.
--
-- Đã kiểm chứng trên database thật (giao dịch có rollback): đặt 5 tin N15 liên tiếp cho
-- cùng một người trong cùng ngày → ghi đủ 5/5. Trước khi bỏ trần chỉ ghi được 3.

CREATE OR REPLACE FUNCTION public.ct2_dat_thong_bao(
  _ma_su_kien text, _nguoi_nhan uuid, _tieu_de text, _noi_dung text,
  _muc text DEFAULT 'NHE'::text, _dau_viec_id uuid DEFAULT NULL::uuid,
  _ho_so_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  moc_phat timestamptz;
BEGIN
  IF _nguoi_nhan IS NULL THEN RETURN false; END IF;
  IF _nguoi_nhan = public.get_my_profile_id() THEN RETURN false; END IF;

  _tieu_de  := COALESCE(NULLIF(trim(_tieu_de), ''), 'Có cập nhật mới');
  _noi_dung := COALESCE(NULLIF(trim(_noi_dung), ''), _tieu_de);

  -- Mức CHẶN báo ngay; các mức còn lại chờ mốc phát gần nhất trong khung yên tĩnh.
  moc_phat := CASE WHEN _muc = 'CHAN' THEN now() ELSE public.ct2_moc_phat_gan_nhat() END;

  INSERT INTO public.ct2_thong_bao
    (ma_su_kien, nguoi_nhan, dau_viec_id, ho_so_id, tieu_de, noi_dung, muc, kenh, phat_luc)
  VALUES (_ma_su_kien, _nguoi_nhan, _dau_viec_id, _ho_so_id, _tieu_de, _noi_dung, _muc,
          ARRAY['push','bell'], moc_phat);

  RETURN moc_phat <= now();
END $function$;

COMMENT ON COLUMN public.ct2_cau_hinh_thoi_gian.tran_thong_bao IS
  'ĐÃ NGỪNG DÙNG 09/08/2026: trần thông báo bị bỏ theo yêu cầu Giám đốc vì nó chỉ chặn được N15 (việc chờ chốt) — đúng loại tin cần hành động nhất. Giữ cột để không phá kiểu dữ liệu client; không hàm nào còn đọc.';
