import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
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
import { demTruongCongA, kiemTraCongA, locEmojiTieuDe, type Ct2FormTao } from '@/lib/ct2';
import {
  ct2TaoDauViec, ct2TaoDeXuat, ct2XuLyDeXuat,
  type Ct2DeXuat, type Ct2NhanSu, type Ct2Phong,
} from './useCt2Data';

/**
 * Cổng A — tạo đầu việc 5W2H (đặc tả §3.1).
 *
 * CHẶN CỨNG: nút "Tạo đầu việc" disabled tới khi đủ 100% trường bắt buộc; bên
 * cạnh là thanh "x/y trường — còn thiếu: …". Bấm tên trường thiếu → cuộn tới ô,
 * viền đỏ. Không có lưu nháp thiếu trường (tránh kho card "vô chủ").
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
  tieu_de: '', ket_qua_dau_ra: '', muc_tieu_lien_ket: '', cach_lam: '',
  chi_tieu_dinh_luong: '', co_chi_tieu_so: false, don_vi: '',
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
  const [lyDoDeXuat, setLyDoDeXuat] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [truongDo, setTruongDo] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const phong = phongId ?? '';
    const truongPhong = phongs.find((p) => p.id === phong)?.manager_id ?? '';
    const homNay = new Date().toISOString().slice(0, 10);
    setF({
      ...FORM_TRONG,
      phong,
      tieu_de: deXuat?.tieu_de ?? '',
      // Mặc định lãnh đạo theo dõi = Trưởng phòng (đặc tả 2.3)
      lanh_dao_theo_doi: truongPhong,
      ngay_bat_dau: homNay,
    });
    setLyDoDeXuat('');
    setTruongDo(null);
  }, [open, phongId, phongs, deXuat]);

  const thieu = useMemo(() => kiemTraCongA(f), [f]);
  const { du, tong } = useMemo(() => demTruongCongA(f), [f]);
  const nguoiTrongPhong = useMemo(
    () => nhanSu.filter((n) => n.department_id === f.phong || f.cac_phong_tham_gia.includes(n.department_id ?? '')),
    [nhanSu, f.phong, f.cac_phong_tham_gia],
  );

  const cuonToi = (truong: string) => {
    setTruongDo(truong);
    document.getElementById(`ct2-f-${truong}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById(`ct2-f-${truong}`)?.focus();
  };

  const dat = <K extends keyof Ct2FormTao>(k: K, v: Ct2FormTao[K]) => setF((c) => ({ ...c, [k]: v }));
  const vienDo = (truong: string) =>
    truongDo === truong && thieu.some((t) => t.truong === truong) ? 'border-red-500 ring-1 ring-red-300' : '';

  // Chế độ cán bộ: đề xuất 2 trường
  const guiDeXuat = async () => {
    if (!profileId || !phongId) return;
    setDangGui(true);
    const { error } = await ct2TaoDeXuat({
      phong: phongId,
      tieu_de: locEmojiTieuDe(f.tieu_de),
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
    const { error, id } = await ct2TaoDauViec({
      cycle_id: cycleId,
      chien_dich_id: chienDichs.some((c) => c.id === f.muc_tieu_lien_ket) ? f.muc_tieu_lien_ket : null,
      tieu_de: locEmojiTieuDe(f.tieu_de),
      ket_qua_dau_ra: f.ket_qua_dau_ra.trim(),
      muc_tieu_lien_ket: chienDichs.find((c) => c.id === f.muc_tieu_lien_ket)?.ten ?? f.muc_tieu_lien_ket,
      cach_lam: f.cach_lam.trim(),
      chi_tieu_dinh_luong: f.co_chi_tieu_so ? Number(f.chi_tieu_dinh_luong) : null,
      don_vi: f.co_chi_tieu_so ? f.don_vi.trim() : null,
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
              <Input id="ct2-dx-tieude" value={f.tieu_de} onChange={(e) => dat('tieu_de', e.target.value)}
                placeholder="VD: Rà soát lại danh mục khách hàng CASA ngủ đông" />
            </div>
            <div>
              <Label htmlFor="ct2-dx-lydo">Vì sao nên làm việc này? (≥ 10 ký tự)</Label>
              <Textarea id="ct2-dx-lydo" value={lyDoDeXuat} onChange={(e) => setLyDoDeXuat(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Đóng</Button>
            <Button onClick={guiDeXuat} disabled={dangGui || f.tieu_de.trim().length < 10 || lyDoDeXuat.trim().length < 10}>
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
          <DialogTitle>{deXuat ? `Duyệt đề xuất: bổ sung 5W2H` : 'Tạo đầu việc (5W2H)'}</DialogTitle>
          <DialogDescription>
            {deXuat
              ? `Đề xuất của cán bộ: «${deXuat.ly_do}». Bổ sung đủ 5W2H rồi tạo — thẻ mới xuất hiện trên Kanban.`
              : 'Đủ 100% trường bắt buộc thì nút Tạo mới sáng. Việc giao rõ ràng ngay từ đầu đỡ hỏi lại về sau.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* What */}
          <div>
            <Label htmlFor="ct2-f-tieu_de">What — Tên đầu việc (≥ 10 ký tự, không tên chung chung)</Label>
            <Input id="ct2-f-tieu_de" className={vienDo('tieu_de')} value={f.tieu_de}
              onChange={(e) => dat('tieu_de', e.target.value)}
              placeholder="VD: Hoàn thiện hồ sơ TSBĐ khách hàng Minh Long trước 20/08" />
          </div>
          <div>
            <Label htmlFor="ct2-f-ket_qua_dau_ra">What — Kết quả đầu ra («làm xong thì có cái gì?»)</Label>
            <Input id="ct2-f-ket_qua_dau_ra" className={vienDo('ket_qua_dau_ra')} value={f.ket_qua_dau_ra}
              onChange={(e) => dat('ket_qua_dau_ra', e.target.value)}
              placeholder="VD: Bộ hồ sơ TSBĐ đã đăng ký GDBĐ, đủ điều kiện giải ngân" />
          </div>

          {/* Why */}
          <div>
            <Label htmlFor="ct2-f-muc_tieu_lien_ket">Why — Gắn với chiến dịch / nhóm chỉ tiêu</Label>
            <Select value={f.muc_tieu_lien_ket} onValueChange={(v) => dat('muc_tieu_lien_ket', v)}>
              <SelectTrigger id="ct2-f-muc_tieu_lien_ket" className={vienDo('muc_tieu_lien_ket')}>
                <SelectValue placeholder="Chọn từ danh mục" />
              </SelectTrigger>
              <SelectContent>
                {chienDichs.map((c) => <SelectItem key={c.id} value={c.id}>🤝 {c.ten}</SelectItem>)}
                {DANH_MUC_MUC_TIEU.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
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

          {/* How */}
          <div>
            <Label htmlFor="ct2-f-cach_lam">How — Cách làm, các bước triển khai (≥ 30 ký tự)</Label>
            <Textarea id="ct2-f-cach_lam" className={vienDo('cach_lam')} rows={3} value={f.cach_lam}
              onChange={(e) => dat('cach_lam', e.target.value)}
              placeholder="B1 …; B2 …; B3 …" />
          </div>

          {/* How much */}
          <div className="rounded-xl border border-slate-200 p-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={f.co_chi_tieu_so} onCheckedChange={(v) => dat('co_chi_tieu_so', v === true)} />
              Việc có chỉ tiêu định lượng (How much)
            </label>
            {f.co_chi_tieu_so && (
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="ct2-f-chi_tieu_dinh_luong">Con số</Label>
                  <Input id="ct2-f-chi_tieu_dinh_luong" type="number" className={vienDo('chi_tieu_dinh_luong')}
                    value={f.chi_tieu_dinh_luong} onChange={(e) => dat('chi_tieu_dinh_luong', e.target.value)}
                    placeholder="VD: 12" />
                </div>
                <div>
                  <Label htmlFor="ct2-f-don_vi">Đơn vị</Label>
                  <Input id="ct2-f-don_vi" className={vienDo('don_vi')} value={f.don_vi}
                    onChange={(e) => dat('don_vi', e.target.value)} placeholder="KH / tỷ đồng / hồ sơ" />
                </div>
              </div>
            )}
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

        {/* Thanh tiến độ hoàn thiện + danh sách trường thiếu (bấm để cuộn tới) */}
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-3">
            <Progress value={(du / tong) * 100} className="h-2 flex-1" />
            <span className="text-xs font-semibold tabular-nums text-slate-600">{du}/{tong} trường</span>
          </div>
          {thieu.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-1.5 text-xs text-slate-600">
              <span>Còn thiếu:</span>
              {thieu.map((t) => (
                <button key={String(t.truong)} type="button" onClick={() => cuonToi(String(t.truong))}
                  className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700 hover:bg-red-200">
                  {t.ten}{t.ly_do ? ` (${t.ly_do})` : ''}
                </button>
              ))}
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
