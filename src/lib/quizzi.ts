/**
 * BHY Quizzi — logic thuần cho tuần/chuỗi/điểm.
 * SQL là nguồn chuẩn (quiz_week_start, quiz_answer_question, quiz_current_streak);
 * các hàm ở đây là MIRROR hiển thị phía client — giữ trùng công thức, có vitest.
 */

/** Thứ Hai đầu tuần (ISO week) theo giờ Việt Nam, trả về 'YYYY-MM-DD'. */
export function getVnWeekStart(d: Date = new Date()): string {
  // Chuyển sang "đồng hồ VN" bằng cách cộng offset UTC+7 rồi đọc theo UTC
  const vn = new Date(d.getTime() + 7 * 3600_000);
  const dow = vn.getUTCDay(); // 0=CN..6=T7 theo đồng hồ VN
  const sinceMonday = (dow + 6) % 7;
  vn.setUTCDate(vn.getUTCDate() - sinceMonday);
  const y = vn.getUTCFullYear();
  const m = String(vn.getUTCMonth() + 1).padStart(2, '0');
  const day = String(vn.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Tuần trước của một tuần 'YYYY-MM-DD' (lùi 7 ngày). */
export function prevWeek(weekStart: string): string {
  const [y, m, d] = weekStart.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d - 7));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Chuỗi tuần hiện tại — mirror của quiz_current_streak:
 * tuần hiện tại chưa hoạt động thì chưa gãy chuỗi, đếm từ tuần trước.
 */
export function computeStreak(activeWeeks: Set<string>, currentWeek: string): number {
  let week = activeWeeks.has(currentWeek) ? currentWeek : prevWeek(currentWeek);
  let streak = 0;
  while (activeWeeks.has(week)) {
    streak += 1;
    week = prevWeek(week);
  }
  return streak;
}

/**
 * Điểm 1 câu — mirror của quiz_answer_question:
 * đúng = 100 + round(50 × max(0, budget − elapsed) / budget); sai/hết giờ = 0.
 */
export function questionPoints(isCorrect: boolean, budgetMs: number, elapsedMs: number): number {
  if (!isCorrect || budgetMs <= 0) return 0;
  return 100 + Math.round((50 * Math.max(0, budgetMs - elapsedMs)) / budgetMs);
}

/** Điểm tối đa lý thuyết của một quiz (đúng hết, trả lời tức thì). */
export function maxScore(totalQuestions: number): number {
  return totalQuestions * 150;
}

export function formatDurationMs(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}p${String(s).padStart(2, '0')}` : `${s}s`;
}

/** Nhãn tuần thân thiện: "Tuần 21/07" */
export function formatWeekLabel(weekStart: string): string {
  const [, m, d] = weekStart.split('-');
  return `Tuần ${d}/${m}`;
}
