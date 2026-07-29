import { describe, it, expect } from 'vitest';
import { toDisplayStatus, getActorNeeded, type SubmissionRow } from './statusMap';

const mkRow = (over: Partial<SubmissionRow>): SubmissionRow => ({
  id: 'f1',
  status: 'submitted',
  return_target: null,
  needs_manager_review_update: false,
  submitted_at: '2026-07-01T00:00:00Z',
  reviewed_at: null,
  returned_at: null,
  pgd_reviewed_at: null,
  ...over,
});

describe('toDisplayStatus', () => {
  it('null/undefined → not_started', () => {
    expect(toDisplayStatus(null)).toBe('not_started');
    expect(toDisplayStatus(undefined)).toBe('not_started');
  });

  it('submitted thường → submitted; cán bộ nộp lại → resubmitted', () => {
    expect(toDisplayStatus(mkRow({}))).toBe('submitted');
    expect(toDisplayStatus(mkRow({ needs_manager_review_update: true }))).toBe('resubmitted');
  });

  it('submitted + return_target=manager → returned_manager (PGĐ trả TP / BGĐ chuyển trả phiếu đã duyệt)', () => {
    expect(toDisplayStatus(mkRow({ return_target: 'manager' }))).toBe('returned_manager');
  });

  it('returned_manager thắng needs_manager_review_update khi cả hai cùng bật', () => {
    expect(
      toDisplayStatus(mkRow({ return_target: 'manager', needs_manager_review_update: true })),
    ).toBe('returned_manager');
  });

  it('returned phân theo return_target', () => {
    expect(toDisplayStatus(mkRow({ status: 'returned', return_target: 'manager' }))).toBe('returned_manager');
    expect(toDisplayStatus(mkRow({ status: 'returned', return_target: 'employee' }))).toBe('returned_employee');
  });

  it('reviewed/approved/closed giữ nguyên', () => {
    expect(toDisplayStatus(mkRow({ status: 'reviewed' }))).toBe('reviewed');
    expect(toDisplayStatus(mkRow({ status: 'approved' }))).toBe('approved');
    expect(toDisplayStatus(mkRow({ status: 'closed' }))).toBe('closed');
  });
});

describe('getActorNeeded', () => {
  it('returned_manager là việc của Trưởng phòng', () => {
    expect(getActorNeeded('returned_manager')).toBe('manager');
  });
  it('approved/closed không cần ai xử lý', () => {
    expect(getActorNeeded('approved')).toBe('done');
    expect(getActorNeeded('closed')).toBe('done');
  });
});
