// Checklist "Điểm cần cải thiện chính" cho từng nhóm thái độ (mục C — kế hoạch cải thiện)
// Mỗi nhóm có ~5 lựa chọn cố định + 1 lựa chọn "Khác" (mở textarea ngắn).

export interface FocusOption {
  code: string;
  label: string;
}

export const ATTITUDE_FOCUS_OPTIONS: Record<number, FocusOption[]> = {
  1: [
    { code: '1a', label: 'Chưa chủ động học khi phát hiện mình còn thiếu' },
    { code: '1b', label: 'Ngại hỏi, ngại xin góp ý' },
    { code: '1c', label: 'Biết điểm yếu nhưng chưa có hành động cải thiện cụ thể' },
    { code: '1d', label: 'Học chưa đều, chưa áp dụng vào công việc' },
    { code: '1e', label: 'Chưa chia sẻ kiến thức/kinh nghiệm cho đồng nghiệp' },
    { code: 'other', label: 'Khác' },
  ],
  2: [
    { code: '2a', label: 'Đọc lướt, chưa nắm ý chính' },
    { code: '2b', label: 'Chưa bóc tách được việc phải làm, đầu mối, thời hạn' },
    { code: '2c', label: 'Chưa tra cứu đủ căn cứ trước khi xử lý' },
    { code: '2d', label: 'Chưa tóm tắt lại được nội dung sau khi đọc' },
    { code: '2e', label: 'Còn phụ thuộc vào người khác giải thích văn bản' },
    { code: 'other', label: 'Khác' },
  ],
  3: [
    { code: '3a', label: 'Còn phản ứng phòng thủ khi được góp ý' },
    { code: '3b', label: 'Chưa chủ động xin phản hồi' },
    { code: '3c', label: 'Tiếp thu góp ý nhưng sửa chưa rõ' },
    { code: '3d', label: 'Còn giải thích nhiều hơn lắng nghe' },
    { code: '3e', label: 'Chưa tự nhìn ra điểm mù của bản thân' },
    { code: 'other', label: 'Khác' },
  ],
  4: [
    { code: '4a', label: 'Phối hợp chưa chủ động' },
    { code: '4b', label: 'Chưa chia sẻ thông tin kịp thời' },
    { code: '4c', label: 'Còn tập trung nhiều vào phần việc cá nhân' },
    { code: '4d', label: 'Chưa hỗ trợ đồng nghiệp khi cần' },
    { code: '4e', label: 'Chưa chốt rõ đầu mối, thời hạn, trách nhiệm khi phối hợp' },
    { code: 'other', label: 'Khác' },
  ],
  5: [
    { code: '5a', label: 'Chưa theo việc đến kết quả cuối cùng' },
    { code: '5b', label: 'Còn dừng ở "đã gửi/đã báo cáo/đã nhắc"' },
    { code: '5c', label: 'Báo cáo tiến độ chưa phản ánh đúng thực trạng' },
    { code: '5d', label: 'Ngại nhắc việc, ngại chấn chỉnh, ngại phản biện' },
    { code: '5e', label: 'Chưa chủ động đề xuất phương án khi có vướng mắc' },
    { code: 'other', label: 'Khác' },
  ],
  6: [
    { code: '6a', label: 'Chưa có thói quen tự rà soát' },
    { code: '6b', label: 'Chỉ phát hiện lỗi khi có người nhắc' },
    { code: '6c', label: 'PDCA còn hình thức' },
    { code: '6d', label: 'Ít đề xuất cải tiến' },
    { code: '6e', label: 'Chưa theo dõi kết quả sau cải tiến' },
    { code: 'other', label: 'Khác' },
  ],
};

export function getFocusLabel(dimId: number, code: string): string {
  const opt = ATTITUDE_FOCUS_OPTIONS[dimId]?.find(o => o.code === code);
  return opt?.label || code;
}

/* Helpers — date presets */
export function endOfMonth(d = new Date()): string {
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return end.toISOString().slice(0, 10);
}

export function endOfQuarter(d = new Date()): string {
  const q = Math.floor(d.getMonth() / 3);
  const end = new Date(d.getFullYear(), q * 3 + 3, 0);
  return end.toISOString().slice(0, 10);
}

/* Map improvement_status (UI) ↔ status (DB) */
export const STATUS_TO_DB: Record<string, string> = {
  not_started: 'planned',
  in_progress: 'in_progress',
  completed: 'completed',
};
export const STATUS_FROM_DB: Record<string, 'not_started' | 'in_progress' | 'completed'> = {
  planned: 'not_started',
  in_progress: 'in_progress',
  completed: 'completed',
};

/* New rating enum (3 mức) */
export const NEW_RATINGS = ['noi_bat', 'dat_mong_doi', 'can_cai_thien'] as const;
export type NewRating = typeof NEW_RATINGS[number] | '';

export function isNewRating(v: any): v is NewRating {
  return v === '' || v == null || (NEW_RATINGS as readonly string[]).includes(v);
}

export function sanitizeRating(v: any): NewRating {
  return isNewRating(v) ? (v || '') : '';
}
