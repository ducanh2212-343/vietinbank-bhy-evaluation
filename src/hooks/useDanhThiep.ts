/**
 * Hook dữ liệu của phân hệ danh thiếp số — mọi màn quản trị và màn tự phục vụ
 * đọc qua đây để cùng một khóa cache, sửa ở tab này thì tab kia tự tươi.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db, goiRpc } from '@/lib/danhThiep/db';
import type { CanBo, ChucDanh, ChucDanhRieng, DonVi, Kenh, TheDaPhatHanh } from '@/lib/danhThiep/kieu';

export const KHOA = {
  donVi: ['nc', 'don-vi'] as const,
  chucDanh: ['nc', 'chuc-danh'] as const,
  canBo: ['nc', 'can-bo'] as const,
  chucDanhRieng: ['nc', 'chuc-danh-rieng'] as const,
  soCanBo: ['nc', 'so-can-bo-theo-chuc-danh'] as const,
  cauHinh: ['nc', 'cau-hinh'] as const,
  cuaToi: ['nc', 'cua-toi'] as const,
};

async function docBang<T>(bang: string, sapXep: string, tang = true): Promise<T[]> {
  const { data, error } = await db.from(bang).select('*').order(sapXep, { ascending: tang });
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

export function useDonVi() {
  return useQuery({ queryKey: KHOA.donVi, queryFn: () => docBang<DonVi>('nc_org_unit', 'sort_order') });
}

export function useChucDanh() {
  return useQuery({ queryKey: KHOA.chucDanh, queryFn: () => docBang<ChucDanh>('nc_title', 'code') });
}

export function useCanBoDanhThiep() {
  return useQuery({ queryKey: KHOA.canBo, queryFn: () => docBang<CanBo>('nc_staff', 'full_name') });
}

export function useChucDanhRieng() {
  return useQuery({
    queryKey: KHOA.chucDanhRieng,
    queryFn: () => docBang<ChucDanhRieng>('nc_custom_title', 'requested_at', false),
  });
}

/** Số cán bộ đang gán từng chức danh — chặn xóa khi > 0 (Tab 2). */
export function useSoCanBoTheoChucDanh() {
  return useQuery({
    queryKey: KHOA.soCanBo,
    queryFn: async () => {
      const rows = await goiRpc<Array<{ title_id: string; so_can_bo: number }>>('nc_so_can_bo_theo_chuc_danh');
      const m: Record<string, number> = {};
      for (const r of rows ?? []) m[r.title_id] = Number(r.so_can_bo);
      return m;
    },
  });
}

export function useCauHinhDanhThiep() {
  return useQuery({
    queryKey: KHOA.cauHinh,
    queryFn: async () => {
      const { data, error } = await db.from('nc_cau_hinh').select('khoa, gia_tri');
      if (error) throw new Error(error.message);
      const m: Record<string, unknown> = {};
      for (const r of data ?? []) m[r.khoa] = r.gia_tri;
      return m;
    },
  });
}

/** Hồ sơ danh thiếp của CHÍNH cán bộ đang đăng nhập (RLS chỉ trả dòng của họ). */
export function useDanhThiepCuaToi(userId: string | null | undefined) {
  return useQuery({
    queryKey: [...KHOA.cuaToi, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: cb, error } = await db.from('nc_staff').select('*').eq('user_id', userId).maybeSingle();
      if (error) throw new Error(error.message);
      if (!cb) return null;
      const [kenh, the, rieng] = await Promise.all([
        db.from('nc_channel').select('*').eq('staff_id', cb.id).order('sort_order'),
        db.from('nc_card').select('*').eq('staff_id', cb.id).is('revoked_at', null).order('issued_at', { ascending: false }).limit(1),
        db.from('nc_custom_title').select('*').eq('staff_id', cb.id).order('requested_at', { ascending: false }),
      ]);
      return {
        canBo: cb as CanBo,
        kenh: (kenh.data ?? []) as Kenh[],
        the: ((the.data ?? [])[0] ?? null) as TheDaPhatHanh | null,
        chucDanhRieng: (rieng.data ?? []) as ChucDanhRieng[],
      };
    },
  });
}

/** Làm tươi mọi khóa nc_* — gọi sau khi ghi. */
export function useLamTuoiDanhThiep() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['nc'] });
}
