# Dấu ấn Bắc Hưng Yên Mark — thiết kế tích hợp vào hệ thống

*Tài liệu thiết kế (Pha 0) — tháng 7/2026. Nguồn: file khung của Ban Giám đốc
`Bac_Hung_Yen_Mark_Khung_BGD_T7_T8_2026.docx` (kỳ T7–T8/2026, bản dự thảo thống nhất khung;
chỉ tiêu định lượng bổ sung sau).*

## 1. Bài toán

Giám đốc giao mỗi Phó Giám đốc một bộ **4 "dấu ấn"** (3 PGĐ × 4 = 12 dấu ấn). Mỗi dấu ấn
quy chiếu thống nhất về:

- **01 năng lực lãnh đạo trọng tâm** (Tầm nhìn chiến lược / Chuyển đổi số / Cân bằng rủi ro
  và phát triển…),
- **01 năng lực cốt lõi bổ trợ** (trong 5 giá trị: Chính trực – Trí tuệ – Tận tâm – Thấu cảm
  – Thích ứng),
- **tối đa 02 Skill** trong bộ 38 Skill của Chi nhánh,
- mô tả yêu cầu, và **chuẩn đầu ra**: kết quả thực tế + bằng chứng vai trò lãnh đạo cá nhân
  + sản phẩm quản trị để lại + trình bày cuối kỳ theo **STAR** (Bối cảnh – Nhiệm vụ – Hành
  động – Kết quả).

Yêu cầu tích hợp: gắn với kỳ tự đánh giá hiện hành (Quý II/2026), hiển thị thành thẻ trên
Kanban "Hành động phát triển" của từng PGĐ, và **về sau xuất được "hành trình tạo dấu ấn"
theo khung năng lực và theo skill**.

## 2. Nguyên tắc thiết kế

1. **Không nhét dấu ấn vào phiếu tự đánh giá.** Dấu ấn là nhiệm vụ lãnh đạo giao từ trên
   xuống, vòng đời khác phiếu (nộp – TP rà soát – PGĐ duyệt). Nó có bảng riêng
   `leadership_marks` và tự sinh thẻ Kanban loại `manager_assigned` — đúng "chỗ trống" đã
   có sẵn trong CHECK constraint của `kanban_cards.source_type` nhưng chưa có nguồn nào dùng.
2. **Số hóa khung năng lực có cấu trúc** thay vì lưu chữ tự do: 2 danh mục nhỏ
   `leadership_competencies` (năng lực lãnh đạo) và `core_values` (5 giá trị cốt lõi) để dấu
   ấn tham chiếu theo id → lọc, thống kê và xuất báo cáo theo năng lực về sau không phải
   "đoán chuỗi". Đây là bước đầu tiên đưa Sổ tay Khung năng lực (10/2025) vào hệ thống,
   phạm vi tối thiểu đủ dùng.
3. **Tái dùng tối đa cơ chế Kanban hiện có**: PGĐ cập nhật tiến độ, gửi hoàn thành, GĐ xác
   nhận — đúng luồng todo → doing → done → confirm mà toàn chi nhánh đã quen; lịch sử nằm ở
   `kanban_card_logs` nên hành trình dấu ấn có mốc thời gian miễn phí.
4. **Chỉ 3 PGĐ ở giai đoạn 1**, nhưng mô hình tổng quát (profile_id bất kỳ) để sau mở cho
   TP/cán bộ nếu muốn.

## 3. Mô hình dữ liệu (migration `leadership_marks`)

```
leadership_competencies   id · code (LC01…) · name · sort_order · is_active
core_values               id · code (CV01…) · name · sort_order
leadership_marks          id · profile_id → profiles · cycle_id → evaluation_cycles
                          · title · description · role_focus
                          · leadership_competency_id → leadership_competencies
                          · core_value_id → core_values
                          · status (draft|active|confirmed|archived)
                          · star_situation/star_task/star_action/star_result
                          · deliverable (sản phẩm quản trị để lại)
                          · deadline · sort_order · created_by · timestamps
leadership_mark_skills    mark_id + skill_id (→ skill_catalog) · sort_order — tối đa 2/mark
kanban_cards              + leadership_mark_id (FK, nullable) · form_id nới thành NULLABLE
```

- `form_id` của `kanban_cards` trước nay NOT NULL vì mọi thẻ đều sinh từ phiếu; thẻ dấu ấn
  không có phiếu nên cột được nới NULLABLE (các key dedupe phía client dùng
  `form_id || ''` nên không vỡ).
- Giới hạn 2 skill/dấu ấn enforce bằng trigger trên `leadership_mark_skills`.

### RLS

| Bảng | SELECT | INSERT/DELETE | UPDATE |
|---|---|---|---|
| 2 danh mục | mọi user đăng nhập | admin (system_admin/bgd/tcth_admin) | admin |
| leadership_marks | chủ dấu ấn + `can_view_profile` + admin | admin | chủ dấu ấn (chỉ STAR + deliverable, guard trigger chặn cột hệ thống) · admin toàn quyền |
| leadership_mark_skills | theo quyền xem mark | admin | admin |

`anon` bị REVOKE toàn bộ (theo chuẩn hardening 07/2026). Vì Login là màn pre-auth nên 5 giá
trị cốt lõi hiển thị ở đó **không đọc từ DB** — frontend dùng hằng số chung
`src/lib/coreValues.ts` (một nguồn duy nhất cho Login + AnniversaryBanner, mirror đúng seed
`core_values`); bảng DB là nguồn chuẩn cho dữ liệu nghiệp vụ (join, export).

## 4. Sinh thẻ Kanban

- Mở rộng `kanban_upsert_card`: khi `_source_table = 'leadership_marks'`, lấy
  `profile_id`/`cycle_id` từ chính bảng `leadership_marks` (không qua `form_submissions`),
  ghi `form_id = NULL` và set `leadership_mark_id`. Nhánh cũ giữ nguyên.
- Trigger `sync_kanban_leadership_mark` (AFTER INSERT/UPDATE trên `leadership_marks`):
  status `active` → upsert thẻ (title, deadline, skill chính = skill sort_order nhỏ nhất);
  status `archived` → archive thẻ. Thay đổi ở `leadership_mark_skills` cũng re-sync skill
  của thẻ.
- Kết quả: 12 thẻ trên Kanban của 3 PGĐ, badge **"Dấu ấn"** (khi thẻ có
  `leadership_mark_id`; các thẻ `manager_assigned` khác vẫn hiện "Lãnh đạo giao").

## 5. Mapping 12 dấu ấn (seed)

Danh mục năng lực lãnh đạo seed từ file khung: **LC01 Tầm nhìn chiến lược · LC02 Chuyển đổi
số · LC03 Cân bằng rủi ro và phát triển** (mở rộng dần khi số hóa tiếp Sổ tay). Giá trị cốt
lõi: CV01 Chính trực · CV02 Trí tuệ · CV03 Tận tâm · CV04 Thấu cảm · CV05 Thích ứng.

### Anh Nguyễn Đức Thái Hoàng — *FDI · KHDN · quản trị rủi ro tín dụng và xử lý nợ*

| # | Dấu ấn | Năng lực LĐ | Giá trị | Skill |
|---|---|---|---|---|
| 1 | Công cụ hỗ trợ giao tiếp toàn diện với khách hàng FDI | Chuyển đổi số | Thấu cảm | SK16, SK07 |
| 2 | Phương thức phân luồng xử lý nợ Mỹ Hương | Cân bằng rủi ro và phát triển | Tận tâm | SK21, SK33 |
| 3 | Đầu mối Khối KHDN tại Chi nhánh | Tầm nhìn chiến lược | Trí tuệ | SK35, SK38 |
| 4 | Huy động vốn (KHDN + PGD Văn Lâm) | Tầm nhìn chiến lược | Tận tâm | SK04, SK27 |

### Chị Nguyễn Thị Thùy Linh — *đầu mối Bán lẻ · kiểm tra toàn diện · marketing online*

| # | Dấu ấn | Năng lực LĐ | Giá trị | Skill |
|---|---|---|---|---|
| 1 | Điều hành tiếp đoàn kiểm tra toàn diện của Phòng KTKSNB TSC | Cân bằng rủi ro và phát triển | Chính trực | SK34, SK38 |
| 2 | Marketing online và chỉ đạo Tổ truyền thông | Chuyển đổi số | Thấu cảm | SK07, SK38 |
| 3 | Đầu mối Khối Bán lẻ tại Chi nhánh | Tầm nhìn chiến lược | Thích ứng | SK35, SK38 |
| 4 | Huy động vốn (Bán lẻ + PGD Khoái Châu) | Tầm nhìn chiến lược | Thấu cảm | SK08, SK27 |

### Chị Phạm Minh Hải — *chuyển đổi PGD Ocean City · chất lượng dịch vụ · hệ sinh thái số*

| # | Dấu ấn | Năng lực LĐ | Giá trị | Skill |
|---|---|---|---|---|
| 1 | Chuyển tên, di chuyển PGD Yên Mỹ sang Ocean City | Tầm nhìn chiến lược | Thấu cảm | SK35, SK08 |
| 2 | Thí điểm Digital Creator Ocean City và Ecopark | Chuyển đổi số | Trí tuệ | SK07, SK26 |
| 3 | Đầu mối chất lượng dịch vụ của Chi nhánh | Tầm nhìn chiến lược | Thấu cảm | SK25, SK18 |
| 4 | Huy động vốn (DVKH + PGD Văn Giang/Ân Thi/Yên Mỹ) | Tầm nhìn chiến lược | Tận tâm | SK08, SK31 |

Gắn kỳ: **Quý II/2026** (kỳ `in_progress` hiện hành — đúng kỳ tự đánh giá đang chạy đầu
tháng 7). Hạn trên thẻ Kanban: **31/08/2026** (hết kỳ T7–T8 của khung dấu ấn).

## 6. Luồng vận hành

1. **GĐ/admin** vào trang **Dấu ấn** (`/dau-an`): xem/sửa khung 12 dấu ấn (đã seed sẵn),
   có thể thêm dấu ấn mới → thẻ Kanban tự sinh cho đúng PGĐ.
2. **PGĐ** thấy thẻ "Dấu ấn" trên Kanban cá nhân, kéo todo → doing, cập nhật tiến độ hằng
   tuần như mọi thẻ khác; trên trang Dấu ấn nhập dần **STAR + sản phẩm để lại**.
3. Cuối kỳ PGĐ **gửi hoàn thành** trên thẻ; **GĐ xác nhận** (luồng confirm sẵn có). GĐ có
   thể chuyển status dấu ấn sang `confirmed` — chỉ ghi nhận khi chứng minh được vai trò
   lãnh đạo cá nhân (nguyên tắc trong khung).
4. **Xuất hành trình** (`exportLeadershipJourney`): docx theo từng PGĐ, nhóm theo năng lực
   lãnh đạo và theo skill, kèm STAR, sản phẩm để lại và dòng thời gian tiến độ lấy từ
   `kanban_card_logs`.

## 7. Ngoài phạm vi giai đoạn này

- Chỉ tiêu định lượng của từng dấu ấn (file khung ghi rõ "bổ sung sau") — khi có sẽ thêm
  cột/bảng chỉ tiêu.
- Mở dấu ấn cho TP/cán bộ; chấm điểm dấu ấn qua Hội đồng.
- Số hóa đầy đủ Sổ tay Khung năng lực (10/2025) — hiện chỉ seed các năng lực xuất hiện
  trong khung dấu ấn.
