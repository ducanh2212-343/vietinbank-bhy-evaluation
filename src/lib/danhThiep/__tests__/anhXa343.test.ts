/**
 * Bản ánh xạ 343 → danh thiếp có HAI nơi: hàm SQL nc_anh_xa_*_343() và bản
 * TypeScript ở anhXa343.ts. Test này giữ hai bên trùng nhau bằng cách đọc
 * thẳng file migration và kiểm từng nhánh CASE.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { anhXaChucDanh343, anhXaDonVi343, goiYTuHoSo343, nhanSongNgu } from '../anhXa343';
import type { ChucDanh, DonVi } from '../kieu';

const SQL = readFileSync(
  resolve(__dirname, '../../../../supabase/migrations/20261004090200_danh_thiep_so_tu_tao_ban_nhap.sql'),
  'utf-8',
);

function donViMau(code: string): DonVi {
  return {
    id: `dv-${code}`, code, parent_code: null, sort_order: 0,
    name_vi: `Đơn vị ${code}`, name_en: `Unit ${code}`, name_zh_hans: null, name_zh_hant: null, name_ko: null, name_ja: null,
    addr_vi: null, addr_en: null, addr_zh_hans: null, addr_zh_hant: null, addr_ko: null, addr_ja: null,
    map_url: null, phone: null, status: 'approved', approved_by: null, approved_at: null, updated_at: '',
  };
}

function chucDanhMau(code: string, sua: Partial<ChucDanh> = {}): ChucDanh {
  return {
    id: `cd-${code}`, code, scope: 'external', allowed_employment: ['bien_che', 'hop_dong'],
    requires_director_approval: false, note_internal: null, status: 'approved',
    name_vi: `Chức danh ${code}`, name_en: `Title ${code}`, name_zh_hans: null, name_zh_hant: null, name_ko: null, name_ja: null,
    effective_from: null, approved_by: null, approved_at: null, updated_at: '',
    ...sua,
  };
}

describe('anhXaDonVi343', () => {
  const cap: [string, string][] = [
    ['Phòng giao dịch Văn Giang', 'PGD_VG'],
    ['PGD Ân Thi', 'PGD_AT'],
    ['Phòng giao dịch Khoái Châu', 'PGD_KC'],
    ['PGD Ocean City', 'PGD_OC'],
    ['Phòng giao dịch Văn Lâm', 'PGD_VL'],
    ['Phòng KHDN', 'P_KHDN'],
    ['Phòng Khách hàng doanh nghiệp', 'P_KHDN'],
    ['Phòng Bán lẻ', 'P_BL'],
    ['Phòng Dịch vụ khách hàng', 'P_DVKH'],
    ['DVKH', 'P_DVKH'],
    ['Phòng Hỗ trợ tín dụng', 'P_HTTD'],
    ['HTTD', 'P_HTTD'],
    ['Phòng Tổ chức tổng hợp', 'P_TCTH'],
    ['TCTH', 'P_TCTH'],
    ['Ban Giám đốc', 'CN_BHY'],
    ['', 'CN_BHY'],
  ];
  it.each(cap)('«%s» → %s', (ten, ma) => {
    expect(anhXaDonVi343(ten)).toBe(ma);
  });

  it('mọi mã đơn vị dùng ở đây đều có trong hàm SQL', () => {
    for (const [, ma] of cap) expect(SQL).toContain(`'${ma}'`);
  });
});

describe('anhXaChucDanh343', () => {
  const cap: [string, string | null][] = [
    ['Giám đốc', 'GD_CN'],
    ['Phó giám đốc chi nhánh', 'PGD_CN'],
    ['Trưởng phòng giao dịch Văn Giang', 'GD_PGD'],
    ['Phó phòng giao dịch Ân Thi', 'PGD_PGD'],
    ['Trưởng phòng KHDN', 'TP'],
    ['Phó phòng KHDN', 'PP'],
    ['Kiểm soát viên', 'KSV'],
    ['Giao dịch viên', 'GDV'],
    ['Cán bộ quan hệ khách hàng FDI', 'RM_FDI'],
    ['Cán bộ quan hệ khách hàng bán lẻ', 'RM_BL'],
    ['Thủ quỹ', 'TQ'],
    ['Thủ kho', 'TQ'],
    ['Cán bộ hỗ trợ tín dụng', 'CV'],
    ['Nhân viên dịch vụ khách hàng', 'CV'],
    ['Lái xe', null],
    ['', null],
  ];
  it.each(cap)('«%s» → %s', (ten, ma) => {
    expect(anhXaChucDanh343(ten)).toBe(ma);
  });

  it('«Phó phòng giao dịch» phải ra PGD_PGD chứ không rơi vào nhánh «pho phong»', () => {
    // Thứ tự nhánh quan trọng: nhánh phòng giao dịch phải đứng TRƯỚC nhánh phòng
    expect(anhXaChucDanh343('Phó phòng giao dịch Văn Lâm')).toBe('PGD_PGD');
    expect(anhXaChucDanh343('Trưởng phòng giao dịch Ocean City')).toBe('GD_PGD');
  });

  it('mọi mã chức danh dùng ở đây đều có trong hàm SQL', () => {
    for (const [, ma] of cap) if (ma) expect(SQL).toContain(`'${ma}'`);
  });
});

describe('goiYTuHoSo343', () => {
  const donVi = [donViMau('CN_BHY'), donViMau('P_KHDN')];
  const chucDanh = [chucDanhMau('PP'), chucDanhMau('TP')];

  it('điền sẵn đơn vị và chức danh khi ánh xạ được', () => {
    const gy = goiYTuHoSo343({ position: 'Phó phòng KHDN', department: 'Phòng KHDN' }, donVi, chucDanh);
    expect(gy.maDonVi).toBe('P_KHDN');
    expect(gy.chucDanh?.code).toBe('PP');
    expect(gy.lyDoTrongChucDanh).toBe('');
  });

  it('không đoán bừa khi chưa có luật — nêu lý do cho người nhập', () => {
    const gy = goiYTuHoSo343({ position: 'Lái xe', department: 'Phòng TCTH' }, donVi, chucDanh);
    expect(gy.chucDanh).toBeUndefined();
    expect(gy.lyDoTrongChucDanh).toContain('Lái xe');
  });

  it('mã có trong luật nhưng từ điển chưa có thì báo thiếu từ điển', () => {
    const gy = goiYTuHoSo343({ position: 'Giám đốc', department: 'Ban Giám đốc' }, donVi, chucDanh);
    expect(gy.maChucDanh).toBe('GD_CN');
    expect(gy.chucDanh).toBeUndefined();
    expect(gy.lyDoTrongChucDanh).toContain('GD_CN');
  });

  it('chức danh không áp cho loại nhân sự đang chọn thì bỏ trống', () => {
    const gy = goiYTuHoSo343({ position: 'Phó phòng KHDN', department: 'Phòng KHDN' }, donVi, chucDanh, 'ctv');
    expect(gy.chucDanh).toBeUndefined();
    expect(gy.lyDoTrongChucDanh).toContain('loại nhân sự');
  });

  it('từ điển rỗng thì không có đơn vị để chọn', () => {
    const gy = goiYTuHoSo343({ position: 'Phó phòng KHDN', department: 'Phòng KHDN' }, [], []);
    expect(gy.maDonVi).toBe('');
  });

  it('phòng không ánh xạ được thì về Chi nhánh', () => {
    const gy = goiYTuHoSo343({ position: 'Giám đốc', department: 'Ban Giám đốc' }, donVi, chucDanh);
    expect(gy.maDonVi).toBe('CN_BHY');
  });
});

describe('nhanSongNgu', () => {
  it('ghép tiếng Việt với tiếng Anh', () => {
    expect(nhanSongNgu({ name_vi: 'Phó phòng', name_en: 'Deputy Head of Department' }))
      .toBe('Phó phòng · Deputy Head of Department');
  });
  it('bỏ phần tiếng Anh khi trống hoặc trùng', () => {
    expect(nhanSongNgu({ name_vi: 'Phó phòng', name_en: null })).toBe('Phó phòng');
    expect(nhanSongNgu({ name_vi: 'VietinBank', name_en: 'vietinbank' })).toBe('VietinBank');
  });
});
