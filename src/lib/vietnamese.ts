/**
 * Tiện ích so khớp chuỗi tiếng Việt cho ô tìm kiếm / bảng lệnh.
 *
 * Cán bộ gõ nhanh thường bỏ dấu ("tu danh gia", "bao cao dau moi"), nên so khớp
 * phải bỏ dấu ở CẢ hai phía. Chữ đ/Đ không phải là ký tự có dấu tổ hợp nên
 * NFD không tách được — phải thay tay trước khi loại dấu.
 */

/** Bỏ dấu, hạ chữ thường, gộp khoảng trắng. "Tự đánh giá" → "tu danh gia". */
export function boDau(s: string): string {
  return s
    .normalize('NFD')
    // U+0300–U+036F là dải dấu tổ hợp (huyền, sắc, hỏi, ngã, nặng, mũ, móc…)
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Có khớp không — bỏ dấu hai phía, mỗi từ trong truy vấn phải xuất hiện ở đâu đó
 * trong văn bản. Nhờ vậy "gia can bo" khớp "Đánh giá cán bộ" dù thiếu từ đầu.
 */
export function khopTimKiem(vanBan: string, truyVan: string): boolean {
  const q = boDau(truyVan);
  if (!q) return true;
  const t = boDau(vanBan);
  return q.split(' ').every((tu) => t.includes(tu));
}

/**
 * Điểm ưu tiên để xếp hạng kết quả: khớp đầu chuỗi > khớp đầu một từ > khớp giữa.
 * Trả 0 khi không khớp.
 */
export function diemKhop(vanBan: string, truyVan: string): number {
  const q = boDau(truyVan);
  if (!q) return 1;
  const t = boDau(vanBan);
  if (!khopTimKiem(vanBan, truyVan)) return 0;
  if (t.startsWith(q)) return 3;
  if (t.includes(` ${q}`)) return 2;
  return 1;
}
