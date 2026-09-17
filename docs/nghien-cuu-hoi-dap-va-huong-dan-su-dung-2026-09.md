# Nghiên cứu — Hỏi đáp & hướng dẫn sử dụng trong Bắc Hưng Yên ONE

17/09/2026. Trả lời yêu cầu: *«Nghiên cứu xây dựng tính năng hỏi đáp, hướng dẫn
sử dụng trong Bắc Hưng Yên One.»*

Tài liệu này là **bản thiết kế để quyết**, chưa phải code. Mục 1 dành cho người
quyết; mục 2–4 là căn cứ; mục 5–8 là cách làm, lộ trình và các điểm cần Giám
đốc chốt trước khi bắt tay.

---

## 1. Kết luận

Cổng hiện có **78 màn hình**, **6 khu**, ~150 cán bộ dùng hằng ngày — và **không
có một chỗ nào trong cổng** để cán bộ đọc «màn này dùng thế nào». Dòng «Hướng
dẫn sử dụng» ở chân trang là một dòng chữ trần, bấm không đi đâu
(`src/components/one/Footer.tsx`, dòng 52). Toàn bộ tài liệu hướng dẫn nằm trong
thư mục `docs/` của mã nguồn — 90 file viết cho đội kỹ thuật, cán bộ không bao
giờ nhìn thấy.

Đề xuất xây **ba lớp, một nguồn nội dung**:

| Lớp | Cán bộ thấy gì | Trả lời câu hỏi nào |
| --- | --- | --- |
| **1. Hướng dẫn tại chỗ** | Nút «?» trên thanh điều hướng, mọi trang. Bấm ra ngăn kéo hướng dẫn của **đúng màn hình đang mở**: màn này để làm gì, các bước, hỏi thường gặp | *«Ở đây tôi làm gì, bấm đâu?»* |
| **2. Trung tâm hướng dẫn** `/huong-dan` | Tra cứu toàn bộ hướng dẫn theo khu, theo vai trò của mình; tìm kiếm không dấu; lồng vào bảng lệnh ⌘K; ba lộ trình «bắt đầu» (cán bộ mới · lãnh đạo phòng · Phòng TCTH) | *«Việc X làm ở màn nào?»* |
| **3. Hỏi đáp** | Ô «Hỏi ONE»: trợ lý AI trả lời **chỉ từ bộ hướng dẫn** (không bịa, không trả lời ngoài phạm vi). Không trả lời được → một chạm gửi câu hỏi cho Phòng TCTH. Câu trả lời của TCTH quay lại thành mục «Hỏi thường gặp» của màn hình đó | *«Vì sao tôi không thấy nút…?»*, *«Trường hợp của tôi thì sao?»* |

Nguyên tắc quan trọng nhất, rút từ chính lịch sử repo này: **cái làm chết một
tính năng hướng dẫn không phải công nghệ mà là nội dung lỗi thời**. Lịch sử
phiên bản bản cũ chết vì 45 ngày, 44 PR, 0 dòng cập nhật
(`docs/lich-su-phien-ban-va-bao-tin-moi-2026-08.md`, mục 1). Hướng dẫn sử dụng
còn dễ chết hơn: một nút đổi tên là hướng dẫn sai. Vì vậy nội dung hướng dẫn
phải **sinh cùng lúc với mã nguồn, mỗi màn hình một file, có cổng chặn tự động**
— đúng khuôn đã chứng minh chạy được với `src/data/changelog/`.

Ba đợt: **Đợt 1** (nội dung + nút «?» + trang trung tâm, không cần migration)
· **Đợt 2** (AI trả lời từ hướng dẫn) · **Đợt 3** (hỏi người thật + vòng lặp
FAQ). Đợt 1 tự đứng được và đã giải quyết 70% nhu cầu.

---

## 2. Hiện trạng — cán bộ đang hỏi ở đâu, được trả lời ở đâu

### 2.1 Những gì cổng đã có và trông giống «hướng dẫn»

| Thứ đã có | Nó trả lời câu gì | Vì sao chưa phải hướng dẫn sử dụng |
| --- | --- | --- |
| **Mẹo tính năng** (`feature_tips`, trang «Mẹo hay», quản trị «Mẹo tính năng») | *«Tính năng này có lâu rồi, anh/chị biết chưa?»* — nhắm người lâu không đăng nhập, lặp 30 ngày | Chỉ hiện trên «Tổng quan» của Chiêu thức 3 (`src/pages/Overview.tsx`) — không hiện ở Trang chủ ONE, nơi 150 cán bộ đáp xuống. Nội dung soạn tay, không gắn màn hình, không có «các bước» |
| **Có gì mới** (`/co-gi-moi`, `src/data/changelog/`) | *«Hệ thống vừa thêm gì?»* — mỗi người đúng một lần | Kể *cái mới*, không kể *cách dùng*. Mục cũ 2 tháng không ai đọc lại |
| **Góp ý** (nút trên mọi trang, bảng `portal_gop_y`) | *«Tôi thấy lỗi / tôi muốn cải tiến»* | Là kênh **một chiều**: phiếu có trạng thái Mới → Đã xem xét → Đã xử lý nhưng **không có ô trả lời**. Cán bộ hỏi «làm sao để…» qua đây thì chỉ nhận được một dấu tích, không nhận được câu trả lời |
| **Trợ lý AI** (`AIAdvisorPanel`, mode `chat`) | Tư vấn phát triển năng lực (system prompt: «chuyên gia tư vấn phát triển năng lực ngành Ngân hàng») | Chỉ gắn ở 2 màn (Tự đánh giá, Biểu mẫu BM). **Không biết gì về cổng** — hỏi «ghi nhịp ở đâu» nó sẽ đoán, và đoán sai với giọng rất tự tin |
| **Bảng lệnh ⌘K** (`CommandPalette`, 63 mục có từ khóa) | *«Trang X ở đâu?»* | Tìm được *trang*, không tìm được *việc* («ghi nhịp» không ra kết quả nếu không phải nhãn menu) |
| **Trang giới thiệu chương trình** (Sao Xứng Đáng, Ideas, Training Center) | Quy chế, mốc thưởng, ý nghĩa chương trình | Nội dung nghiệp vụ, không phải thao tác. Chỉ 3/6 khu có |
| **Hai bản HTML** `docs/huong-dan-quan-tri.html`, `docs/huong-dan-nguoi-danh-gia.html` | Hướng dẫn Hội đồng đầu mối, viết rất tốt | Nằm trong repo, không có đường vào từ cổng; chỉ cho một phân hệ |
| **Trợ lý AI cho RM FDI** (`TabTroLyAI`) | Prompt mẫu sao chép sang ChatGPT/Gemini | Cách làm hay cho nghiệp vụ, nhưng là AI *ngoài* cổng |

### 2.2 Ba lỗ hổng đo được

1. **Không có điểm vào.** Không mục menu, không nút, chân trang là link chết.
   Cán bộ không có thói quen «tìm hướng dẫn» vì chưa từng có chỗ để tìm.
2. **Không có câu trả lời cho câu hỏi.** Kênh Góp ý nhận câu hỏi nhưng không
   trả lời được; trợ lý AI trả lời nhưng không đúng. Câu hỏi thực tế hiện đang
   đi qua Zalo phòng và điện thoại tới Phòng TCTH — không ai đo được, không ai
   tái sử dụng được câu trả lời.
3. **Nội dung có sẵn nhưng đặt sai chỗ.** 90 file `docs/` chứa gần như toàn bộ
   logic nghiệp vụ của cổng, viết bằng ngôn ngữ kỹ thuật, và 2 bản HTML hướng
   dẫn viết rất chuẩn cho cán bộ nhưng không ai vào được.

---

## 3. Cán bộ thực sự hỏi gì — và mỗi loại cần một lớp khác nhau

Phân loại theo kinh nghiệm vận hành các đợt (Chiêu thức 2, Sao Xứng Đáng,
Ideas, Training Center) — mỗi loại câu hỏi đòi một cách trả lời khác:

| Loại | Ví dụ thật | Cần gì để trả lời | Lớp phụ trách |
| --- | --- | --- | --- |
| **A. Ở đâu?** | «Ghi nhận Sao ở đâu?», «Bảng Kanban phòng tôi ở đâu?» | Cây điều hướng + từ khóa việc | ⌘K mở rộng (lớp 2) |
| **B. Làm thế nào?** | «Ghi nhịp thẻ việc thế nào?», «Gửi ý tưởng cần điền gì?», «Bật thông báo trên điện thoại?» | Các bước theo đúng chữ trên nút | Hướng dẫn tại chỗ (lớp 1) |
| **C. Vì sao tôi không…?** | «Vì sao tôi không thấy nút duyệt?», «Vì sao thẻ không kéo được sang Hoàn thành?» | Biết **vai trò** và **trạng thái** của người hỏi | FAQ theo vai + AI có ngữ cảnh (lớp 3) |
| **D. Quy định là gì?** | «Sao Xứng Đáng thưởng bao nhiêu?», «Kỳ tự đánh giá đóng khi nào?» | Nội dung chương trình đã công bố trên cổng | Trang giới thiệu đã có + AI đọc được (lớp 3) |
| **E. Hỏng / góp ý** | «Bấm Lưu không được», «Nên thêm cột…» | Con người xử lý | Góp ý đã có — **giữ nguyên**, chỉ nối vào |

Rút ra hai điều: (1) một chatbot không thay được lớp 1 — câu «làm thế nào» cần
danh sách bước ổn định, không cần một câu trả lời khác nhau mỗi lần hỏi; (2) lớp
3 chỉ có giá trị khi có lớp 1 làm nguồn — **AI chỉ tốt bằng tài liệu nó được
đọc**.

---

## 4. Ba phương án đã cân

| Phương án | Được | Mất | Kết luận |
| --- | --- | --- | --- |
| **A. Tài liệu tĩnh** (PDF/HTML, đăng ở Kho dữ liệu hoặc `docs/`) | Rẻ, làm ngay bằng hai bản HTML có sẵn | Chết đúng cách lịch sử phiên bản cũ đã chết: không ai biết nó tồn tại, và **lệch với cổng sau hai tuần** (nhịp 44 PR/45 ngày). Ảnh chụp màn hình là thứ lỗi thời nhanh nhất | **Loại** làm giải pháp chính; giữ hai bản HTML làm nguồn để chuyển đổi |
| **B. Chatbot AI thuần** (mở rộng `AIAdvisorPanel`, nạp README + docs vào prompt) | Hấp dẫn, «hỏi gì cũng trả lời» | Không có nguồn sự thật theo màn hình → trả lời từ tài liệu kỹ thuật, nói tên bảng, tên hàm với cán bộ; bịa khi không biết; mỗi câu tốn 40–60 nghìn token nếu nạp cả `docs/`; không tra cứu lại được câu đã trả lời | **Loại** làm giải pháp đơn lẻ |
| **C. Nội dung theo màn hình + trung tâm + AI đọc đúng nội dung đó + vòng hỏi người thật** | Nội dung sinh cùng mã, có cổng chặn; AI có nguồn để trích; câu hỏi không trả lời được thành việc của TCTH và **quay lại thành nội dung** | Phải viết ~78 mục hướng dẫn ban đầu; phải có một người ở TCTH làm đầu mối trả lời | **Chọn** |

---

## 5. Thiết kế đề xuất

### 5.1 Nguồn nội dung duy nhất: mỗi màn hình một file

Thư mục mới `src/data/huong-dan/`, mỗi màn hình (mỗi `NavLeaf` trong
`src/lib/navigation.ts`) một file, tên theo đường dẫn:

```
src/data/huong-dan/
  one.ts                        ← /one
  one-ke-hoach-hanh-dong.ts     ← /one/ke-hoach-hanh-dong
  one-ghi-nhan-sao.ts           ← /one/ghi-nhan-sao
  tu-danh-gia.ts                ← /tu-danh-gia
  ...
```

Khung một mục (định nghĩa ở `src/lib/huongDan.ts`, có kiểm thử như
`lichSuPhienBan.ts`):

```ts
const muc: MucHuongDan = {
  duongDan: '/one/ke-hoach-hanh-dong',
  tieuDe: 'Bảng việc của Phòng — ghi nhịp mỗi sáng',
  // Một câu: màn này để làm gì. Viết cho cán bộ, không tên bảng, không tên hàm.
  tomTat: 'Nơi mỗi cán bộ nhìn thấy việc mình phụ trách và ghi lại việc hôm nay làm được gì.',
  // Ai cần đọc. Rỗng = mọi người. Dùng để lọc ở trung tâm và để AI biết ngữ cảnh.
  danhCho: [],
  // Tối đa 7 bước, mỗi bước một hành động, bắt đầu bằng động từ, tên nút in đậm đúng chữ trên giao diện.
  cacBuoc: [
    'Mở thẻ việc của mình (thẻ có tên bạn ở góc dưới).',
    'Bấm **Ghi nhịp**, viết một dòng: hôm nay làm được gì, vướng gì.',
    'Kéo thẻ sang cột đúng trạng thái nếu việc đã chuyển giai đoạn.',
  ],
  cauHoiThuongGap: [
    { hoi: 'Vì sao tôi không kéo được thẻ sang «Hoàn thành»?',
      dap: 'Cột này chỉ lãnh đạo phòng duyệt. Bạn kéo tới «Chờ duyệt», hệ thống báo cho Trưởng phòng.' },
  ],
  lienQuan: ['/one/ke-hoach-hanh-dong/phe-duyet-tin-dung', '/co-gi-moi'],
  // Ngày sửa nội dung lần cuối — hiện cho cán bộ thấy («Cập nhật 17/09/2026»)
  capNhat: '2026-09-17',
};
```

Vì sao đặt trong repo chứ không trong bảng cơ sở dữ liệu:

- **Nội dung sinh cùng lúc với mã.** PR đổi nút «Ghi nhịp» thành «Ghi việc hôm
  nay» thì cùng PR đó phải sửa file hướng dẫn — có thể chặn tự động (mục 6).
  Nội dung trong bảng thì không ai biết nó lệch cho tới khi cán bộ hỏi.
- **Nhiều nhánh song song không giẫm nhau.** Mỗi màn hình một file; hai nhánh
  sửa hai màn khác nhau không bao giờ xung đột.
- **Kiểm thử được.** Kiểm thử tự động bắt: mọi đường dẫn có menu phải có
  hướng dẫn (hoặc nằm trong danh sách «không cần» kèm lý do), mỗi mục ≤ 7 bước,
  không chứa từ khóa kỹ thuật (`supabase`, `RLS`, tên bảng `ct2_`, `portal_`…).

Phần **duy nhất** nằm trong cơ sở dữ liệu là mục «Hỏi thường gặp» do Phòng TCTH
bổ sung từ câu hỏi thật (mục 5.4, đợt 3) — vì đó là nội dung sinh ra trong vận
hành, không sinh ra từ mã.

> Lưu ý bảo mật: nội dung trong repo được đóng gói vào mã JavaScript tải về
> trình duyệt, tức **mọi tài khoản đăng nhập được — kể cả khách đối tác — về lý
> thuyết đọc được**. Hướng dẫn chỉ được viết những gì cán bộ đã thấy trên màn
> hình; không viết quy trình nội bộ, ngưỡng phê duyệt, tên người. Kiểm thử từ
> khóa cấm ở trên cũng để chặn việc này.

### 5.2 Lớp 1 — Hướng dẫn tại chỗ

- **Nút «?»** trên thanh điều hướng, ngay cạnh nút «Góp ý» (cùng chỗ với
  `GopYNut` trong `TopNav.tsx`); trên điện thoại nằm trong nút «Thêm». Hiện ở
  mọi trang, không hiện cho khách đối tác.
- Bấm mở **ngăn kéo bên phải** (Sheet — khuôn đã dùng cho trợ lý AI): tiêu đề
  màn hình, «màn này để làm gì», các bước, hỏi thường gặp, hai nút cuối:
  **Xem tất cả hướng dẫn** (sang lớp 2) và **Chưa rõ? Hỏi** (sang lớp 3).
- Xác định màn hình đang mở bằng đúng cách `GopYNut` đang làm: `useNavTree()`
  trả về mục menu khớp đường dẫn (kể cả `extraPaths`), rồi tra file hướng dẫn
  theo `duongDan`. Trang chưa có hướng dẫn → ngăn kéo hiện tóm tắt của khu +
  nút hỏi, không bao giờ trống.
- **Không bật hộp thoại chen ngang.** Cổng đã có hộp Mẹo tính năng và hộp Có
  gì mới lúc đăng nhập; thêm một hộp nữa là dạy cán bộ phản xạ đóng mọi hộp.
  Lần đầu vào một màn hình, nút «?» chỉ có **một chấm nhỏ** (ghi nhớ theo
  đường dẫn trong bộ nhớ trình duyệt, không cần bảng).
- Sửa chân trang: «Hướng dẫn sử dụng» trỏ về `/huong-dan`.

### 5.3 Lớp 2 — Trung tâm hướng dẫn `/huong-dan`

- Mục menu trong khu Trang chủ, ngay cạnh «Có gì mới» (cùng nhóm «biết về hệ
  thống»), từ khóa ⌘K: `huong dan`, `cach dung`, `hoi dap`, `faq`.
- Bố cục: ô tìm kiếm ở trên (dùng `boDau`/`diemKhop` trong
  `src/lib/vietnamese.ts` — đúng bộ so khớp của ⌘K, nên «ghi nhip» tìm ra
  «Ghi nhịp»); bộ lọc **theo khu** (6 khu, đúng màu nhận diện trong
  `navigation.ts`) và **«dành cho tôi»** (lọc theo vai trò đang đăng nhập —
  cán bộ thường không thấy hướng dẫn màn quản trị họ không vào được).
- **Ba lộ trình «bắt đầu»** ở đầu trang, mỗi lộ trình 5–7 mục xếp theo thứ tự
  việc: *Cán bộ mới* (đăng nhập, đổi mật khẩu, bật thông báo, bảng việc phòng,
  ghi nhận Sao, tự đánh giá) · *Lãnh đạo phòng* (duyệt thẻ, digest ngày, đánh
  giá cán bộ, Kanban quản lý) · *Phòng TCTH* (tài khoản, mẹo tính năng, công
  bố phiên bản, góp ý). Lộ trình là dữ liệu trong `src/lib/huongDan.ts`, không
  phải nội dung riêng.
- **Bảng lệnh ⌘K thêm nhóm «Hướng dẫn»**: gõ «ghi nhịp» ra cả trang lẫn mục
  hướng dẫn tương ứng. Đây là chỗ giải quyết loại câu hỏi A rẻ nhất.
- Hai bản HTML Hội đồng đầu mối hiện có được chuyển thành hai mục hướng dẫn
  chuẩn (đường dẫn `/danh-gia-dau-moi`, `/quan-tri-hoi-dong-dau-moi`), file HTML
  giữ lại làm bản in.

### 5.4 Lớp 3 — Hỏi đáp

Hai tầng, tầng máy trước, tầng người sau, và câu trả lời của người quay lại
nuôi tầng máy.

**Tầng 1 — «Hỏi ONE» (AI trả lời từ hướng dẫn).** Thêm một mode
`hoi_dap_huong_dan` vào edge function `ai-advisor` — đúng cơ chế đang có: một
dòng trong bảng `ai_prompts` (admin chỉnh prompt + chọn model), hưởng sẵn xác
thực, giới hạn 40 lượt/người/giờ, trần toàn cơ quan, ngân sách tháng, đo token
và chi phí.

Cách nạp ngữ cảnh — **không cần cơ sở dữ liệu vector ở đợt đầu**:

1. Script build sinh `supabase/functions/_shared/huongDan.json` từ
   `src/data/huong-dan/` (đúng khuôn «bản máy chủ phải y hệt bản client» đang
   dùng cho `guestScreens.ts`; kiểm thử so hai bản).
2. Máy chủ chấm điểm từng mục theo số từ trùng (bỏ dấu) với câu hỏi, **cộng
   điểm cho mục của màn hình đang mở** (client gửi kèm đường dẫn), lấy 4–5 mục
   cao nhất đưa vào prompt (~4–6 nghìn token thay vì 40–60 nghìn).
3. Prompt kèm **vai trò** của người hỏi (đọc từ `user_roles` phía máy chủ, không
   tin client) để trả lời đúng câu loại C: «Bạn đang là cán bộ, cột Hoàn thành
   chỉ lãnh đạo phòng kéo được».
4. Luật trong prompt: chỉ trả lời từ các mục được cấp; không có trong mục thì
   nói rõ *«Hướng dẫn chưa có câu này»* và **đề nghị gửi cho Phòng TCTH**;
   không trả lời về quy định tín dụng, lãi suất, khách hàng; không nêu tên
   bảng, tên hàm.
5. Ghi lại mọi câu hỏi + cờ «trả lời được / không» (bảng `huong_dan_cau_hoi`,
   chỉ admin đọc). Báo cáo «câu hỏi AI không trả lời được» là **danh sách việc
   viết nội dung** cho tuần sau — đây là cách biết cán bộ vướng ở đâu mà không
   cần khảo sát.

Ước lượng chi phí với 150 cán bộ, 2 câu/người/tuần, ~6 nghìn token/câu trên
Gemini Flash Lite hoặc DeepSeek Chat: dưới 1 USD/tháng. Không đáng kể so với
ngân sách AI đang chạy; vẫn nằm dưới trần chung.

Khi nào mới cần vector (pgvector): khi bộ hướng dẫn vượt ~300 mục hoặc báo cáo
cho thấy chấm điểm từ khóa chọn sai mục thường xuyên. Project Supabase chưa bật
extension `vector`; bật được sau, không phải quyết bây giờ.

**Tầng 2 — Hỏi Phòng TCTH (người thật).** Cán bộ bấm «Gửi câu hỏi cho Phòng
TCTH» (từ ngăn kéo «?», từ trung tâm, hoặc ngay dưới câu AI không trả lời
được). Dùng lại **hạ tầng Góp ý** thay vì dựng hộp thư thứ hai:

- Bảng `portal_gop_y` thêm cột `loai` (`gop_y` | `cau_hoi`), `tra_loi` (chữ),
  `tra_loi_boi`, `tra_loi_luc`. Cùng người duyệt, cùng màn quản trị «Góp ý hệ
  thống ONE» (thêm tab «Câu hỏi»), cùng kết xuất Excel. Phòng TCTH có **một**
  hộp thư, không phải hai.
- Trả lời xong → người hỏi nhận **chuông trong ứng dụng** qua hàng đợi
  `ct2_thong_bao` (đường dẫn mở thẳng câu trả lời). Hưởng nguyên luật im lặng
  ngoài giờ.
- Nút **«Đưa vào Hỏi thường gặp»** trên câu trả lời: ghi một dòng vào bảng
  `huong_dan_faq` (`duong_dan`, `hoi`, `dap`, người đưa, ngày). Bảng này là lớp
  phủ: ngăn kéo «?» và trung tâm hiện FAQ từ file + FAQ từ bảng; máy chủ AI cũng
  đọc bảng này khi chấm điểm. **Đây là vòng PDCA của tri thức**: câu hỏi thật →
  câu trả lời một lần → mọi người sau đó không phải hỏi lại.

Vì sao trả lời bằng chữ chứ không phải sửa thẳng file hướng dẫn: Phòng TCTH
không sửa mã nguồn. FAQ trong bảng là cách để họ bổ sung nội dung mà không đợi
một PR; đợt rà định kỳ (mục 6) sẽ chuyển FAQ tốt vào file.

### 5.5 Quyền và bảo mật

| Đối tượng | Đọc hướng dẫn (file) | Đọc FAQ (bảng) | Hỏi AI | Gửi câu hỏi | Trả lời / đưa vào FAQ |
| --- | --- | --- | --- | --- | --- |
| Cán bộ (mọi vai) | ✅ lọc theo vai | ✅ `is_staff()` | ✅ | ✅ | ❌ |
| Lãnh đạo phòng, PGĐ | ✅ | ✅ | ✅ | ✅ | ❌ |
| BGĐ, TCTH, quản trị | ✅ | ✅ | ✅ | ✅ | ✅ (`la_nguoi_duyet_gop_y`) |
| Khách đối tác | ❌ nút «?» không hiện | ❌ RLS `is_staff()` | ❌ (edge function chặn `guest`) | ❌ | ❌ |

- Bảng mới `huong_dan_faq`, `huong_dan_cau_hoi`: `ENABLE ROW LEVEL SECURITY`,
  `REVOKE ALL FROM anon`, mỗi migration kèm file gỡ — theo CLAUDE.md mục 3.
- AI: khóa ở máy chủ như hiện nay; prompt chỉ chứa hướng dẫn + FAQ + vai trò +
  câu hỏi. Không đưa dữ liệu thẻ việc, hồ sơ, điểm số vào prompt ở đợt này —
  nếu sau muốn AI trả lời «thẻ của tôi đang ở đâu» thì là một quyết định nghiệp
  vụ riêng, vì đó là lúc AI bắt đầu đọc dữ liệu cá nhân.

### 5.6 Thông báo — không thêm loại push nào

Cổng đã có 21+ loại push và chỉ 27/100 cán bộ bật push (CLAUDE.md mục 5). Tính
năng này **không sinh push**: câu hỏi được trả lời thì có chuông trong ứng dụng;
hướng dẫn mới lên thì đi cùng mục «Có gì mới» của đợt đó. Nếu sau này thấy cán
bộ không quay lại đọc câu trả lời, cân nhắc gộp vào tin digest ngày đã có — vẫn
không thêm loại mới.

---

## 6. Quy ước để nội dung không chết

Đây là phần quyết định tính năng sống hay chết, nên viết như một quy ước bắt
buộc, thêm vào CLAUDE.md thành mục riêng khi triển khai đợt 1.

1. **Mỗi màn hình có menu = một file hướng dẫn.** Kiểm thử tự động
   (`huongDan.test.ts`) duyệt `NAV_SECTIONS`, mọi `path` phải có file hoặc nằm
   trong `KHONG_CAN_HUONG_DAN` kèm một dòng lý do (ví dụ trang chuyển hướng,
   trang chỉ có một nút). Thêm màn hình mới mà không viết hướng dẫn → kiểm
   thử đỏ → không gộp được.
2. **Cổng chặn PR** `npm run huong-dan:kiem-tra -- origin/main`, cùng khuôn với
   `kiem-tra-changelog.mjs`: PR chạm file trong `src/pages/` hoặc
   `src/components/one/` mà **không** chạm file nào trong `src/data/huong-dan/`
   thì cảnh báo, kèm cửa thoát `[khong-doi-huong-dan]` trong commit message để
   lại vết. Cửa thoát cần thiết vì nhiều PR sửa lỗi không đổi cách dùng.
3. **Viết cho cán bộ**, theo đúng chuẩn changelog: không tên bảng, không tên
   hàm, không số migration; tên nút **in đậm đúng chữ trên giao diện**; ≤ 7
   bước; mỗi bước một động từ. Kiểm thử chặn từ khóa kỹ thuật.
4. **Không ảnh chụp màn hình ở đợt 1.** Ảnh là thứ lỗi thời nhanh nhất và không
   có cơ chế nào bắt cập nhật ảnh. Khi nào thật cần (ví dụ bật thông báo trên
   iPhone) thì dùng ảnh **thiết bị**, không phải ảnh giao diện cổng.
5. **Ngày `capNhat` hiện công khai** trên mỗi mục. Trang quản trị (tab trong
   «Góp ý hệ thống ONE») liệt kê mục có `capNhat` cũ hơn mục changelog gần
   nhất của cùng khu → «có thể lỗi thời» — danh sách rà hằng tháng của TCTH.
6. **Một đầu mối nội dung ở Phòng TCTH** — người trả lời câu hỏi, đưa FAQ,
   và mỗi tháng rà danh sách «có thể lỗi thời». Không có người này thì lớp 3
   thành một hộp thư không ai mở; đây là điểm cần Giám đốc chỉ định (mục 8).

---

## 7. Lộ trình

| Đợt | Việc | Migration | Kết quả cán bộ thấy |
| --- | --- | --- | --- |
| **1. Nền + nội dung** (1 PR) | `src/lib/huongDan.ts` + kiểm thử; ~25 mục hướng dẫn cho các màn dùng hằng ngày (Trang chủ, Có gì mới, Tin tức, Bảng việc phòng, PDTD, Ghi nhận Sao, Bảng thi đua, Gửi ý tưởng, Quizzi chơi, Training Center, Tự đánh giá, Hành động phát triển, Hồ sơ, Đổi mật khẩu, bật thông báo…); chuyển 2 bản HTML Hội đồng; nút «?» + ngăn kéo; trang `/huong-dan` với lọc, tìm, 3 lộ trình; nhóm «Hướng dẫn» trong ⌘K; sửa link chân trang; cổng chặn; mục changelog `tinh-nang` khu `nen-tang` | **Không** | Nút «?» ở mọi trang, trang Hướng dẫn, tìm được «việc» trong ⌘K |
| **2. AI trả lời từ hướng dẫn** (1 PR + deploy `ai-advisor`) | Script sinh `huongDan.json`; mode `hoi_dap_huong_dan` + chấm điểm từ khóa + vai trò; ô «Hỏi ONE» trong ngăn kéo và trung tâm; bảng `huong_dan_cau_hoi` + báo cáo câu chưa trả lời được; dòng `ai_prompts` | 1 migration (bảng ghi câu hỏi + dòng prompt) | Hỏi bằng lời, được trả lời kèm «xem hướng dẫn» |
| **3. Hỏi người thật + FAQ** (1 PR) | Cột `loai`/`tra_loi` trên `portal_gop_y`; tab «Câu hỏi» ở màn quản trị góp ý; bảng `huong_dan_faq` + nút «Đưa vào Hỏi thường gặp»; chuông khi được trả lời; FAQ phủ lên ngăn kéo/trung tâm/AI | 1 migration | Câu hỏi khó có người trả lời, câu trả lời không mất đi |
| **4. Tùy chọn, sau khi đo** | pgvector nếu chấm điểm từ khóa không đủ; AI đọc dữ liệu cá nhân («thẻ của tôi đang ở cột nào»); hướng dẫn mở cho khách đối tác theo màn hình được cấp | — | — |

Đợt 1 đã đủ để dùng thật. Hai đợt sau là nâng cấp, mỗi đợt tự đứng.

### Đo lường (bước Check của PDCA)

| Chỉ số | Nguồn | Mục tiêu sau 60 ngày |
| --- | --- | --- |
| Lượt mở nút «?» / tuần, theo màn hình | Sự kiện client ghi vào `huong_dan_cau_hoi` (đợt 2) hoặc bộ đếm nhẹ | Có số để biết màn nào khó dùng nhất |
| Câu hỏi AI: tổng, tỷ lệ «không trả lời được» | `huong_dan_cau_hoi` | Tỷ lệ không trả lời được giảm dần theo tuần (nội dung đang lấp đúng chỗ) |
| Câu hỏi gửi TCTH: số lượng, thời gian trả lời trung vị | `portal_gop_y` loại `cau_hoi` | Trả lời trong 1 ngày làm việc |
| Góp ý có nội dung «không biết dùng / không tìm thấy» | Rà tay bảng góp ý trước–sau | Giảm |
| Số mục «có thể lỗi thời» tồn đọng | Tab quản trị | 0 vào cuối mỗi tháng |

---

## 8. Rủi ro và điểm cần Giám đốc quyết

| Điểm | Đề xuất | Vì sao |
| --- | --- | --- |
| **Ai là đầu mối nội dung?** | Một cán bộ Phòng TCTH, ghi tên; đội kỹ thuật soạn bản nháp từ mã, TCTH duyệt chữ | Không có người này thì đợt 3 là hộp thư không ai mở |
| **AI được trả lời gì?** | Chỉ *cách dùng cổng* và *nội dung chương trình đã công bố trên cổng*; không trả lời nghiệp vụ tín dụng, lãi suất, khách hàng | AI đọc hướng dẫn thì đúng; AI đọc «kiến thức chung» thì bịa với giọng tự tin — nguy hiểm hơn không trả lời |
| **Cổng chặn cứng hay mềm?** | Cứng cho *màn hình mới không có hướng dẫn*; mềm (cảnh báo + cửa thoát có vết) cho *PR sửa màn cũ* | Cứng toàn bộ sẽ bị né bằng cách sửa qua loa; mềm toàn bộ thì về đúng bẫy «không ai bắt buộc» |
| **Có push khi được trả lời?** | Không, chỉ chuông trong ứng dụng | 21+ loại push, 27/100 người bật; tin này không cần hành động ngay |
| **Viết 25 mục đầu bằng cách nào?** | Đội kỹ thuật (phiên Claude) soạn từ mã + docs hiện có, đúng khuôn; TCTH đọc và sửa chữ trước khi lên | `docs/` đã chứa gần đủ nội dung, thiếu người dịch sang ngôn ngữ cán bộ |
| **Rủi ro lộ nội dung qua bundle** | Kiểm thử từ khóa cấm + quy ước «chỉ viết những gì đã hiện trên màn hình» | Nội dung trong repo tải về mọi trình duyệt đăng nhập |

---

## Phụ lục — Những gì dùng lại, những gì dựng mới

| Dùng lại | Ở đâu | Dùng cho |
| --- | --- | --- |
| Khuôn «một mục = một file + số tự tính + cổng chặn» | `src/data/changelog/`, `scripts/kiem-tra-changelog.mjs` | Toàn bộ mục 5.1 và 6 |
| Cây điều hướng, `useNavTree`, `extraPaths` | `src/lib/navigation.ts`, `src/hooks/useNavTree.tsx` | Biết màn hình đang mở; lọc theo vai trò; ⌘K |
| So khớp không dấu | `src/lib/vietnamese.ts` | Tìm kiếm ở trung tâm, chấm điểm ở máy chủ |
| Ngăn kéo bên phải, khuôn nút trên thanh điều hướng | `AIAdvisorPanel`, `GopYNut`, `TopNav.tsx` | Nút «?» |
| Edge function `ai-advisor`: provider, giới hạn, ngân sách, `ai_prompts` | `supabase/functions/ai-advisor/` | Mode hỏi đáp |
| Khuôn «bản client và bản máy chủ phải y hệt» | `manHinhKhach.ts` ↔ `_shared/guestScreens.ts` | `huongDan.json` |
| Hộp thư góp ý, người duyệt, kết xuất Excel | `portal_gop_y`, `GopYAdminPage` | Câu hỏi gửi người thật |
| Hàng đợi thông báo, luật ngoài giờ | `ct2_thong_bao`, `ct2_dat_thong_bao()` | Chuông khi được trả lời |
| Hai bản hướng dẫn Hội đồng | `docs/huong-dan-*.html` | Hai mục hướng dẫn đầu tiên đã có sẵn nội dung |

| Dựng mới | Đợt |
| --- | --- |
| `src/lib/huongDan.ts` + kiểm thử; `src/data/huong-dan/*.ts`; `scripts/kiem-tra-huong-dan.mjs` | 1 |
| Nút `HuongDanNut` + ngăn kéo; trang `HuongDanPage` (`/huong-dan`); nhóm ⌘K | 1 |
| Script sinh `_shared/huongDan.json`; mode `hoi_dap_huong_dan`; bảng `huong_dan_cau_hoi`; báo cáo | 2 |
| Cột `loai`/`tra_loi*` trên `portal_gop_y`; bảng `huong_dan_faq`; tab «Câu hỏi»; chuông | 3 |
