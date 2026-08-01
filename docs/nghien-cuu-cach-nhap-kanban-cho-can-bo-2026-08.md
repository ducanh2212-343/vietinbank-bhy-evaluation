# Nghiên cứu: cách nhập Kanban đơn giản nhất cho cán bộ Chi nhánh

**Bối cảnh:** cán bộ VietinBank Bắc Hưng Yên phần lớn chưa quen tư duy linh hoạt,
chưa quen khung 5W2H và cách làm việc kiểu Agile. Câu hỏi đặt ra: nhập việc lên
Kanban thế nào để họ thật sự dùng, chứ không điền cho có rồi bỏ.

---

## 1. Chân dung người dùng — vì sao ô nhập nhiều dòng không hợp

Cán bộ ngân hàng cấp chi nhánh có một số đặc điểm nghề nghiệp rất rõ, và mọi
đặc điểm này đều chống lại kiểu nhập "viết tự do":

| Đặc điểm nghề nghiệp | Hệ quả lên hành vi nhập liệu |
|---|---|
| Quen **biểu mẫu**: mỗi ô một câu trả lời đúng, có người ký duyệt | Ô trống nhiều dòng không có "câu trả lời đúng" → chần chừ, để đó |
| Làm việc trong **hệ thống lưu vết**, sai là phải giải trình | Sợ ghi sai vào chỗ ai cũng đọc được → viết càng ít càng an toàn |
| Quen **thực thi quy trình**, ít khi tự thiết kế kế hoạch | Bị hỏi "cách làm" khi chưa bắt tay vào việc là câu hỏi quá sớm |
| Thao tác chính trên **điện thoại**, lúc 7h50 sáng, đang vội | Mỗi lần cuộn màn hình là một cơ hội bỏ dở |

Cộng thêm bốn hiệu ứng tâm lý đã được biết rõ:

1. **Hội chứng trang giấy trắng.** Một ô nhiều dòng trống gợi liên tưởng "viết
   bài văn". Với người không tự tin diễn đạt, đây là điểm bỏ cuộc số một.
2. **Nhận ra dễ hơn nghĩ ra.** Chọn từ danh sách có sẵn tốn ít năng lượng hơn
   tự nghĩ ra chữ — chênh lệch rất lớn ở người chưa quen khung tư duy.
3. **Tải nhận thức.** Nhìn thấy 5 ô trống cùng lúc, người dùng phải giữ cả 5
   câu hỏi trong đầu. Một câu hỏi trên một màn hình thì chỉ phải nghĩ một điều.
4. **Ngại mất mát.** Điền dở 8/11 trường rồi thoát ra là mất trắng — biết vậy
   nên nhiều người không bắt đầu.

Riêng ô nhập nhiều dòng còn ba lỗi kỹ thuật trên điện thoại: bàn phím che mất
nửa ô, đặt con trỏ giữa dòng bằng ngón tay rất khó, và gõ tiếng Việt kiểu Telex
trong ô nhiều dòng dễ bị bộ gõ tự sửa sai. Kết luận: **bỏ ô nhiều dòng.**

---

## 2. Học gì từ Miro — và tại sao Miro vẫn để lọt "card vô chủ"

Điểm mạnh của Miro là **tạo thẻ gần như không có ma sát**: gõ tên việc là xong,
mọi thứ khác (người phụ trách, hạn, nhãn) bồi đắp dần sau. Thẻ tồn tại trước,
chi tiết đến sau.

Nhưng đúng vì không có ràng buộc nào, board Miro hiện tại của Chi nhánh mới sinh
ra thẻ không có người phụ trách, không có hạn — không ai biết việc đang ở đâu.

Điều đáng chú ý: **Chi nhánh đã tự rút ra bài học này rồi.** Quy chế
`phan-tich-kanban` mục A1 viết:

> "Ba trường bắt buộc, không hơn: Status · Assignee · End Date. Các trường khác
> là tùy chọn — vì **yêu cầu điền quá nhiều trường trên màn hình điện thoại là
> nguyên nhân chính khiến card bị bỏ trống hoàn toàn**."

Trong khi đó, đặc tả Chiêu thức 2 v1.0 §3.1 lại chặn cứng đủ 11 trường 5W2H
ngay lúc tạo, cũng với lý do chống "card vô chủ".

**Hai văn bản cùng chống một lỗi bằng hai thuốc ngược nhau.** Đây là mâu thuẫn
phải giải quyết trước khi bàn tiếp về giao diện.

---

## 3. Hòa giải: hai văn bản nói về hai thời điểm khác nhau

- Ba trường của quy chế Miro làm cho thẻ **theo dõi được** — đó là yêu cầu vận
  hành, phải có ngay từ giây đầu tiên.
- 5W2H của đặc tả làm cho việc **được giao rõ ràng** — đó là yêu cầu chất lượng
  kế hoạch, và nó chỉ trả lời được khi người ta thật sự chuẩn bị bắt tay làm.

Ở thời điểm ghi việc — đang ngồi họp giao ban, cầm điện thoại, trưởng phòng vừa
nói xong một chỉ đạo — người ta **chỉ biết ba điều**: việc gì, ai làm, bao giờ
xong. Hỏi "kết quả đầu ra là gì" lúc đó là hỏi quá sớm; câu trả lời nhận được
sẽ là chữ điền cho có.

**Khuyến nghị: giữ nguyên chặn cứng, nhưng đặt đúng cửa.**

| | Cổng 1 — Ghi việc | Cổng 2 — Bắt đầu làm |
|---|---|---|
| Khi nào | Ngay lúc nghĩ ra / nghe chỉ đạo | Khi chuẩn bị bắt tay làm |
| Hỏi gì | Việc gì · Ai làm · Xong khi nào | Xong thì có gì · Phục vụ mục tiêu nào · Làm mấy bước |
| Thẻ ở đâu | Cột «Chuẩn bị» | Chuyển sang «Đang làm» |
| Mất bao lâu | < 30 giây | ~60 giây |

Cổng 2 **chính là bước P (Plan)** của PDCA — vốn đã bắt buộc trong thiết kế. Nay
gộp luôn nội dung 5W2H vào đó, thay vì hỏi hai lần ở hai chỗ.

Kết quả: **không thẻ nào đang CHẠY mà thiếu 5W2H** (giữ trọn mục tiêu của đặc
tả), nhưng không ai bị chặn ở giây thứ 20 khi mới chỉ muốn ghi lại một chỉ đạo.

---

## 4. Mười nguyên tắc đã áp vào giao diện

1. **Giấu hẳn thuật ngữ.** Màn nhập không có chữ "5W2H", "What/Why/How", "agile",
   "sprint", "backlog". Khung tư duy là giàn giáo vô hình. Chữ "đã đủ 5W2H" chỉ
   xuất hiện ở màn cuối Cổng 2 — như một lời khen, không phải bài kiểm tra.
2. **Hỏi bằng lời nói thường.** "Làm xong thì có cái gì trong tay?" thay cho
   "Kết quả đầu ra"; "Anh/chị định làm theo mấy bước?" thay cho "Cách làm".
3. **Một câu hỏi một màn hình** ở Cổng 2, có chấm tiến độ 4 bước để thấy đường
   về đích.
4. **Liệt kê thay vì viết đoạn.** Ba ô ngắn B1/B2/B3 thay một ô dài. Cùng số chữ
   nhưng cảm giác khó dễ khác hẳn nhau.
5. **Không hiện ràng buộc số ký tự.** "≥ 30 ký tự" khiến người ta gõ cho đủ dài
   thay vì nghĩ cho đủ ý. Hệ thống đếm bằng **số bước** (tối thiểu 2 bước).
6. **Chọn thay vì gõ, ở mọi chỗ có thể.** Mục tiêu là danh mục bấm chọn; kết quả
   đầu ra có 6 gợi ý bấm-là-điền; hạn có chip "Cuối tuần này / Trong 2 tuần /
   Cuối tháng" thay cho việc dò lịch trên màn hình nhỏ.
7. **Mặc định đúng.** Người làm mặc định là chính mình. Lãnh đạo theo dõi tự lấy
   Trưởng phòng. Ngày bắt đầu là hôm nay. Phạm vi suy ra từ việc có liên phòng
   hay không. Bốn trường biến mất khỏi màn hình mà không mất dữ liệu.
8. **Không hỏi điều đã biết.** "Loại đầu việc" bị bỏ hẳn: Kanban này chỉ dùng
   cho việc có điểm kết thúc, nên luôn là việc tiến trình.
9. **Không gõ lại lần hai.** Câu Plan (P) trong nhật ký PDCA được hệ thống viết
   sẵn từ chính kế hoạch vừa nhập.
10. **Không mất công đã bỏ ra.** Ghi việc xong là thẻ có thật trên bảng, kể cả
    khi chưa lập kế hoạch. Thẻ mang nhãn "Chờ lập kế hoạch làm" — nhắc nhẹ, không
    phải lỗi.

---

## 5. Phạm vi Kanban — ba nguồn việc, không phải mọi việc

Chốt với Chi nhánh: bảng này dùng cho **ba nguồn**, và cột `nguon_viec` ghi lại
đúng ba nguồn đó để về sau phân tích được việc nào đến từ đâu:

| Nguồn | Ai ghi | Đặc điểm |
|---|---|---|
| 📋 **Kế hoạch hành động** | Lãnh đạo Phòng | Việc đã có trong KHHĐ kỳ |
| 🗣️ **Chỉ đạo giao ban** | Lãnh đạo Phòng | Ghi ngay trong/sau cuộc họp; có ô ghi tên cuộc họp và ô chọn "ghi tiếp chỉ đạo khác của cùng cuộc họp" để nhập liền mạch nhiều việc |
| 💡 **Phòng/cá nhân chủ động** | Cán bộ tự ghi được | Việc tự thấy cần làm |

**Việc lặp đi lặp lại hằng ngày KHÔNG vào bảng này** — đúng nguyên tắc A3 của
quy chế Miro và §2.2 của đặc tả.

### Một thay đổi về quyền, có chủ đích

Cán bộ nay **tự ghi được việc chủ động của chính mình** (tự nhận việc, trong
phòng mình, không liên phòng, không tự phong mức ưu tiên). Lý do: nếu việc cán
bộ tự thấy cần làm mà vẫn phải chờ duyệt mới hiện lên bảng thì tín hiệu chủ động
bị dập ngay từ đầu — trái với chính mục tiêu "cán bộ tự nhận thức, tự hành động"
của cả hai văn bản.

Giao việc cho **người khác** vẫn phải là lãnh đạo. Nếu cán bộ chọn người khác ở
ô "Ai làm", hệ thống tự chuyển nội dung đó thành **đề xuất** gửi lãnh đạo Phòng
— cùng một cửa vào, hệ thống tự định tuyến, người dùng không phải học hai luồng.

---

## 6. Về việc dạy tư duy linh hoạt / Agile

Khuyến nghị rõ: **đừng dạy bằng từ vựng.** Cán bộ không cần biết chữ "agile".
Điều cần hình thành là ba thói quen, và cả ba đã nằm sẵn trong cơ chế:

- **Kế hoạch là giả định sẽ điều chỉnh, không phải cam kết cứng.** Hệ thống giữ
  `han_goc` để đo việc lùi hạn, nhưng ngôn ngữ giao diện tuyệt đối không được
  mang sắc thái trách móc khi hạn bị lùi. Người sợ bị chê sẽ giấu tiến độ thật.
- **Nhịp ngắn hơn kế hoạch dài.** Một câu mỗi sáng dạy tư duy lặp tốt hơn mọi
  buổi tập huấn về Agile.
- **Vướng là chuyện bình thường, giấu vướng mới là vấn đề.** Cờ 🟡🔴 bắt tách
  "đang vướng vì…" và "hôm nay tôi làm…" chính là bài tập tư duy giải pháp,
  lặp lại mỗi ngày cho tới khi thành phản xạ.

---

## 7. Kết quả đo được

| | Trước | Sau |
|---|---|---|
| Số ô phải điền để có một thẻ trên bảng | 11 | **3** |
| Số lần gõ chữ | 5 vùng chữ | **1 dòng** (2 ô còn lại là bấm chọn) |
| Thời gian ước tính cho một thẻ | 3–5 phút | **< 30 giây** |
| Thời điểm phải nghĩ ra "cách làm" | Ngay lúc ghi việc | Lúc bắt tay làm |
| Cán bộ tự ghi việc chủ động | Không (phải đề xuất) | **Có** |

**Điều KHÔNG đổi:** không thẻ nào chạy mà thiếu 5W2H · vẫn đúng 01 người chịu
trách nhiệm · nhật ký PDCA vẫn append-only · vẫn phải có C trước Hoàn thành và
A trước Đã đóng · mọi cổng chặn vẫn nằm ở tầng database, không chỉ ở giao diện.

---

*Nếu Chi nhánh muốn quay lại chặn đủ 5W2H ngay lúc tạo, chỉ cần chuyển ba câu
hỏi của Cổng 2 vào Cổng 1 — trigger `f_ct2_truoc_sua_dau_viec` giữ nguyên vì
điều kiện khởi động vẫn được kiểm ở cùng chỗ.*
