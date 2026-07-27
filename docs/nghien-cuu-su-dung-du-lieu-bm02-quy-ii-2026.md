# Nghiên cứu: Dùng dữ liệu BM02 Quý II/2026 để phân tích, khuyến nghị tổng thể và viết lại hành động cho **đo lường được**

> Tài liệu nghiên cứu — chưa phải đặc tả triển khai code.
>
> **Mục tiêu:** (1) kiểm kê chính xác dữ liệu cán bộ **đã đánh giá** và **đã trao đổi**
> trong Biểu mẫu 02 Quý II/2026; (2) chẩn đoán bằng số liệu thật vì sao "nhiều hành động
> khó đo lường, đánh giá"; (3) đề xuất khung **"tiến bộ so với chính mình" (Δ-Self)** —
> không xếp hạng cán bộ với nhau; (4) chốt **chuẩn hành động đo được** và cơ chế
> **khuyến nghị lại (rewrite) 507 hành động đã cam kết cho Quý III**; (5) chốt lộ trình,
> chỉ số đo và rủi ro.
>
> **Nguồn dữ liệu:** truy vấn trực tiếp Supabase `whlysprzsguehxmrjwha`
> (chieuthuc3-bachungyen) ngày **27/07/2026** — toàn bộ số liệu trong tài liệu này là
> dữ liệu thật của kỳ Quý II/2026, không phải ước lượng. SQL gốc ở **Phụ lục A**.
>
> **Phạm vi code khảo sát:** `src/components/bm/*` (BMFormPage, SkillActionsBlock,
> AttitudeActionsBlock, AIActionsBlock, PreviousActionsReview, AICompetencyPortrait),
> `src/components/evaluation/*`, `src/lib/skillInsights.ts`, `src/lib/reviewTextQuality.ts`,
> `src/hooks/useHistoricalSkillLevels.ts`, `supabase/functions/ai-advisor/index.ts`,
> `scripts/import-bm01-q1/README.md`.

---

## 0. Tóm tắt điều hành

**Bảy phát hiện, đều có số:**

| # | Phát hiện | Số liệu Quý II/2026 |
| --- | --- | --- |
| 1 | **Chỉ 1/5 hành động là đo được trọn vẹn.** Trên 507 hành động cam kết cho Quý III, chỉ 105 hành động có đủ cả 3: hạn trong quý + kết quả/minh chứng + một đại lượng đếm được | **105/507 = 20,7 %** |
| 2 | **41 % cán bộ không có nổi một hành động đo được** nào trong cả phiếu | **40/97 cán bộ** |
| 3 | **Chất lượng cam kết đi lùi so với Quý I.** Tỷ lệ hành động kỹ năng có đại lượng định lượng giảm, tỷ lệ thiếu hạn tăng | có số: 47,5 % → **31,1 %**; thiếu hạn 31,9 % → **42,9 %** |
| 4 | **Đánh giá của CBQL gần như trùng khít tự đánh giá** → tầng duyệt hiện không tạo thêm thông tin | **676/716 = 94,4 %** dòng skill trùng mức |
| 5 | **Ý kiến CBQL trong trao đổi 1-1 phần lớn là "Đồng ý" suông** | **103/282 = 36,5 %** ô ý kiến |
| 6 | **Cán bộ tự chấm "hoàn thành" cao hơn thực tế 15 %** — dữ liệu hiệu chỉnh quý giá đang bị bỏ không | **68/451** dòng bị CBQL hạ trạng thái |
| 7 | **Chưa có mốc so sánh năng lực Quý I** (Quý I làm trên Word, không seed `skill_assessments`) → "so với chính mình" ở trục kỹ năng **bắt đầu tính từ Quý II** | Quý I: **0** dòng `skill_assessments` |

**Ba kết luận định hướng:**

1. **Không thiếu dữ liệu — thiếu chuẩn và thiếu vòng khép kín.** BM02 Quý II đã thu được
   một kho dữ liệu rất giàu (837 dòng chấm kỹ năng, 582 dòng thái độ, 344 ô trả lời 1-1
   với độ dài trung bình 401 ký tự, 451 dòng PDCA kỳ trước). Vấn đề nằm ở **ô "Việc sẽ
   làm" và ô "Kết quả/Minh chứng"** — nơi không có bất kỳ ràng buộc chất lượng nào ngoài
   `required` hình thức.
2. **"Cải thiện hơn so với bản thân" phải được định nghĩa bằng công thức, không bằng cảm
   nhận.** Đề xuất **Chỉ số tiến bộ cá nhân (CTB)** gồm 5 trục Δ, mọi trục đều tính được
   từ bảng đang có, và **tuyệt đối không so cán bộ với cán bộ** (giữ đúng nguyên tắc đã
   nêu trong prompt `quarterly_letter`).
3. **Khuyến nghị lại hành động phải làm ngay trong tháng 8/2026** — vì 507 hành động này
   là kế hoạch của Quý III đang chạy. Sau 30/9 thì việc viết lại chỉ còn giá trị rút kinh
   nghiệm. Đề xuất một **"Tuần siết cam kết Quý III"** với công cụ chấm điểm tự động +
   AI viết lại + CBQL duyệt.

---

## 1. Kho dữ liệu BM02 Quý II — thực có gì

### 1.1. Ba lớp dữ liệu

BM02 (`src/components/bm/BMFormPage.tsx`, cấu hình ở `src/pages/BM02Page.tsx`) sinh ra ba
lớp dữ liệu có bản chất khác nhau — và ba lớp này phải được dùng theo ba cách khác nhau:

| Lớp | Nội dung | Bảng | Đặc tính |
| --- | --- | --- | --- |
| **A. Đã đánh giá** (định lượng) | Mức L0–L4 của 38 kỹ năng, trạng thái 6 nhóm thái độ | `skill_assessments`, `form_attitude_priorities` | So sánh được giữa các kỳ → dùng cho **Δ năng lực** |
| **B. Đã trao đổi** (định tính) | 8 câu hỏi 1-1, nhận xét tổng thể 3 cấp, ý kiến từng dòng skill/thái độ | `form_submissions.one_on_one_answers`, `*_overall_review`, `skill_assessments.manager_note` | Giàu ngữ cảnh, không so sánh trực tiếp được → dùng cho **trích xuất chủ đề & kiểm chứng chéo** |
| **C. Đã cam kết** (hành động) | Kế hoạch phát triển Quý III | `form_skill_actions`, `form_attitude_actions`, `form_ai_actions_v2` → trigger sinh `kanban_cards` | Là **đầu ra duy nhất có thể nghiệm thu**; đây chính là chỗ đang hỏng |

Cộng thêm một lớp bắc cầu rất đáng giá:

| Lớp | Nội dung | Bảng |
| --- | --- | --- |
| **D. PDCA kỳ trước** | Rà soát từng hành động Quý I: cán bộ tự chấm ↔ CBQL chấm lại | `form_previous_action_reviews` (451 dòng) |

### 1.2. Khối lượng thực tế (kỳ Quý II/2026)

```
Phiếu               97   (84 approved · 7 reviewed · 6 submitted · 0 draft)
skill_assessments  837   (833 có tự chấm · 716 có CBQL chấm · 542 có minh chứng)
form_skill_priorities        199   (2,12 skill ưu tiên / phiếu)
form_skill_actions           219
form_attitude_priorities     582   (đủ 6 nhóm × 97 cán bộ)
form_attitude_actions         82
form_ai_actions_v2           206
  → TỔNG HÀNH ĐỘNG           507   cam kết cho Quý III/2026
form_previous_action_reviews 451   (PDCA hành động Quý I)
one_on_one: 43 phiếu bật · 46 phiếu có nội dung · 344 ô trả lời
kanban_cards (cycle Quý II)  994   (tạo 16–26/07/2026, trigger từ 3 bảng hành động)
staff_star_classifications    51/97 cán bộ được xếp sao
```

### 1.3. Điểm đặc thù phải nhớ khi phân tích Quý II

BM02 đặt `autoCarryOver: false` (`src/pages/BM02Page.tsx:14`): **không** kế thừa level và
kế hoạch từ Quý I. Lý do: Quý I làm trên Word/PDF, script `scripts/import-bm01-q1` chỉ
nhập lại **hành động** (`form_skill_actions`, `form_ai_actions_v2`), **cố ý không seed
`skill_assessments`** vì bản giấy không chấm theo level.

**Hệ quả bắt buộc phải chấp nhận:**

- Trục **năng lực** (Δ level kỹ năng): **Quý II là mốc 0**. Phép so "cải thiện hơn chính
  mình" ở trục này chỉ có kết quả thật từ **BM03 (Quý III)** trở đi. Đừng cố dựng biểu đồ
  xu hướng level Q1→Q2 — nó sẽ là biểu đồ của dữ liệu trống.
- Trục **thực thi** và trục **tự nhận thức**: **đã đo được ngay hôm nay** nhờ 451 dòng
  `form_previous_action_reviews` (Q1 → Q2). Đây là tài sản đang bị bỏ không hoàn toàn.

---

## 2. Chẩn đoán bằng số liệu

### 2.1. Hành động "khó đo lường" — đo mức độ khó đó

Định nghĩa vận hành dùng xuyên suốt tài liệu — **một hành động gọi là ĐO ĐƯỢC khi đủ 3 điều kiện**:

1. có **hạn** và hạn nằm trong quý kế hoạch (01/07–30/09/2026);
2. có **kết quả/minh chứng mong đợi** (ô không trống);
3. có ít nhất một **đại lượng đếm được** trong nội dung việc hoặc trong kết quả.

Kết quả trên toàn bộ 507 hành động Quý III:

| Tiêu chí | Đạt | Tỷ lệ |
| --- | --- | --- |
| Có hạn **trong quý** | 311/507 | 61,3 % |
| Có kết quả/minh chứng | 418/507 | 82,4 % |
| Có đại lượng đếm được | 217/507 | 42,8 % |
| **Đủ cả ba → ĐO ĐƯỢC** | **105/507** | **20,7 %** |

Bóc theo từng loại hành động:

| Loại | Số dòng | Có số | Thiếu hạn | Thiếu kết quả | Thiếu "hỗ trợ cần" |
| --- | --- | --- | --- | --- | --- |
| Kỹ năng (`form_skill_actions`) | 219 | 68 (31,1 %) | 94 (42,9 %) | 21 (9,6 %) | 175 (79,9 %) |
| Thái độ (`form_attitude_actions`) | 82 | 13 (15,9 %) | 15 (18,3 %) | **51 (62,2 %)** | 78 (95,1 %) |
| Ứng dụng AI (`form_ai_actions_v2`) | 206 | 31 (15,0 %) | 51 (24,8 %) | 17 (8,3 %) | — |

→ **Hành động thái độ và hành động AI là hai ổ vấn đề lớn nhất.** Hành động thái độ thiếu
minh chứng ở mức 62 %; hành động AI gần như không bao giờ định lượng (15 %).

**Phân bố theo cán bộ** (quan trọng hơn phân bố theo dòng):

- **40/97 cán bộ (41,2 %)**: không có **một** hành động đo được nào.
- 27/97: có đúng 1.
- **30/97 (30,9 %)**: có từ 2 trở lên — nhóm này đang làm đúng, cần lấy làm mẫu.

**Phân bố theo phòng** (chỉ tính hành động kỹ năng, `n` = số hành động):

| Phòng | n | % đo được | Thiếu hạn |
| --- | --- | --- | --- |
| Phòng Bán lẻ | 13 | **54 %** | 4 |
| Ban Giám đốc | 4 | 50 % | 2 |
| PGD Yên Mỹ | 27 | 44 % | 8 |
| Phòng Dịch vụ khách hàng | 23 | 43 % | 3 |
| Phòng Hỗ trợ tín dụng | 15 | 33 % | 3 |
| Phòng Tổ chức Tổng hợp | 17 | 24 % | 4 |
| **Phòng KHDN** | **39** | **21 %** | **23** |
| PGD Khoái Châu | 17 | 18 % | 9 |
| PGD Ân Thi | 22 | 18 % | 13 |
| PGD Văn Giang | 24 | 17 % | 18 |
| PGD Văn Lâm | 18 | 17 % | 7 |

Chênh lệch 54 % ↔ 17 % giữa các phòng cho thấy đây **không phải vấn đề năng lực cán bộ mà
là vấn đề chuẩn và mức độ soát của người duyệt**. Phòng KHDN đáng chú ý nhất: nhiều hành
động nhất (39) nhưng 23/39 không có hạn.

### 2.2. So với Quý I: đang đi lùi

| Chỉ tiêu (hành động kỹ năng) | Quý I (263 dòng) | Quý II (219 dòng) |
| --- | --- | --- |
| Độ dài trung bình | 170 ký tự | 171 ký tự |
| Có đại lượng đếm được | **125 (47,5 %)** | **68 (31,1 %)** |
| Thiếu hạn | 84 (31,9 %) | **94 (42,9 %)** |
| Thiếu kết quả mong đợi | 1 (0,4 %) | **21 (9,6 %)** |

*Lưu ý về tính so sánh:* hành động Quý I là văn bản do cán bộ tự viết trên bản Word, được
trích xuất nguyên văn (xem `scripts/import-bm01-q1/README.md`), nên phần **nội dung** so
sánh được. Riêng cột "thiếu hạn" của Quý I có thể lạc quan hơn thực tế vì quá trình nhập
liệu đã chuẩn hoá một phần hạn. Dù trừ hao khoản này, **mức sụt của chỉ tiêu "có đại lượng
đếm được" (47,5 % → 31,1 %) vẫn là tín hiệu thật** và không giải thích được bằng cách nhập
liệu.

Cách đọc: khi chuyển từ giấy sang app, ô nhập trở nên nhỏ hơn, nhanh hơn, có gợi ý
placeholder — nhưng **không có phản hồi chất lượng**. Tốc độ tăng, độ chặt giảm.

### 2.3. Bốn dạng hành động hỏng điển hình (trích ẩn danh từ dữ liệu thật)

| Dạng | Ví dụ nguyên văn trong hệ thống | Vì sao không nghiệm thu được |
| --- | --- | --- |
| **1. Khẩu hiệu** | *"cần cố gắng"* · *"tôi sẽ cải thiện bám việc"* · *"Giao dịch cẩn thận"* | Không có việc, không có mốc. Cuối quý không ai kết luận được xong hay chưa |
| **2. Mô tả nhiệm vụ thường ngày (BAU)** | *"Thực hiện đúng các giao dịch cơ bản tại quầy, kiểm tra chứng từ, nhận diện khách hàng và hạch toán đúng trên hệ thống"* · *"Thực hiện đúng quy trình thu, chi, giao nhận tiền mặt…"* | Đây là **mô tả công việc**, không phải hành động **phát triển**. Làm đúng = giữ nguyên năng lực, không nâng level |
| **3. Chép lại mô tả mức** | Ô "Việc sẽ làm" = mô tả L1 của skill, ô "Kết quả" = mô tả L2 của cùng skill | Nêu **đích**, không nêu **cách đi**. Không có hành vi nào để quan sát |
| **4. Định lượng treo lơ lửng** | *"Có thêm 10 sáng kiến"* (không hạn, không minh chứng) · *"Mỗi tuần ít nhất 1 sáng kiến"* (không minh chứng) | Có con số nhưng không có nơi nộp bằng chứng và không có người xác nhận → vẫn không nghiệm thu được |

Và **4 dòng còn nguyên chữ `"Chưa nhập"`** — placeholder do `saveEvaluationChildren` điền
khi ô trống (`BMFormPage.tsx:561`) — đã lọt qua cả 3 cấp duyệt.

**Đối chứng — các hành động Quý III đang viết tốt** (cũng trích từ dữ liệu thật, dùng làm mẫu chuẩn):

- *"Chủ động lựa chọn và phân tích ít nhất **05 hồ sơ tín dụng** đã được phê duyệt có yếu
  tố phức tạp (có điều kiện đặc biệt, cấu trúc TSBĐ đa dạng, có ngoại lệ quy trình…)"*
- *"Thực hiện chiến dịch QR tới các HKD"* → kết quả: *"Mở tối thiểu **85 hộ kinh doanh**"*
- *"Được kèm cặp bởi [CBQL] về kỹ năng Thẩm định khách hàng bán lẻ"* → kết quả:
  *"**Đạt L3 với xác nhận của người kèm cặp**"*, hạn 30/09/2026
- *"Sử dụng MyGenie để tra cứu nhanh văn bản tín dụng thay vì tra thủ công"* → kết quả:
  *"**Giảm 50 % thời gian** tìm kiếm quy định khi tác nghiệp"*

Đáng chú ý: nhóm hành động **kèm cặp** (sinh từ `MentorSuggestion`/`SkillDevelopmentBlock`)
có chất lượng cao **một cách hệ thống**, vì mẫu câu do hệ thống sinh sẵn đã gài đủ đối
tượng + mức đích + người xác nhận. **Đây là bằng chứng mạnh nhất cho luận điểm: khi hệ
thống đưa khuôn, cán bộ viết đúng ngay.**

### 2.4. Sao chép giữa các cán bộ: **không phải vấn đề**

Kiểm tra trùng lặp văn bản hành động (>10 ký tự, xuất hiện ở ≥2 phiếu): **chỉ 1 nhóm trùng
/ 2 dòng trên tổng 219**. Cán bộ **đang tự viết**, không copy-paste của nhau. Đây là tin
tốt: vấn đề là **kỹ năng diễn đạt mục tiêu**, không phải thái độ đối phó. Can thiệp bằng
khuôn mẫu + phản hồi sẽ hiệu quả; can thiệp bằng kỷ luật thì không đúng bệnh.

### 2.5. Mục tiêu level: 1/5 phiếu không nêu đích

| Chỉ tiêu (199 dòng `form_skill_priorities`) | Số | Tỷ lệ |
| --- | --- | --- |
| Có bước nhảy thật (target > current) | 114 | 57,3 % |
| Đích **bằng** mức hiện tại (không nâng) | 28 | 14,1 % |
| Thiếu `current_level` | 41 | 20,6 % |
| Thiếu `target_level` | 34 | 17,1 % |
| Thiếu lý do chọn (`reason_text`) | 22 | 11,1 % |

Thiếu `target_level` là lỗi nặng nhất: hành động không có đích thì rubric nào cũng chấm
trượt, và cơ chế auto-bump level ở BM03 (`BMFormPage.tsx:456`, `if (allCompleted &&
sp.target_level != null)`) sẽ **bỏ qua** những skill này — cán bộ làm xong vẫn không được
ghi nhận lên level.

### 2.6. Tầng duyệt đang không tạo thêm thông tin

| Hiện tượng | Số liệu |
| --- | --- |
| Dòng skill CBQL chấm **trùng khít** tự đánh giá | 676/716 = **94,4 %** |
| CBQL chấm **thấp hơn** cán bộ | 29 dòng (4,1 %) |
| CBQL chấm **cao hơn** cán bộ | 11 dòng (1,5 %) |
| Dòng skill có `manager_note` | 264/837 = 31,5 % |
| Ô ý kiến 1-1 của CBQL là "Đồng ý" suông | **103/282 = 36,5 %** |
| Độ dài trung bình: cán bộ trả lời 1-1 | **401 ký tự** |
| Độ dài trung bình: ý kiến CBQL | 197 ký tự |

Cơ chế cảnh báo `isBareAgreement` đã tồn tại (`src/lib/reviewTextQuality.ts`) nhưng theo
thiết kế **chỉ nhắc, không chặn** — và số liệu cho thấy lời nhắc mềm không đủ.

Cấu trúc nhận xét tổng thể cũng bị dồn hết vào một ô:

| Trường trong `manager_overall_review` | Số phiếu có |
| --- | --- |
| `next_focus` | 76 |
| `strengths` / `improvements` | 37 / 37 |
| `attitude_note` | 34 |
| `conclusion` / `upskill_note` | 28 / 28 |
| `support_note` | 26 |

Tức là **76 CBQL viết `next_focus`, nhưng chưa tới một nửa tách được "điểm mạnh / điểm cần
cải thiện"**. Đọc mẫu nội dung `next_focus` thì thấy nhiều bản viết rất công phu (500–1500
ký tự, có nhận định nghề nghiệp sắc sảo) — chất lượng tư duy có, chỉ là bị nén vào một ô
văn xuôi nên **máy không bóc tách được để đối chiếu với hành động**. PGĐ còn cực đoan hơn:
75/79 phiếu chỉ điền `next_focus`.

### 2.7. Mỏ vàng đang bỏ không: 451 dòng PDCA Quý I

| Cán bộ tự chấm → CBQL chấm lại | Số dòng |
| --- | --- |
| completed → completed (khớp) | 237 |
| in_progress → in_progress (khớp) | 96 |
| **completed → in_progress** (CBQL hạ) | **42** |
| **completed → planned** (CBQL hạ mạnh) | **26** |
| in_progress → completed (CBQL nâng) | 23 |
| còn lại | 27 |

- **68/451 = 15,1 %** hành động bị CBQL hạ trạng thái so với tự chấm → **chỉ số "độ lệch
  tự nhận thức" cấp cá nhân, tính được ngay hôm nay.**
- `manager_note` có ở **398/451 = 88,2 %** dòng — CBQL rà soát hành động **nghiêm túc hơn
  nhiều** so với khi chấm level (31,5 %). Khi có việc cụ thể để đối chiếu, CBQL làm tốt.
  Đây là lập luận trực tiếp cho việc **chuyển trọng tâm duyệt từ "chấm level" sang
  "nghiệm thu hành động"**.
- `employee_note` chỉ có ở 58/451 = 12,9 % → cán bộ ít giải trình khi bị hạ. Vòng phản hồi
  hai chiều đang hở.

### 2.8. Kanban: cần vá ngay một lỗi cấu trúc

994 thẻ của kỳ Quý II được sinh 16–26/07/2026 (trigger từ 3 bảng hành động). Trạng thái:
974 `todo`, 18 `doing`, 2 chờ xác nhận.

**Không nên kết luận "Kanban chết"** — thẻ mới sinh vài ngày, quý kế hoạch mới chạy 4 tuần.
Nhưng có một con số là lỗi thật, không phụ thuộc thời gian:

> **434/994 thẻ (43,7 %) không có `deadline`.**

Thẻ không hạn thì `computeBadges` không bao giờ bật cờ `overdue`/`dueSoon`
(`src/lib/kanban.ts:148`), digest nhắc việc hằng ngày bỏ qua, và cuối quý không có căn cứ
nghiệm thu. **Đây là hệ quả trực tiếp của 196/507 hành động thiếu hạn ở mục 2.1** — lỗi
sinh ra ở biểu mẫu, chảy xuống Kanban.

### 2.9. Xếp sao: mới phủ được một nửa

51/97 cán bộ có xếp sao Quý II (Sao Khuê 30 · Sao Mai 16 · Sao Băng 5); trong đó chỉ
**17/51 (33 %)** có `direction_text` (định hướng phát triển kèm theo). Xếp sao mà không kèm
định hướng thì với cán bộ nó chỉ còn là nhãn — đúng thứ dễ gây phản ứng nhất và ít giá trị
phát triển nhất.

---

## 3. Khung "tiến bộ so với chính mình" — Chỉ số CTB

### 3.1. Nguyên tắc bất di bất dịch

1. **Chỉ so cán bộ với chính cán bộ ở kỳ trước.** Không xếp hạng cá nhân với cá nhân trong
   bất kỳ đầu ra nào cán bộ nhìn thấy. (Giữ đúng ràng buộc đã có trong prompt
   `quarterly_letter`: *"KHÔNG so sánh với đồng nghiệp — chỉ so bạn-với-chính-bạn"*.)
2. **So sánh cấp tập thể chỉ dùng cho quản trị**, hiển thị ở tầng phòng/chi nhánh, không
   hiển thị bảng xếp hạng cá nhân.
3. **Mọi trục Δ phải tính được từ bảng đang có** — không thêm ô nhập mới cho cán bộ.
4. **Trục nào chưa có dữ liệu thì ghi thẳng "chưa đo được kỳ này"**, không nội suy, không
   lấp bằng 0.

### 3.2. Năm trục Δ

| Trục | Công thức | Nguồn dữ liệu | Có đo được cho Q2 không? |
| --- | --- | --- | --- |
| **Δ1 · Năng lực** | (số skill tăng level) − (số skill tụt level); % đáp ứng vị trí kỳ này − kỳ trước, dùng `computeCareerFit` | `skill_assessments` × `position_core_skills` | **Chưa** — Quý I không có level. Bắt đầu từ BM03 |
| **Δ2 · Thực thi** | (số hành động kỳ trước được **CBQL xác nhận** hoàn thành) ÷ (số hành động đã cam kết) | `form_previous_action_reviews.status`, `kanban_cards.completion_status='confirmed'` | **Được ngay** — 451 dòng Q1→Q2 |
| **Δ3 · Tự nhận thức** | 1 − (số dòng CBQL sửa khác tự chấm) ÷ (tổng dòng có cả hai) — tính trên **cả** rà soát hành động **và** chấm level | `form_previous_action_reviews`, `skill_assessments` | **Được ngay** — 68/451 lệch |
| **Δ4 · Thái độ** | Số nhóm (trong 6) chuyển trạng thái tích cực + số `improvement_goal` kỳ trước được xác nhận đạt | `form_attitude_priorities.self_status/manager_status` | **Một phần** — Q2 là mốc 0 cho `self_status` |
| **Δ5 · Chất lượng cam kết** | Điểm rubric trung bình các hành động kỳ này − kỳ trước (rubric ở mục 4) | 3 bảng hành động | **Được ngay** — có cả Q1 và Q2 |

### 3.3. Cách hợp thành và cách trình bày

Không nên gộp 5 trục thành **một** con số duy nhất rồi đem xếp hạng — làm vậy là tái lập
đúng cái so-sánh-người-với-người mà nguyên tắc 1 cấm. Đề xuất trình bày dạng **thẻ 5 dòng**:

```
THẺ TIẾN BỘ CÁ NHÂN — [Cán bộ] — Quý III/2026 so với Quý II/2026

Δ1 Năng lực        +3 skill lên level · % đáp ứng vị trí 72 % → 81 %   ▲
Δ2 Thực thi        4/6 hành động được xác nhận hoàn thành (kỳ trước 2/5)  ▲
Δ3 Tự nhận thức    Lệch 1/6 dòng (kỳ trước 3/5) — tự chấm sát hơn      ▲
Δ4 Thái độ         2/6 nhóm chuyển tích cực · 1 mục tiêu đạt           ▬
Δ5 Chất lượng cam kết  Điểm hành động TB 42 → 78 /100                  ▲

Một câu tóm tắt: "Bạn tiến bộ rõ nhất ở chỗ viết cam kết cụ thể hơn và
làm đến cùng hơn; chỗ chưa chuyển là nhóm thái độ Phối hợp & đồng đội."
```

Nguyên tắc trình bày:
- **Luôn kèm mẫu số** ("4/6", không phải "67 %") — số nhỏ, mẫu số nhỏ, hiển thị phần trăm
  gây ảo giác chính xác.
- **Không tô đỏ trục đi xuống**; ghi trung tính kèm câu hỏi gợi mở (đúng tinh thần
  `one_on_one_prep`: giúp cán bộ **tự nói ra** vấn đề).
- Trục chưa đo được: ghi *"Chưa có mốc so sánh — kỳ này là mốc đầu tiên"*.

### 3.4. Hiện thực hoá

Đề xuất một RPC `get_self_progress(_profile_id uuid, _cycle_id uuid)` trả JSON 5 trục
(SECURITY DEFINER, RLS theo `can_view_profile()`), vì:
- 5 trục cần join 6 bảng — làm phía client sẽ tốn 6 round-trip cho mỗi cán bộ;
- `QuarterlyNewsletterPage` (bản tin quý) và `OneOnOnePrepPanel` đều cần cùng payload này;
- Đặt ở DB thì `send-hr-notification` / edge function dùng lại được, không phải viết lại logic.

Phần thuần tính toán (chuẩn hoá, phân ngưỡng ▲▬▼) nên nằm ở `src/lib/selfProgress.ts` theo
đúng khuôn `src/lib/skillInsights.ts` — không phụ thuộc Supabase client, có test.

---

## 4. Chuẩn hành động ĐO ĐƯỢC — rubric "5 Ô ĐẦY"

### 4.1. Định nghĩa

Một hành động phát triển đạt chuẩn khi trả lời được **5 câu**, và mọi câu đều **quan sát
được từ bên ngoài**:

| Ô | Câu hỏi | Ràng buộc | Điểm |
| --- | --- | --- | --- |
| **1. Đích** | Nâng skill nào, từ L mấy lên L mấy? (hoặc: nhóm thái độ nào, hành vi nào?) | `skill_id` + `current_level` + `target_level` cùng khác null | 20 |
| **2. Việc** | Làm gì, **bao nhiêu lần / bao nhiêu cái**, trong bao lâu? | Có động từ hành động + **đại lượng đếm được** | 25 |
| **3. Bằng chứng** | Cuối quý **nộp ra cái gì**? | Có **danh từ vật thể** nộp được (checklist, biên bản, file, hồ sơ, bản ghi, chứng nhận, dashboard, bài trình bày…) | 25 |
| **4. Hạn** | Xong khi nào? | Hạn ≠ null và **nằm trong quý kế hoạch** | 15 |
| **5. Người xác nhận** | **Ai** ký nhận là đạt? | Có người kèm cặp / CBQL / ô "hỗ trợ cần" nêu rõ vai trò | 15 |

Ngưỡng đề xuất: **≥ 70 = đạt** · 40–69 = cần sửa · < 40 = phải viết lại.

Đối chiếu với 507 hành động hiện tại (ước theo 3 tiêu chí đã đo được ở mục 2.1): khoảng
**20 % đạt** ngay, phần còn lại rơi vào "cần sửa" và "phải viết lại".

### 4.2. Ba luật loại trừ (quan trọng hơn cả thang điểm)

Ba dạng dưới đây **bị đánh trượt bất kể điểm số**, vì chúng là lỗi bản chất:

1. **Luật BAU** — nếu nội dung chỉ mô tả nhiệm vụ thường ngày ("thực hiện đúng…", "đảm
   bảo…", "tuân thủ…") mà không có đại lượng vượt hiện trạng → **không phải hành động phát
   triển**. Gợi ý sửa: thêm mức tăng so với hiện trạng ("giảm X lỗi so với quý trước",
   "rút thời gian từ A xuống B").
2. **Luật chép mức** — nếu "Việc sẽ làm" trùng ≥ 60 % token với `levelN_description` của
   chính skill đó → đó là **đích**, không phải **cách đi**.
3. **Luật khẩu hiệu** — nếu độ dài < 40 ký tự **và** không có đại lượng **và** không có
   danh từ bằng chứng → trả về nhập lại.

Ba luật này đều **tính được bằng code thuần**, không cần AI, không cần gọi mạng.

### 4.3. Bộ khuôn theo 70/20/10 (điền chỗ trống)

Bằng chứng ở mục 2.3 cho thấy khuôn có sẵn tạo ra hành động tốt. Đề xuất 6 khuôn, gài
sẵn trong `SkillActionsBlock` dưới dạng nút "Dùng khuôn":

**70 % — học qua công việc**
- `Áp dụng {công cụ/checklist} vào tối thiểu {N} {hồ sơ/giao dịch/tình huống} thực tế thuộc {phạm vi}` → bằng chứng: `{N} bản {hồ sơ} có dấu vết áp dụng, {CBQL} xác nhận` · hạn `{cuối quý}`
- `Xây dựng {01 checklist / 01 bộ tình huống / 01 quy trình rút gọn} cho {nghiệp vụ}` → bằng chứng: `file đã dùng thật cho ≥ {N} lần tác nghiệp`
- `Giảm {chỉ số} từ {A} xuống {B}` → bằng chứng: `số liệu đối chiếu {nguồn}, {CBQL} xác nhận`

**20 % — học qua người khác**
- `Được kèm cặp bởi {người} về {skill}` → bằng chứng: `Đạt L{n} với xác nhận của người kèm cặp` *(khuôn hiện có, chất lượng cao nhất hệ thống — giữ nguyên)*
- `Trình bày {chủ đề} trước {phòng/chi nhánh} {N} lần` → bằng chứng: `{N} bản trình bày + phản hồi của người dự`

**10 % — đào tạo/tài liệu**
- `Hoàn thành khoá {tên khoá}` → bằng chứng: `chứng nhận + 01 bản tóm tắt điểm áp dụng được vào việc`

Riêng **hành động AI** (yếu nhất, 15 % có định lượng) cần một khuôn riêng, vì cái đo được
của việc dùng AI luôn là **thời gian tiết kiệm hoặc số lần áp dụng**:

> `Dùng {công cụ AI} để {việc}` → bằng chứng: `áp dụng thật {N} lần/tháng` **hoặc**
> `rút thời gian {việc} từ {A} xuống {B}`, kèm `{01 sản phẩm mẫu}` để nộp.

### 4.4. Bảng viết lại: trước → sau (từ hành động thật đang có trong hệ thống)

| Nguyên văn hiện tại | Điểm | Bản viết lại đề xuất |
| --- | --- | --- |
| *"Nâng cao kỹ năng thẩm định khách hàng"* | ~0 | *Thẩm định độc lập tối thiểu **06 hồ sơ KHCN** (≥ 2 hồ sơ có nguồn thu không chính thức), lập tờ trình đầy đủ trước khi trình LĐP* → **BC:** 06 tờ trình + nhận xét của LĐP trên ít nhất 3 hồ sơ · **Hạn:** 30/09/2026 · **Xác nhận:** LĐP |
| *"Sử dụng tiếng anh trong công việc"* | ~10 | *Xây dựng **bộ 5 kịch bản giao tiếp tiếng Anh** cho 5 nghiệp vụ quầy và dùng thật với tối thiểu **03 khách hàng nước ngoài*** → **BC:** file 5 kịch bản + nhật ký 3 lần áp dụng · **Hạn:** 30/09/2026 · **Xác nhận:** LĐP |
| *"cần cố gắng"* (thái độ Học hỏi & cầu thị) | 0 | *Mỗi tháng chọn **01 văn bản nghiệp vụ mới**, tóm tắt 1 trang và chia sẻ tại họp đầu ngày của phòng* → **BC:** 3 bản tóm tắt + biên bản họp ghi nhận · **Hạn:** 30/09/2026 · **Xác nhận:** Trưởng phòng |
| *"Có thêm 10 sáng kiến"* | ~35 | *Đề xuất **10 ý tưởng cải tiến** trên Bắc Hưng Yên Ideas, trong đó tối thiểu **02 ý tưởng được triển khai thử*** → **BC:** 10 bản ghi trên hệ thống + kết quả 2 ý tưởng thử · **Hạn:** 30/09/2026 · **Xác nhận:** Trưởng phòng |
| *"Thực hiện đúng các giao dịch cơ bản tại quầy…"* (BAU) | trượt luật 1 | *Giảm số lỗi hậu kiểm của cá nhân **từ {mức Quý II} xuống {mức thấp hơn}**; mỗi lỗi phát sinh ghi 1 dòng nguyên nhân + cách chặn* → **BC:** báo cáo hậu kiểm 2 quý + sổ lỗi cá nhân · **Hạn:** 30/09/2026 · **Xác nhận:** Bộ phận hậu kiểm |
| *"Học Claude AI thông qua Sách/Khóa học"* | ~20 | *Dùng Claude/MyGenie để soạn **04 bản tóm tắt văn bản nghiệp vụ/tháng**, đối chiếu lại với bản gốc trước khi dùng* → **BC:** 12 bản tóm tắt có ghi nguồn đối chiếu · **Hạn:** 30/09/2026 · **Xác nhận:** LĐP |
| *"Thiết kế tài liệu truyền thông (poster) bằng AI"* | ~30 | *Thiết kế **06 ấn phẩm truyền thông** bằng AI cho các chiến dịch của phòng, rút thời gian mỗi ấn phẩm **từ ~2 giờ xuống ≤ 30 phút*** → **BC:** 6 ấn phẩm đã dùng thật + đối chiếu thời gian · **Hạn:** 30/09/2026 |
| *"tập lập kế hoạch và bảo vệ kế hoạch"* | ~30 (đã có KQ tốt) | Giữ nguyên kết quả *"tối thiểu 2 lần thuyết trình trước cán bộ/lãnh đạo chi nhánh"*, chỉ bổ sung việc làm: *Soạn **02 bản kế hoạch** (1 tháng, 1 quý) theo mẫu PDCA và bảo vệ trước phòng* |

Nguyên tắc khi viết lại: **giữ nguyên ý định của cán bộ, chỉ bổ sung lượng – bằng chứng –
hạn – người xác nhận.** Không đổi chủ đề, không nâng độ khó. Đây là điểm phải quán triệt
với CBQL, nếu không đợt rà soát sẽ biến thành đợt giao thêm việc và gặp phản ứng.

### 4.5. Hiện thực hoá: `src/lib/actionQuality.ts`

Theo đúng khuôn `src/lib/reviewTextQuality.ts` (thuần hàm, có test, không phụ thuộc
Supabase):

```ts
export interface ActionQualityInput {
  action_text: string;
  expected_result?: string | null;
  deadline?: string | null;
  requested_support?: string | null;
  current_level?: number | null;
  target_level?: number | null;
  levelDescriptions?: (string | null)[];   // để áp luật "chép mức"
  quarterStart: string; quarterEnd: string;
}

export interface ActionQualityResult {
  score: number;                    // 0..100
  verdict: 'dat' | 'can_sua' | 'viet_lai';
  missing: Array<'dich'|'luong'|'bang_chung'|'han'|'xac_nhan'>;
  violations: Array<'bau'|'chep_muc'|'khau_hieu'>;
  hints: string[];                  // câu gợi ý sửa, hiển thị ngay dưới ô nhập
}

export function scoreAction(input: ActionQualityInput): ActionQualityResult;
```

Các bộ nhận dạng cần có (tiếng Việt, có dấu và không dấu):
- `QUANTITY_RE` — chữ số, số viết chữ ("một/hai/ba…"), cụm tần suất ("mỗi tuần", "mỗi
  tháng", "tối thiểu", "ít nhất", "≥"), tỷ lệ phần trăm;
- `ARTEFACT_NOUNS` — checklist, biên bản, báo cáo, tờ trình, hồ sơ, file, bản ghi, nhật ký,
  chứng nhận, chứng chỉ, dashboard, kịch bản, bộ câu hỏi, bài trình bày, ấn phẩm, sổ…;
- `BAU_RE` — "thực hiện đúng", "đảm bảo", "tuân thủ", "duy trì", "hoàn thành nhiệm vụ được giao";
- `SLOGAN_RE` — "cố gắng", "tích cực", "thường xuyên", "nâng cao", "cải thiện", "trau dồi",
  "rèn luyện" khi đứng một mình;
- `overlapRatio(a, b)` — tỷ lệ token trùng, dùng cho luật "chép mức".

Điểm đặt tính năng (theo thứ tự ưu tiên):

| Vị trí | Hành vi |
| --- | --- |
| `SkillActionsBlock.tsx` / `AttitudeActionsBlock.tsx` / `AIActionsBlock.tsx` | Thanh chất lượng ngay dưới ô nhập: điểm + chip "thiếu gì" + nút "Dùng khuôn" |
| `SubmissionChecklist.tsx` | Thêm mục "Hành động đo được": chặn **mềm** khi cán bộ có < 1 hành động đạt ≥ 70, kèm nút nhảy tới ô cần sửa |
| `EvalSectionReviewer` / trang duyệt của CBQL | Hàng đợi "Hành động cần siết" sắp theo điểm tăng dần — CBQL biết sửa cái nào trước |
| `ReportsPage` | Bảng nhiệt điểm cam kết theo phòng (tái dùng bảng ở mục 2.1) |

---

## 5. Ba tầng khuyến nghị tổng thể

### 5.1. Tầng 1 — Cán bộ: "Thẻ tiến bộ" + "Bản viết lại"

Hai đầu ra, hiển thị ở `PersonalProfile`:

1. **Thẻ tiến bộ cá nhân** (mục 3.3) — 5 dòng Δ, một câu tóm tắt, không có xếp hạng.
2. **Bản đề xuất viết lại hành động** — với mỗi hành động < 70 điểm: bản gốc, chỗ thiếu,
   bản viết lại đề xuất, nút "Áp dụng" (ghi đè ô nhập) / "Giữ nguyên, lý do…".

Điều kiện then chốt: **cán bộ được quyền từ chối kèm lý do**. Nếu áp đặt, sản phẩm thu về
sẽ là văn bản đẹp mà không ai tin — hỏng đúng mục tiêu ban đầu.

### 5.2. Tầng 2 — CBQL: mở rộng gói chuẩn bị 1-1

`OneOnOnePrepPanel` + mode `one_on_one_prep` đã có cấu trúc rất tốt (5 mục, đã bật
`is_active=true`). Đề xuất **bổ sung 2 mục vào payload và prompt**:

```
## 📉 Điểm lệch giữa tự chấm và thực tế
(số dòng CBQL đã điều chỉnh kỳ trước; chỗ nào cán bộ đánh giá mình cao hơn —
 nêu trung tính, dùng để hỏi chứ không để kết luận)

## ✍️ Hành động cần viết lại trước khi chốt
(danh sách hành động < 70 điểm, kèm chỗ thiếu cụ thể: thiếu lượng / thiếu bằng
 chứng / thiếu hạn / thiếu người xác nhận)
```

Thêm một trang hàng đợi cho CBQL: **"Cam kết cần siết"** — gom theo phòng, sắp theo điểm
tăng dần, có nút mở thẳng phiếu. Với Phòng KHDN (23/39 hành động thiếu hạn) đây là danh
sách một buổi làm xong.

### 5.3. Tầng 3 — BGĐ / TCTH: bức tranh chi nhánh

Bổ sung vào `ReportsPage` (hoặc trang mới `/khuyen-nghi-tong-the`), 4 khối:

1. **Bảng nhiệt chất lượng cam kết theo phòng** — cột: số hành động, % đạt ≥ 70, % thiếu
   hạn, % thiếu bằng chứng. (Số liệu mục 2.1 là bản đầu tiên.)
2. **Danh sách cần can thiệp**: 40 cán bộ không có hành động đo được nào; 434 thẻ Kanban
   thiếu hạn; 34 skill ưu tiên thiếu `target_level`; 4 dòng còn chữ "Chưa nhập".
3. **Chất lượng tầng duyệt**: % dòng CBQL sửa khác tự chấm theo từng người duyệt, %
   `manager_note` được điền, % ô 1-1 là "Đồng ý" suông. Đây là chỉ số **của người duyệt**,
   không phải của cán bộ — dùng để đào tạo CBQL, không dùng để đánh giá cán bộ.
4. **Xu hướng qua kỳ** — Δ5 (chất lượng cam kết) toàn chi nhánh: Q1 → Q2 → Q3.

### 5.4. Mode AI mới cần thêm

`supabase/functions/ai-advisor/index.ts` hiện có 11 mode; đề xuất thêm 2, theo đúng cơ chế
`ai_prompts` (nội dung sửa được trong màn hình Quản trị AI, có fallback trong code):

| Mode | Đầu vào | Đầu ra | Ghi chú |
| --- | --- | --- | --- |
| `action_rewrite` | 1 hành động + skill (mã, tên, mô tả L hiện tại/đích) + kết quả chấm rubric | 1 bản viết lại theo 5 ô + 2 phương án bằng chứng thay thế | Chạy **theo lô**, chỉ cho hành động < 70 điểm → tiết kiệm token; chấm điểm vẫn do code làm, AI chỉ viết câu |
| `overall_recommendation` | Toàn phiếu (A–F) + 5 trục Δ + PDCA kỳ trước + nhận xét 3 cấp + 1-1 | Khuyến nghị tổng thể ≤ 400 từ: 2 việc nên dồn sức, 1 việc nên dừng, 1 hỗ trợ nên xin | Là mảnh còn thiếu giữa `competency_portrait` (mô tả hiện trạng) và `quarterly_letter` (tổng kết cuối kỳ) |

Ràng buộc bắt buộc đưa vào cả hai prompt:
- *Không bịa số liệu ngoài JSON được cấp* (đã là chuẩn của `system_base`);
- *Không so sánh với cán bộ khác, không nêu tên người khác*;
- *Giữ nguyên chủ đề hành động gốc — chỉ bổ sung lượng, bằng chứng, hạn, người xác nhận*;
- *Nếu thiếu dữ liệu, nói thẳng là thiếu* (đã có trong `one_on_one_prep`).

Cần một migration nới ràng buộc `mode` của `ai_prompts` + seed 2 dòng prompt, theo mẫu
`supabase/migrations/20260702080000_ai_advisor_hardening.sql`. Chi phí đã có
`AICostPanel`/`get_ai_usage_summary` để theo dõi — nên bật `budget_enforce` trước khi chạy
lô `action_rewrite` cho ~400 hành động.

---

## 6. Lộ trình triển khai

Mốc thời gian quyết định: **kế hoạch Quý III đang chạy, hạn phổ biến là 30/09/2026.** Việc
viết lại hành động chỉ có giá trị nếu xong **trong tháng 8**.

### Đợt 1 — "Tuần siết cam kết Quý III" (tuần 32–33/2026) · không cần AI

| Việc | Sản phẩm |
| --- | --- |
| `src/lib/actionQuality.ts` + `actionQuality.test.ts` | Hàm chấm 0–100 + 3 luật loại trừ |
| Thanh chất lượng trong 3 block hành động + nút "Dùng khuôn" | Cán bộ thấy điểm ngay khi gõ |
| Bổ sung `SubmissionChecklist` | Chặn mềm khi không có hành động nào ≥ 70 |
| Trang "Cam kết cần siết" cho CBQL | Hàng đợi theo phòng |
| **Vá dữ liệu tồn**: 196 hành động thiếu hạn hoặc hạn ngoài quý (trong đó **160 hoàn toàn không có hạn**), 89 thiếu kết quả/minh chứng, 34 skill ưu tiên thiếu `target_level`, 4 dòng "Chưa nhập" | Chiến dịch nhập bổ sung có thời hạn, kèm SQL đối soát (Phụ lục A) |

> Đợt 1 **không đụng vào AI, không đụng vào schema**. Riêng nó đã xử lý được phần lớn
> khoảng cách 20,7 % → mục tiêu 60 %.

### Đợt 2 — Đo tiến bộ (tuần 34–36/2026)

| Việc | Sản phẩm |
| --- | --- |
| RPC `get_self_progress` + `src/lib/selfProgress.ts` + test | 5 trục Δ |
| Thẻ tiến bộ cá nhân trong `PersonalProfile` | Cán bộ tự thấy mình so với mình |
| Mở rộng payload + prompt `one_on_one_prep` (2 mục mới) | CBQL vào phiên 1-1 có sẵn điểm lệch |
| Ép cấu trúc `manager_overall_review`: tách `strengths`/`improvements` thành ô riêng, cảnh báo khi chỉ điền `next_focus` | Nhận xét bóc tách được bằng máy |

### Đợt 3 — Khuyến nghị tổng thể (tuần 37–40/2026, trước khi mở BM03)

| Việc | Sản phẩm |
| --- | --- |
| Mode `action_rewrite` + chạy lô cho hành động < 70 | Bản viết lại kèm nút Áp dụng / Từ chối có lý do |
| Mode `overall_recommendation` | Khuyến nghị tổng thể mỗi cán bộ |
| Dashboard tầng 3 trong `ReportsPage` | 4 khối ở mục 5.3 |
| Nối Δ vào `QuarterlyNewsletterPage` | Thư quý nói bằng số thật, không bằng lời chung chung |

**Mốc kiểm chứng thật của toàn bộ nghiên cứu này:** khi BM03 mở, `autoCarryOver` bật lại
(mặc định true), cơ chế auto-bump level ở `BMFormPage.tsx:439–521` sẽ chạy — và **chỉ chạy
đúng nếu hành động Quý III có `target_level` và được CBQL xác nhận hoàn thành**. Nói cách
khác, chất lượng hành động viết hôm nay quyết định trực tiếp việc cán bộ có được ghi nhận
lên level ở Quý III hay không. Đây là lập luận thuyết phục nhất khi truyền thông với cán bộ.

---

## 7. Chỉ số đo thành công của chính sáng kiến này

| Chỉ số | Hiện tại (27/07/2026) | Mục tiêu cuối Quý III | Mục tiêu BM03 |
| --- | --- | --- | --- |
| % hành động đo được (đủ 3 điều kiện) | **20,7 %** | 60 % | 80 % |
| Số cán bộ không có hành động đo được nào | **40/97** | ≤ 10 | 0 |
| % hành động thiếu hạn / hạn ngoài quý | **38,7 %** (196/507; 160 không có hạn) | < 10 % | < 5 % |
| % thẻ Kanban thiếu `deadline` | **43,7 %** | < 10 % | < 5 % |
| % hành động thái độ thiếu minh chứng | **62,2 %** | < 20 % | < 10 % |
| % ô ý kiến 1-1 của CBQL là "Đồng ý" suông | **36,5 %** | < 15 % | < 10 % |
| % dòng skill CBQL chấm trùng khít tự chấm | **94,4 %** | — *(chỉ theo dõi)* | — |
| % hành động kỳ trước được CBQL **xác nhận** hoàn thành | 237/451 = 52,5 % | 65 % | 70 % |
| % cán bộ có xếp sao kèm `direction_text` | **17/51 = 33 %** | 80 % | 100 % |

Ghi chú về chỉ số "94,4 % trùng khít": **không đặt mục tiêu ép giảm.** Trùng cao có thể do
cán bộ tự chấm chuẩn — ép CBQL sửa để lấy chỉ số sẽ tạo ra sửa giả. Chỉ theo dõi cùng chỉ
số `manager_note` (31,5 %): mục tiêu là **tăng tỷ lệ có ghi chú**, không phải tăng tỷ lệ
sửa điểm.

---

## 8. Rủi ro & đối sách

| Rủi ro | Biểu hiện sẽ thấy | Đối sách |
| --- | --- | --- |
| **Rào chặn cứng làm cán bộ bỏ cuộc** | Tỷ lệ nộp phiếu tụt, số hành động giảm mạnh | Chặn **mềm** ở Đợt 1 (cảnh báo + gợi ý), chỉ siết dần khi tỷ lệ đạt đã lên. Không bao giờ chặn `Lưu nháp` |
| **Chạy theo con số, hành động biến thành số đếm rỗng** | Tràn ngập "làm 10 việc" mà không có bằng chứng | Ô **Bằng chứng (25 điểm)** nặng ngang ô Lượng; luật BAU chặn dạng "đếm việc thường ngày" |
| **AI viết lại làm mất tiếng nói cán bộ** | Hàng loạt hành động giống văn phong máy | Bắt buộc nút "Từ chối kèm lý do"; AI **giữ nguyên chủ đề gốc**; hiển thị song song bản gốc – bản sửa |
| **CBQL coi rà soát là giao thêm việc** | Hành động bị nâng độ khó khi viết lại | Quán triệt nguyên tắc mục 4.4: chỉ bổ sung lượng/bằng chứng/hạn/người xác nhận, **không đổi chủ đề, không nâng mức đích** |
| **Chỉ số tiến bộ bị dùng để xếp hạng cán bộ** | Xuất hiện bảng xếp hạng CTB | Ràng buộc ở tầng dữ liệu: RPC `get_self_progress` chỉ trả **một** cán bộ mỗi lần gọi; tầng 3 chỉ tổng hợp theo phòng |
| **Không có mốc Quý I nên Δ1 trống, bị hiểu là "hệ thống hỏng"** | Cán bộ thắc mắc biểu đồ trống | Ghi rõ trên UI: *"Quý II là mốc đầu tiên — trục này bắt đầu có số từ Quý III"* |
| **Chi phí token khi chạy lô ~400 hành động** | Vượt ngân sách tháng | Chấm điểm bằng **code** (miễn phí), chỉ gọi AI cho hành động < 70; bật `budget_enforce` trong `ai_settings`; theo dõi bằng `AICostPanel` |
| **Đợt rà soát trễ, Quý III đã hết** | Viết lại xong thì hết hạn thực hiện | Chốt Đợt 1 **trong tháng 8/2026**; hành động nào viết lại sau 15/09 thì chuyển thẳng thành cam kết Quý IV thay vì sửa hạn |

---

## Phụ lục A — SQL đối soát (chạy được ngay trên Supabase SQL Editor)

### A.1. Bảng điều khiển chất lượng hành động toàn kỳ

```sql
with cyc as (select id from evaluation_cycles where name = 'Quý II/2026'),
f as (select id, employee_id from form_submissions where cycle_id = (select id from cyc)),
a as (
  select f.employee_id, sa.action_text t,
         coalesce(nullif(btrim(sa.expected_result),''), nullif(btrim(sa.evidence_expected),'')) e,
         sa.deadline
  from form_skill_actions sa join f on f.id = sa.form_id
  union all
  select f.employee_id, aa.action_text, nullif(btrim(aa.expected_evidence),''), aa.deadline
  from form_attitude_actions aa join f on f.id = aa.form_id
  union all
  select f.employee_id, ai.ai_action_text,
         coalesce(nullif(btrim(ai.expected_result),''), nullif(btrim(ai.evidence_expected),'')), ai.deadline
  from form_ai_actions_v2 ai join f on f.id = ai.form_id
)
select count(*) tong_hanh_dong,
       count(*) filter (where deadline between '2026-07-01' and '2026-09-30') co_han_trong_quy,
       count(*) filter (where e is not null) co_bang_chung,
       count(*) filter (where t ~ '[0-9]' or e ~ '[0-9]') co_dinh_luong,
       count(*) filter (where deadline between '2026-07-01' and '2026-09-30'
                          and e is not null and (t ~ '[0-9]' or e ~ '[0-9]')) do_duoc
from a;
```

### A.2. Danh sách cán bộ chưa có hành động đo được nào (đầu vào cho Đợt 1)

```sql
-- Dùng CTE a ở A.1
select p.full_name, d.name dept, count(*) so_hanh_dong
from a join profiles p on p.id = a.employee_id
       left join departments d on d.id = p.department_id
group by 1, 2
having count(*) filter (where a.deadline between '2026-07-01' and '2026-09-30'
                          and a.e is not null and (a.t ~ '[0-9]' or a.e ~ '[0-9]')) = 0
order by dept, so_hanh_dong desc;
```

### A.3. Độ lệch tự nhận thức (Δ3) — tính ngay được từ PDCA Quý I

```sql
with cyc as (select id from evaluation_cycles where name = 'Quý II/2026')
select p.full_name, d.name dept,
       count(*) tong_dong,
       count(*) filter (where r.self_status = 'completed' and r.status <> 'completed') tu_cham_cao_hon,
       count(*) filter (where r.self_status <> 'completed' and r.status = 'completed') tu_cham_thap_hon,
       round(100.0 * count(*) filter (where r.self_status = r.status) / count(*)) pct_khop
from form_previous_action_reviews r
join form_submissions f on f.id = r.form_id
join profiles p on p.id = f.employee_id
left join departments d on d.id = p.department_id
where f.cycle_id = (select id from cyc)
group by 1, 2 having count(*) >= 3
order by pct_khop;
```

### A.4. Thẻ Kanban thiếu hạn (vá ngay)

```sql
select p.full_name, d.name dept, k.title, k.source_type
from kanban_cards k
join profiles p on p.id = k.profile_id
left join departments d on d.id = p.department_id
where k.cycle_id = (select id from evaluation_cycles where name = 'Quý II/2026')
  and k.deadline is null and k.is_active
order by d.name, p.full_name;
```

### A.5. Chất lượng tầng duyệt theo người duyệt

```sql
with cyc as (select id from evaluation_cycles where name = 'Quý II/2026')
select rv.full_name nguoi_duyet,
       count(*) so_phieu,
       count(*) filter (where f.manager_overall_review ? 'strengths') co_tach_diem_manh,
       count(*) filter (where f.manager_overall_review ? 'improvements') co_tach_diem_cai_thien
from form_submissions f
left join profiles rv on rv.id = f.reviewer_id
where f.cycle_id = (select id from cyc) and f.manager_overall_review is not null
group by 1 order by so_phieu desc;
```

---

## Phụ lục B — Bản đồ trường dữ liệu → chỉ số

| Chỉ số | Bảng.Trường | Đã dùng ở đâu trong app |
| --- | --- | --- |
| Δ1 Năng lực | `skill_assessments.self/manager_assessed_level` × `position_core_skills.minimum_level` | `computeCareerFit` (`src/lib/skillInsights.ts:111`), `CareerPathPage`, `SkillRadarChart` |
| Δ2 Thực thi | `form_previous_action_reviews.status`, `kanban_cards.completion_status` | `PreviousActionsReview`, `TeamReviewPanel` — **chưa** tổng hợp thành chỉ số |
| Δ3 Tự nhận thức | `form_previous_action_reviews.self_status` vs `.status`; `skill_assessments` self vs manager | **chưa dùng ở đâu** |
| Δ4 Thái độ | `form_attitude_priorities.self_status/manager_status/improvement_goal` | `EvalSectionC`, `AICompetencyPortrait` |
| Δ5 Chất lượng cam kết | 3 bảng hành động → `scoreAction()` | **chưa có** |
| Chất lượng nhận xét | `form_submissions.*_overall_review`, `one_on_one_answers`, `skill_assessments.manager_note` | `isBareAgreement` (`src/lib/reviewTextQuality.ts`) — mới cảnh báo, chưa thống kê |

---

*Người thực hiện: rà soát code + truy vấn dữ liệu thật ngày 27/07/2026.
Mọi số liệu trong tài liệu có thể tái lập bằng SQL ở Phụ lục A.*
