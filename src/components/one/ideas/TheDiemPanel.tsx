import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, BarChart3, FileSpreadsheet, RefreshCw, Search } from 'lucide-react';
import { IDEA_DEV_LEVELS, IDEA_DEV_LEVEL_EMOJI } from '@/data/one/ideasConfig';
import { NHOM_VI_TRI_LABELS, type NhomViTriKpi } from '@/lib/ideaKpi';
import {
  NHOM_VI_TRI_NGAN,
  tinhPhongTheDiem,
  tinhTheDiem,
  tomTatTheDiem,
  type DongTheDiem,
} from '@/lib/ideaTheDiem';
import { khopTimKiem } from '@/lib/vietnamese';
import { useTongHopTheDiem } from './useTongHopTheDiem';
import { downloadTheDiemExcel } from './theDiemExcel';

// Màn «Thẻ điểm ĐMST» — TCTH và Ban Giám đốc xem toàn chi nhánh theo phòng và
// theo cán bộ (chốt 17/09/2026). Máy chủ chỉ đếm; công thức ở src/lib/ideaKpi.ts
// + ideaTheDiem.ts nên số ở đây và số cán bộ thấy ở trang chủ là MỘT nguồn.

const CAC_NHOM: NhomViTriKpi[] = ['tp_dau_moi', 'tp_pgd', 'pho_phong', 'can_bo', 'ban_giam_doc'];

function OSo({ so, nhan, lop }: { so: number | string; nhan: string; lop: string }) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${lop}`}>
      <div className="text-2xl font-black tabular-nums leading-none">{so}</div>
      <div className="mt-1 text-2xs font-bold uppercase tracking-wide opacity-80">{nhan}</div>
    </div>
  );
}

function KetQuaChip({ d }: { d: DongTheDiem }) {
  if (!d.ketQua.coGiaoChiTieu) {
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-bold text-slate-500">Không giao</span>;
  }
  return d.ketQua.dat
    ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-2xs font-black text-emerald-800">Đạt {d.ketQua.phanTramHoanThanh}%</span>
    : <span className="rounded-full bg-orange-100 px-2 py-0.5 text-2xs font-black text-orange-800">Chưa đạt</span>;
}

export const TheDiemPanel: React.FC = () => {
  const { tongHop, isLoading, isFetching, error, refetch } = useTongHopTheDiem();
  const [locPhong, setLocPhong] = useState<'all' | string>('all');
  const [locNhom, setLocNhom] = useState<'all' | NhomViTriKpi>('all');
  const [tim, setTim] = useState('');
  const [dangXuat, setDangXuat] = useState(false);

  const dong = useMemo(() => (tongHop ? tinhTheDiem(tongHop) : []), [tongHop]);
  const phongRows = useMemo(() => (tongHop ? tongHop.phong.map(tinhPhongTheDiem) : []), [tongHop]);
  const tomTat = useMemo(() => (tongHop ? tomTatTheDiem(dong, tongHop.phong) : null), [dong, tongHop]);

  const dongLoc = dong.filter(d =>
    (locPhong === 'all' || d.canBo.phongId === locPhong)
    && (locNhom === 'all' || d.nhom === locNhom)
    && (!tim.trim() || khopTimKiem(`${d.canBo.hoTen} ${d.canBo.chucDanh} ${d.canBo.tenPhong}`, tim)));

  const xuatExcel = async () => {
    if (!tongHop) return;
    setDangXuat(true);
    try {
      await downloadTheDiemExcel(tongHop);
      toast.success(`Đã kết xuất thẻ điểm của ${tongHop.canBo.length} cán bộ ra Excel`);
    } catch {
      toast.error('Không dựng được file Excel. Vui lòng thử lại.');
    } finally {
      setDangXuat(false);
    }
  };

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        Không đọc được thẻ điểm: {error.message}
      </div>
    );
  }
  if (isLoading || !tongHop || !tomTat) {
    return <p className="py-10 text-center text-sm text-slate-500">Đang tổng hợp toàn chi nhánh…</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-black text-slate-800">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            Thẻ điểm Đổi mới sáng tạo — cả năm 2026
          </h3>
          <p className="mt-0.5 text-2xs text-slate-500">
            Tính lúc {tongHop.tinhLuc ? new Date(tongHop.tinhLuc).toLocaleString('vi-VN') : '—'} · số ý tưởng ghi nhận
            lũy kế theo từng cấp; điểm quy đổi 1 Vươn cành = 2 Bén rễ, 1 Lan tỏa = 3 Bén rễ.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Tính lại
          </button>
          <button
            type="button"
            onClick={xuatExcel}
            disabled={dangXuat}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> {dangXuat ? 'Đang dựng…' : 'Kết xuất Excel'}
          </button>
        </div>
      </div>

      {!tongHop.dangApKpi && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            KPI Đổi mới sáng tạo đang <b>tạm dừng</b> — số liệu dưới đây để tham khảo và đối chiếu,
            chưa dùng để nhập thẻ điểm.
          </span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <OSo so={tomTat.tongYTuong} nhan="ý tưởng toàn CN" lop="border-amber-200 bg-amber-50 text-amber-900" />
        <OSo so={`${tomTat.soCoYTuong}/${tomTat.soCanBo}`} nhan="cán bộ đã có ý tưởng" lop="border-sky-200 bg-sky-50 text-sky-900" />
        <OSo so={`${tomTat.soDat}/${tomTat.soDuocGiao}`} nhan="đạt chỉ tiêu / được giao" lop="border-emerald-200 bg-emerald-50 text-emerald-900" />
        <OSo so={phongRows.filter(r => r.datDieuKienPhong).length} nhan="phòng đủ điều kiện cần" lop="border-indigo-200 bg-indigo-50 text-indigo-900" />
      </div>

      {/* Theo phòng */}
      <div>
        <h4 className="mb-2 text-sm font-black text-slate-700">Theo phòng</h4>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-2xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-2 py-2 text-left">Phòng</th>
                <th className="px-2 py-2 text-right" title="Cán bộ đang làm việc, trừ khoán gọn — mẫu số chỉ tiêu Bén rễ">Cán bộ</th>
                {IDEA_DEV_LEVELS.map(c => (
                  <th key={c} className="px-2 py-2 text-right" title={`${c} — lũy kế`}>{IDEA_DEV_LEVEL_EMOJI[c]} {c}</th>
                ))}
                <th className="px-2 py-2 text-right">Quy đổi</th>
                <th className="px-2 py-2 text-right" title="Chỉ tiêu Bén rễ quy đổi của Trưởng phòng (PGD: 2 × số cán bộ)">Chỉ tiêu TP</th>
                <th className="px-2 py-2 text-left">Điều kiện phòng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {phongRows.map(r => (
                <tr key={r.phong.phongId} className="hover:bg-slate-50">
                  <td className="px-2 py-1.5 font-bold text-slate-800">{r.phong.ten}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{r.phong.soCanBo}</td>
                  {IDEA_DEV_LEVELS.map(c => (
                    <td key={c} className="px-2 py-1.5 text-right tabular-nums">{r.luyKe[c]}</td>
                  ))}
                  <td className="px-2 py-1.5 text-right font-bold tabular-nums">{r.diemQuyDoi}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {r.chiTieuBenRe === null ? '—' : (
                      <span title={`${r.diemQuyDoi}/${r.chiTieuBenRe} = ${r.tyLeBenRe}%`}>
                        {r.chiTieuBenRe} <span className={`text-2xs ${(r.tyLeBenRe ?? 0) >= 90 ? 'text-emerald-700' : 'text-orange-700'}`}>({r.tyLeBenRe}%)</span>
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {r.datDieuKienPhong === null ? <span className="text-slate-400">—</span> : (
                      <span className={`rounded-full px-2 py-0.5 text-2xs font-bold ${r.datDieuKienPhong ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'}`}>
                        {r.datDieuKienPhong ? 'Đạt' : 'Chưa'} · {r.moTaDieuKienPhong}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Theo cán bộ */}
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-black text-slate-700">Theo cán bộ</h4>
          <span className="text-2xs text-slate-500">({dongLoc.length}/{dong.length})</span>
          <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={tim}
                onChange={e => setTim(e.target.value)}
                placeholder="Tìm tên / chức danh…"
                className="w-44 rounded-lg border border-slate-200 bg-white py-1.5 pl-7 pr-2 text-xs outline-none focus:border-indigo-500"
              />
            </div>
            <select
              value={locPhong}
              onChange={e => setLocPhong(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-bold text-slate-700 outline-none"
            >
              <option value="all">Mọi phòng</option>
              {tongHop.phong.map(p => <option key={p.phongId} value={p.phongId}>{p.ten}</option>)}
            </select>
            <select
              value={locNhom}
              onChange={e => setLocNhom(e.target.value as 'all' | NhomViTriKpi)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-bold text-slate-700 outline-none"
            >
              <option value="all">Mọi nhóm</option>
              {CAC_NHOM.map(n => <option key={n} value={n}>{NHOM_VI_TRI_NGAN[n]}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-2xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-2 py-2 text-left">Cán bộ</th>
                <th className="px-2 py-2 text-left">Chức danh · nhóm</th>
                {IDEA_DEV_LEVELS.map(c => (
                  <th key={c} className="px-2 py-2 text-right" title={`${c} — lũy kế`}>{IDEA_DEV_LEVEL_EMOJI[c]}</th>
                ))}
                <th className="px-2 py-2 text-right" title="Điểm quy đổi Bén rễ">Quy đổi</th>
                <th className="px-2 py-2 text-right">Chỉ tiêu</th>
                <th className="px-2 py-2 text-left">Kết quả</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dongLoc.map(d => (
                <tr key={d.canBo.profileId} className="align-top hover:bg-slate-50">
                  <td className="px-2 py-1.5">
                    <div className="font-bold text-slate-800">{d.canBo.hoTen}</div>
                    <div className="text-2xs text-slate-500">{d.canBo.tenPhong}</div>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="text-slate-700">{d.canBo.chucDanh || '—'}</div>
                    <div className="text-2xs text-slate-500" title={NHOM_VI_TRI_LABELS[d.nhom]}>
                      {NHOM_VI_TRI_NGAN[d.nhom]}
                      {d.nhomApCongThuc !== d.nhom && ` · tạm tính như ${NHOM_VI_TRI_NGAN[d.nhomApCongThuc]}`}
                    </div>
                  </td>
                  {IDEA_DEV_LEVELS.map(c => (
                    <td key={c} className={`px-2 py-1.5 text-right tabular-nums ${d.luyKe[c] === 0 ? 'text-slate-300' : ''}`}>{d.luyKe[c]}</td>
                  ))}
                  <td className="px-2 py-1.5 text-right font-bold tabular-nums">{d.diemQuyDoi}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {d.chiTieuBenRe !== null ? d.chiTieuBenRe : d.nhomApCongThuc === 'can_bo' ? '12 ƯM / 6 BR' : '—'}
                  </td>
                  <td className="px-2 py-1.5">
                    <KetQuaChip d={d} />
                    {(d.ketQua.conThieu.length > 0 || d.ketQua.coGiaoChiTieu) && (
                      <ul className="mt-1 space-y-0.5 text-2xs text-slate-500">
                        {(d.ketQua.conThieu.length > 0 ? d.ketQua.conThieu : d.ketQua.dienGiai).map(t => <li key={t}>{t}</li>)}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
              {dongLoc.length === 0 && (
                <tr><td colSpan={9} className="px-2 py-6 text-center text-slate-400">Không có cán bộ nào khớp bộ lọc.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-2xs leading-relaxed text-slate-600">
        <b>Cách tính (chốt 17/09/2026):</b> kỳ tính cả năm 2026, mọi ý tưởng đã nhập. Ý tưởng của một
        người gồm ý tưởng tự gửi và ý tưởng có tên trong ô Người đề xuất — đồng đề xuất mỗi người tính
        trọn. Ghi nhận lũy kế: ý tưởng lên Vươn cành vẫn tính đã đạt Bén rễ. Mẫu số của Trưởng phòng là
        số cán bộ đang làm việc của phòng (trừ khoán gọn); Phó phòng và Kiểm soát viên tạm tính như
        Trưởng phòng đơn vị mình cho tới khi có phân công cán bộ phụ trách. Ban Giám đốc không giao chỉ tiêu.
      </div>
    </div>
  );
};
