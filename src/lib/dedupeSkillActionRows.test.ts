import { describe, it, expect, vi } from 'vitest';

// evaluationPersistence import supabase client (cần env) — test chỉ dùng hàm thuần
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import { dedupeSkillActionRows } from './evaluationPersistence';

type Row = { id: string | null; skill_id: string | null; action_text: string | null; tag?: string };

describe('dedupeSkillActionRows — chống duplicate key uniq_skill_action_per_priority', () => {
  it('gộp 2 hành động cùng skill + cùng nội dung (khác hoa/thường, khoảng trắng)', () => {
    const rows: Row[] = [
      { id: 'a1', skill_id: 's1', action_text: 'Đọc tài liệu ABC' },
      { id: null, skill_id: 's1', action_text: '  đọc TÀI LIỆU abc ' },
    ];
    const out = dedupeSkillActionRows(rows);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('a1'); // giữ dòng đã có id (Kanban)
  });

  it('ưu tiên giữ dòng có id kể cả khi nó đứng SAU dòng mới trong mảng', () => {
    const rows: Row[] = [
      { id: null, skill_id: 's1', action_text: 'Kèm cặp với anh X', tag: 'new' },
      { id: 'a9', skill_id: 's1', action_text: 'Kèm cặp với anh X', tag: 'old' },
    ];
    const out = dedupeSkillActionRows(rows);
    expect(out).toHaveLength(1);
    expect(out[0].tag).toBe('old');
  });

  it('KHÔNG gộp khi khác skill (index theo từng skill_priority)', () => {
    const rows: Row[] = [
      { id: 'a1', skill_id: 's1', action_text: 'Học khóa Y' },
      { id: 'a2', skill_id: 's2', action_text: 'Học khóa Y' },
    ];
    expect(dedupeSkillActionRows(rows)).toHaveLength(2);
  });

  it('KHÔNG gộp các dòng placeholder trống (index bỏ qua chúng — cho phép nhiều dòng nháp)', () => {
    const rows: Row[] = [
      { id: 'a1', skill_id: 's1', action_text: 'Chưa nhập' },
      { id: null, skill_id: 's1', action_text: 'chưa nhập' },
      { id: null, skill_id: 's1', action_text: '' },
    ];
    expect(dedupeSkillActionRows(rows)).toHaveLength(3);
  });

  it('giữ nguyên thứ tự gốc của các dòng được giữ lại', () => {
    const rows: Row[] = [
      { id: 'a1', skill_id: 's1', action_text: 'Việc 1' },
      { id: 'a2', skill_id: 's1', action_text: 'Việc 2' },
      { id: null, skill_id: 's1', action_text: 'việc 1' }, // trùng Việc 1 → bỏ
      { id: 'a3', skill_id: 's1', action_text: 'Việc 3' },
    ];
    const out = dedupeSkillActionRows(rows);
    expect(out.map((r) => r.action_text)).toEqual(['Việc 1', 'Việc 2', 'Việc 3']);
  });

  it('mảng rỗng → rỗng', () => {
    expect(dedupeSkillActionRows([])).toEqual([]);
  });
});
