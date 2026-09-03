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
  | 'nuoi_duong'        // TCTH đưa vào nuôi dưỡng, có thể ghép với ý tưởng khác
  | 'dung'              // TCTH dừng ươm mầm (chưa khả thi)
  | 'da_rut';           // TCTH rút / thu hồi theo đường TSC

export interface DongSoBenRe {
  trangThai: 'cho_gd_duyet' | 'da_ghi_nhan' | 'tu_choi' | 'thu_hoi' | 'tra_ve' | 'da_bo_sung' | 'nuoi_duong' | 'dung';
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
  { ma: 'nuoi_duong', ten: 'Đang nuôi dưỡng', mau: 'bg-teal-100 text-teal-800' },
  { ma: 'dung', ten: 'Dừng ươm mầm', mau: 'bg-slate-200 text-slate-600' },
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
    case 'nuoi_duong': return 'nuoi_duong';
    case 'dung': return 'dung';
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

// ---------------------------------------------------------------------------
// HÀNH ĐỘNG NGAY TRÊN SỔ — Giám đốc (03/09/2026): «ấn vào sáng kiến luôn hoặc
// có nút thu hồi». Bảng này quyết mỗi dòng sổ bày nút gì cho ai; điều kiện
// trùng với các hàm gác CSDL (gd_thu_hoi, rut_ho_so, tra_ve_bo_sung,
// ket_luan_tcth) để nút không hiện ở chỗ CSDL sẽ từ chối.
// ---------------------------------------------------------------------------

export type HanhDongSo =
  | 'thu_hoi_cong_nhan'  // GĐ gỡ công nhận → về hàng chờ
  | 'mo_lai'             // GĐ mở lại hồ sơ đã kết luận chưa đạt → về hàng chờ
  | 'rut_ho_so'          // rút khỏi hàng chờ
  | 'tra_ve'             // trả về cán bộ bổ sung
  | 'nuoi_duong'
  | 'dung'
  | 'sang_hang_cho'      // liên kết sang tab duyệt (quyết định dứt điểm ở đó, có đồng hồ 3s)
  | 'sang_danh_gia';     // liên kết sang tab TCTH (chấm phiếu, trình)

export interface QuyenSo {
  laGiamDoc: boolean;
  laQuanTri: boolean;
}

export function hanhDongSoBenRe(
  d: DongSoBenRe & { daLenCapCaoHon?: boolean },
  q: QuyenSo,
): HanhDongSo[] {
  const ra: HanhDongSo[] = [];
  const tcthSuaDuoc = q.laQuanTri && !['da_ghi_nhan', 'cho_gd_duyet'].includes(d.trangThai);
  switch (d.trangThai) {
    case 'da_ghi_nhan':
      if (q.laGiamDoc && d.duyetCn && !d.duyetTsc && !d.daLenCapCaoHon) ra.push('thu_hoi_cong_nhan');
      break;
    case 'tu_choi':
      if (q.laGiamDoc) ra.push('mo_lai');
      if (q.laQuanTri) ra.push('sang_danh_gia');
      break;
    case 'cho_gd_duyet':
      if (q.laGiamDoc) ra.push('sang_hang_cho', 'tra_ve');
      if (q.laGiamDoc || q.laQuanTri) ra.push('rut_ho_so');
      break;
    default:
      if (q.laQuanTri) ra.push('sang_danh_gia');
  }
  if (tcthSuaDuoc) {
    if (d.trangThai !== 'tra_ve') ra.push('tra_ve');
    if (d.trangThai !== 'nuoi_duong') ra.push('nuoi_duong');
    if (d.trangThai !== 'dung') ra.push('dung');
  }
  return ra;
}
