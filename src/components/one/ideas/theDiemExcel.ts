import { IDEA_DEV_LEVELS } from '@/data/one/ideasConfig';
import { NHOM_VI_TRI_LABELS } from '@/lib/ideaKpi';
import {
  NHOM_VI_TRI_NGAN,
  tinhPhongTheDiem,
  tinhTheDiem,
  type TongHopTheDiem,
} from '@/lib/ideaTheDiem';

// Kết xuất Thẻ điểm ĐMST ra Excel — ba sheet: theo cán bộ, theo phòng, cách
// tính. ExcelJS nhập động như soGhiNhanExcel.ts để không nặng bundle.

const ngayGio = (iso: string | null) => (iso ? new Date(iso).toLocaleString('vi-VN') : '');

export async function downloadTheDiemExcel(th: TongHopTheDiem): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BHY ONE';
  wb.created = new Date();

  const dauBang = (ws: import('exceljs').Worksheet) => {
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
  };

  const ws1 = wb.addWorksheet('Theo cán bộ');
  ws1.columns = [
    { header: 'Họ tên', key: 'hoTen', width: 26 },
    { header: 'Phòng', key: 'phong', width: 24 },
    { header: 'Chức danh', key: 'chucDanh', width: 34 },
    { header: 'Nhóm thẻ điểm', key: 'nhom', width: 16 },
    ...IDEA_DEV_LEVELS.map(c => ({ header: c === 'Ươm mầm' ? 'Ươm mầm (tổng)' : c, key: c, width: 14 })),
    { header: 'Quy đổi Bén rễ', key: 'quyDoi', width: 14 },
    { header: 'Tỷ lệ đạt được (%)', key: 'tyLe', width: 14 },
    { header: 'Chỉ tiêu Bén rễ', key: 'chiTieu', width: 14 },
    { header: '% hoàn thành', key: 'phanTram', width: 13 },
    { header: 'Kết quả', key: 'ketQua', width: 14 },
    { header: 'Diễn giải', key: 'dienGiai', width: 60 },
    { header: 'Còn thiếu', key: 'conThieu', width: 60 },
  ];
  for (const d of tinhTheDiem(th)) {
    ws1.addRow({
      hoTen: d.canBo.hoTen,
      phong: d.canBo.tenPhong,
      chucDanh: d.canBo.chucDanh,
      nhom: NHOM_VI_TRI_NGAN[d.nhom],
      ...Object.fromEntries(IDEA_DEV_LEVELS.map(c => [c, d.ghiNhan[c]])),
      quyDoi: d.diemQuyDoi,
      tyLe: d.ketQua.coGiaoChiTieu ? d.ketQua.tyLeDatDuoc : '',
      chiTieu: d.chiTieuBenRe ?? '',
      phanTram: d.ketQua.coGiaoChiTieu ? d.ketQua.phanTramHoanThanh : '',
      ketQua: !d.ketQua.coGiaoChiTieu ? 'Không giao' : d.ketQua.dat ? 'Đạt' : 'Chưa đạt',
      dienGiai: d.ketQua.dienGiai.join(' · '),
      conThieu: d.ketQua.conThieu.join(' · '),
    });
  }
  dauBang(ws1);

  const ws2 = wb.addWorksheet('Theo phòng');
  ws2.columns = [
    { header: 'Phòng', key: 'phong', width: 26 },
    { header: 'Số cán bộ (mẫu số)', key: 'soCanBo', width: 16 },
    ...IDEA_DEV_LEVELS.map(c => ({ header: c === 'Ươm mầm' ? 'Ươm mầm (tổng)' : c, key: c, width: 14 })),
    { header: 'Đạt Bén rễ trở lên', key: 'benReTroLen', width: 16 },
    { header: 'Quy đổi Bén rễ', key: 'quyDoi', width: 14 },
    { header: 'Chỉ tiêu Bén rễ của TP', key: 'chiTieu', width: 18 },
    { header: '% Bén rễ', key: 'tyLe', width: 10 },
    { header: 'Điều kiện phòng', key: 'dieuKien', width: 30 },
    { header: 'Phòng đạt điều kiện', key: 'dat', width: 16 },
  ];
  for (const r of th.phong.map(tinhPhongTheDiem)) {
    ws2.addRow({
      phong: r.phong.ten,
      soCanBo: r.phong.soCanBo,
      ...Object.fromEntries(IDEA_DEV_LEVELS.map(c => [c, r.ghiNhan[c]])),
      benReTroLen: r.soBenReTroLen,
      quyDoi: r.diemQuyDoi,
      chiTieu: r.chiTieuBenRe ?? '',
      tyLe: r.tyLeBenRe ?? '',
      dieuKien: r.moTaDieuKienPhong,
      dat: r.datDieuKienPhong === null ? '' : r.datDieuKienPhong ? 'Đạt' : 'Chưa',
    });
  }
  dauBang(ws2);

  const ws3 = wb.addWorksheet('Cách tính');
  ws3.columns = [{ header: 'Nguyên tắc (chốt 17/09/2026)', key: 'd', width: 120 }];
  [
    `Tính lúc: ${ngayGio(th.tinhLuc)}. KPI ${th.dangApKpi ? 'đang áp' : 'đang TẠM DỪNG — số liệu để tham khảo'}.`,
    'Kỳ tính: cả năm 2026 — mọi ý tưởng đã nhập lên BHY Ideas.',
    'Cách ghi nhận: Ươm mầm là tổng số ý tưởng đã nhập; các cấp trên đếm ý tưởng đang ở cấp đó (5 ý tưởng → 5 Ươm mầm, trong đó 2 Bén rễ, 1 Vươn cành).',
    'Quy đổi Bén rễ (cán bộ và Trưởng phòng): 1 Vươn cành = 2 Bén rễ, 1 Lan tỏa = 3 Bén rễ; Ươm mầm không quy đổi.',
    'Ý tưởng của một người: người tạo phiếu hoặc có tên trong ô Người đề xuất (khớp đúng một hồ sơ). Đồng đề xuất: mỗi người tính trọn.',
    'Ý tưởng của một phòng: phòng đề xuất ghi trên phiếu.',
    'Mẫu số «số cán bộ của Phòng»: danh bạ hiện tại, cán bộ đang làm việc, trừ khoán gọn.',
    `Nhóm: ${Object.values(NHOM_VI_TRI_LABELS).join(' · ')}.`,
    'Cán bộ: 12 Ươm mầm HOẶC 6 Bén rễ quy đổi; lấy đường cao hơn; trần 130%.',
    'Trưởng phòng đầu mối: phòng ≥ 2 Vươn cành hoặc ≥ 1 Lan tỏa, cá nhân ≥ 1 Vươn cành/Lan tỏa, Bén rễ quy đổi ≥ 90% số cán bộ; dưới ngưỡng quy 0.',
    'Trưởng PGD: phòng ≥ 4 Vươn cành hoặc ≥ 2 Lan tỏa, cá nhân ≥ 1, Bén rễ quy đổi ≥ 90% của 2 × số cán bộ.',
    'Phó phòng / Kiểm soát viên: số ý tưởng của phòng đã đạt Bén rễ trở lên (KHÔNG quy đổi) trên số cán bộ phòng (tạm lấy cả phòng, chưa có phân công cán bộ phụ trách); bản thân ≥ 1 Vươn cành/Lan tỏa; dưới 90% quy 0.',
    'Ban Giám đốc: không giao chỉ tiêu Đổi mới sáng tạo — chỉ hiện số ý tưởng.',
  ].forEach(d => ws3.addRow({ d }));
  dauBang(ws3);

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BHY_Ideas_The_diem_DMST_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
