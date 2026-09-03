import React, { useMemo, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { khopTimKiem } from '@/lib/vietnamese';
import { NHOM_SO_BEN_RE, demTheoNhom, phanLoaiSoBenRe, type NhomSoBenRe } from '@/lib/ideaSoBenRe';
import { useSoBenRe, type DongSoBenReDayDu } from './useBenRe';

// Sổ Bén rễ — Giám đốc và Phòng TCTH cùng nhìn một sổ.
//
// Yêu cầu 03/09/2026: phân biệt được ý tưởng Bén rễ nào do Giám đốc duyệt (đường
// Chi nhánh) và ý tưởng nào do Trụ sở chính đồng ý (đường TSC); đồng thời thấy
// hồ sơ nào TCTH trả về, hồ sơ nào Giám đốc trả về. Trước đây thông tin này
// nằm rải ở ba màn (hàng chờ, quyết định gần đây, đối chiếu SMP), không có chỗ
// nào nhìn được toàn cảnh.

const SO_HIEN = 12;

const ngay = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : '—');

function DongMoTa({ d }: { d: DongSoBenReDayDu }) {
  const nhom = phanLoaiSoBenRe(d);
  switch (nhom) {
    case 'cong_nhan_gd':
      return <>Giám đốc duyệt ngày {ngay(d.duyetLuc)}{d.nguoiDuyet ? ` — ${d.nguoiDuyet}` : ''} · TCTH trình {ngay(d.trinhLuc)}</>;
    case 'cong_nhan_tsc':
      return <>Trụ sở chính đồng ý trên SMP{d.smpMa ? ` · mã ${d.smpMa}` : ''} · trạng thái SMP: {d.smpTrangThai ?? '—'}</>;
    case 'cong_nhan_ca_hai':
      return <>Giám đốc duyệt {ngay(d.duyetLuc)} và Trụ sở chính đồng ý{d.smpMa ? ` (mã ${d.smpMa})` : ''}</>;
    case 'cho_gd':
      return <>TCTH trình ngày {ngay(d.trinhLuc)}{d.nguoiTrinh ? ` — ${d.nguoiTrinh}` : ''} · đang chờ Giám đốc</>;
    case 'tcth_tra_ve':
    case 'gd_tra_ve':
      return <>Trả về ngày {ngay(d.traVeLuc)}: «{d.lyDoTraVe ?? '—'}» · đang chờ cán bộ bổ sung</>;
    case 'da_bo_sung':
      return <>Cán bộ bổ sung ngày {ngay(d.boSungLuc)} (lần {d.soLanBoSung}) · chờ TCTH chấm lại</>;
    case 'chua_dat':
      return <>Giám đốc kết luận chưa đạt ngày {ngay(d.duyetLuc)}{d.yKienGd ? ` — «${d.yKienGd}»` : ''}</>;
    case 'da_rut':
      return <>Đã rút khỏi hàng chờ / gỡ theo đường TSC</>;
  }
}

export const SoBenRePanel: React.FC = () => {
  const { soBenRe, isLoading } = useSoBenRe();
  const [nhomChon, setNhomChon] = useState<NhomSoBenRe | 'tat_ca'>('tat_ca');
  const [tim, setTim] = useState('');
  const [xemHet, setXemHet] = useState(false);

  const dem = useMemo(() => demTheoNhom(soBenRe), [soBenRe]);
  const tongCongNhan = dem.cong_nhan_gd + dem.cong_nhan_tsc + dem.cong_nhan_ca_hai;

  const loc = useMemo(() => {
    const theoNhom = nhomChon === 'tat_ca' ? soBenRe : soBenRe.filter(d => phanLoaiSoBenRe(d) === nhomChon);
    if (!tim.trim()) return theoNhom;
    return theoNhom.filter(d => khopTimKiem([d.title, d.proposer, d.phong].join(' '), tim));
  }, [soBenRe, nhomChon, tim]);
  const hien = xemHet ? loc : loc.slice(0, SO_HIEN);

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-1.5 font-black text-slate-800">
          <BookOpen className="h-4 w-4 text-[#005a9c]" />
          Sổ Bén rễ — theo nguồn công nhận
        </p>
        <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-2xs font-black text-slate-600">
          {soBenRe.length} hồ sơ
        </span>
      </div>

      {/* Dải tổng: câu trả lời trực tiếp cho «bao nhiêu do Giám đốc, bao nhiêu do TSC» */}
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-2xs font-black uppercase tracking-wider text-emerald-700">Giám đốc duyệt</p>
          <p className="text-2xl font-black text-emerald-800">{dem.cong_nhan_gd + dem.cong_nhan_ca_hai}</p>
          <p className="text-2xs text-emerald-700">đường Chi nhánh{dem.cong_nhan_ca_hai ? ` · ${dem.cong_nhan_ca_hai} cũng được TSC đồng ý` : ''}</p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
          <p className="text-2xs font-black uppercase tracking-wider text-sky-700">Trụ sở chính đồng ý</p>
          <p className="text-2xl font-black text-sky-800">{dem.cong_nhan_tsc + dem.cong_nhan_ca_hai}</p>
          <p className="text-2xs text-sky-700">đường TSC qua SMP</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-2xs font-black uppercase tracking-wider text-slate-500">Đã công nhận Bén rễ</p>
          <p className="text-2xl font-black text-slate-800">{tongCongNhan}</p>
          <p className="text-2xs text-slate-500">
            đang luân chuyển: {dem.cho_gd} chờ GĐ · {dem.tcth_tra_ve + dem.gd_tra_ve} trả về · {dem.da_bo_sung} đã bổ sung
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => { setNhomChon('tat_ca'); setXemHet(false); }}
          className={`rounded-lg px-3 py-1.5 text-2xs font-bold transition-colors ${
            nhomChon === 'tat_ca' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Tất cả <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5 font-black">{soBenRe.length}</span>
        </button>
        {NHOM_SO_BEN_RE.map(n => (
          <button
            key={n.ma}
            type="button"
            onClick={() => { setNhomChon(n.ma); setXemHet(false); }}
            className={`rounded-lg px-3 py-1.5 text-2xs font-bold transition-colors ${
              nhomChon === n.ma ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {n.ten}
            <span className={`ml-1 rounded-full px-1.5 py-0.5 font-black ${dem[n.ma] > 0 ? n.mau : 'bg-slate-200 text-slate-500'}`}>
              {dem[n.ma]}
            </span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={tim}
          onChange={e => setTim(e.target.value)}
          placeholder="Tìm theo tên ý tưởng, người đề xuất, phòng…"
          className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs font-medium outline-none focus:border-amber-500"
        />
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-xs italic text-slate-400">Đang tải sổ…</p>
      ) : hien.length === 0 ? (
        <p className="py-6 text-center text-xs italic text-slate-400">Không có hồ sơ nào trong nhóm này.</p>
      ) : (
        <div className="space-y-1.5">
          {hien.map(d => {
            const nhom = phanLoaiSoBenRe(d);
            const info = NHOM_SO_BEN_RE.find(n => n.ma === nhom)!;
            return (
              <div key={d.ideaId} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-2xs font-black ${info.mau}`}>{info.ten}</span>
                  {d.capDeXuat && (
                    <span className={`rounded-full px-2 py-0.5 text-2xs font-bold ${
                      d.capDeXuat === 'Đề xuất TSC' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'
                    }`}>{d.capDeXuat}</span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-2xs font-bold ${
                    d.coDemo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>{d.coDemo ? '🧪 Có demo' : 'Chưa có demo'}</span>
                  {d.trangThai === 'da_ghi_nhan' && (
                    <span className="ml-auto rounded-full bg-amber-50 px-2 py-0.5 text-2xs font-bold text-amber-700">
                      💰 {d.mucThuong.toLocaleString('vi-VN')}đ{d.ghiNhanKpi ? ' · KPI' : ''}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm font-bold leading-snug text-slate-800">{d.title}</p>
                <p className="text-2xs text-slate-500">{d.phong} · {d.proposer}</p>
                <p className="mt-1 text-2xs text-slate-600"><DongMoTa d={d} /></p>
              </div>
            );
          })}
          {!xemHet && loc.length > SO_HIEN && (
            <button
              type="button"
              onClick={() => setXemHet(true)}
              className="w-full cursor-pointer rounded-lg border border-dashed border-slate-300 py-2 text-xs font-bold text-slate-500 transition-colors hover:border-amber-400 hover:text-amber-600"
            >
              Xem thêm {loc.length - SO_HIEN} hồ sơ
            </button>
          )}
        </div>
      )}
    </div>
  );
};
