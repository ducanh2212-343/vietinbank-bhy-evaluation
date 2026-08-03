import { IDEA_TIER_REWARDS } from '@/data/one/ideasConfig';
import type { IdeaOwnerMap } from './useIdeaOwnerProfiles';
import type { PortalIdea } from './usePortalIdeas';

// Kết xuất CSV danh sách ý tưởng — port từ handleExportCSV của bản deploy
// (UniquePrograms.tsx:859-964): cùng bộ cột/thứ tự, lọc theo khoảng ngày gửi
// (bao gồm cả 2 đầu mút), giá trị bọc nháy kép + escape, tiền tố BOM UTF-8
// để Excel mở tiếng Việt có dấu không lỗi font.

/** Nhãn 9 trường form (đúng DEFAULT_IDEA_FIELDS bản gốc) — dùng làm header CSV */
const FIELD_HEADERS = [
  'Cấp đề xuất',
  'Có thể thử/áp dụng ở đâu?',
  'Tên ý tưởng/vấn đề?',
  'Thực trạng hiện tại (Khó khăn, bất cập):',
  'Đề xuất cách làm mới / giải pháp:',
  'Lợi ích dự kiến mang lại:',
  'Khai báo thông tin Phòng/Ban:',
  'Xác nhận có sản phẩm Demo?',
  'Cán bộ / Nhóm đề xuất:',
] as const;

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

/**
 * Dựng nội dung file CSV (đã kèm BOM U+FEFF ở đầu).
 *
 * 16 cột đầu giữ nguyên thứ tự file gốc để Hội đồng và các bản đối chiếu cũ vẫn đọc được.
 * Từ cột 17 là phần phục vụ cộng/trừ KPI của Phòng TCTH: khoá về hồ sơ nhân sự (mã cán
 * bộ, họ tên chuẩn, phòng, chức vụ) thay vì chỉ có ô chữ "Cán bộ đề xuất", tách riêng
 * đồng đề xuất, kèm lượt bình chọn và mốc cập nhật gần nhất.
 *
 * `owners` tra theo `idea.createdBy` (xem useIdeaOwnerProfiles) — bỏ trống thì các cột
 * hồ sơ để rỗng, file vẫn hợp lệ.
 */
export function buildIdeasCsv(
  ideas: PortalIdea[],
  from?: string,
  to?: string,
  owners: IdeaOwnerMap = {},
): string {
  const filtered = filterIdeasByDate(ideas, from, to);

  const headers = [
    'STT',
    ...FIELD_HEADERS,
    'Ngay gui',
    'Email nguoi gui',
    'Cap Do Phat Trien',
    'De xuat Hoi dong',
    'Du toan tien thuong (VND)',
    'Y kien binh luan',
    // --- Phần phục vụ KPI ---
    'Ma can bo',
    'Ho ten theo ho so',
    'Phong theo ho so',
    'Chuc vu',
    'Dong de xuat',
    'So luot thich',
    'So luot khong thich',
    'Ngay cap nhat gan nhat',
  ];

  const rows = filtered.map((idea, index) => {
    const reward = IDEA_TIER_REWARDS[idea.developmentLevel] ?? IDEA_TIER_REWARDS['Ươm mầm'];
    const owner = owners[idea.createdBy];
    // Ô "Cán bộ đề xuất" ghi "Người chính, Đồng tác giả 1, ..." — tách phần sau dấu phẩy
    const coAuthors = idea.proposer.split(',').slice(1).map(s => s.trim()).filter(Boolean).join(', ');
    return [
      index + 1,
      idea.level,
      idea.applicability,
      idea.title,
      idea.currentStatus,
      idea.proposedSolution,
      idea.expectedBenefits,
      idea.departmentName,
      idea.hasDemo ? 'Có' : 'Không',
      idea.proposer,
      idea.createdAt ? new Date(idea.createdAt).toLocaleString('vi-VN') : 'Vừa xong',
      idea.creatorEmail ?? 'N/A',
      idea.developmentLevel,
      idea.councilProposal ? 'Đề xuất Hội đồng' : 'Chưa đề xuất',
      reward,
      idea.commentCount > 0 ? `${idea.commentCount} bình luận` : '',
      owner?.employeeCode ?? '',
      owner?.fullName ?? '',
      owner?.department ?? '',
      owner?.position ?? '',
      coAuthors,
      idea.likes,
      idea.unlikes,
      idea.updatedAt ? new Date(idea.updatedAt).toLocaleString('vi-VN') : '',
    ];
  });

  const csvContent = [
    headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
    ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  // BOM UTF-8 để Excel nhận đúng tiếng Việt có dấu
  return '\ufeff' + csvContent;
}

/** Tải file CSV về máy — tên file kèm khoảng ngày đã lọc như bản gốc */
export function downloadIdeasCsv(csv: string, from?: string, to?: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);

  let dateSuffix = '';
  if (from && to) dateSuffix = `_TU_${from}_DEN_${to}`;
  else if (from) dateSuffix = `_TU_${from}`;
  else if (to) dateSuffix = `_DEN_${to}`;
  else dateSuffix = `_${new Date().toISOString().slice(0, 10)}`;

  link.setAttribute('download', `TONG_HOP_Y_TUONG_SANG_KIEN_BHY${dateSuffix}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
