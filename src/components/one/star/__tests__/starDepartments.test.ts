import { describe, expect, it } from 'vitest';
import {
  bacPhanBoTheoQuanSo, dungDanhMucPhongSao, nhanPhongDangDung,
  type PhongDanhBa,
} from '../starDepartments';

/** Danh bạ thật của chi nhánh tại 08/2026 (11 phòng, kèm quân số đang hoạt động) */
const DANH_BA_THAT: PhongDanhBa[] = [
  { ten: 'Ban Giám đốc', dangDung: true, quanSo: 4 },
  { ten: 'Phòng Bán lẻ', dangDung: true, quanSo: 8 },
  { ten: 'Phòng Dịch vụ khách hàng', dangDung: true, quanSo: 13 },
  { ten: 'Phòng giao dịch Ân Thi', dangDung: true, quanSo: 8 },
  { ten: 'Phòng giao dịch Khoái Châu', dangDung: true, quanSo: 9 },
  { ten: 'Phòng giao dịch Ocean City', dangDung: true, quanSo: 9 },
  { ten: 'Phòng giao dịch Văn Giang', dangDung: true, quanSo: 10 },
  { ten: 'Phòng giao dịch Văn Lâm', dangDung: true, quanSo: 10 },
  { ten: 'Phòng Hỗ trợ tín dụng', dangDung: true, quanSo: 6 },
  { ten: 'Phòng KHDN', dangDung: true, quanSo: 15 },
  { ten: 'Phòng Tổ chức Tổng hợp', dangDung: true, quanSo: 8 },
];

describe('bacPhanBoTheoQuanSo — bậc sao/quý theo văn bản mục 4', () => {
  it('đúng ba bậc và mức ngoài bảng', () => {
    expect(bacPhanBoTheoQuanSo(16)).toBe(8);
    expect(bacPhanBoTheoQuanSo(14)).toBe(8);
    expect(bacPhanBoTheoQuanSo(13)).toBe(6);
    expect(bacPhanBoTheoQuanSo(10)).toBe(6);
    expect(bacPhanBoTheoQuanSo(9)).toBe(5);
    expect(bacPhanBoTheoQuanSo(7)).toBe(5);
    expect(bacPhanBoTheoQuanSo(6)).toBeNull();
  });
});

describe('dungDanhMucPhongSao — danh mục phòng suy từ danh bạ', () => {
  it('Ban Giám đốc không nằm trong danh mục nhận Sao tập thể và không bị coi là lệch', () => {
    const { danhSach, lech } = dungDanhMucPhongSao(DANH_BA_THAT);
    expect(danhSach.map((p) => p.nhan)).not.toContain('Ban Giám đốc');
    expect(lech.filter((l) => l.ten === 'Ban Giám đốc')).toHaveLength(0);
  });

  it('10 phòng thật đều ra đúng nhãn Sao, không phòng nào bị bỏ sót', () => {
    const { danhSach } = dungDanhMucPhongSao(DANH_BA_THAT);
    expect(danhSach.map((p) => p.nhan).sort()).toEqual([
      'PGD Ocean City', 'Phòng Bán lẻ', 'Phòng DVKH', 'Phòng HTTD', 'Phòng KHDN',
      'Phòng Khoái Châu', 'Phòng TCTH', 'Phòng Văn Giang', 'Phòng Văn Lâm', 'Phòng Ân Thi',
    ].sort());
  });

  it('phòng đổi tên: nhãn cũ còn trên phiếu được báo để quy về nhãn mới', () => {
    // Ca thật: danh bạ đã là "Phòng giao dịch Ocean City" nhưng phiếu cũ vẫn ghi
    // "Phòng Yên Mỹ" — nếu không quy nhãn, bảng thi đua tách phòng làm hai dòng.
    const { lech } = dungDanhMucPhongSao(DANH_BA_THAT, ['Phòng Yên Mỹ', 'Phòng KHDN']);
    const canhBao = lech.find((l) => l.loai === 'nhan-khong-con-phong');
    expect(canhBao?.ten).toBe('Phòng Yên Mỹ');
  });

  it('phiếu dùng đúng nhãn mới thì không báo lệch nhãn', () => {
    const { lech } = dungDanhMucPhongSao(DANH_BA_THAT, ['PGD Ocean City', 'Phòng KHDN']);
    expect(lech.filter((l) => l.loai === 'nhan-khong-con-phong')).toHaveLength(0);
  });

  it('Tổ FDI nhận sao tập thể nhưng không phải phòng danh bạ — không coi là lệch', () => {
    const { lech } = dungDanhMucPhongSao(DANH_BA_THAT, ['Tổ FDI']);
    expect(lech.filter((l) => l.loai === 'nhan-khong-con-phong')).toHaveLength(0);
  });

  it('phòng giao dịch mới mở bị luật cũ dồn vào Phòng DVKH thì phải báo, không im lặng', () => {
    const danhBa = [...DANH_BA_THAT, { ten: 'Phòng giao dịch Mỹ Hào', dangDung: true, quanSo: 8 }];
    const { danhSach, lech } = dungDanhMucPhongSao(danhBa);
    const canhBao = lech.find((l) => l.loai === 'nhan-trung-phong');
    expect(canhBao?.ten).toBe('Phòng giao dịch Mỹ Hào');
    // và không được đẻ ra dòng thi đua trùng nhãn với Phòng DVKH
    expect(danhSach.filter((p) => p.nhan === 'Phòng DVKH')).toHaveLength(1);
  });

  it('phòng ngừng sử dụng: rời ô chọn nhưng phiếu cũ vẫn được báo', () => {
    const danhBa = DANH_BA_THAT.map((p) =>
      p.ten === 'Phòng giao dịch Ân Thi' ? { ...p, dangDung: false } : p);
    const { danhSach, lech } = dungDanhMucPhongSao(danhBa, ['Phòng Ân Thi']);
    expect(nhanPhongDangDung(danhSach)).not.toContain('Phòng Ân Thi');
    expect(lech.find((l) => l.loai === 'phong-ngung-dung')?.ten).toBe('Phòng Ân Thi');
  });

  it('quân số đổi bậc phân bổ thì báo để TCTH cân nhắc khi giao sao quý sau', () => {
    // Phòng TCTH: văn bản tính 16 người (8 sao/quý = 32/năm), danh bạ nay còn 8 người
    const { lech } = dungDanhMucPhongSao(DANH_BA_THAT);
    const canhBao = lech.filter((l) => l.loai === 'lech-bac-phan-bo').map((l) => l.ten);
    expect(canhBao).toContain('Phòng TCTH');
    expect(canhBao).toContain('Phòng Khoái Châu'); // 10 → 9 người, tụt bậc 6 → 5
    expect(canhBao).not.toContain('Phòng DVKH');   // 13 người, vẫn đúng bậc 6 sao/quý
  });
});
