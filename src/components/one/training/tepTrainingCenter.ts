import { supabase } from '@/integrations/supabase/client';
import type { TtcTep } from '@/lib/trainingCenter';

/**
 * Tệp học viên nộp cho một đầu việc — bucket PRIVATE `bhy-training`, đường dẫn
 * `<chuong_trinh_id>/<user_id>/<dau_viec_id>/<uuid>.<đuôi>`. Thư mục cấp 1 là
 * chương trình (policy đọc: thành viên chương trình), cấp 2 là chủ tệp (policy
 * ghi/xoá). Không dùng chung bhy-one vì bucket đó cho mọi cán bộ đọc mọi object.
 */
const BUCKET = 'bhy-training';
const SIGN_TTL_SECONDS = 60 * 60; // 1 giờ — đủ một lượt xem lộ trình

/** Trần 20 MB — trùng file_size_limit của bucket; slide có ảnh thường 5–15 MB */
export const TTC_TEP_MAX_BYTES = 20 * 1024 * 1024;
/** Tối đa 5 tệp một đầu việc — đủ cho sản phẩm + phụ lục, không thành kho lưu trữ */
export const TTC_TEP_TOI_DA = 5;

export const TTC_TEP_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'text/plain': 'txt',
  'text/csv': 'csv',
};

export const TTC_TEP_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.txt,.csv';

export function kiemTraTep(file: File): string | null {
  if (!TTC_TEP_MIME[file.type]) return 'Chỉ nhận PDF, Word, Excel, PowerPoint, ảnh JPG/PNG/WebP, TXT hoặc CSV.';
  if (file.size > TTC_TEP_MAX_BYTES) return 'Tệp lớn hơn 20 MB. Nén hoặc xuất PDF rồi nộp lại.';
  return null;
}

export async function taiTepTrainingCenter(file: File, ctId: string, userId: string, dauViecId: string): Promise<TtcTep> {
  const loi = kiemTraTep(file);
  if (loi) throw new Error(loi);
  const path = `${ctId}/${userId}/${dauViecId}/${crypto.randomUUID()}.${TTC_TEP_MIME[file.type]}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  return { path, ten: file.name, kich_thuoc: file.size, luc: new Date().toISOString() };
}

export async function kyTepTrainingCenter(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGN_TTL_SECONDS);
  const out: Record<string, string> = {};
  for (const item of data ?? []) if (item.signedUrl && item.path) out[item.path] = item.signedUrl;
  return out;
}

export async function xoaTepTrainingCenter(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await supabase.storage.from(BUCKET).remove(paths);
}

export function kichThuocDoc(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
