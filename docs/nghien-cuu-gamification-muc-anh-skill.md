# Nghiên cứu: Gamification cho mục ảnh Skill & Bộ câu hỏi xác định Level

> Tài liệu nghiên cứu — chưa phải đặc tả triển khai. Mục tiêu: (1) định hướng lại "mục ảnh skill"
> theo đúng tinh thần gamification để tăng động lực upskill; (2) thiết kế phương thức trả lời
> danh mục câu hỏi dựa trên mô tả skill để xác định level khách quan, tránh áp level chủ quan.

---

## 1. Hiện trạng trong hệ thống

Những gì đã có (đây là nền rất tốt, không cần đập đi xây lại):

| Thành phần | Vị trí | Ghi chú |
|---|---|---|
| Danh mục 38 skill, mô tả từng level | Bảng `skill_catalog`: `description`, `level1_description` → `level4_description` | Nguyên liệu chính để sinh bộ câu hỏi |
| Hướng dẫn thăng cấp | `skill_catalog.upskill_l0_l1` → `upskill_l3_l4` | Đã hiển thị trong Section B ("Cách thăng cấp Lx → Ly") |
| Thang level 0–4 có tên gọi | `SkillLevelBadge.tsx`: L0 Chưa hình thành, L1 Tân binh, L2 Độc lập, L3 Chuyên gia, L4 Bậc thầy | Tên gọi đã mang tinh thần game (rank) |
| Ảnh theo skill × level | Bảng `skill_level_images`, trang admin `SkillMediaPage.tsx` (`/quan-tri-hinh-anh-skill`) | Admin upload thủ công, tối đa 38 × 4 = 152 ảnh |
| Hiển thị ảnh | `SkillLevelBadge` (icon 20–32px, click mở dialog) trong Section B, Skill lõi theo vị trí, hồ sơ | Ảnh hiện chỉ là minh hoạ phụ |
| Chấm level | Dropdown `Select` L0–L4 (tự đánh giá + quản lý) trong `EvalSectionB.tsx` | **Chủ quan — đây là chỗ cần thay** |
| Yêu cầu theo vị trí | `position_core_skills.minimum_level / advanced_level`, hiển thị Gap | Đã có khái niệm "mục tiêu" rõ ràng |
| Vòng lặp quý | Chu kỳ đánh giá, badge "✨ Vừa upskill" (`levelUpSkillIds`), radar chart, trend chart | Đã có "khoảnh khắc thăng cấp" sơ khai |
| Gợi ý học tập | `vtb_course_skills` (khoá học ↔ skill ↔ target_level_min), IDP, 70-20-10 | Đường dẫn hành động sau khi biết gap |
| AI advisor | Edge function `ai-advisor`, mode `coach_skill` nhận đủ mô tả level + minh chứng | Có thể tái dụng để sinh/kiểm tra tiêu chí |

**Chẩn đoán theo lăng kính gamification:** hệ thống đã có đủ *cấu trúc tiến trình* (level, gap,
mục tiêu, chu kỳ) nhưng thiếu 3 thứ khiến nó chưa "game":

1. **Ảnh level chưa phải phần thưởng.** Ảnh do admin upload, hiển thị 20px, ai ở level nào xem
   ảnh nấy — không có cảm giác *sở hữu*, *sưu tập*, hay *mở khoá*. Người dùng không có nơi nào
   để "ngắm bộ sưu tập" của mình.
2. **Level chưa được "kiếm" (earned).** Level đến từ một dropdown chủ quan. Nghiên cứu về huy
   hiệu (badge) trong học tập chỉ ra: badge chỉ tạo động lực khi nó **chứng nhận năng lực thật
   qua tiêu chí minh bạch** (mô hình Open Badges, Duolingo, Khan Academy). Badge phát dễ dãi =
   trang sức, mất giá ngay lập tức.
3. **Không có nghi thức thăng cấp.** Khi được duyệt tăng level, không có khoảnh khắc "reveal" —
   phần thưởng cảm xúc lớn nhất của mọi hệ thống game bị bỏ phí.

Hai đề bài của tài liệu này (mục ảnh + bộ câu hỏi) thực chất là **một cặp không tách rời**:
bộ câu hỏi làm cho level trở nên *đáng tin*, và chỉ khi đáng tin thì ảnh level mới trở thành
*phần thưởng có giá trị*.

---

## 2. Cơ sở lý thuyết (tóm tắt có chọn lọc)

Chỉ giữ những nguyên lý áp được vào bài toán này:

### 2.1. Thuyết Tự quyết (Self-Determination Theory — Deci & Ryan)
Động lực bền vững đến từ 3 nhu cầu: **Năng lực** (thấy mình giỏi lên), **Tự chủ** (tự chọn
con đường), **Kết nối** (được ghi nhận). Ứng dụng:
- *Năng lực*: thanh tiến trình tới level kế tiếp, tiêu chí rõ ràng "còn thiếu gì".
- *Tự chủ*: nhân viên tự chọn skill ưu tiên (đã có SkillPriorityPicker), tự làm bộ câu hỏi trước.
- *Kết nối*: vinh danh khi thăng cấp, quản lý xác nhận thay vì phán xét.
- **Cảnh báo (overjustification effect):** thưởng vật chất/điểm số gắn vào việc vốn có ý nghĩa
  nội tại sẽ bào mòn động lực. → Không quy đổi level ra tiền/điểm thi đua trực tiếp trong UI này.

### 2.2. Khung Octalysis (Yu-kai Chou) — 4 drive phù hợp nhất
- **Accomplishment** (thành tựu): level, gap, progress bar, huy hiệu đạt chuẩn vị trí.
- **Ownership & Collection** (sở hữu & sưu tập): bộ sưu tập ảnh skill là "album" cá nhân;
  bộ sưu tập dở dang tự nó thúc người ta hoàn thiện (hiệu ứng Zeigarnik).
- **Scarcity & Curiosity**: ảnh level chưa đạt hiển thị dạng **bóng mờ/khoá xám** — biết là có,
  chưa biết đẹp thế nào → tò mò, muốn mở khoá.
- **Social Influence**: ghi nhận công khai *chiều tăng* (ai vừa thăng cấp), tuyệt đối không
  xếp hạng công khai *chiều thấp* (văn hoá ngân hàng, tránh bêu tên).

### 2.3. Các hiệu ứng hành vi đáng dùng
- **Goal-gradient / Endowed progress**: càng gần đích càng cố; cho người dùng thấy "đã đạt
  3/5 tiêu chí của L3" mạnh hơn nhiều so với chỉ thấy "đang L2".
- **Peak-end rule**: khoảnh khắc thăng cấp (animation reveal ảnh mới) là "peak" — đầu tư vào
  đúng 1 khoảnh khắc này rẻ mà hiệu quả nhất.
- **Fresh-start effect**: chu kỳ quý sẵn có là điểm khởi đầu tâm lý tự nhiên — mỗi đầu quý
  hiển thị "mùa mới" (Q3/2026) với mục tiêu thăng cấp đề xuất.

### 2.4. Anti-pattern phải tránh
| Anti-pattern | Vì sao nguy hiểm ở đây |
|---|---|
| Badge inflation (phát dễ) | Level 4 "Bậc thầy" mà ai cũng có → toàn hệ thống mất giá |
| Leaderboard cá nhân công khai | Biến đánh giá thành thi đấu, tạo động lực khai gian, tổn thương người level thấp |
| Streak/phạt bỏ lỡ | Đánh giá theo quý, không phải app học hằng ngày — streak không hợp ngữ cảnh |
| Gamification "cosmetic" trên dữ liệu chủ quan | Trang trí đẹp cho một con số dropdown = vô nghĩa; phải sửa gốc (cách xác định level) trước |

---

## 3. Thiết kế đề xuất cho mục ảnh Skill

### 3.1. Chuẩn hoá ngôn ngữ hình ảnh: "tiến hoá", không phải "4 ảnh rời"

Nguyên tắc quan trọng nhất: 4 ảnh của một skill phải đọc được là **một thực thể đang tiến hoá**
(kiểu Pokémon/huy hiệu quân hàm), không phải 4 minh hoạ không liên quan. Người xem phải đoán
được ảnh L3 "xịn hơn" ảnh L2 mà không cần đọc chữ.

Hệ khung (frame) thống nhất theo level, áp cho mọi skill:

| Level | Tên | Ẩn dụ Cây ký ức | Khung đề xuất | Cảm giác |
|---|---|---|---|---|
| L1 | Tân binh | Ươm mầm | Viền đồng, nền nhạt | Khởi đầu |
| L2 | Độc lập | Bám rễ | Viền bạc, nền đậm hơn | Vững vàng |
| L3 | Chuyên gia | Vươn cành | Viền vàng + tia sáng nhẹ | Uy tín |
| L4 | Bậc thầy | Lan tỏa | Viền kim cương/gradient thương hiệu VietinBank + glow | Hiếm, đáng khao khát |
| Chưa đạt | — | — | **Bóng đen (silhouette) trên nền khoá + ổ khoá nhỏ** | Tò mò, muốn mở |

**Thứ tự ưu tiên hiển thị (đã chốt):**
1. **Ảnh riêng skill × level** (`skill_level_images`) — mỗi skill ưu tiên art riêng của nó;
2. **Icon riêng của skill + khung level** (`skill_catalog.icon_url` compose với khung CSS/SVG);
3. **Bộ hình chung 4 nấc theo motif Cây ký ức**: Ươm mầm → Bám rễ → Vươn cành → Lan tỏa —
   khớp thông điệp thương hiệu "Vun gốc bền rễ – Vươn tầm tương lai", vẽ cùng ngôn ngữ SVG
   với `MemoryTree` (nét tròn, lá ellipse, bảng màu #0057B8 #1E88E5 #60A5FA #E60012).

**Khuyến nghị kỹ thuật giảm 90% công upload:** với chuỗi ưu tiên trên, admin không phải upload
152 ảnh: chỉ cần 38 icon là mọi skill có hình có bậc; chưa upload gì thì bộ hình chung 4 nấc
đảm bảo không skill nào trống. Ảnh trong `skill_level_images` là *override tuỳ chọn* cho skill
muốn art riêng. Nếu muốn art riêng từng skill × level, sinh bằng AI theo một prompt-template
thống nhất (cùng phong cách, cùng bố cục, chỉ đổi chủ thể + bậc khung) rồi upload qua trang
admin sẵn có.

### 3.2. Trang "Bộ sưu tập Skill" dành cho nhân viên (mới)

Trang `SkillMediaPage` hiện tại giữ nguyên vai trò admin. Bổ sung một trang **staff-facing**,
ví dụ route `/bo-suu-tap-skill`, là "mặt tiền" gamification:

```
┌──────────────────────────────────────────────────────────┐
│  Bộ sưu tập Skill của tôi          Mùa Q3/2026           │
│  ████████████░░░░░░  14/38 skill đã định hình  ·  2 gần  │
│                                    thăng cấp ↑           │
├──────────────────────────────────────────────────────────┤
│  [Nhóm: Tất cả | Nghiệp vụ | Kỹ năng mềm | Số hoá ...]   │
│                                                          │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐          │
│  │ 🥈 ảnh │  │ 🥉 ảnh │  │ 🔒 bóng│  │ 🥇 ảnh │          │
│  │  L2    │  │  L1    │  │  mờ    │  │  L3 ★  │          │
│  │ Tín    │  │ Đàm    │  │ Phân   │  │ Tư vấn │          │
│  │ dụng   │  │ phán   │  │ tích TC│  │ BH     │          │
│  │ ▓▓▓░ 3/5│ │ ▓░░░ 1/4│ │        │  │ ĐẠT NC │          │
│  │ tiêu chí│ │ tiêu chí│ │        │  │        │          │
│  └────────┘  └────────┘  └────────┘  └────────┘          │
└──────────────────────────────────────────────────────────┘
```

Từng thẻ skill gồm:
- **Ảnh level hiện tại** (to, đây là "nhân vật" của thẻ — không còn là icon 20px).
- **Ảnh level kế tiếp dạng silhouette** khi hover/bấm — mồi tò mò (scarcity).
- **Thanh tiến trình tiêu chí** tới level kế tiếp (khi đã có bộ câu hỏi — mục 4): "3/5 tiêu chí
  L3" (goal-gradient). Chưa có dữ liệu tiêu chí thì hiển thị gap so với chuẩn vị trí.
- **Cờ chuẩn vị trí**: đạt tối thiểu ✓ / đạt nâng cao ★ (tận dụng `position_core_skills`).
- Bấm vào thẻ → panel chi tiết: 4 mô tả level (tái dụng `SkillLevelReference` trong
  `EvalSectionB.tsx`), "Cách thăng cấp Lx→Ly" (`upskill_*`), khoá học VTB gợi ý
  (`vtb_course_skills`), lịch sử đạt level ("Đạt L2 — Q1/2026").

Chỉ số "hoàn thành bộ sưu tập" tính theo nhóm skill (VD: "Kỹ năng số: 4/6 skill ≥ L2") — tạo
nhiều đích nhỏ thay vì một đích to 38 skill.

### 3.3. Khoảnh khắc thăng cấp (peak moment)

Khi form được **phê duyệt** với level cao hơn quý trước (điều kiện: duyệt xong, không phải lúc
tự khai — tránh ăn mừng nhầm):

1. Lần đăng nhập kế tiếp: modal "reveal" — silhouette vỡ ra thành ảnh level mới, tên rank mới
   ("Bạn đã trở thành **Chuyên gia Đàm phán**"). Một lần duy nhất, có nút chia sẻ vào mục
   vinh danh (opt-in).
2. Ghi vào bảng mới `skill_level_achievements` (`profile_id, skill_id, level_no, achieved_at,
   cycle_id, form_id`) — nguồn dữ liệu cho lịch sử trên thẻ, "ngày đạt", và feed vinh danh.
   Hiện hệ thống chỉ có badge "✨ Vừa upskill" trong form quý sau (`levelUpCarryover` ở
   `BMFormPage.tsx`) — cơ chế này đúng nhưng là *thông tin*, chưa phải *nghi thức*.
3. Feed "Vinh danh" ở TeamOverview: chỉ hiện **sự kiện tăng level** ("Tuần này chi nhánh có 5
   lượt thăng cấp"), có thể ẩn danh mặc định, cá nhân bật chia sẻ tên nếu muốn. Không bao giờ
   hiển thị ai đang level thấp.

### 3.4. Những thứ cố tình KHÔNG làm
- Không leaderboard cá nhân theo level. Chỉ số liệu tổng hợp cấp phòng/chi nhánh.
- Không điểm (XP) quy đổi thưởng — level gắn thẳng vào lộ trình nghề nghiệp là đủ ý nghĩa.
- Không streak, không đếm ngược gây áp lực. Nhịp tự nhiên là chu kỳ quý.

---

## 4. Bộ câu hỏi xác định level — chống áp level chủ quan

### 4.1. Cơ sở phương pháp

Ý tưởng "trả lời danh mục câu hỏi dựa vào miêu tả skill để suy ra level" chính là hai kỹ thuật
chuẩn trong đánh giá năng lực:

- **BARS (Behaviorally Anchored Rating Scales):** thay vì hỏi "bạn ở level mấy?" (mời gọi chủ
  quan), hỏi một loạt **hành vi quan sát được** rút từ mô tả level, mỗi hành vi trả lời được
  bằng bằng chứng. Người trả lời không biết/không cần biết câu nào thuộc level nào.
- **Thang Guttman (tích luỹ):** level có tính bậc thang — muốn được L3 phải thoả tiêu chí L1,
  L2 trước. Điều này khớp với ngữ nghĩa "Tân binh → Độc lập → Chuyên gia → Bậc thầy" và chặn
  kiểu tự nhận L4 trong khi hổng nền tảng.

### 4.2. Cấu trúc bộ tiêu chí

Với mỗi skill × level, biên soạn **3–5 tiêu chí hành vi**, mỗi tiêu chí:

```
- Phát biểu:   "Tôi đã tự xử lý trọn vẹn hồ sơ TDQT không cần hỗ trợ trong quý này"
               (bắt đầu bằng hành vi + phạm vi + tần suất; tránh từ cảm tính "tốt", "thành thạo")
- Trả lời:     Có / Một phần / Chưa   (1 / 0.5 / 0 điểm)
- is_gate:     tiêu chí "cửa" — bắt buộc = Có thì level mới tính (mỗi level 1–2 gate)
- requires_evidence: gate phải kèm minh chứng text (số hồ sơ, tên dự án, link…)
```

**Sinh tiêu chí bằng AI, người duyệt:** 38 skill × 4 level × ~4 tiêu chí ≈ 600 câu — không nên
viết tay từ đầu. Thêm mode `generate_criteria` vào edge function `ai-advisor` sẵn có: đầu vào
là `description` + `level{n}_description` + `upskill_*`, đầu ra là draft tiêu chí theo đúng cấu
trúc trên; admin duyệt/sửa trên một trang quản trị (pattern y hệt `OneOnOneQuestionsAdminPage`
đã có). AI chỉ *đề xuất*, bản phát hành luôn qua tay người.

### 4.3. Luồng hỏi thích ứng (adaptive) — không tra tấn người dùng

Không hỏi cả 16–20 câu. Wizard "Xác định level" trong Section B chạy như sau:

```
Bắt đầu tại L = level quý trước (hoặc L1 nếu chưa có)
Lặp:
  Hỏi các tiêu chí của level L (3–5 câu)
  Đạt (điểm ≥ 80% VÀ mọi gate = Có)  → nếu L < 4: L = L + 1, hỏi tiếp
                                      → nếu L = 4: dừng, kết quả L4
  Không đạt                          → nếu là level đầu tiên được hỏi: lùi xuống L − 1 để xác nhận sàn
                                      → ngược lại: dừng, kết quả = level cao nhất đã đạt
```

Thực tế mỗi người chỉ trả lời 1–2 level (5–10 câu) mỗi skill. Với 7–8 skill lõi, thêm ~10 phút
cho cả form — chấp nhận được với tần suất quý, và đổi lại là con số level có căn cứ.

Quy tắc chốt level (minh bạch, in ngay trên UI):

> **Level đạt = level cao nhất L sao cho mọi level ≤ L đều có điểm ≥ 80% và đủ tiêu chí gate.**

### 4.4. Vai trò các bên & chống "lạm phát level"

- **Nhân viên**: làm wizard → hệ thống *đề xuất* level + bảng breakdown (câu nào đạt/thiếu).
  Kết quả ghi vào `self_assessed_level` như hiện nay — không phá schema, form cũ vẫn chạy.
- **Quản lý**: thấy cùng breakdown + minh chứng, chỉ cần *xác nhận* hoặc *điều chỉnh*.
  **Điều chỉnh bắt buộc nhập lý do** (lưu vào `manager_note` hoặc cột riêng) — friction nhỏ
  này là công cụ chống chủ quan ở cả hai chiều, và tạo dữ liệu audit.
- **AI đối chiếu (giai đoạn sau)**: mode `verify_level` — so minh chứng text với tiêu chí gate,
  cảnh báo mềm "minh chứng chưa thể hiện tiêu chí X" cho quản lý tham khảo. AI không quyết.
- **Calibration**: báo cáo phân phối level theo phòng/quản lý (chỉ admin/BGĐ xem) để phát hiện
  nơi chấm quá chặt/quá lỏng; độ lệch self-vs-manager trước và sau khi có wizard là KPI thành
  công của chính tính năng này.

### 4.5. Mô hình dữ liệu đề xuất

```sql
-- Tiêu chí theo skill × level (admin quản trị, AI sinh draft)
CREATE TABLE skill_level_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skill_catalog(id),
  level_no INT NOT NULL CHECK (level_no BETWEEN 1 AND 4),
  statement TEXT NOT NULL,
  is_gate BOOLEAN NOT NULL DEFAULT false,
  requires_evidence BOOLEAN NOT NULL DEFAULT false,
  weight NUMERIC NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Câu trả lời trong một kỳ đánh giá (gắn vào form như skill_assessments)
CREATE TABLE skill_criteria_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL,               -- cùng ngữ nghĩa với skill_assessments.form_id
  criterion_id UUID NOT NULL REFERENCES skill_level_criteria(id),
  answer NUMERIC NOT NULL CHECK (answer IN (0, 0.5, 1)),
  evidence TEXT,
  answered_by UUID NOT NULL,           -- nhân viên hay quản lý trả lời
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lịch sử đạt level (nguồn cho gallery, reveal, vinh danh)
CREATE TABLE skill_level_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  skill_id UUID NOT NULL REFERENCES skill_catalog(id),
  level_no INT NOT NULL CHECK (level_no BETWEEN 1 AND 4),
  cycle_id UUID,
  form_id UUID,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  celebrated_at TIMESTAMPTZ             -- null = chưa xem modal reveal
);
```

Điểm mấu chốt tích hợp: wizard chỉ là **cách nhập liệu mới** cho `self_assessed_level` /
`manager_assessed_level` hiện có — toàn bộ pipeline phía sau (gap, radar, IDP, xuất BM01,
carryover "vừa upskill") không phải sửa.

### 4.6. Vì sao bộ câu hỏi là điều kiện tiên quyết của gamification

Chuỗi giá trị: **tiêu chí minh bạch → level đáng tin → ảnh level là chứng nhận thật → mở khoá
ảnh mới đáng ăn mừng → có lý do quay lại xem bộ sưu tập → nhìn thấy tiêu chí còn thiếu → hành
động học (khoá VTB, IDP) → thăng cấp thật.** Bỏ mắt xích đầu thì các mắt xích sau chỉ là
trang trí. Vì vậy lộ trình dưới đây đặt bộ tiêu chí ở giai đoạn sớm.

---

## 5. Lộ trình triển khai đề xuất

| Giai đoạn | Nội dung | Phụ thuộc | Độ khó |
|---|---|---|---|
| **1. Nền hình ảnh** | Hệ khung level compose (icon + frame CSS/SVG); silhouette cho level chưa đạt; nâng `SkillLevelBadge` dùng khung mới | `icon_url` sẵn có | Thấp |
| **2. Bộ sưu tập** | Trang `/bo-suu-tap-skill` (read-only từ dữ liệu đánh giá gần nhất); % hoàn thành theo nhóm; bảng `skill_level_achievements` + backfill từ form đã duyệt | GĐ 1 | Vừa |
| **3. Bộ tiêu chí** | Mode `generate_criteria` trong ai-advisor; trang admin duyệt tiêu chí; bảng `skill_level_criteria` | Nội dung mô tả level đầy đủ | Vừa |
| **4. Wizard xác định level** | Wizard adaptive trong Section B; ghi `skill_criteria_responses`; quản lý xem breakdown, override có lý do | GĐ 3 | Vừa–cao |
| **5. Nghi thức & vinh danh** | Modal reveal khi có achievement mới chưa `celebrated_at`; feed vinh danh tổng hợp; thẻ "gần thăng cấp" | GĐ 2 + 4 | Thấp |
| **6. Đo & tinh chỉnh** | Dashboard admin: độ lệch self-vs-manager, tỉ lệ upskill/quý, tỉ lệ dùng wizard, phân phối level theo phòng | GĐ 4 | Thấp |

Có thể chạy song song nhánh hình ảnh (1→2) và nhánh tiêu chí (3→4); hợp nhất ở giai đoạn 5.

## 6. Chỉ số đo thành công

- **Độ lệch |self − manager|** trung bình giảm sau khi có wizard (mục tiêu: −50% sau 2 quý) —
  đây là thước đo trực tiếp của "bớt chủ quan".
- Tỉ lệ form dùng wizard thay vì chọn tay dropdown.
- Số lượt thăng cấp có minh chứng/quý (upskill thật, không phải inflation — đối chiếu phân phối).
- Lượt truy cập trang Bộ sưu tập ngoài kỳ đánh giá (chỉ báo động lực nội tại).
- Tỉ lệ skill có đủ bộ tiêu chí được admin phê duyệt (độ phủ nội dung).

## 7. Rủi ro & đối sách

| Rủi ro | Đối sách |
|---|---|
| Bộ câu hỏi làm form quý nặng thêm | Adaptive (chỉ hỏi 1–2 level), cho phép làm trước ngoài kỳ ("kiểm tra level thử" trong Bộ sưu tập — kết quả nháp tự điền vào form khi vào kỳ) |
| Tiêu chí viết mơ hồ → lại chủ quan | Chuẩn biên soạn: hành vi + phạm vi + tần suất; AI sinh draft nhưng admin duyệt; pilot 5 skill trước khi phủ 38 |
| Lạm phát level chiều quản lý dễ dãi | Gate + minh chứng bắt buộc; báo cáo calibration; override phải có lý do |
| Ăn mừng nhầm (level chưa duyệt) | Achievement chỉ ghi khi form **được phê duyệt**; reveal đọc từ `celebrated_at` |
| So bì giữa nhân viên | Không leaderboard cá nhân; vinh danh chỉ sự kiện tăng, opt-in nêu tên |
| 152 ảnh không đồng bộ phong cách | Mặc định compose icon + khung; ảnh riêng chỉ là override có kiểm soát |
