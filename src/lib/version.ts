/**
 * Quy ước phiên bản X.Y.Z (Semantic Versioning)
 * - X (Major): thay đổi lớn — refactor diện rộng, thêm module mới, tốn nhiều credits,
 *   ảnh hưởng nhiều màn hình hoặc thay đổi cấu trúc dữ liệu.
 * - Y (Minor): thay đổi vừa — thêm tính năng nhỏ, cải tiến UX/UI một khu vực.
 * - Z (Patch): sửa lỗi nhỏ, chỉnh giao diện, tinh chỉnh text, fix bug.
 *
 * Khi cập nhật:
 * 1. Bump APP_VERSION theo đúng quy tắc trên.
 * 2. Cập nhật APP_VERSION_DATE.
 * 3. Thêm 1 entry vào ĐẦU mảng VERSION_HISTORY.
 */

export type VersionType = 'major' | 'minor' | 'patch';

export interface VersionEntry {
  version: string;
  date: string; // dd/mm/yyyy
  type: VersionType;
  summary: string;
}

export const VERSION_HISTORY: VersionEntry[] = [
  {
    version: '2.0.0',
    date: '24/05/2026',
    type: 'major',
    summary: 'Áp dụng quy ước version X.Y.Z, refactor sidebar scroll, cải tiến BM/Evaluation và mobile UX.',
  },
  {
    version: '1.3.0',
    date: '15/05/2026',
    type: 'minor',
    summary: 'Tự điền level kỳ trước trong biểu mẫu BM, cải tiến hiển thị mobile EvalSectionB.',
  },
  {
    version: '1.2.0',
    date: '20/04/2026',
    type: 'minor',
    summary: 'Thêm module Ứng dụng AI và quản trị Prompt.',
  },
  {
    version: '1.1.0',
    date: '12/04/2026',
    type: 'minor',
    summary: 'Hoàn thiện luồng đánh giá 2 bước (Overall vs IDP) và phân nhóm cán bộ.',
  },
  {
    version: '1.0.0',
    date: '01/04/2026',
    type: 'major',
    summary: 'Phiên bản đầu tiên: 38 skills, 6 nhóm thái độ, IDP, hồ sơ cá nhân.',
  },
];

export const APP_VERSION = VERSION_HISTORY[0].version;
export const APP_VERSION_DATE = VERSION_HISTORY[0].date;
export const APP_VERSION_TYPE = VERSION_HISTORY[0].type;
