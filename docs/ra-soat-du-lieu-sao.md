# Rà soát dữ liệu Sao Xứng Đáng (bảng `star_records`) — 08/2026

Rà trên toàn bộ dữ liệu đang có trên cổng. Mọi con số lấy trực tiếp từ Supabase.

## 0. Nguyên tắc chi nhánh đã chốt

> **Sao được ghi nhận theo số serial. Mỗi số serial là một ngôi sao vật lý đã in và
> đóng số bằng tay, nên một số serial chỉ xuất hiện đúng một lần.**

Một hành động có thể được 1–3 sao, và khi đó nó tiêu thụ 1–3 số serial tương ứng.

## 1. Kết quả sau khi làm sạch

| Chỉ số | Trước | Sau |
|---|---|---|
| Số phiếu | 141 | **136** |
| Tổng sao | 146 | **141** |
| Tổng số serial ghi nhận | 146 | **141** |
| Số serial khác nhau | 140 | **141** |
| Serial bị dùng lại | 6 | **0** |

Thay đổi đã áp dụng nằm trong `docs/lam-sach-du-lieu-sao-2026-08.sql`, kèm sẵn phần
script lùi lại nguyên trạng.

## 2. Quy tắc serial trong dữ liệu: 1 sao = 1 số

Đối chiếu số serial trên từng phiếu với số sao của phiếu đó — **136/136 phiếu khớp**:

| Số sao | Số serial trên phiếu | Số phiếu |
|---|---|---|
| 1 | 1 | 132 |
| 2 | 2 | 3 |
| 3 | 3 | 1 |

Phiếu nhiều sao mang nhiều số hiệu, ví dụ `000072, 000082` (Nguyễn Quốc Tân, 2 sao)
và `193, 196, 213` (Vũ Đức Nam, 3 sao).

Trường `serial` hiện là ô chữ tự do nên người nhập phải nhồi nhiều số vào cùng một
ô, với ba kiểu ngăn cách khác nhau (`, ` / `,` / `; `). Muốn dùng serial làm khóa
định danh thì phải tách một phiếu N sao thành N dòng, mỗi dòng một số hiệu.

## 3. Sáu serial bị dùng lại — đã xử lý xong

| Serial | Cán bộ | Tình huống | Xử lý |
|---|---|---|---|
| 5 | Trần Hà Trang | Hai bản ghi 01/07, cùng việc | Xóa bản sau |
| 124 | Đỗ Thị Bích Ngãi | Hai bản ghi 23/04, cùng việc | Xóa bản sau |
| 210 | Hàn Thị Thùy Linh | 15/07 và 28/07, cùng việc | Xóa bản 28/07 |
| 220 | Nguyễn Mạnh Quân | 15/07 và 28/07, cùng việc | Xóa bản 28/07 |
| 84 | Nguyễn Quốc Tân | 03/04 và 12/06 — chi nhánh xác nhận Tân nhận **4 sao vật lý**, hệ thống đang ghi 5 | Xóa bản 12/06 |
| 194 | Chu Thị Thủy | 29/05 và 28/07 — **hai việc khác nhau, đủ 2 sao**, phiếu 28/07 bị ghi nhầm số | Sửa serial 28/07 thành **184** |

Nguyên tắc chọn bản giữ lại: giữ bản ghi sớm nhất theo `(awarded_on, created_at)`.

Kiểm tra lại sau xử lý:

- Nguyễn Quốc Tân: 3 phiếu / **4 sao** — `000084` (03/04), `000072, 000082` (05/05), `000078` (12/06)
- Chu Thị Thủy: 3 phiếu / 3 sao — `169` (29/05), `000194` (29/05), `184` (28/07)

### Ghi chú về cụm ngày 28/07

Ngày 28/07 có 6 cán bộ nhận sao lần thứ hai từ cùng một người tặng. Ba người mang
đúng số hiệu của lần trước (Hàn Thị Thùy Linh, Nguyễn Mạnh Quân, Chu Thị Thủy), ba
người còn lại mang số hiệu mới. Dấu hiệu của một đợt nhập bù, trong đó người nhập
chép lại số hiệu cũ. Hai trường hợp đầu là bản ghi lặp thật; trường hợp Chu Thị
Thủy là sao mới nhưng ghi nhầm số.

## 4. 118 số hiệu chưa xuất hiện — chưa kết luận được

Dải số chạy từ 1 đến 259, hiện có 141 số, còn **118 số chưa xuất hiện**, nằm thành
cụm chứ không rải đều:

`6–10`, `12–19`, `31–42`, `45–46`, `56`, `58–59`, `63–68`, `74–77`, `101–104`,
`114–119`, `130–133`, `140–146`, `155–156`, `158–159`, `172–182`, `189–191`, `195`,
`207`, `221–229`, `231–258`

Đối chiếu serial với thời gian cho thấy **số hiệu không đi theo thứ tự thời gian**:

| Tháng | Serial nhỏ nhất | Serial lớn nhất | Trung bình |
|---|---|---|---|
| 03/2026 | 157 | 166 | 163 |
| 04/2026 | 51 | 200 | 105 |
| 05/2026 | 21 | 206 | 121 |
| 06/2026 | 1 | 154 | 89 |
| 07/2026 | 5 | 259 | 148 |

Tháng 6 dùng số 1 trong khi tháng 3 đã dùng số 157. Điều này khớp với quy trình
thật: chi nhánh in sao và đóng số theo lô, sao nằm sẵn rồi rút ra phát theo nhu cầu.

Do đó 118 số chưa xuất hiện có **hai cách giải thích, dữ liệu hiện có không phân
biệt được**:

1. Sao đã in và đóng số nhưng **chưa phát** — vẫn còn trong kho.
2. Sao **đã phát nhưng phiếu chưa vào cổng** — bản kết xuất Excel nhập vào cổng
   chưa đầy đủ.

**Cách xác minh rẻ nhất: đếm số sao còn tồn trong kho.** Còn khoảng 118 chiếc thì là
trường hợp 1 và dữ liệu không thiếu gì; ít hơn nhiều thì phần chênh là phiếu đã phát
mà cổng chưa có, cần lấy lại từ Lark.

Riêng cụm `231–258` (28 số liền nhau, sát đỉnh dải, trong khi số 259 đã dùng) đáng
soát trước tiên.

## 5. Cột "Hiệu quả đem lại" đang chứa số sao

`result` bằng đúng `stars` ở **toàn bộ các dòng**. Vế **"đem lại [kết quả]"** — một
trong ba vế bắt buộc của cấu trúc ghi nhận — không có trong dữ liệu, nhưng cổng vẫn
hiển thị cột đó ở tab Chi tiết và xuất ra file đối soát.

Nguyên nhân nằm ở chuỗi `else if` nhận diện tiêu đề cột trong
`src/components/one/star/starParser.ts`:

```ts
} else if (hLower.includes('hiệu quả') || hLower.includes('kết quả')) {
  resultIdx = idx;
} else if (hLower.startsWith('7.') || hLower.includes('số lượng') || hLower.includes('số sao') || ...) {
```

Nhánh `hiệu quả` đứng **trước** nhánh `số lượng sao`. Một tiêu đề cột chứa cả hai ý
(ví dụ "Số sao tương ứng với hiệu quả mang lại") sẽ rơi vào nhánh đầu, khiến
`resultIdx` trỏ vào cột số sao.

Chỉ sửa parser là chưa đủ — dữ liệu gốc phải có cột "đem lại" thì mới có gì để nhập.
Cần kiểm tra bản kết xuất Lark xem cột này có tồn tại không.

## 6. Đường ghi dữ liệu đang tạm khóa

Đã tạm khóa toàn bộ đường ghi/xóa dữ liệu Sao trên cổng
(`src/components/one/star/starImportLock.ts`), vì đường ghi hiện nay là `replaceAll`
— xóa sạch bảng rồi ghi lại từ file Excel kết xuất tay. **Sau đợt làm sạch này, khóa
càng cần giữ**: một lần nhập đè sẽ xóa mất toàn bộ kết quả vừa xử lý và đưa 5 bản
ghi lặp quay lại.

Phần xem, thống kê, xuất file đối soát vẫn hoạt động bình thường. Mở lại bằng cách
đổi `STAR_WRITE_LOCKED` thành `false`.

## 7. Việc còn lại

1. **Đếm sao tồn kho** để kết luận 118 số hiệu chưa xuất hiện.
2. **Sửa ánh xạ cột `result`** trong parser, sau khi xác nhận bản kết xuất Lark có
   cột "đem lại".
3. **Đổi `replaceAll` sang upsert theo serial** trước khi mở khóa nhập — mỗi số
   serial một dòng, có ràng buộc duy nhất, để lỗi trùng không tái diễn.
