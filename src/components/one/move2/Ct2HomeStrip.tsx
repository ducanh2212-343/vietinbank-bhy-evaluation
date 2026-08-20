import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flame, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { soNgayQuaHan, type Ct2TrangThai } from '@/lib/ct2';
import { Ct2GhiNhipNhanh } from './Ct2GhiNhipNhanh';
import { Ct2NhipPhongStrip } from './Ct2NhipPhongStrip';
import { useCt2CanLamHomNay, useCt2NhipPhong, useCt2ViecCuaToi } from './useCt2Data';

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
 *
 * Từ ngày triển khai 06/08: nút «Ghi nhịp» mở CỬA LƯỚT NGAY TẠI CHỖ, không
 * điều hướng sang trang Chiêu thức 2 nữa. Đo bằng giây cho buổi họp sáng:
 * điều hướng trang là tải lại dữ liệu + tự tìm lại nút — mất 5–8 giây và một
 * lần «đang ở đâu ấy nhỉ». Mở tại chỗ thì từ cú bấm tới lúc GÕ ĐƯỢC CHỮ ĐẦU
 * TIÊN dưới một giây (ô câu tự chiếm con trỏ, cờ và % điền sẵn theo thẻ).
 */

export function Ct2HomeStrip() {
  const { departmentId } = useAuth();
  const { data: viec, isLoading, isError } = useCt2ViecCuaToi();
  const { data: nhipPhong = [] } = useCt2NhipPhong(departmentId ?? null);
  const { data: canLam } = useCt2CanLamHomNay();
  const [ghiNhanh, setGhiNhanh] = useState(false);

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

  // Chưa áp migration hoặc chưa có việc nào → không bày khối rỗng ra trang chủ.
  // Lãnh đạo không có thẻ của riêng mình nhưng CÓ thẻ chờ duyệt vẫn phải thấy.
  const coViecChoTay = !!canLam && (canLam.cho_toi_duyet > 0 || canLam.cho_toi_y_kien > 0
    || canLam.hs_can_nhip > 0 || canLam.chua_bat_dau > 0);
  if (isError) return null;
  if (isLoading) return <Skeleton className="h-28 rounded-2xl" />;
  if (ds.length === 0 && nhipPhong.length === 0 && !coViecChoTay) return null;

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
          {canNhip.length > 0 ? (
            <Button size="sm" onClick={() => setGhiNhanh(true)}>
              <Zap className="mr-1 h-4 w-4" /> Ghi nhịp ngay
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link to="/one/chieu-thuc-2">Mở bảng việc</Link>
            </Button>
          )}
        </div>
      </div>

      {/*
        «Hôm nay tôi phải làm gì» — MỘT dòng gộp mọi thứ chờ tay mình
        (GĐ 15/08): nhịp việc phòng, việc chưa bắt đầu đã đến lúc chạy, thẻ
        chờ mình duyệt hoàn thành, thẻ chờ ý kiến, hồ sơ tín dụng cần nhịp.
        Chỉ hiện mục nào có số — dòng rỗng thì thôi, không bày ra dãy số 0.
      */}
      {canLam && (canLam.cho_toi_duyet > 0 || canLam.cho_toi_y_kien > 0
        || canLam.hs_can_nhip > 0 || canLam.chua_bat_dau > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-200/70 pt-3 text-xs">
          <span className="font-semibold uppercase tracking-wide text-slate-400">Chờ tay anh/chị:</span>
          {canLam.cho_toi_duyet > 0 && (
            <Link to="/one/chieu-thuc-2" className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800 hover:bg-emerald-200">
              ✅ Duyệt hoàn thành {canLam.cho_toi_duyet} thẻ
            </Link>
          )}
          {canLam.chua_bat_dau > 0 && (
            <Link to="/one/chieu-thuc-2" className="rounded-full bg-red-100 px-2.5 py-1 font-semibold text-red-800 hover:bg-red-200">
              ⏰ {canLam.chua_bat_dau} việc chưa bắt đầu đã đến lúc chạy
            </Link>
          )}
          {canLam.hs_can_nhip > 0 && (
            <Link to="/one/chieu-thuc-2?tab=tin-dung" className="rounded-full bg-blue-100 px-2.5 py-1 font-semibold text-blue-800 hover:bg-blue-200">
              📄 {canLam.hs_can_nhip} hồ sơ tín dụng cần nhịp
            </Link>
          )}
          {canLam.cho_toi_y_kien > 0 && (
            <Link to="/one/chieu-thuc-2" className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800 hover:bg-amber-200">
              💬 {canLam.cho_toi_y_kien} việc chờ ý kiến
            </Link>
          )}
        </div>
      )}

      {ghiNhanh && canNhip.length > 0 && (
        <Ct2GhiNhipNhanh dsThe={canNhip} onDong={() => setGhiNhanh(false)} />
      )}

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
