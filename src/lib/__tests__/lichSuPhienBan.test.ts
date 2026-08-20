// Hàng rào cho quy ước lịch sử phiên bản.
//
// Đây là chỗ biến "nguyên tắc" thành thứ MÁY KIỂM TRA ĐƯỢC: một phiên làm việc
// khác, một PR khác, người viết đọc lướt tài liệu rồi thêm mục sai quy ước thì
// `npm run test` đỏ ngay, không phải chờ người rà. Không có hàng rào này thì
// mọi nguyên tắc chỉ là lời khuyên — và bản cũ đã chứng minh lời khuyên không
// giữ nổi lịch sử phiên bản khỏi việc đứng yên 6 tuần.
import { describe, it, expect } from 'vitest';
import {
  LICH_SU_PHIEN_BAN, MUC_THEO_FILE, CAC_PHAN_HE,
  tinhPhienBan, mucChuaXem, soanTinCongBo, dangKeVoiCanBo, ngayVietNam,
  type MucLichSu,
} from '../lichSuPhienBan';

const NGAY_AP_QUY_UOC_MOI = '2026-08-19'; // từ ngày dựng lại tính năng này

function tenFile(duongDan: string): string {
  return duongDan.split('/').pop()!.replace(/\.ts$/, '');
}

describe('quy ước khai báo mục lịch sử', () => {
  it('có mục và mọi mục đều đủ trường bắt buộc', () => {
    expect(LICH_SU_PHIEN_BAN.length).toBeGreaterThan(0);
    for (const m of LICH_SU_PHIEN_BAN) {
      expect(m.ma, `mã mục: ${m.tieuDe}`).toMatch(/^[a-z0-9-]+$/);
      expect(m.ngay, `ngày của ${m.ma}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(m.ngay)), `ngày không hợp lệ: ${m.ma}`).toBe(false);
      expect(CAC_PHAN_HE, `phân hệ lạ ở ${m.ma}`).toContain(m.phanHe);
      expect(m.tieuDe.trim().length, `tiêu đề rỗng ở ${m.ma}`).toBeGreaterThan(0);
      expect(m.tomTat.trim().length, `tóm tắt rỗng ở ${m.ma}`).toBeGreaterThan(0);
    }
  });

  it('tiêu đề đủ ngắn để không gãy dòng trên điện thoại (≤ 80 ký tự)', () => {
    for (const m of LICH_SU_PHIEN_BAN) {
      expect(m.tieuDe.length, `tiêu đề dài quá: ${m.ma}`).toBeLessThanOrEqual(80);
    }
  });

  it('mỗi mục có 1–5 điểm chính, không có dòng rỗng', () => {
    for (const m of LICH_SU_PHIEN_BAN) {
      expect(m.diemChinh.length, `điểm chính của ${m.ma}`).toBeGreaterThanOrEqual(1);
      expect(m.diemChinh.length, `${m.ma} liệt kê quá 5 điểm chính`).toBeLessThanOrEqual(5);
      for (const d of m.diemChinh) expect(d.trim().length).toBeGreaterThan(0);
    }
  });

  it('mã mục là duy nhất', () => {
    const ds = LICH_SU_PHIEN_BAN.map((m) => m.ma);
    expect(new Set(ds).size, `có mã trùng: ${ds.filter((x, i) => ds.indexOf(x) !== i)}`)
      .toBe(ds.length);
  });

  it('mỗi file một mục, mã mục trùng tên file (file lưu trữ lịch sử cũ là ngoại lệ)', () => {
    for (const [duongDan, ds] of Object.entries(MUC_THEO_FILE)) {
      const ten = tenFile(duongDan);
      if (ten.startsWith('0000-')) continue; // file lưu trữ các mục trước 07/2026
      expect(ds.length, `${ten} phải chứa đúng 1 mục`).toBe(1);
      expect(ds[0].ma, `mã mục phải trùng tên file ${ten}`).toBe(ten);
    }
  });

  it('mục mới KHÔNG được đặt tay số phiên bản', () => {
    for (const m of LICH_SU_PHIEN_BAN) {
      if (m.ngay >= NGAY_AP_QUY_UOC_MOI) {
        expect(
          m.phienBanCoDinh,
          `${m.ma}: bỏ phienBanCoDinh đi — để hệ thống tự tính thì hai nhánh song song mới không giẫm lên nhau`,
        ).toBeUndefined();
      }
    }
  });

  it('không có mục nào ghi ngày ở tương lai xa (gõ nhầm năm)', () => {
    const hanTren = new Date();
    hanTren.setFullYear(hanTren.getFullYear() + 1);
    for (const m of LICH_SU_PHIEN_BAN) {
      expect(new Date(m.ngay).getTime(), `ngày sai ở ${m.ma}`).toBeLessThan(hanTren.getTime());
    }
  });
});

describe('tính số phiên bản', () => {
  it('mới nhất đứng đầu và số phiên bản không trùng nhau', () => {
    const ds = LICH_SU_PHIEN_BAN.map((m) => m.phienBan);
    expect(new Set(ds).size).toBe(ds.length);
    for (let i = 1; i < LICH_SU_PHIEN_BAN.length; i++) {
      expect(LICH_SU_PHIEN_BAN[i].ngay <= LICH_SU_PHIEN_BAN[i - 1].ngay).toBe(true);
    }
  });

  it('bump đúng vị trí theo loại thay đổi', () => {
    const goc: MucLichSu[] = [
      { ma: 'a', ngay: '2026-01-01', loai: 'lon', phanHe: 'nen-tang', tieuDe: 'A', tomTat: 'a', diemChinh: ['x'] },
      { ma: 'b', ngay: '2026-01-02', loai: 'tinh-nang', phanHe: 'nen-tang', tieuDe: 'B', tomTat: 'b', diemChinh: ['x'] },
      { ma: 'c', ngay: '2026-01-03', loai: 'sua-loi', phanHe: 'nen-tang', tieuDe: 'C', tomTat: 'c', diemChinh: ['x'] },
      { ma: 'd', ngay: '2026-01-04', loai: 'lon', phanHe: 'nen-tang', tieuDe: 'D', tomTat: 'd', diemChinh: ['x'] },
    ];
    expect(tinhPhienBan(goc).map((m) => `${m.ma}:${m.phienBan}`))
      .toEqual(['d:2.0.0', 'c:1.1.1', 'b:1.1.0', 'a:1.0.0']);
  });

  it('hai phiên làm việc thêm mục cùng ngày vẫn ra cùng kết quả dù thứ tự file khác nhau', () => {
    const x: MucLichSu = { ma: '2026-02-01-alpha', ngay: '2026-02-01', loai: 'tinh-nang', phanHe: 'nen-tang', tieuDe: 'X', tomTat: 'x', diemChinh: ['x'] };
    const y: MucLichSu = { ma: '2026-02-01-beta', ngay: '2026-02-01', loai: 'tinh-nang', phanHe: 'nen-tang', tieuDe: 'Y', tomTat: 'y', diemChinh: ['y'] };
    const goc: MucLichSu = { ma: '2026-01-01-goc', ngay: '2026-01-01', loai: 'lon', phanHe: 'nen-tang', tieuDe: 'G', tomTat: 'g', diemChinh: ['g'] };
    const a = tinhPhienBan([goc, x, y]).map((m) => `${m.ma}:${m.phienBan}`);
    const b = tinhPhienBan([y, goc, x]).map((m) => `${m.ma}:${m.phienBan}`);
    expect(a).toEqual(b);
    expect(a).toEqual(['2026-02-01-beta:1.2.0', '2026-02-01-alpha:1.1.0', '2026-01-01-goc:1.0.0']);
  });

  it('mục lịch sử cũ giữ nguyên số phiên bản đã từng hiện cho cán bộ', () => {
    const cu = LICH_SU_PHIEN_BAN.find((m) => m.ma === '2026-07-05-tu-dien-level-hien-tai');
    expect(cu?.phienBan).toBe('3.1.1');
  });

  it('ngày hiển thị theo kiểu Việt Nam', () => {
    expect(ngayVietNam('2026-08-19')).toBe('19/08/2026');
  });
});

describe('đánh dấu đã xem', () => {
  const ds = tinhPhienBan([
    { ma: 'm1', ngay: '2026-01-01', loai: 'lon', phanHe: 'nen-tang', tieuDe: '1', tomTat: '1', diemChinh: ['x'] },
    { ma: 'm2', ngay: '2026-01-02', loai: 'tinh-nang', phanHe: 'nen-tang', tieuDe: '2', tomTat: '2', diemChinh: ['x'] },
    { ma: 'm3', ngay: '2026-01-03', loai: 'sua-loi', phanHe: 'nen-tang', tieuDe: '3', tomTat: '3', diemChinh: ['x'] },
  ]);

  it('chỉ trả về mục mới hơn mốc đã xem', () => {
    expect(mucChuaXem(ds, 'm1').map((m) => m.ma)).toEqual(['m3', 'm2']);
    expect(mucChuaXem(ds, 'm3')).toEqual([]);
  });

  it('người chưa có mốc thì KHÔNG bị dội cả lịch sử', () => {
    expect(mucChuaXem(ds, null)).toEqual([]);
  });

  it('mốc trỏ vào mục đã bị gỡ thì coi như đã xem hết, không dội lại', () => {
    expect(mucChuaXem(ds, 'mat-tieu')).toEqual([]);
  });

  it('lọc theo vai trò của người đọc', () => {
    const riengAdmin = tinhPhienBan([
      { ma: 'chung', ngay: '2026-01-01', loai: 'lon', phanHe: 'nen-tang', tieuDe: 'c', tomTat: 'c', diemChinh: ['x'] },
      { ma: 'admin', ngay: '2026-01-02', loai: 'tinh-nang', phanHe: 'user-admin', tieuDe: 'a', tomTat: 'a', diemChinh: ['x'], danhCho: ['tcth_admin'] },
    ]);
    expect(mucChuaXem(riengAdmin, 'chung', ['employee'])).toEqual([]);
    expect(mucChuaXem(riengAdmin, 'chung', ['tcth_admin']).map((m) => m.ma)).toEqual(['admin']);
  });
});

describe('soạn tin công bố', () => {
  const lon: MucLichSu = { ma: 'a', ngay: '2026-03-02', loai: 'lon', phanHe: 'nen-tang', tieuDe: 'Bàn làm việc mới', tomTat: 't', diemChinh: ['x'] };
  const nho: MucLichSu = { ma: 'b', ngay: '2026-03-01', loai: 'sua-loi', phanHe: 'nen-tang', tieuDe: 'Sửa lỗi lặt vặt', tomTat: 't', diemChinh: ['x'] };

  it('bỏ qua bản sửa lỗi — chỉ sửa lỗi thì KHÔNG báo gì', () => {
    expect(dangKeVoiCanBo(nho)).toBe(false);
    expect(soanTinCongBo(tinhPhienBan([nho]))).toBeNull();
  });

  it('một đợt nhiều mục gộp thành MỘT tin, mỗi dòng một nhãn', () => {
    const nhieu = tinhPhienBan([
      lon,
      { ...lon, ma: 'c', ngay: '2026-03-03', tieuDe: 'Thêm màn hình duyệt', loai: 'tinh-nang' },
      { ...lon, ma: 'd', ngay: '2026-03-04', tieuDe: 'Nhắc nhịp buổi sáng', loai: 'tinh-nang' },
      { ...lon, ma: 'e', ngay: '2026-03-05', tieuDe: 'Bảng nhịp của phòng', loai: 'tinh-nang' },
      nho,
    ]);
    const tin = soanTinCongBo(nhieu)!;
    expect(tin.tieuDe).toBe('Hệ thống có 4 tính năng mới');
    const dong = tin.noiDung.split('\n');
    expect(dong[0]).toMatch(/^Mới 1: /);
    expect(dong[3]).toBe('Và 1 cập nhật khác.');
    expect(dong[4]).toContain('Có gì mới');
    // Mục sửa lỗi vẫn được đánh dấu là đã công bố để không tồn lại mãi
    expect(tin.cacMa).toContain('b');
  });

  it('một mục thì tiêu đề nói thẳng tên tính năng', () => {
    const tin = soanTinCongBo(tinhPhienBan([lon]))!;
    expect(tin.tieuDe).toBe('Hệ thống có tính năng mới: Bàn làm việc mới');
    expect(tin.noiDung.split('\n')[0]).toBe('Mới: Bàn làm việc mới');
  });
});
