# Triển khai Chiêu thức 2 — Kanban 5W2H + PDCA (08/2026)

Hiện thực hóa đặc tả `docs/dac-ta-chieu-thuc-2-kanban-5w2h-pdca.md` (v1.0 —
01/08/2026) trên cổng BHY ONE. Đợt này bàn giao **GĐ1 (Lõi) + nền GĐ2**:
mô hình dữ liệu đầy đủ, RLS, Kanban 7 cột, Cổng A/B, nhịp PDCA append-only,
màn M1 «Việc của tôi» + M2 «Bảng của Phòng», chấm giờ nhịp 8h00/8h30 tại
database, hàng đợi thông báo + hàm chốt sổ (chưa nối cron/push — GĐ2).

## Những gì đã dựng

| Lớp | Nội dung | File |
|---|---|---|
| Database | 9 bảng `ct2_*`, trigger cổng nghiệp vụ, RLS, index, 3 RPC | `supabase/migrations/20260806090000_ct2_kanban_5w2h_pdca.sql` |
| Logic thuần | Cổng A/B, luật chuyển trạng thái, WIP, điểm rủi ro, chấm cảnh báo | `src/lib/ct2.ts` (+ 22 test `ct2.test.ts`) |
| Dữ liệu UI | react-query hooks + hàm ghi | `src/components/one/move2/useCt2Data.ts` |
| UI | Kanban 7 cột (kéo-thả), Cổng A, chi tiết thẻ + Cổng B + bình luận, M1 + Ghi nhịp nhanh | `Ct2Board.tsx`, `Ct2CreateDialog.tsx`, `Ct2CardDialog.tsx`, `Ct2MyWork.tsx` |
| Trang | `/one/chieu-thuc-2` — 2 tab M1/M2, hộp duyệt đề xuất | `src/pages/one/OneMove2Page.tsx` |

Bản Kanban KHHĐ tối giản cũ (bảng `action_plans`, 3 cột todo/doing/done) được
**thay thế trên UI**; bảng cũ và dữ liệu cũ giữ nguyên trong database, không xóa.

## Ánh xạ vai trò đặc tả → hệ thống hiện có

| Đặc tả | Hệ thống |
|---|---|
| `CAN_BO` | role `employee` — chỉ «Đề xuất việc» (2 trường), ghi nhịp thẻ mình phụ trách |
| `PHO_PHONG` / `TRUONG_PHONG` | role `manager` (Trưởng phòng chính danh = `departments.manager_id`) |
| `BAN_GIAM_DOC` | role `bgd` (toàn CN) + `pgd` (phòng phụ trách qua `get_my_pgd_scope_dept_ids`) |
| `TCTH_QUANTRI` | `tcth_admin` / `system_admin` / `is_tcth_leader()` |

Tầng «Kế hoạch hành động (phòng × kỳ)» = cặp (`phong`, `cycle_id`) trên đầu
việc — kỳ dùng chung `evaluation_cycles`, không tạo bảng riêng.

## Các cổng nghiệp vụ cài ở TẦNG DATABASE (không chỉ giao diện)

- **Cổng A:** cán bộ thường không INSERT được `ct2_dau_viec` (trigger + RLS);
  liên phòng chỉ Phó phòng trở lên; «Trọng điểm BGĐ» chỉ BGĐ đặt.
- **PDCA khép vòng ở cấp thẻ:** P trước «Đang làm» · C + 100% trước «Hoàn
  thành» · A trước «Đã đóng» · Dừng/Hủy cần lý do ≥ 30 ký tự và quyền lãnh đạo.
- **Nhật ký nhịp append-only:** không có policy UPDATE/DELETE cho mọi vai trò.
- **Chống điền cho có:** từ chối câu nhịp trùng 100% dòng gần nhất; cờ 🟡/🔴
  bắt buộc tách «Đang vướng vì…» + «Hôm nay tôi làm…».
- **Chấm giờ tại DB:** `dung_nhip` tính theo `Asia/Ho_Chi_Minh` lúc INSERT —
  trước 8h00 `DUNG_GIO`, 8h00–8h30 `MUON` (lãnh đạo phòng vẫn `DUNG_GIO` —
  khung riêng của lãnh đạo), sau 8h30 `MAT_NHIP`. Thẻ THƯỜNG TRỰC / thẻ ở cột
  chờ → `KHONG_TINH` (không vào mẫu số — công bằng theo đặc tả §5.2).
- **Đồng hồ đổi chủ:** vào cột chờ bắt buộc chọn `nguoi_dang_giu`, `giu_tu`
  tự đặt; rời cột chờ tự xóa. Tuổi chờ > 3 ngày hiện cảnh báo theo NGƯỜI GIỮ.
- **Vết thay đổi:** lùi hạn / đổi trạng thái / đổi chủ thẻ / đổi ưu tiên ghi
  vào `ct2_nhat_ky_thay_doi`; `han_goc` giữ hạn ban đầu để đo việc lùi hạn.
- **Người phụ trách không phải lãnh đạo** chỉ sửa được nhóm trường vận hành
  (trạng thái, %, cờ, người giữ) — trigger chặn sửa 5W2H/hạn/ưu tiên.

## Thiết kế cho 150 người cùng vào khung 7h50–8h30

Kịch bản nóng nhất: ~150 cán bộ mở M1 và ghi nhịp trong ~40 phút.

1. **Mỗi màn hình nóng đúng 1 vòng gọi.** M1 = RPC `ct2_viec_cua_toi()` (đi
   qua partial index `idx_ct2_dv_nguoi_active`, trả kèm cờ «đã ghi hôm nay»);
   M2 = 1 select theo `(phong, trang_thai)` + RPC `ct2_nhip_phong_hom_nay`.
2. **Ghi nhịp = 1 INSERT** + 2 trigger nhỏ (1 SELECT dòng gần nhất theo index
   `idx_ct2_nhip_dv`, 1 UPDATE thẻ theo khóa chính). Không khóa bảng, không
   serializable — 150 insert/phút là tải rất nhẹ với Postgres.
3. **RLS rẻ:** mọi policy chỉ gọi hàm `STABLE SECURITY DEFINER` (cache trong
   statement), không subquery lồng theo dòng ngoài các EXISTS có index.
4. **react-query:** staleTime 30s cho dữ liệu nóng, 5 phút cho danh mục; đổi
   tab không dội thêm query; sau thao tác ghi chỉ invalidate đúng nhóm key.
5. **Không realtime subscription:** 150 websocket cùng lúc đắt và không cần —
   bảng làm mới theo thao tác/refocus. (Có thể bật realtime cho M2 ở GĐ sau
   nếu thực tế cần.)
6. **Bảng/board chỉ tải phòng đang xem** (≤ vài trăm thẻ), không tải toàn CN.
7. Nhật ký/bình luận **chỉ tải khi mở thẻ**, giới hạn 200–300 dòng mới nhất.

## Việc vận hành cần làm khi triển khai

1. **Áp migration** `20260806090000_ct2_kanban_5w2h_pdca.sql` vào project
   `whlysprzsguehxmrjwha` (SQL Editor hoặc `supabase db push`). Chưa áp thì
   trang hiện lời nhắc, không trắng màn.
2. (Khuyến nghị) regenerate `src/integrations/supabase/types.ts` — code hiện
   ép kiểu tại ranh giới truy vấn nên không bắt buộc.
3. **GĐ2 — tác vụ định giờ** (pg_cron hoặc Scheduled Edge Function, giờ UTC):
   - 01:00 UTC (8h00 VN): `select public.ct2_chot_so_nhip();` → ảnh chụp nhịp.
   - 07:00/08:05/08:35/17:30 VN: sinh thông báo N1–N11 vào `ct2_thong_bao` và
     phát Web Push (mẫu sẵn: `notify-kanban-update`, `send-reminders`).
     Trần 3 thông báo nhắc/người/ngày + gộp theo người xử lý ở tầng phát.
4. **Chưa bật thi đua** — theo đặc tả §12 chỉ bật sau ≥ 4 tuần chạy thật với
   tỷ lệ nhịp ≥ 70% và thẻ đủ 5W2H ≥ 90%.

## Phạm vi GĐ sau (chưa làm đợt này)

- M3 chiến dịch liên phòng (bản đồ phụ thuộc/nút thắt), M4 toàn cảnh BGĐ,
  M5 giám sát TCTH + bộ phát hiện bất thường, M6 chế độ giao ban.
- 4 chế độ xem Bảng/Lịch/Gantt; bulk edit; xuất Word/PDF/Excel.
- N1–N17 tự động + email; khai báo nghỉ phép để miễn nhịp (`ket_qua = MIEN`
  đã có chỗ trong `ct2_anh_chup_nhip`).
- Nhập lịch sử từ board Miro (đề xuất mở rộng §14).
