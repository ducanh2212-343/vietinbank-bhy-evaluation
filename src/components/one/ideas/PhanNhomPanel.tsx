import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Info, Search, Tags } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { khopTimKiem } from '@/lib/vietnamese';
import { IDEA_LINH_VUC, IDEA_LINH_VUC_INFO, type IdeaLinhVuc } from '@/data/one/ideasConfig';
import type { PortalIdea } from './usePortalIdeas';

// Phân nhóm hàng loạt cho ý tưởng cũ.
//
// 134 ý tưởng đã gửi trước khi có trường nhóm lĩnh vực nên đều để trống. Không
// tự đoán hộ: nội dung ý tưởng thì máy đọc được nhưng phân nhóm sai còn tệ hơn
// để trống, vì bức tranh sáng tạo sẽ chỉ sai lệch. Màn này để TCTH gắn nhanh,
// mặc định lọc đúng những phiếu chưa có nhóm.

const SO_HIEN = 15;

export const PhanNhomPanel: React.FC<{ ideas: PortalIdea[] }> = ({ ideas }) => {
  const queryClient = useQueryClient();
  const [tim, setTim] = useState('');
  const [chiChuaCo, setChiChuaCo] = useState(true);
  const [xemHet, setXemHet] = useState(false);
  const [dangLuu, setDangLuu] = useState<string | null>(null);

  const chuaPhanNhom = ideas.filter(i => !i.linhVuc).length;

  const loc = useMemo(() => {
    const theoNhom = chiChuaCo ? ideas.filter(i => !i.linhVuc) : ideas;
    if (!tim.trim()) return theoNhom;
    return theoNhom.filter(i =>
      khopTimKiem([i.title, i.proposer, i.departmentName, i.proposedSolution].join(' '), tim));
  }, [ideas, tim, chiChuaCo]);

  const hien = xemHet ? loc : loc.slice(0, SO_HIEN);

  const dat = async (idea: PortalIdea, nhom: string) => {
    setDangLuu(idea.id);
    try {
      const { error } = await supabase.rpc('bhy_ideas_dat_linh_vuc', {
        _idea_id: idea.id,
        _linh_vuc: nhom || null,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(nhom ? `Đã xếp vào nhóm ${nhom}` : 'Đã bỏ nhóm');
      queryClient.invalidateQueries({ queryKey: ['one-portal-ideas'] });
      queryClient.invalidateQueries({ queryKey: ['bhy-ideas-buc-tranh-linh-vuc'] });
    } finally {
      setDangLuu(null);
    }
  };

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-1.5 font-black text-slate-800">
          <Tags className="h-4 w-4 text-violet-600" />
          Phân nhóm lĩnh vực cho ý tưởng
        </p>
        <span className={`ml-auto rounded-full px-2.5 py-1 text-2xs font-black ${
          chuaPhanNhom > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'
        }`}>
          {chuaPhanNhom > 0 ? `${chuaPhanNhom} ý tưởng chưa có nhóm` : 'Đã phân nhóm hết'}
        </span>
      </div>

      <div className="flex gap-2 rounded-lg border border-violet-200 bg-violet-50 p-2.5 text-2xs text-violet-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Nhóm lĩnh vực trả lời câu <b>«sáng tạo về chuyện gì»</b> — khác cấp đề xuất (nơi
          duyệt), phạm vi áp dụng (ảnh hưởng tới đâu) và cấp độ phát triển (đi được bao xa).
          Ý tưởng gửi từ nay cán bộ tự chọn nhóm; màn này để gắn cho các phiếu gửi trước đó.
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={tim}
            onChange={e => setTim(e.target.value)}
            placeholder="Tìm ý tưởng…"
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs font-medium outline-none focus:border-amber-500"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-slate-600">
          <input
            type="checkbox"
            checked={chiChuaCo}
            onChange={e => setChiChuaCo(e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer accent-violet-600"
          />
          Chỉ hiện ý tưởng chưa có nhóm
        </label>
      </div>

      {hien.length === 0 ? (
        <p className="py-6 text-center text-xs italic text-slate-400">
          {chiChuaCo ? 'Mọi ý tưởng đều đã có nhóm.' : 'Không có ý tưởng nào khớp.'}
        </p>
      ) : (
        <div className="space-y-1.5">
          {hien.map(i => (
            <div key={i.id} className="rounded-xl border border-slate-200 bg-white p-2.5">
              <p className="text-sm font-bold leading-snug text-slate-800">{i.title}</p>
              <p className="mt-0.5 text-2xs text-slate-500">{i.departmentName} · {i.proposer}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {IDEA_LINH_VUC.map(n => {
                  const info = IDEA_LINH_VUC_INFO[n as IdeaLinhVuc];
                  const dangChon = i.linhVuc === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={dangLuu === i.id}
                      onClick={() => void dat(i, dangChon ? '' : n)}
                      title={info.goiY}
                      className={`cursor-pointer rounded-lg border px-2 py-1 text-2xs font-bold transition-all disabled:opacity-50 ${
                        dangChon ? info.mau : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {info.emoji} {n}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {!xemHet && loc.length > SO_HIEN && (
            <button
              type="button"
              onClick={() => setXemHet(true)}
              className="w-full cursor-pointer rounded-lg border border-dashed border-slate-300 py-2 text-xs font-bold text-slate-500 transition-colors hover:border-amber-400 hover:text-amber-600"
            >
              Xem thêm {loc.length - SO_HIEN} ý tưởng
            </button>
          )}
        </div>
      )}
    </div>
  );
};
