# Đánh giá độ phức tạp, chất lượng và quy đổi năng suất lao động

**Đối tượng:** hệ thống "343 Phát triển nhân sự — VietinBank Bắc Hưng Yên" (`chieuthuc3.com`)
**Thời điểm đo:** 01/08/2026 · nhánh `claude/website-complexity-quality-assessment-mzprnz`
**Cách đo:** thống kê trực tiếp trên mã nguồn, chạy thật `npm ci` → `npm run test` → `npm run lint` → `npm run build`.

---

## 1. Số liệu định lượng (đo thực tế, không ước lượng)

### 1.1 Khối lượng mã

| Khu vực | Dòng mã | Ghi chú |
|---|---:|---|
| `src/pages` (91 trang) | 24.155 | màn hình nghiệp vụ |
| `src/components` | 28.909 | trong đó 4.107 là shadcn/ui sinh sẵn |
| `src/lib` (logic thuần) | 7.936 | đã tách khỏi giao diện, có test |
| `src/hooks` | 1.572 | |
| `src/data` | 1.078 | dữ liệu nội dung cổng BHY one |
| `src/integrations/supabase/types.ts` | 4.845 | **sinh tự động**, không tính công |
| `supabase/functions` (21 edge function) | 6.272 | Deno/TypeScript chạy phía máy chủ |
| `supabase/migrations` (118 file) | 12.402 | SQL schema + RLS + RPC |
| `docs` (18 tài liệu) | 3.123 | tài liệu thiết kế & vận hành |

**Tổng mã do người/AI thực sự viết:** ≈ **82.000 dòng**
(69.293 dòng `src` − 4.845 dòng sinh tự động − 4.107 dòng thư viện giao diện sinh sẵn + 6.272 + 12.402 + 3.123)

### 1.2 Khối lượng kiến trúc

| Hạng mục | Số lượng |
|---|---:|
| Tuyến đường (route) | **91** |
| Bảng dữ liệu | **96** |
| Hàm cơ sở dữ liệu (RPC/function) | **104** |
| Chính sách bảo mật hàng (RLS policy) | **311** |
| Trigger | **90** |
| Migration | **118** |
| Edge function | **21** |
| Tác vụ định kỳ (cron) | **12** |
| File kiểm thử / số test | **31 / 413** |
| Gói JS sau khi build | **190** (dist 5,2 MB) |
| Commit | **261** (04/07 → 01/08/2026) |

### 1.3 Kết quả chạy thật

| Kiểm tra | Kết quả |
|---|---|
| `npm run test` | ✅ **413/413 test đạt**, 31 file, 13,7 giây |
| `npm run build` | ✅ build thành công, 20,7 giây |
| `npm run lint` | ⚠️ **557 vấn đề** (517 lỗi — 513 lỗi là `no-explicit-any`) |
| CI/CD | ❌ **không có** thư mục `.github` — không có cổng kiểm soát tự động |

---

## 2. Đánh giá mức độ phức tạp

### 2.1 Số miền nghiệp vụ độc lập: **10**

Đây không phải một website, mà là **10 sản phẩm ghép lại trên một nền tảng**:

| # | Miền nghiệp vụ | Bằng chứng độ phức tạp |
|---|---|---|
| 1 | **Khung năng lực** 38 kỹ năng × 4 cấp | tiêu chí từng cấp (`skill_level_criteria`), minh chứng bắt buộc L3+, ảnh cấp độ, bộ sưu tập kỹ năng |
| 2 | **Quy trình đánh giá BM01/BM02/BM03** | duyệt 3 cấp, autosave, carry-over có điều kiện, PDCA hành động kỳ trước, cửa sổ kỳ, phiếu "tự soi" |
| 3 | **Hội đồng đánh giá đầu mối** | trọng số 4 nhóm thành viên, nhiều vòng, hạn bỏ phiếu, cấm tự chấm, embargo kết quả, phát hiện điểm cực đoan |
| 4 | **IDP 70/20/10 + kèm cặp** | gợi ý mentor (`suggest_skill_mentors`, trần 2 mentee/mentor/kỳ), khóa học VTB |
| 5 | **Kanban hành động** | kỷ luật tuần, duyệt hoàn thành, trả card, digest tuần, đồng bộ "dấu ấn lãnh đạo" |
| 6 | **Quizzi** (game hóa học tập) | soạn đề, chơi cá nhân, **thi trực tiếp nhiều người** (live session), chiến dịch, huy hiệu, chuỗi ngày (streak), nhắc lịch |
| 7 | **Cổng thương hiệu BHY one** | 9 trang, CMS sửa nội dung tại chỗ, kho dữ liệu ảnh (bucket riêng tư + signed URL), ý tưởng, Sao Xứng Đáng, Tín dụng 360 |
| 8 | **Trợ lý AI** | 11 chế độ, đa nhà cung cấp (Lovable/Gemini/OpenAI/DeepSeek/Gateway), đo token thực, bảng giá, ngân sách tháng, giới hạn tốc độ 2 tầng |
| 9 | **Hạ tầng email + push** | hàng đợi, template giao dịch, chặn trùng, suppression, hủy đăng ký, Web Push có service worker |
| 10 | **Quản trị chiến lược nhân sự** | bản đồ rủi ro bus-factor, con đường sự nghiệp, **mô phỏng điều chuyển what-if**, chiến dịch học tập, bản tin quý |

### 2.2 Nhân tố làm tăng độ phức tạp vượt mức thông thường

**a) Phân quyền là bài toán khó nhất trong hệ thống này.**
6 vai trò (`employee`, `manager`, `pgd`, `tcth_admin`, `system_admin`, `guest`) nhân với 3 chiều quan hệ (`manager_id`, `pgd_id`, `director_id`) nhân với trạng thái phiếu (6 giá trị enum) nhân với cửa sổ kỳ đánh giá. Riêng file `src/lib/reviewerScope.ts` phải xử lý **kiêm nhiệm** — khi một người vừa là PGĐ phụ trách vừa là Giám đốc của cùng một cán bộ, hệ thống phải chọn đúng vai để phiếu không kẹt vĩnh viễn. Đây là loại lỗi chỉ lộ ra khi vận hành thật, và mã nguồn ghi rõ nó **đã từng xảy ra ngày 27/07** rồi mới được sửa tận gốc.

**b) Bảo mật ở tầng cơ sở dữ liệu, không phải tầng giao diện.**
311 chính sách RLS + 130 lần khai báo `SET search_path` cho hàm `SECURITY DEFINER`. Khi mở vai trò `guest` cho đối tác, hệ thống không chỉ giấu menu — mà **siết lại toàn bộ 28 bảng danh mục** từ `USING (true)` về `is_staff()`, và tài liệu ghi là đã kiểm chứng bằng mô phỏng JWT. Đây là chuẩn mực của một hệ thống ngành ngân hàng, không phải chuẩn mực của một website nội bộ.

**c) Dữ liệu thật, người dùng thật, không có đường lùi.**
13 migration mang tính vá dữ liệu sản xuất (`repair_*`, `backfill_*`, `guard_*`, `harden_*`) cho thấy hệ thống đã chạy thật với hồ sơ nhân sự thật và phải sửa lỗi trong lúc đang vận hành — khó hơn nhiều so với sửa trên môi trường thử.

**d) Di trú dữ liệu từ hai nguồn cũ.**
Firebase (website BHY one cũ) → Supabase, và BM01 Quý I dạng Word/PDF → cơ sở dữ liệu, đều có script và tài liệu riêng.

### 2.3 Kết luận độ phức tạp

**Xếp hạng: 8,5/10 — mức "hệ thống doanh nghiệp cỡ vừa, nghiệp vụ chuyên sâu".**

Để tham chiếu:
- 3/10 — website giới thiệu, landing page
- 5/10 — website tin tức có quản trị nội dung
- 6,5/10 — thương mại điện tử tiêu chuẩn
- **8,5/10 — hệ thống này**
- 9,5/10 — lõi ngân hàng, hệ thống giao dịch tài chính

Điểm khiến nó đạt 8,5 không phải số dòng mã, mà là: **phân quyền đa chiều + bảo mật ở tầng CSDL + 10 miền nghiệp vụ ghép trên một nền dữ liệu chung + đang chạy thật**.

---

## 3. Chấm điểm chất lượng theo khía cạnh

| # | Khía cạnh | Điểm | Trọng số | Căn cứ |
|---|---|:---:|:---:|---|
| 1 | **Bảo mật & phân quyền** | **9,0** | 18% | 311 RLS policy; `SECURITY DEFINER` + `search_path` kỷ luật; siết `USING(true)` → `is_staff()`; thu hồi quyền `anon`; edge function xác thực người gọi; giới hạn tốc độ AI 2 tầng; tự đăng xuất khi nhàn rỗi. **Trừ điểm:** không có test tự động cho RLS, không quét bí mật tự động. |
| 2 | **Mô hình dữ liệu & migration** | **8,5** | 12% | 96 bảng, 104 RPC, 90 trigger, ràng buộc cấp CSDL (`chk_self_review_no_supervisor`), RPC lưu con nguyên tử. **Trừ điểm:** áp migration thủ công; **2 cặp migration trùng dấu thời gian** (`20260704090000`, `20260705160000`) — thứ tự áp có thể mơ hồ. |
| 3 | **Hiệu năng tải trang** | **8,5** | 10% | Tách gói có chủ đích, có đo đạc, có giải thích lý do trong `vite.config.ts` (vì sao KHÔNG gộp Radix: đo được +74 kB gzip). 91 trang đều nạp lười; thư viện nặng (xlsx 163 kB, jspdf 129 kB) chỉ tải khi cần. Gói vào cửa chỉ 4 tệp vendor. Có cơ chế tự tải lại khi hash gói cũ. |
| 4 | **Kiến trúc & tổ chức mã** | **8,0** | 12% | Phân tầng rõ `pages / components / lib / hooks / data`; logic thuần tách khỏi giao diện nên test được. **Trừ điểm:** 68 file gọi thẳng `supabase.from` (thiếu tầng truy cập dữ liệu); 7 file > 800 dòng, `StaffEvaluation.tsx` 1.707 dòng. |
| 5 | **Trải nghiệm & giao diện** | **8,0** | 12% | Nền Radix (sẵn khả năng tiếp cận), 622 lượt dùng breakpoint responsive, chế độ tối, bảng lệnh, breadcrumb, menu di động riêng, autosave có báo trạng thái, mẹo tính năng, hiệu ứng game hóa. **Trừ điểm:** chỉ 97 thuộc tính `aria-` tự thêm; còn 95 mã màu cứng lẫn trong 49 token thiết kế. |
| 6 | **Vận hành & tài liệu** | **7,5** | 8% | README chi tiết, 18 tài liệu thiết kế, script di trú có README riêng, migration ghi chú cron. **Trừ điểm nặng:** **không có CI/CD** — test và lint không phải cổng bắt buộc trước khi gộp mã; migration áp tay. |
| 7 | **Kiểm thử** | **6,5** | 12% | 413 test đạt 100%, tập trung đúng chỗ khó (`carryForward`, `levelCheck`, `reviewerScope`, `council`, `starMath`, `submissionKpi`). **Trừ điểm:** 31 file test / 364 file mã; không có test đầu-cuối (E2E); không có test tích hợp cho RLS — mà RLS lại chính là hàng rào bảo mật thật. |
| 8 | **An toàn kiểu (TypeScript)** | **5,5** | 8% | **Yếu nhất.** `strict: false`, `strictNullChecks: false`, `noImplicitAny: false`; 513 lỗi `no-explicit-any`. Trình biên dịch đang bị tắt phần lớn khả năng bắt lỗi — với hệ thống 82.000 dòng thì đây là rủi ro tích lũy. |
| 9 | **Tích hợp AI** | **8,5** | 4% | Registry nhà cung cấp (thêm nhà cung cấp mới = 2 dòng cấu hình), BYOK, đo token thực (có tee stream cho SSE), bảng giá, ngân sách tháng có cưỡng chế, timeout, giới hạn tốc độ. **Trừ điểm:** chưa có lớp chống tiêm nhiễm prompt tường minh, chưa có bộ đo chất lượng đầu ra. |
| 10 | **Ghi chú tri thức nghiệp vụ** | **9,5** | 4% | **Xuất sắc — hiếm gặp.** Comment không giải thích mã làm gì, mà giải thích **vì sao lại quyết định như vậy**, kèm ngày tháng và sự cố thực tế: *"Nguyên tắc Giám đốc chốt 27/07"*, *"Trước 08/2026 nguyên tắc nằm rải ở 3 nơi, mỗi nơi so khớp CHUỖI chức danh theo một danh sách khác nhau"*, *"phiếu kẹt vĩnh viễn ở 'reviewed' … (sự cố 27/07)"*. Đây là tài sản chuyển giao quý hơn cả mã nguồn. |

### Điểm tổng hợp có trọng số

```
9,0×0,18 + 8,5×0,12 + 8,5×0,10 + 8,0×0,12 + 8,0×0,12
+ 7,5×0,08 + 6,5×0,12 + 5,5×0,08 + 8,5×0,04 + 9,5×0,04
= 7,95
```

## ⭐ **ĐIỂM CHẤT LƯỢNG TỔNG: 8,0 / 10**

**Diễn giải:** đây là chất lượng của một **sản phẩm doanh nghiệp thật, đã đưa vào vận hành**, không phải bản demo. Điểm mạnh nằm ở đúng những chỗ tốn kém nhất khi làm sai (bảo mật, mô hình dữ liệu, hiệu năng, tri thức nghiệp vụ). Điểm yếu nằm ở lớp phòng thủ tự động (CI, kiểu tĩnh, test E2E) — là những thứ **bổ sung được mà không phải viết lại**.

### Ba việc nên làm ngay để lên 9,0

1. **Dựng CI** (`.github/workflows/ci.yml`): chạy `test` + `build` + `lint` mỗi lần đẩy mã. Chi phí ~2 giờ, ngăn được lỗi hồi quy trên hệ thống đang chạy thật.
2. **Bật kiểu tĩnh theo từng bước**: `strictNullChecks: true` trước, khoanh vùng `src/lib` (logic nghiệp vụ) trước rồi lan dần. Không cần sửa 513 chỗ `any` cùng lúc.
3. **Test tích hợp RLS**: mô phỏng JWT cho 6 vai trò × các bảng nhạy cảm, khẳng định `guest` trả 0 dòng. Việc này đã làm **thủ công một lần** — biến nó thành test tự động để không bị vỡ khi thêm bảng mới.

*Việc thứ 4, nhỏ hơn:* đổi tên 2 cặp migration trùng dấu thời gian để thứ tự áp không mơ hồ.

---

## 4. So sánh với năng suất lập trình viên truyền thống

### 4.1 Ước lượng công sức — phương pháp 1: theo dòng mã

Năng suất **thực giao** (đã trừ họp, thiết kế, sửa lỗi, review) của lập trình viên fullstack có kinh nghiệm trên ứng dụng doanh nghiệp: **50–70 dòng/ngày**.

```
82.000 dòng ÷ 60 dòng/ngày ≈ 1.370 công-ngày ≈ 6,2 người-năm
```

### 4.2 Ước lượng công sức — phương pháp 2: bóc tách theo tính năng (đáng tin hơn)

| Hạng mục | Công-ngày |
|---|---:|
| Nền tảng xác thực + 6 vai trò + RLS + guest có hạn | 35 |
| Quản lý cán bộ, sơ đồ tổ chức, tuyến báo cáo, nhập hàng loạt | 35 |
| Khung năng lực 38 kỹ năng × 4 cấp + tiêu chí + minh chứng | 35 |
| BM01/BM02/BM03 + duyệt 3 cấp + autosave + carry-over + PDCA | 70 |
| Hội đồng đánh giá (trọng số, vòng, embargo, phân tích) | 40 |
| Kanban hành động + kỷ luật tuần + digest | 30 |
| Quizzi (soạn, chơi, live, chiến dịch, huy hiệu, streak) | 52 |
| Cổng BHY one (9 trang, CMS, kho dữ liệu, ý tưởng, Sao Xứng Đáng) | 52 |
| Trợ lý AI 11 chế độ + đa nhà cung cấp + quản trị chi phí | 40 |
| Hạ tầng email (queue, template, suppression) + Web Push | 35 |
| Báo cáo & xuất bản (Word/PDF/Excel, radar, heatmap, mô phỏng) | 45 |
| Nền giao diện, điều hướng, responsive, chế độ tối, mẹo tính năng | 35 |
| Kiểm thử 413 test + 18 tài liệu | 30 |
| Triển khai, domain, Cloudflare Worker, di trú Firebase + BM01 | 20 |
| **Cộng — thời gian viết mã thuần** | **554** |

Cộng chi phí gián tiếp theo thông lệ dự án doanh nghiệp:
- Phân tích nghiệp vụ, thiết kế, họp, làm lại theo phản hồi: **+50%**
- QA / UAT / sửa lỗi: **+25%**
- Quản trị dự án: **+10%**

```
554 × 1,85 ≈ 1.025 công-ngày ≈ 4,7 người-năm
```

### 4.3 Chốt khoảng ước lượng

Hai phương pháp cho khoảng hội tụ:

## 📊 **≈ 1.000 – 1.400 công-ngày ≈ 4,5 – 6,3 người-năm**

### 4.4 Quy đổi ra thời gian lịch với đội truyền thống

**Đội hình tối thiểu để làm được sản phẩm này:**

| Vai trò | FTE | Vì sao bắt buộc phải có |
|---|:---:|---|
| Kiến trúc sư / Tech Lead | 1,0 | thiết kế 96 bảng + mô hình phân quyền — sai ở đây là làm lại từ đầu |
| Lập trình viên Frontend React/TS | 2,0 | 91 trang, 24.000 dòng giao diện |
| Lập trình viên Backend / CSDL | 1,0 | 118 migration, 104 RPC, 311 RLS policy |
| Fullstack / DevOps | 1,0 | 21 edge function, 12 cron, triển khai, di trú dữ liệu |
| Thiết kế UI/UX | 0,5 | hệ thống thiết kế, responsive, chế độ tối |
| Kiểm thử QA | 0,5 | UAT với 150 cán bộ dùng thật |
| Phân tích nghiệp vụ (BA) | 1,0 | dịch quy chế nhân sự → luật phần mềm |
| Rà soát bảo mật | 0,3 | dữ liệu nhân sự ngân hàng |
| **Tổng** | **≈ 7,3 người** | |

Với ~6 FTE trực tiếp viết mã và hệ số hiệu quả nhóm 0,75 (hao hụt do phối hợp — định luật Brooks):

```
1.200 công-ngày ÷ (6 × 0,75) ≈ 265 ngày làm việc
```

## ⏱️ **≈ 12 – 14 tháng lịch, đội 7–8 người**

| Kịch bản | Thời gian |
|---|---|
| Lạc quan — đội 5 người rất mạnh, yêu cầu rõ ngay từ đầu, không đổi | 8 – 10 tháng |
| **Thực tế — bối cảnh chi nhánh ngân hàng, có chu trình phê duyệt nội bộ** | **12 – 16 tháng** |
| Thận trọng — yêu cầu hình thành dần trong lúc làm (đúng thực tế dự án này) | 16 – 20 tháng |

### 4.5 Đối chiếu với thực tế đã diễn ra

| | Đội truyền thống | Thực tế dự án này |
|---|---|---|
| Nhân sự | 7–8 người | **1 người** + AI |
| Thời gian lịch | 12–16 tháng | **≈ 3,5 tháng** (migration đầu 15/04/2026 → 01/08/2026) |
| Công sức quy đổi | 1.000–1.400 công-ngày | ~70–90 công-ngày người *(giả định 3–4 giờ/ngày, cần chủ dự án xác nhận)* |
| Nhịp giao | theo sprint 2 tuần | 261 commit / 4 tuần gần nhất |

## 🚀 **Hệ số năng suất ≈ 13 – 17 lần**

> **Lưu ý về cách đọc con số này.** Hệ số 13–17× là so sánh **công sức**, không phải so sánh **năng lực**. Nó không có nghĩa "một người thay được 15 lập trình viên". Nó có nghĩa: **phần việc chuyển mã hóa ý định thành mã nguồn — vốn chiếm ~70% chi phí phần mềm truyền thống — đã bị nén lại gần như bằng không.** Phần còn lại (~30%: quyết định nghiệp vụ, thiết kế quy trình, chịu trách nhiệm dữ liệu thật) **không hề được nén, và chính nó trở thành nút thắt mới.**

---

## 5. Phải phối hợp với những chuyên môn nào để ra được sản phẩm này

Đây là câu hỏi quan trọng nhất, vì **mã nguồn không phải là phần khó**.

Đọc kỹ các comment trong mã sẽ thấy rõ: AI viết được `reviewerScope.ts`, nhưng AI **không thể tự biết** rằng "Giám đốc chi nhánh không có cấp trên nên phiếu tự đánh giá chính là mức chốt". Đó là một **quyết định quản trị**, do người có thẩm quyền chốt ngày 27/07, rồi mới được mã hóa. Toàn bộ giá trị của hệ thống nằm ở lớp quyết định đó.

### 5.1 Bản đồ chuyên môn bắt buộc — 8 lĩnh vực

| # | Chuyên môn | Người/đơn vị nắm | Đã quyết định những gì (bằng chứng trong mã) |
|---|---|---|---|
| 1 | **Phát triển năng lực & tổ chức (L&D/OD)** | Phòng TCTH | Bộ 38 kỹ năng, thang 4 cấp, tiêu chí từng cấp, mô hình IDP 70/20/10, ma trận phân loại Sao (Sao Mai / Sao Khuê / Sao Băng / Sao Hôm), trần 2 mentee/mentor/kỳ |
| 2 | **Quy chế & thẩm quyền nội bộ** | Ban Giám đốc | Tuyến duyệt 3 cấp; xử lý kiêm nhiệm PGĐ–Giám đốc; **phiếu tự soi cho người không có cấp trên** (chốt 27/07); ai được mở/đóng kỳ; embargo kết quả hội đồng |
| 3 | **Thiết kế đánh giá & đo lường** | TCTH + chuyên gia đánh giá | Trọng số 4 nhóm thành viên hội đồng; ngưỡng điểm cực đoan (≥10 / ≤3); dải phân loại tiêu chí; công thức KPI nộp biểu mẫu |
| 4 | **Bảo mật & tuân thủ dữ liệu nhân sự** | An ninh thông tin / Tuân thủ | Ai thấy dữ liệu của ai (311 policy); vai trò `guest` có hạn cho đối tác; thu hồi quyền `anon`; tự đăng xuất khi nhàn rỗi; xóa cứng hồ sơ |
| 5 | **Kiến trúc phần mềm** | Kỹ thuật (AI + người rà soát) | 96 bảng, RPC nguyên tử, chiến lược tách gói, chống hash gói cũ |
| 6 | **Thiết kế trải nghiệm cho người dùng phổ thông** | TCTH + quan sát thực địa | 150 cán bộ, phần lớn dùng điện thoại, không rành công nghệ → autosave, menu di động riêng, mẹo tính năng, wizard chọn cấp độ, game hóa để tạo động lực |
| 7 | **Truyền thông & văn hóa nội bộ** | Ban lãnh đạo + truyền thông | Cổng BHY one, cây văn hóa 20 năm, Bộ 3 chiêu thức, Sao Xứng Đáng 2026, nhận diện thương hiệu |
| 8 | **Vận hành hệ thống & pháp lý thư điện tử** | Kỹ thuật | Hàng đợi email, chống gửi trùng, suppression, hủy đăng ký, Web Push, 12 cron |

### 5.2 Mô hình phối hợp — cái gì đã thay đổi

**Mô hình truyền thống (chuỗi 5 khâu, mỗi khâu là một lần thất thoát ý định):**

```
Nghiệp vụ  →  BA viết đặc tả  →  Thiết kế  →  Lập trình  →  QA  →  Nghiệp vụ nghiệm thu
   ↑                                                                        │
   └────────── 1 vòng phản hồi = 2–4 tuần ──────────────────────────────────┘
```
Chi phí lớn nhất không phải viết mã, mà là **thất thoát ý định qua từng lần bàn giao**. Một chi tiết như "kiêm nhiệm PGĐ–Giám đốc" rất dễ rơi rụng giữa BA và lập trình viên, và chỉ lộ ra khi vận hành thật — lúc đó sửa đắt gấp 10 lần.

**Mô hình đã áp dụng ở dự án này (2 khâu, vòng phản hồi tính bằng giờ):**

```
Người nắm nghiệp vụ + thẩm quyền  ⇄  AI thực thi
              ↑                            │
              └── 1 vòng phản hồi = vài giờ ┘
```

**Ba điều kiện làm cho mô hình này chạy được** — và đây là phần không sao chép được:

1. **Người chủ trì phải vừa hiểu nghiệp vụ vừa có thẩm quyền quyết.**
   Trong mã có câu *"Nguồn sự thật DUY NHẤT là cột `profiles.self_review_only`"* — để viết được câu đó, người chủ trì phải biết trước đó nguyên tắc nằm rải ở 3 nơi, biết vì sao nó sai, **và có quyền chốt cách sửa**. Một lập trình viên thuê ngoài không có thẩm quyền này; một BA không có quyền quyết cũng không.

2. **Phải mô tả được ý định ở mức "vì sao", không phải mức "làm gì".**
   Chất lượng đầu ra tỉ lệ thuận với độ rõ của ý định đầu vào. Các comment trong mã nguồn chính là bằng chứng: chúng ghi lại **lý do và bối cảnh**, không ghi lại thao tác.

3. **Phải có kỷ luật kiểm chứng.**
   413 test, 13 migration vá lỗi, mô phỏng JWT để kiểm chứng RLS — đây là bằng chứng của một vòng lặp *ra lệnh → kiểm chứng → sửa*, không phải *ra lệnh → tin tưởng*.

### 5.3 Nút thắt mới nằm ở đâu

| Khâu | Truyền thống | Với AI | Thay đổi |
|---|---|---|---|
| Viết mã | 55% công sức | ~5% | **giảm ~11 lần** |
| Sửa lỗi kỹ thuật | 15% | ~5% | giảm 3 lần |
| Làm tài liệu | 5% | ~2% | giảm |
| **Quyết định nghiệp vụ** | 10% | **~40%** | **không giảm — nay chiếm tỉ trọng lớn nhất** |
| **Kiểm chứng & chịu trách nhiệm dữ liệu thật** | 15% | **~48%** | **không giảm** |

> **Kết luận về phối hợp:** AI đã xóa bỏ nút thắt "thiếu người viết mã". Nút thắt còn lại — và bây giờ là nút thắt duy nhất — là **tốc độ và chất lượng ra quyết định nghiệp vụ**. Tổ chức nào có người vừa hiểu nghiệp vụ sâu, vừa có thẩm quyền chốt, vừa chịu ngồi kiểm chứng, thì tổ chức đó xây được hệ thống 82.000 dòng trong 3,5 tháng. Tổ chức nào tách rời ba thứ đó thành ba người khác nhau ở ba phòng khác nhau, thì vẫn mất 12–16 tháng — dù có dùng AI.

---

## 6. Tóm tắt một trang

| Chỉ tiêu | Kết quả |
|---|---|
| **Độ phức tạp** | **8,5 / 10** — hệ thống doanh nghiệp cỡ vừa, nghiệp vụ chuyên sâu, 10 miền ghép trên một nền dữ liệu |
| **Chất lượng tổng hợp** | **8,0 / 10** — mạnh ở bảo mật (9,0), dữ liệu (8,5), hiệu năng (8,5), tri thức nghiệp vụ (9,5); yếu ở kiểu tĩnh (5,5), kiểm thử (6,5), CI (không có) |
| **Khối lượng** | ≈ 82.000 dòng · 91 trang · 96 bảng · 104 RPC · 311 RLS policy · 21 edge function · 413 test |
| **Công sức quy đổi** | **1.000 – 1.400 công-ngày ≈ 4,5 – 6,3 người-năm** |
| **Thời gian đội truyền thống** | **12 – 16 tháng, đội 7 – 8 người** |
| **Thực tế** | ≈ 3,5 tháng, 1 người + AI |
| **Hệ số năng suất** | **≈ 13 – 17 lần** |
| **Điều kiện then chốt** | Người chủ trì phải đồng thời nắm **nghiệp vụ + thẩm quyền quyết + kỷ luật kiểm chứng**. Thiếu một trong ba, hệ số này không tái lập được. |

### Ba việc nên làm tiếp
1. Dựng CI chạy `test` + `build` + `lint` (≈2 giờ) → bảo vệ hệ thống đang chạy thật khỏi lỗi hồi quy.
2. Bật `strictNullChecks` cho `src/lib` trước, lan dần ra ngoài.
3. Biến bài kiểm chứng RLS thủ công (mô phỏng JWT) thành test tự động cho cả 6 vai trò.

---

*Báo cáo lập trên số liệu đo trực tiếp từ mã nguồn ngày 01/08/2026. Các lệnh `npm ci`, `npm run test`, `npm run lint`, `npm run build` đều đã chạy thật; kết quả nêu trong mục 1.3.*
