# Đồng bộ 4 trạng thái · thông báo đủ tuyến cả bốn hệ

*Hai chỉnh sửa của Giám đốc trong sáng triển khai 06/08, kèm ảnh chụp màn hình.*

## 1. Ô «Chuyển trạng thái» đồng bộ với bảng — 4, không phải 7

GĐ chỉ ra: cột Kanban có 4 trạng thái mà ô chuyển bày 7 — hai nơi nói hai thứ.
Người dùng đọc bảng bằng CỘT; một đích chuyển không phải cột là một trạng thái
họ không biết xếp vào đâu.

Đồng bộ về 4. Ba trạng thái con **đổi vai chứ không mất cửa** (bài học từ đợt
rà sáng nay — chúng từng có luật mà không có cửa):

| Trước (7 đích) | Nay |
|---|---|
| 🤝 Chờ phối hợp / ⏳ Chờ duyệt là 2 đích chọn | Nút **«Giao đồng hồ chờ»** bên trong thẻ Đang làm: chọn loại (Trình duyệt / Chờ phối hợp) + người giữ. Thẻ VẪN nằm cột Đang làm — đúng như trên bảng. Đang chờ thì hiện dòng «Đang trình — [tên] giữ việc · N ngày» + nút **«Nhận lại việc»** |
| 🔒 Đã đóng là 1 đích chọn | Nút **«Chốt "Đã đóng"»** của lãnh đạo trên thẻ Hoàn thành — một chữ ký, không phải một cột. Việc thường trực: lãnh đạo có nút «Đóng việc thường trực» |
| Dừng/Hủy trong danh sách 7 | Vẫn trong ô chọn (4 cột có Dừng/Hủy), chỉ lãnh đạo thấy |

Database giữ nguyên bảy trạng thái và mọi luật — trigger không đổi một dòng.
Đồng hồ tuổi cột chờ, tầng «Đang chờ chính tôi» của BGĐ vẫn chạy như thiết kế.

## 2. Ô «bấm tên để nhận thông báo» nghĩa là gì — và đổi thành gì

**Nghĩa cũ**: trao đổi chỉ tự báo cho *danh sách bám sát* (người chịu trách
nhiệm, người phối hợp, lãnh đạo theo dõi, người tự bấm Theo dõi). Phó phòng /
Trưởng phòng / PGĐ **không** nhận, trừ khi người viết nhớ bấm tên họ. Ô bấm tên
sinh ra để vá đúng chỗ đó — tức là giao cho người viết cái việc lẽ ra hệ thống
phải tự làm.

**Từ 06/08 — chốt của GĐ**: người chịu trách nhiệm, lãnh đạo phòng, PGĐ được
gắn **tự nhận push** khi bất kỳ ai trao đổi hoặc ghi nhịp, ở **cả bốn hệ**:

| Hệ | Ghi nhịp | Trao đổi |
|---|---|---|
| Kanban phòng (CT2) | đã đủ tuyến từ trước ✅ | **sửa**: bám sát → đủ tuyến (+PP/TP/PGĐ) |
| Phê duyệt tín dụng | **mới**: trước nay ghi nhịp hồ sơ không báo AI CẢ | **sửa**: danh sách hẹp → đủ tuyến |
| Kanban upskill (CT3) | đã có push «2 cấp trên» (luật 26/07) — giữ nguyên, không bắn đúp | **sửa**: chỉ chủ thẻ → chủ thẻ + TP + PGĐ (chuỗi báo cáo danh bạ) |
| Bắc Hưng Yên Mark | **mới**: bồi bằng chứng báo chủ dấu ấn + tuyến của họ | (Mark trao đổi qua các kênh trên) |

Ô bấm tên **giữ lại với nghĩa mới**: *nhắc đích danh* — tin của người được bấm
ghi «nhắc tên anh/chị» (nổi hơn «vừa trao đổi»), và gọi được người **ngoài**
tuyến. Lời dẫn trên form đã đổi tương ứng.

## 3. Lỗ dữ liệu bịt kèm — «đủ tuyến» phải có tuyến thật

Kiểm bằng giả danh cán bộ thật mới lộ ra: **54/54 hồ sơ PDTD và 21 đầu việc
nhập các đợt sau không có Trưởng phòng / PGĐ phụ trách** — báo đủ tuyến thành
báo cho một mình người ghi. Đúng bài cũ: hàng rào có, dữ liệu để vượt rào không.

Đã điền từ danh mục (không bịa): Trưởng phòng ← `departments.manager_id`, PGĐ ←
`ct2_pgd_cua_phong()`, lãnh đạo theo dõi ← Trưởng phòng nếu trống. **Phó phòng
để nguyên trống** — danh mục không có «Phó phòng của phòng», điền đại là gán
trách nhiệm cho người không nhận. Còn đúng 1 đầu việc thiếu tuyến (phòng chưa
có Trưởng phòng trong danh mục).

## Kiểm chứng (giả danh Đào Quang Vinh, có hoàn tác)

- Trao đổi trên thẻ Kanban → **5 người** nhận: cán bộ + PP + TP + PGĐ + người
  theo dõi ✅
- Cán bộ tự ghi nhịp hồ sơ PDTD → **TP + PGĐ** nhận, người ghi tự-loại ✅
- 619 test qua, tsc + lint sạch, build qua.
