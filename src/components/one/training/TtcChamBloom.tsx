import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ClipboardCheck, EyeOff, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import {
  TTC_THANG_BLOOM, TTC_TRU_HINH_THUC_TOI_DA, diemBloomHopLe, thangCanCungCo, tongDiemBloom,
  type TtcDiemBloom, type TtcNgay,
} from '@/lib/trainingCenter';
import type { TtcBoiCanh } from './useTrainingCenter';
import { congBoDiem, luuDiemBloom, useTtcLamTuoi } from './useTrainingCenter';

/**
 * PHIẾU CHẤM 06 THANG BLOOM (Phụ lục 3) cho một ngày.
 *
 * Mỗi người chấm (PGĐ phụ trách, Giám đốc) một phiếu riêng, chấm ĐỘC LẬP —
 * chênh trên 10 điểm thì giải trình, đúng như quy định tổ chấm. Học viên chỉ
 * nhìn thấy phiếu sau khi Ban Giám đốc bấm «Công bố»; trước đó RLS không trả
 * dòng nào về, không phải giao diện giấu.
 */
export function TtcChamBloom({ bc, ngay, hocVienId, dsDiem }: {
  bc: TtcBoiCanh; ngay: TtcNgay; hocVienId: string; dsDiem: TtcDiemBloom[];
}) {
  const { profileId } = useAuth();
  const lamTuoi = useTtcLamTuoi();
  const cuaToi = dsDiem.find((d) => d.nguoi_cham === profileId) ?? null;
  const ten = (id: string) => bc.thanhVien.find((t) => t.nguoi === id)?.full_name ?? 'Người chấm';

  const [diem, setDiem] = useState({ b1: 0, b2: 0, b3: 0, b4: 0, b5: 0, b6: 0, tru_hinh_thuc: 0 });
  const [nhanXet, setNhanXet] = useState('');
  const [moForm, setMoForm] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);
  useEffect(() => {
    if (cuaToi) {
      setDiem({ b1: cuaToi.b1, b2: cuaToi.b2, b3: cuaToi.b3, b4: cuaToi.b4, b5: cuaToi.b5, b6: cuaToi.b6, tru_hinh_thuc: cuaToi.tru_hinh_thuc });
      setNhanXet(cuaToi.nhan_xet ?? '');
    }
  }, [cuaToi?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Học viên: chỉ những phiếu đã công bố mới về tới đây (RLS)
  if (bc.laHocVien) {
    if (dsDiem.length === 0) return null;
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
        <p className="text-2xs font-semibold uppercase tracking-widest text-emerald-700">Phiếu chấm Bloom đã công bố</p>
        {dsDiem.map((d) => <BangDiem key={d.id} d={d} ten={ten(d.nguoi_cham)} />)}
      </div>
    );
  }

  if (!bc.laNguoiCham && !bc.laQuanTri) return null;

  const luu = async () => {
    if (!profileId) return;
    if (!diemBloomHopLe(diem)) { toast.error('Điểm vượt khung của thang hoặc trừ hình thức quá 5.'); return; }
    setDangLuu(true);
    try {
      await luuDiemBloom({ id: cuaToi?.id, ngay_id: ngay.id, hoc_vien: hocVienId, nguoi_cham: profileId, ...diem, nhan_xet: nhanXet.trim() || null });
      lamTuoi();
      setMoForm(false);
      const yeu = thangCanCungCo(diem);
      toast.success(yeu.length ? `Đã lưu. ${yeu.length} thang dưới 60% — Giám đốc đã được báo.` : 'Đã lưu phiếu chấm.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không lưu được');
    } finally { setDangLuu(false); }
  };

  const congBo = async (bat: boolean) => {
    try {
      await congBoDiem(dsDiem.map((d) => d.id), bat);
      lamTuoi();
      toast.success(bat ? 'Đã công bố — học viên nhìn thấy điểm của ngày này.' : 'Đã thu lại, học viên không còn thấy điểm.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không đổi được');
    }
  };

  const daCongBo = dsDiem.length > 0 && dsDiem.every((d) => d.cong_bo);
  const tong = tongDiemBloom(diem);

  return (
    <div className="rounded-2xl border border-brand-navy/20 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-widest text-brand-red">
            <ClipboardCheck className="h-4 w-4" /> Phiếu chấm Bloom · Ngày {ngay.so_thu_tu}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {dsDiem.length === 0 ? 'Chưa có phiếu chấm nào cho ngày này.' : `${dsDiem.length} phiếu · ${daCongBo ? 'đã công bố' : 'chưa công bố cho học viên'}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {bc.laNguoiCham && (
            <Button size="sm" variant={moForm ? 'secondary' : 'default'} onClick={() => setMoForm((v) => !v)}>
              {cuaToi ? 'Sửa phiếu của tôi' : 'Chấm phiếu'}
            </Button>
          )}
          {bc.laBgd && dsDiem.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => congBo(!daCongBo)}>
              {daCongBo ? <><EyeOff className="mr-1 h-3.5 w-3.5" /> Thu lại</> : <><Megaphone className="mr-1 h-3.5 w-3.5" /> Công bố cho học viên</>}
            </Button>
          )}
        </div>
      </div>

      {moForm && bc.laNguoiCham && (
        <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3">
          {TTC_THANG_BLOOM.map((t) => (
            <div key={t.ma} className="grid grid-cols-[1fr_5rem] items-center gap-2 sm:grid-cols-[10rem_1fr_5rem]">
              <p className="text-sm font-semibold text-brand-navy">{t.so}. {t.ten} <span className="text-slate-400">/{t.toiDa}</span></p>
              <p className="hidden text-2xs leading-snug text-slate-500 sm:block">{t.dat}</p>
              <Input
                type="number" min={0} max={t.toiDa} value={diem[t.ma]}
                onChange={(e) => setDiem((d) => ({ ...d, [t.ma]: Math.max(0, Math.min(t.toiDa, Number(e.target.value) || 0)) }))}
                className="h-8 text-right"
              />
            </div>
          ))}
          <div className="grid grid-cols-[1fr_5rem] items-center gap-2 sm:grid-cols-[10rem_1fr_5rem]">
            <p className="text-sm font-semibold text-slate-700">Trừ hình thức <span className="text-slate-400">tối đa −{TTC_TRU_HINH_THUC_TOI_DA}</span></p>
            <p className="hidden text-2xs text-slate-500 sm:block">Hình thức slide và kỷ luật thời gian — ghi nhận riêng, không cộng.</p>
            <Input
              type="number" min={0} max={5} value={diem.tru_hinh_thuc}
              onChange={(e) => setDiem((d) => ({ ...d, tru_hinh_thuc: Math.max(0, Math.min(5, Number(e.target.value) || 0)) }))}
              className="h-8 text-right"
            />
          </div>
          <Textarea value={nhanXet} onChange={(e) => setNhanXet(e.target.value)} rows={3} placeholder="Bằng chứng người chấm ghi lại — nói về sản phẩm và hành vi quan sát được, không gắn nhãn tính cách." className="bg-white" />
          <div className="flex items-center justify-between">
            <p className="text-sm">Tổng: <b className={`text-lg ${tong >= 80 ? 'text-emerald-700' : tong >= 65 ? 'text-brand-navy' : 'text-amber-700'}`}>{tong}</b>/100
              {thangCanCungCo(diem).length > 0 && <span className="ml-2 text-xs text-amber-700">· {thangCanCungCo(diem).map((t) => t.ten).join(', ')} dưới 60%</span>}
            </p>
            <Button size="sm" onClick={luu} disabled={dangLuu}>Lưu phiếu</Button>
          </div>
        </div>
      )}

      {dsDiem.length > 0 && (
        <div className="mt-4 space-y-3">
          {dsDiem.map((d) => <BangDiem key={d.id} d={d} ten={ten(d.nguoi_cham)} />)}
        </div>
      )}
    </div>
  );
}

function BangDiem({ d, ten }: { d: TtcDiemBloom; ten: string }) {
  const yeu = thangCanCungCo(d);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-brand-navy">{ten}</p>
        <p className="text-sm">Tổng <b className="text-lg">{d.tong}</b>/100{d.tru_hinh_thuc > 0 && <span className="text-xs text-slate-500"> (trừ hình thức −{d.tru_hinh_thuc})</span>}</p>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        {TTC_THANG_BLOOM.map((t) => {
          const kem = d[t.ma] < t.toiDa * 0.6;
          return (
            <div key={t.ma} className={`rounded-lg px-2 py-1.5 text-center ${kem ? 'bg-amber-100 text-amber-900' : 'bg-slate-50 text-slate-700'}`}>
              <p className="text-2xs font-semibold uppercase">{t.ten}</p>
              <p className="text-sm font-bold tabular-nums">{d[t.ma]}<span className="text-2xs font-normal text-slate-400">/{t.toiDa}</span></p>
            </div>
          );
        })}
      </div>
      {yeu.length > 0 && <p className="mt-2 text-xs text-amber-800">Cấu phần cần củng cố: {yeu.map((t) => t.ten).join(', ')} — nên đưa vào bản đồ năng lực.</p>}
      {d.nhan_xet && <p className="mt-2 text-sm leading-relaxed text-slate-700">{d.nhan_xet}</p>}
    </div>
  );
}
