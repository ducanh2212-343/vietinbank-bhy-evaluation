-- ============================================================================
-- BHY Ideas — SỬA NGUỒN CÔNG NHẬN CỦA 20 Ý TƯỞNG BÉN RỄ
--
-- Làm rõ từ vận hành (08/2026): các ý tưởng hiện đang ở cấp Bén rễ có được cấp
-- đó là do **Trụ sở chính đồng ý triển khai**; Phòng TCTH khớp số liệu trên SMP
-- rồi tự chuyển cấp độ. KHÔNG có bước Giám đốc Chi nhánh phê duyệt.
--
-- Migration nạp dữ liệu 20260926090000 đã giả định ngược lại — thấy ý tưởng ở
-- cấp Bén rễ là ghi duyet_cn = true (Chi nhánh duyệt). Hai hệ quả nếu để nguyên:
--
--   1. Dấu vết sai vĩnh viễn: sổ nói Chi nhánh công nhận, thực tế là TSC.
--      Đến kỳ đối chiếu hay thanh tra thì không giải trình được.
--   2. Màn đối chiếu SMP hiện 134/134 «chưa gửi», che mất việc đã có 20 ý tưởng
--      được TSC đồng ý — TCTH nhìn vào tưởng chưa ai gửi gì lên Trụ sở chính.
--
-- Hai cờ duyet_cn và duyet_tsc vốn ĐỘC LẬP và có thể cùng bật (chốt 08/2026:
-- "cứ họ đề xuất lên SMP thì cũng sẽ nhập ở đây, CN sẽ duyệt hoặc TSC sẽ
-- duyệt"). Ở đây chuyển hẳn sang TSC vì Chi nhánh chưa từng duyệt các ý tưởng
-- này; sau này Chi nhánh có duyệt thêm thì bật duyet_cn lên, không xung đột.
--
-- KHÔNG đụng tới tiền và KPI: TSC phê duyệt cũng là căn cứ ghi nhận Bén rễ theo
-- quy chế mục 4, nên ghi_nhan_kpi giữ true và muc_thuong giữ 300.000đ/ý tưởng.
-- Chỉ sửa NGUỒN công nhận, không sửa KẾT QUẢ công nhận.
--
-- Đảo ngược nếu cần: cập nhật ngược duyet_cn/duyet_tsc theo ghi_chu đánh dấu
-- dưới đây, và đưa smp_trang_thai về 'chua_gui'.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Sổ ghi nhận: chuyển nguồn từ Chi nhánh sang Trụ sở chính
--
--    Chỉ đụng đúng các dòng do migration nạp dữ liệu sinh ra (nhận diện bằng
--    ghi_chu) và chưa từng có người duyệt thật. Dòng nào đã đi qua luồng Giám
--    đốc phê duyệt (nguoi_duyet IS NOT NULL) thì GIỮ NGUYÊN — đó là dữ liệu
--    thật, không phải giả định của migration.
-- ---------------------------------------------------------------------------
UPDATE public.portal_idea_awards
SET duyet_cn = false,
    duyet_tsc = true,
    ghi_chu = 'TSC đồng ý triển khai — TCTH khớp số liệu SMP và chuyển cấp độ (sửa nguồn công nhận 10/2026, trước đó ghi nhầm là Chi nhánh duyệt)'
WHERE cap_do = 'Bén rễ'
  AND trang_thai = 'da_ghi_nhan'
  AND nguoi_duyet IS NULL
  AND duyet_cn
  AND NOT duyet_tsc
  AND ghi_chu = 'Nạp từ cấp độ phát triển hiện có trước 16/08/2026';

-- ---------------------------------------------------------------------------
-- 2) Trạng thái SMP: các ý tưởng này TSC đã đồng ý
--
--    Để 'dong_y' vì vận hành nêu "TSC đồng ý triển khai". Trường hợp nào thực
--    ra là "Đồng ý một phần" thì TCTH sửa lại từng ý tưởng ở màn đối chiếu SMP;
--    mã SMP để trống, TCTH bổ sung dần khi tra lại trên hệ thống Trụ sở chính.
-- ---------------------------------------------------------------------------
UPDATE public.portal_ideas i
SET smp_trang_thai = 'dong_y',
    smp_cap_nhat_luc = now()
WHERE i.smp_trang_thai = 'chua_gui'
  AND EXISTS (
    SELECT 1 FROM public.portal_idea_awards a
    WHERE a.idea_id = i.id
      AND a.cap_do = 'Bén rễ'
      AND a.duyet_tsc
      AND a.trang_thai = 'da_ghi_nhan'
  );
