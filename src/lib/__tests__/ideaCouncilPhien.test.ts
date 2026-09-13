import { describe, it, expect } from 'vitest';
import {
  BO_LOC_RONG,
  danhSachPhong,
  dangLoc,
  demTheoPhien,
  khongDau,
  locYTuongCham,
  phienDangTrinh,
  phienMacDinh,
  sapXepPhien,
  tinhTrangCham,
  MAU_THE_CHAM,
  type PhienTrinhBay,
  type YTuongLocDuoc,
} from '../ideaCouncilPhien';

const yt = (
  ma: string,
  title: string,
  proposer: string,
  phong: string,
  sessionId: string | null = null,
  vote: 'draft' | 'submitted' | null = null,
): YTuongLocDuoc => ({
  ideaCode: ma,
  sessionId,
  idea: { title, proposer, departmentName: phong },
  myVote: vote ? { status: vote } : null,
});

// Lấy từ đợt thật «Tháng 6,7,8» — nơi bốn ý tưởng cùng mở đầu «Xây dựng Dashboard»
const DS: YTuongLocDuoc[] = [
  yt('BHYI-2026-001', 'Xây dựng Dashboard quản lý chất lượng nợ', 'Chu Thị Thủy', 'Phòng TCTH', 'p1', 'submitted'),
  yt('BHYI-2026-004', 'Xây dựng Dashboard tự động tổng hợp số liệu phục vụ họp tuần', 'Lê Văn Trưởng', 'Phòng KHDN', 'p1'),
  yt('BHYI-2026-007', 'Xây dựng Tool/Dashboard/app hỗ trợ học và ghi nhớ từ vựng tiếng Trung', 'Hàn Thị Thùy Linh', 'Phòng KHDN', 'p2', 'draft'),
  yt('BHYI-2026-011', 'Xây dựng website nội bộ Chi nhánh', 'Nguyễn Thị Phượng', 'Phòng TCTH'),
  yt('BHYI-2026-013', 'Vcard dạng QR quét bằng Camera', 'Hoàng Trung Tuấn', 'PGD Văn Giang', 'p2'),
];

const loc = (p: Partial<typeof BO_LOC_RONG>) => ({ ...BO_LOC_RONG, ...p });
const ma = (ds: YTuongLocDuoc[]) => ds.map(d => d.ideaCode);

describe('khongDau', () => {
  it('bỏ dấu và hạ chữ thường', () => {
    expect(khongDau('Nguyễn Thị Phượng')).toBe('nguyen thi phuong');
    expect(khongDau('PGD Văn Giang')).toBe('pgd van giang');
  });

  it('xử lý được chữ đ — NFD không tách được nên phải thay tay', () => {
    expect(khongDau('Đặng Thị Quỳnh Nga')).toBe('dang thi quynh nga');
  });
});

describe('locYTuongCham', () => {
  it('không lọc gì thì giữ nguyên danh sách', () => {
    expect(locYTuongCham(DS, BO_LOC_RONG)).toHaveLength(5);
    expect(dangLoc(BO_LOC_RONG)).toBe(false);
  });

  it('tìm theo tên người đề xuất KHÔNG DẤU — cán bộ gõ nhanh không bỏ dấu', () => {
    expect(ma(locYTuongCham(DS, loc({ tuKhoa: 'phuong' })))).toEqual(['BHYI-2026-011']);
  });

  it('tìm theo mã ý tưởng, gõ phần đuôi cũng ra', () => {
    expect(ma(locYTuongCham(DS, loc({ tuKhoa: '013' })))).toEqual(['BHYI-2026-013']);
  });

  it('nhiều mảnh từ khóa phải cùng khớp, không cần liền nhau', () => {
    // «linh dashboard» = ý tưởng của chị Linh có chữ dashboard
    expect(ma(locYTuongCham(DS, loc({ tuKhoa: 'linh dashboard' })))).toEqual(['BHYI-2026-007']);
  });

  it('lọc theo phòng đề xuất', () => {
    expect(ma(locYTuongCham(DS, loc({ phong: 'Phòng TCTH' }))))
      .toEqual(['BHYI-2026-001', 'BHYI-2026-011']);
  });

  it('lọc theo phiên trình bày', () => {
    expect(ma(locYTuongCham(DS, loc({ phienId: 'p1' }))))
      .toEqual(['BHYI-2026-001', 'BHYI-2026-004']);
  });

  it('lọc theo trạng thái chấm của chính mình', () => {
    expect(ma(locYTuongCham(DS, loc({ trangThaiCham: 'chua_cham' }))))
      .toEqual(['BHYI-2026-004', 'BHYI-2026-011', 'BHYI-2026-013']);
    expect(ma(locYTuongCham(DS, loc({ trangThaiCham: 'nhap' })))).toEqual(['BHYI-2026-007']);
    expect(ma(locYTuongCham(DS, loc({ trangThaiCham: 'da_gui' })))).toEqual(['BHYI-2026-001']);
  });

  it('chồng nhiều tiêu chí: phiên + phòng', () => {
    expect(ma(locYTuongCham(DS, loc({ phienId: 'p1', phong: 'Phòng KHDN' }))))
      .toEqual(['BHYI-2026-004']);
  });
});

describe('danhSachPhong', () => {
  it('đếm theo phòng, phòng nhiều ý tưởng đứng trước', () => {
    expect(danhSachPhong(DS)).toEqual([
      { ten: 'Phòng KHDN', so: 2 },
      { ten: 'Phòng TCTH', so: 2 },
      { ten: 'PGD Văn Giang', so: 1 },
    ]);
  });
});

describe('phiên trình bày', () => {
  const phien = (id: string, thuTu: number, trangThai: PhienTrinhBay['trangThai']): PhienTrinhBay => ({
    id, roundId: 'r', ten: `Phiên ${thuTu}`, thuTu, trangThai,
    batDauLuc: null, ketThucLuc: null, ghiChu: null,
  });

  it('tìm đúng phiên đang trình bày', () => {
    const ds = [phien('p1', 1, 'da_xong'), phien('p2', 2, 'dang_trinh'), phien('p3', 3, 'cho')];
    expect(phienDangTrinh(ds)?.id).toBe('p2');
    expect(phienMacDinh(ds)).toBe('p2');
  });

  it('chưa mở phiên nào thì màn chấm hiện toàn đợt', () => {
    expect(phienMacDinh([phien('p1', 1, 'cho')])).toBeNull();
    expect(phienDangTrinh([])).toBeNull();
  });

  it('sắp xếp theo thứ tự trình bày', () => {
    const ds = [phien('p3', 3, 'cho'), phien('p1', 1, 'cho'), phien('p2', 2, 'cho')];
    expect(sapXepPhien(ds).map(p => p.id)).toEqual(['p1', 'p2', 'p3']);
  });

  it('đếm ý tưởng theo phiên, kể cả nhóm chưa xếp phiên', () => {
    const dem = demTheoPhien(DS);
    expect(dem.get('p1')).toBe(2);
    expect(dem.get('p2')).toBe(2);
    expect(dem.get(null)).toBe(1);
  });
});

describe('màu thẻ theo tình trạng chấm', () => {
  it('chưa có phiếu là chưa chấm', () => {
    expect(tinhTrangCham(null)).toBe('chua_cham');
  });

  it('nháp và đã gửi là hai màu khác nhau — nhìn viền là biết', () => {
    expect(tinhTrangCham({ status: 'draft' })).toBe('nhap');
    expect(tinhTrangCham({ status: 'submitted' })).toBe('da_gui');
    expect(MAU_THE_CHAM.nhap.the).not.toBe(MAU_THE_CHAM.da_gui.the);
    expect(MAU_THE_CHAM.chua_cham.the).not.toBe(MAU_THE_CHAM.da_gui.the);
  });
});
