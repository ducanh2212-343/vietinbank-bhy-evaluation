import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  CT2_MAU_MO_TA, CT2_NHAN_MO_TA, datPhanMoTa, demTruongCongA, kiemTraCongA,
  locEmojiTieuDe, tachMoTaGop, type Ct2FormTao,
} from '@/lib/ct2';
import {
  ct2TaoDauViec, ct2TaoDeXuat, ct2XuLyDeXuat,
  type Ct2DeXuat, type Ct2NhanSu, type Ct2Phong,
} from './useCt2Data';

/**
 * Cổng A — tạo đầu việc 5W2H (đặc tả §3.1).
 *
 * MỘT Ô NHẬP cho cả 5 nội dung chữ (tên việc · kết quả · phục vụ mục tiêu nào ·
 * cách làm · chỉ tiêu), khung mẫu điền sẵn theo dòng. Bản 11 ô rời trước đó
 * khiến lãnh đạo Phòng phải cuộn qua 5 khối chữ trên điện thoại — gộp lại gõ
 * một mạch, hệ thống tự tách về đúng cột khi lưu nên không mất khả năng lọc
 * và xuất báo cáo.
 *
 * CHẶN CỨNG giữ nguyên: nút "Tạo đầu việc" mờ tới khi đủ 100% mục bắt buộc,
 * bên cạnh là thanh "x/y mục — còn thiếu: …", bấm tên mục thiếu thì cuộn tới ô.
 * Cán bộ thường thấy chế độ «Đề xuất việc» 2 trường, gửi lãnh đạo Phòng duyệt.
 */

/** Danh mục mục tiêu cố định khi chưa gắn chiến dịch — chọn, không nhập tay */
const DANH_MUC_MUC_TIEU = [
  'Tăng trưởng CASA', 'Tăng trưởng tín dụng', 'Thu hồi & kiểm soát nợ',
  'Thu dịch vụ - bảo hiểm', 'Chất lượng vận hành nội bộ', 'Phát triển nhân sự - đào tạo',
];

interface ChienDich { id: string; ten: string; ngay_ket_thuc: string }

function useCt2ChienDich() {
  return useQuery({
    queryKey: ['ct2', 'chien-dich'],
    staleTime: 300_000,
    queryFn: async () => {
      const db = supabase as unknown as {
        from(t: string): { select(c: string): { eq(c: string, v: string): { order(c: string): PromiseLike<{ data: unknown; error: unknown }> } } };
      };
      const { data } = await db.from('ct2_chien_dich').select('id, ten, ngay_ket_thuc').eq('trang_thai', 'DANG_CHAY').order('ten');
      return (data ?? []) as ChienDich[];
    },
  });
}

const FORM_TRONG: Ct2FormTao = {
  mo_ta: CT2_MAU_MO_TA,
  nguoi_chiu_trach_nhiem: '', lanh_dao_theo_doi: '', phong: '', pham_vi: 'PHONG',
  loai_dau_viec: 'TIEN_TRINH', ngay_bat_dau: '', han_hoan_thanh: '',
  lien_phong: false, cac_phong_tham_gia: [],
};

interface Props {
  open: boolean;
  phongId: string | null;
  phongs: Ct2Phong[];
  nhanSu: Ct2NhanSu[];
  cycleId: string | null;
  /** Cán bộ thường → chế độ đề xuất 2 trường */
  laLanhDao: boolean;
  /** Duyệt một đề xuất: prefill tiêu đề, khi tạo xong tự đánh dấu ĐÃ DUYỆT */
  deXuat?: Ct2DeXuat | null;
  onClose: () => void;
  onXong: () => void;
}

export function Ct2CreateDialog({ open, phongId, phongs, nhanSu, cycleId, laLanhDao, deXuat, onClose, onXong }: Props) {
  const { profileId } = useAuth();
  const { data: chienDichs = [] } = useCt2ChienDich();
  const [f, setF] = useState<Ct2FormTao>(FORM_TRONG);
  const [tieuDeDeXuat, setTieuDeDeXuat] = useState('');
  const [lyDoDeXuat, setLyDoDeXuat] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [truongDo, setTruongDo] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const phong = phongId ?? '';
    const truongPhong = phongs.find((p) => p.id === phong)?.manager_id ?? '';
    setF({
      ...FORM_TRONG,
      phong,
      // Đề xuất của cán bộ: điền sẵn tên việc vào đúng dòng đầu của ô gộp
      mo_ta: deXuat ? datPhanMoTa(CT2_MAU_MO_TA, 'tieu_de', deXuat.tieu_de) : CT2_MAU_MO_TA,
      // Mặc định lãnh đạo theo dõi = Trưởng phòng (đặc tả 2.3)
      lanh_dao_theo_doi: truongPhong,
      ngay_bat_dau: new Date().toISOString().slice(0, 10),
    });
    setTieuDeDeXuat('');
    setLyDoDeXuat('');
    setTruongDo(null);
  }, [open, phongId, phongs, deXuat]);

  const thieu = useMemo(() => kiemTraCongA(f), [f]);
  const { du, tong } = useMemo(() => demTruongCongA(f), [f]);
  const phan = useMemo(() => tachMoTaGop(f.mo_ta), [f.mo_ta]);
  const nguoiTrongPhong = useMemo(
    () => nhanSu.filter((n) => n.department_id === f.phong || f.cac_phong_tham_gia.includes(n.department_id ?? '')),
    [nhanSu, f.phong, f.cac_phong_tham_gia],
  );

  const cuonToi = (truong: string) => {
    setTruongDo(truong);
    const o = document.getElementById(`ct2-f-${truong}`);
    o?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    o?.focus();
  };

  const dat = <K extends keyof Ct2FormTao>(k: K, v: Ct2FormTao[K]) => setF((c) => ({ ...c, [k]: v }));
  const vienDo = (truong: string) =>
    truongDo === truong && thieu.some((t) => t.truong === truong) ? 'border-red-500 ring-1 ring-red-300' : '';

  const guiDeXuat = async () => {
    if (!profileId || !phongId) return;
    setDangGui(true);
    const { error } = await ct2TaoDeXuat({
      phong: phongId,
      tieu_de: locEmojiTieuDe(tieuDeDeXuat),
      ly_do: lyDoDeXuat.trim(),
      nguoi_de_xuat: profileId,
    });
    setDangGui(false);
    if (error) { toast.error(error); return; }
    toast.success('Đã gửi đề xuất — lãnh đạo Phòng sẽ bổ sung 5W2H và duyệt.');
    onXong(); onClose();
  };

  const taoDauViec = async () => {
    if (!profileId || thieu.length > 0) return;
    setDangGui(true);
    // Dòng «Để phục vụ» khớp tên một chiến dịch đang chạy → gắn luôn vào chiến dịch đó
    const cd = chienDichs.find((c) => c.ten.trim() === phan.muc_tieu_lien_ket.trim());
    const { error, id } = await ct2TaoDauViec({
      cycle_id: cycleId,
      chien_dich_id: cd?.id ?? null,
      tieu_de: locEmojiTieuDe(phan.tieu_de),
      ket_qua_dau_ra: phan.ket_qua_dau_ra,
      muc_tieu_lien_ket: phan.muc_tieu_lien_ket,
      cach_lam: phan.cach_lam,
      chi_tieu_dinh_luong: phan.chi_tieu_so,
      don_vi: phan.don_vi || null,
      nguoi_chiu_trach_nhiem: f.nguoi_chiu_trach_nhiem,
      lanh_dao_theo_doi: f.lanh_dao_theo_doi,
      phong: f.phong,
      pham_vi: f.pham_vi,
      loai_dau_viec: f.loai_dau_viec,
      lien_phong: f.lien_phong,
      cac_phong_tham_gia: f.lien_phong ? f.cac_phong_tham_gia : [],
      ngay_bat_dau: f.ngay_bat_dau,
      han_hoan_thanh: f.han_hoan_thanh,
      nguoi_tao: profileId,
    });
    if (!error && deXuat && id) {
      await ct2XuLyDeXuat(deXuat.id, {
        trang_thai: 'DA_DUYET', dau_viec_id: id, xu_ly_boi: profileId, xu_ly_luc: new Date().toISOString(),
      });
    }
    setDangGui(false);
    if (error) { toast.error(error); return; }
    toast.success('Đã tạo đầu việc — thẻ vào cột «Chuẩn bị», ghi dòng Plan (P) để khởi động.');
    onXong(); onClose();
  };

  // ------- Chế độ ĐỀ XUẤT (cán bộ thường) -------
  if (!laLanhDao) {
    return (
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Đề xuất việc gửi lãnh đạo Phòng</DialogTitle>
            <DialogDescription>
              Chỉ cần tiêu đề và lý do. Đề xuất KHÔNG hiện trên Kanban cho tới khi
              lãnh đạo Phòng bổ sung đủ 5W2H và duyệt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="ct2-dx-tieude">Tên việc đề xuất (≥ 10 ký tự)</Label>
              <Input id="ct2-dx-tieude" value={tieuDeDeXuat} onChange={(e) => setTieuDeDeXuat(e.target.value)}
                placeholder="VD: Rà soát lại danh mục khách hàng CASA ngủ đông" />
            </div>
            <div>
              <Label htmlFor="ct2-dx-lydo">Vì sao nên làm việc này? (≥ 10 ký tự)</Label>
              <Textarea id="ct2-dx-lydo" value={lyDoDeXuat} onChange={(e) => setLyDoDeXuat(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Đóng</Button>
            <Button onClick={guiDeXuat} disabled={dangGui || tieuDeDeXuat.trim().length < 10 || lyDoDeXuat.trim().length < 10}>
              {dangGui ? 'Đang gửi…' : 'Gửi đề xuất'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ------- Chế độ CỔNG A (lãnh đạo) -------
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{deXuat ? 'Duyệt đề xuất: bổ sung 5W2H' : 'Tạo đầu việc (5W2H)'}</DialogTitle>
          <DialogDescription>
            {deXuat
              ? `Đề xuất của cán bộ: «${deXuat.ly_do}». Bổ sung nốt các dòng còn trống rồi tạo — thẻ mới xuất hiện trên Kanban.`
              : 'Gõ liền một mạch trong ô dưới, mỗi dòng một ý. Đủ các dòng bắt buộc thì nút Tạo mới sáng.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Ô GỘP: What · What · Why · How · How much */}
          <div>
            <Label htmlFor="ct2-f-mo_ta">Nội dung đầu việc — giữ nguyên nhãn đầu dòng, gõ tiếp sau dấu hai chấm</Label>
            <Textarea
              id="ct2-f-mo_ta"
              className={`mt-1 min-h-[190px] font-mono text-sm leading-relaxed ${vienDo('mo_ta')}`}
              value={f.mo_ta}
              onChange={(e) => dat('mo_ta', e.target.value)}
              spellCheck={false}
            />
            <div className="mt-1.5 space-y-0.5">
              {CT2_NHAN_MO_TA.map((n) => (
                <p key={n.khoa} className="text-2xs leading-snug text-slate-500">
                  <span className="font-semibold text-slate-600">{n.nhan}:</span> {n.goi_y}
                </p>
              ))}
            </div>
          </div>

          {/* Chip chọn nhanh cho dòng «Để phục vụ» — 1 chạm thay cho gõ tay */}
          <div>
            <Label className="text-xs text-slate-600">Chọn nhanh mục tiêu (ghi vào dòng «Để phục vụ»)</Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {[...chienDichs.map((c) => ({ ten: `🤝 ${c.ten}`, gia: c.ten })),
                ...DANH_MUC_MUC_TIEU.map((m) => ({ ten: m, gia: m }))].map((m) => {
                const dangChon = phan.muc_tieu_lien_ket.trim() === m.gia;
                return (
                  <button
                    key={m.gia}
                    type="button"
                    onClick={() => dat('mo_ta', datPhanMoTa(f.mo_ta, 'muc_tieu_lien_ket', m.gia))}
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${
                      dangChon
                        ? 'border-brand-navy bg-brand-navy text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-brand-navy/40'
                    }`}
                  >
                    {dangChon && <Check className="mr-0.5 inline h-3 w-3" />}
                    {m.ten}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Who */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="ct2-f-nguoi_chiu_trach_nhiem">Who — Người chịu trách nhiệm (duy nhất 01)</Label>
              <Select value={f.nguoi_chiu_trach_nhiem} onValueChange={(v) => dat('nguoi_chiu_trach_nhiem', v)}>
                <SelectTrigger id="ct2-f-nguoi_chiu_trach_nhiem" className={vienDo('nguoi_chiu_trach_nhiem')}>
                  <SelectValue placeholder="Chọn 1 người" />
                </SelectTrigger>
                <SelectContent>
                  {nguoiTrongPhong.map((n) => <SelectItem key={n.id} value={n.id}>{n.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ct2-f-lanh_dao_theo_doi">Who — Lãnh đạo theo dõi</Label>
              <Select value={f.lanh_dao_theo_doi} onValueChange={(v) => dat('lanh_dao_theo_doi', v)}>
                <SelectTrigger id="ct2-f-lanh_dao_theo_doi" className={vienDo('lanh_dao_theo_doi')}>
                  <SelectValue placeholder="Mặc định: Trưởng phòng" />
                </SelectTrigger>
                <SelectContent>
                  {nhanSu.map((n) => <SelectItem key={n.id} value={n.id}>{n.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* When */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="ct2-f-ngay_bat_dau">When — Ngày bắt đầu</Label>
              <Input id="ct2-f-ngay_bat_dau" type="date" className={vienDo('ngay_bat_dau')}
                value={f.ngay_bat_dau} onChange={(e) => dat('ngay_bat_dau', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ct2-f-han_hoan_thanh">When — Hạn hoàn thành</Label>
              <Input id="ct2-f-han_hoan_thanh" type="date" className={vienDo('han_hoan_thanh')}
                value={f.han_hoan_thanh} onChange={(e) => dat('han_hoan_thanh', e.target.value)} />
            </div>
          </div>

          {/* Where + loại */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="ct2-f-phong">Phòng chủ trì</Label>
              <Select value={f.phong} onValueChange={(v) => dat('phong', v)}>
                <SelectTrigger id="ct2-f-phong" className={vienDo('phong')}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {phongs.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ct2-f-pham_vi">Where — Phạm vi</Label>
              <Select value={f.pham_vi} onValueChange={(v) => dat('pham_vi', v)}>
                <SelectTrigger id="ct2-f-pham_vi"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHONG">Trong Phòng</SelectItem>
                  <SelectItem value="PGD">Phòng giao dịch</SelectItem>
                  <SelectItem value="CHI_NHANH">Toàn Chi nhánh</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ct2-f-loai_dau_viec">Loại đầu việc</Label>
              <Select value={f.loai_dau_viec} onValueChange={(v) => dat('loai_dau_viec', v)}>
                <SelectTrigger id="ct2-f-loai_dau_viec"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TIEN_TRINH">Tiến trình (có điểm kết thúc)</SelectItem>
                  <SelectItem value="THUONG_TRUC">Thường trực (vận hành lặp)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Liên phòng */}
          <div className="rounded-xl border border-slate-200 p-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={f.lien_phong} onCheckedChange={(v) => dat('lien_phong', v === true)} />
              🤝 Đầu việc liên phòng (vẫn chỉ 01 phòng chủ trì, 01 người chịu trách nhiệm)
            </label>
            {f.lien_phong && (
              <div id="ct2-f-cac_phong_tham_gia" className={`mt-2 grid gap-1.5 rounded-lg p-1 sm:grid-cols-2 ${vienDo('cac_phong_tham_gia')}`}>
                {phongs.filter((p) => p.id !== f.phong).map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={f.cac_phong_tham_gia.includes(p.id)}
                      onCheckedChange={(v) => dat('cac_phong_tham_gia',
                        v === true
                          ? [...f.cac_phong_tham_gia, p.id]
                          : f.cac_phong_tham_gia.filter((x) => x !== p.id))}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Thanh tiến độ hoàn thiện + danh sách mục thiếu (bấm để cuộn tới ô) */}
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-3">
            <Progress value={(du / tong) * 100} className="h-2 flex-1" />
            <span className="text-xs font-semibold tabular-nums text-slate-600">{du}/{tong} mục</span>
          </div>
          {thieu.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-1.5 text-xs text-slate-600">
              <span>Còn thiếu:</span>
              {thieu.map((t) => (
                <button key={`${t.truong}-${t.ten}`} type="button" onClick={() => cuonToi(t.truong)}
                  className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700 hover:bg-red-200">
                  {t.ten}{t.ly_do ? ` (${t.ly_do})` : ''}
                </button>
              ))}
            </p>
          )}
          {thieu.length === 0 && phan.chi_tieu_so !== null && (
            <p className="mt-2 text-xs text-emerald-700">
              Chỉ tiêu ghi nhận: <b>{phan.chi_tieu_so} {phan.don_vi}</b>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
          <Button onClick={taoDauViec} disabled={thieu.length > 0 || dangGui}>
            {dangGui ? 'Đang tạo…' : deXuat ? 'Duyệt & tạo đầu việc' : 'Tạo đầu việc'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
