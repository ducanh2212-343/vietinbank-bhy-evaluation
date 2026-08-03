# Rà soát dữ liệu Sao Xứng Đáng (bảng `star_records`) — 08/2026

Rà trên toàn bộ 141 phiếu đang có trên cổng. Mọi con số dưới đây lấy trực tiếp từ
Supabase, không ước lượng.

## 0. Tóm tắt

| Chỉ số | Giá trị |
|---|---|
| Số phiếu | 141 |
| Tổng sao | 146 |
| Tổng số serial ghi nhận | 146 |
| Số serial khác nhau | 140 |
| **Serial bị dùng lại** | **6** |
| Dải số serial | 1 → 259 |
| Số hiệu chưa xuất hiện trong dải | 119 |

Hai việc cần xử lý: **6 serial trùng** (mục 2) và **cột "Hiệu quả đem lại" bị ánh
xạ sai** (mục 4). Một việc cần chi nhánh xác nhận: **119 số hiệu chưa xuất hiện**
(mục 3).

## 1. Quy tắc serial thực tế: 1 sao = 1 số, không phải 1 phiếu = 1 số

Kiểm tra chéo số serial trên từng phiếu với số sao của phiếu đó:

| Số sao | Số serial trên phiếu | Số phiếu | Kết quả |
|---|---|---|---|
| 1 | 1 | 137 | khớp |
| 2 | 2 | 3 | khớp |
| 3 | 3 | 1 | khớp |

**141/141 phiếu khớp, không một ngoại lệ.** Phiếu 2 sao mang 2 số hiệu, phiếu 3
sao mang 3 số hiệu:

- `000072, 000082` — Nguyễn Quốc Tân (KHDN), 2 sao, 05/05
- `000113,000120` — Lê Thị Hương Huệ (Văn Giang), 2 sao, 05/05
- `29; 30` — Tập thể Phòng Ân Thi, 2 sao, 28/05
- `193, 196, 213` — Vũ Đức Nam (TCTH), 3 sao, 28/07

Đây là điểm cần thống nhất lại: dữ liệu cho thấy mỗi **ngôi sao vật lý** được đóng
một số riêng, nên một hành động 3 sao tiêu thụ 3 số hiệu. Trường `serial` hiện là
một ô chữ tự do nên người nhập phải nhồi nhiều số vào cùng một ô, với ba kiểu ngăn
cách khác nhau (`, ` / `,` / `; `).

Hệ quả: **không dùng `serial` làm khóa định danh phiếu được.** Muốn dùng làm khóa
thì phải tách 1 phiếu N sao thành N dòng, mỗi dòng một số hiệu.

## 2. Sáu serial bị dùng lại

| Serial | Cán bộ | Lần 1 | Lần 2 | Đánh giá |
|---|---|---|---|---|
| 5 | Trần Hà Trang (Bán lẻ) | 01/07 | 01/07 | **Nhập lặp** — cùng ngày, cùng người tặng, cùng việc (sáng kiến Đọc–Học) |
| 124 | Đỗ Thị Bích Ngãi (Văn Lâm) | 23/04 | 23/04 | **Nhập lặp** — cùng ngày, cùng người tặng, cùng việc (huy động ~14 tỷ tháng 4) |
| 210 | Hàn Thị Thùy Linh (KHDN) | 15/07 | 28/07 | **Nhập lặp** — cùng việc (sản phẩm chuyển đổi số BHY Ideas) |
| 220 | Nguyễn Mạnh Quân (DVKH) | 15/07 | 28/07 | **Nhập lặp** — cùng việc (đóng góp chương trình 20 năm) |
| 194 | Chu Thị Thủy (TCTH) | 29/05 | 28/07 | **Hai việc khác nhau, trùng số** — bán đấu giá tài sản / triển khai 2 công cụ hỗ trợ |
| 84 | Nguyễn Quốc Tân (KHDN) | 03/04 | 12/06 | **Cần xác nhận** — hai lần đều về "giải ngân đúng tiến độ", khác ngày |

→ **4 phiếu chắc chắn là bản ghi thừa, tức 4 sao đang bị tính dư.** Tổng thực tế
nhiều khả năng là 142 sao, không phải 146.

### Cụm ngày 28/07

Ngày 28/07 có 6 cán bộ nhận sao lần thứ hai, đều do cùng một người tặng. Ba trong
số đó (Chu Thị Thủy, Hàn Thị Thùy Linh, Nguyễn Mạnh Quân) mang **đúng số hiệu của
lần trước**, ba người còn lại (Mai Hải Quân, Nguyễn Đức Thái Hoàng, Phạm Thị Diễm
Ly) mang số hiệu mới. Dấu hiệu của một đợt nhập bù, trong đó vài phiếu cũ bị nhập
lại và người nhập chép lại số hiệu cũ.

## 3. 119 số hiệu chưa xuất hiện — chưa kết luận được

Dải số chạy từ 1 đến 259, trong đó 140 số có mặt, 119 số chưa xuất hiện. Các số
này **nằm thành cụm**, không rải đều:

`6–10`, `12–19`, `31–42`, `45–46`, `56`, `58–59`, `63–68`, `74–77`, `101–104`,
`114–119`, `130–133`, `140–146`, `155–156`, `158–159`, `172–182`, `184`, `189–191`,
`195`, `207`, `221–229`, `231–258`

Đối chiếu serial với thời gian cho thấy **số hiệu không đi theo thứ tự thời gian**:

| Tháng | Số sao | Serial nhỏ nhất | Serial lớn nhất | Trung bình |
|---|---|---|---|---|
| 03/2026 | 3 | 157 | 166 | 163 |
| 04/2026 | 12 | 51 | 200 | 105 |
| 05/2026 | 52 | 21 | 206 | 121 |
| 06/2026 | 34 | 1 | 154 | 89 |
| 07/2026 | 45 | 5 | 259 | 148 |

Tháng 6 dùng số 1 trong khi tháng 3 đã dùng số 157. Vậy sao **không** được phát
theo thứ tự số hiệu. Điều này khớp với quy trình thật: chi nhánh in sao và đóng số
theo lô, sao nằm sẵn rồi rút ra phát theo nhu cầu.

Do đó 119 số chưa xuất hiện có **hai cách giải thích, dữ liệu hiện có không phân
biệt được**:

1. Sao đã in và đóng số nhưng **chưa phát** — vẫn còn trong kho.
2. Sao **đã phát nhưng phiếu chưa vào cổng** — bản kết xuất Excel nhập vào cổng
   chưa đầy đủ.

**Cách xác minh rẻ nhất: đếm số sao còn tồn trong kho.** Nếu còn khoảng 113 chiếc
thì là trường hợp 1 và dữ liệu không thiếu gì. Nếu còn ít hơn nhiều thì phần chênh
là phiếu đã phát mà cổng chưa có, cần lấy lại từ Lark.

Riêng cụm `231–258` (28 số liền nhau, nằm sát đỉnh dải, trong khi số 259 đã được
dùng) đáng soát trước tiên.

## 4. Cột "Hiệu quả đem lại" đang chứa số sao

`result` bằng đúng `stars` ở **cả 141/141 dòng** (137 dòng "1", 3 dòng "2", 1 dòng
"3"). Vế **"đem lại [kết quả]"** — một trong ba vế bắt buộc của cấu trúc ghi nhận
— không có trong dữ liệu, nhưng cổng vẫn hiển thị cột đó ở tab Chi tiết và xuất ra
file đối soát.

Nguyên nhân nằm ở chuỗi `else if` nhận diện tiêu đề cột trong
`src/components/one/star/starParser.ts`:

```ts
} else if (hLower.includes('hiệu quả') || hLower.includes('kết quả')) {
  resultIdx = idx;
} else if (hLower.startsWith('7.') || hLower.includes('số lượng') || hLower.includes('số sao') || ...) {
```

Nhánh `hiệu quả` đứng **trước** nhánh `số lượng sao`. Một tiêu đề cột có chứa cả
hai ý (ví dụ "Số sao tương ứng với hiệu quả mang lại") sẽ rơi vào nhánh đầu, khiến
`resultIdx` trỏ vào cột số sao.

Chỉ sửa parser là chưa đủ — dữ liệu gốc phải có cột "đem lại" thì mới có gì để
nhập. Cần kiểm tra bản kết xuất Lark xem cột này có tồn tại không.

## 5. Việc đã làm

Đã **tạm khóa toàn bộ đường ghi/xóa** dữ liệu Sao trên cổng
(`src/components/one/star/starImportLock.ts`), vì đường ghi hiện nay là
`replaceAll` — xóa sạch bảng rồi ghi lại từ file Excel kết xuất tay. Chừng nào chưa
chốt bản dữ liệu gốc đã làm sạch, mỗi lần nhập đè là một lần xóa mất bản đang dùng
để đối chiếu.

Phần xem, thống kê, xuất file đối soát vẫn hoạt động bình thường. Mở lại bằng cách
đổi `STAR_WRITE_LOCKED` thành `false`.

## 6. Đề xuất thứ tự xử lý

1. **Chốt quy tắc serial** — 1 sao 1 số (như dữ liệu đang thể hiện) hay 1 phiếu 1 số.
   Quyết định này chi phối toàn bộ thiết kế khóa và cách chống trùng về sau.
2. **Xử lý 4 phiếu nhập lặp** — xác nhận rồi gỡ, đưa tổng về đúng.
3. **Xác nhận 2 ca còn lại** — serial 194 và 84.
4. **Đếm sao tồn kho** để kết luận 119 số hiệu.
5. **Sửa ánh xạ cột `result`** trong parser, sau khi xác nhận bản kết xuất Lark có
   cột "đem lại".
6. Chỉ mở khóa nhập sau khi có bản dữ liệu gốc đã làm sạch, và nên đổi `replaceAll`
   sang upsert theo khóa ổn định trước khi mở.
