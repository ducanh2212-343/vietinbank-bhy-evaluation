import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { IDEA_LINH_VUC_INFO, type IdeaLinhVuc } from '@/data/one/ideasConfig';

// BỨC TRANH SÁNG TẠO — Chi nhánh đang sáng tạo về chuyện gì.
//
// Ba trục phân loại cũ đều không trả lời được câu này: cấp đề xuất nói nơi
// duyệt, phạm vi áp dụng nói ảnh hưởng tới đâu, cấp độ phát triển nói đi được
// bao xa. Nhóm lĩnh vực là trục thứ tư, và là trục duy nhất cho biết trí lực
// của Chi nhánh đang dồn vào mảng nào.
//
// Chủ ý hiển thị: NHÓM TRỐNG CŨNG PHẢI HIỆN. Truy vấn gộp thông thường chỉ trả
// nhóm có dữ liệu, nhìn vào tưởng mảng nào cũng có người làm — trong khi mảng
// trắng mới là thông tin đáng giá nhất, đó là chỗ cần phát động tiếp.

interface DongLinhVuc {
  linhVuc: IdeaLinhVuc;
  soYTuong: number;
  soPhong: number;
  uomMam: number;
  benRe: number;
  vuonCanh: number;
  lanToa: number;
}

function useBucTranhLinhVuc() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['bhy-ideas-buc-tranh-linh-vuc'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<DongLinhVuc[]> => {
      const { data: rows, error } = await supabase.rpc('bhy_ideas_buc_tranh_linh_vuc');
      if (error) throw error;
      return (rows ?? []).map(r => ({
        linhVuc: r.linh_vuc as IdeaLinhVuc,
        soYTuong: r.so_y_tuong,
        soPhong: r.so_phong,
        uomMam: r.uom_mam,
        benRe: r.ben_re,
        vuonCanh: r.vuon_canh,
        lanToa: r.lan_toa,
      }));
    },
  });
  return { rows: data, isLoading };
}

export const BucTranhLinhVuc: React.FC<{ chuaPhanNhom?: number }> = ({ chuaPhanNhom = 0 }) => {
  const { rows, isLoading } = useBucTranhLinhVuc();
  const lonNhat = Math.max(1, ...rows.map(r => r.soYTuong));
  const tong = rows.reduce((s, r) => s + r.soYTuong, 0);
  const nhomTrong = rows.filter(r => r.soYTuong === 0);

  if (isLoading) {
    return <p className="py-6 text-center text-xs italic text-slate-400">Đang dựng bức tranh…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="max-w-3xl">
        <h2 className="flex items-center gap-2 text-2xl font-bold uppercase tracking-tight text-brand-navy">
          <Sparkles className="h-6 w-6 text-amber-500" />
          Chi nhánh đang sáng tạo về chuyện gì
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {tong > 0
            ? <>Đã phân nhóm <b>{tong}</b> ý tưởng. Mảng nào cột dài là nơi anh chị em đang dồn
                trí lực; mảng nào trống là chỗ Chi nhánh còn dư địa để phát động.</>
            : <>Chưa ý tưởng nào được phân nhóm. Phòng TCTH phân nhóm ở màn
                «Vận hành &amp; phê duyệt», hoặc cán bộ chọn nhóm ngay khi gửi ý tưởng mới.</>}
        </p>
      </div>

      <div className="space-y-2">
        {rows.map(r => {
          const info = IDEA_LINH_VUC_INFO[r.linhVuc];
          const rong = (r.soYTuong / lonNhat) * 100;
          return (
            <div key={r.linhVuc} className="grid grid-cols-1 items-center gap-x-4 gap-y-1 sm:grid-cols-[minmax(160px,200px)_1fr]">
              <div className="flex items-baseline gap-1.5">
                <span aria-hidden>{info.emoji}</span>
                <span className={`text-sm font-bold ${r.soYTuong === 0 ? 'text-slate-400' : 'text-slate-800'}`}>
                  {r.linhVuc}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 flex-1 overflow-hidden rounded-md bg-slate-100">
                  <div
                    className={`h-full rounded-md border ${info.mau} transition-all`}
                    style={{ width: `${Math.max(rong, r.soYTuong > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <span className={`w-24 shrink-0 text-right font-mono text-xs font-bold tabular-nums ${
                  r.soYTuong === 0 ? 'text-slate-400' : 'text-slate-700'
                }`}>
                  {r.soYTuong === 0 ? 'chưa có' : `${r.soYTuong} ý tưởng`}
                </span>
              </div>
              {r.soYTuong > 0 && (
                <p className="text-2xs text-slate-500 sm:col-start-2">
                  {r.soPhong} phòng tham gia
                  {r.benRe > 0 && ` · ${r.benRe} Bén rễ`}
                  {r.vuonCanh > 0 && ` · ${r.vuonCanh} Vươn cành`}
                  {r.lanToa > 0 && ` · ${r.lanToa} Lan tỏa`}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {nhomTrong.length > 0 && tong > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <b>Còn {nhomTrong.length} mảng chưa có ý tưởng nào:</b>{' '}
          {nhomTrong.map(n => n.linhVuc).join(' · ')}. Đây là chỗ phát động đợt tới sẽ có
          dư địa nhất.
        </div>
      )}

      {chuaPhanNhom > 0 && (
        <p className="text-xs text-slate-500">
          Còn <b className="text-slate-700">{chuaPhanNhom}</b> ý tưởng chưa phân nhóm — bức tranh
          sẽ đầy đủ hơn khi phân nhóm xong.
        </p>
      )}

      <Link
        to="/one/y-tuong/gui"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-navy hover:underline"
      >
        Gửi ý tưởng cho mảng còn trống
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
};
