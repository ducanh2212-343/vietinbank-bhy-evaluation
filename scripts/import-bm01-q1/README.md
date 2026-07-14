# Import hành động BM01 Quý I/2026 (bản Word/PDF) vào hệ thống

## Bối cảnh

Kỳ Quý I/2026, Chiêu thức số 3 thực hiện **Biểu mẫu 01 trên bản Word/PDF**
(theo Phụ lục công văn cũ), không nhập trên app. Các kế hoạch hành động của
từng cán bộ được trích xuất từ Google Drive ra file Excel
`BM01_toan_bo_cap_nhat_chot_Word_PDF_*.xlsx` (sheet `Bang hanh dong Word`,
447 hành động / 95 cán bộ: nhóm **2.1 Phát triển năng lực** và **2.2 Gắn với AI**).

Script `generate_seed.py` sinh 1 file SQL nhập dữ liệu đó vào Supabase để
mục **"Rà soát hành động kỳ trước"** trong Biểu mẫu 02 hiển thị và PDCA được
các hành động Quý I (cán bộ tự đánh giá, CBQL xác nhận, chuyển hành động chưa
hoàn thành sang kế hoạch Quý III).

## Dữ liệu được ghi vào đâu

Mỗi cán bộ khớp được profile sẽ có:

- 1 dòng `form_submissions` cycle **Quý I/2026**, `status='approved'`,
  `manager_comment` chứa marker `[IMPORT-BM01-Q1]` (dùng để nhận diện/xoá khi chạy lại).
- Hành động 2.1 → `form_skill_priorities` (1 dòng/skill) + `form_skill_actions`.
  Skill lấy từ ghi chú "Skill NN" trong hành động; nếu không có thì theo file
  `manual_skill_map.csv` (phân loại thủ công theo nội dung, có cột độ tin cậy).
- Hành động 2.2 → `form_ai_actions_v2`.
- Thẻ kanban do trigger `sync_kanban_*` sinh ra được archive (`is_active=false`)
  để không làm ngập Kanban cá nhân bằng thẻ Quý I đã quá hạn.

**Không seed** `skill_assessments` (bản giấy không đánh giá theo level) — kỳ
Quý II cán bộ đánh giá lại toàn bộ skill + thái độ từ đầu (BM02 đã tắt auto
carry-over, xem `src/pages/BM02Page.tsx`).

## Cách chạy

Dữ liệu cá nhân (Excel, profiles) **không commit vào repo** — truyền qua tham số:

```sh
# 1. Xuất tham chiếu từ Supabase (SQL Editor):
#    profiles.json:  SELECT json_agg(t) FROM (SELECT p.id, p.full_name, d.name AS dept
#                    FROM profiles p LEFT JOIN departments d ON d.id=p.department_id
#                    WHERE p.status='active') t;
#    skills.json:    SELECT json_object_agg(code, id) FROM skill_catalog WHERE is_active;
#    cycle-id:       SELECT id FROM evaluation_cycles WHERE name='Quý I/2026';

# 2. Sinh SQL + báo cáo mapping:
python3 generate_seed.py \
  --excel BM01_toan_bo....xlsx \
  --profiles profiles.json --skills skills.json \
  --manual-map manual_skill_map.csv \
  --cycle-id <uuid-quy-I-2026> \
  --out seed_bm01_q1.sql --report mapping_report.csv

# 3. Soát mapping_report.csv (đặc biệt các dòng độ tin cậy low),
#    rồi áp seed_bm01_q1.sql vào Supabase (SQL Editor / supabase db push).
```

File SQL idempotent: chạy lại sẽ xoá toàn bộ phiếu import cũ (theo marker)
rồi insert lại, nên có thể sửa mapping và chạy lại nhiều lần.

## Đã thực hiện ngày 14/07/2026

- Tạo cycle "Quý I/2026" (01/01–31/03/2026, status `closed`).
- Seed 94/95 cán bộ (447 hành động trừ cán bộ chưa có tài khoản).
- **CHU THỊ THỦY (Phòng TCTH, 7 hành động)** chưa có profile trong app —
  sau khi tạo tài khoản cho cán bộ này, chạy lại script để bổ sung.
- Báo cáo khớp tên + mapping skill đã gửi quản trị viên soát.
