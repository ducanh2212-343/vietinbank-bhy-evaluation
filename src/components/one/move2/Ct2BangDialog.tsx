import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Layers, Lock, X } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import type { Ct2Bang } from '@/lib/ct2';
import {
  ct2DatThanhVienBang, ct2SuaBang, ct2TaoBang, useCt2ThanhVienBang,
  type Ct2NhanSu, type Ct2Phong,
} from './useCt2Data';

/**
 * Tạo / sửa một bảng Kanban của phòng — cùng mẫu «Kanban của Phòng» nhưng cho
 * một mảng công việc riêng hoặc một việc liên phòng.
 *
 * Ba lựa chọn phải bấm, không phải gõ:
 *  · Loại: MẢNG trong phòng hay LIÊN PHÒNG (đặt ở phòng đầu mối này).
 *  · Ai xem: cả phòng, hay HẠN CHẾ (chỉ thành viên đích danh + BGĐ) — dùng
 *    cho mảng nhạy cảm như tổ chức – nhân sự.
 *  · Thành viên: bấm tên để thêm/bỏ. Với bảng liên phòng, danh bạ mở ra toàn
 *    Chi nhánh — người phòng khác được thêm sẽ tự thấy bảng trong màn của họ.
 */

interface Props {
  open: boolean;
  /** null = tạo mới */
  bang: Ct2Bang | null;
  phongId: string;
  nhanSu: Ct2NhanSu[];
  phongs: Ct2Phong[];
  onClose: () => void;
  onXong: () => void;
}

export function Ct2BangDialog({ open, bang, phongId, nhanSu, phongs, onClose, onXong }: Props) {
  const { profileId, roles } = useAuth();
  const { data: thanhVienCu = [] } = useCt2ThanhVienBang(bang?.id ?? null);
  // Đặt/gỡ chế độ toàn chi nhánh là quyết định cấp chi nhánh — trigger DB là
  // hàng rào thật, đây chỉ để không mời lãnh đạo phòng bấm vào việc sẽ bị chặn
  const laBgd = roles.includes('bgd') || roles.includes('system_admin');

  const [ten, setTen] = useState('');
  const [moTa, setMoTa] = useState('');
  const [loai, setLoai] = useState<'MANG' | 'LIEN_PHONG' | 'TOAN_CN'>('MANG');
  const [cheDoXem, setCheDoXem] = useState<'PHONG' | 'HAN_CHE'>('PHONG');
  const [thanhVien, setThanhVien] = useState<string[]>([]);
  const [timTen, setTimTen] = useState('');
  const [dangGui, setDangGui] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTen(bang?.ten ?? '');
    setMoTa(bang?.mo_ta ?? '');
    setLoai(bang?.loai ?? 'MANG');
    setCheDoXem(bang?.che_do_xem ?? 'PHONG');
    setTimTen('');
  }, [open, bang]);

  useEffect(() => {
    if (open) setThanhVien(thanhVienCu);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, thanhVienCu.join(',')]);

  // Mảng trong phòng: chọn người trong phòng. Liên phòng / toàn CN: mở toàn Chi nhánh.
  const danhBa = useMemo(() => {
    const nguon = loai === 'MANG' ? nhanSu.filter((n) => n.department_id === phongId) : nhanSu;
    const tu = timTen.trim().toLowerCase();
    return tu ? nguon.filter((n) => n.full_name.toLowerCase().includes(tu)) : nguon;
  }, [nhanSu, loai, phongId, timTen]);

  const tenPhong = (id: string | null) => phongs.find((p) => p.id === id)?.code ?? '';

  const luu = async () => {
    if (!profileId || ten.trim().length < 3) {
      toast.error('Tên bảng cần tối thiểu 3 ký tự.');
      return;
    }
    // Toàn chi nhánh buộc chế độ mở — ràng buộc DB cũng chặn, ép ở đây cho chắc
    const cheDo = loai === 'TOAN_CN' ? 'PHONG' : cheDoXem;
    if (cheDo === 'HAN_CHE' && thanhVien.length === 0) {
      toast.error('Bảng hạn chế phải có ít nhất một thành viên — nếu không thì ngoài BGĐ không ai mở được.');
      return;
    }
    setDangGui(true);
    let bangId = bang?.id ?? null;
    if (bang) {
      const { error } = await ct2SuaBang(bang.id, {
        ten: ten.trim(), mo_ta: moTa.trim() || null, loai, che_do_xem: cheDo,
        updated_at: new Date().toISOString(),
      });
      if (error) { setDangGui(false); toast.error(error); return; }
    } else {
      const { error, id } = await ct2TaoBang({
        phong: phongId, ten: ten.trim(), mo_ta: moTa.trim() || null,
        loai, che_do_xem: cheDo, nguoi_tao: profileId,
      });
      if (error || !id) { setDangGui(false); toast.error(error ?? 'Không tạo được bảng.'); return; }
      bangId = id;
    }
    const { error: loiTv } = await ct2DatThanhVienBang(bangId!, thanhVien, bang ? thanhVienCu : [], profileId);
    setDangGui(false);
    if (loiTv) { toast.error(loiTv); return; }
    toast.success(bang ? 'Đã cập nhật bảng.' : `Đã tạo bảng «${ten.trim()}».`);
    onXong(); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4" /> {bang ? 'Sửa bảng Kanban' : 'Tạo bảng Kanban mới'}
          </DialogTitle>
          <DialogDescription>
            Cùng mẫu «Kanban của Phòng», cho một mảng công việc riêng hoặc việc liên phòng.
            Bảng liên phòng đặt ở phòng đầu mối — thành viên phòng khác tự thấy bảng trong màn của họ.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="bang-ten">Tên bảng</Label>
            <Input id="bang-ten" value={ten} autoFocus onChange={(e) => setTen(e.target.value)}
              placeholder="VD: Mảng hành chính · Dự án chuyển đổi số liên phòng" />
          </div>
          <div>
            <Label htmlFor="bang-mota">Mô tả (tuỳ chọn)</Label>
            <Textarea id="bang-mota" rows={2} value={moTa} onChange={(e) => setMoTa(e.target.value)}
              placeholder="Bảng này theo dõi mảng việc gì?" />
          </div>

          <div>
            <Label>Loại bảng</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setLoai('MANG')}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  loai === 'MANG' ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-200 text-slate-700'
                }`}>
                Mảng trong phòng
              </button>
              <button type="button" onClick={() => setLoai('LIEN_PHONG')}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  loai === 'LIEN_PHONG' ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-200 text-slate-700'
                }`}>
                🤝 Liên phòng (phòng này đầu mối)
              </button>
              {(laBgd || loai === 'TOAN_CN') && (
                <button type="button"
                  onClick={() => { setLoai('TOAN_CN'); setCheDoXem('PHONG'); }}
                  disabled={!laBgd}
                  className={`rounded-full border px-3 py-1.5 text-xs transition disabled:opacity-60 ${
                    loai === 'TOAN_CN' ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-200 text-slate-700'
                  }`}>
                  🏦 Toàn chi nhánh
                </button>
              )}
            </div>
            {loai === 'TOAN_CN' && (
              <p className="mt-1 text-2xs text-slate-500">
                Hiện ở màn hình của TẤT CẢ các Phòng, ai cũng xem được — không cần thêm thành viên.
                Phòng này vẫn là đầu mối chịu trách nhiệm. Chỉ Ban Giám đốc đặt/gỡ được chế độ này.
              </p>
            )}
          </div>

          {/* Toàn chi nhánh buộc chế độ xem mở — ràng buộc DB sẽ chặn HAN_CHE,
              nên không bày lựa chọn sẽ bị từ chối */}
          {loai !== 'TOAN_CN' && (
          <div>
            <Label>Ai xem được bảng?</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setCheDoXem('PHONG')}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  cheDoXem === 'PHONG' ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-200 text-slate-700'
                }`}>
                Cả phòng (như Kanban chung)
              </button>
              <button type="button" onClick={() => setCheDoXem('HAN_CHE')}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition ${
                  cheDoXem === 'HAN_CHE' ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-200 text-slate-700'
                }`}>
                <Lock className="h-3 w-3" /> Hạn chế — chỉ thành viên + BGĐ
              </button>
            </div>
            {cheDoXem === 'HAN_CHE' && (
              <p className="mt-1 text-2xs text-slate-500">
                Dùng cho mảng nhạy cảm (VD tổ chức – nhân sự). Danh sách thành viên chính là hàng rào:
                không có tên thì không mở được, kể cả người cùng phòng. Ban Giám đốc luôn xem được.
              </p>
            )}
          </div>
          )}

          <div>
            <Label>
              Thành viên ({thanhVien.length})
              {loai !== 'MANG' && <span className="ml-1 font-normal text-slate-500">— chọn được người phòng khác</span>}
            </Label>
            {thanhVien.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {thanhVien.map((id) => {
                  const n = nhanSu.find((x) => x.id === id);
                  return (
                    <button key={id} type="button"
                      onClick={() => setThanhVien((cu) => cu.filter((x) => x !== id))}
                      className="inline-flex items-center gap-1 rounded-full border border-blue-400 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800">
                      <X className="h-3 w-3" />
                      {n?.full_name ?? '—'}
                      {loai !== 'MANG' && n?.department_id !== phongId && (
                        <span className="font-normal text-blue-500">· {tenPhong(n?.department_id ?? null)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <Input className="mt-1.5" value={timTen} onChange={(e) => setTimTen(e.target.value)}
              placeholder="Gõ tên để tìm, bấm để thêm…" />
            <div className="mt-1.5 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
              {danhBa.filter((n) => !thanhVien.includes(n.id)).slice(0, 30).map((n) => (
                <button key={n.id} type="button"
                  onClick={() => setThanhVien((cu) => [...cu, n.id])}
                  className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-slate-300">
                  {n.full_name}
                  {loai !== 'MANG' && n.department_id !== phongId && (
                    <span className="text-slate-400"> · {tenPhong(n.department_id)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
          <Button onClick={luu} disabled={dangGui}>
            {dangGui ? 'Đang lưu…' : bang ? 'Lưu thay đổi' : 'Tạo bảng'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
