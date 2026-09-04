# Thông báo Sao Xứng Đáng — nghiên cứu và triển khai (04/09/2026)

Trả lời ba yêu cầu của chủ chương trình:

1. Push tới **toàn bộ cán bộ** chi nhánh khi một người được tặng Sao.
2. Đưa **cá nhân nhận Sao của tháng** lên trang chủ, ngắn gọn, không chèn khối khác.
3. Push **kích thích nhận Sao** theo mốc quà gần nhất.

## 1. Số liệu trước khi quyết — vì sao không bắn 100 tin mỗi phiếu

Đo trên dữ liệu thật ngày 04/09:

| Chỉ số | Giá trị |
|---|---|
| Cán bộ đang hoạt động | 100 |
| Người đã bật push | 71 (96 thiết bị) |
| Tin đã phát trong 30 ngày | 4.895 |
| Số loại tin đang có | 19 |
| Phiếu Sao mỗi tháng | ~35 (11 · 50 · 33 · 40 · 33 từ 04→08) |

Bắn mỗi phiếu tới cả 100 người là **+3.500 tin/tháng — tăng 71% tổng lượng thông báo
của cổng, chỉ từ một loại tin mới**. Quy ước repo (CLAUDE.md mục 5) ghi rõ thêm một
loại push là quyết định nghiệp vụ chứ không phải kỹ thuật, và đây là cách nhanh nhất
khiến cán bộ tắt push — mất luôn cả các tin điều hành đang chạy.

Đã hỏi và **chủ chương trình chốt phương án gộp ngày**.

## 2. Hai loại tin, không phải một

| Mã tin | Tới ai | Khi nào | Mức |
|---|---|---|---|
| `SAO_NHAN` | đúng người vừa được tặng | ngay khi phiếu ghi xong | `KHEN` (🔥) |
| `SAO_BAN_TIN` | mọi cán bộ đang hoạt động | 16h30 mỗi ngày làm việc | `KHEN` (🔥) |

Kết quả: **~30 tin/người/tháng** thay vì 3.500, mà toàn chi nhánh vẫn biết ai được
ghi nhận.

### `SAO_NHAN` — và đây cũng là việc (3)

Yêu cầu (3) *không* đẻ thêm loại tin thứ ba. Quy ước repo nói "mặc định là gộp vào tin
đã có", nên câu nhắc mốc quà **nằm ngay trong tin báo nhận Sao** — đúng lúc cán bộ đang
vui vì vừa được ghi nhận là lúc câu "còn 2 Sao nữa" có sức nhất. Bản chạy thật (thử có
`rollback` trên project):

> **🔥 Bạn vừa nhận 1 Sao Xứng Đáng**
> Người tặng: Nguyễn Đức Thái Hoàng
> Vì đã: thử nghiệm trigger thông báo
> Sao tích lũy: 4 Sao
> Còn 2 Sao nữa tới mốc 6 Sao — Voucher Siêu thị / Quà tặng tiện ích

Ba điều tin này **cố ý không** làm:

- **Không báo phiếu tập thể** — tập thể không có "người nhận" để gửi tới; tập thể xuất
  hiện ở bản tin ngày.
- **Không báo phiếu nhập bù** (`entry_mode = 'backfill'`) — đó là chép lại lịch sử.
  Báo "bạn vừa nhận Sao" cho một phiếu trao từ tháng trước là làm cán bộ tưởng có sao mới.
- **Không tự đặt giờ phát** — đi qua `ct2_dat_thong_bao` nên tin sinh ngoài giờ tự nằm
  chờ tới 07h00 buổi làm việc kế tiếp, đúng luật chung, không mở ngoại lệ.

### `SAO_BAN_TIN` — bản tin cuối ngày

> **🔥 Hôm nay chi nhánh trao 3 Sao Xứng Đáng**
> Sao: Tập thể Phòng TCTH (Phòng TCTH)
> Sao: Vũ Thị Thu Hà (Phòng TCTH)
> Sao: Nguyễn Thị Phượng (Phòng TCTH)

- Căn theo **lúc phiếu vào cổng**, không theo ngày trao trên phiếu: bản tin nói "hôm
  nay chi nhánh trao", nên phải là việc hôm nay của cổng.
- **Không có bản tin rỗng**: ngày không phiếu nào thì hàm im lặng.
- Cắt còn 6 dòng, dư thì gộp "và N phiếu nữa" — màn hình khóa không đọc nổi 20 dòng.
- Lịch `30 9 * * 1-5` UTC = **16h30 giờ Việt Nam**, nằm trong khung yên tĩnh 07–18h nên
  phát ngay. Hàm tự bỏ qua ngày nghỉ lễ (`ct2_la_ngay_lam_viec`).
- `sao_ban_tin_ngay(false)` chỉ **xem trước**, không ghi tin nào — TCTH thử được trước.

## 3. Đếm sao của một cán bộ — chỗ dễ sai

`sao_tong_cua_can_bo` nhận diện phiếu theo hai đường vì dữ liệu có hai thế hệ: phiếu
ghi trên cổng có `recipient_profile_id` (khớp thẳng), phiếu cũ từ Lark chỉ có họ tên chữ.

Với đường thứ hai **bắt buộc so cả phòng**: chi nhánh có cán bộ trùng họ tên (hai chị
Nguyễn Thị Phượng — Phòng TCTH và Phòng Ân Thi). So mỗi tên là cộng sao của đồng nghiệp
vào rồi push sai mốc quà cho **cả hai người**.

So phòng phải **nới** chứ không so bằng: nhãn phòng trên phiếu ngắn hơn tên danh bạ
("Phòng DVKH" ≠ "Phòng Dịch vụ khách hàng"). Luật quy nhãn đầy đủ sống ở TypeScript
(`standardizeDepartment`) và **cố ý không chép sang SQL** — chép là đẻ nguồn sự thật thứ
hai. Ở đây chỉ cần trả lời "có cùng phòng không", nên so kiểu chuỗi này nằm trong chuỗi
kia là đủ, và không bao giờ lệch khi ai đó đổi tên phòng.

## 4. Một luật, hai bản — phải sửa cùng nhau

| Luật | Bản TypeScript | Bản SQL / edge |
|---|---|---|
| Câu nhắc mốc quà | `nhacMocQuaKeTiep` (`starMath.ts`) | `sao_moc_qua_ke_tiep()` |
| Đường dẫn khi bấm thông báo | `duongDanThongBao` (`src/lib/ct2.ts`) | `duongDan()` trong `notify-ct2` |

Hai bảng này đã ghi chú chéo trong mã. Lệch nhau là cán bộ đọc push một đằng, mở cổng ra
thấy một nẻo.

## 5. Trang chủ (yêu cầu 2)

Đặt **bên trong thẻ «Tôi được ghi nhận» sẵn có**, không thêm khối mới nào — yêu cầu nói
rõ phải ngắn để không chèn lên nội dung khác. Thẻ nay có ba tầng: số Sao tích lũy (đã
có) → câu mốc quà kế tiếp → bảng «Sao của tháng» tối đa 5 tên, dư thì đếm gộp.

Chỉ lấy **phiếu cá nhân**: đây là chỗ vinh danh người, một dòng "Tập thể Phòng KHDN"
chen giữa các tên người làm hỏng đúng thứ nó định làm. Dùng lại bộ phiếu React Query đã
tải sẵn nên **không thêm một lượt gọi mạng nào** cho trang chủ.

## 6. Việc còn lại

- Theo dõi số người tắt push sau 2–3 tuần. Nếu bản tin ngày bị kêu là nhiều, hạ xuống
  bản tin tuần chỉ cần đổi lịch cron, không phải sửa mã.
- Mốc quà lấy theo `STAR_REWARD_TIERS` (văn bản mục 5.2). Nếu chủ chương trình chốt luật
  "từ mốc 8 Sao đóng dấu ĐÃ ĐỔI QUÀ, dừng tích lũy" như văn bản ghi, thì cả `starMath.ts`
  lẫn `sao_moc_qua_ke_tiep()` phải sửa cùng lúc.
