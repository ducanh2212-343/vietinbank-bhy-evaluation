import { describe, it, expect } from 'vitest';
import { getReviewerLevel, getOverallReviewField, canApproveStarFor } from './reviewerScope';

const GD = 'gd-1';
const PGD = 'pgd-1';
const TP = 'tp-1';
const admin = { profileId: GD, isManager: false, isPgd: false, isAdmin: true };

describe('getReviewerLevel', () => {
  it('kiêm nhiệm PGĐ + Giám đốc của cùng cán bộ → vai PGĐ (cấp có nút phê duyệt)', () => {
    // Giám đốc trực tiếp phụ trách Phòng TCTH: pgd_id = director_id = GĐ.
    // Nếu trả 'director' thì phiếu kẹt ở 'reviewed' vì không ai khác đứng vai PGĐ.
    const target = { id: 'nv-1', manager_id: TP, pgd_id: GD, director_id: GD };
    expect(getReviewerLevel(admin, target)).toBe('pgd');
  });

  it('chỉ là Giám đốc giám sát (PGĐ là người khác) → vai director, không duyệt thay', () => {
    const target = { id: 'nv-2', manager_id: TP, pgd_id: PGD, director_id: GD };
    expect(getReviewerLevel(admin, target)).toBe('director');
  });

  it('admin là quản lý trực tiếp → vai manager', () => {
    const target = { id: 'nv-3', manager_id: GD, pgd_id: PGD, director_id: 'gd-khac' };
    expect(getReviewerLevel(admin, target)).toBe('manager');
  });

  it('admin không thuộc tuyến của cán bộ → mặc định vai director (giám sát)', () => {
    const target = { id: 'nv-4', manager_id: TP, pgd_id: PGD, director_id: 'gd-khac' };
    expect(getReviewerLevel(admin, target)).toBe('director');
  });

  it('không bao giờ tự đánh giá chính mình', () => {
    expect(getReviewerLevel(admin, { id: GD, manager_id: null, pgd_id: null, director_id: null })).toBeNull();
  });

  it('PGĐ (không phải admin) chỉ có vai với cán bộ thuộc khối mình', () => {
    const pgdActor = { profileId: PGD, isManager: false, isPgd: true, isAdmin: false };
    expect(getReviewerLevel(pgdActor, { id: 'nv-5', manager_id: TP, pgd_id: PGD, director_id: GD })).toBe('pgd');
    expect(getReviewerLevel(pgdActor, { id: 'nv-6', manager_id: TP, pgd_id: 'pgd-khac', director_id: GD })).toBeNull();
  });
});

describe('getOverallReviewField', () => {
  it('map đúng cột theo cấp', () => {
    expect(getOverallReviewField('manager')).toBe('manager_overall_review');
    expect(getOverallReviewField('pgd')).toBe('pgd_overall_review');
    expect(getOverallReviewField('director')).toBe('director_overall_review');
  });
});

describe('canApproveStarFor', () => {
  it('cấp cao hơn duyệt được đề xuất của cấp thấp hơn', () => {
    expect(canApproveStarFor('pgd', 'manager')).toBe(true);
    expect(canApproveStarFor('director', 'pgd')).toBe(true);
    expect(canApproveStarFor('manager', 'pgd')).toBe(false);
    expect(canApproveStarFor('pgd', 'pgd')).toBe(false);
  });
});
