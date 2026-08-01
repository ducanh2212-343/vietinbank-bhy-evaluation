import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { trongKhungNhip } from '@/lib/ct2';

/**
 * Lớp dữ liệu màn «Điều hành của tôi» — ba tầng, ba RPC, mỗi tầng một vòng gọi.
 * BGĐ chỉ có 4 người nên tải ở đây không phải bài toán quy mô; quan trọng là
 * mỗi tầng độc lập, tầng nào lỗi cũng không kéo sập hai tầng còn lại.
 */

interface Ket { data: unknown; error: { code?: string; message?: string } | null }
const db = supabase as unknown as {
  from(t: string): { insert(v: unknown): PromiseLike<Ket> };
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<Ket>;
};

export interface ChoToiDuyet {
  loai: 'DAU_VIEC' | 'HO_SO_TIN_DUNG';
  id: string;
  ma: string | null;
  tieu_de: string;
  phong: string;
  nguoi_gui: string;
  so_tien: number | null;
  tuoi_cho: number;
  ngay_giu: string | null;
}

export interface PhongCuaToi {
  phong: string;
  ten_phong: string;
  so_nguoi_can_ghi: number;
  so_nguoi_da_ghi: number;
  so_the_dang_chay: number;
  so_the_do: number;
  so_the_qua_han: number;
}

export interface DauAnTuanNay {
  mark_id: string;
  tieu_de: string;
  deadline: string | null;
  trang_thai: string;
  da_boi_tuan_nay: boolean;
  so_manh_da_boi: number;
  boi_gan_nhat: string | null;
}

const NUA_PHUT = 30_000;

/** Tầng 1 — việc đang nằm trong tay chính tôi, chặn người khác */
export function useCt2ChoToiDuyet(bat: boolean) {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: ['ct2', 'cho-toi-duyet', profileId],
    enabled: bat && !!profileId,
    staleTime: NUA_PHUT,
    retry: false,
    queryFn: async () => {
      const { data, error } = await db.rpc('ct2_cho_toi_duyet');
      if (error) throw error;
      return (data ?? []) as ChoToiDuyet[];
    },
  });
}

/** Tầng 2 — các phòng tôi phụ trách, nhịp hôm nay */
export function useCt2PhongCuaToi(bat: boolean) {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: ['ct2', 'phong-cua-toi', profileId],
    enabled: bat && !!profileId,
    staleTime: NUA_PHUT,
    retry: false,
    refetchInterval: () => (trongKhungNhip() ? NUA_PHUT : false),
    queryFn: async () => {
      const { data, error } = await db.rpc('ct2_bgd_phong_cua_toi');
      if (error) throw error;
      return (data ?? []) as PhongCuaToi[];
    },
  });
}

/** Tầng 3 — dấu ấn Bắc Hưng Yên Mark, nhịp tuần */
export function useCt2DauAnTuanNay(bat: boolean) {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: ['ct2', 'dau-an-tuan', profileId],
    enabled: bat && !!profileId,
    // Nhịp tuần đổi chậm — không cần làm tươi dồn dập như nhịp ngày
    staleTime: 300_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await db.rpc('ct2_dau_an_tuan_nay');
      if (error) throw error;
      return (data ?? []) as DauAnTuanNay[];
    },
  });
}

export function useCt2LamTuoiBgd() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['ct2', 'dau-an-tuan'] });
    qc.invalidateQueries({ queryKey: ['ct2', 'cho-toi-duyet'] });
  };
}

/** Thứ Hai của tuần hiện tại theo giờ VN — trùng mốc tuần của Kanban */
export function dauTuanVn(moc: Date = new Date()): string {
  const vn = new Date(moc.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const thu = vn.getDay();
  const lui = thu === 0 ? 6 : thu - 1;   // Chủ nhật lùi 6 ngày về thứ Hai
  const t2 = new Date(vn.getFullYear(), vn.getMonth(), vn.getDate() - lui);
  return `${t2.getFullYear()}-${String(t2.getMonth() + 1).padStart(2, '0')}-${String(t2.getDate()).padStart(2, '0')}`;
}

/** Bồi một mẩu bằng chứng vào dấu ấn cho tuần này */
export async function ct2BoiBangChung(v: {
  mark_id: string; nguoi_ghi: string; phan_star: 'S' | 'T' | 'A' | 'R'; noi_dung: string;
}): Promise<{ error: string | null }> {
  const { error } = await db.from('ct2_bang_chung_dau_an').insert({
    ...v, tuan: dauTuanVn(), noi_dung: v.noi_dung.trim(),
  });
  return { error: error?.message ?? null };
}
