import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Globe, Info, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { khopTimKiem } from '@/lib/vietnamese';

// Theo dõi kết quả trên SMP (web Trụ sở chính).
//
// Quy chế mục 4, điều kiện cấp Bén rễ: "Ý tưởng có khả năng thử nghiệm tại Chi
// nhánh HOẶC những đề xuất/ý tưởng được TSC phê duyệt Đồng ý/Đồng ý một phần".
// Nên khi SMP đã ghi nhận thì theo quy định ý tưởng cũng được ghi nhận — và
// KHÔNG chiếm hạn mức tuần của Chi nhánh (chỉ đạo 08/2026).
//
// Cùng một ý tưởng được nhập ở CẢ HAI nơi, nên đây là màn đối chiếu: TCTH mở
// SMP xem kết quả rồi ghi lại vào đây, hệ thống tự lập dòng sổ Bén rễ.

const TRANG_THAI_SMP = [
  { id: 'chua_gui', label: 'Chưa gửi SMP', chip: 'bg-slate-100 text-slate-600' },
  { id: 'da_gui', label: 'Đã gửi, chờ TSC', chip: 'bg-sky-100 text-sky-700' },
  { id: 'dong_y', label: 'TSC đồng ý', chip: 'bg-emerald-100 text-emerald-700' },
  { id: 'dong_y_mot_phan', label: 'TSC đồng ý một phần', chip: 'bg-teal-100 text-teal-700' },
  { id: 'khong_dong_y', label: 'TSC không đồng ý', chip: 'bg-rose-100 text-rose-700' },
] as const;

type TrangThaiSmp = typeof TRANG_THAI_SMP[number]['id'];

const nhanTrangThai = (id: string) => TRANG_THAI_SMP.find(t => t.id === id) ?? TRANG_THAI_SMP[0];

interface DongSmp {
  id: string;
  title: string;
  proposer: string;
  departmentName: string;
  createdAt: string;
  smpMa: string | null;
  smpTrangThai: TrangThaiSmp;
  smpCapNhatLuc: string | null;
}

const smpKey = ['bhy-ideas-smp'];

function useDanhSachSmp() {
  const { data = [], isLoading } = useQuery({
    queryKey: smpKey,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<DongSmp[]> => {
      const { data: rows, error } = await supabase
        .from('portal_ideas')
        .select('id, title, proposer, department_name, created_at, smp_ma, smp_trang_thai, smp_cap_nhat_luc')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (rows ?? []).map(r => ({
        id: r.id,
        title: r.title,
        proposer: r.proposer,
        departmentName: r.department_name,
        createdAt: r.created_at,
        smpMa: r.smp_ma,
        smpTrangThai: (r.smp_trang_thai ?? 'chua_gui') as TrangThaiSmp,
        smpCapNhatLuc: r.smp_cap_nhat_luc,
      }));
    },
  });
  return { rows: data, isLoading };
}

export const SmpTracker: React.FC = () => {
  const queryClient = useQueryClient();
  const { rows, isLoading } = useDanhSachSmp();
  const [tim, setTim] = useState('');
  const [chiChuaGui, setChiChuaGui] = useState(false);
  const [dangLuu, setDangLuu] = useState<string | null>(null);

  const hienThi = useMemo(() => {
    const theoLoc = chiChuaGui ? rows.filter(r => r.smpTrangThai === 'chua_gui') : rows;
    if (!tim.trim()) return theoLoc.slice(0, 60);
    return theoLoc
      .filter(r => khopTimKiem([r.title, r.proposer, r.departmentName, r.smpMa ?? ''].join(' '), tim))
      .slice(0, 60);
  }, [rows, tim, chiChuaGui]);

  const daGhiNhan = rows.filter(r => r.smpTrangThai === 'dong_y' || r.smpTrangThai === 'dong_y_mot_phan').length;

  const luu = async (dong: DongSmp, trangThai: TrangThaiSmp, ma: string) => {
    setDangLuu(dong.id);
    try {
      const { data, error } = await supabase.rpc('bhy_ideas_cap_nhat_smp', {
        _idea_id: dong.id,
        _smp_ma: ma,
        _smp_trang_thai: trangThai,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      const kq = data as { ghi_nhan_ben_re?: boolean; thu_hoi_ben_re?: boolean } | null;
      if (kq?.ghi_nhan_ben_re) {
        toast.success('Đã lưu — TSC phê duyệt nên ý tưởng được ghi nhận cấp Bén rễ theo quy chế');
      } else if (kq?.thu_hoi_ben_re) {
        // TSC không còn đồng ý thì công nhận theo đường TSC cũng rút — nói rõ vì
        // đây là gỡ KPI và tiền, không phải chỉ đổi một chữ trạng thái
        toast.warning('Đã lưu — TSC không còn đồng ý nên ghi nhận Bén rễ, KPI và tiền thưởng theo đường TSC đã được gỡ; cấp độ ý tưởng trả về trước đó');
      } else {
        toast.success('Đã lưu trạng thái SMP');
      }
      queryClient.invalidateQueries({ queryKey: smpKey });
      queryClient.invalidateQueries({ queryKey: ['one-portal-ideas'] });
      queryClient.invalidateQueries({ queryKey: ['idea-awards'] });
    } finally {
      setDangLuu(null);
    }
  };

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-1.5 font-black text-slate-800">
          <Globe className="h-4 w-4 text-sky-600" />
          Đối chiếu kết quả trên SMP
        </p>
        <span className="ml-auto rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700">
          {daGhiNhan} ý tưởng được TSC phê duyệt
        </span>
      </div>

      <div className="flex gap-2 rounded-lg border border-sky-200 bg-sky-50 p-2.5 text-xs text-sky-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Cùng một ý tưởng được nhập ở <b>cả hai nơi</b>: cán bộ đề xuất lên SMP thì cũng nhập ở
          BHY Ideas. Ghi lại kết quả TSC vào đây, hệ thống tự lập dòng ghi nhận cấp <b>Bén rễ</b> theo
          quy chế — <b>không chiếm hạn mức tuần</b> của phòng, và không trả trùng nếu Chi nhánh đã duyệt.
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={tim}
            onChange={e => setTim(e.target.value)}
            placeholder="Tìm theo tên ý tưởng, người đề xuất, mã SMP…"
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs font-medium outline-none focus:border-amber-500"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-slate-600">
          <input
            type="checkbox"
            checked={chiChuaGui}
            onChange={e => setChiChuaGui(e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer accent-sky-600"
          />
          Chỉ hiện ý tưởng chưa gửi SMP
        </label>
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-xs italic text-slate-400">Đang tải danh sách…</p>
      ) : hienThi.length === 0 ? (
        <p className="py-6 text-center text-xs italic text-slate-400">Không có ý tưởng nào khớp.</p>
      ) : (
        <div className="space-y-1.5">
          {hienThi.map(d => (
            <DongCapNhat key={d.id} dong={d} dangLuu={dangLuu === d.id} onLuu={luu} />
          ))}
          {hienThi.length === 60 && (
            <p className="pt-1 text-center text-xs italic text-slate-400">
              Hiện 60 ý tưởng gần nhất — dùng ô tìm kiếm để thu hẹp.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const DongCapNhat: React.FC<{
  dong: DongSmp;
  dangLuu: boolean;
  onLuu: (dong: DongSmp, trangThai: TrangThaiSmp, ma: string) => Promise<void>;
}> = ({ dong, dangLuu, onLuu }) => {
  const [ma, setMa] = useState(dong.smpMa ?? '');
  const [trangThai, setTrangThai] = useState<TrangThaiSmp>(dong.smpTrangThai);
  const coThayDoi = ma !== (dong.smpMa ?? '') || trangThai !== dong.smpTrangThai;
  const nhan = nhanTrangThai(dong.smpTrangThai);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5">
      <div className="min-w-[180px] flex-1">
        <p className="font-bold leading-snug text-slate-700">{dong.title}</p>
        <p className="text-xs text-slate-500">
          {dong.departmentName} · {dong.proposer}
          {dong.smpCapNhatLuc && ` · cập nhật ${new Date(dong.smpCapNhatLuc).toLocaleDateString('vi-VN')}`}
        </p>
      </div>

      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${nhan.chip}`}>{nhan.label}</span>

      <input
        type="text"
        value={ma}
        onChange={e => setMa(e.target.value)}
        placeholder="Mã SMP"
        className="w-28 rounded-lg border border-slate-200 p-1.5 text-xs outline-none focus:border-amber-500"
      />
      <select
        value={trangThai}
        onChange={e => setTrangThai(e.target.value as TrangThaiSmp)}
        className="rounded-lg border border-slate-200 p-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
      >
        {TRANG_THAI_SMP.map(t => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
      </select>
      <button
        type="button"
        disabled={!coThayDoi || dangLuu}
        onClick={() => void onLuu(dong, trangThai, ma)}
        className="cursor-pointer rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-black text-white transition-all hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {dangLuu ? 'Đang lưu…' : 'Lưu'}
      </button>
    </div>
  );
};
