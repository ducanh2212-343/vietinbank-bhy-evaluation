# Nghiên cứu — BHY Quizzi: học tập bằng quiz tuần, huy hiệu phụ, chuỗi streak

*Tháng 07/2026 — số hóa chương trình "Bắc Hưng Yên Quizzi" đang chạy thủ công hàng tuần.*

## 1. Bài toán

Chi nhánh đang triển khai **Bắc Hưng Yên Quizzi**: mỗi phòng mỗi tuần tổ chức tối thiểu
1 bài quiz cho cả phòng cùng làm. Nội dung nhóm theo **công văn cụ thể**, **chủ điểm
cụ thể**, hoặc gắn với một **skill** trong danh mục 38 skill của hệ thống. Quiz do
lãnh đạo phòng **hoặc bất kỳ cán bộ nào** khởi tạo.

Mục tiêu số hóa: giữ được nhịp tuần đều đặn và biến việc học công văn/nghiệp vụ thành
trải nghiệm hấp dẫn kiểu Duolingo — feedback tức thì, huy hiệu, chuỗi tuần — mà không
phá vỡ các nguyên tắc gamification đã chốt của hệ thống.

## 2. Quan hệ với nguyên tắc gamification hiện có

`docs/nghien-cuu-gamification-muc-anh-skill.md` cấm **streak** và **leaderboard cá nhân
công khai** — trong ngữ cảnh **đánh giá năng lực theo quý**. Quizzi là nhịp **tuần**,
bản chất là *học tập* chứ không phải *đánh giá*, nên:

| Nguyên tắc gốc | Cách Quizzi tôn trọng |
|---|---|
| Không streak trong đánh giá quý | Streak Quizzi là streak **tuần học tập** — đúng cadence của thói quen; có "đóng băng chuỗi" (streak freeze) tự động, **không phạt, không đếm ngược** |
| Không leaderboard cá nhân công khai | Xếp hạng cá nhân chỉ hiển thị **trong nội bộ phòng** (như trò chơi tập thể của phòng). Toàn chi nhánh chỉ thấy **tổng hợp cấp phòng**: số quiz, tỷ lệ tham gia, điểm TB, chuỗi phòng |
| Không quy đổi điểm/badge ra thưởng | Điểm Quizzi và huy hiệu **không quy đổi** ra tiền/điểm thi đua — ghi rõ trong migration và doc |
| Badge phải chứng nhận thật | Huy hiệu Quizzi do server tự cấp theo hành vi đo được (đúng ≥90%, tốc độ, chuỗi, số quiz soạn) — không tự phong |

## 3. Thiết kế nghiệp vụ

### 3.1. Vòng đời một quiz
1. **Tạo & phát hành ngay** — bất kỳ thành viên phòng nào (RLS: `department_id = get_my_department_id()`).
   Không có bước duyệt: ma sát thấp để đạt chỉ tiêu ≥1 quiz/phòng/tuần. Tác giả và
   trưởng phòng sửa/gỡ được.
2. **Tuần** — ISO week, thứ Hai bắt đầu, giờ VN (`quiz_week_start()`). `week_start`
   do server ép, client không chọn.
3. **Làm bài** — thành viên phòng (trừ tác giả — người biết đáp án), 1 lượt/người/quiz,
   chỉ trong tuần phát hành (giữ công bằng xếp hạng).
4. **Đóng băng câu hỏi** — quiz đã có người làm thì câu hỏi bất biến (trigger chặn),
   tránh sửa đáp án phá xếp hạng.

### 3.2. Chống gian lận (mức phù hợp nội bộ)
- Đáp án **không bao giờ rời server** trước khi trả lời: người làm bài không SELECT được
  `quiz_questions`; câu hỏi phát qua RPC không kèm `correct_index`.
- Server phát **từng câu theo thứ tự cố định** (`current_question_id`), đo thời gian bằng
  **đồng hồ server** (`current_question_served_at`, trừ 3s dung sai mạng, trần 2× budget).
- Điểm chấm và lưu tại server: `đúng = 100 + round(50 × (budget − elapsed)/budget)`.
- Không leo thang thêm (không chặn tra cứu ngoài/2 thiết bị) — văn hóa nội bộ.

### 3.3. Huy hiệu phụ (12 chiếc, bảng `quiz_badge_catalog`)
| Nhóm | Huy hiệu | Tiêu chí |
|---|---|---|
| Khởi đầu | Phát pháo đầu tiên | Hoàn thành quiz đầu tiên |
| Chính xác | Thiện xạ / Không tì vết | ≥90% / 100% đúng (quiz ≥5 câu) |
| Tốc độ | Tia chớp | ≥90% đúng và tổng thời gian ≤50% budget |
| Bền bỉ | Đồng / Bạc / Vàng | 10 / 25 / 50 quiz hoàn thành |
| Chuỗi | Ngọn lửa 4 / 12 tuần, Nửa năm rực cháy | Chuỗi tuần 4 / 12 / 26 |
| Lan tỏa | Người gieo hạt / Người ươm vườn | Soạn 1 / 10 quiz |

Cơ chế trải nghiệm sao chép đúng paradigm sẵn có: `celebrated_at NULL` → modal
"mở khoá" hiện một lần (`QuizBadgeReveal`, cùng hợp đồng `LevelUpReveal`), bộ sưu tập
silhouette + khóa cho huy hiệu chưa đạt (`QuizBadgeGrid`, cùng ngôn ngữ scarcity với
`SkillCollectionGrid`).

### 3.4. Chuỗi tuần (streak)
- **Cá nhân**: tuần "có hoạt động" = hoàn thành ≥1 quiz **hoặc soạn ≥1 quiz** (tác giả
  không làm được quiz của mình nên soạn phải được tính) **hoặc tuần được freeze**.
  Tuần hiện tại chưa làm thì chuỗi *chưa* gãy (đếm từ tuần trước) — không tạo áp lực đếm ngược.
- **Freeze**: mỗi mốc chuỗi 4 tuần tặng 1 lượt (giữ tối đa 2). Cron thứ Hai **tự áp**
  cho tuần vừa lỡ nếu còn freeze — người dùng không phải thao tác, đúng tinh thần "không phạt".
- **Phòng**: chuỗi tuần liên tiếp phòng phát hành ≥1 quiz — chỉ số tự hào tập thể, không phạt.
- Tính toán **on-read** (RPC `quiz_get_my_streak`, `quiz_get_department_streaks`) — quy mô
  chi nhánh nhỏ, không cần materialize; chỉ freeze là bảng trạng thái.

### 3.5. Nhịp nhắc hàng tuần (Web Push, cron 08:00 VN hằng ngày)
| Thứ | Nhắc gì | Gửi ai |
|---|---|---|
| Hai | Mở tuần + áp freeze tuần trước | Thành viên phòng đang giữ chuỗi (tránh spam) |
| Năm | Phòng chưa có quiz tuần này | Mọi thành viên phòng đó (ai cũng tạo được) |
| Sáu | Cá nhân chưa làm quiz | Người chưa làm (phòng đã có quiz) |

`dry_run` mặc định true, giống `send-reminders`; bật lịch thủ công theo
`20260724090000_quizzi_reminders_cron_notes.sql`.

## 4. Kiến trúc kỹ thuật

- **Bảng**: `quizzes`, `quiz_questions` (đáp án kín), `quiz_attempts` + `quiz_attempt_answers`
  (ghi qua RPC SECURITY DEFINER, không có policy ghi), `quiz_badge_catalog` + `quiz_badge_awards`,
  `quiz_streak_freezes`. Migrations `20260721090000` → `20260724090000`.
- **RPC gameplay**: `quiz_start_attempt`, `quiz_answer_question` (feedback tức thì —
  trái tim UX Duolingo), `quiz_get_attempt_review`, `quiz_get_ranking` (nội bộ phòng),
  `quiz_get_branch_overview` (tổng hợp phòng), `quiz_get_my_streak`,
  `quiz_apply_streak_freezes`, `quiz_expire_stale_attempts`.
- **Hook tiến hóa**: `quiz_process_completion` được CREATE OR REPLACE qua từng phase
  (P1 stub → P2 badges → P3 streaks) — cùng kiểu `kanban_upsert_card`.
- **Frontend**: `/quizzi` (hub: chuỗi, quiz tuần, huy hiệu, tab toàn chi nhánh),
  `/quizzi/tao-moi` + `/quizzi/:id/sua` (composer), `/quizzi/:id` (làm bài: progress bar,
  đồng hồ từng câu, flash đúng/sai + giải thích + điểm, màn kết thúc ăn mừng),
  `/quizzi/:id/ket-qua` (xếp hạng phòng — top 3 nổi bật, không styling "bét bảng").
- **Logic thuần** `src/lib/quizzi.ts` (mirror SQL, vitest) + `src/lib/quizziBadges.ts`
  (icon/màu). Nav: "BHY Quizzi" trong nhóm Cá nhân / Năng lực.

## 5. Vận hành

1. Apply 5 migration theo thứ tự (SQL Editor / supabase db push).
2. Regenerate types nếu cần (`src/integrations/supabase/types.ts` đã cập nhật tay khớp schema).
3. Deploy edge function `quiz-reminders`; chạy thử `{"dry_run": true, "force_weekday": 4}`
   để soát danh sách nhận trước khi bật cron.
4. Bật cron theo ghi chú trong `20260724090000_quizzi_reminders_cron_notes.sql`.
5. Truyền thông nội bộ: nhấn mạnh "điểm và huy hiệu Quizzi không quy đổi thi đua" —
   giữ động lực nội tại, đúng nguyên tắc gamification của hệ thống.
