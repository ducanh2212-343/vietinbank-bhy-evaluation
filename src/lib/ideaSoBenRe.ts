// Phân loại một dòng sổ Bén rễ theo NGUỒN công nhận và TRẠNG THÁI luân chuyển.
//
// Vì sao cần bảng phân loại riêng: sổ chỉ có bốn cột thô (trang_thai, duyet_cn,
// duyet_tsc, tra_ve_boi) mà người đọc thì hỏi những câu khác hẳn — «cái nào do
// Giám đốc duyệt, cái nào do Trụ sở chính đồng ý, cái nào TCTH trả về, cái nào
// Giám đốc trả về». Gom luật vào một chỗ để tab Sổ Bén rễ, bộ đếm và test cùng
// nhìn một bảng, không mỗi nơi tự suy một kiểu.

export type NhomSoBenRe =
  | 'cong_nhan_gd'      // Giám đốc duyệt (đường Chi nhánh)
  | 'cong_nhan_tsc'     // Trụ sở chính đồng ý trên SMP (đường TSC)
  | 'cong_nhan_ca_hai'  // cả hai nơi cùng công nhận
  | 'cho_gd'            // TCTH đã trình, đang chờ Giám đốc
  | 'tcth_tra_ve'       // TCTH trả về cán bộ bổ sung
  | 'gd_tra_ve'         // Giám đốc trả về cán bộ bổ sung
  | 'da_bo_sung'        // cán bộ đã gửi lại, chờ TCTH đánh giá lại
  | 'chua_dat'          // Giám đốc kết luận chưa đạt (dừng)
  | 'da_rut';           // TCTH rút / thu hồi theo đường TSC

export interface DongSoBenRe {
  trangThai: 'cho_gd_duyet' | 'da_ghi_nhan' | 'tu_choi' | 'thu_hoi' | 'tra_ve' | 'da_bo_sung';
  duyetCn: boolean;
  duyetTsc: boolean;
  traVeBoi: 'tcth' | 'gd' | null;
}

export const NHOM_SO_BEN_RE: { ma: NhomSoBenRe; ten: string; mau: string }[] = [
  { ma: 'cong_nhan_gd', ten: 'Giám đốc duyệt', mau: 'bg-emerald-100 text-emerald-800' },
  { ma: 'cong_nhan_tsc', ten: 'TSC đồng ý', mau: 'bg-sky-100 text-sky-800' },
  { ma: 'cong_nhan_ca_hai', ten: 'Cả hai nơi', mau: 'bg-teal-100 text-teal-800' },
  { ma: 'cho_gd', ten: 'Chờ Giám đốc', mau: 'bg-amber-100 text-amber-800' },
  { ma: 'da_bo_sung', ten: 'Đã bổ sung', mau: 'bg-violet-100 text-violet-800' },
  { ma: 'tcth_tra_ve', ten: 'TCTH trả về', mau: 'bg-orange-100 text-orange-800' },
  { ma: 'gd_tra_ve', ten: 'Giám đốc trả về', mau: 'bg-rose-100 text-rose-800' },
  { ma: 'chua_dat', ten: 'Chưa đạt', mau: 'bg-slate-200 text-slate-700' },
  { ma: 'da_rut', ten: 'Đã rút', mau: 'bg-slate-100 text-slate-500' },
];

export function phanLoaiSoBenRe(d: DongSoBenRe): NhomSoBenRe {
  switch (d.trangThai) {
    case 'da_ghi_nhan':
      if (d.duyetCn && d.duyetTsc) return 'cong_nhan_ca_hai';
      if (d.duyetTsc) return 'cong_nhan_tsc';
      return 'cong_nhan_gd';
    case 'cho_gd_duyet': return 'cho_gd';
    case 'tra_ve': return d.traVeBoi === 'gd' ? 'gd_tra_ve' : 'tcth_tra_ve';
    case 'da_bo_sung': return 'da_bo_sung';
    case 'tu_choi': return 'chua_dat';
    case 'thu_hoi': return 'da_rut';
  }
}

export function tenNhomSoBenRe(ma: NhomSoBenRe): string {
  return NHOM_SO_BEN_RE.find(n => n.ma === ma)?.ten ?? ma;
}

/** Đếm theo nhóm — nhóm trống vẫn có mặt để bộ lọc không «mất» mục */
export function demTheoNhom(ds: DongSoBenRe[]): Record<NhomSoBenRe, number> {
  const dem = Object.fromEntries(NHOM_SO_BEN_RE.map(n => [n.ma, 0])) as Record<NhomSoBenRe, number>;
  for (const d of ds) dem[phanLoaiSoBenRe(d)] += 1;
  return dem;
}
