import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, BadgeCheck, ChevronDown, History, Link2, Lock, Plus, RotateCcw, Save, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { ngayVnChuoi } from '@/lib/lichNghi';
import { CT2_COT, cotHienThi, type Ct2DauViec } from '@/lib/ct2';
import {
  TTC_MUC_GIAO, TTC_O_PHIEU, TTC_PHIEU_CHU_THICH, TTC_PHIEU_TRONG, TTC_VI_SAO_BAY_O,
  cauSoSanhMucGiao, dungHan, goiYDiemKiem, kiemTraPhieu, ngayVnCuaIso, nhanTrangThaiPhieu, tenMucGiao,
  type TtcDiemKiem, type TtcKetQuaNghiemThu, type TtcMucGiao, type TtcPhieuForm, type TtcViecGoiDau,
} from '@/lib/trainingCenter';
import { useCt2NhanSu } from '@/components/one/move2/useCt2Data';
import {
  dieuChinhChuan, ghiDiemKiem, giaoViec, luuPhieuGiaoViec, moLaiNghiemThu, nghiemThuPhieu,
  useTtcLamTuoi, useTtcPhongCua, useTtcTheChonGoiDau, type TtcBoiCanh,
} from './useTrainingCenter';

/**
 * PHIẾU GIAO VIỆC BẢY Ô — theo «Bản mô tả yêu cầu sửa» của Giám đốc 06/09/2026.
 *
 * Một cột dọc, không chia tab: phiếu được điền trong cuộc họp chiều Ngày 1 có
 * Giám đốc ngồi cạnh — người điền phải nhìn thấy cả bảy ô cùng lúc để đối
 * thoại. Nhãn tiếng Việt, tiếng Anh trong ngoặc; kiểm tra khi lưu theo Mục 7
 * (chặn đỏ / cảnh báo vàng); «Giao việc» khoá ĐẠT CHUẨN, sửa sau đó phải có lý do.
 */

const NHAN_O = (k: keyof typeof TTC_O_PHIEU) => {
  const o = TTC_O_PHIEU[k];
  return <>{o.nhan}{o.en ? <span className="font-normal normal-case text-slate-400"> ({o.en})</span> : null}</>;
};

function ONhan({ k, loi, canhBao, children }: { k: keyof typeof TTC_O_PHIEU; loi?: string; canhBao?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-black uppercase tracking-wide text-brand-navy">{NHAN_O(k)}</Label>
      <p className="mb-1 text-2xs leading-snug text-slate-500">{TTC_O_PHIEU[k].goiY}</p>
      {children}
      {loi && <p className="mt-1 text-xs font-medium text-red-600">{loi}</p>}
      {!loi && canhBao && <p className="mt-1 text-xs font-medium text-amber-700">{canhBao}</p>}
    </div>
  );
}

/** 'YYYY-MM-DDTHH:MM' (giờ VN) ↔ ISO có múi +07 */
function isoSangLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const vn = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${vn.getFullYear()}-${p(vn.getMonth() + 1)}-${p(vn.getDate())}T${p(vn.getHours())}:${p(vn.getMinutes())}`;
}
function localSangIso(local: string): string | null {
  if (!local || local.length < 16) return null;
  return `${local}:00+07:00`;
}

export function TtcPhieuGiaoViec({ so, bc, cu, hocVienId, ctId, theLienKet }: {
  so: 1 | 2 | 3;
  bc: TtcBoiCanh;
  cu: TtcViecGoiDau | null;
  hocVienId: string | null;
  ctId: string;
  theLienKet: Ct2DauViec | null;
}) {
  const { profileId } = useAuth();
  const lamTuoi = useTtcLamTuoi();
  const { data: nhanSu = [] } = useCt2NhanSu();
  const { data: phongHocVien } = useTtcPhongCua(hocVienId);
  const [sua, setSua] = useState(false);
  const { data: dsChon = [] } = useTtcTheChonGoiDau(phongHocVien ?? null, sua && bc.laHocVien);
  const [f, setF] = useState<TtcPhieuForm & { dau_viec_id: string | null }>({ ...TTC_PHIEU_TRONG(), dau_viec_id: null });
  const [daBamLuu, setDaBamLuu] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);
  const [moTuyChon, setMoTuyChon] = useState(false);
  const [moViSao, setMoViSao] = useState(false);
  const [moDieuChinh, setMoDieuChinh] = useState(false);
  const [moNghiemThu, setMoNghiemThu] = useState(false);
  const [moLichSu, setMoLichSu] = useState(false);

  const tenNguoi = useMemo(() => new Map(nhanSu.map((n) => [n.id, n.full_name])), [nhanSu]);
  const nhanSuChon = useMemo(
    () => [...nhanSu].sort((a, b) => Number(b.department_id === phongHocVien) - Number(a.department_id === phongHocVien)),
    [nhanSu, phongHocVien],
  );

  useEffect(() => {
    if (cu) {
      setF({
        ten: cu.ten, muc_dich: cu.muc_dich ?? '', dau_ra: cu.dau_ra ?? '', can_bo: cu.can_bo,
        ten_can_bo: cu.can_bo ? tenNguoi.get(cu.can_bo) ?? null : null,
        dat_chuan: cu.dat_chuan.length ? [...cu.dat_chuan] : ['', ''],
        han_nop: cu.han_nop, diem_kiem: [...(cu.diem_kiem ?? [])], muc_giao: cu.muc_giao,
        goi_y_cach_lam: cu.goi_y_cach_lam, nguon_luc: cu.nguon_luc, dau_viec_id: cu.dau_viec_id,
      });
      setMoTuyChon(!!(cu.goi_y_cach_lam || cu.nguon_luc));
    } else {
      setF({ ...TTC_PHIEU_TRONG(), dau_viec_id: null });
    }
    setDaBamLuu(false);
  }, [cu, tenNguoi]);

  const kq = useMemo(() => kiemTraPhieu(f), [f]);
  const loiCua = (o: string) => (daBamLuu ? kq.chan.find((c) => c.o === o)?.loi : undefined);
  const canhBaoCua = (o: string) => kq.canhBao.find((c) => c.o === o)?.loi;
  const dat = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((c) => ({ ...c, [k]: v }));

  // Nhập xong hạn nộp → tự gợi ý một điểm kiểm ở 60% quãng, cho phép sửa
  const datHanNop = (local: string) => {
    const iso = localSangIso(local);
    setF((c) => {
      const moc = c.diem_kiem.filter((m) => m.ngay);
      const goiY = iso ? goiYDiemKiem(iso) : null;
      return { ...c, han_nop: iso, diem_kiem: moc.length === 0 && goiY ? [{ ngay: goiY, ket_qua: null, ghi_chu: '' }] : c.diem_kiem };
    });
  };

  const luu = async (giao: boolean) => {
    if (!hocVienId) return;
    setDaBamLuu(true);
    // Lưu nháp chỉ cần tên; Giao việc cần đủ bảy ô (chặn đỏ)
    if (f.ten.trim().length < 5) { toast.error('Ghi tên sản phẩm (tối thiểu 5 ký tự).'); return; }
    if (giao && kq.chan.length > 0) { toast.error(`Chưa giao được. Còn thiếu: ${[...new Set(kq.chan.map((c) => c.o))].length} ô — xem phần chữ đỏ.`); return; }
    setDangLuu(true);
    try {
      await luuPhieuGiaoViec({ ...f, id: cu?.id, chuong_trinh_id: ctId, hoc_vien: hocVienId, so, ten: f.ten.trim() });
      if (giao) {
        // Phiếu mới chưa có id — tải lại rồi giao ở lượt sau; phiếu cũ giao ngay
        if (cu?.id) await giaoViec(cu.id);
      }
      lamTuoi();
      setSua(false);
      toast.success(giao ? (cu?.id ? 'Đã giao việc — ĐẠT CHUẨN đã khoá.' : 'Đã lưu. Bấm «Giao việc» lần nữa để khoá chuẩn.') : 'Đã lưu nháp.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không lưu được');
    } finally { setDangLuu(false); }
  };

  const giao = async () => {
    if (!cu) return;
    const chan = kiemTraPhieu({ ...cu, ten_can_bo: cu.can_bo ? tenNguoi.get(cu.can_bo) ?? null : null }).chan;
    if (chan.length) { setSua(true); setDaBamLuu(true); toast.error('Thẻ chưa đủ thông tin để giao — xem phần chữ đỏ.'); return; }
    try { await giaoViec(cu.id); lamTuoi(); toast.success('Đã giao việc — ĐẠT CHUẨN đã khoá, thẻ sang cột Đang làm.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Không giao được'); }
  };

  const nhan = nhanTrangThaiPhieu(cu);
  const cotThe = theLienKet ? CT2_COT.find((c) => c.ma === cotHienThi(theLienKet.trang_thai)) : null;

  return (
    <article className={`flex flex-col rounded-2xl border bg-white p-4 shadow-sm ${cu?.nghiem_thu_ket_qua === 'dat' ? 'border-emerald-300' : cu?.khoa_chuan ? 'border-[#A8763E]/50' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#A8763E] text-sm font-black text-white">{so}</span>
          <div className="min-w-0">
            <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400">Việc gối đầu {so}</p>
            <p className="truncate text-sm font-bold leading-snug text-brand-navy">{cu?.ten ?? 'Chưa lập phiếu'}</p>
            <p className={`text-2xs font-semibold ${cu?.nghiem_thu_ket_qua === 'dat' ? 'text-emerald-700' : cu?.khoa_chuan ? 'text-[#8A5E2C]' : 'text-slate-500'}`}>{nhan}</p>
          </div>
        </div>
        {bc.laHocVien && !sua && cu && cu.trang_thai !== 'hoan_thanh' && (
          <Button size="sm" variant="ghost" className="h-11 sm:h-8" onClick={() => setSua(true)}>Sửa</Button>
        )}
      </div>

      {/* ---------------- Chưa lập ---------------- */}
      {!cu && !sua && (
        <div className="mt-3">
          <p className="text-sm leading-relaxed text-slate-600">
            Chốt đủ bảy ô chiều Ngày 1 cùng Giám đốc, giao cán bộ sáng Ngày 2. Ngày 7 và Ngày 8 rà soát lại phiếu,
            xác định mức giao cho từng cán bộ và xử lý tình huống chậm tiến độ.
          </p>
          {bc.laHocVien && (
            <Button className="mt-3 h-11 w-full sm:w-auto" onClick={() => setSua(true)}><Plus className="mr-1 h-4 w-4" /> Lập phiếu giao việc</Button>
          )}
        </div>
      )}

      {/* ---------------- Phiếu (lập / sửa) ---------------- */}
      {sua && bc.laHocVien && (
        <div className="mt-3 space-y-4 text-sm">
          <p className="text-2xs text-slate-500">{TTC_PHIEU_CHU_THICH}</p>

          <div>
            <Label className="text-xs font-black uppercase tracking-wide text-brand-navy">Tên sản phẩm <span className="font-normal normal-case text-slate-400">(tiêu đề thẻ)</span></Label>
            <Input className="mt-1 h-11" value={f.ten} onChange={(e) => dat('ten', e.target.value)} placeholder="VD: Bản đồ KCN và thị phần VietinBank" />
            {loiCua('tieuDe') && <p className="mt-1 text-xs font-medium text-red-600">{loiCua('tieuDe')}</p>}
            {!loiCua('tieuDe') && canhBaoCua('tieuDe') && <p className="mt-1 text-xs font-medium text-amber-700">{canhBaoCua('tieuDe')}</p>}
          </div>

          <ONhan k="viSao" loi={loiCua('viSao')}>
            <Textarea rows={3} value={f.muc_dich ?? ''} onChange={(e) => dat('muc_dich', e.target.value)} />
          </ONhan>
          <ONhan k="viecGi" loi={loiCua('viecGi')}>
            <Textarea rows={3} value={f.dau_ra ?? ''} onChange={(e) => dat('dau_ra', e.target.value)} />
          </ONhan>
          <ONhan k="aiLam" loi={loiCua('aiLam')}>
            <Select value={f.can_bo ?? 'KHONG'} onValueChange={(v) => setF((c) => ({ ...c, can_bo: v === 'KHONG' ? null : v, ten_can_bo: v === 'KHONG' ? null : tenNguoi.get(v) ?? null }))}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Chọn một cán bộ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="KHONG">— Chọn một cán bộ —</SelectItem>
                {nhanSuChon.map((n) => <SelectItem key={n.id} value={n.id}>{n.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </ONhan>

          <ONhan k="datChuan" loi={loiCua('datChuan')}>
            {cu?.khoa_chuan ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-1 flex items-center gap-1 text-2xs font-semibold text-slate-500"><Lock className="h-3 w-3" /> Đã khoá lúc giao việc — sửa bằng nút «Điều chỉnh chuẩn»</p>
                <ul className="list-disc space-y-1 pl-5 text-slate-800">{cu.dat_chuan.map((d, i) => <li key={i}>{d}</li>)}</ul>
              </div>
            ) : (
              <div className="space-y-2">
                {f.dat_chuan.map((d, i) => (
                  <div key={i} className="flex gap-2">
                    <Input className="h-11" value={d} onChange={(e) => dat('dat_chuan', f.dat_chuan.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Tiêu chí ${i + 1} — nhìn được, đếm được hoặc đối chiếu được`} />
                    {f.dat_chuan.length > 1 && (
                      <Button type="button" size="icon" variant="ghost" className="h-11 w-11 shrink-0" onClick={() => dat('dat_chuan', f.dat_chuan.filter((_, j) => j !== i))} aria-label="Bỏ tiêu chí"><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </div>
                ))}
                <Button type="button" size="sm" variant="outline" className="h-11 sm:h-9" onClick={() => dat('dat_chuan', [...f.dat_chuan, ''])}><Plus className="mr-1 h-3.5 w-3.5" /> Thêm tiêu chí</Button>
              </div>
            )}
          </ONhan>

          <ONhan k="hanNop" loi={loiCua('hanNop')}>
            <Input type="datetime-local" className="h-11" value={isoSangLocal(f.han_nop)} onChange={(e) => datHanNop(e.target.value)} />
          </ONhan>

          <ONhan k="diemKiem" loi={loiCua('diemKiem')}>
            <div className="space-y-2">
              {f.diem_kiem.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <Input type="date" className="h-11 w-40 shrink-0" value={m.ngay} onChange={(e) => dat('diem_kiem', f.diem_kiem.map((x, j) => (j === i ? { ...x, ngay: e.target.value } : x)))} />
                  <Input className="h-11" value={m.ghi_chu} onChange={(e) => dat('diem_kiem', f.diem_kiem.map((x, j) => (j === i ? { ...x, ghi_chu: e.target.value } : x)))} placeholder="Mốc này xem cái gì?" />
                  <Button type="button" size="icon" variant="ghost" className="h-11 w-11 shrink-0" onClick={() => dat('diem_kiem', f.diem_kiem.filter((_, j) => j !== i))} aria-label="Bỏ mốc"><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button type="button" size="sm" variant="outline" className="h-11 sm:h-9" onClick={() => dat('diem_kiem', [...f.diem_kiem, { ngay: f.han_nop ? goiYDiemKiem(f.han_nop) ?? '' : '', ket_qua: null, ghi_chu: '' }])}><Plus className="mr-1 h-3.5 w-3.5" /> Thêm mốc</Button>
            </div>
          </ONhan>

          <ONhan k="mucGiao" loi={loiCua('mucGiao')}>
            <div className="grid gap-2 sm:grid-cols-3">
              {TTC_MUC_GIAO.map((m) => (
                <button
                  key={m.ma}
                  type="button"
                  onClick={() => dat('muc_giao', m.ma)}
                  className={`min-h-[44px] rounded-xl border p-3 text-left transition ${f.muc_giao === m.ma ? 'border-brand-navy bg-brand-navy text-white shadow' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-navy/40'}`}
                >
                  <span className="block text-sm font-bold">{m.ma} · {m.ten}</span>
                  <span className={`block text-2xs leading-snug ${f.muc_giao === m.ma ? 'text-white/80' : 'text-slate-500'}`}>{m.mo}</span>
                </button>
              ))}
            </div>
          </ONhan>

          <div className="rounded-xl border border-slate-200">
            <button type="button" onClick={() => setMoTuyChon((v) => !v)} className="flex min-h-[44px] w-full items-center justify-between px-3 text-left text-xs font-semibold text-slate-600">
              Hai ô còn lại của 5W2H — chỉ mở khi cần
              <ChevronDown className={`h-4 w-4 transition-transform ${moTuyChon ? 'rotate-180' : ''}`} />
            </button>
            {(moTuyChon || f.muc_giao === 'M1') && (
              <div className="space-y-3 border-t border-slate-100 p-3">
                <ONhan k="goiYCachLam">
                  <Textarea rows={2} value={f.goi_y_cach_lam ?? ''} onChange={(e) => dat('goi_y_cach_lam', e.target.value)} placeholder={f.muc_giao === 'M1' ? 'Bắt buộc với mức M1' : 'chỉ ghi khi cần'} />
                </ONhan>
                <ONhan k="nguonLuc">
                  <Textarea rows={2} value={f.nguon_luc ?? ''} onChange={(e) => dat('nguon_luc', e.target.value)} placeholder="chỉ ghi khi cần" />
                </ONhan>
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs">Thẻ trên Chiêu thức 2 <span className="font-normal text-slate-400">(tuỳ chọn — để cán bộ ghi nhịp)</span></Label>
            <Select value={f.dau_viec_id ?? 'KHONG'} onValueChange={(v) => dat('dau_viec_id', v === 'KHONG' ? null : v)}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Chọn thẻ đã ghi ở Chiêu thức 2" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="KHONG">— Chưa liên kết —</SelectItem>
                {dsChon.map((t) => <SelectItem key={t.id} value={t.id}>{t.ma_hien_thi ? `${t.ma_hien_thi} · ` : ''}{t.tieu_de}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="mt-1 text-2xs text-slate-500">Chưa có thẻ? <Link to="/one/chieu-thuc-2" className="font-semibold text-brand-navy underline">Ghi việc ở Chiêu thức 2</Link> với cán bộ là người chịu trách nhiệm, rồi quay lại chọn.</p>
          </div>

          <div className="rounded-xl border border-slate-200">
            <button type="button" onClick={() => setMoViSao((v) => !v)} className="flex min-h-[44px] w-full items-center justify-between px-3 text-left text-xs font-semibold text-slate-600">
              Vì sao lại là bảy ô này?
              <ChevronDown className={`h-4 w-4 transition-transform ${moViSao ? 'rotate-180' : ''}`} />
            </button>
            {moViSao && <pre className="whitespace-pre-wrap border-t border-slate-100 p-3 font-sans text-xs leading-relaxed text-slate-700">{TTC_VI_SAO_BAY_O}</pre>}
          </div>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button variant="ghost" className="h-11" onClick={() => { setSua(false); setDaBamLuu(false); }}>Huỷ</Button>
            <Button variant="outline" className="h-11" onClick={() => luu(false)} disabled={dangLuu}><Save className="mr-1 h-4 w-4" /> Lưu nháp</Button>
            {!cu?.khoa_chuan && (
              <Button className="h-11" onClick={() => luu(true)} disabled={dangLuu}><Send className="mr-1 h-4 w-4" /> Giao việc</Button>
            )}
          </div>
        </div>
      )}

      {/* ---------------- Xem phiếu ---------------- */}
      {cu && !sua && (
        <div className="mt-3 space-y-2 text-sm">
          <XemO k="viSao" gia={cu.muc_dich} />
          <XemO k="viecGi" gia={cu.dau_ra} />
          <XemO k="aiLam" gia={cu.can_bo ? tenNguoi.get(cu.can_bo) ?? '—' : null} />
          <div>
            <p className="text-2xs font-black uppercase tracking-wide text-slate-500">{NHAN_O('datChuan')} {cu.khoa_chuan && <Lock className="ml-1 inline h-3 w-3" />}</p>
            {cu.dat_chuan.length ? <ul className="list-disc space-y-0.5 pl-5 text-slate-800">{cu.dat_chuan.map((d, i) => <li key={i}>{d}</li>)}</ul> : <p className="text-slate-400">—</p>}
            {cu.lich_su_chuan.length > 0 && (
              <button type="button" onClick={() => setMoLichSu(true)} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700 underline">
                <AlertTriangle className="h-3.5 w-3.5" /> Chuẩn của việc này đã được điều chỉnh {cu.lich_su_chuan.length} lần sau khi giao. Xem lịch sử.
              </button>
            )}
          </div>
          <XemO k="hanNop" gia={cu.han_nop ? new Date(cu.han_nop).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : null} />
          <div>
            <p className="text-2xs font-black uppercase tracking-wide text-slate-500">{NHAN_O('diemKiem')}</p>
            {cu.diem_kiem.length === 0 ? <p className="text-slate-400">—</p> : (
              <ul className="space-y-1">
                {cu.diem_kiem.map((m) => <DongDiemKiem key={m.ngay} m={m} g={cu} suaDuoc={bc.laHocVien && cu.khoa_chuan && cu.trang_thai !== 'hoan_thanh'} />)}
              </ul>
            )}
          </div>
          <XemO k="mucGiao" gia={tenMucGiao(cu.muc_giao)} />
          {cu.goi_y_cach_lam && <XemO k="goiYCachLam" gia={cu.goi_y_cach_lam} />}
          {cu.nguon_luc && <XemO k="nguonLuc" gia={cu.nguon_luc} />}

          <div className="rounded-xl bg-slate-50 p-2.5 text-xs">
            {theLienKet ? (
              <p className="flex items-center gap-1.5 text-slate-700">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-brand-navy" />
                <span className="truncate">{theLienKet.ma_hien_thi ?? 'Thẻ CT2'} · {theLienKet.tieu_de}</span>
                <span className="ml-auto shrink-0 font-semibold">{cotThe?.icon} {cotThe?.ten} · {theLienKet.phan_tram}%</span>
              </p>
            ) : (
              <p className="text-slate-500">Chưa liên kết thẻ Chiêu thức 2 — cán bộ chưa có chỗ ghi nhịp.</p>
            )}
          </div>

          {bc.laHocVien && (
            <div className="flex flex-col gap-2 sm:flex-row">
              {!cu.khoa_chuan && <Button className="h-11" onClick={giao}><Send className="mr-1 h-4 w-4" /> Giao việc</Button>}
              {cu.khoa_chuan && cu.trang_thai !== 'hoan_thanh' && (
                <Button variant="outline" className="h-11" onClick={() => setMoDieuChinh(true)}><History className="mr-1 h-4 w-4" /> Điều chỉnh chuẩn</Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---------------- Nghiệm thu ---------------- */}
      {cu && !sua && (
        <div className={`mt-3 rounded-xl border p-3 ${cu.nghiem_thu_ket_qua === 'dat' ? 'border-emerald-200 bg-emerald-50/60' : cu.nghiem_thu_ket_qua === 'chua_dat' ? 'border-amber-200 bg-amber-50/60' : 'border-dashed border-slate-300'}`}>
          <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-slate-500">
            <BadgeCheck className={`h-3.5 w-3.5 ${cu.nghiem_thu_ket_qua === 'dat' ? 'text-emerald-600' : ''}`} /> Nghiệm thu của Ban Giám đốc
            {cu.so_lan_nghiem_thu > 0 && <span className="ml-auto normal-case">lần {cu.so_lan_nghiem_thu}</span>}
          </p>
          {cu.nghiem_thu_ket_qua ? (
            <div className="mt-1 space-y-1 text-sm">
              <p className={`font-bold ${cu.nghiem_thu_ket_qua === 'dat' ? 'text-emerald-700' : 'text-amber-800'}`}>{cu.nghiem_thu_ket_qua === 'dat' ? 'Đạt' : 'Chưa đạt — làm lại'}</p>
              <p className="leading-relaxed text-slate-800">{cu.nghiem_thu}</p>
              <p className="text-2xs text-slate-500">
                {cu.nguoi_nghiem_thu ? tenNguoi.get(cu.nguoi_nghiem_thu) ?? '' : ''}{cu.nghiem_thu_luc ? ` · ${new Date(cu.nghiem_thu_luc).toLocaleDateString('vi-VN')}` : ''}
                {dungHan(cu) != null && <> · {dungHan(cu) ? 'đúng hạn' : 'chậm hạn'}</>}
                {cu.so_lan_nghiem_thu > 1 ? ` · phải làm lại ${cu.so_lan_nghiem_thu - 1} lần` : cu.nghiem_thu_ket_qua === 'dat' ? ' · đạt chuẩn ngay' : ''}
                {cu.hoi_lai_giua_chung != null && <> · {cu.hoi_lai_giua_chung ? 'có hỏi lại giữa chừng' : 'không hỏi lại giữa chừng'}</>}
              </p>
              {cauSoSanhMucGiao(cu.muc_giao, cu.muc_giao_cuoi_ky) && (
                <p className="rounded-lg bg-white/70 px-2 py-1 text-xs font-medium text-brand-navy">{cauSoSanhMucGiao(cu.muc_giao, cu.muc_giao_cuoi_ky)}</p>
              )}
              {bc.laBgd && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {cu.nghiem_thu_ket_qua === 'chua_dat' && <Button size="sm" className="h-11 sm:h-8" onClick={() => setMoNghiemThu(true)}>Nghiệm thu lại</Button>}
                  <Button size="sm" variant="outline" className="h-11 sm:h-8" onClick={async () => { try { await moLaiNghiemThu(cu.id); lamTuoi(); toast.success('Đã mở lại — thẻ về cột Đang làm.'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Không mở được'); } }}>
                    <RotateCcw className="mr-1 h-3.5 w-3.5" /> Mở lại nghiệm thu
                  </Button>
                </div>
              )}
            </div>
          ) : bc.laBgd && cu.khoa_chuan ? (
            <Button size="sm" className="mt-2 h-11 sm:h-9" onClick={() => setMoNghiemThu(true)}>Nghiệm thu</Button>
          ) : (
            <p className="mt-1 text-xs text-slate-500">{cu.khoa_chuan ? 'Chờ Ban Giám đốc nghiệm thu.' : 'Mở sau khi bấm «Giao việc».'}</p>
          )}
        </div>
      )}

      {cu && (
        <>
          <HopDieuChinhChuan g={cu} open={moDieuChinh} onClose={() => setMoDieuChinh(false)} />
          <HopNghiemThu g={cu} open={moNghiemThu} onClose={() => setMoNghiemThu(false)} />
          <HopLichSuChuan g={cu} open={moLichSu} onClose={() => setMoLichSu(false)} />
        </>
      )}
      {!profileId && null}
    </article>
  );
}

function XemO({ k, gia }: { k: keyof typeof TTC_O_PHIEU; gia: string | null | undefined }) {
  return (
    <div>
      <p className="text-2xs font-black uppercase tracking-wide text-slate-500">{NHAN_O(k)}</p>
      <p className={`leading-relaxed ${gia ? 'text-slate-800' : 'text-slate-400'}`}>{gia || '—'}</p>
    </div>
  );
}

const TEN_KQ_DIEM_KIEM: Record<string, string> = { chua_toi: 'chưa tới', dung_tien_do: 'đúng tiến độ', cham_tien_do: 'chậm tiến độ' };

function DongDiemKiem({ m, g, suaDuoc }: { m: TtcDiemKiem; g: TtcViecGoiDau; suaDuoc: boolean }) {
  const lamTuoi = useTtcLamTuoi();
  const homNay = ngayVnChuoi(new Date());
  const ghi = async (kq: TtcDiemKiem['ket_qua']) => {
    try { await ghiDiemKiem(g, m.ngay, kq, m.ghi_chu); lamTuoi(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Không ghi được'); }
  };
  const nhan = m.ngay.split('-').reverse().slice(0, 2).join('/');
  return (
    <li className="flex flex-wrap items-center gap-2 text-sm">
      <span className={`font-semibold tabular-nums ${m.ket_qua === 'cham_tien_do' ? 'text-red-700' : m.ngay < homNay && !m.ket_qua ? 'text-amber-700' : 'text-slate-700'}`}>{nhan}</span>
      <span className="text-slate-600">{m.ghi_chu}</span>
      {m.ket_qua ? (
        <span className={`rounded-full px-2 py-0.5 text-2xs font-semibold ${m.ket_qua === 'cham_tien_do' ? 'bg-red-100 text-red-700' : m.ket_qua === 'dung_tien_do' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{TEN_KQ_DIEM_KIEM[m.ket_qua]}</span>
      ) : m.ngay < homNay ? (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-2xs font-semibold text-amber-800">quá mốc · chưa ghi nhận</span>
      ) : null}
      {suaDuoc && m.ngay <= homNay && (
        <span className="ml-auto flex gap-1">
          <Button size="sm" variant={m.ket_qua === 'dung_tien_do' ? 'default' : 'outline'} className="h-9 px-2 text-xs" onClick={() => ghi('dung_tien_do')}>Đúng tiến độ</Button>
          <Button size="sm" variant={m.ket_qua === 'cham_tien_do' ? 'destructive' : 'outline'} className="h-9 px-2 text-xs" onClick={() => ghi('cham_tien_do')}>Chậm</Button>
        </span>
      )}
    </li>
  );
}

function HopDieuChinhChuan({ g, open, onClose }: { g: TtcViecGoiDau; open: boolean; onClose: () => void }) {
  const lamTuoi = useTtcLamTuoi();
  const [chuan, setChuan] = useState<string[]>([]);
  const [lyDo, setLyDo] = useState('');
  useEffect(() => { if (open) { setChuan([...g.dat_chuan]); setLyDo(''); } }, [open, g.dat_chuan]);
  const luu = async () => {
    const moi = chuan.map((d) => d.trim()).filter(Boolean);
    if (lyDo.trim().length < 20) { toast.error('Lý do điều chỉnh chuẩn tối thiểu 20 ký tự.'); return; }
    if (moi.length === 0 || moi.some((d) => d.length < 15)) { toast.error('Mỗi tiêu chí tối thiểu 15 ký tự, ít nhất một dòng.'); return; }
    try { await dieuChinhChuan(g, moi, lyDo); lamTuoi(); onClose(); toast.success('Đã điều chỉnh chuẩn và ghi lịch sử.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Không lưu được'); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Điều chỉnh chuẩn sau khi đã giao</DialogTitle>
          <DialogDescription>Kỷ luật khó nhất của người giao việc không phải là đặt chuẩn, mà là không thêm tiêu chí mới vào lúc nghiệm thu. Mọi lần sửa đều được ghi lại kèm lý do.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          {chuan.map((d, i) => (
            <div key={i} className="flex gap-2">
              <Input className="h-11" value={d} onChange={(e) => setChuan(chuan.map((x, j) => (j === i ? e.target.value : x)))} />
              <Button type="button" size="icon" variant="ghost" className="h-11 w-11 shrink-0" onClick={() => setChuan(chuan.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" className="h-11 sm:h-9" onClick={() => setChuan([...chuan, ''])}><Plus className="mr-1 h-3.5 w-3.5" /> Thêm tiêu chí</Button>
          <div>
            <Label>Lý do điều chỉnh <span className="text-slate-400">(tối thiểu 20 ký tự)</span></Label>
            <Textarea rows={3} value={lyDo} onChange={(e) => setLyDo(e.target.value)} />
            <p className={`mt-1 text-2xs ${lyDo.trim().length < 20 ? 'text-red-600' : 'text-slate-400'}`}>{lyDo.trim().length}/20</p>
          </div>
        </div>
        <DialogFooter><Button variant="ghost" onClick={onClose}>Huỷ</Button><Button onClick={luu}>Lưu điều chỉnh</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HopLichSuChuan({ g, open, onClose }: { g: TtcViecGoiDau; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Lịch sử điều chỉnh chuẩn</DialogTitle></DialogHeader>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto text-sm">
          {g.lich_su_chuan.map((h, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-3">
              <p className="text-2xs text-slate-500">{new Date(h.thoi_diem).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
              <p className="mt-1 font-medium text-slate-800">Lý do: {h.ly_do}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div><p className="text-2xs font-semibold uppercase text-slate-400">Chuẩn cũ</p><ul className="list-disc pl-4 text-xs text-slate-600">{h.chuan_cu.map((d, j) => <li key={j}>{d}</li>)}</ul></div>
                <div><p className="text-2xs font-semibold uppercase text-slate-400">Chuẩn mới</p><ul className="list-disc pl-4 text-xs text-slate-800">{h.chuan_moi.map((d, j) => <li key={j}>{d}</li>)}</ul></div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HopNghiemThu({ g, open, onClose }: { g: TtcViecGoiDau; open: boolean; onClose: () => void }) {
  const lamTuoi = useTtcLamTuoi();
  const [tich, setTich] = useState<boolean[]>([]);
  const [nhanXet, setNhanXet] = useState('');
  const [hoiLai, setHoiLai] = useState<boolean | null>(null);
  const [mucCuoi, setMucCuoi] = useState<TtcMucGiao | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  useEffect(() => { if (open) { setTich(g.dat_chuan.map(() => false)); setNhanXet(''); setHoiLai(null); setMucCuoi(g.muc_giao_cuoi_ky ?? null); } }, [open, g]);
  const duTich = tich.length > 0 && tich.every(Boolean);
  const luu = async (kq: TtcKetQuaNghiemThu) => {
    if (nhanXet.trim().length < 30) { toast.error('Nhận xét bắt buộc, tối thiểu 30 ký tự.'); return; }
    if (kq === 'dat' && !duTich) { toast.error('Tích đủ mọi dòng chuẩn rồi mới bấm Đạt.'); return; }
    setDangLuu(true);
    try { await nghiemThuPhieu(g.id, { ket_qua: kq, nhan_xet: nhanXet, hoi_lai_giua_chung: hoiLai, muc_giao_cuoi_ky: mucCuoi }); lamTuoi(); onClose(); toast.success(kq === 'dat' ? 'Nghiệm thu Đạt — thẻ sang Hoàn thành.' : 'Đã ghi Chưa đạt — thẻ ở lại Đang làm.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Không lưu được'); }
    finally { setDangLuu(false); }
  };
  const chuanLucGiao = g.lich_su_chuan.length > 0 ? g.lich_su_chuan[0].chuan_cu : g.dat_chuan;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nghiệm thu việc gối đầu {g.so}</DialogTitle>
          <DialogDescription>Chỉ hai kết quả: Đạt hoặc Chưa đạt. Đối chiếu từng dòng chuẩn đã chốt lúc giao — không thêm tiêu chí mới lúc này.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-3 overflow-y-auto text-sm">
          {g.lich_su_chuan.length > 0 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" /> Chuẩn của việc này đã được điều chỉnh {g.lich_su_chuan.length} lần sau khi giao. Dưới đây là chuẩn hiện hành; chuẩn lúc giao: {chuanLucGiao.join(' · ')}</p>
          )}
          <div className="space-y-2">
            {g.dat_chuan.map((d, i) => (
              <label key={i} className="flex min-h-[44px] cursor-pointer items-start gap-2 rounded-xl border border-slate-200 p-2.5">
                <Checkbox checked={!!tich[i]} onCheckedChange={(c) => setTich(tich.map((x, j) => (j === i ? c === true : x)))} className="mt-0.5 h-5 w-5" />
                <span className="text-slate-800">{d}</span>
              </label>
            ))}
          </div>
          <div>
            <Label>Nhận xét <span className="text-slate-400">(bắt buộc, tối thiểu 30 ký tự)</span></Label>
            <Textarea rows={3} value={nhanXet} onChange={(e) => setNhanXet(e.target.value)} placeholder="Nói về sản phẩm và bằng chứng, không gắn nhãn tính cách." />
            <p className={`mt-1 text-2xs ${nhanXet.trim().length < 30 ? 'text-red-600' : 'text-slate-400'}`}>{nhanXet.trim().length}/30</p>
          </div>
          <div className="grid gap-2 rounded-xl bg-slate-50 p-3 text-xs">
            <p className="font-semibold uppercase tracking-wider text-slate-500">Ghi nhận cho ngày 10</p>
            <p>Đúng hạn hay chậm: <b>{g.han_nop ? (Date.now() <= Date.parse(g.han_nop) ? 'đúng hạn (tính đến lúc này)' : 'chậm hạn') : '—'}</b> · tự tính từ hạn nộp {g.han_nop ? ngayVnCuaIso(g.han_nop).split('-').reverse().slice(0, 2).join('/') : ''}</p>
            <p>Đạt chuẩn ngay hay phải làm lại: <b>{g.so_lan_nghiem_thu === 0 ? 'lần nghiệm thu đầu' : `đã nghiệm thu ${g.so_lan_nghiem_thu} lần trước`}</b></p>
            <div className="flex flex-wrap items-center gap-2">
              <span>Cán bộ có phải hỏi lại giữa chừng không?</span>
              <Button size="sm" variant={hoiLai === true ? 'default' : 'outline'} className="h-9" onClick={() => setHoiLai(true)}>Có</Button>
              <Button size="sm" variant={hoiLai === false ? 'default' : 'outline'} className="h-9" onClick={() => setHoiLai(false)}>Không</Button>
            </div>
          </div>
          <div>
            <Label className="text-xs font-black uppercase tracking-wide text-brand-navy">Mức giao cuối kỳ</Label>
            <div className="mt-1 grid gap-2 sm:grid-cols-3">
              {TTC_MUC_GIAO.map((m) => (
                <button key={m.ma} type="button" onClick={() => setMucCuoi(m.ma)} className={`min-h-[44px] rounded-xl border p-2 text-left ${mucCuoi === m.ma ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
                  <span className="block text-xs font-bold">{m.ma} · {m.ten}</span>
                </button>
              ))}
            </div>
            {cauSoSanhMucGiao(g.muc_giao, mucCuoi) && <p className="mt-2 rounded-lg bg-[#A8763E]/10 px-3 py-2 text-xs font-medium text-[#8A5E2C]">{cauSoSanhMucGiao(g.muc_giao, mucCuoi)}</p>}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose}>Huỷ</Button>
          <Button variant="outline" className="border-amber-300 text-amber-800" onClick={() => luu('chua_dat')} disabled={dangLuu}>Chưa đạt</Button>
          <Button onClick={() => luu('dat')} disabled={dangLuu || !duTich}>Đạt</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
