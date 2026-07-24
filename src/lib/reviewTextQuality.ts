// Chất lượng nhận xét của CBQL: phát hiện ý kiến "đồng ý" suông để nhắc
// (khuyến nghị mềm theo chỉ đạo BGĐ 07/2026 — chỉ cảnh báo, KHÔNG chặn lưu).

const BARE_PHRASES = [
  'đồng ý', 'dong y', 'nhất trí', 'nhat tri', 'thống nhất', 'thong nhat',
  'ok', 'oke', 'okie', 'đã xem', 'da xem', 'tốt', 'tot',
];

// Khớp khi toàn bộ nội dung chỉ là một cụm ở trên (kèm dấu câu cuối tuỳ ý).
const BARE_RE = new RegExp(`^(?:${BARE_PHRASES.join('|')})[\\s.!…]*$`, 'i');

/** Nội dung chỉ là "đồng ý"/tương đương — thiếu căn cứ, cần khuyến nghị viết rõ hơn. */
export function isBareAgreement(text: string | null | undefined): boolean {
  const t = (text || '').trim().toLowerCase();
  if (!t) return false;
  return BARE_RE.test(t);
}

/** Dòng khuyến nghị dùng chung tại các ô ý kiến CBQL. */
export const BARE_AGREEMENT_HINT =
  'Hạn chế ghi "đồng ý" đơn thuần — nêu rõ căn cứ, điểm được/chưa được và việc cán bộ cần làm tiếp.';
