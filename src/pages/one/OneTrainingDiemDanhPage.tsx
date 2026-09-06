import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Loader2, QrCode, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnePageShell } from '@/components/one/OnePageShell';
import { useAuth } from '@/hooks/useAuth';
import { TtcHero } from '@/components/one/training/TrainingNav';
import { diemDanhQr, layViTri } from '@/components/one/training/useTrainingCenter';
import type { KetQuaDiemDanh } from '@/lib/diemDanh';

/**
 * ĐÍCH CỦA TẤM QR — `/one/training-center/diem-danh?ma=…`.
 *
 * Học viên quét bằng camera điện thoại, trình duyệt mở thẳng trang này. Nếu
 * chưa đăng nhập thì lớp bảo vệ của cổng đưa qua màn đăng nhập rồi quay lại
 * đúng đường dẫn này (giữ nguyên `?ma=`), nên không cần xử lý gì thêm ở đây.
 *
 * Trang tự gọi máy chủ MỘT lần khi mở: học viên đang cầm điện thoại giữa phòng
 * học, bắt bấm thêm một nút nữa là thừa. Toạ độ gửi kèm nếu máy cho phép —
 * không cho cũng vẫn điểm danh được, chỉ là Ban Giám đốc không có gì đối chiếu.
 */
export default function OneTrainingDiemDanhPage() {
  const [sp] = useSearchParams();
  const ma = sp.get('ma');
  const { profileId, loading } = useAuth();
  const [kq, setKq] = useState<KetQuaDiemDanh | null>(null);
  const [dangGui, setDangGui] = useState(true);
  const daGoi = useRef(false);

  useEffect(() => {
    if (loading || daGoi.current) return;
    if (!ma) { setKq({ ok: false, thong_bao: 'Đường dẫn thiếu mã QR. Quét lại tấm QR trong phòng học.' }); setDangGui(false); return; }
    if (!profileId) return; // chờ lớp bảo vệ của cổng đưa qua đăng nhập rồi quay lại
    daGoi.current = true;
    (async () => {
      // Xin vị trí nhưng KHÔNG chặn: học viên có thể đã tắt định vị, mà tấm QR
      // vốn đã là bằng chứng có mặt trong phòng.
      const vi = await layViTri().catch(() => null);
      try {
        setKq(await diemDanhQr(ma, vi));
      } catch (e) {
        setKq({ ok: false, thong_bao: e instanceof Error ? e.message : 'Không điểm danh được' });
      } finally { setDangGui(false); }
    })();
  }, [ma, profileId, loading]);

  const dangCho = loading || (!!ma && !profileId) || dangGui;

  return (
    <OnePageShell>
      <section className="mx-auto w-full max-w-lg space-y-6 px-4 py-10 sm:px-6">
        <TtcHero title="Điểm danh">
          Quét mã QR của ngày để ghi nhận có mặt tại phòng học.
        </TtcHero>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          {dangCho ? (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-navy" />
              <p className="mt-3 text-sm text-slate-600">
                {!profileId && ma ? 'Đang mở phiên đăng nhập…' : 'Đang ghi nhận điểm danh…'}
              </p>
            </>
          ) : kq?.ok ? (
            <>
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <p className="mt-3 text-lg font-black text-brand-navy">{kq.thong_bao}</p>
              {typeof kq.khoang_cach_m === 'number' && (
                <p className="mt-1 text-xs text-slate-500">Ghi nhận cách phòng học khoảng {kq.khoang_cach_m} m.</p>
              )}
            </>
          ) : (
            <>
              <XCircle className="mx-auto h-12 w-12 text-red-500" />
              <p className="mt-3 text-base font-bold leading-snug text-slate-800">{kq?.thong_bao}</p>
              <p className="mt-2 text-xs text-slate-500">
                Nếu vẫn không được, báo Phòng Tổ chức Tổng hợp ghi hộ — có ghi lý do trên hệ thống.
              </p>
            </>
          )}

          <div className="mt-5 flex flex-col gap-2">
            <Button asChild variant={kq?.ok ? 'default' : 'outline'} className="min-h-[44px]">
              <Link to="/one/training-center/lo-trinh">Mở lộ trình hôm nay <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            {!kq?.ok && !dangCho && (
              <p className="flex items-center justify-center gap-1.5 text-2xs text-slate-400">
                <QrCode className="h-3 w-3" /> Mỗi ngày một tấm QR riêng — tấm hôm qua không dùng lại được.
              </p>
            )}
          </div>
        </div>
      </section>
    </OnePageShell>
  );
}
