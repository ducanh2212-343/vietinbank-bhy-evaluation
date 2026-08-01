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
| Logic thuần | Cổng 1/2 + Cổng B, luật chuyển trạng thái, WIP, điểm rủi ro, chấm cảnh báo | `src/lib/ct2.ts` (+ 25 test `ct2.test.ts`) |
| Dữ liệu UI | react-query hooks + hàm ghi | `src/components/one/move2/useCt2Data.ts` |
| UI | Kanban 7 cột (kéo-thả), Cổng 1 ghi việc, Cổng 2 lập kế hoạch, chi tiết thẻ + Cổng B + bình luận, M1 + Ghi nhịp nhanh | `Ct2Board.tsx`, `Ct2CreateDialog.tsx`, `Ct2PlanDialog.tsx`, `Ct2CardDialog.tsx`, `Ct2MyWork.tsx` |
| Trang | `/one/chieu-thuc-2` — 2 tab M1/M2, hộp duyệt đề xuất | `src/pages/one/OneMove2Page.tsx` |

Bản Kanban KHHĐ tối giản cũ (bảng `action_plans`, 3 cột todo/doing/done) được
**thay thế trên UI**; bảng cũ và dữ liệu cũ giữ nguyên trong database, không xóa.

## Ánh xạ vai trò đặc tả → hệ thống hiện có

| Đặc tả | Hệ thống |
|---|---|
| `CAN_BO` | role `employee` — tự ghi được việc chủ động của chính mình; giao việc cho người khác thì thành «Đề xuất»; ghi nhịp thẻ mình phụ trách |
| `PHO_PHONG` / `TRUONG_PHONG` | role `manager` (Trưởng phòng chính danh = `departments.manager_id`) |
| `BAN_GIAM_DOC` | role `bgd` (toàn CN) + `pgd` (phòng phụ trách qua `get_my_pgd_scope_dept_ids`) |
| `TCTH_QUANTRI` | `tcth_admin` / `system_admin` / `is_tcth_leader()` |

Tầng «Kế hoạch hành động (phòng × kỳ)» = cặp (`phong`, `cycle_id`) trên đầu
việc — kỳ dùng chung `evaluation_cycles`, không tạo bảng riêng.

## Cách nhập: hai cổng thay vì một (điều chỉnh 08/2026)

Bản đầu dựng 11 ô rời theo đặc tả §3.1; bản thứ hai gộp 5 ô chữ vào một ô nhiều
dòng. Cả hai đều chưa ổn trên điện thoại. Nghiên cứu đầy đủ về người dùng, về
Miro và về mâu thuẫn giữa hai văn bản nội bộ:
`docs/nghien-cuu-cach-nhap-kanban-cho-can-bo-2026-08.md`.

Chốt lại: **giữ chặn cứng, đặt đúng cửa.**

| | Cổng 1 — Ghi việc | Cổng 2 — Bắt đầu làm |
|---|---|---|
| Khi nào | Lúc nghĩ ra / nghe chỉ đạo | Khi chuẩn bị bắt tay làm |
| Hỏi gì | Việc gì · Ai làm · Xong khi nào | Xong thì có gì · Phục vụ mục tiêu nào · Làm mấy bước |
| Kết quả | Thẻ vào cột «Chuẩn bị» | Thẻ sang «Đang làm» + sinh dòng Plan (P) |
| Mất bao lâu | < 30 giây | ~60 giây |

Cổng 2 chính là bước P của PDCA nên không phát sinh thủ tục mới. Không thẻ nào
đang chạy mà thiếu 5W2H, nhưng không ai bị chặn ở giây thứ 20.

Điểm chính trong giao diện:
- Bỏ hẳn thuật ngữ 5W2H/agile khỏi màn nhập; chữ «đã đủ 5W2H» chỉ hiện ở màn
  cuối Cổng 2 như một lời khen.
- Cổng 2 mỗi màn hình một câu hỏi, có chấm tiến độ 4 bước.
- Ba ô ngắn B1/B2/B3 thay ô «cách làm ≥ 30 ký tự»; hệ thống đếm **số bước**,
  không hiện ràng buộc ký tự cho người dùng.
- Hạn chọn bằng chip đời thường (Cuối tuần này · Trong 2 tuần · Cuối tháng).
- Mặc định đúng để bỏ 4 trường khỏi màn hình: người làm = chính mình, lãnh đạo
  theo dõi = Trưởng phòng, ngày bắt đầu = hôm nay, phạm vi suy từ liên phòng.
- Bỏ ô «Loại đầu việc»: Kanban này chỉ dùng cho việc có điểm kết thúc.
- Câu Plan (P) hệ thống viết sẵn từ kế hoạch vừa nhập — không gõ lại lần hai.

### Ba nguồn việc (cột `nguon_viec`)

📋 Kế hoạch hành động · 🗣️ Chỉ đạo giao ban tuần/tháng · 💡 Phòng/cán bộ chủ động.
Việc lặp hằng ngày **không** vào bảng này. Nguồn «giao ban» có ô ghi tên cuộc họp
và ô chọn «ghi tiếp chỉ đạo khác của cùng cuộc họp» để nhập liền mạch nhiều việc.

### Cán bộ tự ghi được việc chủ động của mình

Khe hẹp có chủ đích: tự nhận việc, trong phòng mình, không liên phòng, không tự
phong mức ưu tiên (chặn ở cả RLS lẫn trigger). Giao việc cho người khác vẫn phải
là lãnh đạo — chọn người khác ở ô «Ai làm» thì hệ thống tự chuyển thành đề xuất.

## Các cổng nghiệp vụ cài ở TẦNG DATABASE (không chỉ giao diện)

- **Cổng 1 (ghi việc):** cán bộ chỉ INSERT được thẻ tự nhận việc, trong phòng
  mình, không liên phòng, không tự phong ưu tiên (trigger + RLS);
  liên phòng chỉ Phó phòng trở lên; «Trọng điểm BGĐ» chỉ BGĐ đặt.
- **Cổng 2 (khởi động):** `CHUAN_BI → DANG_LAM` bắt buộc đủ kết quả đầu ra,
  mục tiêu, các bước và dòng Plan (P) — kiểm ở trigger, không chỉ ở giao diện.
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

1. ~~Áp migration~~ **ĐÃ ÁP (01/08/2026)** vào project `whlysprzsguehxmrjwha`
   qua MCP `apply_migration`, gồm 3 bản ghi migration trên server:
   - `ct2_prerequisite_helpers` — 3 hàm nền `is_dept_manager`,
     `can_view_all_action_plans`, `is_my_scope_department`. Cần bản bổ trợ này
     vì kiểm tra thực tế cho thấy các migration quizzi (`20260721090000`) và
     action_plans (`20260805090000`) trong repo **chưa từng được áp** vào
     database (không có bảng `quiz_*`/`action_plans` nào trên server).
   - `ct2_kanban_5w2h_pdca` — toàn bộ schema/trigger/RLS/RPC (đã sửa
     `is_staff()` → `is_staff(auth.uid())` cho khớp chữ ký hàm thật trên DB).
   - `ct2_harden_trigger_functions` — thu hồi EXECUTE trên các hàm trigger
     `f_ct2_*` theo khuyến nghị security advisor.
   - `ct2_cong_nhap_hai_buoc` — cột `nguon_viec`/`cuoc_hop`, nới NOT NULL ba
     trường 5W2H, Cổng 2 ở trigger, khe hẹp cho cán bộ tự ghi việc chủ động.
   Đã kiểm chứng sau khi áp: 9 bảng `ct2_*` đều bật RLS, 21 policy, 12 hàm;
   security advisor không còn cảnh báo nào cho nhóm `ct2_*`.
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
