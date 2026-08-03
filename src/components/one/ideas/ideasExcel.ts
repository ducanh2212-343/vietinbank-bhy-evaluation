import type { Workbook, Worksheet } from 'exceljs';
import { IDEA_DEV_LEVELS, IDEA_TIER_REWARDS, type IdeaDevLevel } from '@/data/one/ideasConfig';
import type { IdeaOwnerMap } from './useIdeaOwnerProfiles';
import type { PortalIdea } from './usePortalIdeas';

// Kết xuất BHY Ideas ra file Excel nhiều sheet cho Phòng TCTH / quản trị.
//
// Bản trước xuất CSV thuần (một khối chữ, mở lên Excel phải tự căn cột). Bản này
// dựng workbook thật: tiêu đề in đậm nền đỏ thương hiệu, cột đã đo bề rộng, ô dài
// tự xuống dòng, cột tiền và ngày đúng kiểu dữ liệu, có bộ lọc và khoá dòng tiêu đề.
// Ba sheet tổng hợp phía sau phục vụ cộng/trừ KPI mà không phải tự pivot lại.

const MAU_DO = 'FFED1B24';      // đỏ VietinBank — tiêu đề sheet danh sách
const MAU_XANH = 'FF005A9C';    // xanh navy — tiêu đề các sheet tổng hợp
const MAU_NEN_NHAT = 'FFFDF6E7';
const VIEN_NHAT = 'FFE2E8F0';

const DINH_DANG_TIEN = '#,##0" đ"';
const DINH_DANG_NGAY = 'dd/mm/yyyy hh:mm';

/** Lọc ý tưởng theo khoảng ngày gửi [from 00:00, to 23:59:59] — from/to dạng yyyy-mm-dd */
export function filterIdeasByDate(ideas: PortalIdea[], from?: string, to?: string): PortalIdea[] {
  let filtered = [...ideas];
  if (from) {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    filtered = filtered.filter(idea => {
      if (!idea.createdAt) return false;
      return new Date(idea.createdAt) >= start;
    });
  }
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    filtered = filtered.filter(idea => {
      if (!idea.createdAt) return false;
      return new Date(idea.createdAt) <= end;
    });
  }
  return filtered;
}

interface CotConfig {
  header: string;
  width: number;
  wrap?: boolean;
  numFmt?: string;
  /** Căn giữa cho cột ngắn (cấp độ, số đếm) */
  center?: boolean;
}

const COT_DANH_SACH: CotConfig[] = [
  { header: 'STT', width: 6, center: true },
  { header: 'Cấp đề xuất', width: 14, center: true },
  { header: 'Có thể thử/áp dụng ở đâu', width: 16, center: true },
  { header: 'Tên ý tưởng / vấn đề', width: 46, wrap: true },
  { header: 'Thực trạng hiện tại', width: 54, wrap: true },
  { header: 'Đề xuất cách làm mới / giải pháp', width: 54, wrap: true },
  { header: 'Lợi ích dự kiến mang lại', width: 46, wrap: true },
  { header: 'Phòng/Ban khai trên phiếu', width: 18 },
  { header: 'Có sản phẩm Demo', width: 12, center: true },
  { header: 'Cán bộ / Nhóm đề xuất', width: 26, wrap: true },
  { header: 'Ngày gửi', width: 18, numFmt: DINH_DANG_NGAY, center: true },
  { header: 'Cấp độ phát triển', width: 15, center: true },
  { header: 'Đề xuất Hội đồng', width: 16, center: true },
  { header: 'Dự toán thưởng', width: 15, numFmt: DINH_DANG_TIEN },
  { header: 'Số bình luận', width: 11, center: true },
  { header: 'Mã cán bộ', width: 13 },
  { header: 'Họ tên theo hồ sơ', width: 24 },
  { header: 'Phòng theo hồ sơ', width: 26 },
  { header: 'Chức vụ', width: 30, wrap: true },
  { header: 'Đồng đề xuất', width: 28, wrap: true },
  { header: 'Lượt thích', width: 10, center: true },
  { header: 'Lượt không thích', width: 14, center: true },
  { header: 'Email tài khoản gửi', width: 28 },
  { header: 'Cập nhật gần nhất', width: 18, numFmt: DINH_DANG_NGAY, center: true },
];

const COT_THEO_CAN_BO: CotConfig[] = [
  { header: 'Mã cán bộ', width: 13 },
  { header: 'Họ tên', width: 26 },
  { header: 'Phòng/Ban', width: 26 },
  { header: 'Chức vụ', width: 30, wrap: true },
  { header: 'Tổng ý tưởng', width: 13, center: true },
  ...IDEA_DEV_LEVELS.map(lv => ({ header: lv, width: 11, center: true })),
  { header: 'Đề xuất Hội đồng', width: 16, center: true },
  { header: 'Có Demo', width: 10, center: true },
  { header: 'Dự toán thưởng', width: 16, numFmt: DINH_DANG_TIEN },
];

const COT_THEO_PHONG: CotConfig[] = [
  { header: 'Phòng/Ban', width: 30 },
  { header: 'Số cán bộ tham gia', width: 17, center: true },
  { header: 'Tổng ý tưởng', width: 13, center: true },
  ...IDEA_DEV_LEVELS.map(lv => ({ header: lv, width: 11, center: true })),
  { header: 'Đề xuất Hội đồng', width: 16, center: true },
  { header: 'Có Demo', width: 10, center: true },
  { header: 'Dự toán thưởng', width: 16, numFmt: DINH_DANG_TIEN },
];

/** Kẻ khung + căn chỉnh + đóng băng tiêu đề cho một sheet đã có dữ liệu */
function trangTriSheet(ws: Worksheet, cols: CotConfig[], mauTieuDe: string, soDongDuLieu: number): void {
  ws.columns = cols.map(c => ({ width: c.width }));

  const tieuDe = ws.getRow(1);
  tieuDe.height = 30;
  tieuDe.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  tieuDe.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  tieuDe.eachCell(cell => {
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
    row.alignment = { vertical: 'top' };
    // Kẻ nền xen kẽ cho dễ dò ngang khi bảng dài
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

const ngay = (iso: string | null | undefined): Date | string =>
  iso ? new Date(iso) : '';

interface ThongKe {
  tong: number;
  theoCap: Record<IdeaDevLevel, number>;
  hoiDong: number;
  demo: number;
  thuong: number;
}

const thongKeRong = (): ThongKe => ({
  tong: 0,
  theoCap: { 'Ươm mầm': 0, 'Bén rễ': 0, 'Vươn cành': 0, 'Lan tỏa': 0 },
  hoiDong: 0,
  demo: 0,
  thuong: 0,
});

function congVao(tk: ThongKe, idea: PortalIdea): void {
  tk.tong += 1;
  tk.theoCap[idea.developmentLevel] = (tk.theoCap[idea.developmentLevel] ?? 0) + 1;
  if (idea.councilProposal) tk.hoiDong += 1;
  if (idea.hasDemo) tk.demo += 1;
  tk.thuong += IDEA_TIER_REWARDS[idea.developmentLevel] ?? IDEA_TIER_REWARDS['Ươm mầm'];
}

/**
 * Dựng workbook 4 sheet: Danh sách ý tưởng, Tổng hợp theo cán bộ,
 * Tổng hợp theo phòng, Tổng quan.
 *
 * `owners` tra theo `idea.createdBy` (xem useIdeaOwnerProfiles); thiếu hồ sơ thì
 * các cột nhân sự lùi về tên ghi trên phiếu, file vẫn đầy đủ.
 */
export async function buildIdeasWorkbook(
  ideas: PortalIdea[],
  owners: IdeaOwnerMap = {},
  from?: string,
  to?: string,
): Promise<Workbook> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'VietinBank Bắc Hưng Yên — BHY Ideas';
  wb.created = new Date();

  const rows = filterIdeasByDate(ideas, from, to);

  /* ---------------- Sheet 1: danh sách chi tiết ---------------- */
  const ws1 = wb.addWorksheet('Danh sách ý tưởng');
  ws1.addRow(COT_DANH_SACH.map(c => c.header));
  rows.forEach((idea, i) => {
    const owner = owners[idea.createdBy];
    const dongDeXuat = idea.proposer.split(',').slice(1).map(s => s.trim()).filter(Boolean).join(', ');
    ws1.addRow([
      i + 1,
      idea.level,
      idea.applicability,
      idea.title,
      idea.currentStatus,
      idea.proposedSolution,
      idea.expectedBenefits,
      idea.departmentName,
      idea.hasDemo ? 'Có' : 'Không',
      idea.proposer,
      ngay(idea.createdAt),
      idea.developmentLevel,
      idea.councilProposal ? 'Đề xuất Hội đồng' : 'Chưa đề xuất',
      IDEA_TIER_REWARDS[idea.developmentLevel] ?? IDEA_TIER_REWARDS['Ươm mầm'],
      idea.commentCount,
      owner?.employeeCode ?? '',
      owner?.fullName ?? '',
      owner?.department ?? '',
      owner?.position ?? '',
      dongDeXuat,
      idea.likes,
      idea.unlikes,
      idea.creatorEmail ?? '',
      ngay(idea.updatedAt),
    ]);
  });
  trangTriSheet(ws1, COT_DANH_SACH, MAU_DO, rows.length);

  /* ---------------- Sheet 2: tổng hợp theo cán bộ ---------------- */
  const theoCanBo = new Map<string, { ten: string; ma: string; phong: string; chucVu: string; tk: ThongKe }>();
  for (const idea of rows) {
    const owner = owners[idea.createdBy];
    const khoa = idea.createdBy;
    if (!theoCanBo.has(khoa)) {
      theoCanBo.set(khoa, {
        ten: owner?.fullName || idea.proposer.split(',')[0].trim(),
        ma: owner?.employeeCode ?? '',
        phong: owner?.department || idea.departmentName,
        chucVu: owner?.position ?? '',
        tk: thongKeRong(),
      });
    }
    congVao(theoCanBo.get(khoa)!.tk, idea);
  }
  const ws2 = wb.addWorksheet('Tổng hợp theo cán bộ');
  ws2.addRow(COT_THEO_CAN_BO.map(c => c.header));
  const canBoSapXep = [...theoCanBo.values()].sort(
    (a, b) => b.tk.tong - a.tk.tong || a.ten.localeCompare(b.ten, 'vi'),
  );
  for (const cb of canBoSapXep) {
    ws2.addRow([
      cb.ma, cb.ten, cb.phong, cb.chucVu, cb.tk.tong,
      ...IDEA_DEV_LEVELS.map(lv => cb.tk.theoCap[lv] ?? 0),
      cb.tk.hoiDong, cb.tk.demo, cb.tk.thuong,
    ]);
  }
  trangTriSheet(ws2, COT_THEO_CAN_BO, MAU_XANH, canBoSapXep.length);

  /* ---------------- Sheet 3: tổng hợp theo phòng ---------------- */
  const theoPhong = new Map<string, { tk: ThongKe; canBo: Set<string> }>();
  for (const idea of rows) {
    const phong = owners[idea.createdBy]?.department || idea.departmentName;
    if (!theoPhong.has(phong)) theoPhong.set(phong, { tk: thongKeRong(), canBo: new Set() });
    const muc = theoPhong.get(phong)!;
    congVao(muc.tk, idea);
    muc.canBo.add(idea.createdBy);
  }
  const ws3 = wb.addWorksheet('Tổng hợp theo phòng');
  ws3.addRow(COT_THEO_PHONG.map(c => c.header));
  const phongSapXep = [...theoPhong.entries()].sort((a, b) => b[1].tk.tong - a[1].tk.tong);
  for (const [ten, muc] of phongSapXep) {
    ws3.addRow([
      ten, muc.canBo.size, muc.tk.tong,
      ...IDEA_DEV_LEVELS.map(lv => muc.tk.theoCap[lv] ?? 0),
      muc.tk.hoiDong, muc.tk.demo, muc.tk.thuong,
    ]);
  }
  trangTriSheet(ws3, COT_THEO_PHONG, MAU_XANH, phongSapXep.length);

  /* ---------------- Sheet 4: tổng quan ---------------- */
  const tong = thongKeRong();
  rows.forEach(idea => congVao(tong, idea));
  const ws4 = wb.addWorksheet('Tổng quan');
  ws4.addRow(['Chỉ tiêu', 'Giá trị']);
  const khoangNgay = from || to
    ? `${from ? new Date(from).toLocaleDateString('vi-VN') : '…'} → ${to ? new Date(to).toLocaleDateString('vi-VN') : '…'}`
    : 'Toàn bộ dữ liệu';
  const dongTongQuan: [string, string | number][] = [
    ['Khoảng thời gian kết xuất', khoangNgay],
    ['Ngày kết xuất', new Date().toLocaleString('vi-VN')],
    ['Tổng số ý tưởng', tong.tong],
    ['Số cán bộ có ý tưởng', theoCanBo.size],
    ['Số phòng/ban có ý tưởng', theoPhong.size],
    ...IDEA_DEV_LEVELS.map(lv => [`Cấp độ ${lv}`, tong.theoCap[lv] ?? 0] as [string, number]),
    ['Đề xuất Hội đồng', tong.hoiDong],
    ['Có sản phẩm Demo', tong.demo],
    ['Tổng dự toán thưởng (VND)', tong.thuong],
  ];
  dongTongQuan.forEach(d => ws4.addRow(d));
  trangTriSheet(
    ws4,
    [{ header: 'Chỉ tiêu', width: 32 }, { header: 'Giá trị', width: 26 }],
    MAU_XANH,
    dongTongQuan.length,
  );
  // Riêng dòng tiền dùng định dạng tiền tệ
  ws4.getCell(`B${dongTongQuan.length + 1}`).numFmt = DINH_DANG_TIEN;

  return wb;
}

/** Tên file kèm khoảng ngày đã lọc, giữ nếp đặt tên của bản cũ */
export function tenFileIdeas(from?: string, to?: string): string {
  let hau = '';
  if (from && to) hau = `_TU_${from}_DEN_${to}`;
  else if (from) hau = `_TU_${from}`;
  else if (to) hau = `_DEN_${to}`;
  else hau = `_${new Date().toISOString().slice(0, 10)}`;
  return `TONG_HOP_Y_TUONG_SANG_KIEN_BHY${hau}.xlsx`;
}

/** Dựng workbook rồi tải về máy */
export async function downloadIdeasExcel(
  ideas: PortalIdea[],
  owners: IdeaOwnerMap = {},
  from?: string,
  to?: string,
): Promise<void> {
  const wb = await buildIdeasWorkbook(ideas, owners, from, to);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = tenFileIdeas(from, to);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
