import { describe, it, expect } from 'vitest';
import {
  getVietnamWeekStart, isWeeklyTracked, computeBadges, toVietnamDateString,
  sortCards, type KanbanCard,
} from './kanban';

const baseCard = (over: Partial<KanbanCard> = {}): KanbanCard => ({
  id: 'c1',
  profile_id: 'p1',
  form_id: 'f1',
  cycle_id: null,
  source_type: 'skill_upskill',
  source_table: 'form_skill_actions',
  source_action_id: 'a1',
  title: 'Luyện kỹ năng tư vấn KH theo checklist',
  skill_id: null,
  attitude_dimension_id: null,
  learning_mode: null,
  deadline: null,
  kanban_status: 'todo',
  completion_status: 'none',
  progress_percent: 0,
  started_at: null,
  completed_at: null,
  last_progress_at: null,
  next_update_due_at: null,
  manager_confirmed_by: null,
  manager_confirmed_at: null,
  leadership_mark_id: null,
  is_active: true,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
  ...over,
});

describe('getVietnamWeekStart', () => {
  it('giữa tuần: thứ Sáu 25/7/2026 10:00 VN → thứ Hai 20/7 00:00 VN (19/7 17:00Z)', () => {
    const d = getVietnamWeekStart(new Date('2026-07-25T03:00:00Z')); // 10:00 VN
    expect(d.toISOString()).toBe('2026-07-19T17:00:00.000Z');
  });

  it('Chủ nhật vẫn thuộc tuần bắt đầu từ thứ Hai trước đó', () => {
    const d = getVietnamWeekStart(new Date('2026-07-26T14:00:00Z')); // CN 26/7 21:00 VN
    expect(d.toISOString()).toBe('2026-07-19T17:00:00.000Z');
  });

  it('thứ Hai 00:30 VN đã sang tuần mới', () => {
    const d = getVietnamWeekStart(new Date('2026-07-26T17:30:00Z')); // T2 27/7 00:30 VN
    expect(d.toISOString()).toBe('2026-07-26T17:00:00.000Z');
  });

  it('ranh giới lệch múi giờ: tối CN giờ UTC nhưng đã là thứ Hai giờ VN', () => {
    const d = getVietnamWeekStart(new Date('2026-07-26T18:00:00Z')); // T2 27/7 01:00 VN
    expect(d.toISOString()).toBe('2026-07-26T17:00:00.000Z');
  });
});

describe('isWeeklyTracked — mọi thẻ kế hoạch quý chưa xong đều phải giữ nhịp tuần', () => {
  it('thẻ todo có nội dung: theo dõi (trước đây bị bỏ sót)', () => {
    expect(isWeeklyTracked(baseCard({ kanban_status: 'todo' }))).toBe(true);
  });
  it('thẻ doing: theo dõi', () => {
    expect(isWeeklyTracked(baseCard({ kanban_status: 'doing' }))).toBe(true);
  });
  it('thẻ done: không theo dõi', () => {
    expect(isWeeklyTracked(baseCard({ kanban_status: 'done' }))).toBe(false);
  });
  it('thẻ placeholder chưa có nội dung: không báo đỏ tuần (đã có cảnh báo Cần bổ sung)', () => {
    expect(isWeeklyTracked(baseCard({ title: 'Chưa nhập' }))).toBe(false);
    expect(isWeeklyTracked(baseCard({ title: '(Chưa đặt tên)' }))).toBe(false);
  });
});

describe('computeBadges — tuần & hạn theo giờ Việt Nam', () => {
  const friday = new Date('2026-07-25T03:00:00Z'); // thứ Sáu 25/7 10:00 VN

  it('chưa cập nhật tuần → notUpdatedThisWeek, kể cả thẻ todo', () => {
    const b = computeBadges(baseCard({ kanban_status: 'todo' }), friday, false);
    expect(b.notUpdatedThisWeek).toBe(true);
    expect(b.updatedThisWeek).toBe(false);
  });

  it('đã cập nhật tuần → updatedThisWeek', () => {
    const b = computeBadges(baseCard({ kanban_status: 'doing' }), friday, true);
    expect(b.updatedThisWeek).toBe(true);
    expect(b.notUpdatedThisWeek).toBe(false);
  });

  it('thiếu dữ liệu tuần (undefined) → không báo đỏ nhầm', () => {
    const b = computeBadges(baseCard({ kanban_status: 'doing' }), friday, undefined);
    expect(b.notUpdatedThisWeek).toBe(false);
  });

  it('deadline hôm nay (giờ VN) chưa phải quá hạn; hôm qua mới quá hạn', () => {
    expect(toVietnamDateString(friday)).toBe('2026-07-25');
    const today = computeBadges(baseCard({ deadline: '2026-07-25', kanban_status: 'doing' }), friday);
    expect(today.overdue).toBe(false);
    expect(today.dueSoon).toBe(true);
    const yesterday = computeBadges(baseCard({ deadline: '2026-07-24', kanban_status: 'doing' }), friday);
    expect(yesterday.overdue).toBe(true);
  });

  it('thẻ done không bao giờ quá hạn/báo tuần', () => {
    const b = computeBadges(baseCard({ deadline: '2026-01-01', kanban_status: 'done' }), friday, false);
    expect(b.overdue).toBe(false);
    expect(b.notUpdatedThisWeek).toBe(false);
  });
});

describe('sortCards — thẻ chưa cập nhật tuần được đẩy lên trên', () => {
  it('quá hạn > chưa cập nhật tuần > còn lại', () => {
    const ok = baseCard({ id: 'ok', kanban_status: 'doing' });
    const red = baseCard({ id: 'red', kanban_status: 'doing' });
    const late = baseCard({ id: 'late', kanban_status: 'doing', deadline: '2026-01-01' });
    const sorted = sortCards([ok, red, late], { weeklyMap: { ok: true, red: false, late: true } });
    expect(sorted.map(c => c.id)).toEqual(['late', 'red', 'ok']);
  });
});
