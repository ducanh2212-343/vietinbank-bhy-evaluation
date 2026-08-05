# Cột «Đến hạn GHTD 2 tháng tới» thành trạng thái thật

*Tháng 8/2026 — chỉnh lại theo đúng ý Giám đốc sau một lần tôi hiểu sai.*

## Tôi đã hiểu sai gì

Lần trước tôi **bỏ hẳn** cột này, hiểu rằng nó thừa. Giám đốc nói lại rõ: cột
**giữ nguyên**; vấn đề là mỗi khách hàng phải chỉ xuất hiện ở **đúng một chỗ**.

Nguyên nhân gốc của việc trùng: nó là **cột dẫn xuất** tính từ trường ngày, nên
một hồ sơ đang ở «Trình cấp PDTD TSC» đồng thời hiện thêm một thẻ nữa ở cột đến
hạn — cùng khách, hai chỗ, đọc bảng thì đếm hai lần.

## Nay nó là gì

`DEN_HAN_GHTD` là một **trạng thái thật**, đứng đầu đường ống, mang nghĩa
**dự kiến**: khối lượng công việc sắp phải làm, cho trước vào bảng để Phòng
nhìn thấy. Bắt tay làm thì chuyển sang «Thu thập hồ sơ» và **rời** cột cũ.

Luồng: `Đến hạn GHTD → Thu thập hồ sơ → Trình LĐP → … → Hoàn thành`

**Một chiều.** Hồ sơ đã bắt đầu không kéo ngược về «dự kiến» được — làm thế sẽ
xoá mất sự thật «đã có người nhận việc» và cho đồng hồ xử lý chạy lại từ đầu.
Muốn dừng thì có Từ chối/Dừng, cửa đó ghi lý do và giữ vết. Chặn ở cả ba lớp:
cú kéo, hộp thoại, và trigger database.

## Hàng rào được dời chỗ, không bị gỡ

`f_ct2_hs_truoc_tao` vốn bắt buộc **số tiền + hạn xử lý + kỳ hạn** ngay lúc mở
hồ sơ. Thẻ dự kiến sinh ra từ đúng **một** sự thật — hạn mức của khách sắp hết
— nên lúc đó chưa ai biết vay bao nhiêu, kỳ hạn nào, hẹn xong ngày nào. Bắt
điền ngay là ép người ta bịa số.

Nên cổng tạo thẻ dự kiến chỉ đòi **ngày hạn mức đến hạn**, và ba trường kia
được hỏi lại ở **cổng vào «Thu thập hồ sơ»**. Không đoạn nào hồ sơ thật đi qua
mà không bị hỏi — chỉ đổi chỗ hỏi cho đúng lúc người ta biết câu trả lời.

## Nhận diện khác hẳn thẻ hồ sơ

Nền tím nhạt, **viền đứt**, dòng đầu là *hạn mức còn/hết bao nhiêu ngày* chứ
không phải số tiền. Thẻ dự kiến trông giống thẻ hồ sơ thật thì người đọc bảng
sẽ cộng nhầm nó vào khối lượng đang làm.

Cùng lý lẽ ở phần số liệu: `HS_DANG_CHAY` **không** gồm `DEN_HAN_GHTD`, nên thẻ
dự kiến không vào «Hồ sơ đang chạy», không cộng vào «Tổng dư nợ đang trình», và
không bị đếm là «hồ sơ chưa có số tiền» — ở cột đó trống mới là đúng. Nó cũng
không bị đòi ghi nhịp hằng ngày. Thứ **duy nhất** nó cảnh báo là hạn mức.

## Dữ liệu đã gieo

7 thẻ dự kiến cho Phòng KHDN — các khách có hạn mức đã/sắp hết mà **chưa có hồ
sơ nối tiếp nào**. Mỗi thẻ chép lại từ hồ sơ cũ đã hoàn thành của chính khách
đó: tên khách, cán bộ đang phụ trách, cấp phê duyệt, ngày hạn mức đến hạn. Số
tiền / kỳ hạn / hạn xử lý **để trống** — chưa ai quyết, điền bừa là đặt một con
số không có thật lên bàn điều hành.

Cả 7 đều đã quá hạn mức từ 68 đến 492 ngày. Đó là sự thật cần thấy, không phải
lỗi hiển thị.

## Băng cán bộ dính khi cuộn

Hàng tiêu đề cột dính mép trên (`top-0`), băng tên cán bộ dính ngay dưới nó
(`top-[3.25rem]`) **và** dính mép trái khi cuộn ngang. Sticky bị chặn trong
phạm vi `<section>` của mỗi băng, nên cuộn tới người kế tiếp thì tên cũ tự
nhường chỗ — không chồng lên nhau.

## Kiểm chứng

Đóng vai cán bộ thật (Đào Quang Vinh) trên database production, có hoàn tác:

| Thử | Kết quả |
|---|---|
| Rời cột dự kiến khi thiếu cả ba trường | chặn — *«cần điền số tiền · hạn xử lý · kỳ hạn»* |
| Thiếu đúng một trường (kỳ hạn) | chặn — nêu đúng một trường thiếu |
| Nhảy cóc sang «Trình Lãnh đạo Phòng» | chặn — *«từ cột dự kiến chỉ đi sang Thu thập hồ sơ»* |
| Kéo hồ sơ đang chạy ngược về cột dự kiến | chặn — *«là điểm xuất phát»* |
| Điền đủ ba rồi vào Thu thập | đi được, `ngay_nhan` đặt lại hôm nay |

**Một lỗi thật bắt được nhờ đọc kỹ thông báo:** lần chạy đầu, phép thử «thiếu
ba trường» báo *đã chặn* — nhưng đọc ra thì nó chặn bằng `malformed array
literal`, không phải bằng luật. Trong PL/pgSQL, `text[] || 'chuỗi'` với một
hằng chưa định kiểu bị hiểu là nối **hai mảng**, và Postgres cố đọc chuỗi tiếng
Việt như một mảng. Cán bộ sẽ nhận một lỗi kiểu dữ liệu thay vì câu hướng dẫn.
Đã đổi sang `array_append()`. Nếu chỉ đếm «có chặn hay không» thì lỗi này lọt.

601 test qua (thêm 9 test cho cột dự kiến), tsc + lint sạch, build qua.
