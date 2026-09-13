import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { type MaTabFdiHub } from '@/data/one/fdiHub';
import { chuanHoaThongKe, tinhKhoang, type MaKhoangThoiGian, type ThongKeFdiHub, type ThongKeTho } from '@/lib/fdiHubThongKe';

/*
 * Lớp dữ liệu lượt sử dụng FDI Hub (bảng fdi_hub_luot_xem, hai hàm RPC).
 *
 * Hàm RPC chưa có trong types.ts sinh tự động — ép kiểu ở đúng ranh giới gọi
 * như các bảng ct2_* / ttc_*. Migration áp thủ công nên deploy có thể đi trước
 * database: ghi lượt thì nuốt lỗi «hàm chưa có» (cẩm nang không được chậm vì
 * một dòng thống kê), tab Thống kê thì báo rõ chưa áp.
 */

interface LoiPg { code?: string; message?: string }
const db = supabase as unknown as {
  rpc(ten: string, thamSo?: Record<string, unknown>): PromiseLike<{ data: unknown; error: LoiPg | null }>;
};

/** Postgres 42883 = hàm chưa có; PostgREST PGRST202 = không thấy hàm trong schema cache. */
export function hamChuaCo(err: LoiPg | null): boolean {
  if (!err) return false;
  return err.code === '42883' || err.code === 'PGRST202' || err.code === '42P01' || /does not exist|schema cache/i.test(err.message ?? '');
}

/**
 * Chống gọi trùng ngay ở client: cùng tab trong 10 phút (trùng cửa sổ của
 * hàm SQL) thì không gọi nữa — đỡ một lượt mạng mỗi lần bấm qua lại.
 * Giữ ở mức module để sống qua các lần mount lại trang trong cùng phiên.
 */
const daGhi = new Map<string, number>();
const CUA_SO_MS = 10 * 60 * 1000;

export function useGhiLuotXemFdiHub(tab: MaTabFdiHub | null, profileId: string | null, isGuest: boolean) {
  useEffect(() => {
    if (!tab || !profileId || isGuest) return;
    const khoa = `${profileId}:${tab}`;
    const luc = Date.now();
    const truoc = daGhi.get(khoa);
    if (truoc && luc - truoc < CUA_SO_MS) return;
    daGhi.set(khoa, luc);
    let huy = false;
    Promise.resolve(db.rpc('fdi_hub_ghi_luot_xem', { _tab: tab })).then(({ error }) => {
      if (huy || !error) return;
      // Chưa áp migration thì im lặng; lỗi khác cũng chỉ ghi console — không
      // được làm phiền người đang đọc cẩm nang
      if (!hamChuaCo(error)) console.warn('Không ghi được lượt xem FDI Hub:', error.message);
      daGhi.delete(khoa);
    });
    return () => {
      huy = true;
    };
  }, [tab, profileId, isGuest]);
}

export interface KetQuaThongKe {
  thongKe: ThongKeFdiHub | null;
  dangTai: boolean;
  chuaApMigration: boolean;
  khongDuQuyen: boolean;
  loi: string | null;
  taiLai: () => void;
}

export function useFdiHubThongKe(khoang: MaKhoangThoiGian): KetQuaThongKe {
  const { profileId, isGuest } = useAuth();
  const { tu, den } = tinhKhoang(khoang);
  const q = useQuery({
    queryKey: ['fdi-hub-thong-ke', khoang, tu, den],
    enabled: !!profileId && !isGuest,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await db.rpc('fdi_hub_thong_ke', { _tu: tu, _den: den });
      if (error) {
        if (hamChuaCo(error)) return { trangThai: 'chua-ap' as const };
        if (error.code === '42501') return { trangThai: 'khong-du-quyen' as const };
        throw new Error(error.message ?? 'Không tải được thống kê');
      }
      return { trangThai: 'ok' as const, thongKe: chuanHoaThongKe(data as ThongKeTho) };
    },
  });
  const d = q.data;
  return {
    thongKe: d?.trangThai === 'ok' ? d.thongKe : null,
    dangTai: q.isLoading,
    chuaApMigration: d?.trangThai === 'chua-ap',
    khongDuQuyen: d?.trangThai === 'khong-du-quyen',
    loi: q.error ? (q.error as Error).message : null,
    taiLai: () => void q.refetch(),
  };
}
