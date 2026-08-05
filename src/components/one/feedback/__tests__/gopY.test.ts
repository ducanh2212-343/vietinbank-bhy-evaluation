process.env.TZ = 'Asia/Ho_Chi_Minh';

import { describe, it, expect } from 'vitest';
import { NAV_SECTIONS, filterSections, type NavPermissions } from '@/lib/navigation';
import { nhomMucGopY } from '../gopYMuc';
import { buildGopYWorkbook, locGopYTheoTrangThai, tenFileGopY } from '../gopYExcel';
import type { GopY } from '../useGopY';

// Góp ý mẫu — đủ trường, override phần cần cho từng ca test
const makeGopY = (overrides: Partial<GopY> = {}): GopY => ({
  id: 'gy-1',
  noiDung: 'Bảng Kanban trên điện thoại khó bấm nút chuyển cột',
  mucLienQuan: [{ path: '/one/chieu-thuc-2', label: 'Kế hoạch hành động Chi nhánh' }],
  trangGui: '/one/chieu-thuc-2',
  nguoiGui: 'Nguyễn Văn A',
  phongBan: 'Phòng KHDN',
  trangThai: 'moi',
  danhDauLuc: null,
  createdAt: '2026-08-05T09:00:00+07:00',
  createdBy: 'user-1',
  isMine: false,
  ...overrides,
});

const KHONG_QUYEN: NavPermissions = {
  isGuest: false,
  isAdmin: false,
  isManager: false,
  isPgd: false,
  submissionReport: false,
  strategicHr: false,
  councilMember: false,
  councilReport: false,
  councilAnalytics: false,
  leadershipMarks: false,
};

describe('nhomMucGopY — danh sách tick chọn menu/tính năng', () => {
  it('nhóm theo khu và không có đường dẫn trùng lặp', () => {
    const nhom = nhomMucGopY(filterSections(NAV_SECTIONS, KHONG_QUYEN));
    expect(nhom.length).toBeGreaterThan(0);
    const paths = nhom.flatMap((g) => g.muc.map((m) => m.path));
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('cán bộ thường chỉ tick được mục mình thấy — không lộ mục quản trị', () => {
    const nhom = nhomMucGopY(filterSections(NAV_SECTIONS, KHONG_QUYEN));
    const paths = nhom.flatMap((g) => g.muc.map((m) => m.path));
    expect(paths).toContain('/one/y-tuong');
    expect(paths).toContain('/tu-danh-gia');
    expect(paths).not.toContain('/phan-quyen');
    expect(paths).not.toContain('/gop-y-he-thong');
  });

  it('quản trị viên thấy cả mục quản trị, trong đó có hòm góp ý', () => {
    const quanTri: NavPermissions = { ...KHONG_QUYEN, isAdmin: true };
    const paths = nhomMucGopY(filterSections(NAV_SECTIONS, quanTri))
      .flatMap((g) => g.muc.map((m) => m.path));
    expect(paths).toContain('/gop-y-he-thong');
  });
});

describe('locGopYTheoTrangThai', () => {
  const rows = [
    makeGopY({ id: 'a', trangThai: 'moi' }),
    makeGopY({ id: 'b', trangThai: 'da_xem_xet' }),
    makeGopY({ id: 'c', trangThai: 'da_xu_ly' }),
  ];

  it("'tat_ca' giữ nguyên danh sách", () => {
    expect(locGopYTheoTrangThai(rows, 'tat_ca')).toHaveLength(3);
  });

  it('lọc đúng từng trạng thái', () => {
    expect(locGopYTheoTrangThai(rows, 'moi').map((g) => g.id)).toEqual(['a']);
    expect(locGopYTheoTrangThai(rows, 'da_xem_xet').map((g) => g.id)).toEqual(['b']);
    expect(locGopYTheoTrangThai(rows, 'da_xu_ly').map((g) => g.id)).toEqual(['c']);
  });
});

describe('buildGopYWorkbook', () => {
  it('dựng đủ 2 sheet, đếm đúng trạng thái ở Tổng quan', async () => {
    const wb = await buildGopYWorkbook([
      makeGopY({ id: 'a', trangThai: 'moi' }),
      makeGopY({ id: 'b', trangThai: 'da_xu_ly', createdBy: 'user-2', danhDauLuc: '2026-08-05T10:00:00+07:00' }),
    ]);
    const ws1 = wb.getWorksheet('Danh sách góp ý')!;
    const ws2 = wb.getWorksheet('Tổng quan')!;
    expect(ws1.rowCount).toBe(3); // 1 tiêu đề + 2 dòng
    // Cột trạng thái (7) in nhãn tiếng Việt
    expect(ws1.getRow(3).getCell(7).value).toBe('Đã xử lý');

    const tongQuan = new Map<string, unknown>();
    ws2.eachRow((row, n) => {
      if (n > 1) tongQuan.set(String(row.getCell(1).value), row.getCell(2).value);
    });
    expect(tongQuan.get('Tổng số góp ý')).toBe(2);
    expect(tongQuan.get('Mới gửi (chưa xem xét)')).toBe(1);
    expect(tongQuan.get('Đã xử lý')).toBe(1);
    expect(tongQuan.get('Số người gửi')).toBe(2);
  });
});

describe('tenFileGopY', () => {
  it('tên file mang ngày kết xuất', () => {
    expect(tenFileGopY()).toMatch(/^GOP_Y_HE_THONG_BHY_ONE_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});
