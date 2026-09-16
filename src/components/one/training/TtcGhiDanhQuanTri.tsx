import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, Download, Loader2, QrCode, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { TtcChuongTrinh } from '@/lib/trainingCenter';
import { TEN_TRANG_THAI_GHI_DANH, duongDanGhiDanh, type TtcGhiDanh } from '@/lib/ttcGhiDanh';
import { datGhiDanhTuDuyet, duyetGhiDanh, moGhiDanh, useTtcGhiDanh, useTtcLamTuoi } from './useTrainingCenter';

/**
 * GHI DANH BẰNG MÃ LỚP / QR — khối trong màn Quản trị (phương án 4, 16/09).
 *
 * TCTH bật ghi danh → hệ thống cấp mã 6 ký tự; chiếu mã lên màn hình lớp hoặc
 * in tấm QR, cán bộ quét là tới trang xin vào. Mặc định CHỜ DUYỆT: danh sách
 * chờ hiện ngay dưới, duyệt một chạm. Bật «tự duyệt» thì quét là vào — dùng cho
 * lớp mở rộng đã có danh sách cử đi học và không sợ người lạ, vì chỉ cán bộ
 * nội bộ đã đăng nhập mới quét được (máy chủ chặn khách đối tác).
 *
 * Đóng ghi danh thì mã mất tác dụng ngay; cấp lại mã khi tấm QR bị chụp lan.
 */
export function TtcGhiDanhQuanTri({ ct }: { ct: TtcChuongTrinh }) {
  const lamTuoi = useTtcLamTuoi();
  const { data: ds = [] } = useTtcGhiDanh(ct.id);
  const [dangLam, setDangLam] = useState<string | null>(null);
  const [anhQr, setAnhQr] = useState<string | null>(null);
  const [daChep, setDaChep] = useState(false);
  const ma = ct.ma_ghi_danh ?? null;
  const duongDan = useMemo(() => (ma ? duongDanGhiDanh(window.location.origin, ma) : null), [ma]);

  useEffect(() => {
    if (!duongDan) { setAnhQr(null); return; }
    let con = true;
    import('qrcode')
      .then((QR) => QR.toDataURL(duongDan, { width: 600, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#FFFFFF' } }))
      .then((url) => { if (con) setAnhQr(url); })
      .catch(() => toast.error('Không dựng được mã QR'));
    return () => { con = false; };
  }, [duongDan]);

  const bat = async (mo: boolean) => {
    if (!mo && !window.confirm('Đóng ghi danh? Mã lớp đang phát sẽ không dùng được nữa; yêu cầu đang chờ vẫn giữ để duyệt.')) return;
    setDangLam('MO');
    try { await moGhiDanh(ct.id, mo); lamTuoi(); toast.success(mo ? 'Đã mở ghi danh — chiếu mã hoặc in QR cho lớp.' : 'Đã đóng ghi danh.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Không đổi được'); }
    finally { setDangLam(null); }
  };
  const capLai = async () => {
    if (!window.confirm('Cấp mã mới? Mã và tấm QR cũ sẽ không quét được nữa.')) return;
    setDangLam('MO');
    try { await moGhiDanh(ct.id, true, true); lamTuoi(); toast.success('Đã cấp mã mới.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Không cấp lại được'); }
    finally { setDangLam(null); }
  };
  const doiTuDuyet = async (v: boolean) => {
    setDangLam('TU_DUYET');
    try { await datGhiDanhTuDuyet(ct.id, v); lamTuoi(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Không đổi được'); }
    finally { setDangLam(null); }
  };
  const duyet = async (y: TtcGhiDanh, dongY: boolean) => {
    let lyDo: string | undefined;
    if (!dongY) {
      const t = window.prompt(`Lý do từ chối ${y.full_name ?? 'người này'} (người xin sẽ thấy):`, '');
      if (t === null) return;
      lyDo = t;
    }
    setDangLam(y.id);
    try { await duyetGhiDanh(y.id, dongY, lyDo); lamTuoi(); toast.success(dongY ? `Đã thêm ${y.full_name ?? ''} vào lớp.` : 'Đã từ chối.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Không duyệt được'); }
    finally { setDangLam(null); }
  };
  const chep = async () => {
    if (!duongDan) return;
    try { await navigator.clipboard.writeText(duongDan); setDaChep(true); setTimeout(() => setDaChep(false), 1500); }
    catch { toast.error('Trình duyệt không cho sao chép — bôi đen đường dẫn rồi copy tay.'); }
  };
  const taiQr = () => {
    if (!anhQr) return;
    const a = document.createElement('a');
    a.href = anhQr; a.download = `QR ghi danh - ${ct.ten}.png`;
    document.body.appendChild(a); a.click(); a.remove();
  };

  const choDuyet = ds.filter((y) => y.trang_thai === 'cho_duyet');
  const daXuLy = ds.filter((y) => y.trang_thai !== 'cho_duyet');

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-navy"><QrCode className="h-4 w-4" /> Ghi danh bằng mã lớp / QR</h3>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <Switch checked={!!ma} disabled={dangLam === 'MO'} onCheckedChange={bat} aria-label="Mở ghi danh" />
          {ma ? 'Đang mở' : 'Đang đóng'}
        </label>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Chỉ cán bộ nội bộ Bắc Hưng Yên ONE đã đăng nhập mới xin vào được; khách đối tác bị chặn ở máy chủ. Người xin vào luôn là học viên.
      </p>

      {ma && (
        <div className="mt-3 grid gap-4 sm:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center gap-2">
            {anhQr ? <img src={anhQr} alt={`QR ghi danh ${ma}`} className="h-40 w-40 rounded-lg border border-slate-200" /> : <div className="h-40 w-40 animate-pulse rounded-lg bg-slate-100" />}
            <Button size="sm" variant="outline" onClick={taiQr} disabled={!anhQr}><Download className="mr-1 h-3.5 w-3.5" /> Tải QR</Button>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-2xs uppercase tracking-wide text-slate-500">Mã lớp — chiếu lên màn hình hoặc đọc cho lớp</p>
              <p className="font-mono text-4xl font-black tracking-[0.3em] text-brand-navy">{ma}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <code className="max-w-full truncate rounded bg-slate-100 px-2 py-1 text-slate-700">{duongDan}</code>
              <Button size="sm" variant="ghost" className="h-8" onClick={chep}>{daChep ? <Check className="mr-1 h-3.5 w-3.5 text-emerald-600" /> : <Copy className="mr-1 h-3.5 w-3.5" />} Chép link</Button>
            </div>
            <p className="text-2xs text-slate-500">Cán bộ vào <b>Training Center → Nhập mã lớp</b>, hoặc quét QR, hoặc mở link này.</p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <Switch checked={!!ct.ghi_danh_tu_duyet} disabled={dangLam === 'TU_DUYET'} onCheckedChange={doiTuDuyet} aria-label="Tự duyệt" />
                Quét là vào lớp ngay (không chờ duyệt)
              </label>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={capLai} disabled={dangLam === 'MO'}><RefreshCw className="mr-1 h-3.5 w-3.5" /> Cấp mã mới</Button>
            </div>
          </div>
        </div>
      )}

      {(choDuyet.length > 0 || daXuLy.length > 0) && (
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-700">Chờ duyệt {choDuyet.length > 0 && <span className="ml-1 rounded-full bg-amber-100 px-1.5 text-2xs text-amber-800">{choDuyet.length}</span>}</p>
            {choDuyet.length === 0 ? <p className="mt-1 text-2xs text-slate-400">Không có yêu cầu nào đang chờ.</p> : (
              <ul className="mt-1 divide-y divide-slate-100 text-sm">
                {choDuyet.map((y) => (
                  <li key={y.id} className="flex items-center gap-2 py-1.5">
                    <span className="flex-1 text-slate-800">{y.full_name ?? y.nguoi}</span>
                    <span className="text-2xs text-slate-400">{new Date(y.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" disabled={dangLam === y.id} onClick={() => duyet(y, true)}>
                      {dangLam === y.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />} Duyệt
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-red-600" disabled={dangLam === y.id} onClick={() => duyet(y, false)} aria-label="Từ chối"><X className="h-3.5 w-3.5" /></Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {daXuLy.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-slate-500">Đã xử lý ({daXuLy.length})</summary>
              <ul className="mt-1 divide-y divide-slate-100">
                {daXuLy.map((y) => (
                  <li key={y.id} className="flex items-center gap-2 py-1">
                    <span className="flex-1 text-slate-700">{y.full_name ?? y.nguoi}</span>
                    <span className={`rounded-full px-1.5 text-2xs ${y.trang_thai === 'da_duyet' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{TEN_TRANG_THAI_GHI_DANH[y.trang_thai]}</span>
                    {y.ly_do && <span className="text-2xs text-slate-400">{y.ly_do}</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
