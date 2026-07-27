import { describe, it, expect } from 'vitest';
import {
  getReviewerLevel, getOverallReviewField, canApproveStarFor, resolveDefaultReviewerId,
  isSelfReviewProfile,
} from './reviewerScope';

const GD = 'gd-1';
const PGD = 'pgd-1';
const TP = 'tp-1';
const admin = { profileId: GD, isManager: false, isPgd: false, isAdmin: true };

describe('isSelfReviewProfile — phiếu tự soi', () => {
  it('Giám đốc chi nhánh: có cờ và không cấp trên nào → tự soi', () => {
    expect(isSelfReviewProfile({
      id: GD, manager_id: null, pgd_id: null, director_id: null, self_review_only: true,
    })).toBe(true);
  });

  it('không có cấp trên nhưng CHƯA đánh dấu cờ → không phải tự soi (vẫn phải gán người đánh giá)', () => {
    expect(isSelfReviewProfile({ id: 'nv-x', manager_id: null, pgd_id: null, director_id: null })).toBe(false);
  });

  it('có cờ nhưng vẫn còn cấp trên → KHÔNG cho tự soi (chặn tự duyệt phiếu của mình)', () => {
    // Luật cũ suy từ chuỗi chức danh: ai mang tên "Giám đốc chi nhánh" là tự phê duyệt
    // kể cả khi có cấp trên. DB có chk_self_review_no_supervisor, đây là lớp thứ hai.
    expect(isSelfReviewProfile({
      id: 'nv-y', manager_id: TP, pgd_id: null, director_id: null, self_review_only: true,
    })).toBe(false);
    expect(isSelfReviewProfile({
      id: 'nv-z', manager_id: null, pgd_id: PGD, director_id: null, self_review_only: true,
    })).toBe(false);
  });

  it('hồ sơ rỗng/không xác định → không phải tự soi', () => {
    expect(isSelfReviewProfile(null)).toBe(false);
    expect(isSelfReviewProfile(undefined)).toBe(false);
  });
});

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

describe('resolveDefaultReviewerId — phiếu nộp không bao giờ được vô chủ', () => {
  it('đủ tuyến → quản lý trực tiếp', () => {
    expect(resolveDefaultReviewerId({ id: 'nv', manager_id: TP, pgd_id: PGD, director_id: GD })).toBe(TP);
  });
  it('thiếu quản lý trực tiếp (TP phòng) → PGĐ phụ trách', () => {
    expect(resolveDefaultReviewerId({ id: 'tp', manager_id: null, pgd_id: PGD, director_id: GD })).toBe(PGD);
  });
  it('thiếu cả quản lý và PGĐ (PGĐ/BGĐ) → Giám đốc', () => {
    expect(resolveDefaultReviewerId({ id: 'pgd', manager_id: null, pgd_id: null, director_id: GD })).toBe(GD);
  });
  it('trống hoàn toàn → null (TCTH phải gán tuyến)', () => {
    expect(resolveDefaultReviewerId({ id: 'x', manager_id: null, pgd_id: null, director_id: null })).toBeNull();
    expect(resolveDefaultReviewerId(null)).toBeNull();
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
