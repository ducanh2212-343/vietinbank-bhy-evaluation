/**
 * DỰNG THẺ GOOGLE WALLET (Generic pass) từ payload nc_resolve_card().
 *
 * File này KHÔNG import gì và có BẢN SAO Y HỆT ở
 * supabase/functions/_shared/googleWallet.ts (edge function `danh-thiep-wallet`
 * ký và chuyển hướng khách sang Google). Sửa một bên thì chép nguyên sang bên
 * kia — có kiểm thử so hai tệp từng byte.
 *
 * Vì sao chỉ dựng đối tượng ở đây mà không ký: chữ ký cần khoá riêng của tài
 * khoản dịch vụ Google. Khoá đó chỉ nằm ở edge function (biến bí mật
 * GOOGLE_WALLET_SA_KEY); trình duyệt không bao giờ chạm vào, nút «Thêm vào
 * Google Wallet» chỉ trỏ sang edge function.
 *
 * Vì sao loại «Generic» chứ không loyalty/offer: danh thiếp không phải thẻ khách
 * hàng thân thiết cũng không phải phiếu giảm giá; khai sai loại thì Google từ
 * chối duyệt lớp thẻ.
 */

/** Mã ngôn ngữ nội bộ của phân hệ danh thiếp. */
export type MaNgonNguWallet = 'vi' | 'en' | 'zh_hans' | 'zh_hant' | 'ko' | 'ja';

/** Một chuỗi 6 ngôn ngữ như từ điển trả về. */
export type BanDichWallet = Partial<Record<MaNgonNguWallet, string>>;

/** Phần payload thẻ mà Wallet cần — tập con của nc_resolve_card(). */
export interface TheChoWallet {
  slug: string;
  card_url: string;
  name: { vi: string };
  title?: BanDichWallet;
  units: { code: string; name: BanDichWallet }[];
  addr?: BanDichWallet;
  map_url?: string;
  phone_mobile?: string;
  phone_office?: string;
  email?: string;
  photo_url?: string;
}

/**
 * Hàm chọn bản dịch do bên gọi truyền vào (client dùng chonBanDich của
 * ngonNgu.ts, edge dùng bản trong danhThiepNgonNgu.ts). Nhận vào đây thay vì
 * import để hai bản sao của file này giống nhau từng byte.
 */
export type HamChonBanDich = (bd: BanDichWallet | undefined, lang: MaNgonNguWallet) => string;

/** Mã ngôn ngữ Google dùng theo BCP-47; Google không hiểu 'zh_hans'. */
const BCP47: Record<MaNgonNguWallet, string> = {
  vi: 'vi',
  en: 'en',
  zh_hans: 'zh-Hans',
  zh_hant: 'zh-Hant',
  ko: 'ko',
  ja: 'ja',
};

/** Nền thẻ trong ví: xanh VietinBank, cùng tông với tấm thẻ web. */
const MAU_NEN = '#12202E';

export interface ThamSoWallet {
  /** Issuer ID của Chi nhánh, lấy trong Google Wallet Business Console. */
  issuerId: string;
  /** Hậu tố lớp thẻ: classId = <issuerId>.<classSuffix> */
  classSuffix: string;
  /** Ngôn ngữ hiển thị của thẻ trong ví khách. */
  lang: MaNgonNguWallet;
}

/** Id đối tượng phải duy nhất theo Issuer và chỉ gồm chữ, số, gạch, chấm. */
export function maDoiTuongWallet(issuerId: string, slug: string): string {
  return `${issuerId}.${slug.replace(/[^A-Za-z0-9_-]/g, '-')}`;
}

function chuoiCoNgonNgu(giaTri: string, lang: MaNgonNguWallet) {
  return { defaultValue: { language: BCP47[lang], value: giaTri } };
}

/**
 * Đối tượng Generic gửi cho Google. Chỉ đưa lên những gì thẻ web đã công khai:
 * nc_resolve_card() lọc sẵn theo ma trận quyền hiển thị nên không lộ thêm gì.
 */
export function dungDoiTuongWallet(
  the: TheChoWallet,
  ts: ThamSoWallet,
  dich: HamChonBanDich,
): Record<string, unknown> {
  const lang = ts.lang;
  const chucDanh = dich(the.title, lang);
  const tenDonVi = the.units.map((u) => dich(u.name, lang)).filter((x) => !!x);
  // Chi nhánh là đơn vị ngay dưới gốc; phòng / PGD là đơn vị cuối chuỗi
  const chiNhanh = tenDonVi.length >= 2 ? tenDonVi[1] : (tenDonVi[0] ?? '');
  const donViCuoi = tenDonVi.length >= 3 ? tenDonVi[tenDonVi.length - 1] : '';
  const diaChi = dich(the.addr, lang);

  const dongPhu: Record<string, string>[] = [];
  if (donViCuoi) dongPhu.push({ id: 'don_vi', header: 'Đơn vị', body: donViCuoi });
  if (the.phone_mobile) dongPhu.push({ id: 'di_dong', header: 'Di động', body: the.phone_mobile });
  if (the.phone_office) dongPhu.push({ id: 'co_quan', header: 'Điện thoại cơ quan', body: the.phone_office });
  if (the.email) dongPhu.push({ id: 'email', header: 'Email', body: the.email });
  if (diaChi) dongPhu.push({ id: 'dia_chi', header: 'Địa chỉ', body: diaChi });

  const doiTuong: Record<string, unknown> = {
    id: maDoiTuongWallet(ts.issuerId, the.slug),
    classId: `${ts.issuerId}.${ts.classSuffix}`,
    state: 'ACTIVE',
    hexBackgroundColor: MAU_NEN,
    cardTitle: chuoiCoNgonNgu(chiNhanh || 'VietinBank', lang),
    header: chuoiCoNgonNgu(the.name.vi, lang),
    textModulesData: dongPhu,
    // Quét mã trên thẻ trong ví mở đúng trang danh thiếp, đánh dấu kênh wallet
    barcode: {
      type: 'QR_CODE',
      value: `${the.card_url}?c=wallet`,
      alternateText: the.slug,
    },
    linksModuleData: {
      uris: [
        { id: 'trang_the', uri: the.card_url, description: 'Danh thiếp số' },
        ...(the.map_url ? [{ id: 'ban_do', uri: the.map_url, description: 'Chỉ đường' }] : []),
      ],
    },
  };

  if (chucDanh) doiTuong.subheader = chuoiCoNgonNgu(chucDanh, lang);
  if (the.photo_url) {
    doiTuong.heroImage = {
      sourceUri: { uri: the.photo_url },
      contentDescription: chuoiCoNgonNgu(the.name.vi, lang),
    };
  }
  return doiTuong;
}

/**
 * Thân JWT «Save to Google Wallet». Edge function ký RS256 rồi ghép thành
 * https://pay.google.com/gp/v/save/<jwt>.
 */
export function dungThanJwtWallet(
  doiTuong: Record<string, unknown>,
  saEmail: string,
  goc: string,
  giay: number,
): Record<string, unknown> {
  return {
    iss: saEmail,
    aud: 'google',
    typ: 'savetowallet',
    iat: giay,
    origins: [goc],
    payload: { genericObjects: [doiTuong] },
  };
}

/** Đã đủ cấu hình để hiện nút «Thêm vào Google Wallet» chưa. */
export function walletSanSang(cauHinh: Record<string, unknown>): boolean {
  const id = cauHinh.google_wallet_issuer_id;
  return cauHinh.google_wallet_bat === true && typeof id === 'string' && id.trim().length > 0;
}
