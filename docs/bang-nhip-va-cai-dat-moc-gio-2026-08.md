# Bảng nhịp tuần/tháng + Cài đặt mốc giờ

08/2026. Trả lời yêu cầu: *"thêm tính năng lập bảng hàng tuần hàng tháng, các
cán bộ không nhập đúng nhịp, thời gian này cho vào mục set thời gian cụ thể
trong cài đặt ngày giờ."*

---

## 1. Hai việc, một gốc

Chi nhánh muốn bảng «tuần này ai không nhập đúng nhịp». Nhưng **«đúng nhịp» đang
là con số chôn cứng trong mã nguồn**: trước 08:00 là đúng giờ, đến 08:30 là
muộn, sau đó mất nhịp. Muốn đổi giờ giao ban thì phải sửa mã và triển khai lại
— TCTH không tự làm được. Nên phải đưa mốc giờ ra cấu hình trước, rồi mới dựng
bảng tổng hợp.

## 2. Phát hiện khi rà soát: bảng ảnh chụp vẫn rỗng

Bảng `ct2_anh_chup_nhip` (ảnh chụp nhịp mỗi ngày) có từ đợt đầu, nhưng **tác vụ
chốt sổ chưa bao giờ được lên lịch**. Không có nó thì mọi bảng tổng hợp đều
trắng, dù mã có đúng đến đâu. Đã thêm cron `ct2-chot-so-nhip` chạy **09:00 giờ
VN các ngày thường**.

Vì sao 09:00: sau khung ân hạn mặc định (08:30) và trước khi thẻ bị kéo qua lại
trong ngày. Nếu TCTH dời ân hạn muộn hơn 09:00 thì màn cài đặt hiện cảnh báo,
vì lúc đó nhịp ghi muộn sẽ không kịp vào ảnh chụp của ngày hôm ấy.

## 3. Vì sao báo cáo đọc ảnh chụp chứ không tính lại

Để biết thứ Ba tuần trước một người **«phải ghi mấy việc»** thì cần biết hôm đó
họ đang giữ bao nhiêu thẻ đang làm. Trạng thái thẻ hôm nay không nói được điều
đó — thẻ đã đóng, đã chuyển tay, đã đổi người phụ trách.

Ảnh chụp là cách duy nhất để con số của quá khứ không đổi mỗi lần ai đó kéo một
thẻ. Bảng tổng hợp chỉ cộng lại.

## 4. Mẫu số là gì

**Số ngày làm việc người đó THỰC SỰ có việc phải ghi**, không phải số ngày trong
kỳ. Ai nghỉ phép cả tuần, hoặc không có việc nào đang chạy, thì không xuất hiện
trong bảng.

Đây là quyết định quan trọng nhất của cả tính năng: bảng mà phạt oan một lần thì
lần sau không ai tin nữa, và một bảng không ai tin thì tệ hơn không có bảng.

Ngày nghỉ lễ cũng không vào mẫu số — ảnh chụp chỉ ghi vào ngày làm việc.

## 5. Màn bảng nhịp

Tab **«Bảng nhịp»** trên trang Chiêu thức 2, **chỉ lãnh đạo thấy**.

Cán bộ nhìn thấy bảng xếp mình so với đồng nghiệp mỗi sáng thì nhịp thành cuộc
thi, không còn là *tấm gương soi cho chính mình* như đặc tả đặt ra. Đây là công
cụ điều hành, không phải bảng thi đua.

- Chuyển **tuần / tháng**, lùi về các kỳ trước
- Ba số đầu: tỷ lệ đúng nhịp chung · số cán bộ có việc · số cần nhắc
- Mỗi người một dòng, **tỷ lệ thấp nhất lên đầu** — danh sách để nhắc, không
  phải để xếp hạng
- Thanh ba màu (xanh đúng giờ · vàng muộn · đỏ mất nhịp) để đọc bằng mắt

Tuần bắt đầu **thứ Hai**, trùng mốc tuần của Kanban 38 skill và của bằng chứng
dấu ấn. Lệch tuần là kiểu lỗi khó phát hiện nhất: mọi con số đều hợp lý, chỉ là
của tuần khác.

## 6. Màn cài đặt ngày giờ

Trang cũ «Lịch nghỉ lễ» đổi thành **«Cài đặt ngày giờ»**, gồm hai phần: mốc giờ
(mới) và lịch nghỉ (đã có). Hai thứ này cùng quyết định mọi con số của Chiêu
thức 2 nên để cạnh nhau.

| Nhóm | Đặt được gì | Mặc định |
|---|---|---|
| Chấm nhịp sáng | Ghi trước giờ này = đúng giờ · Ghi trước giờ này = muộn | 08:00 · 08:30 |
| Khung «bảng sống» | Bắt đầu / ngừng tự làm mới bảng | 06:45 · 08:45 |
| Khung được phép báo | Sớm nhất / muộn nhất được phép báo | 07:00 · 18:00 |
| Ngưỡng cảnh báo | Nghẽn cột chờ · hồ sơ chưa cập nhật · trần thông báo | 3 · 2 · 3 |

Ba điều màn này nói rõ với người đặt:

1. **Đổi mốc không sửa lại quá khứ.** Nhịp đã ghi giữ nguyên kết quả đã chấm.
   Chấm lại quá khứ theo luật mới thì con số của các kỳ đã chốt sẽ đổi — đó là
   thứ không ai muốn giải thích trong cuộc họp.
2. **Cảnh báo nếu ân hạn muộn hơn 09:00**, vì đó là giờ chốt sổ.
3. **Cảnh báo chứ không chặn.** Hệ quả của việc đổi mốc là chuyện nghiệp vụ;
   người đặt phải thấy hệ quả rồi tự quyết.

## 7. Cấu hình ăn vào đâu

Một dòng trong `ct2_cau_hinh_thoi_gian`, đọc từ cả hai phía:

| Nơi đọc | Dùng để |
|---|---|
| `f_ct2_truoc_ghi_nhip` (trigger DB) | Chấm đúng giờ / muộn / mất nhịp |
| `ct2_moc_phat_gan_nhat` (DB) | Hoãn thông báo ra ngoài khung yên tĩnh |
| `ct2_dat_thong_bao` (DB) | Trần thông báo mỗi người mỗi ngày |
| `trongKhungNhip()` (client) | Bật/tắt tự làm mới bảng |
| `nguongTuoiCho()`, `hsNguongImLang()` (client) | Ngưỡng cảnh báo trên thẻ |

Hàng rào thật vẫn ở database — trigger chấm giờ đọc thẳng bảng cấu hình, giao
diện không lách được. Client giữ một sổ dùng chung để hiện đúng con số mà không
phải hỏi server mỗi lần, giống cách `lichNghi.ts` đang làm.

Bảng cố ý **không có policy INSERT/DELETE**: phải luôn đúng một dòng, không ai
xóa mất mốc giờ của cả Chi nhánh. Hàm đọc cũng rơi về mặc định nếu dòng biến
mất, thay vì làm hỏng việc ghi nhịp.

## 8. Đã kiểm chứng

Trên database thật (giao dịch có rollback):

| Phép thử | Kết quả |
|---|---|
| Đọc cấu hình mặc định | 08:00 · 08:30 · 07:00–18:00 · trần 3 · ngưỡng chờ 3 |
| Đổi khung yên tĩnh sang 09:00, tin sinh 08:00 thứ Tư | mốc phát dời từ **08:00** sang **09:00** |
| `ct2_bang_nhip_ky` 30 ngày gần nhất | chạy được, trả 0 dòng (ảnh chụp còn rỗng — đúng như dự kiến) |
| Cron `ct2-chot-so-nhip` | đã lên lịch `0 2 * * 1-5` (09:00 giờ VN) |

Phía client: **500 test pass**, thêm 12 test mới cho mốc giờ và mốc kỳ. Build
sạch, lint không thêm lỗi.

Kiểm bằng trình duyệt thật ở khổ 390px, phát hiện và sửa một lỗi: nếu không đọc
được cấu hình thì màn kẹt ở «Đang tải…» và quản trị không đặt được gì. Nay form
luôn hiện, kèm cảnh báo rằng đang hiện giá trị mặc định.

## 9. Chưa làm

- **Gửi bảng nhịp qua email/push định kỳ.** Hiện phải mở màn để xem. Nên đi cùng
  đợt bổ sung digest, và phải cân nhắc kỹ: một bảng xếp hạng tự gửi vào máy mọi
  người sáng thứ Hai là thứ rất dễ phản tác dụng.
- **Xuất Excel bảng nhịp** cho cuộc họp giao ban.
- **Cấu hình giờ chốt sổ** — hiện cron cố định 09:00, muốn đổi phải sửa cron.
  Màn cài đặt cảnh báo khi ân hạn vượt mốc này, nhưng chưa cho đổi.
- **Số liệu trước hôm nay vẫn rỗng** vì ảnh chụp mới bắt đầu ghi từ khi cron
  chạy. Bảng tuần/tháng chỉ có số từ ngày làm việc kế tiếp trở đi.
