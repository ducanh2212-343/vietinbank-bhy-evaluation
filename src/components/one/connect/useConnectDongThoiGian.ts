import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { signOnePaths, uploadOneImage } from '@/lib/oneStorage';
import { sapXepHoatDong, soanDuocConnect, type HoatDongConnect, type LoaiHoatDongConnect } from '@/lib/connect';
import { DONG_THOI_GIAN_MAC_DINH } from '@/data/one/connectDongThoiGian';
import { useOneUploads } from '@/components/one/useOneUploads';

/**
 * Lớp dữ liệu dòng thời gian Bắc Hưng Yên Connect (bảng connect_dong_thoi_gian).
 *
 * Bảng chưa có trong types.ts sinh tự động — ép kiểu ở đúng ranh giới truy vấn
 * như các bảng ct2_* / ttc_*. Khi bảng CHƯA TỒN TẠI (migration áp thủ công,
 * deploy có thể đi trước) thì dùng bản nạp sẵn trong mã và khoá nút soạn —
 * trang không được trống chỉ vì lệch nhịp áp migration.
 */

interface Ket<T> { data: T; error: { code?: string; message?: string } | null }
interface Chain extends PromiseLike<Ket<unknown>> {
  select(c?: string): Chain;
  eq(c: string, v: unknown): Chain;
  order(c: string, o?: { ascending?: boolean }): Chain;
  maybeSingle(): PromiseLike<Ket<unknown>>;
}
const db = supabase as unknown as {
  from(t: string): { select(c: string): Chain; insert(v: unknown): Chain; update(v: unknown): Chain; delete(): Chain };
};

interface DongThoiGianRow {
  id: string;
  ngay: string;
  loai: LoaiHoatDongConnect;
  tieu_de: string;
  mo_ta: string | null;
  diem_nhan: string[] | null;
  anh: string[] | null;
  bai_viet_id: string | null;
  lien_ket: string | null;
  noi_bat: boolean;
  mo_cho_khach: boolean;
}

export interface HoatDongGhi {
  id?: string;
  ngay: string;
  loai: LoaiHoatDongConnect;
  tieuDe: string;
  moTa: string;
  diemNhan: string[];
  /** Đường dẫn ảnh đã có + dataURL ảnh mới chọn (được tải lên lúc lưu) */
  anh: string[];
  baiVietId: string | null;
  lienKet: string;
  noiBat: boolean;
  moChoKhach: boolean;
}

const KHOA = ['connect-dong-thoi-gian'];

/** Postgres 42P01 = bảng chưa có; PostgREST trả PGRST205 khi bảng không nằm trong schema cache. */
function bangChuaCo(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === '42P01' || err.code === 'PGRST205' || /does not exist|schema cache/i.test(err.message ?? '');
}

export function useConnectDongThoiGian() {
  const { roles, departmentId, isGuest } = useAuth();
  const queryClient = useQueryClient();
  const { items: baiViet } = useOneUploads();

  // Mã phòng của cán bộ — useAuth chỉ giữ id phòng, mà luật soạn xét theo mã (KHDN/TCTH)
  const { data: maPhong = null } = useQuery({
    queryKey: ['ma-phong', departmentId],
    enabled: !!departmentId && !isGuest,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('code').eq('id', departmentId!).maybeSingle();
      return (data?.code as string | undefined) ?? null;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: KHOA,
    staleTime: 60_000,
    queryFn: async (): Promise<{ dong: HoatDongConnect[]; bangChuaCo: boolean }> => {
      const r = (await db.from('connect_dong_thoi_gian').select('*').order('ngay', { ascending: false })) as Ket<DongThoiGianRow[] | null>;
      if (r.error) {
        if (bangChuaCo(r.error)) return { dong: DONG_THOI_GIAN_MAC_DINH, bangChuaCo: true };
        throw new Error(r.error.message ?? 'Không đọc được dòng thời gian');
      }
      const rows = r.data ?? [];
      const signed = await signOnePaths(rows.flatMap((x) => x.anh ?? []));
      return {
        bangChuaCo: false,
        dong: rows.map((x) => ({
          id: x.id,
          ngay: x.ngay,
          loai: x.loai,
          tieuDe: x.tieu_de,
          moTa: x.mo_ta,
          diemNhan: x.diem_nhan ?? [],
          anh: x.anh ?? [],
          anhUrls: (x.anh ?? []).map((p) => signed[p]).filter(Boolean) as string[],
          baiVietId: x.bai_viet_id,
          lienKet: x.lien_ket,
          noiBat: x.noi_bat,
          moChoKhach: x.mo_cho_khach,
        })),
      };
    },
  });

  // Nối bài viết sau khi cả hai nguồn về: ảnh của bài đi sau ảnh riêng của dòng
  const hoatDong = useMemo<HoatDongConnect[]>(() => {
    const theoId = new Map(baiViet.map((b) => [b.id, b]));
    return sapXepHoatDong(
      (data?.dong ?? []).map((h) => {
        const bai = h.baiVietId ? theoId.get(h.baiVietId) : undefined;
        const anhBai = bai?.imageUrls?.length ? bai.imageUrls : bai?.imageUrl ? [bai.imageUrl] : [];
        return { ...h, baiViet: bai, anhUrls: [...h.anhUrls, ...anhBai] };
      }),
    );
  }, [data, baiViet]);

  const lamTuoi = useCallback(() => queryClient.invalidateQueries({ queryKey: KHOA }), [queryClient]);

  const luuHoatDong = useCallback(async (g: HoatDongGhi) => {
    // Ảnh mới là dataURL → tải lên kho dưới shared/ (khách đối tác chỉ ký được shared/%,
    // và Connect là chương trình hướng ra khách hàng — xem ghi chú trong migration)
    const anh: string[] = [];
    for (const a of g.anh) anh.push(a.startsWith('data:') ? await uploadOneImage(a, 'shared') : a);
    const row = {
      ngay: g.ngay,
      loai: g.loai,
      tieu_de: g.tieuDe.trim(),
      mo_ta: g.moTa.trim() || null,
      diem_nhan: g.diemNhan,
      anh,
      bai_viet_id: g.baiVietId,
      lien_ket: g.lienKet.trim() || null,
      noi_bat: g.noiBat,
      mo_cho_khach: g.moChoKhach,
    };
    const r = g.id
      ? await db.from('connect_dong_thoi_gian').update(row).eq('id', g.id)
      : await db.from('connect_dong_thoi_gian').insert(row);
    if (r.error) throw new Error(r.error.message ?? 'Không lưu được hoạt động');
    await lamTuoi();
  }, [lamTuoi]);

  const xoaHoatDong = useCallback(async (id: string) => {
    const r = await db.from('connect_dong_thoi_gian').delete().eq('id', id);
    if (r.error) throw new Error(r.error.message ?? 'Không xoá được hoạt động');
    await lamTuoi();
  }, [lamTuoi]);

  return {
    hoatDong,
    isLoading,
    bangChuaCo: data?.bangChuaCo ?? false,
    // Chờ đọc xong mới mở nút soạn: chưa biết bảng có hay không thì chưa mời ghi
    soanDuoc: !!data && !data.bangChuaCo && soanDuocConnect(roles, maPhong),
    baiViet,
    luuHoatDong,
    xoaHoatDong,
  };
}
