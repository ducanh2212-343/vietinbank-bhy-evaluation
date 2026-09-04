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

## 2. Chốt lại: chung vui NGAY, không gộp cuối ngày

Bản đầu tôi dựng phương án gộp: người nhận có tin riêng, cả chi nhánh đọc một bản tin
cuối ngày. Chủ chương trình đọc con số ở mục 1 và **vẫn chọn phát ngay**, với lý do
đúng và tôi ghi lại đây để người sau không "tối ưu" ngược:

> *Mục tiêu của Sao Xứng Đáng không phải là ít tin, mà là truyền thông và để cán bộ
> được ghi nhận thấy tự hào. Tin vui đọc sau 8 tiếng thì hết là tin vui.*

Ba loại tin, trong đó **loại gộp đã tắt** (giữ hàm làm đường lui):

| Mã tin | Tới ai | Khi nào | Trạng thái |
|---|---|---|---|
| `SAO_NHAN` | đúng người vừa được tặng | ngay khi phiếu ghi xong | đang chạy |
| `SAO_CHUNG_VUI` | toàn chi nhánh (trừ người nhận và người ghi phiếu) | ngay khi phiếu ghi xong | đang chạy |
| `SAO_BAN_TIN` | mọi cán bộ | 16h30 ngày làm việc | **đã tắt lịch** |

Chi phí thực tế: ~35 phiếu/tháng × ~98 người ≈ **3.400 tin/tháng**, tăng ~70% tổng
lượng thông báo của cổng. Đây là lựa chọn đã cân nhắc, không phải sơ suất.

**Đường lui đã dựng sẵn.** Nếu sau vài tuần số người tắt push tăng, chạy
`supabase/rollbacks/20260904160000_sao_chung_vui_toan_chi_nhanh_down.sql` là quay về
phương án gộp — một lệnh, không sửa mã, người nhận vẫn giữ tin riêng.

### `SAO_CHUNG_VUI` — tin cả chi nhánh cùng đọc

> **🔥 Chu Hồng Hải vừa nhận 1 Sao Xứng Đáng**
> Phòng: Phòng DVKH
> Vì đã: Nỗ lực trong công tác Huy động vốn tháng 8. FD tăng 14 tỷ
> Người tặng: Nguyễn Thị Huyền

- **Tên đứng đầu tiêu đề**, không phải chữ "Có người được tặng Sao": vinh danh là gọi
  đúng tên. Đây là thứ làm nên phần "tự hào".
- **Vế «vì đã» giữ nguyên trên thân tin** — đó chính là nội dung được truyền thông, và
  là lý do văn bản bắt ghi nhận theo cấu trúc ba vế.
- Phiếu **tập thể cũng chung vui** (đã thử: «Tập thể PGD Ocean City vừa nhận 2 Sao»);
  chỉ tin riêng mới bỏ qua tập thể vì không có "người nhận" để gửi tới.
- **Không báo hai lần**: người được tặng nhận tin riêng, bị loại khỏi tin chung. Người
  vừa bấm ghi phiếu cũng bị loại — họ vừa gõ xong, biết rồi.
- **Một câu `INSERT` cho ~98 người**, không gọi `ct2_dat_thong_bao` 98 lần: lệnh chạy
  bên trong giao dịch ghi phiếu, nên vòng lặp là bắt lãnh đạo ngồi nhìn nút «Ghi nhận
  Sao» quay xong 98 lần chèn.
- **Vẫn theo luật giờ yên tĩnh**: sao trao ngoài giờ thì tin nằm chờ tới 07h00 buổi làm
  việc kế tiếp. Không mở ngoại lệ, kể cả cho tin vui.
- **Phiếu nhập bù không chung vui**: chép lại lịch sử mà báo "vừa nhận" là làm cả chi
  nhánh mừng nhầm chuyện của tháng trước.

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

- **Theo dõi số người tắt push sau 2–3 tuần** — đây là rủi ro đã biết của phương án
  phát ngay. Truy vấn để theo dõi:
  `select count(distinct profile_id) from push_subscriptions where is_active;`
  (mốc ngày 04/09: **71/100 người**). Tụt đáng kể thì cân nhắc chạy file gỡ ở mục 2.
- Mốc quà lấy theo `STAR_REWARD_TIERS` (văn bản mục 5.2). Nếu chủ chương trình chốt luật
  "từ mốc 8 Sao đóng dấu ĐÃ ĐỔI QUÀ, dừng tích lũy" như văn bản ghi, thì cả `starMath.ts`
  lẫn `sao_moc_qua_ke_tiep()` phải sửa cùng lúc.
