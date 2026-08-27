import { supabase } from '@/integrations/supabase/client';

/**
 * Ảnh đính kèm của góp ý — bucket PRIVATE `bhy-gop-y`, đường dẫn
 * `<user_id>/<uuid>.jpg` (thư mục cấp 1 = chủ ảnh, để policy Storage chặn theo
 * chủ sở hữu). Không dùng chung bucket `bhy-one`: bucket đó cho MỌI cán bộ đọc
 * MỌI object, trong khi ảnh chụp lỗi có thể lộ tên khách hàng và hạn mức tín dụng.
 */

const BUCKET = 'bhy-gop-y';
const SIGN_TTL_SECONDS = 60 * 60; // 1 giờ — đủ một lượt xem hòm góp ý

/** Trần trước khi nén: chặn ảnh gốc quá lớn ngay tại máy người dùng */
export const GOP_Y_MAX_FILE_BYTES = 10 * 1024 * 1024;
/** Tối đa 3 ảnh/phiếu — đủ để mô tả một lỗi, không biến hòm góp ý thành kho ảnh */
export const GOP_Y_MAX_ANH = 3;
/** Cạnh dài sau nén. 1600px chứ không phải 800px như Kho Dữ Liệu: ảnh chụp
 *  màn hình phải đọc được chữ trong bảng Kanban. */
const CANH_DAI_TOI_DA = 1600;
const CHAT_LUONG_JPEG = 0.75;

export const GOP_Y_MIME_CHO_PHEP = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Nén ảnh phía client trước khi tải lên: thu cạnh dài về 1600px và mã hoá JPEG.
 * Đây là chốt chặn quan trọng nhất về hiệu năng — ảnh gốc từ điện thoại thường
 * 5–12 MB, tải thẳng qua 4G sẽ treo hoặc đứt giữa chừng.
 */
export function nenAnh(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!GOP_Y_MIME_CHO_PHEP.includes(file.type)) {
      reject(new Error('Chỉ nhận ảnh JPEG, PNG hoặc WebP.'));
      return;
    }
    if (file.size > GOP_Y_MAX_FILE_BYTES) {
      reject(new Error('Ảnh lớn hơn 10MB. Hãy chụp lại màn hình hoặc chọn ảnh nhỏ hơn.'));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const canhDai = Math.max(width, height);
      if (canhDai > CANH_DAI_TOI_DA) {
        const tyLe = CANH_DAI_TOI_DA / canhDai;
        width = Math.round(width * tyLe);
        height = Math.round(height * tyLe);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Trình duyệt không nén được ảnh.'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Không nén được ảnh.'))),
        'image/jpeg',
        CHAT_LUONG_JPEG,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được tệp ảnh.'));
    };
    img.src = url;
  });
}

/** Tải một ảnh đã nén lên bucket, trả về path đã lưu */
export async function taiAnhGopY(blob: Blob, userId: string): Promise<string> {
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw new Error(error.message);
  return path;
}

/** Ký hàng loạt đường dẫn ảnh để hiển thị (bucket private) */
export async function kyAnhGopY(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGN_TTL_SECONDS);
  const out: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) out[item.path] = item.signedUrl;
  }
  return out;
}

/** Xoá ảnh khỏi bucket — gọi khi xoá/rút lại góp ý, tránh đọng ảnh mồ côi */
export async function xoaAnhGopY(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await supabase.storage.from(BUCKET).remove(paths);
}
