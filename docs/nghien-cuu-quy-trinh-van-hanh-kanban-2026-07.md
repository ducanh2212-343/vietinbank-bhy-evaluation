# Nghiên cứu: Quy trình vận hành Kanban "Hành động phát triển" & Kế hoạch hành động Quý III/2026

> Tài liệu nghiên cứu + vận hành — chưa phải đặc tả triển khai code. Mục tiêu:
> (1) mô tả chính xác cách tính năng Kanban **"Hành động phát triển"** đang hoạt động;
> (2) chuẩn hóa **quy trình vận hành (SOP)** cho từng vai trò theo nhịp tuần–quý;
> (3) đề xuất **kế hoạch hành động Quý III/2026** để đưa Kanban vào vận hành thực chất;
> (4) chốt **chỉ số đo thành công** và **rủi ro & đối sách**.
>
> Phạm vi khảo sát: `src/lib/kanban.ts`, `src/pages/PersonalKanbanPage.tsx`,
> `src/components/kanban/*`, 2 migration `supabase/migrations/20260601023141_*.sql`
> và `20260601031240_*.sql`, edge function `supabase/functions/send-reminders/index.ts`.

---

## 1. Hiện trạng trong hệ thống

Kanban trong hệ thống mang tên UI **"Hành động phát triển"** (route
`/hanh-dong-phat-trien`, `src/App.tsx:137`; menu ở nhóm "Cá nhân / Năng lực",
`src/components/layout/AppSidebar.tsx:64`). Đây là bảng theo dõi cá nhân, hiển thị
mọi hành động mà cán bộ đã cam kết trong Tự đánh giá và theo dõi chúng đến khi hoàn thành.

### 1.1. Ba cột & vòng đời thẻ

Ba cột (`COLS`, `PersonalKanbanPage.tsx:24-28`):

| Cột (`kanban_status`) | Nhãn UI | Ý nghĩa |
| --- | --- | --- |
| `todo` | **Phải làm** | Hành động đã cam kết, chưa bắt đầu |
| `doing` | **Đang làm** | Đang thực hiện, cần cập nhật tiến độ định kỳ |
| `done` | **Hoàn thành** | Đã được quản lý xác nhận (hoặc đang chờ xác nhận) |

Trạng thái hoàn thành đi kèm một trục thứ hai — `completion_status`
(`src/lib/kanban.ts:5`): `none` → `waiting_manager_confirmation` → `confirmed`,
hoặc `returned` (bị trả về làm tiếp).

```
                         gửi hoàn thành
   ┌────────┐  bắt đầu  ┌─────────┐  (request_completion)   ┌──────────────────────────┐
   │  todo  │ ───────▶ │  doing  │ ──────────────────────▶ │ done · waiting_manager_   │
   │Phải làm│          │Đang làm │ ◀──────────────────────  │        confirmation       │
   └────────┘          └─────────┘   trả về (returned)      └────────────┬─────────────┘
                            ▲                                             │ quản lý xác nhận
                            │ trả về làm tiếp                             ▼
                            └──────────────────────────────  done · confirmed (khóa)
```

Quy tắc nghiệp vụ chốt trong RPC (SECURITY DEFINER, migration
`20260601023141_*.sql`, bọc ở `src/lib/kanban.ts:284-331`):

| Quy tắc | Dẫn chứng | Ý nghĩa vận hành |
| --- | --- | --- |
| **Không kéo thẳng vào `done`** | `PersonalKanbanPage.tsx:88-103` (kéo tới done mở hộp thoại "Gửi hoàn thành") | Hoàn thành phải qua bước gửi minh chứng, không tự đánh dấu xong |
| **Không tự chấm mình** | `confirm_kanban_completion` (người xác nhận ≠ chủ thẻ) | Chống tự công nhận; phải có quản lý duyệt |
| **Không chuyển thẻ đã `confirmed`** | RPC `move_kanban_card` | Kết quả đã duyệt được khóa, tránh sửa ngược |
| Người xác nhận phải có **phạm vi** với chủ thẻ | RLS + `can_view_profile()` | Chỉ quản lý đúng tuyến mới xác nhận được |

### 1.2. Nguồn thẻ — tự sinh, không nhập tay

Thẻ **không được tạo thủ công trên bảng Kanban** mà **tự sinh** từ các hành động cam kết
trong luồng Tự đánh giá, qua trigger DB (`SourceType`, `src/lib/kanban.ts:6`,
nhãn ở `SOURCE_LABEL:45-51`):

| `source_type` | Nhãn | Bảng nguồn (trigger) |
| --- | --- | --- |
| `skill_upskill` | Skill | `form_skill_actions` |
| `attitude_improvement` | Thái độ | `form_attitude_actions` |
| `ai_application` | AI áp dụng | `form_ai_actions_v2` |
| `carry_over` | Chuyển tiếp | `form_previous_action_reviews` |
| `manager_assigned` | Lãnh đạo giao | *(có kiểu, chưa có trigger tự sinh)* |

Hệ quả vận hành quan trọng: muốn có thẻ trong Kanban, cán bộ phải **khai hành động ở
Tự đánh giá** trước. Thẻ thiếu tiêu đề (placeholder) hiển thị badge "cần bổ sung nội
dung" và nút điều hướng ngược về `/tu-danh-gia` để điền (`KanbanCard.tsx`; helper
`isTitleMissing`, `src/lib/kanban.ts:84-88`). Có 2 lớp chống trùng thẻ: dedup phía DB
(migration `20260601031240_*.sql`) và `dedupeCards` phía client (`src/lib/kanban.ts:211-243`).

### 1.3. Badge & nhịp cập nhật tuần

`computeBadges` (`src/lib/kanban.ts:148-169`) tính các cảnh báo trực quan trên thẻ:

- **Quá hạn (`overdue`)**: có `deadline`, chưa `done`, đã qua hạn.
- **Sắp hạn (`dueSoon`)**: còn **≤ 3 ngày** đến hạn.
- **Cần cập nhật (`needsUpdate`)**: thẻ `doing` mà **> 7 ngày** không có tiến độ mới.
- **Chưa cập nhật tuần này (`notUpdatedThisWeek`)**: thẻ `doing` không có log hợp lệ kể từ
  Thứ Hai 00:00 giờ VN (`getVietnamWeekStart:109-115`; `fetchWeeklyUpdateMap:120-141`).
- Cùng các cờ `waitingConfirm` / `confirmed` / `returned` và cờ hoạt động
  `hasBlocker` / `needsSupport` / `hasEvidence` (`fetchActivityFlagsForCards:260-282`).

Thứ tự ưu tiên hiển thị (`sortCards:176-192`): **quá hạn → chưa cập nhật tuần này →
có vướng mắc/cần hỗ trợ → sắp hạn → còn lại**. Đây là kim chỉ nam cho việc "nhìn vào đâu trước".

### 1.4. Vai trò & phạm vi

Phân quyền theo `src/hooks/useAuth.tsx` (trường `scope`):

| Vai trò | `scope` | Thấy được |
| --- | --- | --- |
| Cán bộ | `self` | Thẻ của chính mình (tab "Của tôi") |
| Quản lý (`manager`) | `department` | Thêm tab "Đội ngũ" — phòng mình |
| PGĐ (`pgd`) | `block` | Khối phụ trách |
| Admin (`bgd`/`tcth_admin`/`system_admin`) | `all` | Toàn chi nhánh |

Quản lý/PGĐ/Admin có tab **"Đội ngũ"** với `TeamReviewPanel` (hàng đợi "Chờ xác nhận" +
tổng quan theo cán bộ), deep-link `?view=team` từ dải nhắc trên Tổng quan
(`TeamPendingAlert`). Mọi ranh giới truy cập được siết ở tầng server bằng RLS +
`can_view_profile()`, không chỉ ẩn/hiện ở UI.

### 1.5. Hạ tầng nhắc việc (đã dựng, CHƯA bật)

Edge function `send-reminders` (`supabase/functions/send-reminders/index.ts`) gom digest
theo người nhận, **bao gồm "thẻ Kanban chờ quản lý xác nhận"**, đẩy vào hàng đợi email.
Trạng thái (theo `docs/cai-tien-dot-4-2026-07.md` §4.4): **đã deploy**, `dry_run` mặc định
`true`, idempotent theo ngày, **chưa lên lịch cron** → chưa tự gửi. Đây là mắt xích còn
thiếu để "vòng phản hồi" của Kanban khép kín.

---

## 2. Cơ sở & thông lệ Kanban vận dụng

Tài liệu không nhằm lý thuyết hàn lâm, chỉ chọn lọc các nguyên tắc Kanban áp dụng trực tiếp
cho bối cảnh chi nhánh (~110 cán bộ, đang pilot):

- **Trực quan hóa dòng công việc (visualize the flow):** đã có — 3 cột + badge ưu tiên.
  Điều còn thiếu là *thói quen nhìn bảng*, không phải công cụ.
- **Hệ thống kéo (pull), không đẩy:** thẻ tự sinh từ cam kết của chính cán bộ → mỗi người
  "kéo" việc của mình. Không nên biến Kanban thành nơi lãnh đạo dồn việc hàng loạt.
- **Giới hạn việc dở dang (WIP limit):** hệ thống **chưa cưỡng chế** WIP. Khuyến nghị vận
  hành: mỗi cán bộ giữ **tối đa 3–4 thẻ ở cột "Đang làm"** để tránh dàn trải (áp dụng bằng
  kỷ luật vận hành, xem §3.1; nếu cần cưỡng chế bằng phần mềm → đưa vào lộ trình §4).
- **Nhịp đều (cadence):** Kanban chỉ sống nếu có nhịp. Hệ thống đã "chấm điểm" nhịp tuần
  (badge *chưa cập nhật tuần này*) — SOP §3 biến tín hiệu này thành thói quen.
- **Định nghĩa Hoàn thành (Definition of Done):** ở đây DoD = **có kết quả + minh chứng +
  được quản lý xác nhận**. Chính là luồng `request_completion → confirm`. Không có minh
  chứng thì không gửi hoàn thành.

---

## 3. Quy trình vận hành đề xuất (SOP)

### 3.1. Cán bộ

**Nhịp tuần (bắt buộc):** mỗi tuần cập nhật ít nhất một lần cho từng thẻ đang ở "Đang làm".
- Đầu tuần: mở "Hành động phát triển", xử lý trước các thẻ **quá hạn** và **chưa cập nhật
  tuần này** (chúng luôn nổi lên đầu nhờ `sortCards`).
- Khi bắt đầu một cam kết: kéo thẻ từ "Phải làm" → "Đang làm" (hoặc nút "Bắt đầu" trên mobile).
- Cập nhật tiến độ qua hộp thoại **"Cập nhật"** (`UpdateProgressDialog`): chọn % (0/25/50/75/100),
  ghi ghi chú tối thiểu 10 ký tự, dùng thẻ quick-status ("Bình thường / Có vướng mắc / Cần
  hỗ trợ / Có bằng chứng / Sẵn sàng hoàn thành", `QUICK_STATUS_OPTIONS:53-59`), đính minh
  chứng khi có. Nêu **vướng mắc / cần hỗ trợ** ngay để thẻ được ưu tiên và (khi bật nhắc việc) lọt digest.
- **Giới hạn WIP tự áp:** không mở quá **3–4 thẻ "Đang làm"** cùng lúc; hoàn thành bớt rồi mới kéo thẻ mới.
- Khi xong: kéo thẻ tới "Hoàn thành" → hệ thống mở **"Gửi hoàn thành"** (`CompleteRequestDialog`),
  yêu cầu **kết quả + minh chứng** → thẻ chuyển `waiting_manager_confirmation`. **Không** có
  cách tự đánh dấu xong.
- Nếu thẻ bị **trả về** (`returned`): đọc lý do trong "Xem chi tiết", làm tiếp và gửi lại.
- Thẻ báo **cần bổ sung nội dung**: bấm để quay về Tự đánh giá điền hành động cho đầy đủ.

### 3.2. Quản lý trực tiếp / PGĐ

**Nhịp tuần:** mở tab **"Đội ngũ"** (`?view=team`), ưu tiên hàng đợi **"Chờ xác nhận"**.
- **Xác nhận hoàn thành** khi: có kết quả rõ + minh chứng hợp lệ, tương xứng cam kết.
  (`confirm_kanban_completion` — bạn không thể xác nhận thẻ của chính mình.)
- **Trả về làm tiếp** (`ReturnCardDialog`, bắt buộc nêu lý do) khi minh chứng thiếu/không đạt.
  Lý do được ghi vào timeline để cán bộ biết chỉnh gì.
- Rà "sức khỏe đội": để ý cán bộ có nhiều thẻ **quá hạn / chưa cập nhật tuần này / có vướng
  mắc** — đây là nhóm cần kèm cặp hoặc gỡ vướng, không phải để "phạt".
- Tránh biến Kanban thành kênh giao việc dồn dập; nếu cần giao việc, dùng đúng nguồn
  `manager_assigned` (khi được bổ sung — xem §4).

### 3.3. Admin (BGĐ / Phòng TCTH)

- Giám sát toàn chi nhánh (`scope=all`); dùng số liệu tổng hợp cho các chỉ số §5.
- **Đầu quý:** đảm bảo kỳ (`cycle`) mới được mở và cán bộ đã khai hành động ở Tự đánh giá
  (nguồn sinh thẻ). Kanban gắn `cycle_id` để tách dữ liệu theo quý.
- **Bật/giám sát nhắc việc:** vận hành cron `send-reminders` theo quy trình an toàn ở §4.
- **Cuối quý:** chốt số hoàn thành, xử lý thẻ tồn để chuyển tiếp (`carry_over`).

### 3.4. Nhịp quý (tổng thể)

1. **Mở kỳ** (đầu quý): kỳ mới + cán bộ khai cam kết ở Tự đánh giá → thẻ tự sinh.
2. **Vận hành tuần** (suốt quý): cán bộ cập nhật → quản lý xác nhận/trả về → nhắc việc chạy nền.
3. **Tổng kết & chuyển tiếp** (cuối quý): rà thẻ chưa xong, thống nhất `carry_over` sang quý
   sau; số liệu hoàn thành làm đầu vào cho Bản tin quý (`/ban-tin-quy`).

---

## 4. Kế hoạch hành động Quý III/2026

Ưu tiên theo 3 mức (P0 = làm trước, chặn vận hành thực chất):

| Mức | Hạng mục | Vì sao | Việc cần làm | Phụ thuộc |
| --- | --- | --- | --- | --- |
| **P0** | Bật lịch nhắc việc `send-reminders` | Vòng phản hồi Kanban chưa khép kín; quản lý dễ bỏ sót "chờ xác nhận" | Chạy dry-run → gửi thật 1 lần kiểm định → lên cron hằng ngày (quy trình ở `cai-tien-dot-4-2026-07.md` §4.4) | Đã xác nhận SPF/DKIM/DMARC PASS |
| **P0** | Ban hành SOP §3 tới cán bộ & quản lý | Công cụ đủ nhưng thiếu thói quen dùng | Phổ biến SOP; đặt kỳ vọng "cập nhật tuần" thành chuẩn | Tài liệu này |
| **P1** | Nguồn `manager_assigned` (giao việc) | Kiểu đã có, chưa có đường tạo thẻ | Bổ sung đường tạo thẻ lãnh đạo giao (trigger/RPC + UI) | Thiết kế quyền & phạm vi |
| **P1** | Bảng chỉ số vận hành Kanban | Chưa đo được §5 một cách hệ thống | Dựng view/RPC tổng hợp: % cập nhật tuần, thời gian chờ xác nhận, tỉ lệ quá hạn/hoàn thành/carry-over | Dữ liệu `kanban_card_logs` |
| **P2** | Cưỡng chế/nhắc mềm WIP limit | Hiện chỉ là kỷ luật vận hành | Cảnh báo khi >4 thẻ "Đang làm" (không chặn cứng) | Sau khi có thói quen §3.1 |
| **P2** | Nút "Gửi nhắc việc ngay" cho admin | Chủ động hơn cron | Thêm nút gọi `send-reminders` ở trang Cài đặt | Sau P0 nhắc việc |

**Lộ trình theo tuần trong quý:**

- **Tuần 1–2:** ban hành SOP (P0); bật nhắc việc theo 3 bước an toàn (P0). *(≈1–2 ngày công)*
- **Tuần 3–6:** dựng bảng chỉ số vận hành (P1); thiết kế + làm nguồn `manager_assigned` (P1).
  *(≈4–6 ngày công)*
- **Tuần 7–12:** nhắc mềm WIP + nút gửi nhắc thủ công (P2); rà soát theo số liệu và tinh chỉnh
  ngưỡng badge nếu cần; chuẩn bị tổng kết & carry-over cuối quý. *(≈3–4 ngày công)*

---

## 5. Chỉ số đo thành công

| Chỉ số | Cách đo | Mục tiêu quý |
| --- | --- | --- |
| **Tỉ lệ cập nhật tuần** | % thẻ `doing` có log hợp lệ trong tuần (`fetchWeeklyUpdateMap`) | ≥ 80% |
| **Thời gian chờ xác nhận** | Khoảng từ `waiting_manager_confirmation` → `confirmed` (từ `kanban_card_logs`) | Trung vị ≤ 3 ngày làm việc |
| **Tỉ lệ quá hạn** | % thẻ chưa `done` mà `deadline` đã qua | Giảm dần theo tháng |
| **Tỉ lệ hoàn thành cuối quý** | Thẻ `confirmed` / tổng thẻ hoạt động trong kỳ | Đặt mốc theo baseline quý đầu |
| **Tỉ lệ carry-over** | Thẻ chuyển tiếp / tổng thẻ | Theo dõi để không phình dần |

Baseline quý III làm mốc so sánh cho các quý sau (hiện đang pilot nên số liệu còn mỏng).

---

## 6. Rủi ro & đối sách

| Rủi ro | Đối sách |
| --- | --- |
| Thẻ placeholder "chưa đặt tên" gây nhiễu bảng | Đã có dedup 2 lớp + badge "cần bổ sung"; SOP §3.1 yêu cầu điền ở Tự đánh giá; nhắc trong bảng chỉ số |
| Quản lý không xác nhận kịp → thẻ kẹt "chờ xác nhận" | Bật nhắc việc (P0); đo "thời gian chờ xác nhận" (§5); nêu trong giao ban |
| Email nhắc gây phiền/spam | `send-reminders` gom **digest theo người/ngày**, idempotent theo ngày; bật dần, dry-run trước |
| Thẻ mồ côi khi cán bộ đổi phòng/nghỉ việc | Đã có cảnh báo bàn giao khi sửa hồ sơ (`cai-tien-dot-4-2026-07.md` §4.3); rà lại tuyến quản lý đầu quý |
| Lạm dụng Kanban để dồn việc (mất tính "pull") | Giữ nguyên tắc thẻ sinh từ cam kết cá nhân; kênh giao việc tách riêng qua `manager_assigned` có phạm vi (P1) |
| Vận hành "chết" vì thiếu nhịp | SOP §3 + badge tuần + nhắc việc biến nhịp thành thói quen; theo dõi "tỉ lệ cập nhật tuần" |

---

*Tài liệu liên quan:* [`cai-tien-dot-4-2026-07.md`](./cai-tien-dot-4-2026-07.md) (hạ tầng nhắc
việc & bàn giao), [`bao-cao-ra-soat-toan-dien-2026-07.md`](./bao-cao-ra-soat-toan-dien-2026-07.md)
(rà soát tổng thể & lộ trình), [`nghien-cuu-gamification-muc-anh-skill.md`](./nghien-cuu-gamification-muc-anh-skill.md)
(nghiên cứu gamification).
