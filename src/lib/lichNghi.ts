/**
 * Lịch nghỉ lễ dùng chung cho mọi phép đếm ngày làm việc phía client.
 *
 * VÌ SAO LÀ SỔ ĐĂNG KÝ CẤP MODULE chứ không phải tham số truyền vào:
 * `soNgayLamViec` nằm dưới đáy một chuỗi hàm thuần — `tuoiCho`, `soNgayImLang`,
 * `hsTuoiCho`, `diemRuiRo`, `sapXepThe`, `canhBaoHoSo`… Truyền lịch nghỉ qua
 * từng tầng nghĩa là sửa chữ ký của cả chục hàm và mọi nơi gọi chúng, chỉ để
 * chuyển một tập dữ liệu gần như không đổi. Đổi lại, mọi hàm vẫn nhận tham số
 * ghi đè tường minh để kiểm thử không phụ thuộc trạng thái toàn cục.
 *
 * Hàng rào thật vẫn ở database: `ct2_ngay_lam_viec` đọc thẳng bảng
 * `lich_nghi_le`. Sổ này chỉ để giao diện hiện đúng con số mà không phải hỏi
 * server cho từng thẻ.
 */

export type LoaiNgay = 'NGHI' | 'LAM_BU';

export interface NgayNghi {
  id: string;
  /** YYYY-MM-DD */
  ngay: string;
  loai: LoaiNgay;
  ten: string;
  nhom_id: string;
  ma_moc: string | null;
  ghi_chu: string | null;
}

/** Kỳ nghỉ = nhiều ngày liền nhau cùng một nhóm, gộp lại để hiển thị */
export interface KyNghi {
  nhom_id: string;
  ten: string;
  loai: LoaiNgay;
  tu: string;
  den: string;
  so_ngay: number;
  ma_moc: string | null;
  ghi_chu: string | null;
}

interface SoLich {
  nghi: Set<string>;
  lamBu: Set<string>;
}

let soHienTai: SoLich = { nghi: new Set(), lamBu: new Set() };

/** Nạp lịch nghỉ vào sổ dùng chung. Gọi một lần khi ứng dụng khởi động. */
export function datLichNghi(ds: Array<Pick<NgayNghi, 'ngay' | 'loai'>>): void {
  const nghi = new Set<string>();
  const lamBu = new Set<string>();
  for (const n of ds) {
    if (n.loai === 'LAM_BU') lamBu.add(n.ngay);
    else nghi.add(n.ngay);
  }
  soHienTai = { nghi, lamBu };
}

/** Xóa sổ — dùng trong kiểm thử để các bài không ảnh hưởng nhau */
export function xoaLichNghi(): void {
  soHienTai = { nghi: new Set(), lamBu: new Set() };
}

export function lichNghiHienTai(): SoLich {
  return soHienTai;
}

const hai = (n: number) => String(n).padStart(2, '0');

/** Đổi một mốc về chuỗi YYYY-MM-DD theo lịch Việt Nam */
export function ngayVnChuoi(moc: Date): string {
  const vn = new Date(moc.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  return `${vn.getFullYear()}-${hai(vn.getMonth() + 1)}-${hai(vn.getDate())}`;
}

/**
 * Một ngày cụ thể có phải ngày làm việc không.
 *
 * Thứ tự xét: ngày làm bù thắng tất cả (thứ Bảy đi làm theo điều động vẫn là
 * ngày làm việc), rồi mới đến ngày nghỉ lễ, cuối cùng mới xét thứ trong tuần.
 */
export function ngayLamViecTheoLich(
  ngay: string,
  thuTrongTuan: number,
  so: SoLich = soHienTai,
): boolean {
  if (so.lamBu.has(ngay)) return true;
  if (so.nghi.has(ngay)) return false;
  return thuTrongTuan !== 0 && thuTrongTuan !== 6;
}

/** Gộp các ngày rời thành kỳ nghỉ để hiển thị trên trang quản trị */
export function gopThanhKy(ds: NgayNghi[]): KyNghi[] {
  const theoNhom = new Map<string, NgayNghi[]>();
  for (const n of ds) {
    const cu = theoNhom.get(n.nhom_id) ?? [];
    cu.push(n);
    theoNhom.set(n.nhom_id, cu);
  }
  return [...theoNhom.values()]
    .map((nhom) => {
      const xep = [...nhom].sort((a, b) => a.ngay.localeCompare(b.ngay));
      const dau = xep[0];
      return {
        nhom_id: dau.nhom_id,
        ten: dau.ten,
        loai: dau.loai,
        tu: dau.ngay,
        den: xep[xep.length - 1].ngay,
        so_ngay: xep.length,
        ma_moc: dau.ma_moc,
        ghi_chu: dau.ghi_chu,
      };
    })
    .sort((a, b) => a.tu.localeCompare(b.tu));
}

/** «30/04/2026» hoặc «30/04 – 03/05/2026» cho một kỳ */
export function nhanKhoangNgay(tu: string, den: string): string {
  const [ny, nm, nd] = tu.split('-');
  const [dy, dm, dd] = den.split('-');
  if (tu === den) return `${nd}/${nm}/${ny}`;
  if (ny === dy) return `${nd}/${nm} – ${dd}/${dm}/${dy}`;
  return `${nd}/${nm}/${ny} – ${dd}/${dm}/${dy}`;
}
