# Cấp phụ trách cho PDTD · cấm «tự theo dõi chính mình»

08/2026, tiếp ngay sau đợt «sửa được ba cấp phụ trách». Giám đốc chỉ ra hai
chỗ, cả hai đều đúng và cùng một gốc: **ai giám sát việc này**.

---

## 1. «Lãnh đạo theo dõi sao lại là Nguyễn Quốc Tân, đây là cán bộ phòng KHDN»

Đúng. Thẻ KHDN-2608-023 có Nguyễn Quốc Tân vừa là người làm vừa là lãnh đạo
theo dõi của chính mình.

Không phải lỗi nhập tay. Truy ra thì là hệ quả dây chuyền của một hàng rào
cứng thiếu dữ liệu để vượt qua:

- Trigger tạo đầu việc bắt `lanh_dao_theo_doi` phải khác NULL.
- Nhưng `departments.manager_id` khi đó rỗng ở mọi phòng, nên form không suy
  ra được Trưởng phòng nào.
- Nên form có một đường lùi: `truongPhongChon || truongPhongMacDinh ||`
  **`nguoi_chiu_trach_nhiem`** — điền tên chính người làm cho qua cửa.

Đây là bài học chung: **rào cứng mà không có dữ liệu hợp lệ để vượt qua thì
bao giờ cũng đẻ ra một đường lách**, và đường lách đó im lặng phá đúng cái mà
rào định bảo vệ. Rào đòi «phải có lãnh đạo theo dõi» rốt cuộc sinh ra thẻ
không ai theo dõi thật.

Đã sửa cả ba tầng:

- **Form**: bỏ hẳn đường lùi. Không chọn được ai thì để trống và nói thẳng
  dưới ô Trưởng phòng: *«Phòng chưa có Trưởng phòng trong danh mục — chọn
  người theo dõi việc này»*.
- **DB**: `ct2_tu_theo_doi_duoc()` + trigger `f_ct2_khong_tu_theo_doi` trên
  **cả hai bảng** (đầu việc và hồ sơ PDTD), chặn ở cả INSERT và UPDATE. Ngoại
  lệ đúng: người đó **chính là Trưởng phòng** (trên họ không còn ai trong
  phòng) hoặc thuộc Ban Giám đốc.
- **Dữ liệu**: thẻ đang tự theo dõi mình mà đã có Trưởng phòng thì chuyển sang
  Trưởng phòng — KHDN-2608-023 nay là Đỗ Việt Anh, đúng người mà Giám đốc vừa
  tự gán vào ô Trưởng phòng của chính thẻ đó, không phải suy đoán mới. Không
  có Trưởng phòng thì để **trống**, hiện thành cảnh báo «thiếu Lãnh đạo theo
  dõi»: bịa một cái tên vào ô giám sát còn tệ hơn ô trống, vì ô trống thì
  người ta đi hỏi. Thẻ BGD-2608-001 giữ nguyên — Giám đốc theo dõi việc của
  chính mình là đúng, trên anh không còn ai trong Chi nhánh.

Trên giao diện, nếu còn sót trường hợp nào thì tên hiện kèm chữ hổ phách
**«(đang tự theo dõi mình)»** thay vì trông y hệt một dòng bình thường.

## 2. «Kanban PDTD cũng chưa có nút gán»

Đúng — bảng `ct2_ho_so_tin_dung` chưa từng có ba cột Phó phòng / Trưởng phòng
/ PGĐ phụ trách, nên hộp thoại hồ sơ không có gì để gán. Đã bổ sung ba cột và
dùng **chung một khối giao diện** với thẻ Kanban (`Ct2CapPhuTrach`): cùng cách
hiện, cùng cách sửa, cùng luật.

Hồ sơ tín dụng là nơi khoản vay đi qua — không phải nơi cần ít giám sát hơn
đầu việc thường.

Quyền cũng đặt bằng luật cũ: `f_ct2_hs_cap_phu_trach_chi_lanh_dao` chặn cán bộ
tự đổi cấp phụ trách hoặc lãnh đạo theo dõi của hồ sơ mình làm, đúng như
migration `20260821090000` đã làm cho bảng đầu việc.

---

## Kiểm chứng

Chạy trên DB thật, đóng giả từng vai bằng `request.jwt.claims`, trong
transaction rồi rollback:

| Vai | Thao tác | Kết quả |
| --- | --- | --- |
| Giám đốc | gán TP + PGĐ + lãnh đạo theo dõi cho hồ sơ PDTD | ghi được ✅ |
| Giám đốc | đặt lãnh đạo theo dõi = chính cán bộ (PDTD) | bị chặn ✅ |
| Giám đốc | đặt lãnh đạo theo dõi = chính cán bộ (Kanban) | bị chặn ✅ |
| Cán bộ | đổi cấp phụ trách hồ sơ mình làm | bị chặn ✅ |
| Cán bộ | sửa `ghi_chu` của hồ sơ mình làm | vẫn ghi được ✅ (không chặn oan) |

Một lỗi bắt được trong lúc kiểm chứng: `f_ct2_khong_tu_theo_doi` bản đầu dùng
`CASE TG_TABLE_NAME WHEN … THEN NEW.can_bo ELSE NEW.nguoi_chiu_trach_nhiem`.
PL/pgSQL phân giải **mọi** nhánh của CASE khi biên dịch, nên trên bảng PDTD nó
nổ `record "new" has no field "nguoi_chiu_trach_nhiem"` — và vì lỗi đó cũng là
một exception, kịch bản thử suýt báo «đã chặn đúng». Đổi sang `IF/ELSE`.

596 test pass · build sạch · lint sạch trên các tệp đã sửa.
