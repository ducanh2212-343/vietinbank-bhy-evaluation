import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BadgeCheck, Flag, Link2, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ngayVnChuoi } from '@/lib/lichNghi';
import { gioVn } from '@/lib/diemDanh';
import {
  nhanNgay, ngayMacDinh, trangThaiO,
  type TtcDauViec, type TtcMucCon, type TtcTienDo, type TtcTienDoMuc,
} from '@/lib/trainingCenter';
import type { TtcBoiCanh } from './useTrainingCenter';
import {
  useTtcDauViec, useTtcLamTuoi, useTtcMucCon, useTtcNgay, useTtcTienDoLop, useTtcTienDoMuc, xacNhanMuc, xongDauViecLop,
} from './useTrainingCenter';

/**
 * THEO DÕI LỚP (đợt 15, Khung 2) — màn của team đào tạo trong lúc lớp chạy.
 *
 * Lưới học viên × (đầu việc + các mục con) của ngày đang chọn. Mỗi ô ba trạng
 * thái: trống = chưa · ✓ nhạt = học viên tự tích · ✓ đậm = team đã xác nhận.
 * Bấm vào ô là xác nhận (hoặc tích hộ nếu học viên chưa tích); bấm lại là rút
 * xác nhận. Hai dấu tách riêng ở máy chủ nên team rút xác nhận không xoá dấu
 * của học viên. Làm tươi 30 giây — không realtime, đủ cho một lớp 25 người.
 */
export function TtcTheoDoiLop({ bc }: { bc: TtcBoiCanh }) {
  const ct = bc.chuongTrinh;
  const ctId = ct?.id ?? null;
  const homNay = ngayVnChuoi(new Date());
  const lamTuoi = useTtcLamTuoi();
  const { data: dsNgay = [], isLoading } = useTtcNgay(ctId);
  const [ngayChon, setNgayChon] = useState<string | null>(null);
  const [viecChon, setViecChon] = useState<string>('TAT_CA');
  useEffect(() => { if (!ngayChon && dsNgay.length) setNgayChon(ngayMacDinh(dsNgay, homNay)?.id ?? null); }, [dsNgay, ngayChon, homNay]);
  const ngay = dsNgay.find((n) => n.id === ngayChon) ?? null;
  const ngayIds = useMemo(() => (ngay ? [ngay.id] : []), [ngay]);
  const { data: dsViec = [] } = useTtcDauViec(ctId, ngayIds);
  const viecCuaNgay = useMemo(
    () => dsViec.filter((v) => v.ngay_id === ngay?.id && (viecChon === 'TAT_CA' || v.id === viecChon)).sort((a, b) => a.gio_bat_dau.localeCompare(b.gio_bat_dau) || a.thu_tu - b.thu_tu),
    [dsViec, ngay, viecChon],
  );
  const viecIds = useMemo(() => viecCuaNgay.map((v) => v.id), [viecCuaNgay]);
  const { data: dsMuc = [] } = useTtcMucCon(ctId, viecIds);
  const mucIds = useMemo(() => dsMuc.map((m) => m.id), [dsMuc]);
  const { data: tienDoMuc = [] } = useTtcTienDoMuc(ctId, null, mucIds);
  const { data: tienDo = [] } = useTtcTienDoLop(ctId, viecIds);

  const mucTheoViec = useMemo(() => {
    const m = new Map<string, TtcMucCon[]>();
    for (const x of [...dsMuc].sort((a, b) => a.thu_tu - b.thu_tu)) m.set(x.dau_viec_id, [...(m.get(x.dau_viec_id) ?? []), x]);
    return m;
  }, [dsMuc]);
  const tdMuc = useMemo(() => new Map(tienDoMuc.map((t) => [`${t.muc_con_id}|${t.nguoi}`, t])), [tienDoMuc]);
  const tdViec = useMemo(() => new Map(tienDo.map((t) => [`${t.dau_viec_id}|${t.nguoi}`, t])), [tienDo]);
  const tenNguoi = (id: string) => bc.thanhVien.find((t) => t.nguoi === id)?.full_name ?? 'Team';

  const bam = async (m: TtcMucCon, nguoi: string, td: TtcTienDoMuc | undefined) => {
    try {
      if (td?.xac_nhan_boi) await xacNhanMuc({ muc: m.id, nguoi, bo_xac_nhan: true });
      else await xacNhanMuc({ muc: m.id, nguoi, xong: true });
      lamTuoi();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Không lưu được'); }
  };
  const xongLop = async (v: TtcDauViec) => {
    try { await xongDauViecLop(v.id, !v.xong_luc); lamTuoi(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Không lưu được'); }
  };

  if (!bc.laTeam) {
    return <p className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-600 shadow-sm">Màn này dành cho team đào tạo (người hướng dẫn, trợ giảng, Ban Giám đốc, quản trị).</p>;
  }
  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (!ngay) return <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">Chương trình chưa có ngày nào.</p>;

  // Cột: mỗi đầu việc một cột «xong» rồi tới các mục con của nó
  const cot: Array<{ v: TtcDauViec; m: TtcMucCon | null }> = viecCuaNgay.flatMap((v) => [{ v, m: null }, ...(mucTheoViec.get(v.id) ?? []).map((m) => ({ v, m }))]);
  const hocVien = bc.dsHocVien;
  const demCot = (c: { v: TtcDauViec; m: TtcMucCon | null }) => hocVien.filter((h) => (c.m ? tdMuc.get(`${c.m.id}|${h.nguoi}`)?.xong : tdViec.get(`${c.v.id}|${h.nguoi}`)?.hoan_thanh)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <Select value={ngay.id} onValueChange={(v) => { setNgayChon(v); setViecChon('TAT_CA'); }}>
          <SelectTrigger className="h-9 w-64"><SelectValue /></SelectTrigger>
          <SelectContent>{dsNgay.map((n) => <SelectItem key={n.id} value={n.id}>Ngày {n.so_thu_tu} · {nhanNgay(n.ngay)}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={viecChon} onValueChange={setViecChon}>
          <SelectTrigger className="h-9 w-72"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TAT_CA">Tất cả đầu việc trong ngày</SelectItem>
            {dsViec.filter((v) => v.ngay_id === ngay.id).map((v) => <SelectItem key={v.id} value={v.id}>{v.gio_bat_dau} · {v.ten.slice(0, 60)}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-slate-500">{hocVien.length} học viên · {viecCuaNgay.length} đầu việc · {dsMuc.length} mục · tự làm tươi 30 giây</span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-2xs text-slate-500">
          <span><span className="inline-block h-3 w-3 rounded border border-slate-300 align-middle" /> chưa</span>
          <span><span className="inline-block h-3 w-3 rounded bg-emerald-200 align-middle" /> học viên tự tích</span>
          <span><span className="inline-block h-3 w-3 rounded bg-[#1F4E79] align-middle" /> team đã xác nhận</span>
          <span>Bấm ô mục con để xác nhận / tích hộ; bấm lại để rút xác nhận.</span>
        </div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="align-bottom text-2xs text-slate-600">
                <th className="sticky left-0 z-10 bg-white py-1 pr-2 text-left font-semibold">Học viên</th>
                {cot.map((c) => (
                  <th key={c.m?.id ?? c.v.id} className={`min-w-[3.5rem] px-1 py-1 text-center font-medium ${c.m ? 'border-l border-slate-100' : 'border-l-2 border-slate-300 bg-slate-50'}`}>
                    {c.m ? (
                      <span title={c.m.ten} className="block max-w-[6rem] truncate">{c.m.thu_tu}. {c.m.ten}</span>
                    ) : (
                      <span title={c.v.ten} className="block max-w-[7rem] truncate font-bold text-brand-navy">{c.v.gio_bat_dau} {c.v.ten}</span>
                    )}
                    <span className="block tabular-nums text-slate-400">{demCot(c)}/{hocVien.length}</span>
                    {!c.m && c.v.ai_tich === 'NGUOI_DAN' && (
                      <Button size="sm" variant={c.v.xong_luc ? 'outline' : 'default'} className="mt-1 h-6 px-1.5 text-2xs" onClick={() => xongLop(c.v)} title={c.v.xong_luc ? `Lớp xong ${gioVn(c.v.xong_luc)} · ${tenNguoi(c.v.xong_boi ?? '')}` : 'Đánh dấu cả lớp đã xong'}>
                        <Flag className="mr-0.5 h-3 w-3" />{c.v.xong_luc ? gioVn(c.v.xong_luc) : 'Lớp xong'}
                      </Button>
                    )}
                  </th>
                ))}
                <th className="border-l-2 border-slate-300 px-1 py-1 text-center font-semibold">Mục xong</th>
              </tr>
            </thead>
            <tbody>
              {hocVien.length === 0 && <tr><td colSpan={cot.length + 2} className="py-3 text-center text-xs text-slate-500">Chương trình chưa có học viên.</td></tr>}
              {hocVien.map((h) => {
                const soXong = dsMuc.filter((m) => tdMuc.get(`${m.id}|${h.nguoi}`)?.xong).length;
                return (
                  <tr key={h.nguoi} className="border-t border-slate-100">
                    <td className="sticky left-0 z-10 max-w-[11rem] truncate bg-white py-1 pr-2 font-medium text-slate-800">{h.full_name ?? h.nguoi}</td>
                    {cot.map((c) => c.m
                      ? <OMuc key={c.m.id} m={c.m} td={tdMuc.get(`${c.m.id}|${h.nguoi}`)} tenNguoi={tenNguoi} onBam={() => bam(c.m!, h.nguoi, tdMuc.get(`${c.m!.id}|${h.nguoi}`))} />
                      : <OViec key={c.v.id} v={c.v} td={tdViec.get(`${c.v.id}|${h.nguoi}`)} />)}
                    <td className="border-l-2 border-slate-300 text-center tabular-nums text-slate-600">{dsMuc.length ? `${soXong}/${dsMuc.length}` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {viecCuaNgay.length > 0 && dsMuc.length === 0 && (
          <p className="mt-2 text-xs text-slate-500">Các đầu việc của ngày này chưa có mục con — thêm ở «Sửa đầu việc» trong Lộ trình để theo dõi từng bước.</p>
        )}
      </div>
    </div>
  );
}

function OViec({ v, td }: { v: TtcDauViec; td: TtcTienDo | undefined }) {
  const xong = v.ai_tich === 'NGUOI_DAN' ? !!v.xong_luc : !!td?.hoan_thanh;
  return (
    <td className={`border-l-2 border-slate-300 text-center ${xong ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-300'}`} title={xong && td?.thoi_diem ? `Tích ${gioVn(td.thoi_diem)}` : undefined}>
      {xong ? '✓' : '·'}
    </td>
  );
}

function OMuc({ m, td, tenNguoi, onBam }: { m: TtcMucCon; td: TtcTienDoMuc | undefined; tenNguoi: (id: string) => string; onBam: () => void }) {
  const tt = trangThaiO(td);
  const chu = tt === 'XAC_NHAN' ? `${tenNguoi(td!.xac_nhan_boi!)} xác nhận ${gioVn(td!.xac_nhan_luc!)}` : tt === 'TU_TICH' ? `Tự tích ${td?.luc ? gioVn(td.luc) : ''}` : 'Chưa tích';
  const kq = td?.ket_qua === 'DAT' ? 'Đ' : td?.ket_qua === 'CHUA' ? 'C' : null;
  const coNop = !!td?.duong_dan || (td?.tep?.length ?? 0) > 0;
  return (
    <td className="border-l border-slate-100 p-0.5 text-center">
      <button
        type="button"
        onClick={onBam}
        title={`${m.ten} — ${chu}${td?.ly_do ? ` · ${td.ly_do}` : ''}`}
        className={`inline-flex h-8 w-full min-w-[3rem] items-center justify-center gap-0.5 rounded-md text-xs font-bold transition ${
          tt === 'XAC_NHAN' ? 'bg-[#1F4E79] text-white' : tt === 'TU_TICH' ? 'bg-emerald-200 text-emerald-900' : 'border border-dashed border-slate-300 text-slate-300 hover:border-slate-400'
        }`}
      >
        {tt === 'XAC_NHAN' ? <BadgeCheck className="h-3.5 w-3.5" /> : tt === 'TU_TICH' ? '✓' : ''}
        {kq && <span className={`rounded px-1 text-2xs ${kq === 'Đ' ? 'bg-white/30' : 'bg-amber-400 text-amber-950'}`}>{kq}</span>}
        {coNop && (
          td?.duong_dan
            ? <a href={td.duong_dan} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="rounded bg-white/40 p-0.5" title={td.duong_dan}><Link2 className="h-3 w-3" /></a>
            : <Paperclip className="h-3 w-3" />
        )}
      </button>
    </td>
  );
}
