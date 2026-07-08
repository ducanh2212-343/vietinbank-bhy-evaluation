// Nhãn hiển thị dùng chung cho các bản xuất biểu mẫu (Word/PDF). Tách riêng để
// bản xuất PDF không phải kéo theo thư viện docx của bản xuất Word.
import { ATTITUDE_FOCUS_OPTIONS } from '@/components/evaluation/attitudeFocusOptions';

export const ATTITUDE_LABEL: Record<string, string> = {
  noi_bat: 'Nổi bật',
  dat_mong_doi: 'Đạt mong đợi',
  can_cai_thien: 'Cần cải thiện',
  // legacy
  dat: 'Đạt',
  chua_dat: 'Chưa đạt',
};

export const IMPROVEMENT_STATUS_LABEL: Record<string, string> = {
  not_started: 'Chưa bắt đầu',
  in_progress: 'Đang thực hiện',
  completed: 'Đã hoàn thành',
};

export function focusLabels(dimId: number, codes: string[] | undefined, other: string | undefined): string {
  if (!codes || codes.length === 0) return '';
  const opts = ATTITUDE_FOCUS_OPTIONS[dimId] || [];
  return codes
    .map(c => (c === 'other' ? (other?.trim() || 'Khác') : (opts.find(o => o.code === c)?.label || c)))
    .join(' • ');
}

/** Hình thức học 70-20-10 của hành động phát triển kỹ năng */
export const SKILL_ACTION_TYPE_LABEL: Record<string, string> = {
  '70': '70% Học qua công việc',
  '20': '20% Kèm cặp/trao đổi',
  '10': '10% Đào tạo/Tài liệu',
};

export const ACTION_STATUS_LABEL: Record<string, string> = {
  planned: 'Chưa bắt đầu',
  in_progress: 'Đang thực hiện',
  completed: 'Hoàn thành',
  cancelled: 'Huỷ',
};

/** Nhãn trạng thái phiếu cho bản in (đồng bộ với getFormStatusMeta, không kéo theo supabase) */
export const FORM_STATUS_PRINT_LABEL: Record<string, string> = {
  draft: 'Bản nháp',
  submitted: 'Đã nộp — chờ duyệt',
  returned: 'Trả lại — đang chỉnh sửa',
  reviewed: 'Đã duyệt cấp Trưởng phòng',
  approved: 'Đã duyệt cấp PGĐ/GĐ',
  closed: 'Kỳ đã đóng — kết quả chính thức',
};

/** Phiếu đã qua phê duyệt (đủ điều kiện lưu hồ sơ chính thức)? */
export const isApprovedFormStatus = (status: string | null | undefined) =>
  status === 'reviewed' || status === 'approved' || status === 'closed';

export const fmtSignDate = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';
