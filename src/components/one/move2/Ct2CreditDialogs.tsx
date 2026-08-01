import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight, Banknote, Send } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { hanGoiY } from '@/lib/ct2';
import {
  HS_COT, HS_TEN_CAP, HS_TEN_KY_HAN, HS_TEN_LOAI, buocKeTiep, canhBaoHoSo,
  dinhDangTien, docSoTien, hsTuoiCho, kiemTraHoSo, lyDoChanChuyenHoSo,
  type HoSoTinDung, type HsCap, type HsFormTao, type HsLoai, type HsTrangThai,
} from '@/lib/ct2TinDung';
import type { Ct2NhanSu } from './useCt2Data';
import {
  ct2GhiNhipHoSo, ct2SuaHoSo, ct2TaoHoSo, useCt2LamTuoiHoSo, useCt2NhatKyHoSo,
} from './useCt2TinDung';

/**
 * Hai hộp thoại của bàn Phê duyệt tín dụng.
 *
 * Cùng triết lý nhập với bàn đầu việc: hỏi ít, hỏi bằng lời thường, chọn thay
 * vì gõ. Nhưng hồ sơ tín dụng có rủi ro tài chính nên KHÔNG hoãn trường nào
 * sang sau: số tiền, cấp phê duyệt và hạn xử lý phải có ngay từ lúc mở hồ sơ —
 * thiếu chúng thì bàn Kanban không trả lời được câu hỏi nào cả.
 */

// ---------------------------------------------------------------------------
// Mở hồ sơ mới
// ---------------------------------------------------------------------------

const FORM_TRONG: HsFormTao = {
  khach_hang: '', loai_ho_so: 'TAI_CAP', so_tien: '', ky_han: 'NGAN_HAN',
  cap_phe_duyet: 'CHI_NHANH', can_bo: '', han_xu_ly: '', ngay_den_han_ghtd: '',
};

export function Ct2CreditCreateDialog({ open, phongId, nhanSu, onClose, onXong }: {
  open: boolean;
  phongId: string | null;
  nhanSu: Ct2NhanSu[];
  onClose: () => void;
  onXong: () => void;
}) {
  const { profileId } = useAuth();
  const lamTuoi = useCt2LamTuoiHoSo();
  const [f, setF] = useState<HsFormTao>(FORM_TRONG);
  const [dangGui, setDangGui] = useState(false);
  const mocHan = useMemo(() => hanGoiY(), []);

  useEffect(() => {
    if (!open) return;
    setF({ ...FORM_TRONG, can_bo: profileId ?? '' });
  }, [open, profileId]);

  const thieu = useMemo(() => kiemTraHoSo(f), [f]);
  const nguoiTrongPhong = useMemo(
    () => nhanSu.filter((n) => n.department_id === phongId),
    [nhanSu, phongId],
  );
  const soTien = docSoTien(f.so_tien);
  const dat = <K extends keyof HsFormTao>(k: K, v: HsFormTao[K]) => setF((c) => ({ ...c, [k]: v }));
  // Tái cấp/điều chỉnh thì hạn mức cũ đến hạn ngày nào là thông tin cốt lõi
  const canNgayDenHan = f.loai_ho_so === 'TAI_CAP' || f.loai_ho_so === 'DIEU_CHINH';

  const luu = async () => {
    if (!profileId || !phongId || thieu.length > 0) return;
    setDangGui(true);
    const { error } = await ct2TaoHoSo({
      phong: phongId,
      khach_hang: f.khach_hang.trim(),
      loai_ho_so: f.loai_ho_so,
      so_tien: soTien,
      ky_han: f.ky_han,
      cap_phe_duyet: f.cap_phe_duyet,
      can_bo: f.can_bo,
      han_xu_ly: f.han_xu_ly,
      ngay_den_han_ghtd: f.ngay_den_han_ghtd || null,
      nguoi_tao: profileId,
    });
    setDangGui(false);
    if (error) { toast.error(error); return; }
    toast.success('Đã mở hồ sơ — nằm ở cột «Thu thập hồ sơ».');
    lamTuoi(); onXong(); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-4 w-4" /> Mở hồ sơ tín dụng
          </DialogTitle>
          <DialogDescription>
            Hồ sơ tín dụng có rủi ro tài chính nên số tiền, cấp phê duyệt và hạn xử lý
            phải rõ ngay từ đầu — thiếu chúng thì bảng không cảnh báo được gì.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="hs-khach_hang">Khách hàng</Label>
            <Input id="hs-khach_hang" value={f.khach_hang} autoFocus
              onChange={(e) => dat('khach_hang', e.target.value)}
              placeholder="VD: Công ty CP Tập đoàn Thaicom" />
            <p className="mt-1 text-2xs text-slate-500">
              Chỉ tên khách hàng — loại việc chọn ở ô dưới, không gộp vào đây.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="hs-loai">Loại hồ sơ</Label>
              <Select value={f.loai_ho_so} onValueChange={(v) => dat('loai_ho_so', v)}>
                <SelectTrigger id="hs-loai"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(HS_TEN_LOAI) as HsLoai[]).map((k) => (
                    <SelectItem key={k} value={k}>{HS_TEN_LOAI[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="hs-ky_han">Kỳ hạn</Label>
              <Select value={f.ky_han} onValueChange={(v) => dat('ky_han', v)}>
                <SelectTrigger id="hs-ky_han"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NGAN_HAN">{HS_TEN_KY_HAN.NGAN_HAN}</SelectItem>
                  <SelectItem value="TRUNG_DAI_HAN">{HS_TEN_KY_HAN.TRUNG_DAI_HAN}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="hs-so_tien">Số tiền (triệu đồng)</Label>
              <Input id="hs-so_tien" inputMode="numeric" value={f.so_tien}
                onChange={(e) => dat('so_tien', e.target.value)} placeholder="160000" />
              <p className="mt-1 text-2xs text-slate-500">
                {soTien !== null && soTien > 0
                  ? <span className="font-medium text-brand-navy">= {dinhDangTien(soTien)}</span>
                  : 'Nhập số, đơn vị triệu đồng (160000 = 160 tỷ)'}
              </p>
            </div>
            <div>
              <Label htmlFor="hs-cap">Cấp phê duyệt</Label>
              <Select value={f.cap_phe_duyet} onValueChange={(v) => dat('cap_phe_duyet', v)}>
                <SelectTrigger id="hs-cap"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(HS_TEN_CAP) as HsCap[]).map((k) => (
                    <SelectItem key={k} value={k}>{HS_TEN_CAP[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="hs-can_bo">Cán bộ phụ trách (đúng 01 người)</Label>
            <Select value={f.can_bo} onValueChange={(v) => dat('can_bo', v)}>
              <SelectTrigger id="hs-can_bo"><SelectValue placeholder="Chọn cán bộ" /></SelectTrigger>
              <SelectContent>
                {profileId && nguoiTrongPhong.some((n) => n.id === profileId) && (
                  <SelectItem value={profileId}>Tôi</SelectItem>
                )}
                {nguoiTrongPhong.filter((n) => n.id !== profileId).map((n) => (
                  <SelectItem key={n.id} value={n.id}>{n.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Hạn xử lý hồ sơ</Label>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {mocHan.map((m) => (
                <button key={m.ngay} type="button" onClick={() => dat('han_xu_ly', m.ngay)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    f.han_xu_ly === m.ngay
                      ? 'border-brand-navy bg-brand-navy text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-brand-navy/40'
                  }`}>
                  {m.nhan}
                </button>
              ))}
              <input type="date" className="h-8 rounded-lg border border-slate-200 px-2 text-xs"
                value={f.han_xu_ly} onChange={(e) => dat('han_xu_ly', e.target.value)} />
            </div>
          </div>

          {canNgayDenHan && (
            <div>
              <Label htmlFor="hs-den_han">Hạn mức hiện tại đến hạn ngày</Label>
              <Input id="hs-den_han" type="date" value={f.ngay_den_han_ghtd}
                onChange={(e) => dat('ngay_den_han_ghtd', e.target.value)} />
              <p className="mt-1 text-2xs text-slate-500">
                Có ngày này thì hệ thống cảnh báo sớm 60 ngày trước khi hạn mức của khách hết.
              </p>
            </div>
          )}
        </div>

        {thieu.length > 0 && (
          <p className="flex flex-wrap gap-1.5 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600">
            <span>Còn thiếu:</span>
            {thieu.map((t) => (
              <span key={t.truong} className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700">
                {t.ten}{t.ly_do ? ` (${t.ly_do})` : ''}
              </span>
            ))}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
          <Button onClick={luu} disabled={thieu.length > 0 || dangGui}>
            {dangGui ? 'Đang lưu…' : 'Mở hồ sơ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Chi tiết hồ sơ + chuyển bước + nhật ký
// ---------------------------------------------------------------------------

export function Ct2CreditCardDialog({ hoSo, nhanSu, laLanhDao, chuyenDen, onClose, onXong }: {
  hoSo: HoSoTinDung | null;
  nhanSu: Ct2NhanSu[];
  laLanhDao: boolean;
  chuyenDen: HsTrangThai | null;
  onClose: () => void;
  onXong: () => void;
}) {
  const { profileId } = useAuth();
  const lamTuoi = useCt2LamTuoiHoSo();
  const { data: nhatKy = [] } = useCt2NhatKyHoSo(hoSo?.id ?? null);
  const tenNguoi = useMemo(() => new Map(nhanSu.map((n) => [n.id, n.full_name])), [nhanSu]);

  const [den, setDen] = useState<HsTrangThai>('THU_THAP');
  const [nguoiGiu, setNguoiGiu] = useState('');
  const [lyDo, setLyDo] = useState('');
  const [cauNhip, setCauNhip] = useState('');
  const [dangGui, setDangGui] = useState(false);

  useEffect(() => {
    if (!hoSo) return;
    setDen(chuyenDen ?? buocKeTiep(hoSo.trang_thai, hoSo.cap_phe_duyet) ?? hoSo.trang_thai);
    setNguoiGiu(hoSo.nguoi_dang_giu ?? '');
    setLyDo('');
    setCauNhip('');
  }, [hoSo, chuyenDen]);

  if (!hoSo) return null;

  const laCanBo = hoSo.can_bo === profileId;
  const suaDuoc = laLanhDao || laCanBo;
  const canhBao = canhBaoHoSo(hoSo);
  const canNguoiGiu = den === 'TRINH_LDP' || den === 'TRINH_LDCN';
  const lyDoChan = lyDoChanChuyenHoSo(hoSo.trang_thai, den, {
    cap_phe_duyet: hoSo.cap_phe_duyet,
    laLanhDao,
    coLyDoTuChoi: lyDo.trim().length >= 20,
  });

  const chuyen = async () => {
    if (den === hoSo.trang_thai) return;
    if (lyDoChan) { toast.error(lyDoChan); return; }
    if (canNguoiGiu && !nguoiGiu) {
      toast.error('Trình cấp trên phải chọn người đang giữ hồ sơ — để đồng hồ chờ tính đúng người.');
      return;
    }
    setDangGui(true);
    const { error } = await ct2SuaHoSo(hoSo.id, {
      trang_thai: den,
      nguoi_dang_giu: canNguoiGiu ? nguoiGiu : null,
      ...(den === 'TU_CHOI' ? { ly_do_tu_choi: lyDo.trim() } : {}),
    });
    setDangGui(false);
    if (error) { toast.error(error); return; }
    toast.success(`Đã chuyển sang «${HS_COT.find((c) => c.ma === den)?.ten}».`);
    lamTuoi(); onXong();
  };

  const ghiNhip = async () => {
    if (!profileId || cauNhip.trim().length < 10) return;
    setDangGui(true);
    const { error } = await ct2GhiNhipHoSo({
      ho_so_id: hoSo.id,
      nguoi_ghi: profileId,
      buoc: hoSo.trang_thai,
      noi_dung: cauNhip.trim(),
      vuong_mac: null,
    });
    setDangGui(false);
    if (error) { toast.error(error); return; }
    setCauNhip('');
    lamTuoi(); onXong();
  };

  return (
    <Dialog open={!!hoSo} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-6 text-left">
            <span className="font-mono text-xs text-slate-400">{hoSo.ma_hs}</span>
            <Badge variant="outline">{HS_TEN_LOAI[hoSo.loai_ho_so]}</Badge>
            {hoSo.cap_phe_duyet === 'TSC' && (
              <Badge variant="outline" className="border-red-300 text-red-700">Trình TSC</Badge>
            )}
            <span className="w-full text-base leading-snug">{hoSo.khach_hang}</span>
          </DialogTitle>
          <DialogDescription className="text-left">
            <span className="font-semibold text-brand-navy">{dinhDangTien(hoSo.so_tien)}</span>
            {' · '}{HS_TEN_KY_HAN[hoSo.ky_han]}
            {' · '}{HS_TEN_CAP[hoSo.cap_phe_duyet]}
            {' · hạn xử lý '}{new Date(`${hoSo.han_xu_ly}T00:00:00`).toLocaleDateString('vi-VN')}
          </DialogDescription>
        </DialogHeader>

        {canhBao.length > 0 && (
          <div className="space-y-1">
            {canhBao.map((c) => (
              <p key={c.noi_dung} className={`rounded-lg px-2.5 py-1.5 text-sm ${
                c.muc === 'DO' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'
              }`}>
                {c.muc === 'DO' ? '🔴' : '🟡'} {c.noi_dung}
              </p>
            ))}
          </div>
        )}

        <div className="grid gap-2 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-2">
          <O ten="Cán bộ phụ trách" gia={tenNguoi.get(hoSo.can_bo) ?? '—'} />
          <O ten="Bước hiện tại" gia={HS_COT.find((c) => c.ma === hoSo.trang_thai)?.ten ?? '—'} />
          <O ten="Ngày nhận hồ sơ" gia={new Date(`${hoSo.ngay_nhan}T00:00:00`).toLocaleDateString('vi-VN')} />
          <O ten="Hạn mức đến hạn"
            gia={hoSo.ngay_den_han_ghtd
              ? new Date(`${hoSo.ngay_den_han_ghtd}T00:00:00`).toLocaleDateString('vi-VN')
              : '— chưa ghi'} />
          {hoSo.nguoi_dang_giu && (
            <O ten="Hồ sơ đang ở"
              gia={`${tenNguoi.get(hoSo.nguoi_dang_giu) ?? '—'} — đã ${hsTuoiCho(hoSo)} ngày`} />
          )}
          {hoSo.ly_do_tu_choi && <O ten="Lý do dừng" gia={hoSo.ly_do_tu_choi} />}
        </div>

        {suaDuoc && (
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="mb-2 text-sm font-semibold text-brand-navy">Chuyển bước</p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-48">
                <Label className="text-xs">Bước tiếp theo</Label>
                <Select value={den} onValueChange={(v) => setDen(v as HsTrangThai)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HS_COT.map((c) => (
                      <SelectItem key={c.ma} value={c.ma}>{c.icon} {c.ten}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {canNguoiGiu && (
                <div className="min-w-48">
                  <Label className="text-xs">Trình ai?</Label>
                  <Select value={nguoiGiu} onValueChange={setNguoiGiu}>
                    <SelectTrigger><SelectValue placeholder="Chọn người duyệt" /></SelectTrigger>
                    <SelectContent>
                      {nhanSu.map((n) => <SelectItem key={n.id} value={n.id}>{n.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={chuyen} disabled={dangGui || den === hoSo.trang_thai}>
                <ArrowRight className="mr-1 h-4 w-4" /> Chuyển
              </Button>
            </div>
            {den === 'TU_CHOI' && (
              <div className="mt-2">
                <Label className="text-xs">Lý do dừng/từ chối (≥ 20 ký tự, lưu vết)</Label>
                <Textarea rows={2} value={lyDo} onChange={(e) => setLyDo(e.target.value)} />
              </div>
            )}
            {den !== hoSo.trang_thai && lyDoChan && (
              <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">{lyDoChan}</p>
            )}
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-semibold text-brand-navy">
            Nhật ký hồ sơ ({nhatKy.length}) — chỉ thêm, không sửa/xóa
          </p>
          {suaDuoc && (
            <div className="mb-2 flex items-end gap-2">
              <Textarea rows={2} value={cauNhip} onChange={(e) => setCauNhip(e.target.value)}
                placeholder="Hôm nay hồ sơ đi tới đâu? Vướng gì? VD: Đã bổ sung BCTC kiểm toán, chờ ý kiến thẩm định." />
              <Button onClick={ghiNhip} disabled={dangGui || cauNhip.trim().length < 10}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {nhatKy.length === 0 && (
              <p className="text-sm text-slate-500">Chưa có dòng nào.</p>
            )}
            {nhatKy.map((n) => (
              <div key={n.id} className="rounded-xl border border-slate-200 p-2.5 text-sm">
                <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{tenNguoi.get(n.nguoi_ghi) ?? '—'}</span>
                  <span>{new Date(n.ghi_luc).toLocaleString('vi-VN')}</span>
                  <Badge variant="outline" className="px-1 py-0 text-2xs font-normal">
                    {HS_COT.find((c) => c.ma === n.buoc)?.ten ?? n.buoc}
                  </Badge>
                </p>
                <p className="mt-1 whitespace-pre-wrap text-slate-800">{n.noi_dung}</p>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function O({ ten, gia }: { ten: string; gia: string }) {
  return (
    <p>
      <span className="text-xs uppercase tracking-wide text-slate-400">{ten}</span>
      <span className="block text-slate-800">{gia}</span>
    </p>
  );
}
