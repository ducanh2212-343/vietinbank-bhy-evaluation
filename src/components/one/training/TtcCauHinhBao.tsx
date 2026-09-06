import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  TTC_TEN_VAI, docCauHinhBao, moTaNguoiNhanBao,
  type TtcCauHinhBao as CauHinh, type TtcChuongTrinh, type TtcThanhVien,
} from '@/lib/trainingCenter';
import { luuCauHinhBao, useTtcLamTuoi } from './useTrainingCenter';

/**
 * BÁO KHI HỌC VIÊN TÍCH HOÀN THÀNH (Giám đốc 06/09/2026).
 *
 * Thay cho khối «Nhắc trước giờ» cũ. Lịch trong lộ trình đã chuyển sang tư duy
 * buổi sáng – buổi chiều nên giờ chỉ còn là gợi ý; nhắc theo một con số không ai
 * cam kết thì tin luôn sai lúc. Nguồn tin duy nhất bây giờ là hành vi thật của
 * học viên: ấn nút hoàn thành thì cả khóa học biết ngay.
 *
 * Bỏ trống danh sách = gửi toàn bộ thành viên. Chọn tên chỉ để thu hẹp lại —
 * đó là lý do ô «chọn người» nằm dưới một dòng nói rõ mặc định là cả lớp.
 */
export function TtcCauHinhBao({ ct, thanhVien, suaDuoc }: { ct: TtcChuongTrinh; thanhVien: TtcThanhVien[]; suaDuoc: boolean }) {
  const lamTuoi = useTtcLamTuoi();
  const [ch, setCh] = useState<CauHinh>(() => docCauHinhBao(ct.nhac));
  const [dangLuu, setDangLuu] = useState(false);
  useEffect(() => { setCh(docCauHinhBao(ct.nhac)); }, [ct.id, ct.nhac]);

  const luu = async () => {
    setDangLuu(true);
    try { await luuCauHinhBao(ct.id, ch); lamTuoi(); toast.success('Đã lưu cấu hình thông báo.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Không lưu được'); }
    finally { setDangLuu(false); }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-navy">
          <BellRing className="h-4 w-4" /> Báo khi học viên hoàn thành một đầu việc
        </h3>
        {suaDuoc && <Button size="sm" onClick={luu} disabled={dangLuu}>Lưu cấu hình</Button>}
      </div>

      <div className={`mt-3 rounded-xl border p-3 ${ch.bat ? 'border-[#A8763E]/50 bg-[#FFFCF7]' : 'border-slate-200'}`}>
        <label className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
          <Switch checked={ch.bat} disabled={!suaDuoc} onCheckedChange={(v) => setCh((c) => ({ ...c, bat: v }))} />
          Học viên ấn «hoàn thành» thì báo cho cả khóa học
        </label>
        <p className="mt-1 text-xs text-slate-600">{moTaNguoiNhanBao(ch, thanhVien.length)}</p>
        <p className="mt-1 text-2xs text-slate-500">
          Tin mang tên học viên, ngày lộ trình, đầu việc vừa xong và số đầu việc đã hoàn thành trên tổng số của ngày.
          Tin sinh ngoài giờ chờ tới 7h00 buổi làm việc kế tiếp và được gộp thành một tin cho mỗi ngày lộ trình.
        </p>

        <p className="mt-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">
          Thu hẹp người nhận — để trống là gửi cả lớp
        </p>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
          {thanhVien.map((t) => (
            <label key={t.id} className="flex items-center gap-1.5 text-sm text-slate-800">
              <Checkbox
                checked={ch.nguoi.includes(t.nguoi)}
                disabled={!suaDuoc || !ch.bat}
                onCheckedChange={(c) => setCh((x) => ({
                  ...x,
                  nguoi: c === true ? [...x.nguoi, t.nguoi] : x.nguoi.filter((y) => y !== t.nguoi),
                }))}
              />
              {t.full_name ?? t.nguoi} <span className="text-2xs uppercase text-slate-400">{TTC_TEN_VAI[t.vai]}</span>
            </label>
          ))}
          {thanhVien.length === 0 && <span className="text-xs text-slate-500">Chưa có thành viên nào trong khóa học.</span>}
        </div>
      </div>
    </div>
  );
}
