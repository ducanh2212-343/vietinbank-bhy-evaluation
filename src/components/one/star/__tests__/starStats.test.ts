import { describe, it, expect } from 'vitest';
import {
  buildDepartmentStats,
  buildIndividualStats,
  selectMyStarRecords,
  tenTapThe,
} from '../starStats';
import type { StarRecord } from '../useStarRecords';

let seq = 0;
const rec = (p: Partial<StarRecord> & { name: string; department: string }): StarRecord => ({
  id: `r${++seq}`,
  departmentGoc: p.department,
  stars: 1,
  reason: '',
  result: '',
  date: '2026-07-01',
  sender: 'Giám đốc',
  serial: '',
  isCollective: false,
  source: 'import',
  subUnit: null,
  ...p,
});

// Hai chị Nguyễn Thị Phượng có thật ở chi nhánh: Phó phòng TCTH và Phó PGD Ân Thi.
const PHUONG_TCTH = rec({ name: 'Nguyễn Thị Phượng', department: 'Phòng TCTH', stars: 1 });
const PHUONG_AN_THI = rec({ name: 'Nguyễn Thị Phượng', department: 'Phòng Ân Thi', stars: 1 });

describe('buildIndividualStats — cán bộ trùng họ tên', () => {
  it('hai cán bộ trùng tên khác phòng là HAI dòng, mỗi người đúng sao của mình', () => {
    const stats = buildIndividualStats([PHUONG_TCTH, PHUONG_AN_THI]);
    expect(stats).toHaveLength(2);
    expect(stats.every(s => s.totalStars === 1)).toBe(true);
    expect(new Set(stats.map(s => s.department))).toEqual(new Set(['Phòng Ân Thi', 'Phòng TCTH']));
  });

  it('cùng người, nhiều phiếu thì cộng dồn', () => {
    const stats = buildIndividualStats([
      rec({ name: 'Trần Văn A', department: 'Phòng KHDN', stars: 2 }),
      rec({ name: 'Trần Văn A', department: 'Phòng KHDN', stars: 3 }),
    ]);
    expect(stats).toHaveLength(1);
    expect(stats[0].totalStars).toBe(5);
  });

  it('phiếu tập thể không lọt vào bảng cá nhân', () => {
    const stats = buildIndividualStats([
      rec({ name: 'Tập thể Phòng KHDN', department: 'Phòng KHDN', stars: 4, isCollective: true }),
    ]);
    expect(stats).toHaveLength(0);
  });
});

describe('buildDepartmentStats — thi đua tính theo SAO TẬP THỂ', () => {
  const records = [
    // Phòng Ân Thi: 5 sao cán bộ, 2 sao tập thể
    rec({ name: 'Cán bộ 1', department: 'Phòng Ân Thi', stars: 3 }),
    rec({ name: 'Cán bộ 2', department: 'Phòng Ân Thi', stars: 2 }),
    rec({ name: 'Tập thể Phòng Ân Thi', department: 'Phòng Ân Thi', stars: 2, isCollective: true }),
    // Phòng KHDN: 12 sao cán bộ nhưng chỉ 1 sao tập thể
    rec({ name: 'Cán bộ 3', department: 'Phòng KHDN', stars: 12 }),
    rec({ name: 'Tập thể Phòng KHDN', department: 'Phòng KHDN', stars: 1, isCollective: true }),
  ];

  it('sao cán bộ KHÔNG cộng vào sao tập thể', () => {
    const anThi = buildDepartmentStats(records).find(d => d.department === 'Phòng Ân Thi')!;
    expect(anThi.collectiveStars).toBe(2);
    expect(anThi.staffStars).toBe(5);
    expect(anThi.collectiveRecords).toBe(1);
    expect(anThi.staffCount).toBe(2);
    expect(anThi.recordsCount).toBe(3);
  });

  it('phòng ít sao cán bộ nhưng nhiều sao tập thể vẫn xếp trên', () => {
    const stats = buildDepartmentStats(records).filter(d => d.collectiveStars > 0 || d.staffStars > 0);
    expect(stats[0].department).toBe('Phòng Ân Thi'); // 2 sao tập thể
    expect(stats[1].department).toBe('Phòng KHDN'); // 1 sao tập thể, dù 12 sao cán bộ
  });

  it('phòng chưa có phiếu nào vẫn có mặt với 0 sao', () => {
    const httd = buildDepartmentStats(records).find(d => d.department === 'Phòng HTTD')!;
    expect(httd.collectiveStars).toBe(0);
    expect(httd.staffStars).toBe(0);
    expect(httd.collectiveName).toBe('Tập thể Phòng HTTD');
  });

  it('thứ hạng ổn định khi bằng điểm (không đổi ngẫu nhiên giữa các lần tải)', () => {
    const lan1 = buildDepartmentStats(records).map(d => d.department);
    const lan2 = buildDepartmentStats([...records].reverse()).map(d => d.department);
    expect(lan1).toEqual(lan2);
  });

  it('Ban Giám đốc giữ nguyên tên, không thêm tiền tố "Tập thể"', () => {
    const stats = buildDepartmentStats([
      rec({ name: 'Ban Giám đốc', department: 'Ban Giám đốc', stars: 2, isCollective: true }),
    ]);
    expect(stats.find(d => d.department === 'Ban Giám đốc')!.collectiveName).toBe('Ban Giám đốc');
    expect(tenTapThe('Ban Giám đốc')).toBe('Ban Giám đốc');
    expect(tenTapThe('Phòng KHDN')).toBe('Tập thể Phòng KHDN');
  });

  it('PGĐ nhận sao cá nhân được tính vào Ban Giám đốc, không rơi vào phòng phụ trách', () => {
    // Ca thật 04/09: 3 PGĐ có 4 phiếu đều bị xếp vào Phòng KHDN vì không có nhánh BGĐ
    const stats = buildDepartmentStats([
      rec({ name: 'Nguyễn Đức Thái Hoàng', department: 'Ban Giám đốc', stars: 2 }),
      rec({ name: 'Phạm Minh Hải', department: 'Ban Giám đốc', stars: 1 }),
    ], ['Ban Giám đốc', 'Phòng KHDN']);
    const bgd = stats.find(d => d.department === 'Ban Giám đốc')!;
    expect(bgd.staffStars).toBe(3);
    expect(bgd.staffCount).toBe(2);
    expect(bgd.isSubUnit).toBe(false);
  });
});

describe('buildDepartmentStats — tổ / tập thể nhỏ (Tổ FDI thuộc KHDN, Tổ truyền thông liên phòng)', () => {
  const TO = [
    { nhan: 'Tổ FDI', phongCha: 'Phòng KHDN' },
    { nhan: 'Tổ truyền thông', phongCha: null },
  ];

  it('tổ chưa có phiếu vẫn có dòng riêng, đánh dấu là tổ và biết phòng cha', () => {
    const stats = buildDepartmentStats([], ['Phòng KHDN'], TO);
    const fdi = stats.find(d => d.department === 'Tổ FDI')!;
    expect(fdi.isSubUnit).toBe(true);
    expect(fdi.parent).toBe('Phòng KHDN');
    expect(fdi.collectiveName).toBe('Tập thể Tổ FDI');
    const tt = stats.find(d => d.department === 'Tổ truyền thông')!;
    expect(tt.isSubUnit).toBe(true);
    expect(tt.parent).toBeNull();
    // phòng thường không phải tổ
    expect(stats.find(d => d.department === 'Phòng KHDN')!.isSubUnit).toBe(false);
  });

  it('sao tập thể của tổ là phiếu ghi cho "Tập thể Tổ …" (department = tên tổ, như 2 phiếu Tổ FDI thật)', () => {
    const stats = buildDepartmentStats([
      rec({ name: 'Tập thể Tổ FDI', department: 'Tổ FDI', stars: 1, isCollective: true, subUnit: 'Tổ FDI' }),
      rec({ name: 'Tập thể Tổ FDI', department: 'Tổ FDI', stars: 1, isCollective: true, subUnit: 'Tổ FDI' }),
    ], ['Phòng KHDN'], TO);
    expect(stats.find(d => d.department === 'Tổ FDI')!.collectiveStars).toBe(2);
    // KHÔNG cộng vào sao tập thể của phòng cha — thi đua phòng vẫn tính phiếu ghi cho phòng
    expect(stats.find(d => d.department === 'Phòng KHDN')!.collectiveStars).toBe(0);
  });

  it('cán bộ thuộc tổ: sao cá nhân vẫn ở phòng, đồng thời hiện thêm ở dòng tổ để tham khảo', () => {
    const stats = buildDepartmentStats([
      rec({ name: 'Nguyễn Văn A', department: 'Phòng KHDN', stars: 2, subUnit: 'Tổ FDI' }),
      rec({ name: 'Trần Thị B', department: 'Phòng KHDN', stars: 1 }),
    ], ['Phòng KHDN'], TO);
    const khdn = stats.find(d => d.department === 'Phòng KHDN')!;
    const fdi = stats.find(d => d.department === 'Tổ FDI')!;
    expect(khdn.staffStars).toBe(3);
    expect(khdn.staffCount).toBe(2);
    expect(fdi.staffStars).toBe(2);
    expect(fdi.staffCount).toBe(1);
    expect(fdi.collectiveStars).toBe(0);
  });

  it('không truyền danh mục tổ thì hành vi y như cũ — không có dòng tổ nào', () => {
    const stats = buildDepartmentStats([], ['Phòng KHDN']);
    expect(stats.some(d => d.isSubUnit)).toBe(false);
  });
});

describe('selectMyStarRecords — "Sao của tôi" khi trùng họ tên', () => {
  it('mỗi chị Nguyễn Thị Phượng chỉ thấy sao của chính mình', () => {
    const all = [PHUONG_TCTH, PHUONG_AN_THI];
    expect(selectMyStarRecords(all, 'Nguyễn Thị Phượng', 'Phòng TCTH')).toEqual([PHUONG_TCTH]);
    expect(selectMyStarRecords(all, 'Nguyễn Thị Phượng', 'Phòng Ân Thi')).toEqual([PHUONG_AN_THI]);
  });

  it('tên không trùng thì giữ nguyên phiếu kể cả khi phòng trên phiếu ghi lệch', () => {
    const r = rec({ name: 'Trần Văn A', department: 'Phòng KHDN', stars: 2 });
    expect(selectMyStarRecords([r], 'Trần Văn A', 'Phòng TCTH')).toEqual([r]);
    expect(selectMyStarRecords([r], 'Trần Văn A', null)).toEqual([r]);
  });

  it('so khớp tên bỏ qua hoa thường và khoảng trắng thừa', () => {
    const r = rec({ name: '  Trần  Văn A ', department: 'Phòng KHDN' });
    expect(selectMyStarRecords([r], 'trần văn a', 'Phòng KHDN')).toEqual([r]);
  });

  it('trùng tên mà không biết phòng thì không đoán bừa (thà 0 còn hơn cộng nhầm)', () => {
    expect(selectMyStarRecords([PHUONG_TCTH, PHUONG_AN_THI], 'Nguyễn Thị Phượng', null)).toEqual([]);
  });

  it('phiếu tập thể không tính vào sao cá nhân', () => {
    const tt = rec({ name: 'Trần Văn A', department: 'Phòng KHDN', isCollective: true });
    expect(selectMyStarRecords([tt], 'Trần Văn A', 'Phòng KHDN')).toEqual([]);
  });

  it('chưa lấy được họ tên thì trả về rỗng', () => {
    expect(selectMyStarRecords([PHUONG_TCTH], '', 'Phòng TCTH')).toEqual([]);
  });
});
