/**
 * KIỂU DỮ LIỆU của phân hệ danh thiếp số — phản chiếu các bảng nc_* trong
 * supabase/migrations/20261004090000_danh_thiep_so_nen_tang.sql.
 *
 * Bảng nc_* chưa có trong types.ts sinh máy (migration chưa áp), nên mọi truy
 * vấn đi qua `db` ở ./db.ts với kiểu khai ở đây; khi regenerate types.ts thì
 * đổi `db` về `supabase` là xong.
 */
import type { BanDich, MaNgonNgu } from './ngonNgu';

export type LoaiNhanSu = 'bien_che' | 'hop_dong' | 'thue_ngoai' | 'ctv' | 'thuc_tap';
export type PhamViChucDanh = 'internal' | 'external';
export type TrangThaiDuyet = 'draft' | 'pending' | 'approved' | 'rejected' | 'retired';
export type LoaiKenh = 'zalo' | 'kakaotalk' | 'line' | 'wechat' | 'whatsapp' | 'linkedin';
export type MauThe = 'TPL_OFFICIAL' | 'TPL_PARTNER' | 'TPL_COLLAB';

export const CAC_LOAI_NHAN_SU: LoaiNhanSu[] = ['bien_che', 'hop_dong', 'thue_ngoai', 'ctv', 'thuc_tap'];

export const TEN_LOAI_NHAN_SU: Record<LoaiNhanSu, string> = {
  bien_che: 'Biên chế / HĐ không thời hạn',
  hop_dong: 'Hợp đồng có thời hạn',
  thue_ngoai: 'Thuê ngoài (bảo vệ, lái xe, dịch vụ)',
  ctv: 'Cộng tác viên',
  thuc_tap: 'Thực tập sinh',
};

export const TEN_TRANG_THAI: Record<TrangThaiDuyet, string> = {
  draft: 'Nháp',
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  retired: 'Đã thu hồi',
};

/** Màu huy hiệu trạng thái — cùng tông với các màn quản trị khác. */
export const MAU_TRANG_THAI: Record<TrangThaiDuyet, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  retired: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

export const TEN_MAU_THE: Record<MauThe, string> = {
  TPL_OFFICIAL: 'Thẻ cán bộ VietinBank',
  TPL_PARTNER: 'Thẻ đơn vị hợp tác',
  TPL_COLLAB: 'Thẻ cộng tác viên / thực tập',
};

/** Mẫu thẻ theo loại nhân sự — TRÙNG với hàm nc_mau_the() trong CSDL. */
export function mauTheTheoLoai(loai: LoaiNhanSu): MauThe {
  if (loai === 'bien_che' || loai === 'hop_dong') return 'TPL_OFFICIAL';
  if (loai === 'thue_ngoai') return 'TPL_PARTNER';
  return 'TPL_COLLAB';
}

export const CAC_KENH: LoaiKenh[] = ['zalo', 'wechat', 'kakaotalk', 'line', 'whatsapp', 'linkedin'];

export const TEN_KENH: Record<LoaiKenh, string> = {
  zalo: 'Zalo', kakaotalk: 'KakaoTalk', line: 'LINE', wechat: 'WeChat', whatsapp: 'WhatsApp', linkedin: 'LinkedIn',
};

/** Kênh không có deep link theo SĐT → phải tải ảnh QR cá nhân (Mục 7.3). */
export function kenhCanQr(k: LoaiKenh): boolean {
  return k === 'wechat' || k === 'kakaotalk';
}

/** Cách nhập của từng kênh, hiện dưới ô nhập ở màn tự phục vụ. */
export const HUONG_DAN_KENH: Record<LoaiKenh, string> = {
  zalo: 'Số điện thoại đăng ký Zalo (khách bấm là mở thẳng khung chat).',
  line: 'LINE ID (khách mở màn thêm bạn).',
  whatsapp: 'Số điện thoại quốc tế, ví dụ 84966503279.',
  linkedin: 'Đường dẫn hồ sơ LinkedIn.',
  wechat: 'WeChat không có link thêm bạn — tải ảnh QR cá nhân (vuông, ≥ 500 px, ≤ 500 KB).',
  kakaotalk: 'KakaoTalk không có link theo số — tải ảnh QR cá nhân hoặc link Open Chat.',
};

// ---------------------------------------------------------------------------
// Dòng bảng
// ---------------------------------------------------------------------------

export interface SauNgonNgu {
  name_vi: string;
  name_en: string | null;
  name_zh_hans: string | null;
  name_zh_hant: string | null;
  name_ko: string | null;
  name_ja: string | null;
}

export interface DonVi extends SauNgonNgu {
  id: string;
  code: string;
  parent_code: string | null;
  sort_order: number;
  addr_vi: string | null;
  addr_en: string | null;
  addr_zh_hans: string | null;
  addr_zh_hant: string | null;
  addr_ko: string | null;
  addr_ja: string | null;
  map_url: string | null;
  phone: string | null;
  status: TrangThaiDuyet;
  approved_by: string | null;
  approved_at: string | null;
  updated_at: string;
}

export interface ChucDanh extends SauNgonNgu {
  id: string;
  code: string;
  scope: PhamViChucDanh;
  allowed_employment: LoaiNhanSu[];
  requires_director_approval: boolean;
  note_internal: string | null;
  status: TrangThaiDuyet;
  effective_from: string | null;
  approved_by: string | null;
  approved_at: string | null;
  updated_at: string;
}

export interface ChucDanhRieng extends SauNgonNgu {
  id: string;
  staff_id: string;
  reason: string;
  status: TrangThaiDuyet;
  requested_by: string | null;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  reject_reason: string | null;
  expires_on: string | null;
}

export interface CanBo {
  id: string;
  user_id: string | null;
  profile_id: string | null;
  employee_code: string | null;
  full_name: string;
  full_name_latin: string | null;
  name_zh: string | null;
  name_ko: string | null;
  name_ja: string | null;
  employment_type: LoaiNhanSu;
  org_unit_code: string;
  internal_title_id: string | null;
  external_title_id: string | null;
  custom_title_id: string | null;
  email: string | null;
  phone_mobile: string | null;
  phone_office: string | null;
  phone_office_public: boolean;
  photo_url: string | null;
  slug: string;
  card_enabled: boolean;
  wallet_override: boolean;
  status: TrangThaiDuyet;
  approved_by: string | null;
  approved_at: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
  note_internal: string | null;
  updated_at: string;
}

export interface Kenh {
  id: string;
  staff_id: string;
  type: LoaiKenh;
  value: string | null;
  qr_image_url: string | null;
  is_public: boolean;
  sort_order: number;
}

export interface TheDaPhatHanh {
  id: string;
  staff_id: string;
  template_code: MauThe;
  qr_url: string;
  google_object_id: string | null;
  apple_serial: string | null;
  nfc_written_at: string | null;
  issued_at: string;
  revoked_at: string | null;
}

// ---------------------------------------------------------------------------
// Payload của nc_resolve_card() — thứ DUY NHẤT trang công khai được render
// ---------------------------------------------------------------------------

export interface DonViTrenThe {
  code: string;
  name: BanDich;
  addr: BanDich;
  map_url?: string;
  phone?: string;
  status?: TrangThaiDuyet;
}

export interface KenhTrenThe {
  type: LoaiKenh;
  value?: string;
  qr_image_url?: string;
}

export interface PayloadThe {
  status: 'ok' | 'preview';
  slug: string;
  card_url: string;
  template: MauThe;
  employment_type: LoaiNhanSu;
  name: { vi: string; latin?: string; zh?: string; ko?: string; ja?: string };
  title?: BanDich;
  title_source?: 'custom' | 'external';
  /** Chuỗi đơn vị từ gốc (Ngân hàng) tới đơn vị của cán bộ */
  units: DonViTrenThe[];
  addr: BanDich;
  map_url?: string;
  unit_phone?: string;
  phone_office?: string;
  phone_mobile?: string;
  photo_url?: string;
  email?: string;
  logo: boolean;
  bank_line: boolean;
  affiliation?: 'thue_ngoai' | 'ctv' | 'thuc_tap';
  channels: KenhTrenThe[];
  wallet: boolean;
  nfc: boolean;
}

export interface PayloadThuHoi {
  status: 'revoked';
  contact: { name?: BanDich; addr?: BanDich; phone?: string; map_url?: string };
}

export interface PayloadKhongCo {
  status: 'not_found';
}

export type KetQuaResolve = PayloadThe | PayloadThuHoi | PayloadKhongCo;

/** Gom 6 cột name_* của một dòng từ điển thành bản dịch. */
export function banDichTen(d: SauNgonNgu): BanDich {
  return {
    vi: d.name_vi, en: d.name_en ?? undefined, zh_hans: d.name_zh_hans ?? undefined,
    zh_hant: d.name_zh_hant ?? undefined, ko: d.name_ko ?? undefined, ja: d.name_ja ?? undefined,
  };
}

/** Gom 6 cột addr_* của đơn vị thành bản dịch. */
export function banDichDiaChi(d: DonVi): BanDich {
  return {
    vi: d.addr_vi ?? undefined, en: d.addr_en ?? undefined, zh_hans: d.addr_zh_hans ?? undefined,
    zh_hant: d.addr_zh_hant ?? undefined, ko: d.addr_ko ?? undefined, ja: d.addr_ja ?? undefined,
  };
}

/** Tên cột theo ngôn ngữ — để form 6 ngôn ngữ dựng bằng vòng lặp thay vì chép 6 lần. */
export function cotTen(l: MaNgonNgu): keyof SauNgonNgu {
  return `name_${l}` as keyof SauNgonNgu;
}
