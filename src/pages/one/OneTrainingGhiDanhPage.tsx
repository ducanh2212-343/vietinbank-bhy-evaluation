import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, KeyRound, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OnePageShell } from '@/components/one/OnePageShell';
import { useAuth } from '@/hooks/useAuth';
import { TtcHero } from '@/components/one/training/TrainingNav';
import { useTtcLamTuoi, xemMaGhiDanh, xinGhiDanh } from '@/components/one/training/useTrainingCenter';
import { chuanHoaMaLop, type KetQuaXemMa, type KetQuaXinGhiDanh } from '@/lib/ttcGhiDanh';
import { tenNhomDoiTuong, type TtcNhomDoiTuong } from '@/lib/trainingCenter';

/**
 * ĐÍCH CỦA MÃ LỚP / QR GHI DANH — `/one/training-center/ghi-danh?ma=…`.
 *
 * Không có ?ma= thì hiện ô gõ mã (cán bộ nghe đọc mã trong lớp). Có mã thì
 * hỏi máy chủ lớp nào rồi hiện tên lớp và nút «Xin vào lớp» — KHÔNG tự xin
 * ngay khi mở trang như điểm danh, vì vào nhầm lớp là thấy tài liệu và bảng
 * điểm của lớp đó; một chạm xác nhận là rẻ. Khách đối tác bị máy chủ chặn và
 * thấy đúng thông điệp «chỉ dành cho cán bộ nội bộ».
 */
export default function OneTrainingGhiDanhPage() {
  const [sp] = useSearchParams();
  const dieuHuong = useNavigate();
  const ma = sp.get('ma');
  const { profileId, loading } = useAuth();
  const lamTuoi = useTtcLamTuoi();
  const [nhap, setNhap] = useState('');
  const [lop, setLop] = useState<KetQuaXemMa | null>(null);
  const [kq, setKq] = useState<KetQuaXinGhiDanh | null>(null);
  const [dangTai, setDangTai] = useState(false);
  const [dangXin, setDangXin] = useState(false);

  useEffect(() => {
    if (loading || !profileId || !ma) return;
    let con = true;
    setDangTai(true); setLop(null); setKq(null);
    xemMaGhiDanh(ma)
      .then((r) => { if (con) setLop(r); })
      .catch((e) => { if (con) setLop({ ok: false, thong_bao: e instanceof Error ? e.message : 'Không đọc được mã lớp' }); })
      .finally(() => { if (con) setDangTai(false); });
    return () => { con = false; };
  }, [ma, profileId, loading]);

  const xin = async () => {
    if (!ma) return;
    setDangXin(true);
    try { const r = await xinGhiDanh(ma); setKq(r); if (r.ok) lamTuoi(); }
    catch (e) { setKq({ ok: false, thong_bao: e instanceof Error ? e.message : 'Không gửi được yêu cầu' }); }
    finally { setDangXin(false); }
  };

  const dangCho = loading || (!!ma && !profileId) || dangTai;
  const ngay = (d?: string) => (d ? d.split('-').reverse().join('/') : '');

  return (
    <OnePageShell>
      <section className="mx-auto w-full max-w-lg space-y-6 px-4 py-10 sm:px-6">
        <TtcHero title="Ghi danh vào lớp">
          Nhập mã lớp Phòng Tổng hợp phát, hoặc quét QR ghi danh. Chỉ dành cho cán bộ Bắc Hưng Yên ONE.
        </TtcHero>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {!ma ? (
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const m = chuanHoaMaLop(nhap); if (m.length === 6) dieuHuong(`/one/training-center/ghi-danh?ma=${m}`); }}>
              <label className="block text-sm font-semibold text-slate-700" htmlFor="ma-lop">Mã lớp (6 ký tự)</label>
              <Input id="ma-lop" value={nhap} onChange={(e) => setNhap(chuanHoaMaLop(e.target.value))} placeholder="VD: K7N3PX" autoFocus
                className="h-14 text-center font-mono text-2xl font-black uppercase tracking-[0.3em]" maxLength={6} autoComplete="off" />
              <Button type="submit" className="min-h-[44px] w-full bg-brand-navy hover:bg-brand-navy/90" disabled={chuanHoaMaLop(nhap).length !== 6}>
                <KeyRound className="mr-1 h-4 w-4" /> Xem lớp
              </Button>
              <p className="text-center text-2xs text-slate-400">Mã không có số 0 và số 1 — gõ O hoặc I hệ thống tự hiểu.</p>
            </form>
          ) : dangCho ? (
            <div className="text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-navy" />
              <p className="mt-3 text-sm text-slate-600">{!profileId ? 'Đang mở phiên đăng nhập…' : 'Đang tìm lớp…'}</p>
            </div>
          ) : kq ? (
            <div className="text-center">
              {kq.ok ? (kq.trang_thai === 'thanh_vien' ? <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" /> : <Clock className="mx-auto h-12 w-12 text-amber-500" />) : <XCircle className="mx-auto h-12 w-12 text-red-500" />}
              <p className="mt-3 text-base font-bold leading-snug text-slate-800">{kq.thong_bao}</p>
              <div className="mt-5 flex flex-col gap-2">
                {kq.ok && kq.trang_thai === 'thanh_vien' && kq.chuong_trinh_id ? (
                  <Button asChild className="min-h-[44px]"><Link to={`/one/training-center/chuong-trinh/${kq.chuong_trinh_id}/lo-trinh`}>Mở lộ trình <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
                ) : (
                  <Button asChild variant="outline" className="min-h-[44px]"><Link to="/one/training-center">Về Training Center</Link></Button>
                )}
              </div>
            </div>
          ) : lop && !lop.ok ? (
            <div className="text-center">
              <XCircle className="mx-auto h-12 w-12 text-red-500" />
              <p className="mt-3 text-base font-bold leading-snug text-slate-800">{lop.thong_bao}</p>
              <Button asChild variant="outline" className="mt-5 min-h-[44px]"><Link to="/one/training-center/ghi-danh">Nhập mã khác</Link></Button>
            </div>
          ) : lop ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-2xs uppercase tracking-wide text-slate-500">{tenNhomDoiTuong((lop.nhom_doi_tuong ?? 'QUY_HOACH') as TtcNhomDoiTuong)}</p>
                <p className="mt-1 text-lg font-black leading-snug text-brand-navy">{lop.ten}</p>
                <p className="mt-1 text-xs text-slate-600">{ngay(lop.ngay_bd)} → {ngay(lop.ngay_kt)}</p>
              </div>
              {lop.trang_thai_cua_toi === 'thanh_vien' ? (
                <>
                  <p className="text-center text-sm text-emerald-700">Anh/chị đã là thành viên của lớp này.</p>
                  <Button asChild className="min-h-[44px] w-full"><Link to={`/one/training-center/chuong-trinh/${lop.chuong_trinh_id}/lo-trinh`}>Mở lộ trình <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
                </>
              ) : lop.trang_thai_cua_toi === 'cho_duyet' ? (
                <p className="rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-800"><Clock className="mr-1 inline h-4 w-4" /> Yêu cầu của anh/chị đang chờ Phòng Tổng hợp duyệt.</p>
              ) : (
                <>
                  {lop.trang_thai_cua_toi === 'tu_choi' && <p className="rounded-xl bg-red-50 p-3 text-center text-xs text-red-700">Lần trước bị từ chối — xin lại nếu đã trao đổi với Phòng Tổng hợp.</p>}
                  <Button onClick={xin} disabled={dangXin} className="min-h-[44px] w-full bg-brand-navy hover:bg-brand-navy/90">
                    {dangXin ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                    {lop.tu_duyet ? 'Vào lớp' : 'Xin vào lớp'}
                  </Button>
                  <p className="text-center text-2xs text-slate-400">{lop.tu_duyet ? 'Lớp này mở tự do cho cán bộ — vào là thấy lộ trình ngay.' : 'Phòng Tổng hợp duyệt xong, lớp sẽ hiện ở «Chương trình của tôi».'}</p>
                </>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </OnePageShell>
  );
}
