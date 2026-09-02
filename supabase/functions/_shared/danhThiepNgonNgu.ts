/**
 * NGÔN NGỮ CỦA DANH THIẾP SỐ — nguồn duy nhất cho danh sách ngôn ngữ, cách
 * chọn ngôn ngữ theo trình duyệt của khách và thứ tự rơi về khi thiếu bản dịch.
 *
 * File này KHÔNG import gì: trang danh thiếp công khai (entry riêng, phải tải
 * dưới 300 KB) và màn quản trị cùng dùng, nên không được kéo theo thư viện.
 */

export type MaNgonNgu = 'vi' | 'en' | 'zh_hans' | 'zh_hant' | 'ko' | 'ja';

export const CAC_NGON_NGU: MaNgonNgu[] = ['vi', 'en', 'zh_hans', 'zh_hant', 'ko', 'ja'];

/** Nhãn hiện trên nút chọn ngôn ngữ — viết bằng CHÍNH ngôn ngữ đó để khách nhận ra ngay. */
export const TEN_NGON_NGU: Record<MaNgonNgu, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  zh_hans: '简体中文',
  zh_hant: '繁體中文',
  ko: '한국어',
  ja: '日本語',
};

/** Nhãn ngắn cho cột bảng quản trị. */
export const NHAN_NGAN: Record<MaNgonNgu, string> = {
  vi: 'VI', en: 'EN', zh_hans: 'ZH 简', zh_hant: 'ZH 繁', ko: 'KO', ja: 'JA',
};

/** Mã BCP-47 tương ứng — dùng cho thuộc tính lang của HTML và Google Wallet. */
export const MA_BCP47: Record<MaNgonNgu, string> = {
  vi: 'vi', en: 'en', zh_hans: 'zh-Hans', zh_hant: 'zh-Hant', ko: 'ko', ja: 'ja',
};

/** Bản dịch một trường: có thể thiếu bất kỳ ngôn ngữ nào. */
export type BanDich = Partial<Record<MaNgonNgu, string>>;

/**
 * Thứ tự rơi về khi thiếu bản dịch (Mục 4.2 đặc tả):
 *   zh_hant → zh_hans → en → vi
 *   ko / ja → en → vi
 *   en → vi
 * Khi phải rơi về thì hiện NGUYÊN VĂN bản có sẵn, không dịch máy lúc chạy.
 */
export const CHUOI_ROI_VE: Record<MaNgonNgu, MaNgonNgu[]> = {
  vi: ['vi'],
  en: ['en', 'vi'],
  zh_hans: ['zh_hans', 'en', 'vi'],
  zh_hant: ['zh_hant', 'zh_hans', 'en', 'vi'],
  ko: ['ko', 'en', 'vi'],
  ja: ['ja', 'en', 'vi'],
};

/** Chọn bản dịch theo ngôn ngữ, rơi về theo chuỗi trên; rỗng nếu không có gì. */
export function chonBanDich(bd: BanDich | null | undefined, lang: MaNgonNgu): string {
  if (!bd) return '';
  for (const l of CHUOI_ROI_VE[lang]) {
    const v = bd[l];
    if (v && v.trim()) return v.trim();
  }
  return '';
}

/** Ngôn ngữ THẬT SỰ được dùng sau khi rơi về — để đặt lang cho đúng phông chữ. */
export function ngonNguThucDung(bd: BanDich | null | undefined, lang: MaNgonNgu): MaNgonNgu {
  if (!bd) return lang;
  for (const l of CHUOI_ROI_VE[lang]) {
    const v = bd[l];
    if (v && v.trim()) return l;
  }
  return lang;
}

/** Những ngôn ngữ còn thiếu bản dịch (không tính rơi về) — cột cảnh báo ở màn quản trị. */
export function ngonNguThieu(bd: BanDich | null | undefined, can: MaNgonNgu[] = CAC_NGON_NGU): MaNgonNgu[] {
  return can.filter((l) => !(bd?.[l] && bd[l]!.trim()));
}

/**
 * Suy ngôn ngữ từ danh sách ưu tiên của trình duyệt (navigator.languages) —
 * trang tĩnh không đọc được header Accept-Language, và hai thứ này là cùng một
 * nguồn. Không hỏi khách; khách đổi bằng thanh 6 nút nếu muốn.
 *
 * zh-TW / zh-HK / zh-MO (và mọi zh-Hant-*) → phồn thể; zh còn lại → giản thể.
 */
export function suyNgonNgu(uuTien: readonly string[] | undefined | null): MaNgonNgu {
  for (const raw of uuTien ?? []) {
    const tag = raw.toLowerCase();
    if (tag.startsWith('vi')) return 'vi';
    if (tag.startsWith('en')) return 'en';
    if (tag.startsWith('ko')) return 'ko';
    if (tag.startsWith('ja')) return 'ja';
    if (tag.startsWith('zh')) {
      if (tag.includes('hant') || tag.includes('-tw') || tag.includes('-hk') || tag.includes('-mo')) {
        return 'zh_hant';
      }
      return 'zh_hans';
    }
  }
  return 'vi';
}

/** Có phải mã ngôn ngữ hợp lệ không — để đọc `?lang=` an toàn. */
export function laMaNgonNgu(v: unknown): v is MaNgonNgu {
  return typeof v === 'string' && (CAC_NGON_NGU as string[]).includes(v);
}

/** Mã quốc gia 2 chữ suy từ thẻ ngôn ngữ (vi-VN → VN); không có thì null. KHÔNG dùng IP. */
export function suyQuocGia(uuTien: readonly string[] | undefined | null): string | null {
  for (const raw of uuTien ?? []) {
    const m = /^[a-z]{2,3}(?:-[a-z]{4})?-([a-z]{2})\b/i.exec(raw);
    if (m) return m[1].toUpperCase();
  }
  return null;
}
