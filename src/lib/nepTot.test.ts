import { describe, expect, it } from 'vitest';
import {
  parseStructuringResponse, validateQuickNote, toDatetimeLocalValue,
  MAX_ATTITUDES_PER_NOTE, MAX_SKILLS_PER_NOTE,
} from './nepTot';

const validInput = {
  employeeId: 'abc',
  rawText: 'Hùng chủ động phối hợp phòng thẩm định, ở lại hoàn thiện hồ sơ.',
  behaviorType: 'tich_cuc' as const,
  occurredAt: new Date().toISOString(),
};

describe('validateQuickNote', () => {
  it('chấp nhận input hợp lệ', () => {
    expect(validateQuickNote(validInput)).toBeNull();
  });

  it('bắt buộc chọn cán bộ', () => {
    expect(validateQuickNote({ ...validInput, employeeId: null })).toMatch(/Chọn cán bộ/);
  });

  it('chặn nội dung quá ngắn', () => {
    expect(validateQuickNote({ ...validInput, rawText: 'ok' })).toMatch(/quá ngắn/);
  });

  it('bắt buộc chọn loại hành vi', () => {
    expect(validateQuickNote({ ...validInput, behaviorType: null })).toMatch(/Chọn loại/);
  });

  it('chặn thời điểm ở tương lai', () => {
    const future = new Date(Date.now() + 3_600_000).toISOString();
    expect(validateQuickNote({ ...validInput, occurredAt: future })).toMatch(/tương lai/);
  });

  it('chặn thời điểm không hợp lệ', () => {
    expect(validateQuickNote({ ...validInput, occurredAt: 'not-a-date' })).toMatch(/không hợp lệ/);
  });
});

describe('parseStructuringResponse', () => {
  const good = {
    situation: 'Dự án cần trình trong ngày',
    behavior: 'Chủ động phối hợp phòng thẩm định, ở lại hoàn thiện hồ sơ',
    impact: 'Hồ sơ trình đúng hạn',
    skill_codes: ['SK04', 'SK12'],
    attitude_ids: [4, 5],
    impact_level: 'cao',
    is_repeated_hint: 'Chưa đủ dữ liệu',
    rewrite: 'Bản viết lại.',
  };

  it('parse JSON thuần', () => {
    const r = parseStructuringResponse(JSON.stringify(good));
    expect(r).not.toBeNull();
    expect(r!.skill_codes).toEqual(['SK04', 'SK12']);
    expect(r!.attitude_ids).toEqual([4, 5]);
    expect(r!.impact_level).toBe('cao');
  });

  it('parse JSON trong code fence và text thừa', () => {
    const text = 'Đây là kết quả:\n```json\n' + JSON.stringify(good) + '\n```\nHết.';
    const r = parseStructuringResponse(text);
    expect(r?.behavior).toBe(good.behavior);
  });

  it('parse JSON lẫn trong văn bản không fence', () => {
    const r = parseStructuringResponse(`Kết quả: ${JSON.stringify(good)} — xong`);
    expect(r?.situation).toBe(good.situation);
  });

  it('cắt bớt skill/attitude vượt giới hạn', () => {
    const r = parseStructuringResponse(JSON.stringify({
      ...good,
      skill_codes: ['SK01', 'SK02', 'SK03', 'SK04', 'SK05'],
      attitude_ids: [1, 2, 3, 4],
    }));
    expect(r!.skill_codes).toHaveLength(MAX_SKILLS_PER_NOTE);
    expect(r!.attitude_ids).toHaveLength(MAX_ATTITUDES_PER_NOTE);
  });

  it('loại mã skill sai định dạng và attitude ngoài 1-6', () => {
    const r = parseStructuringResponse(JSON.stringify({
      ...good,
      skill_codes: ['SK4', 'hello', 'sk07'],
      attitude_ids: [0, 7, 3],
    }));
    expect(r!.skill_codes).toEqual(['SK07']);
    expect(r!.attitude_ids).toEqual([3]);
  });

  it('impact_level lạ → null', () => {
    const r = parseStructuringResponse(JSON.stringify({ ...good, impact_level: 'rất cao' }));
    expect(r!.impact_level).toBeNull();
  });

  it('trả null khi không có JSON', () => {
    expect(parseStructuringResponse('Xin lỗi, tôi không thể giúp.')).toBeNull();
  });

  it('trả null khi JSON hỏng', () => {
    expect(parseStructuringResponse('{"situation": "abc",')).toBeNull();
  });

  it('trả null khi JSON rỗng nội dung', () => {
    expect(parseStructuringResponse('{"skill_codes": []}')).toBeNull();
  });
});

describe('toDatetimeLocalValue', () => {
  it('định dạng YYYY-MM-DDTHH:mm theo giờ địa phương', () => {
    const d = new Date(2026, 6, 19, 9, 5); // 19/07/2026 09:05 local
    expect(toDatetimeLocalValue(d)).toBe('2026-07-19T09:05');
  });
});
