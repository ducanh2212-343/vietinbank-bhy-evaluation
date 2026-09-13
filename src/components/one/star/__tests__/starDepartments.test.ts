import { describe, expect, it } from 'vitest';
import {
  bacPhanBoTheoQuanSo, dungDanhMucPhongSao, gomNhanPhongCu, laLechCanXuLy,
  nhanPhongDangDung, quyVeNhanSao,
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
  it('Ban Giám đốc là một tập thể trong danh mục (PGĐ nhận sao cá nhân phải có chỗ), không có hạn mức, không báo lệch', () => {
    const { danhSach, lech } = dungDanhMucPhongSao(DANH_BA_THAT);
    const bgd = danhSach.find((p) => p.nhan === 'Ban Giám đốc');
    expect(bgd).toBeDefined();
    expect(bgd!.hanMucNam).toBeNull();
    expect(lech.filter((l) => l.ten === 'Ban Giám đốc')).toHaveLength(0);
  });

  it('11 đơn vị thật đều ra đúng nhãn Sao, không đơn vị nào bị bỏ sót', () => {
    const { danhSach } = dungDanhMucPhongSao(DANH_BA_THAT);
    expect(danhSach.map((p) => p.nhan).sort()).toEqual([
      'Ban Giám đốc', 'PGD Ocean City', 'Phòng Bán lẻ', 'Phòng DVKH', 'Phòng HTTD', 'Phòng KHDN',
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

  it('tổ trong danh mục star_sub_units (Tổ FDI, Tổ truyền thông) không phải phòng — không coi là lệch', () => {
    const { lech } = dungDanhMucPhongSao(DANH_BA_THAT, ['Tổ FDI', 'Tổ truyền thông'], ['Tổ FDI', 'Tổ truyền thông']);
    expect(lech.filter((l) => l.loai === 'nhan-khong-con-phong')).toHaveLength(0);
  });

  it('nhãn tổ trên phiếu mà KHÔNG có trong danh mục thì vẫn báo — chống tổ tự phát', () => {
    const { lech } = dungDanhMucPhongSao(DANH_BA_THAT, ['Tổ Bí Ẩn'], ['Tổ FDI']);
    expect(lech.find((l) => l.loai === 'nhan-khong-con-phong')?.ten).toBe('Tổ Bí Ẩn');
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

describe('phân loại lệch: sai dữ liệu vs chênh quân số', () => {
  it('chênh quân số KHÔNG nằm trong nhóm cần xử lý — giữ hạn mức cũ là hợp lệ', () => {
    const { lech } = dungDanhMucPhongSao(DANH_BA_THAT);
    const chenhQuanSo = lech.filter((l) => l.loai === 'lech-bac-phan-bo');
    expect(chenhQuanSo.length).toBeGreaterThan(0);
    expect(chenhQuanSo.every((l) => !laLechCanXuLy(l))).toBe(true);
    // và danh bạ chuẩn thì không còn lệch nào phải xử lý
    expect(lech.filter(laLechCanXuLy)).toHaveLength(0);
  });

  it('lệch làm sai dữ liệu thì nằm trong nhóm cần xử lý', () => {
    const danhBa = [...DANH_BA_THAT, { ten: 'Phòng giao dịch Mỹ Hào', dangDung: true, quanSo: 8 }];
    const { lech } = dungDanhMucPhongSao(danhBa, ['Phòng Yên Mỹ']);
    const canXuLy = lech.filter(laLechCanXuLy).map((l) => l.loai);
    expect(canXuLy).toContain('nhan-trung-phong');
    expect(canXuLy).toContain('nhan-khong-con-phong');
  });
});

describe('quyVeNhanSao — mọi cách viết tên phòng về một nhãn (TCTH báo 04/09)', () => {
  it('tên danh bạ đầy đủ và nhãn Sao rút gọn ra CÙNG một dòng thi đua', () => {
    // Ca thật: phiếu nhập bù ghi "Phòng Dịch vụ khách hàng" (tên danh bạ) trong khi
    // 19 phiếu cũ ghi "Phòng DVKH" → bảng thi đua ra hai dòng DVKH.
    expect(quyVeNhanSao('Phòng Dịch vụ khách hàng')).toBe('Phòng DVKH');
    expect(quyVeNhanSao('Phòng DVKH')).toBe('Phòng DVKH');
  });

  it('tên cũ trước khi đổi cũng về nhãn mới — Yên Mỹ và Ocean City là một đơn vị', () => {
    expect(quyVeNhanSao('Phòng Yên Mỹ')).toBe('PGD Ocean City');
    expect(quyVeNhanSao('Phòng giao dịch Yên Mỹ')).toBe('PGD Ocean City');
    expect(quyVeNhanSao('Phòng giao dịch Ocean City')).toBe('PGD Ocean City');
    expect(quyVeNhanSao('PGD Ocean City')).toBe('PGD Ocean City');
  });

  it('cả năm phòng giao dịch về đúng nhãn riêng, không dồn về DVKH', () => {
    expect(quyVeNhanSao('Phòng giao dịch Ân Thi')).toBe('Phòng Ân Thi');
    expect(quyVeNhanSao('Phòng giao dịch Khoái Châu')).toBe('Phòng Khoái Châu');
    expect(quyVeNhanSao('Phòng giao dịch Văn Giang')).toBe('Phòng Văn Giang');
    expect(quyVeNhanSao('Phòng giao dịch Văn Lâm')).toBe('Phòng Văn Lâm');
  });

  it('không nhận ra thì giữ nguyên chuỗi, không đoán bừa và không làm mất phiếu', () => {
    expect(quyVeNhanSao('Tổ FDI')).toBe('Tổ FDI');
    expect(quyVeNhanSao('Tổ truyền thông')).toBe('Tổ truyền thông');
    expect(quyVeNhanSao('Phòng Chưa Có Trong Luật')).toBe('Phòng Chưa Có Trong Luật');
  });
});

describe('gomNhanPhongCu — chỉ ra phiếu còn lưu chữ cũ để TCTH dọn dữ liệu', () => {
  const p = (departmentGoc: string) => ({ departmentGoc, department: quyVeNhanSao(departmentGoc) });

  it('đếm theo từng cặp chữ cũ → nhãn mới, nhiều phiếu nhất lên đầu', () => {
    const kq = gomNhanPhongCu([
      p('Phòng Dịch vụ khách hàng'),
      p('Phòng Yên Mỹ'), p('Phòng Yên Mỹ'), p('Phòng Yên Mỹ'),
      p('Phòng DVKH'), p('PGD Ocean City'),
    ]);
    expect(kq).toEqual([
      { nhanCu: 'Phòng Yên Mỹ', nhanMoi: 'PGD Ocean City', soPhieu: 3 },
      { nhanCu: 'Phòng Dịch vụ khách hàng', nhanMoi: 'Phòng DVKH', soPhieu: 1 },
    ]);
  });

  it('phiếu đã đúng nhãn thì không báo gì — không làm nhiễu màn quản lý', () => {
    expect(gomNhanPhongCu([p('Phòng DVKH'), p('Phòng TCTH'), p('Tổ FDI')])).toEqual([]);
  });
});
