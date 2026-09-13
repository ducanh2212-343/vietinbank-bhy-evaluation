/**
 * Chuyển SVG (chuỗi) thành PNG qua <img> + canvas. Phóng 2× để chữ không răng
 * cưa khi dán vào slide / in. Dùng data URL thay vì blob URL vì Safari không
 * vẽ được <img src=blob:…svg> có font-family lên canvas (taint) trong một số bản.
 */
export function svgSangPng(svg: string, w: number, h: number, tiLe = 2): Promise<Blob> {
  return new Promise((ok, loi) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.round(w * tiLe); c.height = Math.round(h * tiLe);
      const ctx = c.getContext('2d');
      if (!ctx) return loi(new Error('Trình duyệt không hỗ trợ canvas'));
      ctx.scale(tiLe, tiLe);
      ctx.drawImage(img, 0, 0, w, h);
      c.toBlob((b) => (b ? ok(b) : loi(new Error('Không tạo được ảnh'))), 'image/png');
    };
    img.onerror = () => loi(new Error('Không dựng được ảnh từ sơ đồ'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

/** Tải một blob về máy — tên tệp bỏ ký tự cấm của Windows */
export function taiXuong(blob: Blob, ten: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = ten.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'ban-ve.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
