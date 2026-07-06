# ĐỢT CẢI TIẾN 3 — Khép lưu atomic ở MỌI đường lưu phiếu

**Ngày:** 05/07/2026
**Kết quả kỹ thuật:** TypeScript sạch, build thành công, 17/17 unit test pass. Kiểm chứng round-trip có trigger thật ở tầng DB (rollback, production không bị đụng).

## Nội dung
Đưa nốt hai đường lưu còn lại sang RPC atomic `save_evaluation_children` (đợt 2 đã làm cho trang Tự đánh giá của cán bộ):

- **`src/pages/StaffEvaluation.tsx`** (Trưởng phòng đánh giá): thay chuỗi delete-all + reinsert bằng dựng payload + gọi RPC. Bảo toàn đầy đủ nghiệp vụ: nhận xét TP trên từng hành động, các dòng hành động bổ sung TP thêm (khối E), logic focus JSON, và **carry-over** hành động dở dang từ kỳ trước (priority tạm `tmp-` được ánh xạ đúng qua khóa tự nhiên).
- **`src/components/bm/BMFormPage.tsx`** (BM01/02/03): tương tự, giữ đúng model thái độ legacy của BM (issue_summary/improvement_goal/evidence trực tiếp).

## Hệ quả
Từ nay **mọi đường lưu** (Cán bộ tự đánh giá · Trưởng phòng · BM01/02/03) đều:
- **Atomic:** lỗi giữa chừng tự rollback → không mất dữ liệu; lỗi chỉ hiện toast, dữ liệu cũ nguyên vẹn.
- **Giữ tiến độ Kanban:** UUID hành động được giữ (upsert theo id) → thẻ Kanban không còn bị reset về 0% mỗi lần lưu phiếu, kể cả khi Trưởng phòng lưu. Đây là điểm còn thiếu sau đợt 2.
- **Không ghi đè mất nhận xét/dòng của bên kia:** RPC không bao giờ null-out cột NOT NULL, và client gửi kèm nhận xét TP + dòng bổ sung đã load.

## Kiểm chứng đã chạy (rollback)
- Đợt 2: sửa+lưu phiếu → thẻ Kanban giữ 50% (không reset), giữ UUID hành động/priority.
- Đợt 3: **Trưởng phòng lưu lại** → action giữ UUID, thẻ Kanban giữ 50%, **nhận xét TP còn nguyên**, không nhân đôi thẻ.

## Kiểm thử nên chạy sau khi deploy
1. Cán bộ tạo hành động → cập nhật Kanban 50%.
2. Trưởng phòng mở phiếu (khi phiếu ở trạng thái chờ rà soát), sửa/nhận xét, **Lưu nháp** → Kanban **vẫn 50%**, nhận xét TP hiển thị lại khi mở lại.
3. Xác nhận rà soát → chuyển PGĐ vẫn bình thường.
4. BM01/02/03: mở, sửa, lưu → dữ liệu và Kanban giữ nguyên.
