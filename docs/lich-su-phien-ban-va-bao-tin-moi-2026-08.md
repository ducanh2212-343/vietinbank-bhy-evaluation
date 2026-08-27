# Lịch sử phiên bản & cách báo tính năng mới cho cán bộ

19/08/2026. Trả lời yêu cầu: *«Xây dựng lại tính năng Lịch sử phiên bản để cán bộ
biết những tính năng mới lên hệ thống; nghiên cứu cứ có tính năng mới thì có push
cho cán bộ biết không; xác định nguyên tắc đánh dấu phiên bản; nguyên tắc để mỗi
lần cập nhật tại nhiều session khác nhau đều được cập nhật, các PR khác nhau sẽ
có cập nhật tại đây; cập nhật cần tóm tắt các tính năng mới, điểm chính của lần
cập nhật.»*

---

## 1. Bản cũ hỏng ở đâu — đo bằng số

Lịch sử phiên bản cũ là **một mảng `VERSION_HISTORY` nằm giữa file
`src/lib/version.ts`**, mỗi lần cập nhật phải chèn một mục vào **đầu mảng**.

Ba lỗi kết cấu, không phải lỗi ai đó lười:

| Lỗi | Hệ quả đo được |
| --- | --- |
| Mọi lần cập nhật đều sửa **cùng một dòng, ở cùng một chỗ** | Repo này thường xuyên có 3–4 nhánh `claude/*` chạy song song. Hai nhánh cùng thêm mục = xung đột git ngay tại dòng đầu mảng. Người gộp chọn "giữ bên mình" thì mục của bên kia **biến mất im lặng**. |
| Không có gì bắt buộc phải thêm mục | Mục cuối cùng là **v3.1.1 ngày 05/07/2026**. Từ đó tới 19/08/2026 đã lên: cổng BHY ONE, Chiêu thức 2 (Kanban + PDTD), Cây Ký Ức, BHY Ideas + Hội đồng, chuẩn push mới, nhắc nhịp sáng, tài khoản khách… — **45 ngày, ~44 PR, 0 dòng lịch sử**. |
| Trang duy nhất hiển thị lịch sử là `/cai-dat`, `minRole: 'admin'` | Đúng nhóm **không cần đọc** thì thấy; **150 cán bộ thực sự dùng** hệ thống thì không có chỗ nào biết tuần này có gì khác. |

Nói ngắn: cái hỏng không phải nội dung, mà là **chỗ đặt nội dung** và **ai được đọc**.

---

## 2. Nghiên cứu: cứ có tính năng mới thì có push cho cán bộ không?

### 2.1. Ba con số phải nhìn trước khi trả lời

1. **Hệ thống đã có 21+ loại push đang chạy** (bảng đầy đủ:
   `docs/chuan-hinh-thuc-push-2026-08.md` mục 3) — nhắc nhịp sáng 07:30, giao
   việc, trao đổi, hồ sơ tín dụng, digest ngày cho Trưởng phòng, nhịp tuần các
   cấp, nhắc nộp phiếu, nhắc lịch nghỉ… Điện thoại cán bộ **không còn chỗ trống**
   cho một loại tin mới bắn theo nhịp merge code.
2. **Chỉ 27/100 cán bộ đã bật thông báo trên trình duyệt**
   (`docs/vi-sao-khong-thay-push-notification-2026-08.md` mục 3) — Bán lẻ 2/8,
   KHDN 2/15. Nếu push là kênh DUY NHẤT để báo tính năng mới thì **73% cán bộ
   không bao giờ biết**. Push không thể là kênh chính.
3. **Đã có tiền lệ về giá phải trả**: đợt nhập 97 thẻ lịch sử từ Miro bắn tin
   "vừa được giao một việc" và **ăn sạch hạn mức tin trong ngày** của người
   nhận, khiến tin ghi nhịp thật bị nuốt im lặng. Bài học: tin không cần hành
   động mà bắn theo nhịp máy móc thì thứ chết đầu tiên là **tin cần hành động**.

### 2.2. Ba phương án đã cân

| Phương án | Được | Mất | Kết luận |
| --- | --- | --- | --- |
| **A. Push mỗi tính năng mới** (mỗi PR một push) | Cán bộ biết ngay | 44 PR trong 45 ngày ⇒ ~1 push/ngày về việc "lập trình viên vừa sửa xong việc". Đây đúng là loại tin dạy người dùng phản xạ **vuốt bỏ không đọc** — và phản xạ đó áp cho cả tin giao việc lẫn tin vướng mắc. | **Loại** |
| **B. Không push, chỉ để trong app** | Yên tĩnh tuyệt đối | Cán bộ không mở mục đó thì không bao giờ biết. Đúng cảnh bản cũ: có trang lịch sử mà 45 ngày không ai đọc vì không ai biết nó tồn tại. | **Loại** |
| **C. Gộp theo ĐỢT, nhiều kênh, có người bấm nút** | Điện thoại rung tối đa 1–2 lần một đợt; ai không bật push vẫn thấy chuông + chấm đỏ + hộp giới thiệu | Phải có người bấm nút công bố | **Chọn** |

### 2.3. Chính sách chốt

**Không tự động push khi bản mới lên máy chủ.** Bản mới lên không có nghĩa là
dùng được: có đợt còn chờ áp migration, chờ deploy edge function — báo trước là
đẩy cán bộ tới một màn hình lỗi rồi bảo họ "tính năng mới đấy". Người bấm nút
là người biết đợt này đã chạy thật hay chưa.

Kênh theo **mức thay đổi**:

| Mức | Chuông trong app | Push điện thoại | Hộp «Có gì mới» giữa màn hình | Chấm đỏ trên thanh điều hướng |
| --- | --- | --- | --- | --- |
| **Nâng cấp lớn** (`lon`) | ✅ | ✅ | ✅ | ✅ |
| **Tính năng mới** (`tinh-nang`) | ✅ | ✅ (tắt được khi công bố) | ✅ | ✅ |
| **Sửa lỗi & tinh chỉnh** (`sua-loi`) | ❌ | ❌ | ❌ | ✅ (chỉ đếm, không chen ngang) |

Bốn ràng buộc đi kèm:

- **Một đợt = một tin.** Mọi mục chưa công bố gộp vào một thông báo. Ba mục đầu
  in thành ba dòng `Mới 1:` / `Mới 2:` / `Mới 3:`, phần còn lại thành
  «Và N cập nhật khác.» — màn hình khóa cắt hết phần thứ tư, dòng thứ tư chỉ
  tồn tại trong cơ sở dữ liệu chứ không ai đọc.
- **Tách theo người nhận.** Mục có `danhCho` (ví dụ chỉ quản trị) đi thành tin
  riêng cho đúng nhóm đó — không làm phiền cả Chi nhánh vì một nút chỉ Phòng
  TCTH bấm.
- **Im lặng ngoài giờ.** Tin dùng đúng `ct2_moc_phat_gan_nhat()` như mọi tin
  khác: công bố lúc 21h thì tin nằm chờ tới 7h00 buổi làm việc kế tiếp.
- **Hộp giữa màn hình mở trễ 1,2 giây** để không giành chỗ với hộp mẹo tính năng
  và các hộp khác lúc vừa đăng nhập; đóng hộp = đánh dấu đã xem.

Hình thức tin theo đúng chuẩn 09/08/2026: tiêu đề ngắn mang con số
(«Hệ thống có 4 tính năng mới»), thân tin mỗi dòng một nhãn, không nối bằng «·»,
không dán nhãn phân hệ `[CT2]` (tin này nói về cả hệ thống).

### 2.4. Vì sao KHÔNG dùng lại «Mẹo tính năng» có sẵn

Bảng `feature_tips` đã có sẵn banner + modal + push và trông rất giống việc này.
Nhưng nó trả lời một câu hỏi khác: *«tính năng này đã có lâu rồi, anh/chị có
biết dùng chưa?»* — nên nó nhắm vào **người lâu không đăng nhập** (mặc định 7
ngày) và lặp lại theo chu kỳ 30 ngày. Lịch sử phiên bản trả lời
*«hệ thống vừa có thêm gì»* — nhắm vào **mọi người**, **đúng một lần**, và nội
dung sinh ra cùng lúc với mã nguồn. Trộn hai thứ vào một bảng thì mỗi lần lên
tính năng lại phải nhớ đi soạn tay một tip — tức là quay về đúng cái bẫy
"không ai bắt buộc nên không ai làm" đã giết bản cũ.

---

## 3. Nguyên tắc đánh dấu phiên bản

### 3.1. Ý nghĩa X.Y.Z

| Vị trí | Mã trong dữ liệu | Khi nào | Ví dụ có thật |
| --- | --- | --- | --- |
| **X** — nâng cấp lớn | `lon` | Thêm/đổi cả một phân hệ; đổi cấu trúc dữ liệu hoặc quy trình nghiệp vụ mà cán bộ phải làm khác đi | v4.0.0 cổng BHY ONE · v5.0.0 Chiêu thức 2 · v6.0.0 Hội đồng BHY Ideas |
| **Y** — tính năng mới | `tinh-nang` | Thêm màn hình / tính năng / quy tắc mới trong một phân hệ | v5.1.0 bàn PDTD · v5.7.0 nhắc nhịp sáng 07:30 |
| **Z** — sửa lỗi | `sua-loi` | Sửa lỗi, tinh chỉnh giao diện, đổi chữ, tăng tốc | v3.1.1 mục D tự điền cấp độ · v5.3.1 rà soát bảo mật |

### 3.2. Số phiên bản KHÔNG do người viết đặt

Đây là điểm khác căn bản so với bản cũ. Người viết mục **chỉ khai `loai`**;
`src/lib/lichSuPhienBan.ts` xếp mọi mục theo `(ngày, mã)` tăng dần rồi cuộn dồn
ra số phiên bản.

Vì sao: nếu để đặt tay thì hai phiên làm việc song song cùng nhìn thấy "hiện tại
là v6.1.0" và cùng đặt "v6.2.0" cho mục của mình. Gộp nhánh xong có **hai mục
cùng số** — phải sửa tay, và sửa tay thì phải có người phát hiện ra. Để hệ thống
tự tính thì gộp nhánh xong số tự giãn ra đúng: 6.2.0 và 6.3.0, **không ai phải
làm gì**.

Chốt phụ là `ma` (không phải thứ tự file) nên hai máy khác nhau, hai hệ điều
hành khác nhau đều cho **cùng một kết quả**.

### 3.3. Ngày ghi trong mục là ngày nào

Ghi **ngày tính năng lên hệ thống** (ngày merge / ngày công bố), không phải ngày
ngồi viết code. Cán bộ đọc "cập nhật 15/08" thì hiểu là từ 15/08 dùng được.

### 3.4. Mục cũ có được sửa số không

Không. Số phiên bản đã hiện cho cán bộ xem là số cố định — chín mục trước
07/2026 giữ nguyên bằng trường `phienBanCoDinh` trong file lưu trữ
`0000-lich-su-truoc-07-2026.ts`. **Mục mới tuyệt đối không đặt trường này**, và
có kiểm thử canh: mục nào ngày ≥ 19/08/2026 mà đặt `phienBanCoDinh` thì test đỏ.

---

## 4. Nguyên tắc để MỌI phiên làm việc, MỌI PR đều cập nhật vào đây

### 4.1. Một lần cập nhật = một FILE MỚI

```
src/data/changelog/2026-08-19-lich-su-phien-ban.ts
                   └── ngày ──┘ └──── slug ────┘   = cũng chính là `ma`
```

Thêm mục là **thêm file**, không sửa file nào đang có. Git không có gì để xung
đột: hai nhánh thêm hai file khác tên thì gộp xong có đủ cả hai, không cần ai
giải quyết gì. Đây là câu trả lời trực tiếp cho *«nguyên tắc để mỗi lần cập nhật
tại nhiều session khác nhau sẽ đều được cập nhật»*.

Tạo file bằng lệnh, đừng copy file cũ (copy là cách chắc chắn nhất để quên đổi `ma`):

```sh
npm run phien-ban -- ten-ngan-khong-dau --loai=tinh-nang --phan-he=chieu-thuc-2
```

### 4.2. Việc bắt buộc của mỗi PR

Đưa vào checklist làm việc — **PR nào đổi thứ cán bộ nhìn thấy hoặc thao tác
thì phải kèm đúng một file changelog**:

| Loại PR | Có phải thêm mục không |
| --- | --- |
| Thêm/đổi màn hình, nút bấm, quy tắc nghiệp vụ, thông báo | **Có** |
| Sửa lỗi cán bộ gặp phải | **Có** (`sua-loi`) |
| Đổi tài liệu, đổi test, dọn mã, đổi cấu hình build | Không |
| Nhập dữ liệu, chạy migration không đổi giao diện | Không |

Một PR gộp nhiều việc rời rạc thì thêm **nhiều file**, mỗi việc một file — đừng
nhồi năm việc vào một mục rồi tóm tắt chung chung, vì mục là thứ cán bộ đọc chứ
không phải nhật ký của lập trình viên.

### 4.3. Sáu tình huống khi nhiều phiên làm việc cùng chạy

Đây là phần trả lời trực tiếp cho *«các PR tạo từ các session khác nhau thì quy
ước thế nào, cách nào để thống nhất»*. Sáu tình huống có thể xảy ra, và cái gì
xử lý cái nào:

| # | Tình huống | Hệ quả | Ai xử lý |
| --- | --- | --- | --- |
| A | Hai PR thêm hai mục khác tên file | Không xung đột. Gộp xong có đủ cả hai, số phiên bản tự giãn ra | **Kết cấu** — mỗi mục một file |
| B | Hai PR cùng ngày, cùng slug ⇒ cùng tên file | Xung đột git add/add — **ồn ào, thấy ngay**, sửa bằng đổi tên một file | Git. Phòng bằng cách đặt slug mô tả đúng tính năng, không đặt `sua-loi`, `cai-tien` |
| C | Hai PR cùng nhắm một số phiên bản | **Không xảy ra được** — không ai đặt số, hệ thống tự tính sau khi gộp | **Kết cấu** — số phiên bản là kết quả, không phải đầu vào |
| D | PR gộp muộn nhưng ghi ngày sớm hơn | Các mục sau bị đánh số lại. Cán bộ KHÔNG bị dội tin (mốc đã xem theo `ma`), nhưng số phiên bản đã in ra có thể lệch | **Quy ước**: ngày = ngày merge, không lùi ngày |
| E | PR quên hẳn không thêm mục | Trước 19/08 thì **không ai biết** — đúng cách bản cũ chết | **Cổng chặn CI** (mục 4.4) |
| F | Hai quản trị viên cùng bấm công bố một đợt | Chỉ ra một tin | **Database** — `phien_ban_cong_bo` khoá chính là mã mục |

Điểm mấu chốt: **không có bước nào cần hai phiên làm việc phải biết nhau đang
làm gì**. Mỗi nhánh làm xong việc của mình, thứ tự gộp nhánh quyết định thứ tự
phiên bản, và kết quả giống nhau trên mọi máy (chốt xếp là `(ngày, mã)` chứ
không phải thứ tự file mà hệ điều hành trả về).

### 4.4. Ba lớp giữ cho quy ước không rơi

Quy ước chỉ nằm trong tài liệu thì phiên làm việc sau **có thể không đọc tới**.
Ba lớp, xếp từ sớm tới muộn:

| Lớp | Nơi | Bắt được gì |
| --- | --- | --- |
| 1. Phiên làm việc vừa mở | `CLAUDE.md` ở gốc repo | Claude Code đọc file này mỗi phiên — quy ước tới tay trước cả dòng mã đầu tiên |
| 2. Lúc mở PR | `.github/pull_request_template.md` | Ô tick «đã thêm file changelog» + phần «cần làm khi triển khai» |
| 3. Trước khi gộp | `.github/workflows/kiem-tra.yml` → `scripts/kiem-tra-changelog.mjs` | PR đổi `src/**`, `supabase/functions/**`, `supabase/migrations/**`, `public/**`, `index.html` mà **không thêm file nào** trong `src/data/changelog/` ⇒ **đỏ** |

Cổng chặn có cửa thoát cho PR thuần kỹ thuật: ghi `[khong-can-changelog]` vào
commit message. Cửa thoát **để lại vết trong lịch sử git** — bỏ qua có lý do thì
được, bỏ qua im lặng thì không.

Tự kiểm trước khi mở PR:

```sh
npm run phien-ban:kiem-tra -- origin/main
```

CI cố ý **không chạy `npm run lint`**: repo đang nợ 544 lỗi lint có sẵn, bật lên
là mọi PR đỏ ngay từ commit đầu — và một cổng lúc nào cũng đỏ thì mất luôn tác
dụng của hai cổng còn lại.

### 4.5. Hàng rào máy kiểm — nguyên tắc mà máy không canh thì chỉ là lời khuyên

`src/lib/__tests__/lichSuPhienBan.test.ts` (chạy trong `npm run test`) bắt đỏ khi:

- `ma` trùng nhau, hoặc `ma` không trùng tên file;
- một file chứa nhiều hơn một mục (trừ file lưu trữ lịch sử cũ);
- ngày sai định dạng, hoặc ngày ở tương lai xa (gõ nhầm năm);
- phân hệ không có thật;
- tiêu đề dài quá 80 ký tự (gãy dòng trên điện thoại), tóm tắt rỗng;
- điểm chính rỗng hoặc quá 5 dòng;
- mục mới đặt tay số phiên bản;
- số phiên bản tính ra bị trùng, hoặc thứ tự thời gian đảo lộn.

### 4.6. Viết nội dung cho ai

Viết cho **cán bộ**, không viết cho lập trình viên: không tên bảng, không tên
hàm, không số migration. Ba trường bắt buộc trả lời ba câu:

| Trường | Trả lời câu hỏi |
| --- | --- |
| `tieuDe` (≤ 80 ký tự) | Cán bộ **được gì**? |
| `tomTat` (1–3 câu) | Dùng để làm gì, **thay cho cách làm cũ nào**? |
| `diemChinh` (1–5 gạch đầu dòng) | **Điểm chính** của lần cập nhật — mỗi dòng một việc làm được |

Thêm `duongDan` khi có màn hình mở thẳng được (nút «Xem ngay»), `danhCho` khi
mục chỉ liên quan một nhóm vai trò, `pr` để tra ngược.

---

## 5. Các mảnh ghép và vai của từng mảnh

| Nơi | Vai |
| --- | --- |
| `src/data/changelog/*.ts` | **Nguồn sự thật** — mỗi lần cập nhật một file |
| `src/lib/lichSuPhienBan.ts` | Gom mục, tính số phiên bản, lọc theo vai trò, soạn tin công bố |
| `src/lib/version.ts` | Lớp tương thích (hằng số phiên bản) + danh mục **tính năng chính** (hệ thống làm được gì, ở thì hiện tại — khác lịch sử phiên bản) |
| `src/pages/CoGiMoiPage.tsx` → `/co-gi-moi` | Trang cán bộ đọc, lọc theo phân hệ và mức |
| `src/components/phien-ban/CoGiMoiNut.tsx` | Nút + chấm đỏ trên thanh điều hướng, cạnh chuông |
| `src/components/phien-ban/CoGiMoiHopThoai.tsx` | Hộp giới thiệu một lần sau đợt cập nhật đáng kể |
| `src/components/phien-ban/CongBoPhienBanPanel.tsx` | Khối trong `/cai-dat`: xem trước tin, chọn có push hay không, bấm công bố |
| `src/hooks/usePhienBanMoi.ts` | Mốc "đã xem tới đâu" của từng người |
| `phien_ban_da_xem` (DB) | Mốc đã xem — theo người, đồng bộ giữa điện thoại và máy tính |
| `phien_ban_cong_bo` (DB) | Sổ đợt đã công bố — khoá chính là `ma` nên bấm hai lần cũng chỉ ra một tin |
| `phien_ban_cong_bo_dot()` (RPC) | Chèn tin vào hàng đợi `ct2_thong_bao` cho cán bộ đang hoạt động (trừ khách đối tác) rồi kích hoạt phát push |

Mốc "đã xem" lưu theo **`ma` chứ không theo số phiên bản**: mã gắn chết với một
lần cập nhật, còn số phiên bản là thứ tự tính nên có thể dịch nếu về sau có mục
được bổ sung lùi ngày.

Người **chưa từng có mốc** (mới được cấp tài khoản) được đặt mốc ở mục mới nhất
mà không báo gì — bắt họ đọc lại 25 tin cũ là cách nhanh nhất để họ tắt hết và
không bao giờ mở lại.

---

## 6. Vận hành: sau mỗi đợt lên bản mới

1. Bản mới đã chạy thật trên `chieuthuc3.com`, migration đã áp, edge function đã deploy.
2. Vào **Cài đặt → Công bố phiên bản cho cán bộ**: khối liệt kê các mục chưa
   báo và **in sẵn tin cán bộ sẽ nhận**.
3. Chọn có gửi push hay không (tắt = chỉ hiện ở chuông), bấm **Công bố tới cán bộ**.
4. Tin nằm chờ tới 7h00 buổi làm việc kế tiếp nếu bấm ngoài giờ.

Bấm nhầm hai lần không sao: RPC loại sẵn các mục đã có trong sổ công bố.

---

## 7. Việc còn phải làm khi triển khai

- [ ] Áp migration `supabase/migrations/20260928090000_lich_su_phien_ban.sql` vào
      project `whlysprzsguehxmrjwha` (bảng `phien_ban_da_xem`, `phien_ban_cong_bo`,
      RPC `phien_ban_danh_dau_da_xem`, `phien_ban_cong_bo_dot`).
      Chưa áp thì trang «Có gì mới» vẫn chạy bình thường — mốc đã xem rơi về
      trình duyệt của từng máy, và khối công bố sẽ báo lỗi khi bấm.
- [ ] Deploy lại edge function `notify-ct2` (thêm nhánh `PHIEN_BAN`: bấm push mở
      thẳng `/co-gi-moi`, không dán nhãn `[CT2]`).
- [ ] Sau khi áp xong: vào `/cai-dat` → «Công bố phiên bản cho cán bộ». Khối
      này đang có **cả phần tồn đọng** — 16 mục đáng kể từ 30/07 tới 19/08 (và
      các mục trước 07/2026) vốn đã lên hệ thống từ lâu, cán bộ đã dùng rồi.
      Cách làm nên theo:
      1. Bỏ tick các mục cũ, bấm **«Đánh dấu đã báo, không gửi tin»** — đóng sổ
         phần lịch sử mà không làm phiền ai.
      2. Tick riêng mục «Có gì mới» (19/08) rồi bấm **«Công bố tới cán bộ»** —
         đúng một tin, giới thiệu chính chỗ để từ nay đọc các cập nhật sau.
