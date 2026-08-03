import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CalendarClock, Rocket, Star } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import {
  CT2_COT, CT2_MAU_CAU, CT2_TEN_CO, CT2_TEN_NHAN, CT2_TEN_UU_TIEN,
  daDuKeHoach, goiYNhan, kiemTraCauNhip, lyDoChanChuyen, soNgayQuaHan,
  thieuTruongBatBuoc,
  type Ct2Co, type Ct2DauViec, type Ct2NhanPdca, type Ct2TrangThai,
} from '@/lib/ct2';
import {
  ct2GhiNhip, ct2SuaDauViec, useCt2LamTuoi, useCt2NhatKy, type Ct2NhanSu,
} from './useCt2Data';
import { Ct2TrangTraoDoi, type NguoiTraoDoi } from './Ct2TrangTraoDoi';

/**
 * Chi tiết thẻ: 5W2H + Cổng B (ghi nhịp <45 giây) + nhật ký PDCA append-only
 * + chuyển trạng thái có cổng chặn + bình luận/cảm xúc.
 */

interface Props {
  the: Ct2DauViec | null;
  nhanSu: Ct2NhanSu[];
  laLanhDao: boolean;
  /** Trạng thái đích khi người dùng vừa kéo thẻ (mở dialog để bổ sung thông tin) */
  chuyenDen: Ct2TrangThai | null;
  /** Mở Cổng 2 «Bắt đầu làm» — nơi hỏi nốt 5W2H */
  onLapKeHoach: (deKhoiDong: boolean) => void;
  onClose: () => void;
  onXong: () => void;
}

const NAC_PHAN_TRAM = [0, 25, 50, 75, 100];

export function Ct2CardDialog({ the, nhanSu, laLanhDao, chuyenDen, onLapKeHoach, onClose, onXong }: Props) {
  const { profileId } = useAuth();
  const lamTuoi = useCt2LamTuoi();
  const { data: nhatKy = [] } = useCt2NhatKy(the?.id ?? null);

  const tenNguoi = useMemo(() => new Map(nhanSu.map((n) => [n.id, n.full_name])), [nhanSu]);
  // Người liên quan tới đúng thẻ này — hiện thành nút @nhắc tên một chạm
  const nguoiLienQuan = useMemo<NguoiTraoDoi[]>(() => {
    if (!the) return [];
    const ds: NguoiTraoDoi[] = [];
    const them = (id: string | null | undefined, vaiTro: string) => {
      if (id && !ds.some((x) => x.id === id)) ds.push({ id, ten: tenNguoi.get(id) ?? 'Đồng nghiệp', vaiTro });
    };
    them(the.nguoi_chiu_trach_nhiem, 'chịu trách nhiệm');
    them(the.lanh_dao_theo_doi, 'lãnh đạo theo dõi');
    them(the.nguoi_dang_giu, 'đang giữ việc');
    for (const id of the.nguoi_phoi_hop ?? []) them(id, 'phối hợp');
    return ds;
  }, [the, tenNguoi]);
  const laChuThe = the?.nguoi_chiu_trach_nhiem === profileId;
  const vong = useMemo(() => ({
    coDongP: nhatKy.some((n) => n.nhan_pdca === 'P'),
    coDongC: nhatKy.some((n) => n.nhan_pdca === 'C'),
    coDongA: nhatKy.some((n) => n.nhan_pdca === 'A'),
  }), [nhatKy]);

  if (!the) return null;

  return (
    <Dialog open={!!the} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-6 text-left">
            <span className="font-mono text-xs text-slate-400">{the.ma_hien_thi}</span>
            {the.muc_uu_tien !== 'THUONG' && (
              <Badge variant="outline" className="border-amber-300 text-amber-700">
                {the.muc_uu_tien === 'TRONG_DIEM_BGD' && <Star className="mr-1 h-3 w-3 fill-amber-400 text-amber-400" />}
                {CT2_TEN_UU_TIEN[the.muc_uu_tien]}
              </Badge>
            )}
            {the.lien_phong && <Badge variant="outline">🤝 Liên phòng</Badge>}
            <span className="w-full text-base leading-snug">{the.tieu_de}</span>
          </DialogTitle>
          <DialogDescription className="text-left">
            {CT2_TEN_CO[the.co_tinh_trang]} · {the.phan_tram}% ·{' '}
            {the.han_hoan_thanh
              ? <>hạn {new Date(`${the.han_hoan_thanh}T00:00:00`).toLocaleDateString('vi-VN')}</>
              : <span className="font-medium text-amber-700">chưa có hạn</span>}
            {soNgayQuaHan(the) > 0 && <span className="font-semibold text-red-600"> — quá hạn {soNgayQuaHan(the)} ngày</span>}
            {the.han_goc && the.han_goc !== the.han_hoan_thanh && (
              <span className="text-amber-600"> (hạn gốc {new Date(`${the.han_goc}T00:00:00`).toLocaleDateString('vi-VN')} — đã lùi, có ghi vết)</span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/*
          Ô trống phải nói ra được. Thẻ nhập từ board Miro cũ thiếu người phụ
          trách / hạn / ngày bắt đầu — nếu im lặng thì thẻ vô chủ trông sạch sẽ
          y hệt thẻ có chủ, mà «card vô chủ» là lỗi nặng nhất của quy chế §A1.
        */}
        {thieuTruongBatBuoc(the).length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-900">
              Thẻ còn thiếu {thieuTruongBatBuoc(the).length} thông tin bắt buộc
            </p>
            <p className="mt-1.5 flex flex-wrap gap-1.5">
              {thieuTruongBatBuoc(the).map((t) => (
                <span key={t.truong}
                  className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-amber-800">
                  {t.ten}{t.ly_do ? ` — ${t.ly_do}` : ''}
                </span>
              ))}
            </p>
          </div>
        )}

        {/* Chưa lập kế hoạch → mời bắt đầu, không bày ra một loạt ô trống */}
        {!daDuKeHoach(the) && the.trang_thai === 'CHUAN_BI' && (laChuThe || laLanhDao) && (
          <div className="rounded-xl border-2 border-brand-navy/20 bg-blue-50/50 p-3">
            <p className="text-sm font-semibold text-brand-navy">Sẵn sàng bắt tay vào việc này chưa?</p>
            <p className="mt-1 text-sm text-slate-600">
              Còn ba câu ngắn: xong thì có gì · phục vụ mục tiêu nào · làm theo mấy bước.
              Trả lời xong là việc chạy.
            </p>
            <Button className="mt-2" onClick={() => onLapKeHoach(true)}>
              <Rocket className="mr-1 h-4 w-4" /> Bắt đầu làm
            </Button>
          </div>
        )}

        {/* 5W2H tóm tắt */}
        <div className="grid gap-2 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-2">
          <O ten="Kết quả đầu ra" gia={the.ket_qua_dau_ra || '— chưa ghi'} />
          <O ten="Gắn mục tiêu" gia={the.muc_tieu_lien_ket || '— chưa ghi'} />
          <O ten="Người chịu trách nhiệm"
            gia={the.nguoi_chiu_trach_nhiem
              ? (tenNguoi.get(the.nguoi_chiu_trach_nhiem) ?? '—')
              : '— thẻ đang vô chủ'} />
          <O ten="Lãnh đạo theo dõi"
            gia={the.lanh_dao_theo_doi
              ? (tenNguoi.get(the.lanh_dao_theo_doi) ?? '—')
              : '— chưa ghi'} />
          <div className="sm:col-span-2"><O ten="Cách làm" gia={the.cach_lam || '— chưa ghi'} /></div>
          {the.chi_tieu_dinh_luong !== null && (
            <O ten="Chỉ tiêu" gia={`${the.chi_tieu_dinh_luong} ${the.don_vi ?? ''}`} />
          )}
          {(the.trang_thai === 'CHO_DUYET' || the.trang_thai === 'CHO_PHOI_HOP') && the.nguoi_dang_giu && (
            <O ten="Đang giữ việc" gia={`${tenNguoi.get(the.nguoi_dang_giu) ?? '—'} (đồng hồ trách nhiệm đã đổi chủ)`} />
          )}
          {daDuKeHoach(the) && (laChuThe || laLanhDao) && (
            <button
              className="text-left text-xs font-medium text-brand-navy underline underline-offset-2 sm:col-span-2"
              onClick={() => onLapKeHoach(false)}
            >
              Sửa kế hoạch làm
            </button>
          )}
        </div>

        <ChuyenTrangThai
          the={the} laLanhDao={laLanhDao} laChuThe={laChuThe} vong={vong}
          nhanSu={nhanSu} chuyenDen={chuyenDen}
          onKhoiDong={() => onLapKeHoach(true)}
          onXong={() => { lamTuoi('board'); onXong(); }}
        />

        {(laChuThe || laLanhDao || the.nguoi_phoi_hop.includes(profileId ?? '')) && (
          <FormGhiNhip
            the={the}
            cauGanNhat={nhatKy[0]?.noi_dung ?? null}
            onXong={() => { lamTuoi('nhip'); onXong(); }}
          />
        )}

        {/* Nhật ký PDCA — dòng thời gian, không sửa không xóa */}
        <div>
          <p className="mb-2 text-sm font-semibold text-brand-navy">
            Nhật ký PDCA ({nhatKy.length}) — chỉ thêm, không sửa/xóa
          </p>
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {nhatKy.length === 0 && (
              <p className="text-sm text-slate-500">
                Chưa có dòng nào. Ghi dòng <b>P (Plan)</b> đầu tiên để khởi động thẻ.
              </p>
            )}
            {nhatKy.map((n) => (
              <div key={n.id} className="rounded-xl border border-slate-200 p-2.5 text-sm">
                <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <Badge variant="outline" className="font-mono">{n.nhan_pdca}</Badge>
                  <span className="font-medium text-slate-700">{tenNguoi.get(n.nguoi_ghi) ?? '—'}</span>
                  <span>{new Date(n.ghi_luc).toLocaleString('vi-VN')}</span>
                  <span>{n.co_tinh_trang === 'XANH' ? '🟢' : n.co_tinh_trang === 'VANG' ? '🟡' : '🔴'} {n.phan_tram}%</span>
                  {n.dung_nhip === 'DUNG_GIO' && <span className="text-emerald-600">✅ đúng nhịp</span>}
                  {n.dung_nhip === 'MUON' && <span className="text-amber-600">🟡 nhịp muộn</span>}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-slate-800">{n.noi_dung}</p>
                {n.vuong_mac && <p className="mt-1 text-xs text-red-700">Đang vướng vì: {n.vuong_mac}</p>}
                {n.hanh_dong_hom_nay && <p className="text-xs text-emerald-700">Hôm nay tôi làm: {n.hanh_dong_hom_nay}</p>}
              </div>
            ))}
          </div>
        </div>

        <Ct2TrangTraoDoi
          phamVi="DAU_VIEC"
          doiTuongId={the.id}
          nguoiLienQuan={nguoiLienQuan}
          tenNguoi={tenNguoi}
          tieuDe="Trao đổi trên thẻ"
          goiY="Hỏi–đáp đúng ngữ cảnh thẻ. Sau khi gửi chỉ thu hồi được, không sửa."
          onXong={() => lamTuoi()}
        />
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

// ---------------------------------------------------------------------------
// Chuyển trạng thái — cổng chặn PDCA + thông tin bắt buộc theo cột đích
// ---------------------------------------------------------------------------

function ChuyenTrangThai({ the, laLanhDao, laChuThe, vong, nhanSu, chuyenDen, onKhoiDong, onXong }: {
  the: Ct2DauViec;
  laLanhDao: boolean;
  laChuThe: boolean;
  vong: { coDongP: boolean; coDongC: boolean; coDongA: boolean };
  nhanSu: Ct2NhanSu[];
  chuyenDen: Ct2TrangThai | null;
  onKhoiDong: () => void;
  onXong: () => void;
}) {
  const [den, setDen] = useState<Ct2TrangThai>(the.trang_thai);
  const [nguoiGiu, setNguoiGiu] = useState('');
  const [lyDoHuy, setLyDoHuy] = useState('');
  const [dangGui, setDangGui] = useState(false);

  useEffect(() => {
    setDen(chuyenDen ?? the.trang_thai);
    setNguoiGiu(the.nguoi_dang_giu ?? '');
    setLyDoHuy(the.ly_do_dung_huy ?? '');
  }, [the, chuyenDen]);

  if (!laLanhDao && !laChuThe) return null;

  const canNguoiGiu = den === 'CHO_DUYET' || den === 'CHO_PHOI_HOP';
  const lyDoChan = lyDoChanChuyen(the.trang_thai, den, {
    ...vong, phanTram: the.phan_tram, laLanhDao, loai: the.loai_dau_viec,
  });

  const chuyen = async () => {
    if (den === the.trang_thai) return;
    // Khởi động việc đi qua Cổng 2 — hỏi nốt 5W2H rồi tự chuyển cột
    if (den === 'DANG_LAM' && the.trang_thai === 'CHUAN_BI' && the.loai_dau_viec === 'TIEN_TRINH') {
      onKhoiDong();
      return;
    }
    if (lyDoChan) { toast.error(lyDoChan); return; }
    if (canNguoiGiu && !nguoiGiu) {
      toast.error('Vào cột chờ phải chọn người đang giữ việc — đồng hồ trách nhiệm chuyển sang họ.');
      return;
    }
    if (den === 'DUNG_HUY' && lyDoHuy.trim().length < 30) {
      toast.error('Dừng/Hủy phải ghi rõ lý do, tối thiểu 30 ký tự.');
      return;
    }
    setDangGui(true);
    const { error } = await ct2SuaDauViec(the.id, {
      trang_thai: den,
      nguoi_dang_giu: canNguoiGiu ? nguoiGiu : null,
      ...(den === 'DUNG_HUY' ? { ly_do_dung_huy: lyDoHuy.trim() } : {}),
    });
    setDangGui(false);
    if (error) { toast.error(error); return; }
    toast.success(`Đã chuyển sang «${CT2_COT.find((c) => c.ma === den)?.ten}».`);
    onXong();
  };

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="mb-2 text-sm font-semibold text-brand-navy">Chuyển trạng thái</p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-44">
          <Label>Cột đích</Label>
          <Select value={den} onValueChange={(v) => setDen(v as Ct2TrangThai)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CT2_COT.map((c) => (
                <SelectItem key={c.ma} value={c.ma}>{c.icon} {c.ten}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canNguoiGiu && (
          <div className="min-w-52">
            <Label>Ai đang giữ việc? (người duyệt / đầu mối phối hợp)</Label>
            <Select value={nguoiGiu} onValueChange={setNguoiGiu}>
              <SelectTrigger><SelectValue placeholder="Chọn người giữ" /></SelectTrigger>
              <SelectContent>
                {nhanSu.map((n) => <SelectItem key={n.id} value={n.id}>{n.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button onClick={chuyen} disabled={dangGui || den === the.trang_thai}>
          {dangGui ? 'Đang chuyển…' : 'Chuyển'}
        </Button>
      </div>
      {den === 'DUNG_HUY' && (
        <div className="mt-2">
          <Label>Lý do dừng/hủy (≥ 30 ký tự, lưu vết)</Label>
          <Textarea value={lyDoHuy} onChange={(e) => setLyDoHuy(e.target.value)} rows={2} />
        </div>
      )}
      {den !== the.trang_thai && lyDoChan && (
        <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">{lyDoChan}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cổng B — ghi nhịp: 3 trường + 1 câu, tối ưu dưới 45 giây
// ---------------------------------------------------------------------------

export function FormGhiNhip({ the, cauGanNhat, onXong, tuDongNhan }: {
  the: Pick<Ct2DauViec, 'id' | 'trang_thai' | 'phan_tram' | 'co_tinh_trang'>;
  cauGanNhat: string | null;
  onXong: () => void;
  /** Ghi nhịp nhanh: nhãn tự gợi ý, không hiện ô chọn nhãn */
  tuDongNhan?: boolean;
}) {
  const { profileId } = useAuth();
  const [nhan, setNhan] = useState<Ct2NhanPdca>(goiYNhan(the.trang_thai, the.phan_tram));
  const [co, setCo] = useState<Ct2Co>(the.co_tinh_trang);
  const [phanTram, setPhanTram] = useState(the.phan_tram);
  const [cau, setCau] = useState('');
  const [vuongMac, setVuongMac] = useState('');
  const [hanhDong, setHanhDong] = useState('');
  const [dangGui, setDangGui] = useState(false);

  useEffect(() => {
    setNhan(goiYNhan(the.trang_thai, the.phan_tram));
    setCo(the.co_tinh_trang);
    setPhanTram(the.phan_tram);
    setCau(''); setVuongMac(''); setHanhDong('');
  }, [the.id, the.trang_thai, the.phan_tram, the.co_tinh_trang]);

  const kiem = kiemTraCauNhip({ noiDung: cau, co, vuongMac, hanhDongHomNay: hanhDong, cauGanNhat });

  const ghi = async () => {
    if (!profileId) return;
    if (!kiem.hopLe) { toast.error(kiem.loi ?? 'Câu nhịp chưa hợp lệ.'); return; }
    setDangGui(true);
    const { error } = await ct2GhiNhip({
      dau_viec_id: the.id,
      nguoi_ghi: profileId,
      nhan_pdca: nhan,
      noi_dung: cau.trim(),
      vuong_mac: co !== 'XANH' ? vuongMac.trim() : null,
      hanh_dong_hom_nay: co !== 'XANH' ? hanhDong.trim() : null,
      co_tinh_trang: co,
      phan_tram: phanTram,
    });
    setDangGui(false);
    if (error) { toast.error(error); return; }
    toast.success('Đã ghi nhịp. Cảm ơn anh/chị đã giữ nhịp cho Phòng! 🔥');
    setCau(''); setVuongMac(''); setHanhDong('');
    onXong();
  };

  return (
    <div className="rounded-xl border-2 border-brand-navy/20 bg-blue-50/40 p-3">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-navy">
        <CalendarClock className="h-4 w-4" /> Ghi nhịp hôm nay
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {/* Cờ tình trạng — chip bấm 1 lần */}
        {(Object.keys(CT2_TEN_CO) as Ct2Co[]).map((c) => (
          <Button key={c} size="sm" variant={co === c ? 'default' : 'outline'} className="h-8 px-2 text-xs"
            onClick={() => setCo(c)}>
            {CT2_TEN_CO[c]}
          </Button>
        ))}
        <span className="mx-1 hidden text-slate-300 sm:inline">|</span>
        {/* % hoàn thành — 4 nấc */}
        {NAC_PHAN_TRAM.map((p) => (
          <Button key={p} size="sm" variant={phanTram === p ? 'default' : 'outline'} className="h-8 px-2 text-xs tabular-nums"
            onClick={() => setPhanTram(p)}>
            {p}%
          </Button>
        ))}
        {!tuDongNhan && (
          <Select value={nhan} onValueChange={(v) => setNhan(v as Ct2NhanPdca)}>
            <SelectTrigger className="h-8 w-56 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(CT2_TEN_NHAN) as Ct2NhanPdca[]).map((k) => (
                <SelectItem key={k} value={k}>{CT2_TEN_NHAN[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Textarea
        className="mt-2 bg-white" rows={2} value={cau}
        onChange={(e) => setCau(e.target.value)}
        placeholder={CT2_MAU_CAU[co]}
      />
      <p className="mt-1 text-2xs text-slate-500">Gợi ý: {CT2_MAU_CAU[co]}</p>

      {co !== 'XANH' && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Đang vướng vì…</Label>
            <Textarea className="bg-white" rows={2} value={vuongMac} onChange={(e) => setVuongMac(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Hôm nay tôi làm…</Label>
            <Textarea className="bg-white" rows={2} value={hanhDong} onChange={(e) => setHanhDong(e.target.value)} />
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        {!kiem.hopLe && cau.trim().length > 0
          ? <p className="text-xs text-red-600">{kiem.loi}</p>
          : <span />}
        <Button onClick={ghi} disabled={dangGui || !kiem.hopLe}>
          {dangGui ? 'Đang lưu…' : 'Lưu nhịp'}
        </Button>
      </div>
    </div>
  );
}
