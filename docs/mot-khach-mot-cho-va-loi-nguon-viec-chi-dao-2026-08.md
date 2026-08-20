# Một khách một chỗ · lỗi «Chỉ đạo của cấp trên»

*Tháng 8/2026 — hai việc Giám đốc chỉ ra ngay sau khi dựng cột dự kiến.*

## 1. Lỗi ghi việc khi chọn «Chỉ đạo của cấp trên»

```
new row for relation "ct2_dau_viec" violates check constraint "ct2_nguon_viec_hop_le"
```

**Nguyên nhân**: nguồn việc `CHI_DAO` được thêm vào danh mục phía client theo
yêu cầu của Giám đốc, nhưng CHECK constraint dưới database chưa bao giờ được
nới — nó vẫn chỉ nhận `KE_HOACH`, `GIAO_BAN`, `CHU_DONG`.

Đây đúng là loại lỗi mà nguyên tắc *«hàng rào thật ở database»* sinh ra khi chỉ
nới một bên: ứng dụng **mời** cán bộ chọn một ô, cán bộ chọn, rồi ăn nguyên câu
lỗi Postgres và mất cả form vừa gõ. Không ai đoán được mình sai ở đâu.

**Đã sửa**: nới constraint thêm `CHI_DAO`. Kiểm trên production có hoàn tác,
đóng vai Trưởng phòng KHDN — cả bốn nguồn việc lưu được; và một giá trị bịa
(`TU_BIA_RA`) vẫn bị chặn, tức là nới đúng chỗ chứ không mở toang.

## 2. Nhựa Tuệ Minh vừa «Hoàn thành» vừa ở «Đến hạn GHTD»

Giám đốc hỏi có phải trùng không. Trả lời: **hai bản ghi khác nhau, không phải
một bản ghi bị nhân đôi** — nhưng trên bảng thì đúng là một cái tên hiện hai
chỗ, và điều đó phải hết.

| Mã hồ sơ | Loại | Trạng thái | Nghĩa |
|---|---|---|---|
| KHDN-TD-2608-081 | Cấp mới | Hoàn thành | Hạn mức cũ, đã cấp xong, đến hạn 29/05/2026 |
| KHDN-TD-2608-098 | Tái cấp | Đến hạn GHTD | Việc tái cấp sắp phải làm — thẻ dự kiến |

**Không phải hậu quả của đợt gieo thẻ dự kiến.** Rà cả bàn thì có 10 khách hiện
hai thẻ, trong đó **4 cặp đã trùng từ trước** — Phú Thái, Thaicom, Mỹ Hương,
Hưng Phát (hoàn thành + hồ sơ mới đang chạy). Gốc là bàn PDTD giữ hồ sơ hoàn
thành trên bảng **mãi mãi**, nên khách nào có lịch sử cộng với việc đang làm
đều hiện hai lần.

**Luật mới — một khách một chỗ**: hồ sơ **đã đóng** (Hoàn thành / Từ chối) lui
khỏi bảng khi và chỉ khi khách đó còn một thẻ **chưa đóng**. Không xoá gì; bản
ghi vẫn nguyên trong database và tra được. Khách không còn việc nào mở thì hồ
sơ hoàn thành vẫn nằm lại làm thành quả của Phòng. Hai hồ sơ **cùng mở** của
một khách thì đều ở lại — đó là hai việc thật, không phải trùng.

## 3. Một lỗi của chính tôi trong đợt gieo thẻ

Công ty **Hưng Phát** hiện **ba** thẻ: hồ sơ cũ hoàn thành, hồ sơ Cấp mới đang
ở Thu thập, và một thẻ dự kiến thừa.

Bộ lọc gieo thẻ của tôi loại trừ khách «đã có hồ sơ nối tiếp» nhưng chỉ dò loại
`TAI_CAP`/`DIEU_CHINH`. Hưng Phát đang có hồ sơ `CAP_MOI` chạy dở nên lọt qua.
Điều kiện đúng phải là **«khách này đã có ai bắt tay làm chưa»**, xét mọi loại
hồ sơ — loại hồ sơ là chuyện khác, có người đang làm mới là chuyện quyết định.

Đã gỡ thẻ thừa và sửa luôn câu lệnh gieo trong migration để lần chạy sau không
lặp lại. Còn **6 thẻ dự kiến**, mỗi khách một thẻ.

Kiểm lại trên production: **0 khách còn hơn một thẻ đang mở**.

## Đã kiểm

606 test qua (thêm 5 test cho luật một-khách-một-chỗ, gồm cả các ca không được
giấu: khách hết việc mở, hai hồ sơ cùng mở, trùng tên khác phòng), tsc + lint
sạch.
