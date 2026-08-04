import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  trongKhungNhip,
  type Ct2Bang, type Ct2BinhLuan, type Ct2DauViec, type Ct2Nhip, type Ct2PhamVi,
} from '@/lib/ct2';

/**
 * Lớp dữ liệu Chiêu thức 2.
 *
 * Nguyên tắc hiệu năng cho 150 người cùng vào khung 7h50–8h30:
 *  · Mỗi màn hình nóng đúng MỘT vòng gọi (RPC gộp hoặc 1 select có index).
 *  · react-query giữ cache staleTime 30s — bấm qua lại tab không dội thêm query.
 *  · Danh mục phòng/người cache 5 phút (thay đổi rất hiếm).
 *  · KHÔNG realtime subscription: 150 kết nối websocket cùng lúc đắt hơn nhiều
 *    so với refetch theo thao tác; bảng phòng làm mới khi đổi tab/ghi nhịp.
 */

// Bảng ct2_* chưa có trong types.ts sinh tự động — ép kiểu ở đúng ranh giới truy vấn
interface Ket<T> { data: T; error: { code?: string; message?: string } | null }
interface SelectChain extends PromiseLike<Ket<unknown>> {
  eq(c: string, v: unknown): SelectChain;
  or(f: string): SelectChain;
  in(c: string, v: unknown[]): SelectChain;
  order(c: string, o?: { ascending?: boolean; nullsFirst?: boolean }): SelectChain;
  limit(n: number): SelectChain;
  maybeSingle(): PromiseLike<Ket<unknown>>;
}
interface UpdateChain extends PromiseLike<Ket<unknown>> {
  eq(c: string, v: unknown): UpdateChain;
  in(c: string, v: unknown[]): UpdateChain;
}
const db = supabase as unknown as {
  from(t: string): {
    select(c: string): SelectChain;
    insert(v: unknown): { select(c: string): { single(): PromiseLike<Ket<unknown>> } } & PromiseLike<Ket<unknown>>;
    update(v: unknown): UpdateChain;
    delete(): UpdateChain;
  };
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<Ket<unknown>>;
};

export interface Ct2Phong { id: string; name: string; code: string; manager_id: string | null }
export interface Ct2NhanSu { id: string; full_name: string; department_id: string | null }

export interface Ct2ViecCuaToi {
  id: string; ma_hien_thi: string | null; tieu_de: string; trang_thai: string;
  phan_tram: number; co_tinh_trang: 'XANH' | 'VANG' | 'DO'; han_hoan_thanh: string | null;
  muc_uu_tien: string; loai_dau_viec: string; lien_phong: boolean; phong: string;
  nhip_gan_nhat: string | null; da_ghi_nhip_hom_nay: boolean;
}

export interface Ct2NhipNguoi {
  profile_id: string;
  full_name: string;
  avatar_url: string | null;
  so_viec_dang_chay: number;
  so_viec_da_ghi: number;
  so_the_do: number;
  so_qua_han: number;
  /** NGAY_NGHI = thứ Bảy/Chủ nhật — nhịp chỉ chạy thứ 2 đến thứ 6 */
  ket_qua: 'DUNG_GIO' | 'MUON' | 'CHUA_DU' | 'CHUA_GHI' | 'KHONG_CO_VIEC' | 'NGAY_NGHI';
}

export interface Ct2DeXuat {
  id: string; phong: string; tieu_de: string; ly_do: string; nguoi_de_xuat: string;
  trang_thai: 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI'; dau_viec_id: string | null; created_at: string;
}

const NUA_PHUT = 30_000;
const NAM_PHUT = 300_000;

/** Danh mục phòng — đổi rất hiếm, cache dài */
export function useCt2Phong() {
  return useQuery({
    queryKey: ['ct2', 'phong'],
    staleTime: NAM_PHUT,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, code, manager_id')
        .order('name');
      if (error) throw error;
      return (data ?? []) as Ct2Phong[];
    },
  });
}

/** Danh bạ cán bộ (để hiện tên trên thẻ, chọn người phụ trách) — cache dài */
export function useCt2NhanSu() {
  return useQuery({
    queryKey: ['ct2', 'nhan-su'],
    staleTime: NAM_PHUT,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, department_id')
        .eq('status', 'active')
        .order('full_name');
      if (error) throw error;
      return (data ?? []) as Ct2NhanSu[];
    },
  });
}

/**
 * Bảng Kanban một phòng: thẻ phòng chủ trì + thẻ liên phòng có phòng này tham
 * gia. MỘT query, đi qua index (phong, trang_thai) + GIN cac_phong_tham_gia.
 */
export function useCt2Board(phongId: string | null, bangId: string | null = null) {
  return useQuery({
    queryKey: ['ct2', 'board', phongId, bangId],
    enabled: !!phongId,
    staleTime: NUA_PHUT,
    // Trong khung nhịp sáng bảng đổi liên tục → tự làm mới cho có cảm giác
    // «bảng sống»; ngoài khung thì tắt hẳn, không tốn query vô ích.
    refetchInterval: () => (trongKhungNhip() ? NUA_PHUT : false),
    queryFn: async () => {
      // Đang xem một bảng cụ thể → lấy theo bảng, KHÔNG theo phòng: bảng liên
      // phòng chứa thẻ của phòng đầu mối, người phòng khác là thành viên vẫn
      // phải thấy đủ.
      if (bangId) {
        const { data, error } = await db
          .from('ct2_dau_viec')
          .select('*')
          .eq('bang_id', bangId)
          .order('han_hoan_thanh', { ascending: true, nullsFirst: false });
        if (error) throw error;
        return (data ?? []) as Ct2DauViec[];
      }
      const { data, error } = await db
        .from('ct2_dau_viec')
        .select('*')
        .or(`phong.eq.${phongId},cac_phong_tham_gia.cs.{${phongId}}`)
        // nullsFirst: false — thẻ chưa có hạn xếp cuối, không chen lên đầu
        .order('han_hoan_thanh', { ascending: true, nullsFirst: false });
      if (error) throw error;
      // Kanban chung chỉ hiện thẻ KHÔNG thuộc bảng nào — thẻ của các mảng nằm
      // trong bảng mảng, không hiện đúp ở hai nơi
      return ((data ?? []) as Ct2DauViec[]).filter((t) => !t.bang_id);
    },
  });
}

/**
 * Các bảng Kanban người này thấy được: bảng của phòng đang xem + bảng liên
 * phòng của phòng khác mà mình là thành viên (RLS đã lọc — client chỉ chia
 * nhóm để bày).
 */
export function useCt2DsBang(phongId: string | null) {
  return useQuery({
    queryKey: ['ct2', 'ds-bang', phongId],
    enabled: !!phongId,
    staleTime: NAM_PHUT,
    queryFn: async () => {
      const { data, error } = await db.from('ct2_bang').select('*').order('ten');
      if (error) throw error;
      const tatCa = (data ?? []) as Ct2Bang[];
      return {
        cuaPhong: tatCa.filter((b) => b.phong === phongId),
        lienPhongKhac: tatCa.filter((b) => b.phong !== phongId && b.loai === 'LIEN_PHONG'),
      };
    },
  });
}

export interface Ct2ThanhVienBang { profile_id: string }

export function useCt2ThanhVienBang(bangId: string | null) {
  return useQuery({
    queryKey: ['ct2', 'thanh-vien-bang', bangId],
    enabled: !!bangId,
    staleTime: NUA_PHUT,
    queryFn: async () => {
      const { data, error } = await db
        .from('ct2_bang_thanh_vien').select('profile_id').eq('bang_id', bangId);
      if (error) throw error;
      return ((data ?? []) as Ct2ThanhVienBang[]).map((t) => t.profile_id);
    },
  });
}

/**
 * GĐ theo dõi cả phòng / từng thẻ. RLS chỉ trả về dòng CỦA MÌNH, nên query
 * này trả lời đúng một câu: «tôi có đang theo dõi thứ này không».
 */
export function useCt2TheoDoi(phamVi: 'PHONG' | 'DAU_VIEC', doiTuongId: string | null) {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: ['ct2', 'theo-doi', phamVi, doiTuongId],
    enabled: !!doiTuongId && !!profileId,
    staleTime: NUA_PHUT,
    queryFn: async () => {
      const { data, error } = await db
        .from('ct2_theo_doi').select('nguoi')
        .eq('pham_vi', phamVi).eq('doi_tuong_id', doiTuongId);
      if (error) throw error;
      return ((data ?? []) as Array<{ nguoi: string }>).length > 0;
    },
  });
}

export async function ct2DoiTheoDoi(
  nguoi: string, phamVi: 'PHONG' | 'DAU_VIEC', doiTuongId: string, bat: boolean,
): Promise<{ error: string | null }> {
  if (bat) {
    const { error } = await db.from('ct2_theo_doi')
      .insert({ nguoi, pham_vi: phamVi, doi_tuong_id: doiTuongId });
    return { error: thongDiep(error) };
  }
  const { error } = await db.from('ct2_theo_doi')
    .delete().eq('nguoi', nguoi).eq('pham_vi', phamVi).eq('doi_tuong_id', doiTuongId);
  return { error: thongDiep(error) };
}

/** M1 «Việc của tôi» — 1 RPC trả kèm cờ "đã ghi nhịp hôm nay" */
export function useCt2ViecCuaToi() {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: ['ct2', 'viec-cua-toi', profileId],
    enabled: !!profileId,
    staleTime: NUA_PHUT,
    queryFn: async () => {
      const { data, error } = await db.rpc('ct2_viec_cua_toi');
      if (error) throw error;
      return (data ?? []) as Ct2ViecCuaToi[];
    },
  });
}

/** M2 «Bảng nhịp theo người» của phòng hôm nay — 1 RPC */
export function useCt2NhipPhong(phongId: string | null) {
  return useQuery({
    queryKey: ['ct2', 'nhip-phong', phongId],
    enabled: !!phongId,
    staleTime: NUA_PHUT,
    refetchInterval: () => (trongKhungNhip() ? NUA_PHUT : false),
    queryFn: async () => {
      const { data, error } = await db.rpc('ct2_nhip_phong_hom_nay', { _phong: phongId });
      if (error) throw error;
      return (data ?? []) as Ct2NhipNguoi[];
    },
  });
}

/** Nhật ký PDCA của một thẻ (mở chi tiết mới tải — không tải cả bảng) */
export function useCt2NhatKy(dauViecId: string | null) {
  return useQuery({
    queryKey: ['ct2', 'nhat-ky', dauViecId],
    enabled: !!dauViecId,
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await db
        .from('ct2_nhip_pdca')
        .select('*')
        .eq('dau_viec_id', dauViecId)
        .order('ghi_luc', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Ct2Nhip[];
    },
  });
}

/**
 * Trao đổi trên MỘT đối tượng bất kỳ — thẻ Chiêu thức 2, hồ sơ tín dụng, hay thẻ
 * Kanban 38 skill. Một bảng, một hook, nên mọi bàn đều có @nhắc tên, «Cần trả
 * lời», cảm xúc và thu hồi giống nhau — cán bộ học một lần dùng khắp nơi.
 */
export function useCt2BinhLuan(doiTuongId: string | null, phamVi: Ct2PhamVi = 'DAU_VIEC') {
  return useQuery({
    queryKey: ['ct2', 'binh-luan', phamVi, doiTuongId],
    enabled: !!doiTuongId,
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await db
        .from('ct2_binh_luan')
        .select('*')
        .eq('pham_vi', phamVi)
        .eq('doi_tuong_id', doiTuongId)
        .order('created_at')
        .limit(300);
      if (error) throw error;
      return (data ?? []) as Ct2BinhLuan[];
    },
  });
}

/** Đề xuất việc đang chờ duyệt của một phòng */
export function useCt2DeXuat(phongId: string | null) {
  return useQuery({
    queryKey: ['ct2', 'de-xuat', phongId],
    enabled: !!phongId,
    staleTime: NUA_PHUT,
    queryFn: async () => {
      const { data, error } = await db
        .from('ct2_de_xuat')
        .select('*')
        .eq('phong', phongId)
        .eq('trang_thai', 'CHO_DUYET')
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as Ct2DeXuat[];
    },
  });
}

/** Làm tươi các cache liên quan sau một thao tác ghi */
export function useCt2LamTuoi() {
  const qc = useQueryClient();
  return (nhom?: 'board' | 'nhip' | 'tat-ca') => {
    if (!nhom || nhom === 'tat-ca') {
      qc.invalidateQueries({ queryKey: ['ct2'] });
      return;
    }
    if (nhom === 'board') {
      qc.invalidateQueries({ queryKey: ['ct2', 'board'] });
      qc.invalidateQueries({ queryKey: ['ct2', 'viec-cua-toi'] });
    }
    if (nhom === 'nhip') {
      qc.invalidateQueries({ queryKey: ['ct2', 'nhat-ky'] });
      qc.invalidateQueries({ queryKey: ['ct2', 'nhip-phong'] });
      qc.invalidateQueries({ queryKey: ['ct2', 'viec-cua-toi'] });
      qc.invalidateQueries({ queryKey: ['ct2', 'board'] });
    }
  };
}

// ---------------------------------------------------------------------------
// Thao tác ghi — hàm thuần async, trả { error } để UI hiện toast tiếng Việt
// ---------------------------------------------------------------------------

function thongDiep(error: { message?: string } | null): string | null {
  if (!error) return null;
  // Trigger của database ném thông báo tiếng Việt sẵn — trả nguyên văn
  return error.message ?? 'Có lỗi không xác định.';
}

/** Cổng 1 — ghi việc: chỉ 3 trường bắt buộc, phần 5W2H còn lại do Cổng 2 điền */
export async function ct2TaoBang(v: {
  phong: string; ten: string; mo_ta: string | null;
  loai: 'MANG' | 'LIEN_PHONG'; che_do_xem: 'PHONG' | 'HAN_CHE'; nguoi_tao: string;
}): Promise<{ error: string | null; id: string | null }> {
  const { data, error } = await db.from('ct2_bang').insert(v).select('id').single();
  return { error: thongDiep(error), id: (data as { id: string } | null)?.id ?? null };
}

export async function ct2SuaBang(id: string, v: Record<string, unknown>): Promise<{ error: string | null }> {
  const { error } = await db.from('ct2_bang').update(v).eq('id', id);
  return { error: thongDiep(error) };
}

/**
 * Ghi đè danh sách thành viên: xoá người bị bỏ, thêm người mới. Hai lệnh nhỏ
 * thay vì delete-all-insert-all để RLS kiểm được từng dòng.
 */
export async function ct2DatThanhVienBang(
  bangId: string, moi: string[], cu: string[], nguoiThem: string,
): Promise<{ error: string | null }> {
  const them = moi.filter((id) => !cu.includes(id));
  const xoa = cu.filter((id) => !moi.includes(id));
  if (them.length > 0) {
    const { error } = await db.from('ct2_bang_thanh_vien')
      .insert(them.map((profile_id) => ({ bang_id: bangId, profile_id, nguoi_them: nguoiThem })));
    if (error) return { error: thongDiep(error) };
  }
  if (xoa.length > 0) {
    const { error } = await db.from('ct2_bang_thanh_vien')
      .delete().eq('bang_id', bangId).in('profile_id', xoa);
    if (error) return { error: thongDiep(error) };
  }
  return { error: null };
}

export async function ct2TaoDauViec(v: Record<string, unknown>): Promise<{ error: string | null; id: string | null }> {
  const { data, error } = await db.from('ct2_dau_viec').insert(v).select('id').single();
  return { error: thongDiep(error), id: (data as { id: string } | null)?.id ?? null };
}

export async function ct2SuaDauViec(id: string, v: Record<string, unknown>): Promise<{ error: string | null }> {
  const { error } = await db.from('ct2_dau_viec').update(v).eq('id', id);
  return { error: thongDiep(error) };
}

export async function ct2GhiNhip(v: {
  dau_viec_id: string; nguoi_ghi: string; nhan_pdca: string; noi_dung: string;
  vuong_mac: string | null; hanh_dong_hom_nay: string | null;
  co_tinh_trang: string; phan_tram: number;
}): Promise<{ error: string | null }> {
  const { error } = await db.from('ct2_nhip_pdca').insert(v);
  return { error: thongDiep(error) };
}

export async function ct2TaoDeXuat(v: { phong: string; tieu_de: string; ly_do: string; nguoi_de_xuat: string }): Promise<{ error: string | null }> {
  const { error } = await db.from('ct2_de_xuat').insert(v);
  return { error: thongDiep(error) };
}

export async function ct2XuLyDeXuat(id: string, v: Record<string, unknown>): Promise<{ error: string | null }> {
  const { error } = await db.from('ct2_de_xuat').update(v).eq('id', id);
  return { error: thongDiep(error) };
}

export async function ct2GuiBinhLuan(v: {
  pham_vi: Ct2PhamVi; doi_tuong_id: string; cha_id: string | null; nguoi_gui: string;
  noi_dung: string; nhac_ten: string[]; can_tra_loi: boolean;
}): Promise<{ error: string | null }> {
  const { error } = await db.from('ct2_binh_luan').insert(v);
  return { error: thongDiep(error) };
}

export async function ct2ThuHoiBinhLuan(id: string): Promise<{ error: string | null }> {
  const { error } = await db.from('ct2_binh_luan').update({ thu_hoi: true }).eq('id', id);
  return { error: thongDiep(error) };
}
