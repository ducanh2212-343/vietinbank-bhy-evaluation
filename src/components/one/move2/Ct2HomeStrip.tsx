import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flame, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { soNgayQuaHan, type Ct2TrangThai } from '@/lib/ct2';
import { Ct2NhipPhongStrip } from './Ct2NhipPhongStrip';
import { useCt2NhipPhong, useCt2ViecCuaToi } from './useCt2Data';

/**
 * Khối Chiêu thức 2 trên TRANG CHỦ ONE.
 *
 * Trước đợt này, việc của Chiêu thức 2 chỉ hiện khi cán bộ chủ động mở
 * `/one/chieu-thuc-2` — nghĩa là ai quên thì không có gì nhắc. Nhịp sáng
 * 7h00–8h00 mà phải nhớ đường mới vào được thì nhịp sẽ hỏng.
 *
 * Khối này đặt ngay đầu trang chủ, trả lời hai câu trong một cái liếc:
 *  1. «Sáng nay tôi còn phải ghi nhịp cho mấy việc?» → số to + nút Ghi nhịp.
 *  2. «Cả phòng đang thế nào?» → dải ảnh đại diện đồng nghiệp.
 */

export function Ct2HomeStrip() {
  const { departmentId } = useAuth();
  const { data: viec, isLoading, isError } = useCt2ViecCuaToi();
  const { data: nhipPhong = [] } = useCt2NhipPhong(departmentId ?? null);

  const ds = useMemo(() => viec ?? [], [viec]);
  const canNhip = useMemo(
    () => ds.filter((v) => v.loai_dau_viec === 'TIEN_TRINH'
      && v.trang_thai === 'DANG_LAM' && !v.da_ghi_nhip_hom_nay),
    [ds],
  );
  const quaHan = useMemo(
    () => ds.filter((v) => soNgayQuaHan({
      han_hoan_thanh: v.han_hoan_thanh, trang_thai: v.trang_thai as Ct2TrangThai,
    }) > 0).length,
    [ds],
  );
  const daGhi = ds.filter((v) => v.da_ghi_nhip_hom_nay).length;
  const tongCanGhi = ds.filter(
    (v) => v.trang_thai === 'DANG_LAM' && v.loai_dau_viec === 'TIEN_TRINH').length;

  // Chưa áp migration hoặc chưa có việc nào → không bày khối rỗng ra trang chủ
  if (isError) return null;
  if (isLoading) return <Skeleton className="h-28 rounded-2xl" />;
  if (ds.length === 0 && nhipPhong.length === 0) return null;

  return (
    <div className="rounded-2xl border border-brand-navy/20 bg-gradient-to-br from-blue-50 via-white to-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xs font-semibold uppercase tracking-widest text-brand-red">
            Chiêu thức 2 · Nhịp sáng nay
          </p>
          <p className="mt-1 text-lg font-bold leading-snug text-brand-navy">
            {canNhip.length > 0
              ? <>Còn <span className="text-brand-red">{canNhip.length}</span> việc chờ anh/chị ghi nhịp</>
              : tongCanGhi > 0
                ? <>Đã ghi đủ nhịp hôm nay <Flame className="inline h-5 w-5 text-amber-500" /></>
                : 'Hôm nay anh/chị không có việc nào cần ghi nhịp'}
          </p>
          <p className="mt-0.5 text-sm text-slate-600">
            {tongCanGhi > 0 && <span className="tabular-nums">{daGhi}/{tongCanGhi} việc · </span>}
            {quaHan > 0
              ? <span className="font-medium text-red-600">{quaHan} việc đang quá hạn</span>
              : 'Không có việc nào quá hạn'}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button asChild size="sm" variant={canNhip.length > 0 ? 'default' : 'outline'}>
            <Link to="/one/chieu-thuc-2">
              {canNhip.length > 0 ? <><Zap className="mr-1 h-4 w-4" /> Ghi nhịp</> : 'Mở bảng việc'}
            </Link>
          </Button>
        </div>
      </div>

      {/* Cả phòng trong một dòng — thứ Miro làm được mà bảng thường không */}
      {nhipPhong.length > 0 && (
        <div className="mt-3 border-t border-slate-200/70 pt-3">
          <Ct2NhipPhongStrip ds={nhipPhong} gonGang />
          <Link
            to="/one/chieu-thuc-2"
            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-navy hover:underline"
          >
            Xem bảng của Phòng <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
