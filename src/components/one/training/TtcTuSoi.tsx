import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight, Lock, ScanFace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { TTC_TIEU_CHI_TU_SOI, type TtcTuSoi as TtcTuSoiKieu } from '@/lib/trainingCenter';
import type { TtcBoiCanh } from './useTrainingCenter';
import { luuTuSoi, useTtcCoTuSoi, useTtcLamTuoi, useTtcTuSoi } from './useTrainingCenter';

/**
 * TỰ SOI — phiếu 08 tiêu chí trưởng thành, hai đợt (Ngày 1 mốc nền, Ngày 10 đo
 * dịch chuyển), mô tả hành vi mức 1/3/5, ô ví dụ thật, biểu đồ dịch chuyển và
 * phiếu STOP – START – CONTINUE.
 *
 * Nội dung CHỈ chính học viên đọc/ghi (RLS). Vai khác vào màn này thấy cờ «đã
 * điền N/8 tiêu chí» — không có con số, không có ví dụ. Không có mức nào là mức
 * xấu: thang mô tả vị trí hiện tại, không xếp loại con người.
 */
export function TtcTuSoi({ bc }: { bc: TtcBoiCanh }) {
  const ctId = bc.chuongTrinh?.id ?? null;
  if (bc.laHocVien) return <PhieuTuSoi ctId={ctId!} />;
  return <CoDaDien ctId={ctId} bc={bc} />;
}

function CoDaDien({ ctId, bc }: { ctId: string | null; bc: TtcBoiCanh }) {
  const { data } = useTtcCoTuSoi(ctId);
  const ten = (id: string) => bc.thanhVien.find((t) => t.nguoi === id)?.full_name ?? 'Học viên';
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <Lock className="mx-auto h-8 w-8 text-slate-300" />
      <h2 className="mt-2 text-base font-bold text-brand-navy">Phần tự soi chỉ học viên đọc được</h2>
      <p className="mx-auto mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
        Đây là ràng buộc ở tầng dữ liệu, không phải ở giao diện: nếu điều học viên tự nói ra có thể quay lại thành điểm số,
        phiên tự soi chỉ còn là một buổi trình bày an toàn. Anh/chị chỉ thấy học viên đã điền hay chưa.
      </p>
      <div className="mx-auto mt-4 max-w-md space-y-2 text-left text-sm">
        {bc.thanhVien.filter((t) => t.vai === 'hoc_vien').map((hv) => {
          const d1 = data?.tuSoi.find((c) => c.nguoi === hv.nguoi && c.dot === 1);
          const d2 = data?.tuSoi.find((c) => c.nguoi === hv.nguoi && c.dot === 2);
          const soNgay = data?.suyNgam.filter((s) => s.nguoi === hv.nguoi).length ?? 0;
          return (
            <div key={hv.id} className="rounded-xl bg-slate-50 p-3">
              <p className="font-semibold text-brand-navy">{ten(hv.nguoi)}</p>
              <p className="text-xs text-slate-600">Đợt 1 (mốc nền): {d1 ? `đã chấm ${d1.so_tieu_chi_da_cham}/8 tiêu chí` : 'chưa điền'}</p>
              <p className="text-xs text-slate-600">Đợt 2 (Ngày 10): {d2 ? `đã chấm ${d2.so_tieu_chi_da_cham}/8 tiêu chí` : 'chưa điền'}</p>
              <p className="text-xs text-slate-600">Tự suy ngẫm hằng ngày: đã ghi {soNgay} ngày</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TRONG = (): Omit<TtcTuSoiKieu, 'id' | 'cap_nhat_luc' | 'chuong_trinh_id' | 'nguoi' | 'dot'> => ({
  muc: Array(8).fill(null), vi_du: Array(8).fill(null), dung_lai: null, bat_dau: null, tiep_tuc: null, cam_ket: null,
});

function PhieuTuSoi({ ctId }: { ctId: string }) {
  const { profileId } = useAuth();
  const lamTuoi = useTtcLamTuoi();
  const { data: ds = [] } = useTtcTuSoi(ctId, true);
  const [dot, setDot] = useState<1 | 2>(1);
  const cu = ds.find((d) => d.dot === dot) ?? null;
  const dot1 = ds.find((d) => d.dot === 1) ?? null;
  const dot2 = ds.find((d) => d.dot === 2) ?? null;

  const [f, setF] = useState(TRONG());
  const [dangLuu, setDangLuu] = useState(false);
  useEffect(() => {
    setF(cu ? { muc: [...cu.muc], vi_du: [...cu.vi_du], dung_lai: cu.dung_lai, bat_dau: cu.bat_dau, tiep_tuc: cu.tiep_tuc, cam_ket: cu.cam_ket } : TRONG());
  }, [cu?.id, cu?.cap_nhat_luc]); // eslint-disable-line react-hooks/exhaustive-deps

  const datMuc = (i: number, m: number) => setF((c) => ({ ...c, muc: c.muc.map((x, j) => (j === i ? (x === m ? null : m) : x)) }));
  const datViDu = (i: number, v: string) => setF((c) => ({ ...c, vi_du: c.vi_du.map((x, j) => (j === i ? (v || null) : x)) }));
  const soDaCham = f.muc.filter((m) => m != null).length;

  const luu = async () => {
    if (!profileId) return;
    setDangLuu(true);
    try {
      await luuTuSoi({ chuong_trinh_id: ctId, nguoi: profileId, dot, ...f });
      lamTuoi();
      toast.success(`Đã lưu phiếu đợt ${dot}. Chỉ mình anh/chị đọc được nội dung này.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không lưu được');
    } finally { setDangLuu(false); }
  };

  const dichChuyen = useMemo(
    () => TTC_TIEU_CHI_TU_SOI.map((tc, i) => ({ tc, m1: dot1?.muc[i] ?? null, m2: dot2?.muc[i] ?? null })),
    [dot1, dot2],
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#A8763E]/40 bg-[#FFFCF7] p-4 text-sm leading-relaxed text-slate-700">
        <p className="flex items-center gap-2 font-semibold text-[#8A5E2C]"><ScanFace className="h-4 w-4" /> Chấm theo HÀNH VI QUAN SÁT ĐƯỢC</p>
        <p className="mt-1">
          Mỗi mức kèm một ví dụ có thật trong ba tháng gần đây. Mức 1, 3, 5 được mô tả rõ; mức 2 và 4 là bước trung gian.
          Không có mức nào là mức xấu. Phiếu này <b>không vào bất kỳ bảng điểm nào</b> và chỉ mình anh/chị đọc được.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {([1, 2] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDot(d)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${dot === d ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-300 bg-white text-slate-600'}`}
          >
            Đợt {d} · {d === 1 ? 'Ngày 1 — mốc nền' : 'Ngày 10 — đo dịch chuyển'}
            {(d === 1 ? dot1 : dot2) && <span className="ml-1 text-xs opacity-70">✓</span>}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500">Đã chấm {soDaCham}/8</span>
      </div>

      <div className="space-y-3">
        {TTC_TIEU_CHI_TU_SOI.map((tc, i) => (
          <div key={tc.so} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-brand-navy">{tc.so}. {tc.ten}</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => datMuc(i, m)}
                    className={`h-8 w-8 rounded-full border text-sm font-bold transition ${f.muc[i] === m ? 'border-[#A8763E] bg-[#A8763E] text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-[#A8763E]'}`}
                    aria-label={`${tc.ten} mức ${m}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
              <p className={`rounded-lg p-2 ${f.muc[i] === 1 ? 'bg-[#A8763E]/15' : 'bg-slate-50'}`}><b>Mức 1 — chờ giao việc.</b> {tc.muc1}</p>
              <p className={`rounded-lg p-2 ${f.muc[i] === 3 ? 'bg-[#A8763E]/15' : 'bg-slate-50'}`}><b>Mức 3 — tự quản lý, tự đề xuất.</b> {tc.muc3}</p>
              <p className={`rounded-lg p-2 ${f.muc[i] === 5 ? 'bg-[#A8763E]/15' : 'bg-slate-50'}`}><b>Mức 5 — chủ động cải tiến hệ thống.</b> {tc.muc5}</p>
            </div>
            <Textarea
              rows={2}
              value={f.vi_du[i] ?? ''}
              onChange={(e) => datViDu(i, e.target.value)}
              placeholder={dot === 1 ? 'Bằng chứng: một ví dụ thật trong ba tháng gần đây…' : 'Điều đã thay đổi so với đợt 1, kèm ví dụ…'}
              className="mt-2"
            />
          </div>
        ))}
      </div>

      {dot === 2 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-bold text-brand-navy">STOP — START — CONTINUE</p>
          <p className="text-xs text-slate-500">«Đừng đợi có chức danh cao hơn rồi mới hành xử như vị trí cao hơn.»</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div><p className="text-2xs font-bold uppercase text-red-700">Dừng lại</p><Textarea rows={4} value={f.dung_lai ?? ''} onChange={(e) => setF((c) => ({ ...c, dung_lai: e.target.value || null }))} placeholder="Thói quen, suy nghĩ, hành động không còn phù hợp với vai hiện tại" /></div>
            <div><p className="text-2xs font-bold uppercase text-emerald-700">Bắt đầu</p><Textarea rows={4} value={f.bat_dau ?? ''} onChange={(e) => setF((c) => ({ ...c, bat_dau: e.target.value || null }))} placeholder="Thói quen và tư duy mới; kỹ năng cần phát triển" /></div>
            <div><p className="text-2xs font-bold uppercase text-brand-navy">Tiếp tục</p><Textarea rows={4} value={f.tiep_tuc ?? ''} onChange={(e) => setF((c) => ({ ...c, tiep_tuc: e.target.value || null }))} placeholder="Thói quen tốt đang duy trì, hành động đang mang lại kết quả" /></div>
          </div>
          <p className="mt-3 text-sm font-bold text-brand-navy">Cam kết hành động 30 ngày — và ai sẽ cùng tôi kiểm tra</p>
          <Textarea rows={3} value={f.cam_ket ?? ''} onChange={(e) => setF((c) => ({ ...c, cam_ket: e.target.value || null }))} className="mt-1" />
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={luu} disabled={dangLuu}>Lưu phiếu đợt {dot}</Button>
      </div>

      {dot1 && dot2 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-bold text-brand-navy">Biểu đồ dịch chuyển Ngày 1 → Ngày 10</p>
          <div className="mt-3 space-y-2">
            {dichChuyen.map(({ tc, m1, m2 }) => (
              <div key={tc.so} className="grid grid-cols-[8rem_1fr] items-center gap-2 text-xs">
                <span className="font-semibold text-slate-700">{tc.ten}</span>
                <div className="relative h-5 rounded-full bg-slate-100">
                  {m1 != null && <span className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-slate-400" style={{ left: `calc(${((m1 - 1) / 4) * 100}% - 6px)` }} title={`Đợt 1: ${m1}`} />}
                  {m2 != null && <span className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-[#A8763E]" style={{ left: `calc(${((m2 - 1) / 4) * 100}% - 6px)` }} title={`Đợt 2: ${m2}`} />}
                  {m1 != null && m2 != null && m2 !== m1 && (
                    <span className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-[#A8763E]/60" style={{ left: `${((Math.min(m1, m2) - 1) / 4) * 100}%`, width: `${(Math.abs(m2 - m1) / 4) * 100}%` }} />
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 flex items-center gap-3 text-2xs text-slate-500">
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Đợt 1</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#A8763E]" /> Đợt 2</span>
            <ArrowRight className="h-3 w-3" /> trục 1 → 5
          </p>
        </div>
      )}
    </div>
  );
}
