import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  TTC_TEN_VAI, docCauHinhNhac, type TtcCauHinhNhac as CauHinh, type TtcChuongTrinh, type TtcMocNhac, type TtcThanhVien,
} from '@/lib/trainingCenter';
import { luuNhac, useTtcLamTuoi } from './useTrainingCenter';

const PHUT_CHON = [10, 15, 20, 30, 45, 60];

/**
 * NHẮC TRƯỚC GIỜ — «báo cho ai trong lần đào tạo này» (Giám đốc 06/09).
 *
 * Hai mốc: trước giờ bắt đầu của cả ngày (kiểm tra lại phần chuẩn bị) và trước
 * giờ kết thúc của từng phần (đầu ra phải nộp, ô chưa tích). Người nhận chọn
 * thẳng trong danh sách thành viên chứ không theo vai — mỗi đợt một bộ người.
 * Máy chủ quét mỗi 5 phút (ttc_nhac_theo_lich); tin ngoài giờ tự chờ tới 7h00.
 */
export function TtcCauHinhNhac({ ct, thanhVien, suaDuoc }: { ct: TtcChuongTrinh; thanhVien: TtcThanhVien[]; suaDuoc: boolean }) {
  const lamTuoi = useTtcLamTuoi();
  const [ch, setCh] = useState<CauHinh>(() => docCauHinhNhac(ct.nhac));
  const [dangLuu, setDangLuu] = useState(false);
  useEffect(() => { setCh(docCauHinhNhac(ct.nhac)); }, [ct.id, ct.nhac]);

  const dat = (k: keyof CauHinh, v: Partial<TtcMocNhac>) => setCh((c) => ({ ...c, [k]: { ...c[k], ...v } }));
  const luu = async () => {
    setDangLuu(true);
    try { await luuNhac(ct.id, ch); lamTuoi(); toast.success('Đã lưu cấu hình nhắc.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Không lưu được'); }
    finally { setDangLuu(false); }
  };

  const Khoi = ({ k, ten, mo }: { k: keyof CauHinh; ten: string; mo: string }) => {
    const m = ch[k];
    return (
      <div className={`rounded-xl border p-3 ${m.bat ? 'border-[#A8763E]/50 bg-[#FFFCF7]' : 'border-slate-200'}`}>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
            <Switch checked={m.bat} disabled={!suaDuoc} onCheckedChange={(v) => dat(k, { bat: v })} /> {ten}
          </label>
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-slate-600">
            trước
            <Select value={String(m.phut)} onValueChange={(v) => dat(k, { phut: Number(v) })} disabled={!suaDuoc}>
              <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
              <SelectContent>{PHUT_CHON.map((p) => <SelectItem key={p} value={String(p)}>{p} phút</SelectItem>)}</SelectContent>
            </Select>
          </span>
        </div>
        <p className="mt-1 text-2xs text-slate-500">{mo}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          {thanhVien.map((t) => {
            const chon = m.nguoi.includes(t.nguoi);
            return (
              <label key={t.id} className="flex items-center gap-1.5 text-sm text-slate-800">
                <Checkbox
                  checked={chon}
                  disabled={!suaDuoc || !m.bat}
                  onCheckedChange={(c) => dat(k, { nguoi: c === true ? [...m.nguoi, t.nguoi] : m.nguoi.filter((x) => x !== t.nguoi) })}
                />
                {t.full_name ?? t.nguoi} <span className="text-2xs uppercase text-slate-400">{TTC_TEN_VAI[t.vai]}</span>
              </label>
            );
          })}
          {thanhVien.length === 0 && <span className="text-xs text-slate-500">Chưa có thành viên để chọn.</span>}
        </div>
        {m.bat && m.nguoi.length === 0 && <p className="mt-1 text-2xs text-amber-700">Đang bật nhưng chưa chọn ai — sẽ không có tin nào được gửi.</p>}
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-navy"><BellRing className="h-4 w-4" /> Nhắc trước giờ — báo cho ai</h3>
        {suaDuoc && <Button size="sm" onClick={luu} disabled={dangLuu}>Lưu cấu hình</Button>}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Hệ thống tự kiểm tra lại trước hai mốc và gửi push cho đúng những người được chọn trong lần đào tạo này. Tin sinh ngoài giờ chờ tới 7h00 buổi làm việc kế tiếp.
      </p>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Khoi k="truoc_ngay" ten="Trước giờ bắt đầu của ngày" mo="Tin mang tiêu đề ngày, giờ bắt đầu, văn bản của ngày và phần «Chuẩn bị tối hôm trước» để kiểm tra lại." />
        <Khoi k="truoc_het_phan" ten="Trước giờ kết thúc từng phần" mo="Với mỗi phần trong ngày (Khởi động, Nghiên cứu văn bản, Thực hành, Trình bày…): đầu ra phải nộp và số ô học viên chưa tích." />
      </div>
    </div>
  );
}
