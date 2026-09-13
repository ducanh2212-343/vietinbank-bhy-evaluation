import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnePageShell } from '@/components/one/OnePageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { ngayVnChuoi } from '@/lib/lichNghi';
import { duongDanChuongTrinh, xepChuongTrinhCuaToi } from '@/lib/trainingCenter';
import { useTtcDanhMuc } from '@/components/one/training/useTrainingCenter';

/**
 * /one/training-center/lo-trinh — nơi MỌI push TTC_* mở về (duongDanThongBao
 * ở src/lib/ct2.ts và notify-ct2 dùng chung đường dẫn này). Tin không mang id
 * chương trình, nên trang này tìm chương trình của người đọc đang chạy hôm nay
 * rồi chuyển thẳng sang Lộ trình của nó; không có thì về danh mục.
 */
export default function OneTrainingLoTrinhHomNayPage() {
  const nav = useNavigate();
  const { data, isLoading, isError } = useTtcDanhMuc();

  useEffect(() => {
    if (isLoading) return;
    const homNay = ngayVnChuoi(new Date());
    const cuaToi = new Set((data?.cuaToi ?? []).map((t) => t.chuong_trinh_id));
    const ds = xepChuongTrinhCuaToi(data?.chuongTrinh ?? []).filter((c) => cuaToi.has(c.id));
    const dangChay = ds.find((c) => c.trang_thai === 'DANG_CHAY' && c.ngay_bd <= homNay && c.ngay_kt >= homNay)
      ?? ds.find((c) => c.trang_thai === 'DANG_CHAY')
      ?? ds[0];
    nav(dangChay && !isError ? duongDanChuongTrinh(dangChay.id, 'lo-trinh') : '/one/training-center', { replace: true });
  }, [data, isLoading, isError, nav]);

  return (
    <OnePageShell>
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-40 rounded-2xl" />
      </section>
    </OnePageShell>
  );
}
