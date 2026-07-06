import { describe, it, expect } from 'vitest';
import { isBgd, isBranchDirector, isDeputyDirector, isDepartmentHeadPosition } from './reportingLine';

const P = (position: string) => ({ id: 'x', full_name: 'x', position, department_id: 'd' });

describe('reportingLine classifiers', () => {
  it('nhận diện Giám đốc chi nhánh', () => {
    expect(isBranchDirector(P('Giám đốc'))).toBe(true);
    expect(isBranchDirector(P('Giám đốc Chi nhánh'))).toBe(true);
    expect(isBranchDirector(P('Phó Giám đốc'))).toBe(false);
    expect(isBranchDirector(P('Trưởng phòng'))).toBe(false);
  });

  it('nhận diện Ban Giám đốc / PGĐ nhưng loại Trưởng/Phó phòng', () => {
    expect(isBgd(P('Phó Giám đốc'))).toBe(true);
    expect(isBgd(P('Giám đốc'))).toBe(true);
    expect(isBgd(P('Trưởng phòng Tổ chức'))).toBe(false);
    expect(isBgd(P('Phó phòng KHDN'))).toBe(false);
  });

  it('nhận diện Phó Giám đốc', () => {
    expect(isDeputyDirector(P('Phó Giám đốc'))).toBe(true);
    expect(isDeputyDirector(P('Giám đốc'))).toBe(false);
  });

  it('nhận diện vị trí lãnh đạo phòng (không cần Quản lý trực tiếp)', () => {
    expect(isDepartmentHeadPosition('Trưởng phòng Khách hàng')).toBe(true);
    expect(isDepartmentHeadPosition('Phụ trách phòng Giao dịch')).toBe(true);
    expect(isDepartmentHeadPosition('Chuyên viên')).toBe(false);
    expect(isDepartmentHeadPosition('Phó phòng KHDN')).toBe(false);
  });
});
