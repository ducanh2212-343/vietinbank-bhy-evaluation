import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, FileText, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DON_GIA_CAP, dienGiaiTien, tinhHinhNganSach } from '@/lib/ideaRewards';
import { downloadIdeasExcel, filterIdeasByDate } from './ideasExcel';
import { useIdeaOwnerProfiles } from './useIdeaOwnerProfiles';
import type { PortalIdea } from './usePortalIdeas';

// Ngân sách chu kỳ + kết xuất Excel — hai việc của Phòng TCTH, trước đây bị nhét
// trong tiêu đề bảng theo dõi ý tưởng nên cán bộ thường cũng phải nhìn thấy.

/**
 * Tiền đã cam kết đọc từ SỔ GHI NHẬN chứ không suy từ cấp độ ý tưởng: sổ là nơi
 * duy nhất biết mỗi cấp đã trả tiền hay chưa (nguyên tắc lũy kế), còn cấp độ
 * hiện tại thì không nói được điều đó.
 */
function useNganSachIdeas() {
  const { data, isLoading } = useQuery({
    queryKey: ['bhy-ideas-ngan-sach'],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('portal_idea_awards')
        .select('muc_thuong, trang_thai');
      if (error) throw error;
      const ds = rows ?? [];
      const daChi = ds
        .filter(r => r.trang_thai === 'da_ghi_nhan')
        .reduce((s, r) => s + (r.muc_thuong ?? 0), 0);
      // Hồ sơ đang chờ Giám đốc chưa mang tiền, nhưng duyệt là thành đơn giá
      // Bén rễ — tính vào phần cam kết để không duyệt lố rồi mới biết
      const choDuyet = ds.filter(r => r.trang_thai === 'cho_gd_duyet').length * DON_GIA_CAP['Bén rễ'].min;
      return { daChi, choDuyet };
    },
  });
  return { daChi: data?.daChi ?? 0, choDuyet: data?.choDuyet ?? 0, isLoading };
}

export const IdeaBudgetExport: React.FC<{ ideas: PortalIdea[] }> = ({ ideas }) => {
  const { daChi, choDuyet, isLoading } = useNganSachIdeas();
  const { owners } = useIdeaOwnerProfiles(true);
  const [tuNgay, setTuNgay] = useState('');
  const [denNgay, setDenNgay] = useState('');
  const [dangXuat, setDangXuat] = useState(false);

  const ns = tinhHinhNganSach(daChi, choDuyet);
  const tyLe = Math.min(100, Math.round(ns.tyLeDaDung * 100));

  const xuatExcel = async () => {
    if (ideas.length === 0) {
      toast.error('Không có dữ liệu ý tưởng để kết xuất!');
      return;
    }
    const trongKhoang = filterIdeasByDate(ideas, tuNgay || undefined, denNgay || undefined);
    if (trongKhoang.length === 0) {
      toast.error('Không có dữ liệu ý tưởng nào trong khoảng thời gian đã chọn!');
      return;
    }
    setDangXuat(true);
    try {
      await downloadIdeasExcel(ideas, owners, tuNgay || undefined, denNgay || undefined);
      toast.success(`Đã kết xuất ${trongKhoang.length} ý tưởng ra file Excel`);
    } catch {
      toast.error('Không dựng được file Excel. Vui lòng thử lại.');
    } finally {
      setDangXuat(false);
    }
  };

  return (
    <div className="space-y-3 text-sm">
      <p className="flex items-center gap-1.5 font-black text-slate-800">
        <Wallet className="h-4 w-4 text-emerald-600" />
        Ngân sách chu kỳ &amp; kết xuất số liệu
      </p>

      {isLoading ? (
        <p className="py-4 text-center text-xs italic text-slate-400">Đang tính ngân sách…</p>
      ) : (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
            <span className="font-bold text-slate-500">Đã ghi nhận chi:</span>
            <b className="text-slate-800">{dienGiaiTien(ns.daChi, ns.daChi)}</b>
            <span className="font-bold text-slate-500">Đang chờ duyệt:</span>
            <b className="text-amber-700">{dienGiaiTien(ns.choDuyet, ns.choDuyet)}</b>
            <span className="ml-auto font-bold text-slate-500">
              Còn lại <b className={ns.vuotTran ? 'text-rose-600' : 'text-emerald-700'}>
                {dienGiaiTien(Math.max(0, ns.conLai), Math.max(0, ns.conLai))}
              </b> / {dienGiaiTien(ns.tong, ns.tong)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${
                ns.vuotTran ? 'bg-rose-500' : ns.sapHet ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${tyLe}%` }}
            />
          </div>
          {ns.canhBao && (
            <p className="flex gap-1.5 text-xs font-semibold text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {ns.canhBao}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs">
        <span className="font-bold uppercase tracking-wider text-slate-500">Từ:</span>
        <input
          type="date"
          value={tuNgay}
          onChange={e => setTuNgay(e.target.value)}
          className="cursor-pointer rounded border border-slate-200 bg-white px-1.5 py-1 font-semibold text-slate-700 outline-none focus:border-emerald-500"
        />
        <span className="font-bold uppercase tracking-wider text-slate-500">Đến:</span>
        <input
          type="date"
          value={denNgay}
          onChange={e => setDenNgay(e.target.value)}
          className="cursor-pointer rounded border border-slate-200 bg-white px-1.5 py-1 font-semibold text-slate-700 outline-none focus:border-emerald-500"
        />
        {(tuNgay || denNgay) && (
          <button
            type="button"
            onClick={() => { setTuNgay(''); setDenNgay(''); }}
            className="cursor-pointer rounded bg-rose-50 px-1.5 py-1 font-bold text-rose-600 transition-all hover:bg-rose-100"
          >
            Xóa lọc ngày
          </button>
        )}
        <button
          type="button"
          onClick={() => void xuatExcel()}
          disabled={dangXuat}
          className={`ml-auto flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white shadow-sm transition-all hover:bg-emerald-700 ${dangXuat ? 'cursor-not-allowed opacity-70' : ''}`}
          title="Kết xuất ý tưởng ra file Excel (.xlsx) — gồm danh sách chi tiết và 3 sheet tổng hợp"
        >
          {dangXuat
            ? <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            : <FileText className="h-3.5 w-3.5" />}
          {dangXuat ? 'Đang dựng file…' : 'Xuất Excel'}
        </button>
      </div>
    </div>
  );
};
