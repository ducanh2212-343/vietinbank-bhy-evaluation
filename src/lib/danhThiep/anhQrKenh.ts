/**
 * Chuẩn bị ảnh mã QR kênh chat (WeChat / KakaoTalk) do cán bộ tải lên.
 *
 * Vì sao không còn bắt «ảnh phải vuông»: ảnh mã QR mà WeChat và KakaoTalk xuất
 * ra là ảnh DỌC — có ảnh đại diện và tên ở trên, mã QR ở giữa. Cán bộ chụp màn
 * hình rồi tải lên thì bị từ chối, mà cắt ảnh cho vuông là việc không ai muốn
 * làm trên điện thoại. Nay máy tự DÒ mã QR trong ảnh và cắt đúng vùng mã cùng
 * vùng lặng quanh nó, nên ảnh chụp màn hình nguyên bản dùng được ngay.
 *
 * Dò được mã còn là một phép kiểm: ảnh mờ, thiếu sáng hay cắt cụt sẽ không dò
 * ra — cán bộ biết ngay tại chỗ thay vì để khách đứng quét mãi không được.
 */

import jsQR from 'jsqr';

/** Cạnh ảnh kết quả. 600 px đủ nét khi thẻ hiện mã ~240 px và khi khách phóng to. */
const CANH_KET_QUA = 600;
/** Vùng lặng quanh mã theo chuẩn QR là 4 ô; lấy 10% cạnh cho chắc. */
const LE = 0.1;
/** Ảnh nguồn hạ về cạnh này trước khi dò — dò trên ảnh 12 MP vừa chậm vừa không chính xác hơn. */
const CANH_DO = 1000;

export interface KetQuaAnhQr {
  /** Ảnh PNG vuông đã cắt, sẵn sàng tải lên. */
  blob: Blob;
  /** Đã dò được mã QR trong ảnh hay chưa. */
  doDuoc: boolean;
  /** Nội dung mã đọc được (để đối chiếu / hiển thị); rỗng khi không dò được. */
  noiDung: string;
}

function veRaCanvas(nguon: ImageBitmap, canh: number): HTMLCanvasElement {
  const ti = Math.min(1, canh / Math.max(nguon.width, nguon.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(nguon.width * ti));
  c.height = Math.max(1, Math.round(nguon.height * ti));
  c.getContext('2d')!.drawImage(nguon, 0, 0, c.width, c.height);
  return c;
}

/** Hộp bao vuông quanh 4 góc mã, đã nới lề và ép nằm trong ảnh. */
export function hopVuongQuanhMa(
  goc: { x: number; y: number }[],
  rongAnh: number,
  caoAnh: number,
): { x: number; y: number; canh: number } {
  const xs = goc.map((g) => g.x);
  const ys = goc.map((g) => g.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const canhMa = Math.max(x1 - x0, y1 - y0);
  const canh = Math.min(canhMa * (1 + 2 * LE), rongAnh, caoAnh);
  // Giữ tâm mã làm tâm khung cắt, rồi đẩy vào trong nếu tràn mép ảnh
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const x = Math.min(Math.max(0, cx - canh / 2), rongAnh - canh);
  const y = Math.min(Math.max(0, cy - canh / 2), caoAnh - canh);
  return { x, y, canh };
}

function canvasRaPng(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((ok, loi) =>
    c.toBlob((b) => (b ? ok(b) : loi(new Error('Không tạo được ảnh PNG'))), 'image/png'),
  );
}

/**
 * Nhận ảnh bất kỳ (ảnh chụp màn hình dọc, ảnh chụp lại mã trên màn hình khác,
 * ảnh mã gốc vuông) và trả về ảnh PNG vuông chứa đúng mã QR.
 *
 * Không dò được mã thì KHÔNG chặn: cắt vuông ở giữa và báo `doDuoc = false` để
 * màn hình nhắc cán bộ tự quét thử. Chặn cứng ở đây từng khiến cán bộ không tải
 * nổi ảnh WeChat nào.
 */
export async function chuanBiAnhQr(file: File): Promise<KetQuaAnhQr> {
  if (file.size > 12 * 1024 * 1024) throw new Error('Ảnh quá lớn (trên 12 MB) — chụp lại hoặc chọn ảnh khác');
  const bm = await createImageBitmap(file).catch(() => null);
  if (!bm) throw new Error('Trình duyệt không đọc được ảnh này — thử tệp JPG hoặc PNG');
  if (Math.min(bm.width, bm.height) < 120) throw new Error('Ảnh quá nhỏ để lấy được mã QR');

  const canvasDo = veRaCanvas(bm, CANH_DO);
  const ctxDo = canvasDo.getContext('2d')!;
  const anh = ctxDo.getImageData(0, 0, canvasDo.width, canvasDo.height);
  const ma = jsQR(anh.data, anh.width, anh.height, { inversionAttempts: 'attemptBoth' });

  const ra = document.createElement('canvas');
  ra.width = CANH_KET_QUA;
  ra.height = CANH_KET_QUA;
  const ctx = ra.getContext('2d')!;
  // Nền trắng: vùng lặng của mã phải sáng, và ảnh nguồn có thể có nền trong suốt
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANH_KET_QUA, CANH_KET_QUA);

  // Toạ độ dò được nằm trên ảnh đã hạ cỡ — quy về ảnh gốc để cắt không mất nét
  const tiLe = bm.width / canvasDo.width;
  let hop: { x: number; y: number; canh: number };
  if (ma) {
    const g = ma.location;
    const goc = [g.topLeftCorner, g.topRightCorner, g.bottomRightCorner, g.bottomLeftCorner]
      .map((p) => ({ x: p.x * tiLe, y: p.y * tiLe }));
    hop = hopVuongQuanhMa(goc, bm.width, bm.height);
  } else {
    const canh = Math.min(bm.width, bm.height);
    hop = { x: (bm.width - canh) / 2, y: (bm.height - canh) / 2, canh };
  }

  ctx.drawImage(bm, hop.x, hop.y, hop.canh, hop.canh, 0, 0, CANH_KET_QUA, CANH_KET_QUA);
  return { blob: await canvasRaPng(ra), doDuoc: !!ma, noiDung: ma?.data ?? '' };
}
