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
  dinhDangTien, docSoTien, hsCanGhiNhipNgay, hsSuaDuocSoTien, hsThieuDeVaoThuThap,
  hsTuoiCho, kiemTraHoSo,
  lyDoChanChuyenHoSo,
  type HoSoTinDung, type HsCap, type HsFormTao, type HsKyHan, type HsLoai,
  type HsTrangThai,
} from '@/lib/ct2TinDung';
import {
  useCt2DsPgd, useCt2PgdCuaPhong, useCt2Phong, type Ct2NhanSu,
} from './useCt2Data';
import { Ct2CapPhuTrach } from './Ct2CapPhuTrach';
import { Ct2DongThoiGian, type NguoiTraoDoi } from './Ct2DongThoiGian';
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
  const { data: phongs = [] } = useCt2Phong();
  const { data: dsPgd = [] } = useCt2DsPgd();
  const { data: pgdCuaPhong = '' } = useCt2PgdCuaPhong(hoSo?.phong ?? null);
  // Ba vai gắn với một hồ sơ: cán bộ làm, lãnh đạo theo dõi, người đang cầm hồ sơ
  const nguoiLienQuan = useMemo<NguoiTraoDoi[]>(() => {
    if (!hoSo) return [];
    const ds: NguoiTraoDoi[] = [];
    const them = (id: string | null | undefined, vaiTro: string) => {
      if (id && !ds.some((x) => x.id === id)) ds.push({ id, ten: tenNguoi.get(id) ?? 'Đồng nghiệp', vaiTro });
    };
    them(hoSo.can_bo, 'cán bộ phụ trách');
    them(hoSo.lanh_dao_theo_doi, 'lãnh đạo theo dõi');
    them(hoSo.nguoi_dang_giu, 'đang giữ hồ sơ');
    return ds;
  }, [hoSo, tenNguoi]);

  const [den, setDen] = useState<HsTrangThai>('THU_THAP');
  const [nguoiGiu, setNguoiGiu] = useState('');
  const [lyDo, setLyDo] = useState('');
  const [cauNhip, setCauNhip] = useState('');
  const [dangGui, setDangGui] = useState(false);
  // Form «Bổ sung thông tin» — chuỗi rỗng = ô đang trống trên hồ sơ.
  // khach_hang/can_bo/loai_ho_so nhập sẵn giá trị hiện có: đây là SỬA chứ
  // không phải bổ sung, để trống không có nghĩa gì với chúng.
  const [bs, setBs] = useState({
    so_tien: '', ky_han: '' as HsKyHan | '', han_xu_ly: '', ngay_nhan: '', ngay_den_han_ghtd: '',
    khach_hang: '', can_bo: '', loai_ho_so: '' as HsLoai | '',
  });

  useEffect(() => {
    if (!hoSo) return;
    setDen(chuyenDen ?? buocKeTiep(hoSo.trang_thai, hoSo.cap_phe_duyet) ?? hoSo.trang_thai);
    setNguoiGiu(hoSo.nguoi_dang_giu ?? '');
    setLyDo('');
    setCauNhip('');
    setBs({
      so_tien: hoSo.so_tien === null ? '' : String(hoSo.so_tien),
      ky_han: hoSo.ky_han ?? '',
      han_xu_ly: hoSo.han_xu_ly ?? '',
      ngay_nhan: hoSo.ngay_nhan ?? '',
      ngay_den_han_ghtd: hoSo.ngay_den_han_ghtd ?? '',
      khach_hang: hoSo.khach_hang,
      can_bo: hoSo.can_bo,
      loai_ho_so: hoSo.loai_ho_so,
    });
  }, [hoSo, chuyenDen]);

  if (!hoSo) return null;

  const laCanBo = hoSo.can_bo === profileId;
  const suaDuoc = laLanhDao || laCanBo;
  const canhBao = canhBaoHoSo(hoSo);
  const canNguoiGiu = den === 'TRINH_LDP' || den === 'TRINH_LDCN';

  /*
    «Trình ai?» phải là danh sách CẤP DUYỆT, không phải danh bạ Chi nhánh.
    Bày cả 102 cán bộ ra đây vừa mời chọn nhầm, vừa vô nghĩa: một chuyên viên
    không duyệt được hồ sơ tín dụng. Nay suy thẳng từ cấp phụ trách đã gán:
      · Trình Lãnh đạo Phòng  → Phó phòng / Trưởng phòng của phòng giữ hồ sơ
      · Trình LĐ Chi nhánh    → PGĐ phụ trách và các PGĐ/Giám đốc khác
    Trình TSC không hỏi người — cấp duyệt đó nằm ngoài Chi nhánh.
  */
  const dsTrinh = (() => {
    const ds: Array<{ id: string; ghi?: string }> = [];
    const them = (id: string | null | undefined, ghi?: string) => {
      if (id && !ds.some((x) => x.id === id)) ds.push({ id, ghi });
    };
    if (den === 'TRINH_LDP') {
      them(hoSo.pho_phong, 'Phó phòng');
      them(hoSo.truong_phong, 'Trưởng phòng');
      them(phongs.find((p) => p.id === hoSo.phong)?.manager_id, 'Trưởng phòng');
    } else if (den === 'TRINH_LDCN') {
      them(hoSo.pgd_phu_trach, 'PGĐ phụ trách');
      them(pgdCuaPhong, 'PGĐ phụ trách');
      for (const n of dsPgd) them(n.id, 'Lãnh đạo Chi nhánh');
    }
    return ds;
  })();
  const lyDoChan = lyDoChanChuyenHoSo(hoSo.trang_thai, den, {
    cap_phe_duyet: hoSo.cap_phe_duyet,
    laLanhDao,
    coLyDoTuChoi: lyDo.trim().length >= 20,
    // Thẻ dự kiến rời cột phải điền đủ ba trường — cùng luật trigger DB gác,
    // nêu ở đây để người dùng thấy TRƯỚC khi bấm, kèm mục «Bổ sung» ngay dưới
    thieuDeVaoThuThap: hsThieuDeVaoThuThap(hoSo),
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

  // Những ô đang trống trên hồ sơ — để mở sẵn mục bổ sung và tô đúng ô
  const oTrong = {
    so_tien: hoSo.so_tien === null,
    ky_han: !hoSo.ky_han,
    han_xu_ly: !hoSo.han_xu_ly,
    ngay_nhan: !hoSo.ngay_nhan,
    ngay_den_han_ghtd: !hoSo.ngay_den_han_ghtd
      && (hoSo.loai_ho_so === 'TAI_CAP' || hoSo.loai_ho_so === 'DIEU_CHINH'),
  };
  const soOTrong = Object.values(oTrong).filter(Boolean).length;
  const suaDuocTien = hsSuaDuocSoTien(hoSo, laLanhDao);
  const tienBoSung = bs.so_tien.trim() === '' ? null : docSoTien(bs.so_tien);

  /**
   * Chỉ gửi những trường THAY ĐỔI — và chặn trước ở client đúng các luật mà
   * database sẽ chặn sau (xoá trắng, hạn trước ngày nhận), để người dùng nhận
   * câu tiếng Việt tử tế thay vì lỗi constraint.
   */
  const luuBoSung = async () => {
    const doi: Record<string, unknown> = {};

    // Ba trường điều phối — chỉ lãnh đạo Phòng (form cũng chỉ bày cho họ);
    // trigger f_ct2_hs_truoc_sua là hàng rào thật, đây chặn trước cho tử tế
    if (laLanhDao) {
      if (bs.khach_hang.trim().length < 3) {
        toast.error('Tên khách hàng cần từ 3 ký tự — không để trống được.');
        return;
      }
      if (bs.khach_hang.trim() !== hoSo.khach_hang) doi.khach_hang = bs.khach_hang.trim();
      if (bs.can_bo && bs.can_bo !== hoSo.can_bo) doi.can_bo = bs.can_bo;
      if (bs.loai_ho_so && bs.loai_ho_so !== hoSo.loai_ho_so) doi.loai_ho_so = bs.loai_ho_so;
    }

    if (bs.so_tien.trim() === '') {
      if (hoSo.so_tien !== null) {
        toast.error('Không xoá trắng được số tiền đã có — chỉ sửa thành số khác.');
        return;
      }
    } else {
      if (tienBoSung === null || tienBoSung <= 0) {
        toast.error('Số tiền phải là số dương, đơn vị triệu đồng (160000 = 160 tỷ).');
        return;
      }
      if (tienBoSung !== hoSo.so_tien) doi.so_tien = tienBoSung;
    }

    if (bs.ky_han && bs.ky_han !== hoSo.ky_han) doi.ky_han = bs.ky_han;

    if (bs.han_xu_ly === '' && hoSo.han_xu_ly) {
      toast.error('Không xoá trắng được hạn xử lý đã có — chỉ dời sang ngày khác.');
      return;
    }
    const hanSau = bs.han_xu_ly || hoSo.han_xu_ly;
    const nhanSau = bs.ngay_nhan || hoSo.ngay_nhan;
    if (hanSau && nhanSau && hanSau < nhanSau) {
      toast.error('Hạn xử lý phải từ ngày nhận hồ sơ trở đi.');
      return;
    }
    if (bs.han_xu_ly && bs.han_xu_ly !== hoSo.han_xu_ly) doi.han_xu_ly = bs.han_xu_ly;
    if (bs.ngay_nhan && bs.ngay_nhan !== hoSo.ngay_nhan) doi.ngay_nhan = bs.ngay_nhan;
    if (bs.ngay_den_han_ghtd && bs.ngay_den_han_ghtd !== hoSo.ngay_den_han_ghtd) {
      doi.ngay_den_han_ghtd = bs.ngay_den_han_ghtd;
    }

    if (Object.keys(doi).length === 0) {
      toast.info('Chưa có gì thay đổi để lưu.');
      return;
    }
    setDangGui(true);
    const { error } = await ct2SuaHoSo(hoSo.id, doi);
    setDangGui(false);
    if (error) { toast.error(error); return; }
    toast.success(`Đã lưu ${Object.keys(doi).length} thông tin bổ sung.`);
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
            <span className={`font-semibold ${hoSo.so_tien === null ? 'text-amber-700' : 'text-brand-navy'}`}>
              {dinhDangTien(hoSo.so_tien)}
            </span>
            {' · '}{hoSo.ky_han ? HS_TEN_KY_HAN[hoSo.ky_han] : 'chưa ghi kỳ hạn'}
            {' · '}{HS_TEN_CAP[hoSo.cap_phe_duyet]}
            {' · hạn xử lý '}{ngayVn(hoSo.han_xu_ly, 'chưa có')}
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
          <O ten="Ngày nhận hồ sơ" gia={ngayVn(hoSo.ngay_nhan, '— chưa ghi')} />
          <O ten="Hạn mức đến hạn" gia={ngayVn(hoSo.ngay_den_han_ghtd, '— chưa ghi')} />
          {hoSo.nguoi_dang_giu && (
            <O ten="Hồ sơ đang ở"
              gia={`${tenNguoi.get(hoSo.nguoi_dang_giu) ?? '—'} — đã ${hsTuoiCho(hoSo)} ngày`} />
          )}
          {hoSo.ly_do_tu_choi && <O ten="Lý do dừng" gia={hoSo.ly_do_tu_choi} />}
          {/*
            Cùng khối, cùng luật với thẻ Kanban: hồ sơ tín dụng cũng phải biết
            ai là lãnh đạo theo dõi và ba cấp phụ trách — đây là nơi khoản vay
            đi qua, không phải nơi ít cần giám sát hơn.
          */}
          <Ct2CapPhuTrach
            phongId={hoSo.phong} nguoiLam={hoSo.can_bo}
            gia={hoSo} nhanSu={nhanSu} suaDuoc={laLanhDao}
            onLuu={(v) => ct2SuaHoSo(hoSo.id, v)}
            onXong={() => { lamTuoi(); onXong(); }}
          />
        </div>

        {/*
          Bổ sung thông tin còn thiếu — cảnh báo «chưa ghi» mà không có chỗ điền
          ngay tại đây là ngõ cụt: người dùng thấy lỗi nhưng phải đi tìm đường
          sửa. 47 hồ sơ nhập từ Miro thiếu nhiều trường, mục này là đường bổ
          sung cho đợt đó và cho cả về sau (VD điền hạn mức mới sau khi tái cấp).
        */}
        {suaDuoc && (
          <div className={`rounded-xl border p-3 ${soOTrong > 0 ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'}`}>
            <p className="mb-2 text-sm font-semibold text-brand-navy">
              Bổ sung / sửa thông tin
              {soOTrong > 0 && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  {soOTrong} ô còn trống
                </span>
              )}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {/*
                Ba trường điều phối — theo đề xuất của Trưởng phòng KHDN
                (08/2026): tên gõ sai, hồ sơ cần giao lại người khác, loại chọn
                nhầm đều phải sửa được tại chỗ. Chỉ lãnh đạo Phòng thấy các ô
                này; trigger f_ct2_hs_truoc_sua chặn ở DB và mọi lần đổi tên /
                đổi cán bộ đều ghi nhật ký + báo người được giao.
              */}
              {laLanhDao && (
                <>
                  <div className="sm:col-span-2">
                    <Label htmlFor="bs-khach_hang" className="text-xs">Tên khách hàng</Label>
                    <Input id="bs-khach_hang" value={bs.khach_hang}
                      onChange={(e) => setBs((c) => ({ ...c, khach_hang: e.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="bs-can_bo" className="text-xs">Cán bộ phụ trách</Label>
                    <Select value={bs.can_bo}
                      onValueChange={(v) => setBs((c) => ({ ...c, can_bo: v }))}>
                      <SelectTrigger id="bs-can_bo"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {nhanSu.filter((n) => n.department_id === hoSo.phong).map((n) => (
                          <SelectItem key={n.id} value={n.id}>{n.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {bs.can_bo !== hoSo.can_bo && (
                      <p className="mt-1 text-2xs text-amber-700">
                        Giao lại hồ sơ: người mới sẽ nhận thông báo, lần đổi được lưu vết.
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="bs-loai" className="text-xs">Loại hồ sơ</Label>
                    <Select value={bs.loai_ho_so}
                      onValueChange={(v) => setBs((c) => ({ ...c, loai_ho_so: v as HsLoai }))}>
                      <SelectTrigger id="bs-loai"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(HS_TEN_LOAI) as HsLoai[]).map((k) => (
                          <SelectItem key={k} value={k}>{HS_TEN_LOAI[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="bs-so_tien" className="text-xs">Số tiền (triệu đồng)</Label>
                <Input id="bs-so_tien" inputMode="numeric" value={bs.so_tien}
                  disabled={!suaDuocTien}
                  onChange={(e) => setBs((c) => ({ ...c, so_tien: e.target.value }))}
                  placeholder="160000"
                  className={oTrong.so_tien ? 'border-amber-400' : ''} />
                <p className="mt-1 text-2xs text-slate-500">
                  {!suaDuocTien
                    ? 'Đổi số tiền đã có cần lãnh đạo Phòng — mọi lần đổi đều lưu vết.'
                    : tienBoSung !== null && tienBoSung > 0
                      ? <span className="font-medium text-brand-navy">= {dinhDangTien(tienBoSung)}</span>
                      : oTrong.so_tien ? 'Đang trống — hồ sơ này chưa vào tổng dư nợ' : ''}
                </p>
              </div>
              <div>
                <Label htmlFor="bs-ky_han" className="text-xs">Kỳ hạn</Label>
                <Select value={bs.ky_han}
                  onValueChange={(v) => setBs((c) => ({ ...c, ky_han: v as HsKyHan }))}>
                  <SelectTrigger id="bs-ky_han" className={oTrong.ky_han ? 'border-amber-400' : ''}>
                    <SelectValue placeholder="— chưa ghi —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NGAN_HAN">{HS_TEN_KY_HAN.NGAN_HAN}</SelectItem>
                    <SelectItem value="TRUNG_DAI_HAN">{HS_TEN_KY_HAN.TRUNG_DAI_HAN}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bs-han_xu_ly" className="text-xs">Hạn xử lý hồ sơ</Label>
                <Input id="bs-han_xu_ly" type="date" value={bs.han_xu_ly}
                  onChange={(e) => setBs((c) => ({ ...c, han_xu_ly: e.target.value }))}
                  className={oTrong.han_xu_ly ? 'border-amber-400' : ''} />
                {oTrong.han_xu_ly && (
                  <p className="mt-1 text-2xs text-slate-500">Đang trống — không đo được đúng hẹn hay trễ</p>
                )}
              </div>
              <div>
                <Label htmlFor="bs-ngay_nhan" className="text-xs">Ngày nhận hồ sơ</Label>
                <Input id="bs-ngay_nhan" type="date" value={bs.ngay_nhan}
                  onChange={(e) => setBs((c) => ({ ...c, ngay_nhan: e.target.value }))}
                  className={oTrong.ngay_nhan ? 'border-amber-400' : ''} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="bs-den_han" className="text-xs">Hạn mức hiện tại đến hạn ngày</Label>
                <Input id="bs-den_han" type="date" value={bs.ngay_den_han_ghtd}
                  onChange={(e) => setBs((c) => ({ ...c, ngay_den_han_ghtd: e.target.value }))}
                  className={oTrong.ngay_den_han_ghtd ? 'border-amber-400' : ''} />
                <p className="mt-1 text-2xs text-slate-500">
                  {hoSo.trang_thai === 'HOAN_THANH'
                    ? 'Hồ sơ đã xong: điền ngày hết hạn của HẠN MỨC MỚI vừa cấp — để hệ thống nhắc tái cấp sớm 60 ngày cho chu kỳ sau.'
                    : 'Có ngày này thì hệ thống cảnh báo sớm 60 ngày trước khi hạn mức của khách hết.'}
                </p>
              </div>
            </div>
            <div className="mt-2 flex justify-end">
              <Button size="sm" onClick={luuBoSung} disabled={dangGui}>
                {dangGui ? 'Đang lưu…' : 'Lưu thông tin'}
              </Button>
            </div>
          </div>
        )}

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
                  <Label className="text-xs">
                    Trình ai? <span className="text-slate-400">
                      — {den === 'TRINH_LDP' ? 'lãnh đạo Phòng' : 'lãnh đạo Chi nhánh'}
                    </span>
                  </Label>
                  <Select value={nguoiGiu} onValueChange={setNguoiGiu}>
                    <SelectTrigger><SelectValue placeholder="Chọn người duyệt" /></SelectTrigger>
                    <SelectContent>
                      {dsTrinh.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {tenNguoi.get(n.id) ?? '—'}{n.ghi ? ` (${n.ghi})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {dsTrinh.length === 0 && (
                    <p className="mt-1 text-2xs font-medium text-amber-700">
                      Hồ sơ chưa gán cấp phụ trách — bổ sung ở mục «Cấp phụ trách» phía trên.
                    </p>
                  )}
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

        {/* Cửa viết BÁO CÁO — tách khỏi ô trao đổi trong Dòng thời gian bên dưới */}
        {suaDuoc && hsCanGhiNhipNgay(hoSo) && (
          <div className="rounded-xl border-2 border-brand-navy/20 bg-blue-50/40 p-3">
            <p className="mb-2 flex flex-wrap items-baseline gap-2 text-sm font-semibold text-brand-navy">
              Ghi nhịp hồ sơ
              <span className="text-2xs font-normal text-slate-500">— thành một dòng 📊 Báo cáo trong Dòng thời gian</span>
            </p>
            <div className="flex items-end gap-2">
              <Textarea rows={2} className="bg-white" value={cauNhip} onChange={(e) => setCauNhip(e.target.value)}
                placeholder="Hôm nay hồ sơ đi tới đâu? Vướng gì? VD: Đã bổ sung BCTC kiểm toán, chờ ý kiến thẩm định." />
              <Button onClick={ghiNhip} disabled={dangGui || cauNhip.trim().length < 10}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/*
          Thẻ ở cột dự kiến: GỠ hẳn cửa ghi nhịp thay vì để đó cho có. Ô nhập
          hỏi «hôm nay hồ sơ đi tới đâu» trên một việc còn cách hai tháng chỉ
          mời người ta gõ một câu vô nghĩa mỗi sáng. Nói rõ vì sao gỡ, và chỉ
          sang ô Trao đổi — vẫn ghi được nếu thật sự có tin.
        */}
        {suaDuoc && !hsCanGhiNhipNgay(hoSo) && (
          <p className="rounded-xl border border-violet-200 bg-violet-50/60 px-3 py-2 text-xs text-violet-800">
            Thẻ dự kiến không phải ghi nhịp hằng ngày — mốc còn xa, ghi mỗi sáng
            thành câu vô nghĩa. Có tin cần lưu (khách dời nhu cầu, đổi số tiền…)
            thì ghi ở ô <b>Trao đổi</b> phía dưới; nhịp ngày bắt đầu khi thẻ sang
            «Thu thập hồ sơ».
          </p>
        )}

        <Ct2DongThoiGian
          phamVi="HO_SO_TIN_DUNG"
          doiTuongId={hoSo.id}
          baoCao={nhatKy.map((n) => ({
            id: n.id,
            luc: n.ghi_luc,
            nguoi: n.nguoi_ghi,
            tieu_de: HS_COT.find((c) => c.ma === n.buoc)?.ten ?? n.buoc,
            noi_dung: n.noi_dung,
            chi_tiet: n.vuong_mac ? [{ nhan: 'Vướng mắc', gia: n.vuong_mac, mau: 'DO' as const }] : [],
          }))}
          nguoiLienQuan={nguoiLienQuan}
          tenNguoi={tenNguoi}
          loiMoiDau="Chưa có dòng nào — nhịp đầu tiên của hồ sơ sẽ mở mạch chuyện."
          goiY="Hỏi thẳng ở đây thay vì gọi điện — VD «Hồ sơ vướng gì ạ?», «Cần bổ sung giấy tờ nào?»."
          onXong={() => lamTuoi()}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Ngày dạng «31/07/2026», ô trống thì nói rõ là trống.
 * Không để `new Date(null)` in ra "Invalid Date" — người đọc sẽ tưởng lỗi hệ thống.
 */
function ngayVn(ngay: string | null, khiTrong: string): string {
  if (!ngay) return khiTrong;
  return new Date(`${ngay}T00:00:00`).toLocaleDateString('vi-VN');
}

function O({ ten, gia }: { ten: string; gia: string }) {
  return (
    <p>
      <span className="text-xs uppercase tracking-wide text-slate-400">{ten}</span>
      <span className="block text-slate-800">{gia}</span>
    </p>
  );
}
