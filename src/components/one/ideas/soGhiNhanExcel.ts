import type { DongSoGhiNhan } from './useBenRe';

// Kết xuất SỔ GHI NHẬN mọi cấp — yêu cầu Giám đốc 03/09/2026: quản trị tổng hợp
// được chi tiết kết quả đánh giá theo từng cấp độ, phân biệt Bén rễ do Trụ sở
// chính phê duyệt với Bén rễ do Giám đốc Chi nhánh duyệt.
//
// Phần tính toán thuần (tongHopSoGhiNhan) tách khỏi ExcelJS để test được;
// phần dựng file nhập thư viện động như ideasExcel.ts để không nặng bundle.

export const TEN_NGUON: Record<DongSoGhiNhan['nguonCongNhan'], string> = {
  giam_doc: 'Giám đốc CN duyệt (nội bộ)',
  tsc: 'Trụ sở chính đồng ý (SMP)',
  ca_hai: 'Cả Giám đốc CN và TSC',
  chi_nhanh: 'Chi nhánh ghi nhận',
  hoi_dong: 'Hội đồng BHY Ideas',
  '': '',
};

export const TEN_TRANG_THAI: Record<string, string> = {
  da_ghi_nhan: 'Đã công nhận',
  cho_gd_duyet: 'Chờ Giám đốc',
  tu_choi: 'Chưa đạt',
  thu_hoi: 'Đã rút / thu hồi',
  tra_ve: 'Trả về bổ sung',
  da_bo_sung: 'Đã bổ sung, chờ chấm lại',
  nuoi_duong: 'Đang nuôi dưỡng',
  dung: 'Dừng ươm mầm',
};

const THU_TU_CAP = ['Ươm mầm', 'Bén rễ', 'Vươn cành', 'Lan tỏa'];

export interface DongTongHop {
  capDo: string;
  nguon: string;
  soYTuong: number;
  tinhKpi: number;
  tongTien: number;
}

/** Tổng hợp theo cấp × nguồn — chỉ dòng ĐÃ công nhận, đúng câu Giám đốc hỏi */
export function tongHopSoGhiNhan(rows: DongSoGhiNhan[]): DongTongHop[] {
  const gom = new Map<string, DongTongHop>();
  for (const r of rows) {
    if (r.trangThai !== 'da_ghi_nhan') continue;
    const key = `${r.capDo}|${r.nguonCongNhan}`;
    const d = gom.get(key) ?? { capDo: r.capDo, nguon: TEN_NGUON[r.nguonCongNhan] || 'Khác', soYTuong: 0, tinhKpi: 0, tongTien: 0 };
    d.soYTuong += 1;
    if (r.ghiNhanKpi) d.tinhKpi += 1;
    d.tongTien += r.mucThuong;
    gom.set(key, d);
  }
  return [...gom.values()].sort((a, b) =>
    THU_TU_CAP.indexOf(a.capDo) - THU_TU_CAP.indexOf(b.capDo) || a.nguon.localeCompare(b.nguon, 'vi'));
}

/** Tổng hợp theo phòng × cấp (đã công nhận) — để so giữa các phòng */
export function tongHopTheoPhong(rows: DongSoGhiNhan[]): { phong: string; theoCap: Record<string, number>; tien: number }[] {
  const gom = new Map<string, { phong: string; theoCap: Record<string, number>; tien: number }>();
  for (const r of rows) {
    if (r.trangThai !== 'da_ghi_nhan') continue;
    const d = gom.get(r.phong) ?? { phong: r.phong, theoCap: {}, tien: 0 };
    d.theoCap[r.capDo] = (d.theoCap[r.capDo] ?? 0) + 1;
    d.tien += r.mucThuong;
    gom.set(r.phong, d);
  }
  return [...gom.values()].sort((a, b) => a.phong.localeCompare(b.phong, 'vi'));
}

const ngay = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : '');

export async function downloadSoGhiNhanExcel(rows: DongSoGhiNhan[]): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BHY ONE';
  wb.created = new Date();

  const dauBang = (ws: import('exceljs').Worksheet) => {
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
  };

  // Sheet 1 — tổng hợp theo cấp × nguồn
  const ws1 = wb.addWorksheet('Tổng hợp theo nguồn');
  ws1.columns = [
    { header: 'Cấp độ', key: 'capDo', width: 14 },
    { header: 'Nguồn công nhận', key: 'nguon', width: 32 },
    { header: 'Số ý tưởng', key: 'soYTuong', width: 12 },
    { header: 'Tính KPI', key: 'tinhKpi', width: 10 },
    { header: 'Tổng tiền (đ)', key: 'tongTien', width: 16 },
  ];
  for (const d of tongHopSoGhiNhan(rows)) ws1.addRow(d);
  ws1.getColumn('tongTien').numFmt = '#,##0';
  dauBang(ws1);

  // Sheet 2 — theo phòng
  const ws2 = wb.addWorksheet('Theo phòng');
  ws2.columns = [
    { header: 'Phòng', key: 'phong', width: 22 },
    ...THU_TU_CAP.map(c => ({ header: c, key: c, width: 12 })),
    { header: 'Tổng tiền (đ)', key: 'tien', width: 16 },
  ];
  for (const d of tongHopTheoPhong(rows)) {
    ws2.addRow({ phong: d.phong, ...Object.fromEntries(THU_TU_CAP.map(c => [c, d.theoCap[c] ?? 0])), tien: d.tien });
  }
  ws2.getColumn('tien').numFmt = '#,##0';
  dauBang(ws2);

  // Sheet 3 — chi tiết từng dòng sổ
  const ws3 = wb.addWorksheet('Chi tiết');
  ws3.columns = [
    { header: 'Cấp độ', key: 'capDo', width: 12 },
    { header: 'Trạng thái', key: 'trangThai', width: 22 },
    { header: 'Nguồn công nhận', key: 'nguon', width: 28 },
    { header: 'Ý tưởng', key: 'title', width: 48 },
    { header: 'Phòng', key: 'phong', width: 18 },
    { header: 'Người đề xuất', key: 'proposer', width: 24 },
    { header: 'Cấp đề xuất', key: 'capDeXuat', width: 14 },
    { header: 'Nhóm lĩnh vực', key: 'linhVuc', width: 20 },
    { header: 'Có demo', key: 'demo', width: 9 },
    { header: 'Cấp hiện tại', key: 'developmentLevel', width: 12 },
    { header: 'Tính KPI', key: 'kpi', width: 9 },
    { header: 'Tiền (đ)', key: 'mucThuong', width: 12 },
    { header: 'Lý do thưởng', key: 'lyDoThuong', width: 18 },
    { header: 'Tuần chọn', key: 'tuanChon', width: 12 },
    { header: 'Người quyết', key: 'nguoiDuyet', width: 22 },
    { header: 'Ngày quyết', key: 'duyetLuc', width: 12 },
    { header: 'Người trình/ghi', key: 'nguoiGhiNhan', width: 22 },
    { header: 'Ngày trình/ghi', key: 'ghiNhanLuc', width: 12 },
    { header: 'Mã SMP', key: 'smpMa', width: 14 },
    { header: 'Trạng thái SMP', key: 'smpTrangThai', width: 16 },
    { header: 'Điểm TCTH', key: 'diemTcth', width: 10 },
    { header: 'Điểm GĐ', key: 'diemGd', width: 9 },
    { header: 'Ý kiến Giám đốc', key: 'yKienGd', width: 36 },
    { header: 'Lời trình TCTH', key: 'ghiChu', width: 36 },
    { header: 'Trả về bởi', key: 'traVeBoi', width: 10 },
    { header: 'Khuyến nghị trả về', key: 'lyDoTraVe', width: 36 },
    { header: 'Số lần bổ sung', key: 'soLanBoSung', width: 10 },
    { header: 'Kết luận TCTH', key: 'lyDoKetLuan', width: 36 },
    { header: 'Lý do thu hồi', key: 'lyDoThuHoi', width: 30 },
    { header: 'Ngày gửi ý tưởng', key: 'createdAt', width: 14 },
  ];
  for (const r of rows) {
    ws3.addRow({
      capDo: r.capDo,
      trangThai: TEN_TRANG_THAI[r.trangThai] ?? r.trangThai,
      nguon: TEN_NGUON[r.nguonCongNhan],
      title: r.title,
      phong: r.phong,
      proposer: r.proposer,
      capDeXuat: r.capDeXuat ?? '',
      linhVuc: r.linhVuc ?? '',
      demo: r.coDemo ? 'Có' : 'Không',
      developmentLevel: r.developmentLevel ?? '',
      kpi: r.ghiNhanKpi ? 'Có' : '',
      mucThuong: r.mucThuong,
      lyDoThuong: r.lyDoThuong,
      tuanChon: ngay(r.tuanChon),
      nguoiDuyet: r.nguoiDuyet ?? '',
      duyetLuc: ngay(r.duyetLuc),
      nguoiGhiNhan: r.nguoiGhiNhan ?? '',
      ghiNhanLuc: ngay(r.ghiNhanLuc),
      smpMa: r.smpMa ?? '',
      smpTrangThai: r.smpTrangThai ?? '',
      diemTcth: r.diemTcth ?? '',
      diemGd: r.diemGd ?? '',
      yKienGd: r.yKienGd ?? '',
      ghiChu: r.ghiChu ?? '',
      traVeBoi: r.traVeBoi === 'gd' ? 'Giám đốc' : r.traVeBoi === 'tcth' ? 'TCTH' : '',
      lyDoTraVe: r.lyDoTraVe ?? '',
      soLanBoSung: r.soLanBoSung,
      lyDoKetLuan: r.lyDoKetLuan ?? '',
      lyDoThuHoi: r.lyDoThuHoi ?? '',
      createdAt: ngay(r.createdAt),
    });
  }
  ws3.getColumn('mucThuong').numFmt = '#,##0';
  ws3.autoFilter = { from: 'A1', to: 'AD1' };
  dauBang(ws3);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `so-ghi-nhan-bhy-ideas-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
