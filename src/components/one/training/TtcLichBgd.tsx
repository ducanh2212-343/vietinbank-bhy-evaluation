import { useMemo } from 'react';
import { AlertTriangle, CalendarDays } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TTC_TEN_PHU_TRACH, TTC_TRAN_PHUT_BGD, lichBgd, nhanNgay, thoiLuongPhut, tongGioCaDot, vuotTranBgd,
} from '@/lib/trainingCenter';
import type { TtcBoiCanh } from './useTrainingCenter';
import { useTtcDauViec, useTtcNgay } from './useTrainingCenter';

/**
 * LỊCH BAN GIÁM ĐỐC — gom mọi khung giờ cần Giám đốc hoặc PGĐ có mặt, theo
 * ngày, có tổng phút mỗi ngày và tổng giờ cả đợt.
 *
 * Trần 60 phút/người/ngày (trừ ngày đầu và ngày cuối) là ngưỡng thiết kế của
 * chương trình: màn hình tô cảnh báo chứ không chặn hay cắt dữ liệu, vì lịch
 * phải phản ánh đúng chương trình đã duyệt — vượt trần là thông tin để Giám đốc
 * quyết định uỷ quyền cho PGĐ, không phải lỗi để giấu.
 */
export function TtcLichBgd({ bc }: { bc: TtcBoiCanh }) {
  const ctId = bc.chuongTrinh?.id ?? null;
  const { data: dsNgay = [], isLoading } = useTtcNgay(ctId);
  const ngayIds = useMemo(() => dsNgay.map((n) => n.id), [dsNgay]);
  const { data: dsViec = [] } = useTtcDauViec(ctId, ngayIds);
  const lich = useMemo(() => lichBgd(dsNgay, dsViec), [dsNgay, dsViec]);
  const tong = tongGioCaDot(lich);

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <O nhan="Giám đốc · cả đợt" gia={`${tong.gioGd} giờ`} />
        <O nhan="PGĐ phụ trách · cả đợt" gia={`${tong.gioPgd} giờ`} />
        <O nhan="Ngưỡng mỗi ngày" gia={`≤ ${TTC_TRAN_PHUT_BGD} phút/người`} phu="trừ ngày đầu và ngày cuối" />
      </div>

      <div className="space-y-3">
        {lich.map((d) => {
          const vuot = vuotTranBgd(d, dsNgay.length);
          return (
            <div key={d.ngay.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${vuot ? 'border-amber-300' : 'border-slate-200'}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-brand-navy">
                  <CalendarDays className="mr-1 inline h-4 w-4 text-[#A8763E]" />
                  Ngày {d.ngay.so_thu_tu} · {nhanNgay(d.ngay.ngay)} — {d.ngay.tieu_de}
                </p>
                <p className="text-xs text-slate-600">
                  GĐ <b className={d.phutGd > TTC_TRAN_PHUT_BGD ? 'text-amber-700' : ''}>{d.phutGd}′</b> · PGĐ <b className={d.phutPgd > TTC_TRAN_PHUT_BGD ? 'text-amber-700' : ''}>{d.phutPgd}′</b>
                  {vuot && <span className="ml-2 inline-flex items-center gap-1 text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /> vượt trần</span>}
                </p>
              </div>
              {d.viec.length === 0 ? (
                <p className="mt-2 text-xs text-slate-400">Không có khung giờ nào cần Ban Giám đốc.</p>
              ) : (
                <ul className="mt-2 divide-y divide-slate-100 text-sm">
                  {d.viec.map((v) => (
                    <li key={v.id} className="flex gap-3 py-1.5">
                      <span className="w-24 shrink-0 tabular-nums text-slate-600">{v.gio_bat_dau}–{v.gio_ket_thuc}</span>
                      <span className="w-10 shrink-0 text-right tabular-nums text-slate-400">{thoiLuongPhut(v)}′</span>
                      <span className="min-w-0 flex-1 text-slate-800">{v.ten}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-2xs font-semibold ${v.nguoi_phu_trach === 'GD' ? 'bg-brand-navy/10 text-brand-navy' : v.nguoi_phu_trach === 'PGD' ? 'bg-[#A8763E]/15 text-[#8A5E2C]' : 'bg-slate-100 text-slate-600'}`}>
                        {TTC_TEN_PHU_TRACH[v.nguoi_phu_trach]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function O({ nhan, gia, phu }: { nhan: string; gia: string; phu?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-2xs font-semibold uppercase tracking-wider text-slate-500">{nhan}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-brand-navy">{gia}</p>
      {phu && <p className="text-2xs text-slate-400">{phu}</p>}
    </div>
  );
}
