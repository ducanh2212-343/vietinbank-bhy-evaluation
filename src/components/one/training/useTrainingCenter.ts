import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Ct2DauViec } from '@/lib/ct2';
import { kyTepTrainingCenter } from './tepTrainingCenter';
import type { KetQuaDiemDanh, TtcCauHinhDiemDanh, TtcDiemDanh, TtcQrNgay, TtcThuDinhVi } from '@/lib/diemDanh';
import type {
  TtcChuongTrinh, TtcDauViec, TtcDiemBloom, TtcDiemKiem, TtcKetQuaNghiemThu, TtcLichSuChuan, TtcMucGiao,
  TtcNgay, TtcPhieuForm, TtcSuyNgam, TtcThanhVien, TtcTienDo, TtcTrangThaiPhieu, TtcTuSoi, TtcVai, TtcViecGoiDau,
  TtcTep, TtcCauHinhNhac,
} from '@/lib/trainingCenter';

/**
 * Lớp dữ liệu Bắc Hưng Yên Training Center.
 *
 * Cùng nguyên tắc với Chiêu thức 2 (useCt2Data): mỗi màn một vòng gọi gọn,
 * react-query giữ cache ngắn, không realtime. Bảng ttc_* chưa có trong
 * types.ts sinh tự động — ép kiểu ở đúng ranh giới truy vấn như các bảng ct2_*.
 */

interface Ket<T> { data: T; error: { code?: string; message?: string } | null }
interface SelectChain extends PromiseLike<Ket<unknown>> {
  eq(c: string, v: unknown): SelectChain;
  in(c: string, v: unknown[]): SelectChain;
  order(c: string, o?: { ascending?: boolean; nullsFirst?: boolean }): SelectChain;
  limit(n: number): SelectChain;
  maybeSingle(): PromiseLike<Ket<unknown>>;
}
interface WriteChain extends PromiseLike<Ket<unknown>> {
  eq(c: string, v: unknown): WriteChain;
  select(c?: string): WriteChain;
  maybeSingle(): PromiseLike<Ket<unknown>>;
}
const db = supabase as unknown as {
  from(t: string): {
    select(c: string): SelectChain;
    insert(v: unknown): WriteChain;
    upsert(v: unknown, o?: { onConflict?: string }): WriteChain;
    update(v: unknown): WriteChain;
    delete(): WriteChain;
  };
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<Ket<unknown>>;
};

const NUA_PHUT = 30_000;
const NAM_PHUT = 300_000;

function nemNeuLoi<T>(r: Ket<T>): T {
  if (r.error) throw new Error(r.error.message ?? 'Lỗi truy vấn');
  return r.data;
}

/** 'HH:MM:SS' của Postgres → 'HH:MM' cho giao diện */
function gioNgan(g: string): string {
  return (g ?? '').slice(0, 5);
}

export function useTtcLamTuoi() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['ttc'] });
}

// ---------------------------------------------------------------------------
// Danh mục chương trình + bối cảnh một chương trình
// ---------------------------------------------------------------------------

/** Vì sao lỗi: bảng chưa có (migration chưa áp) khác với lỗi mạng — báo cho đúng người */
export function chuaCaiCauPhan(e: unknown): boolean {
  const m = e instanceof Error ? e.message : String(e ?? '');
  return /does not exist|42P01|schema cache|Could not find the table/i.test(m);
}

/**
 * DANH MỤC: mọi chương trình cán bộ thấy được (RLS mở danh mục cho toàn bộ
 * cán bộ) + các dòng thành viên của chính tôi để biết mình ở đâu.
 */
export function useTtcDanhMuc() {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: ['ttc', 'danh-muc', profileId],
    enabled: !!profileId,
    staleTime: NAM_PHUT,
    queryFn: async () => {
      const [ct, tv] = await Promise.all([
        db.from('ttc_chuong_trinh').select('*').order('ngay_bd', { ascending: false }).limit(200),
        db.from('ttc_thanh_vien').select('id, chuong_trinh_id, nguoi, vai').eq('nguoi', profileId),
      ]);
      return {
        chuongTrinh: (nemNeuLoi(ct) ?? []) as TtcChuongTrinh[],
        cuaToi: (nemNeuLoi(tv) ?? []) as TtcThanhVien[],
      };
    },
  });
}

/**
 * Ai vào được màn Quản trị và soạn được chương trình nào — bản client của
 * `ttc_sua_duoc_noi_dung` ở máy chủ (RLS mới là hàng rào thật). Soạn nội dung
 * (thông tin, ngày, đầu việc): quản trị hoặc Ban Giám đốc của chương trình,
 * system_admin. Xếp thành viên và tạo/nhân bản chương trình vẫn là việc của
 * Phòng Tổng hợp — Giám đốc yêu cầu 06/09: BGĐ và TCTH sửa được nội dung.
 */
export function useTtcQuyenSoan() {
  const { roles } = useAuth();
  const { data } = useTtcDanhMuc();
  const laSystemAdmin = roles.includes('system_admin');
  const laTcth = laSystemAdmin || roles.includes('tcth_admin');
  const ctSoanDuoc = useMemo(
    () => new Set((data?.cuaToi ?? []).filter((t) => t.vai === 'quan_tri' || t.vai === 'bgd').map((t) => t.chuong_trinh_id)),
    [data],
  );
  const ctQuanTri = useMemo(
    () => new Set((data?.cuaToi ?? []).filter((t) => t.vai === 'quan_tri').map((t) => t.chuong_trinh_id)),
    [data],
  );
  return {
    laTcth,
    laSystemAdmin,
    /** Vào được màn Quản trị: TCTH, hoặc là BGĐ/quản trị của ít nhất một chương trình */
    laVaoDuoc: laTcth || roles.includes('bgd') || ctSoanDuoc.size > 0,
    soanDuoc: (ctId: string) => laSystemAdmin || ctSoanDuoc.has(ctId),
    xepThanhVienDuoc: (ctId: string) => laSystemAdmin || ctQuanTri.has(ctId),
  };
}

export interface TtcBoiCanh {
  chuongTrinh: TtcChuongTrinh | null;
  thanhVien: TtcThanhVien[];
  /** Vai của tôi trong chương trình; null = không thuộc chương trình */
  vai: TtcVai | null;
  /** Mọi học viên của chương trình (hội nhập 30 ngày có nhiều người) */
  dsHocVien: TtcThanhVien[];
  /** Học viên đang được xem: chính mình nếu tôi là học viên, nếu không là người được chọn */
  hocVien: TtcThanhVien | null;
  laHocVien: boolean;
  laNguoiCham: boolean;
  laBgd: boolean;
  laQuanTri: boolean;
  /** Sửa được nội dung chương trình (thông tin, ngày, đầu việc): quản trị, BGĐ, system_admin */
  laSuaDuocNoiDung: boolean;
}

/**
 * Bối cảnh MỘT chương trình theo id trên đường dẫn. `hocVienChon` là học viên
 * mà người hướng dẫn/BGĐ/TCTH đang xem (query `?hv=`); học viên luôn xem mình.
 */
export function useTtcBoiCanh(ctId: string | null, hocVienChon: string | null = null):
  TtcBoiCanh & { isLoading: boolean; isError: boolean; error: unknown } {
  const { profileId, roles } = useAuth();
  const laSystemAdmin = roles.includes('system_admin');

  const ct = useQuery({
    queryKey: ['ttc', 'chuong-trinh', ctId],
    enabled: !!profileId && !!ctId,
    staleTime: NAM_PHUT,
    queryFn: async () => {
      const data = nemNeuLoi(await db.from('ttc_chuong_trinh').select('*').eq('id', ctId).maybeSingle()) as TtcChuongTrinh | null;
      return data ?? null;
    },
  });

  const tv = useQuery({
    queryKey: ['ttc', 'thanh-vien', ctId],
    enabled: !!ctId && !!ct.data,
    staleTime: NAM_PHUT,
    queryFn: async () => {
      const rows = nemNeuLoi(await db.from('ttc_thanh_vien')
        .select('id, chuong_trinh_id, nguoi, vai, profiles:nguoi(full_name, avatar_url)')
        .eq('chuong_trinh_id', ctId)) as Array<TtcThanhVien & { profiles?: { full_name: string; avatar_url: string | null } | null }>;
      return (rows ?? []).map((r) => ({
        id: r.id, chuong_trinh_id: r.chuong_trinh_id, nguoi: r.nguoi, vai: r.vai,
        full_name: r.profiles?.full_name ?? undefined, avatar_url: r.profiles?.avatar_url ?? null,
      })).sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? '', 'vi'));
    },
  });

  const thanhVien = useMemo(() => tv.data ?? [], [tv.data]);
  const toi = thanhVien.find((t) => t.nguoi === profileId) ?? null;
  // system_admin không có dòng thành viên vẫn xem được như quản trị (bảo trì)
  const vai: TtcVai | null = toi?.vai ?? (laSystemAdmin && ct.data ? 'quan_tri' : null);
  const dsHocVien = useMemo(() => thanhVien.filter((t) => t.vai === 'hoc_vien'), [thanhVien]);
  const hocVien = vai === 'hoc_vien'
    ? toi
    : (dsHocVien.find((h) => h.nguoi === hocVienChon) ?? dsHocVien[0] ?? null);

  return {
    chuongTrinh: ct.data ?? null,
    thanhVien,
    vai,
    dsHocVien,
    hocVien,
    laHocVien: vai === 'hoc_vien',
    laNguoiCham: vai === 'huong_dan' || vai === 'bgd',
    laBgd: vai === 'bgd',
    laQuanTri: vai === 'quan_tri',
    laSuaDuocNoiDung: vai === 'quan_tri' || vai === 'bgd' || laSystemAdmin,
    isLoading: ct.isLoading || (!!ct.data && tv.isLoading),
    isError: ct.isError || tv.isError,
    error: ct.error ?? tv.error,
  };
}

// ---------------------------------------------------------------------------
// Quản trị chương trình (Phòng TCTH) — tạo, sửa, nhân bản, thành viên, ngày, đầu việc
// ---------------------------------------------------------------------------

export type TtcChuongTrinhForm = Pick<TtcChuongTrinh,
  'ten' | 'mo_ta' | 'ngay_bd' | 'ngay_kt' | 'trang_thai' | 'nhom_doi_tuong' | 'loai' | 'khoi_nang_luc' | 'la_mau'>;

export async function luuChuongTrinh(f: TtcChuongTrinhForm, id?: string): Promise<string> {
  if (id) {
    nemNeuLoi(await db.from('ttc_chuong_trinh').update({ ...f, updated_at: new Date().toISOString() }).eq('id', id));
    return id;
  }
  const row = nemNeuLoi(await db.from('ttc_chuong_trinh').insert(f).select('id').maybeSingle()) as { id: string } | null;
  return row?.id ?? '';
}

export async function nhanBanChuongTrinh(nguonId: string, ten: string, ngayBd: string): Promise<string> {
  return nemNeuLoi(await db.rpc('ttc_nhan_ban_chuong_trinh', { _nguon: nguonId, _ten: ten, _ngay_bd: ngayBd })) as string;
}

export async function themThanhVien(ctId: string, nguoi: string, vai: TtcVai) {
  nemNeuLoi(await db.from('ttc_thanh_vien').upsert({ chuong_trinh_id: ctId, nguoi, vai }, { onConflict: 'chuong_trinh_id,nguoi' }));
}

export async function xoaThanhVien(id: string) {
  nemNeuLoi(await db.from('ttc_thanh_vien').delete().eq('id', id));
}

export async function luuNgay(p: Omit<TtcNgay, 'id'> & { id?: string }) {
  const { id, ...phan } = p;
  if (id) nemNeuLoi(await db.from('ttc_ngay').update(phan).eq('id', id));
  else nemNeuLoi(await db.from('ttc_ngay').insert(phan));
}

export async function xoaNgay(id: string) {
  nemNeuLoi(await db.from('ttc_ngay').delete().eq('id', id));
}

export async function luuDauViec(p: Omit<TtcDauViec, 'id'> & { id?: string }) {
  const { id, ...phan } = p;
  if (id) nemNeuLoi(await db.from('ttc_dau_viec').update(phan).eq('id', id));
  else nemNeuLoi(await db.from('ttc_dau_viec').insert(phan));
}

export async function xoaDauViec(id: string) {
  nemNeuLoi(await db.from('ttc_dau_viec').delete().eq('id', id));
}

// ---------------------------------------------------------------------------
// Lộ trình: ngày + đầu việc + tiến độ
// ---------------------------------------------------------------------------

export function useTtcNgay(ctId: string | null) {
  return useQuery({
    queryKey: ['ttc', 'ngay', ctId],
    enabled: !!ctId,
    staleTime: NAM_PHUT,
    queryFn: async () => {
      const data = nemNeuLoi(await db.from('ttc_ngay').select('*')
        .eq('chuong_trinh_id', ctId).order('so_thu_tu')) as TtcNgay[];
      return data ?? [];
    },
  });
}

export function useTtcDauViec(ctId: string | null, ngayIds: string[]) {
  const khoa = ngayIds.join(',');
  return useQuery({
    queryKey: ['ttc', 'dau-viec', ctId, khoa],
    enabled: !!ctId && ngayIds.length > 0,
    staleTime: NAM_PHUT,
    queryFn: async () => {
      const data = nemNeuLoi(await db.from('ttc_dau_viec').select('*')
        .in('ngay_id', ngayIds).order('gio_bat_dau')) as TtcDauViec[];
      return (data ?? []).map((v) => ({ ...v, gio_bat_dau: gioNgan(v.gio_bat_dau), gio_ket_thuc: gioNgan(v.gio_ket_thuc) }));
    },
  });
}

/** Tiến độ của một học viên trên toàn chương trình — một select, lọc theo ngày ở client */
export function useTtcTienDo(ctId: string | null, hocVienId: string | null, dauViecIds: string[]) {
  return useQuery({
    queryKey: ['ttc', 'tien-do', ctId, hocVienId],
    enabled: !!ctId && !!hocVienId && dauViecIds.length > 0,
    staleTime: NUA_PHUT,
    queryFn: async () => {
      const data = nemNeuLoi(await db.from('ttc_tien_do').select('*')
        .eq('nguoi', hocVienId).in('dau_viec_id', dauViecIds)) as TtcTienDo[];
      return data ?? [];
    },
  });
}

/**
 * Lưu phần nộp của học viên cho một đầu việc (tệp, ghi chú, đường dẫn) — không đổi
 * ô tích. Upsert theo (đầu việc, người); dòng chưa có thì tạo với hoan_thanh=false.
 */
export async function luuNopDauViec(p: { dau_viec_id: string; nguoi: string; tep?: TtcTep[]; ghi_chu?: string | null; duong_dan?: string | null }) {
  const { data: cu } = await db.from('ttc_tien_do').select('id, hoan_thanh, thoi_diem')
    .eq('dau_viec_id', p.dau_viec_id).eq('nguoi', p.nguoi).maybeSingle();
  const dong = cu as { hoan_thanh: boolean; thoi_diem: string | null } | null;
  nemNeuLoi(await db.from('ttc_tien_do').upsert({
    dau_viec_id: p.dau_viec_id, nguoi: p.nguoi,
    hoan_thanh: dong?.hoan_thanh ?? false, thoi_diem: dong?.thoi_diem ?? null,
    ...(p.tep !== undefined ? { tep: p.tep } : {}),
    ...(p.ghi_chu !== undefined ? { ghi_chu: p.ghi_chu } : {}),
    ...(p.duong_dan !== undefined ? { duong_dan: p.duong_dan } : {}),
  }, { onConflict: 'dau_viec_id,nguoi' }));
}

/** Ký đường dẫn tệp đã nộp để mở — bucket private, chỉ thành viên chương trình ký được */
export function useTtcKyTep(paths: string[]) {
  const khoa = paths.join(',');
  return useQuery({
    queryKey: ['ttc', 'ky-tep', khoa],
    enabled: paths.length > 0,
    staleTime: 50 * 60_000,
    queryFn: () => kyTepTrainingCenter(paths),
  });
}

/** Cấu hình nhắc của lần đào tạo — quản trị/BGĐ của chương trình (policy sửa chương trình) */
export async function luuNhac(ctId: string, nhac: TtcCauHinhNhac) {
  nemNeuLoi(await db.from('ttc_chuong_trinh').update({ nhac, updated_at: new Date().toISOString() }).eq('id', ctId));
}

/** Học viên tích / bỏ tích một đầu việc — upsert theo (đầu việc, người) */
export async function tichDauViec(dauViecId: string, nguoi: string, hoanThanh: boolean, ghiChu?: string | null) {
  nemNeuLoi(await db.from('ttc_tien_do').upsert({
    dau_viec_id: dauViecId, nguoi, hoan_thanh: hoanThanh,
    thoi_diem: hoanThanh ? new Date().toISOString() : null,
    ...(ghiChu !== undefined ? { ghi_chu: ghiChu } : {}),
  }, { onConflict: 'dau_viec_id,nguoi' }));
}

// ---------------------------------------------------------------------------
// Điểm Bloom
// ---------------------------------------------------------------------------

export function useTtcDiemBloom(ctId: string | null, ngayIds: string[]) {
  const khoa = ngayIds.join(',');
  return useQuery({
    queryKey: ['ttc', 'diem', ctId, khoa],
    enabled: !!ctId && ngayIds.length > 0,
    staleTime: NUA_PHUT,
    queryFn: async () => {
      const data = nemNeuLoi(await db.from('ttc_diem_bloom').select('*')
        .in('ngay_id', ngayIds).order('cham_luc', { ascending: false })) as TtcDiemBloom[];
      return data ?? [];
    },
  });
}

export async function luuDiemBloom(p: {
  id?: string; ngay_id: string; hoc_vien: string; nguoi_cham: string;
  b1: number; b2: number; b3: number; b4: number; b5: number; b6: number;
  tru_hinh_thuc: number; nhan_xet: string | null;
}) {
  const { id, ...phan } = p;
  if (id) nemNeuLoi(await db.from('ttc_diem_bloom').update({ ...phan, cham_luc: new Date().toISOString() }).eq('id', id));
  else nemNeuLoi(await db.from('ttc_diem_bloom').insert(phan));
}

export async function congBoDiem(ids: string[], congBo: boolean) {
  for (const id of ids) nemNeuLoi(await db.from('ttc_diem_bloom').update({ cong_bo: congBo }).eq('id', id));
}

// ---------------------------------------------------------------------------
// Tự soi và tự suy ngẫm — chỉ chính học viên đọc được nội dung
// ---------------------------------------------------------------------------

export function useTtcTuSoi(ctId: string | null, laHocVien: boolean) {
  return useQuery({
    queryKey: ['ttc', 'tu-soi', ctId],
    enabled: !!ctId && laHocVien,
    staleTime: NUA_PHUT,
    queryFn: async () => {
      const data = nemNeuLoi(await db.from('ttc_tu_soi').select('*').eq('chuong_trinh_id', ctId)) as TtcTuSoi[];
      return data ?? [];
    },
  });
}

export async function luuTuSoi(p: Omit<TtcTuSoi, 'id' | 'cap_nhat_luc'>) {
  nemNeuLoi(await db.from('ttc_tu_soi').upsert(
    { ...p, cap_nhat_luc: new Date().toISOString() },
    { onConflict: 'chuong_trinh_id,nguoi,dot' },
  ));
}

export function useTtcSuyNgam(ngayIds: string[], laHocVien: boolean) {
  const khoa = ngayIds.join(',');
  return useQuery({
    queryKey: ['ttc', 'suy-ngam', khoa],
    enabled: laHocVien && ngayIds.length > 0,
    staleTime: NUA_PHUT,
    queryFn: async () => {
      const data = nemNeuLoi(await db.from('ttc_suy_ngam').select('*').in('ngay_id', ngayIds)) as TtcSuyNgam[];
      return data ?? [];
    },
  });
}

export async function luuSuyNgam(p: { ngay_id: string; nguoi: string; noi_dung: string; muc_tu_cham: number | null }) {
  nemNeuLoi(await db.from('ttc_suy_ngam').upsert(
    { ...p, thoi_diem: new Date().toISOString() },
    { onConflict: 'ngay_id,nguoi' },
  ));
}

/** Cờ «đã điền hay chưa» cho vai khác — không có nội dung */
export interface CoTuSoi { nguoi: string; dot: number; so_tieu_chi_da_cham: number; cap_nhat_luc: string }
export interface CoSuyNgam { ngay_id: string; nguoi: string; thoi_diem: string }

export function useTtcCoTuSoi(ctId: string | null) {
  return useQuery({
    queryKey: ['ttc', 'co-tu-soi', ctId],
    enabled: !!ctId,
    staleTime: NUA_PHUT,
    queryFn: async () => {
      const [a, b] = await Promise.all([
        db.rpc('ttc_trang_thai_tu_soi', { _ct: ctId }),
        db.rpc('ttc_trang_thai_suy_ngam', { _ct: ctId }),
      ]);
      return {
        tuSoi: (nemNeuLoi(a) ?? []) as CoTuSoi[],
        suyNgam: (nemNeuLoi(b) ?? []) as CoSuyNgam[],
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Bảng việc: ba việc gối đầu + Kanban từ Chiêu thức 2
// ---------------------------------------------------------------------------

export function useTtcViecGoiDau(ctId: string | null, hocVienId: string | null) {
  return useQuery({
    queryKey: ['ttc', 'goi-dau', ctId, hocVienId],
    enabled: !!ctId && !!hocVienId,
    staleTime: NUA_PHUT,
    queryFn: async () => {
      const data = nemNeuLoi(await db.from('ttc_viec_goi_dau').select('*')
        .eq('chuong_trinh_id', ctId).eq('hoc_vien', hocVienId).order('so')) as TtcViecGoiDau[];
      return data ?? [];
    },
  });
}

/** Lưu nháp hoặc sửa phiếu (không khoá chuẩn) — học viên */
export async function luuPhieuGiaoViec(p: TtcPhieuForm & { id?: string; chuong_trinh_id: string; hoc_vien: string; so: number; dau_viec_id?: string | null }) {
  const { id, ten_can_bo: _b, ...phan } = p;
  void _b;
  const du = {
    ...phan,
    dat_chuan: (phan.dat_chuan ?? []).map((d) => d.trim()).filter(Boolean),
    diem_kiem: (phan.diem_kiem ?? []).filter((m) => m.ngay),
    muc_dich: phan.muc_dich?.trim() || null, dau_ra: phan.dau_ra?.trim() || null,
    goi_y_cach_lam: phan.goi_y_cach_lam?.trim() || null, nguon_luc: phan.nguon_luc?.trim() || null,
  };
  if (id) nemNeuLoi(await db.from('ttc_viec_goi_dau').update(du).eq('id', id));
  else nemNeuLoi(await db.from('ttc_viec_goi_dau').insert(du));
}

/** «Giao việc»: khoá chuẩn và đưa thẻ sang Đang làm — trigger ở máy chủ chặn nếu thiếu ô */
export async function giaoViec(id: string) {
  nemNeuLoi(await db.from('ttc_viec_goi_dau').update({ khoa_chuan: true, trang_thai: 'dang_lam' }).eq('id', id));
}

/** «Điều chỉnh chuẩn» sau khi giao — bắt buộc lý do ≥ 20 ký tự, ghi lịch sử */
export async function dieuChinhChuan(g: TtcViecGoiDau, chuanMoi: string[], lyDo: string) {
  const dong: TtcLichSuChuan = { thoi_diem: new Date().toISOString(), chuan_cu: g.dat_chuan, chuan_moi: chuanMoi, ly_do: lyDo.trim() };
  nemNeuLoi(await db.from('ttc_viec_goi_dau')
    .update({ dat_chuan: chuanMoi, lich_su_chuan: [...(g.lich_su_chuan ?? []), dong] }).eq('id', g.id));
}

export async function chuyenCotPhieuGiaoViec(id: string, trangThai: TtcTrangThaiPhieu) {
  nemNeuLoi(await db.from('ttc_viec_goi_dau').update({ trang_thai: trangThai }).eq('id', id));
}

/** Ghi kết quả một điểm kiểm — học viên (người giao việc) */
export async function ghiDiemKiem(g: TtcViecGoiDau, ngay: string, ketQua: TtcDiemKiem['ket_qua'], ghiChu: string) {
  const diem_kiem = (g.diem_kiem ?? []).map((m) => (m.ngay === ngay ? { ...m, ket_qua: ketQua, ghi_chu: ghiChu } : m));
  nemNeuLoi(await db.from('ttc_viec_goi_dau').update({ diem_kiem }).eq('id', g.id));
}

/** Nghiệm thu — BGĐ; hai kết quả, nhận xét ≥ 30 ký tự; trigger tự đếm số lần, đổi cột */
export async function nghiemThuPhieu(id: string, p: { ket_qua: TtcKetQuaNghiemThu; nhan_xet: string; hoi_lai_giua_chung: boolean | null; muc_giao_cuoi_ky: TtcMucGiao | null }) {
  nemNeuLoi(await db.from('ttc_viec_goi_dau').update({
    nghiem_thu_ket_qua: p.ket_qua, nghiem_thu: p.nhan_xet.trim(),
    hoi_lai_giua_chung: p.hoi_lai_giua_chung, muc_giao_cuoi_ky: p.muc_giao_cuoi_ky,
  }).eq('id', id));
}

/** «Mở lại nghiệm thu» — BGĐ; thẻ về Đang làm */
export async function moLaiNghiemThu(id: string) {
  nemNeuLoi(await db.from('ttc_viec_goi_dau').update({ nghiem_thu_ket_qua: null }).eq('id', id));
}

// ---------------------------------------------------------------------------
// Điểm danh — hai luồng: điện thoại + định vị · quét QR của ngày
// ---------------------------------------------------------------------------

/** Bản ghi điểm danh của cả chương trình (RLS: chỉ thành viên đọc được) */
export function useTtcDiemDanh(ctId: string | null, ngayIds: string[]) {
  const khoa = ngayIds.join(',');
  return useQuery({
    queryKey: ['ttc', 'diem-danh', ctId, khoa],
    enabled: !!ctId && ngayIds.length > 0,
    staleTime: NUA_PHUT,
    queryFn: async () => {
      const data = nemNeuLoi(await db.from('ttc_diem_danh').select('*').in('ngay_id', ngayIds)) as TtcDiemDanh[];
      return data ?? [];
    },
  });
}

/** Mã QR còn hiệu lực của từng ngày — chỉ quản trị / BGĐ đọc được (RLS) */
export function useTtcQrNgay(ctId: string | null, ngayIds: string[], bat: boolean) {
  const khoa = ngayIds.join(',');
  return useQuery({
    queryKey: ['ttc', 'qr-ngay', ctId, khoa],
    enabled: bat && !!ctId && ngayIds.length > 0,
    staleTime: NUA_PHUT,
    queryFn: async () => {
      const data = nemNeuLoi(await db.from('ttc_qr_ngay').select('*').in('ngay_id', ngayIds)) as TtcQrNgay[];
      return (data ?? []).filter((q) => !q.vo_hieu);
    },
  });
}

/**
 * Lấy vị trí của máy đang dùng. Bọc lại Promise vì API trình duyệt còn dùng
 * callback; `enableHighAccuracy` để máy ưu tiên GPS thay vì vị trí theo wifi —
 * trong nhà bê tông, vị trí theo wifi lệch tới vài trăm mét, đủ để một học viên
 * đứng trong phòng học vẫn bị báo ngoài vùng.
 */
export function layViTri(): Promise<GeolocationPosition> {
  return new Promise((giai, tuChoi) => {
    if (!('geolocation' in navigator)) {
      tuChoi(new Error('Máy này không hỗ trợ định vị. Dùng điện thoại hoặc quét mã QR trong phòng học.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(giai, (loi) => {
      tuChoi(new Error(
        loi.code === loi.PERMISSION_DENIED
          ? 'Trình duyệt đang chặn định vị. Vào Cài đặt → quyền vị trí, bật cho trang này rồi bấm lại.'
          : loi.code === loi.TIMEOUT
            ? 'Chưa bắt được vị trí. Ra gần cửa sổ rồi bấm lại, hoặc quét mã QR trong phòng học.'
            : 'Không lấy được vị trí. Bật định vị của máy rồi bấm lại.',
      ));
    }, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 });
  });
}

/** Luồng 1 — máy chủ tự tìm ngày hôm nay của chương trình và tự tính khoảng cách */
export async function diemDanhDinhVi(ctId: string, vi: GeolocationPosition): Promise<KetQuaDiemDanh> {
  const data = nemNeuLoi(await db.rpc('ttc_diem_danh_dinh_vi', {
    _ct: ctId,
    _vi_do: vi.coords.latitude,
    _kinh_do: vi.coords.longitude,
    _do_chinh_xac: Number.isFinite(vi.coords.accuracy) ? Math.round(vi.coords.accuracy) : null,
  })) as KetQuaDiemDanh;
  return data;
}

/** Luồng 2 — quét QR; toạ độ gửi kèm nếu máy cho, không có cũng ghi được */
export async function diemDanhQr(ma: string, vi: GeolocationPosition | null): Promise<KetQuaDiemDanh> {
  const data = nemNeuLoi(await db.rpc('ttc_diem_danh_qr', {
    _ma: ma,
    _vi_do: vi?.coords.latitude ?? null,
    _kinh_do: vi?.coords.longitude ?? null,
    _do_chinh_xac: vi && Number.isFinite(vi.coords.accuracy) ? Math.round(vi.coords.accuracy) : null,
  })) as KetQuaDiemDanh;
  return data;
}

/** Cấp mã QR cho một ngày; `capLai` = true thì mã cũ chết ngay */
export async function capMaQr(ngayId: string, capLai = false): Promise<string> {
  return nemNeuLoi(await db.rpc('ttc_cap_ma_qr', { _ngay_id: ngayId, _cap_lai: capLai })) as string;
}

/** Ghi hộ — Phòng Tổng hợp / BGĐ, bắt buộc lý do */
export async function diemDanhGhiHo(ngayId: string, nguoi: string, ghiChu: string): Promise<KetQuaDiemDanh> {
  return nemNeuLoi(await db.rpc('ttc_diem_danh_ghi_ho', {
    _ngay_id: ngayId, _nguoi: nguoi, _ghi_chu: ghiChu,
  })) as KetQuaDiemDanh;
}

export async function xoaDiemDanh(id: string) {
  nemNeuLoi(await db.from('ttc_diem_danh').delete().eq('id', id));
}

/** Nhật ký thử định vị của một chương trình (RLS: thành viên đọc được) */
export function useTtcThuDinhVi(ctId: string | null, bat: boolean) {
  return useQuery({
    queryKey: ['ttc', 'thu-dinh-vi', ctId],
    enabled: bat && !!ctId,
    staleTime: NUA_PHUT,
    queryFn: async () => {
      const data = nemNeuLoi(await db.from('ttc_thu_dinh_vi').select('*')
        .eq('chuong_trinh_id', ctId).order('luc', { ascending: false }).limit(50)) as TtcThuDinhVi[];
      return data ?? [];
    },
  });
}

/** Đo thử một lần tại phòng học — KHÔNG ghi điểm danh, chỉ lưu lại con số đo được */
export async function thuDinhVi(ctId: string, vi: GeolocationPosition, viTri: string) {
  return nemNeuLoi(await db.rpc('ttc_thu_dinh_vi', {
    _ct: ctId,
    _vi_do: vi.coords.latitude,
    _kinh_do: vi.coords.longitude,
    _do_chinh_xac: Number.isFinite(vi.coords.accuracy) ? Math.round(vi.coords.accuracy) : null,
    _vi_tri: viTri.trim() || null,
  })) as KetQuaDiemDanh & { khoang_cach_m?: number; trong_vung?: boolean; da_tham_dinh?: boolean };
}

export async function xoaThuDinhVi(id: string) {
  nemNeuLoi(await db.from('ttc_thu_dinh_vi').delete().eq('id', id));
}

/** Cấu hình điểm danh + toạ độ phòng học — quản trị / BGĐ của chương trình */
export async function luuDiemDanhCauHinh(ctId: string, p: {
  diem_danh: TtcCauHinhDiemDanh; vi_do: number | null; kinh_do: number | null; ban_kinh_m: number;
}) {
  nemNeuLoi(await db.from('ttc_chuong_trinh')
    .update({ ...p, updated_at: new Date().toISOString() }).eq('id', ctId));
}

/**
 * Kanban hàng ngày của học viên — thẻ THẬT trên Chiêu thức 2, đọc qua RPC gác
 * bằng bảng thành viên chương trình (xem ttc_kanban_hoc_vien trong migration).
 */
export function useTtcKanban(ctId: string | null, hocVienId: string | null) {
  return useQuery({
    queryKey: ['ttc', 'kanban', ctId, hocVienId],
    enabled: !!ctId && !!hocVienId,
    staleTime: NUA_PHUT,
    queryFn: async () => {
      const data = nemNeuLoi(await db.rpc('ttc_kanban_hoc_vien', { _ct: ctId, _hoc_vien: hocVienId })) as Ct2DauViec[];
      return data ?? [];
    },
  });
}

/** Thẻ Chiêu thức 2 của phòng học viên đang chạy — để chọn làm việc gối đầu (RLS phòng lo phần thấy) */
export function useTtcTheChonGoiDau(phongId: string | null, bat: boolean) {
  return useQuery({
    queryKey: ['ttc', 'the-chon', phongId],
    enabled: bat && !!phongId,
    staleTime: NUA_PHUT,
    queryFn: async () => {
      const data = nemNeuLoi(await db.from('ct2_dau_viec')
        .select('id, ma_hien_thi, tieu_de, trang_thai, nguoi_chiu_trach_nhiem, han_hoan_thanh, ket_qua_dau_ra, cach_lam')
        .eq('phong', phongId)
        .in('trang_thai', ['CHUAN_BI', 'DANG_LAM', 'CHO_PHOI_HOP', 'CHO_DUYET'])
        .order('created_at', { ascending: false })
        .limit(100)) as Array<Pick<Ct2DauViec, 'id' | 'ma_hien_thi' | 'tieu_de' | 'trang_thai' | 'nguoi_chiu_trach_nhiem' | 'han_hoan_thanh' | 'ket_qua_dau_ra' | 'cach_lam'>>;
      return data ?? [];
    },
  });
}

/** Phòng của một hồ sơ cán bộ — để mở đúng bảng Chiêu thức 2 của học viên */
export function useTtcPhongCua(profileId: string | null) {
  return useQuery({
    queryKey: ['ttc', 'phong-cua', profileId],
    enabled: !!profileId,
    staleTime: NAM_PHUT,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('department_id').eq('id', profileId!).maybeSingle();
      if (error) throw error;
      return (data?.department_id as string | null) ?? null;
    },
  });
}
