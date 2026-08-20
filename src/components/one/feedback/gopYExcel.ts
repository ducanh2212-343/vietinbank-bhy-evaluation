import type { Workbook, Worksheet } from 'exceljs';
import { GOP_Y_TRANG_THAI_LABEL, type GopY, type GopYTrangThai } from './useGopY';

// Kết xuất danh sách góp ý hệ thống BHY One ra Excel cho Phòng TCTH / BGĐ.
// Cùng nếp trình bày với ideasExcel.ts: tiêu đề nền màu, cột đo sẵn bề rộng,
// dòng kẻ xen kẽ, khoá dòng tiêu đề và bộ lọc.

const MAU_DO = 'FFED1B24';      // đỏ VietinBank — sheet danh sách
const MAU_XANH = 'FF005A9C';    // xanh navy — sheet tổng quan
const MAU_NEN_NHAT = 'FFFDF6E7';
const VIEN_NHAT = 'FFE2E8F0';
const DINH_DANG_NGAY = 'dd/mm/yyyy hh:mm';

/** Lọc theo trạng thái ('tat_ca' giữ nguyên danh sách) */
export function locGopYTheoTrangThai(
  rows: GopY[],
  trangThai: GopYTrangThai | 'tat_ca',
): GopY[] {
  if (trangThai === 'tat_ca') return rows;
  return rows.filter((g) => g.trangThai === trangThai);
}

interface CotConfig {
  header: string;
  width: number;
  wrap?: boolean;
  numFmt?: string;
  center?: boolean;
}

const COT_DANH_SACH: CotConfig[] = [
  { header: 'STT', width: 6, center: true },
  { header: 'Nội dung góp ý', width: 60, wrap: true },
  { header: 'Menu / tính năng liên quan', width: 34, wrap: true },
  { header: 'Người gửi', width: 24 },
  { header: 'Phòng/Ban', width: 26 },
  { header: 'Ngày gửi', width: 18, numFmt: DINH_DANG_NGAY, center: true },
  { header: 'Trạng thái', width: 14, center: true },
  { header: 'Ngày đánh dấu', width: 18, numFmt: DINH_DANG_NGAY, center: true },
  { header: 'Trang đang mở khi gửi', width: 26 },
];

function trangTriSheet(ws: Worksheet, cols: CotConfig[], mauTieuDe: string, soDongDuLieu: number): void {
  ws.columns = cols.map((c) => ({ width: c.width }));

  const tieuDe = ws.getRow(1);
  tieuDe.height = 30;
  tieuDe.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  tieuDe.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  tieuDe.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: mauTieuDe } };
    cell.border = {
      top: { style: 'thin', color: { argb: mauTieuDe } },
      bottom: { style: 'medium', color: { argb: mauTieuDe } },
      left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
    };
  });

  for (let r = 2; r <= soDongDuLieu + 1; r++) {
    const row = ws.getRow(r);
    const soc = r % 2 === 0;
    cols.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      cell.alignment = {
        vertical: 'top',
        horizontal: c.center ? 'center' : 'left',
        wrapText: !!c.wrap,
      };
      if (c.numFmt) cell.numFmt = c.numFmt;
      if (soc) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MAU_NEN_NHAT } };
      cell.border = {
        top: { style: 'hair', color: { argb: VIEN_NHAT } },
        bottom: { style: 'hair', color: { argb: VIEN_NHAT } },
        left: { style: 'hair', color: { argb: VIEN_NHAT } },
        right: { style: 'hair', color: { argb: VIEN_NHAT } },
      };
    });
  }

  ws.views = [{ state: 'frozen', ySplit: 1 }];
  if (soDongDuLieu > 0) {
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
  }
}

const ngay = (iso: string | null | undefined): Date | string => (iso ? new Date(iso) : '');

/** Workbook 2 sheet: Danh sách góp ý + Tổng quan trạng thái */
export async function buildGopYWorkbook(rows: GopY[]): Promise<Workbook> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'VietinBank Bắc Hưng Yên — Góp ý BHY One';
  wb.created = new Date();

  const ws1 = wb.addWorksheet('Danh sách góp ý');
  ws1.addRow(COT_DANH_SACH.map((c) => c.header));
  rows.forEach((g, i) => {
    ws1.addRow([
      i + 1,
      g.noiDung,
      g.mucLienQuan.map((m) => m.label).join(', '),
      g.nguoiGui,
      g.phongBan ?? '',
      ngay(g.createdAt),
      GOP_Y_TRANG_THAI_LABEL[g.trangThai],
      ngay(g.danhDauLuc),
      g.trangGui ?? '',
    ]);
  });
  trangTriSheet(ws1, COT_DANH_SACH, MAU_DO, rows.length);

  const ws2 = wb.addWorksheet('Tổng quan');
  ws2.addRow(['Chỉ tiêu', 'Giá trị']);
  const dem = (t: GopYTrangThai) => rows.filter((g) => g.trangThai === t).length;
  const dong: [string, string | number][] = [
    ['Ngày kết xuất', new Date().toLocaleString('vi-VN')],
    ['Tổng số góp ý', rows.length],
    ['Mới gửi (chưa xem xét)', dem('moi')],
    ['Đã xem xét', dem('da_xem_xet')],
    ['Đã xử lý', dem('da_xu_ly')],
    ['Số người gửi', new Set(rows.map((g) => g.createdBy)).size],
  ];
  dong.forEach((d) => ws2.addRow(d));
  trangTriSheet(
    ws2,
    [{ header: 'Chỉ tiêu', width: 30 }, { header: 'Giá trị', width: 24 }],
    MAU_XANH,
    dong.length,
  );

  return wb;
}

export function tenFileGopY(): string {
  return `GOP_Y_HE_THONG_BHY_ONE_${new Date().toISOString().slice(0, 10)}.xlsx`;
}

/** Dựng workbook rồi tải về máy */
export async function downloadGopYExcel(rows: GopY[]): Promise<void> {
  const wb = await buildGopYWorkbook(rows);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = tenFileGopY();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
