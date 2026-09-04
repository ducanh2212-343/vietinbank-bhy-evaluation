import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, Archive, ArrowRightLeft, BookOpen, Boxes, Building2, CheckCircle2,
  Loader2, PackagePlus, Search, ShieldCheck, Star, Undo2, Users, X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  daiBanGiaoGuiDuoc, formatRanges, phanLoaiDaiBanGiao,
  QUARTERLY_ALLOCATION, TOTAL_ALLOCATED_2026,
} from './starSerial';
import {
  useAwardablePeople, useProfileNames, useStarDepartments, useStarHandovers,
  useStarOps, useStarSerials, useStarSubUnits,
  type KetQuaDoiSoat, type StaffOption,
} from './useStarSerials';
import { useStarRecords } from './useStarRecords';
import { laLechCanXuLy, type LoaiLech } from './starDepartments';

/** Nhãn hiển thị cho từng loại lệch giữa danh bạ và chương trình Sao */
const NHAN_LECH: Record<LoaiLech, { tieuDe: string; mau: string }> = {
  'chua-co-nhan': { tieuDe: 'Phòng mới chưa có nhãn Sao', mau: 'bg-red-100 text-red-700 border-red-200' },
  'nhan-trung-phong': { tieuDe: 'Hai phòng chung một nhãn', mau: 'bg-red-100 text-red-700 border-red-200' },
  'nhan-khong-con-phong': { tieuDe: 'Nhãn cũ không còn phòng', mau: 'bg-red-100 text-red-700 border-red-200' },
  'phong-ngung-dung': { tieuDe: 'Phòng đã ngừng sử dụng', mau: 'bg-amber-100 text-amber-800 border-amber-200' },
  'lech-bac-phan-bo': { tieuDe: 'Quân số đổi bậc phân bổ', mau: 'bg-blue-100 text-blue-800 border-blue-200' },
};

// KHU QUẢN LÝ SAO (Phòng TCTH) — số hóa mục 6 văn bản triển khai:
// TCTH in sao đóng số (khai báo lô) → bàn giao cho BGĐ/Trưởng phòng trước mùng 5
// tháng đầu quý → lãnh đạo tặng dần từ số mình giữ → TCTH đối soát tồn.
//
// Chỉ hiển thị cho tcth_admin / system_admin — trùng điều kiện kiểm quyền trong
// các RPC phía CSDL, nên giao diện này không mở thêm quyền nào.

const normalize = (s: string): string =>
  s.trim().toLowerCase().replace(/\s+/g, ' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

const currentQuarter = (): string => {
  const now = new Date();
  return `Q${Math.floor(now.getMonth() / 3) + 1}/${now.getFullYear()}`;
};

const QUARTER_OPTIONS = ['Q1/2026', 'Q2/2026', 'Q3/2026', 'Q4/2026'];

const STATUS_META: Record<string, { label: string; chip: string }> = {
  in_stock: { label: 'Tồn kho TCTH', chip: 'bg-white text-slate-600 border-slate-300' },
  handed_over: { label: 'Lãnh đạo đang giữ', chip: 'bg-blue-100 text-blue-800 border-blue-300' },
  awarded: { label: 'Đã tặng', chip: 'bg-amber-400 text-white border-amber-500' },
  void: { label: 'Đã hủy', chip: 'bg-red-100 text-red-500 border-red-200 line-through' },
};

export const StarManagementPanel: React.FC = () => {
  const { roles } = useAuth();
  const isTcthAdmin = roles.includes('tcth_admin') || roles.includes('system_admin');

  const { rows, stats, stockPool, isLoading } = useStarSerials();
  const { handovers } = useStarHandovers();
  const { declareBatch, handover, revokeHandover, voidSerial, doiSoatSoSao } = useStarOps();
  const [doiSoat, setDoiSoat] = useState<KetQuaDoiSoat | null>(null);
  const { people } = useAwardablePeople(isTcthAdmin);
  const { records } = useStarRecords();

  // Đối soát danh mục phòng: danh bạ đổi (đổi tên / ngừng dùng / xoá / thêm) mà
  // chương trình Sao không biết thì bảng thi đua lệch âm thầm — khối dưới đây
  // báo ngay thay vì để TCTH tự phát hiện lúc tổng hợp quý.
  const nhanTrenPhieu = useMemo(
    () => [...new Set(records.map((r) => r.department).filter(Boolean))],
    [records],
  );
  // Tổ / tập thể nhỏ: danh mục riêng, không phải phòng — truyền nhãn vào bộ dò
  // lệch để "Tổ FDI" trên phiếu không bị coi là phòng bị xoá. Chờ danh mục tải
  // xong mới dò để không nháy cảnh báo giả.
  const {
    rows: toRows, toDanhMuc, isLoading: toLoading, addSubUnit, toggleSubUnit,
  } = useStarSubUnits();
  const nhanToDanhMuc = useMemo(() => toDanhMuc.map((t) => t.nhan), [toDanhMuc]);
  const { danhSachPhong, lechDanhMuc, nhanDangDung } = useStarDepartments(
    toLoading ? [] : nhanTrenPhieu,
    nhanToDanhMuc,
  );
  const [toMoi, setToMoi] = useState('');
  const [toMoiPhongCha, setToMoiPhongCha] = useState('');
  // Lệch làm sai dữ liệu (phải xử lý) tách khỏi chênh quân số (chỉ tham khảo) —
  // chi nhánh giữ hạn mức cũ cả năm là hợp lệ, không nên báo đỏ mãi.
  const lechCanXuLy = useMemo(() => lechDanhMuc.filter(laLechCanXuLy), [lechDanhMuc]);
  const chenhQuanSo = useMemo(() => lechDanhMuc.filter((l) => !laLechCanXuLy(l)), [lechDanhMuc]);


  // Khai báo lô
  const [batchFrom, setBatchFrom] = useState('');
  const [batchTo, setBatchTo] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  // Bàn giao
  const [holder, setHolder] = useState<StaffOption | null>(null);
  const [holderQuery, setHolderQuery] = useState('');
  const [hoFrom, setHoFrom] = useState('');
  const [hoTo, setHoTo] = useState('');
  const [quarter, setQuarter] = useState(currentQuarter());

  // Đã bàn giao bao nhiêu sao trong quý đang chọn, gộp theo từng lãnh đạo —
  // chỗ để TCTH đối chiếu với mức phân bổ mình đang áp (dù cũ hay mới).
  const daGiaoTrongQuy = useMemo(() => {
    const map = new Map<string, number>();
    handovers
      .filter((h) => !h.revokedAt && h.quarter === quarter)
      .forEach((h) => {
        map.set(h.holderProfileId,
          (map.get(h.holderProfileId) ?? 0) + (h.serialTo - h.serialFrom + 1));
      });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [handovers, quarter]);
  const tongDaGiaoTrongQuy = useMemo(
    () => daGiaoTrongQuy.reduce((t, [, n]) => t + n, 0),
    [daGiaoTrongQuy],
  );

  // Sổ serial
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const holderIds = useMemo(
    () => [...new Set(handovers.map((h) => h.holderProfileId))],
    [handovers],
  );
  const holderNames = useProfileNames(holderIds, isTcthAdmin);

  const holderMatches = useMemo(() => {
    const q = normalize(holderQuery);
    if (!q) return [];
    return people.filter((p) => normalize(p.fullName).includes(q)).slice(0, 8);
  }, [people, holderQuery]);

  // Tiến độ từng đợt bàn giao: còn giữ / đã tặng (đếm theo handover_id trong sổ)
  const handoverProgress = useMemo(() => {
    const map = new Map<string, { holding: number; awarded: number }>();
    rows.forEach((r) => {
      if (!r.handoverId) return;
      const p = map.get(r.handoverId) ?? { holding: 0, awarded: 0 };
      if (r.status === 'handed_over') p.holding += 1;
      if (r.status === 'awarded') p.awarded += 1;
      map.set(r.handoverId, p);
    });
    return map;
  }, [rows]);

  const visibleRows = useMemo(
    () => (statusFilter === 'all' ? rows : rows.filter((r) => r.status === statusFilter)),
    [rows, statusFilter],
  );

  // Bản chạy trên trình duyệt của luật phân loại trong RPC handover_stars, để TCTH
  // thấy trước khi bấm. BÀN GIAO GIỮA KỲ: dải TCTH thực tế đã đưa cho lãnh đạo luôn
  // lẫn cả số đã tặng — chặn cứng cả dải bắt họ tự dò từng đoạn trống, rất nặng.
  const nguoiTangTheoSo = useMemo(() => {
    const m = new Map<number, string>();
    const phieuTheoId = new Map(records.map((r) => [r.id, r.sender]));
    rows.forEach((r) => {
      if (r.status !== 'awarded' || !r.recordId) return;
      const sender = phieuTheoId.get(r.recordId);
      if (sender) m.set(r.serialNo, sender);
    });
    return m;
  }, [rows, records]);

  const phanLoai = useMemo(() => {
    const from = parseInt(hoFrom, 10);
    const to = parseInt(hoTo, 10);
    if (!holder || !Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to < from) return null;
    if (to - from >= 500) return null;
    return phanLoaiDaiBanGiao(from, to, rows, nguoiTangTheoSo, holder.fullName, holder.profileId);
  }, [hoFrom, hoTo, holder, rows, nguoiTangTheoSo]);
  const quaDai = useMemo(() => {
    const from = parseInt(hoFrom, 10);
    const to = parseInt(hoTo, 10);
    return Number.isFinite(from) && Number.isFinite(to) && to - from >= 500;
  }, [hoFrom, hoTo]);
  const guiDuoc = phanLoai !== null && daiBanGiaoGuiDuoc(phanLoai);

  if (!isTcthAdmin) return null;

  const runBatch = async () => {
    const from = parseInt(batchFrom, 10);
    const to = parseInt(batchTo, 10);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return;
    setBusy('batch');
    const ok = await declareBatch(from, to, `Khai báo lô in ${from}–${to}`);
    setBusy(null);
    if (ok) { setBatchFrom(''); setBatchTo(''); }
  };

  const runHandover = async () => {
    const from = parseInt(hoFrom, 10);
    const to = parseInt(hoTo, 10);
    if (!holder || !Number.isFinite(from) || !Number.isFinite(to)) return;
    setBusy('handover');
    const ok = await handover(holder.profileId, from, to, quarter);
    setBusy(null);
    if (ok) { setHoFrom(''); setHoTo(''); }
  };

  const runDoiSoat = async (sua: boolean) => {
    setBusy('doi-soat');
    const kq = await doiSoatSoSao(sua);
    setBusy(null);
    if (kq) setDoiSoat(kq);
  };

  const runAddSubUnit = async () => {
    setBusy('sub-unit');
    const ok = await addSubUnit(toMoi, toMoiPhongCha || null);
    setBusy(null);
    if (ok) { setToMoi(''); setToMoiPhongCha(''); }
  };

  const askVoid = async (serialNo: number) => {
    const reason = window.prompt(`Hủy số ${serialNo} (sao hỏng/in lỗi)? Nhập lý do hủy:`);
    if (reason === null) return;
    await voidSerial(serialNo, `Hủy: ${reason || 'không ghi lý do'}`);
  };

  return (
    <div className="bg-white p-6 sm:p-7 rounded-3xl border border-blue-200 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 mb-5">
        <div className="flex items-center gap-2 text-slate-800 font-black text-sm uppercase tracking-wide">
          <Boxes className="w-5 h-5 text-brand-navy" />
          <span>Quản Lý Sao & Bàn Giao (Phòng TCTH)</span>
        </div>
        <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-blue-100 text-brand-navy">
          Sổ sao theo số serial
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-500 text-xs py-6"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải sổ sao…</div>
      ) : (
        <div className="space-y-6">
          {/* THẺ THỐNG KÊ TỒN */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-center">
            {[
              { label: 'Đã khai báo', value: stats.total, cls: 'text-brand-navy' },
              { label: 'Tồn kho TCTH', value: stats.inStock, cls: 'text-slate-700' },
              { label: 'Lãnh đạo đang giữ', value: stats.handedOver, cls: 'text-blue-700' },
              { label: 'Đã tặng', value: stats.awarded, cls: 'text-amber-600' },
              { label: 'Đã hủy', value: stats.voided, cls: 'text-red-500' },
            ].map((c) => (
              <div key={c.label} className="p-3 rounded-2xl border border-slate-100 bg-slate-50/60">
                <span className={`block text-xl font-black ${c.cls}`}>{c.value}</span>
                <span className="text-[10px] font-bold text-slate-500">{c.label}</span>
              </div>
            ))}
          </div>

          {/* ĐỐI SOÁT KHO THẬT */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-[11px] leading-relaxed text-slate-700">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800">Đối soát tồn kho:</strong> hệ thống đang ghi
                nhận <strong>{stats.inStock} số tồn</strong> ({formatRanges(stockPool) || '—'}).
                Hãy đếm sao thật trong tủ Phòng TCTH: nếu ít hơn, phần chênh là sao đã phát mà
                chưa có phiếu (bổ sung phiếu qua form tặng / nhập hộ); sao hỏng thì bấm vào số
                để hủy. Tổng phân bổ theo văn bản: {TOTAL_ALLOCATED_2026} sao/năm.
              </div>
            </div>
          </div>

          {/* ĐỐI SOÁT DANH MỤC PHÒNG so với danh bạ */}
          <div className="rounded-2xl border border-slate-200 p-4">
            <h6 className="flex items-center gap-1.5 font-black text-xs text-slate-800 uppercase mb-3">
              <Building2 className="w-4 h-4 text-brand-navy" /> Đối soát danh mục phòng với danh bạ
            </h6>

            {lechCanXuLy.length === 0 ? (
              <p className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Danh mục phòng của chương trình Sao đang khớp danh bạ ({danhSachPhong.length} phòng).
              </p>
            ) : (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-[11px] text-amber-800 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {lechCanXuLy.length} điểm cần xử lý — danh bạ và chương trình Sao đang lệch nhau:
                </p>
                {lechCanXuLy.map((l) => (
                  <div key={`${l.loai}-${l.ten}`} className="flex flex-wrap items-start gap-2 text-[11px] p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className={`px-2 py-0.5 rounded-md border font-black uppercase text-[9px] shrink-0 ${NHAN_LECH[l.loai].mau}`}>
                      {NHAN_LECH[l.loai].tieuDe}
                    </span>
                    <span className="font-bold text-slate-800 shrink-0">{l.ten}</span>
                    <span className="text-slate-600 flex-1 min-w-40">{l.moTa}</span>
                  </div>
                ))}
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Phòng ban sửa ở màn <strong>Tổ chức &amp; Phân quyền → Quản lý Phòng ban &amp; Chức danh</strong>.
                  Nếu là phòng đổi tên, các phiếu Sao cũ cần được quy về nhãn mới thì bảng thi đua mới gộp làm một dòng.
                </p>
              </div>
            )}

            {chenhQuanSo.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                <p className="text-[10px] font-black uppercase text-slate-500">
                  Chênh quân số so với văn bản — tham khảo, không phải lỗi
                </p>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Hạn mức sao/quý giao từ đầu năm theo văn bản. <strong>Giữ nguyên mức cũ cả năm là
                  hợp lệ</strong> — hệ thống không chặn bàn giao theo mức nào. Các dòng dưới chỉ để
                  cân nhắc khi giao quý sau.
                </p>
                {chenhQuanSo.map((l) => (
                  <div key={`${l.loai}-${l.ten}`} className="flex flex-wrap items-start gap-2 text-[11px] p-2 rounded-lg bg-blue-50/60 border border-blue-100">
                    <span className="font-bold text-slate-800 shrink-0">{l.ten}</span>
                    <span className="text-slate-600 flex-1 min-w-40">{l.moTa}</span>
                  </div>
                ))}
              </div>
            )}
            <details className="mt-3">
              <summary className="text-[10px] font-black uppercase text-slate-500 cursor-pointer">
                Xem bảng ánh xạ phòng ({danhSachPhong.length})
              </summary>
              <div className="overflow-x-auto mt-2 border border-slate-100 rounded-xl">
                <table className="w-full text-[11px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-black">
                      <th className="p-2">Nhãn trên phiếu Sao</th>
                      <th className="p-2">Tên trong danh bạ</th>
                      <th className="p-2 text-center">Quân số</th>
                      <th className="p-2 text-center">Sao phân bổ/năm</th>
                      <th className="p-2 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {danhSachPhong.map((p) => (
                      <tr key={p.nhan} className={`border-b border-slate-50 ${p.dangDung ? '' : 'opacity-50'}`}>
                        <td className="p-2 font-bold text-slate-800">{p.nhan}</td>
                        <td className="p-2 text-slate-600">{p.tenDanhBa}</td>
                        <td className="p-2 text-center">{p.quanSo}</td>
                        <td className="p-2 text-center font-bold text-brand-navy">{p.hanMucNam ?? '—'}</td>
                        <td className="p-2 text-center text-[10px] font-black uppercase">
                          {p.dangDung ? <span className="text-emerald-600">Đang dùng</span> : <span className="text-slate-400">Ngừng dùng</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>

          {/* ĐỐI SOÁT SỔ SAO ↔ PHIẾU */}
          <div className="rounded-2xl border border-slate-200 p-4">
            <h6 className="flex items-center gap-1.5 font-black text-xs text-slate-800 uppercase mb-1">
              <ShieldCheck className="w-4 h-4 text-brand-navy" /> Đối soát sổ sao với phiếu
            </h6>
            <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
              Kiểm tra mỗi số serial trên phiếu có được sổ đánh dấu đúng không. Bấm
              <strong> Kiểm tra</strong> để xem trước, chỉ khi thấy đúng mới bấm <strong>Nối lại</strong>.
              Số bị hai phiếu cùng dùng thì hệ thống không tự sửa — phải tra sao vật lý mới chốt được.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void runDoiSoat(false)}
                disabled={busy === 'doi-soat'}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-black transition-all cursor-pointer disabled:opacity-50"
              >
                {busy === 'doi-soat' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                Kiểm tra
              </button>
              {doiSoat && (doiSoat.thieu_lien_ket.length > 0 || doiSoat.mo_coi.length > 0) && (
                <button
                  type="button"
                  onClick={() => void runDoiSoat(true)}
                  disabled={busy === 'doi-soat'}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-navy text-white text-[11px] font-black hover:bg-blue-800 transition-all cursor-pointer disabled:opacity-50"
                >
                  Nối lại {doiSoat.thieu_lien_ket.length + doiSoat.mo_coi.length} số
                </button>
              )}
            </div>

            {doiSoat && (
              <div className="mt-3 space-y-1.5 text-[11px]">
                {doiSoat.thieu_lien_ket.length === 0 && doiSoat.mo_coi.length === 0 && (
                  <p className="flex items-center gap-1.5 font-bold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Sổ sao khớp phiếu.
                  </p>
                )}
                {doiSoat.thieu_lien_ket.length > 0 && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                    <strong>{doiSoat.thieu_lien_ket.length} số</strong> có trên phiếu nhưng sổ chưa đánh dấu đã tặng:
                    {' '}{formatRanges(doiSoat.thieu_lien_ket.map((x) => x.serial))}
                  </p>
                )}
                {doiSoat.mo_coi.length > 0 && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                    <strong>{doiSoat.mo_coi.length} số</strong> sổ ghi đã tặng nhưng không phiếu nào dùng:
                    {' '}{formatRanges(doiSoat.mo_coi.map((x) => x.serial))}
                  </p>
                )}
                {doiSoat.trung_phieu.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 space-y-0.5">
                    <p className="font-bold">
                      {doiSoat.trung_phieu.length} số bị nhiều phiếu cùng dùng — tra sao vật lý rồi sửa phiếu:
                    </p>
                    {doiSoat.trung_phieu.map((t) => (
                      <p key={t.serial}>Số {t.serial}: {t.cac_phieu}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TỔ / TẬP THỂ NHỎ — ý kiến TCTH 04/09/2026 */}
          <div className="rounded-2xl border border-slate-200 p-4">
            <h6 className="flex items-center gap-1.5 font-black text-xs text-slate-800 uppercase mb-1">
              <Users className="w-4 h-4 text-brand-navy" /> Tổ / tập thể nhỏ ({toRows.length})
            </h6>
            <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
              Tập thể không phải phòng trong danh bạ: tổ thuộc một phòng (VD Tổ FDI thuộc Phòng KHDN)
              hoặc liên phòng (VD Tổ truyền thông). Tổ nhận được sao tập thể, và phiếu cá nhân của cán bộ
              thuộc tổ hiện thêm ở dòng tổ trong bảng thi đua. Ngừng dùng thì tổ rời ô chọn, phiếu cũ giữ nguyên.
            </p>

            {toRows.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {toRows.map((t) => (
                  <div
                    key={t.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] ${
                      t.dangDung ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'
                    }`}
                  >
                    <span className="font-bold text-slate-800">{t.nhan}</span>
                    <span className="text-slate-500">{t.phongCha ? `thuộc ${t.phongCha}` : 'liên phòng'}</span>
                    <button
                      type="button"
                      onClick={() => void toggleSubUnit(t.id, !t.dangDung)}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase cursor-pointer ${
                        t.dangDung ? 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700' : 'bg-emerald-50 text-emerald-700'
                      }`}
                      title={t.dangDung ? 'Ngừng dùng — phiếu cũ vẫn giữ' : 'Kích hoạt lại'}
                    >
                      {t.dangDung ? 'Ngừng dùng' : 'Kích hoạt'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <input
                type="text"
                value={toMoi}
                onChange={(e) => setToMoi(e.target.value)}
                placeholder="Tên tổ mới, VD: Tổ Bancas"
                className="flex-1 min-w-40 px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-navy outline-none font-semibold"
              />
              <select
                value={toMoiPhongCha}
                onChange={(e) => setToMoiPhongCha(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-navy outline-none font-semibold bg-white cursor-pointer"
              >
                <option value="">Liên phòng</option>
                {nhanDangDung.map((d) => (
                  <option key={d} value={d}>Thuộc {d}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void runAddSubUnit()}
                disabled={busy === 'sub-unit' || !toMoi.trim()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-navy text-white text-[11px] font-black hover:bg-blue-800 transition-all cursor-pointer disabled:opacity-50"
              >
                {busy === 'sub-unit' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                Thêm tổ
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* KHAI BÁO LÔ */}
            <div className="rounded-2xl border border-slate-200 p-4">
              <h6 className="flex items-center gap-1.5 font-black text-xs text-slate-800 uppercase mb-3">
                <PackagePlus className="w-4 h-4 text-brand-navy" /> Khai báo lô sao đã in
              </h6>
              <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
                Nhập dải số của quyển sao vừa in + đóng số. Số đã có trong sổ sẽ tự bỏ qua.
              </p>
              <div className="flex items-center gap-2 text-xs">
                <input type="number" min={1} value={batchFrom} onChange={(e) => setBatchFrom(e.target.value)} placeholder="Từ số"
                  className="w-24 px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-navy outline-none font-semibold" />
                <span className="text-slate-400 font-bold">→</span>
                <input type="number" min={1} value={batchTo} onChange={(e) => setBatchTo(e.target.value)} placeholder="Đến số"
                  className="w-24 px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-navy outline-none font-semibold" />
                <button
                  type="button"
                  onClick={() => void runBatch()}
                  disabled={busy === 'batch' || !batchFrom || !batchTo}
                  className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-navy text-white text-[11px] font-black hover:bg-blue-800 transition-all cursor-pointer disabled:opacity-50"
                >
                  {busy === 'batch' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackagePlus className="w-3.5 h-3.5" />}
                  Khai báo
                </button>
              </div>
            </div>

            {/* BÀN GIAO */}
            <div className="rounded-2xl border border-slate-200 p-4">
              <h6 className="flex items-center gap-1.5 font-black text-xs text-slate-800 uppercase mb-3">
                <ArrowRightLeft className="w-4 h-4 text-brand-navy" /> Bàn giao sao cho lãnh đạo
              </h6>
              <div className="space-y-2 text-xs">
                {holder ? (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50/60">
                    <span className="font-bold text-slate-800">{holder.fullName}
                      <span className="text-slate-500 font-semibold"> — {holder.starDept ?? holder.rawDept ?? ''}{holder.position ? ` · ${holder.position}` : ''}</span>
                    </span>
                    <button type="button" onClick={() => setHolder(null)} className="p-1 rounded hover:bg-emerald-100 cursor-pointer"><X className="w-3.5 h-3.5 text-slate-500" /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 focus-within:border-brand-navy">
                      <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <input type="text" value={holderQuery} onChange={(e) => setHolderQuery(e.target.value)}
                        placeholder="Tìm Trưởng phòng / PGĐ / Giám đốc nhận bàn giao…"
                        className="w-full outline-none font-semibold text-slate-800" />
                    </div>
                    {holderMatches.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                        {holderMatches.map((p) => (
                          <button key={p.profileId} type="button" onClick={() => { setHolder(p); setHolderQuery(''); }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0">
                            <span className="font-bold text-slate-800">{p.fullName}</span>
                            <span className="text-slate-500"> — {p.starDept ?? p.rawDept ?? ''}{p.position ? ` · ${p.position}` : ''}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <input type="number" min={1} value={hoFrom} onChange={(e) => setHoFrom(e.target.value)} placeholder="Từ số"
                    className="w-24 px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-navy outline-none font-semibold" />
                  <span className="text-slate-400 font-bold">→</span>
                  <input type="number" min={1} value={hoTo} onChange={(e) => setHoTo(e.target.value)} placeholder="Đến số"
                    className="w-24 px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-navy outline-none font-semibold" />
                  <select value={quarter} onChange={(e) => setQuarter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-navy outline-none font-semibold bg-white cursor-pointer">
                    {QUARTER_OPTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => void runHandover()}
                    disabled={busy === 'handover' || !guiDuoc}
                    className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-navy text-white text-[11px] font-black hover:bg-blue-800 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {busy === 'handover' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
                    Bàn giao
                  </button>
                </div>
                {quaDai && (
                  <p className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                    Tối đa 500 số một lần bàn giao.
                  </p>
                )}
                {phanLoai && (
                  <div className={`text-[11px] rounded-lg px-3 py-2 space-y-0.5 border ${
                    guiDuoc ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    {phanLoai.moi.length > 0 && (
                      <p><strong>{phanLoai.moi.length} số</strong> còn trong kho — sẽ bàn giao.</p>
                    )}
                    {phanLoai.hoiTo.length > 0 && (
                      <p>
                        <strong>{phanLoai.hoiTo.length} số</strong> đã tặng bởi chính {holder?.fullName}
                        {' '}— ghi nhận là sao ra từ đợt này (không đổi phiếu): {formatRanges(phanLoai.hoiTo)}
                      </p>
                    )}
                    {phanLoai.daGiu.length > 0 && (
                      <p>{phanLoai.daGiu.length} số {holder?.fullName} vốn đã giữ — bỏ qua.</p>
                    )}
                    {phanLoai.boQua.length > 0 && (
                      <p>
                        <strong>{phanLoai.boQua.length} số</strong> đã tặng bởi người khác — bỏ qua, không gán:
                        {' '}{formatRanges(phanLoai.boQua)}
                      </p>
                    )}
                    {phanLoai.chan.length > 0 && (
                      <p className="font-bold">
                        Lãnh đạo khác đang giữ {formatRanges(phanLoai.chan)} — phải thu hồi trước.
                      </p>
                    )}
                    {phanLoai.chuaKhaiBao.length > 0 && (
                      <p className="font-bold">
                        Chưa khai báo lô in: {formatRanges(phanLoai.chuaKhaiBao)} — khai báo lô trước.
                      </p>
                    )}
                    {phanLoai.daHuy.length > 0 && (
                      <p className="font-bold">Số đã hủy: {formatRanges(phanLoai.daHuy)} — bỏ các số này khỏi dải.</p>
                    )}
                    {guiDuoc
                      ? <p className="font-bold">Bàn giao được.</p>
                      : phanLoai.chan.length === 0 && phanLoai.chuaKhaiBao.length === 0 && phanLoai.daHuy.length === 0 && (
                        <p className="font-bold">Cả dải không có số nào bàn giao được — chọn dải khác.</p>
                      )}
                  </div>
                )}
                <p className="text-[10px] text-slate-500">
                  Cứ nhập <strong>đúng dải đã đưa thực tế</strong>, kể cả khi trong đó có sao đã phát:
                  số còn trong kho thì bàn giao, số lãnh đạo này đã tặng thì ghi nhận nguồn gốc, số của
                  người khác thì tự bỏ qua. Hệ thống <strong>không giới hạn theo hạn mức</strong> —
                  giao đúng mức chi nhánh đang áp, bảng dưới để đối chiếu.
                </p>

                {/* Đã giao trong quý: đối chiếu với mức phân bổ đang áp (cũ hay mới đều được) */}
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-500 mb-1.5">
                    Đã bàn giao {quarter}: {tongDaGiaoTrongQuy} sao cho {daGiaoTrongQuy.length} lãnh đạo
                  </p>
                  {daGiaoTrongQuy.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic">
                      Quý này chưa bàn giao đợt nào.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {daGiaoTrongQuy.map(([id, soSao]) => (
                        <span key={id} className="px-2 py-1 rounded-lg bg-blue-50 border border-blue-100 text-[10px] font-bold text-slate-700">
                          {holderNames.get(id)?.name ?? '…'}
                          <span className="text-brand-navy font-black"> · {soSao} sao</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* BẢNG PHÂN BỔ THAM CHIẾU THEO VĂN BẢN */}
          <details className="rounded-2xl border border-slate-200 p-4">
            <summary className="flex items-center gap-1.5 font-black text-xs text-slate-800 uppercase cursor-pointer">
              <BookOpen className="w-4 h-4 text-brand-navy" /> Mức phân bổ sao/quý theo văn bản (tham chiếu khi bàn giao)
            </summary>
            <table className="w-full text-[11px] text-left border-collapse mt-3">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black">
                  <th className="p-2">Nhóm được phân bổ</th>
                  <th className="p-2 text-center">Sao/quý</th>
                  <th className="p-2 text-center">Sao/năm</th>
                </tr>
              </thead>
              <tbody>
                {QUARTERLY_ALLOCATION.map((r) => (
                  <tr key={r.group} className="border-b border-slate-50">
                    <td className="p-2 text-slate-700 font-semibold">{r.group}</td>
                    <td className="p-2 text-center font-bold text-brand-navy">{r.perQuarter}</td>
                    <td className="p-2 text-center text-slate-600">{r.perYear}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-slate-500 mt-2">
              Ngoài phân bổ trên, cá nhân/tập thể còn có thể nhận Sao từ các chương trình thi đua /
              chiến dịch gắn cơ chế Sao xứng đáng (ghi ở chế độ “Sao chương trình động lực”).
            </p>
          </details>

          {/* DANH SÁCH BÀN GIAO */}
          <div className="rounded-2xl border border-slate-200 p-4">
            <h6 className="flex items-center gap-1.5 font-black text-xs text-slate-800 uppercase mb-3">
              <Archive className="w-4 h-4 text-brand-navy" /> Các đợt bàn giao ({handovers.length})
            </h6>
            {handovers.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">
                Chưa có đợt bàn giao nào — bàn giao dải số đầu tiên cho lãnh đạo để mở đường tặng Sao trên cổng.
              </p>
            ) : (
              <div className="overflow-x-auto max-h-64 border border-slate-100 rounded-xl">
                <table className="w-full text-[11px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-black sticky top-0">
                      <th className="p-2">Lãnh đạo</th>
                      <th className="p-2 text-center">Dải số</th>
                      <th className="p-2 text-center">Quý</th>
                      <th className="p-2 text-center">Ngày</th>
                      <th className="p-2 text-center">Đã tặng / Còn giữ</th>
                      <th className="p-2 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {handovers.map((h) => {
                      const progress = handoverProgress.get(h.id) ?? { holding: 0, awarded: 0 };
                      const info = holderNames.get(h.holderProfileId);
                      return (
                        <tr key={h.id} className={`border-b border-slate-50 ${h.revokedAt ? 'opacity-50' : ''}`}>
                          <td className="p-2 font-bold text-slate-800">{info?.name ?? '…'}</td>
                          <td className="p-2 text-center font-mono">{h.serialFrom}–{h.serialTo}</td>
                          <td className="p-2 text-center">{h.quarter ?? '—'}</td>
                          <td className="p-2 text-center font-mono">{h.handedAt}</td>
                          <td className="p-2 text-center">
                            <span className="font-bold text-amber-600">{progress.awarded}</span>
                            <span className="text-slate-400"> / </span>
                            <span className="font-bold text-blue-700">{progress.holding}</span>
                          </td>
                          <td className="p-2 text-center">
                            {h.revokedAt ? (
                              <span className="text-[9px] font-black uppercase text-slate-400">Đã thu hồi</span>
                            ) : progress.holding > 0 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Thu hồi ${progress.holding} số chưa tặng của đợt này về kho?`)) {
                                    void revokeHandover(h.id);
                                  }
                                }}
                                className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 font-bold cursor-pointer"
                              >
                                <Undo2 className="w-3 h-3" /> Thu hồi
                              </button>
                            ) : (
                              <span className="text-[9px] font-black uppercase text-emerald-600">Đã tặng hết</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SỔ SERIAL TRỰC QUAN */}
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h6 className="flex items-center gap-1.5 font-black text-xs text-slate-800 uppercase">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" /> Sổ serial ({visibleRows.length} số)
              </h6>
              <div className="flex flex-wrap gap-1.5">
                {['all', 'in_stock', 'handed_over', 'awarded', 'void'].map((s) => (
                  <button key={s} type="button" onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${
                      statusFilter === s ? 'bg-brand-navy text-white border-brand-navy' : 'bg-white text-slate-600 border-slate-200'
                    }`}>
                    {s === 'all' ? 'Tất cả' : STATUS_META[s].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-1 max-h-56 overflow-y-auto p-2 rounded-xl border border-slate-100 bg-slate-50/60">
              {visibleRows.map((r) => {
                const holderInfo = r.holderProfileId ? holderNames.get(r.holderProfileId) : null;
                const title = `Số ${r.serialNo} — ${STATUS_META[r.status].label}`
                  + (holderInfo ? ` (${holderInfo.name})` : '')
                  + (r.note ? ` · ${r.note}` : '')
                  + (r.status === 'in_stock' ? ' · bấm để hủy số hỏng' : '');
                return (
                  <button
                    key={r.serialNo}
                    type="button"
                    title={title}
                    onClick={() => { if (r.status === 'in_stock') void askVoid(r.serialNo); }}
                    className={`px-2 py-0.5 rounded-md border font-mono font-bold text-[10px] ${STATUS_META[r.status].chip} ${
                      r.status === 'in_stock' ? 'cursor-pointer hover:border-red-400' : 'cursor-default'
                    }`}
                  >
                    {r.serialNo}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-slate-500 font-bold">
              {Object.entries(STATUS_META).map(([k, m]) => (
                <span key={k} className="inline-flex items-center gap-1">
                  <span className={`inline-block w-3 h-3 rounded border ${m.chip}`} /> {m.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
