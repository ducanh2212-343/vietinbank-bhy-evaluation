import { describe, it, expect } from 'vitest';
import { tipMatchesRoles, tipInDateWindow } from './useFeatureTips';

describe('tipMatchesRoles', () => {
  it('target rỗng = áp dụng mọi người', () => {
    expect(tipMatchesRoles([], ['employee'])).toBe(true);
    expect(tipMatchesRoles([], [])).toBe(true);
  });

  it('khớp khi có giao giữa target và vai trò của user', () => {
    expect(tipMatchesRoles(['manager', 'pgd'], ['employee', 'manager'])).toBe(true);
    expect(tipMatchesRoles(['bgd'], ['bgd', 'tcth_admin'])).toBe(true);
  });

  it('không khớp khi không giao', () => {
    expect(tipMatchesRoles(['manager', 'pgd'], ['employee'])).toBe(false);
    expect(tipMatchesRoles(['bgd'], [])).toBe(false);
  });
});

describe('tipInDateWindow', () => {
  const now = new Date('2026-07-19T10:00:00Z');

  it('không giới hạn thời gian → luôn hiệu lực', () => {
    expect(tipInDateWindow({ starts_at: null, ends_at: null }, now)).toBe(true);
  });

  it('chưa đến starts_at → chưa hiệu lực', () => {
    expect(tipInDateWindow({ starts_at: '2026-08-01T00:00:00Z', ends_at: null }, now)).toBe(false);
  });

  it('quá ends_at → hết hiệu lực', () => {
    expect(tipInDateWindow({ starts_at: null, ends_at: '2026-07-01T00:00:00Z' }, now)).toBe(false);
  });

  it('trong khung → hiệu lực', () => {
    expect(
      tipInDateWindow({ starts_at: '2026-07-01T00:00:00Z', ends_at: '2026-07-31T00:00:00Z' }, now),
    ).toBe(true);
  });
});
