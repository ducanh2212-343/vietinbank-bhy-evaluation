import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCt2DsPgd, useCt2PgdCuaPhong, useCt2Phong, type Ct2NhanSu } from './useCt2Data';

/**
 * Khối «Cấp phụ trách» dùng chung cho thẻ Kanban và hồ sơ PDTD.
 *
 * Vì sao phải sửa được SAU khi tạo: các bản ghi nhập từ board Miro cũ ra đời
 * trước khi có bốn cột này nên đều trống — nếu chỉ đặt được lúc tạo thì cách
 * duy nhất để điền là xoá đi làm lại, tức là mất sạch nhật ký. Ô trống ở đây
 * cũng phải nói ra được: khối luôn hiện, trống thì ghi thẳng «chưa gán».
 *
 * Quy tắc không nhân nhượng: **người làm không tự theo dõi chính mình**. Giám
 * sát mà người bị giám sát tự nhận thì chỉ là giám sát trên giấy. Ngoại lệ duy
 * nhất là khi chính người đó là Trưởng phòng — trên họ không còn ai trong
 * phòng nữa. Hàng rào thật nằm ở trigger DB; đây là tấm gương soi luật đó.
 */

export interface Ct2CapPhuTrachGiaTri {
  lanh_dao_theo_doi: string | null;
  pho_phong: string | null;
  truong_phong: string | null;
  pgd_phu_trach: string | null;
}

interface Props {
  phongId: string;
  /** Người chịu trách nhiệm / cán bộ phụ trách — không được tự theo dõi mình */
  nguoiLam: string | null;
  gia: Ct2CapPhuTrachGiaTri;
  nhanSu: Ct2NhanSu[];
  /** Chỉ lãnh đạo mới thấy nút sửa — DB cũng chặn đúng như vậy */
  suaDuoc: boolean;
  onLuu: (v: Record<string, string | null>) => Promise<{ error: string | null }>;
  onXong: () => void;
}

export function Ct2CapPhuTrach({ phongId, nguoiLam, gia, nhanSu, suaDuoc, onLuu, onXong }: Props) {
  const [moSua, setMoSua] = useState(false);
  const [ldtd, setLdtd] = useState('');
  const [pp, setPp] = useState('');
  const [tp, setTp] = useState('');
  const [pgd, setPgd] = useState('');
  const [dangLuu, setDangLuu] = useState(false);

  const { data: phongs = [] } = useCt2Phong();
  const { data: pgdMacDinh = '' } = useCt2PgdCuaPhong(moSua ? phongId : null);
  const { data: dsPgd = [] } = useCt2DsPgd(moSua);
  const tenNguoi = useMemo(() => new Map(nhanSu.map((n) => [n.id, n.full_name])), [nhanSu]);
  const nguoiTrongPhong = useMemo(
    () => nhanSu.filter((n) => n.department_id === phongId),
    [nhanSu, phongId],
  );
  const truongPhongMacDinh = phongs.find((p) => p.id === phongId)?.manager_id ?? '';

  // Mở form: giữ nguyên cái đã có, chỉ điền hộ chỗ TRỐNG. Không bao giờ đè lên
  // lựa chọn con người bằng giá trị suy ra từ danh mục.
  useEffect(() => {
    if (!moSua) return;
    setLdtd(gia.lanh_dao_theo_doi ?? gia.truong_phong ?? truongPhongMacDinh);
    setPp(gia.pho_phong ?? '');
    setTp(gia.truong_phong ?? truongPhongMacDinh);
    setPgd(gia.pgd_phu_trach ?? pgdMacDinh);
  }, [moSua, gia.lanh_dao_theo_doi, gia.pho_phong, gia.truong_phong, gia.pgd_phu_trach,
    truongPhongMacDinh, pgdMacDinh]);

  const trong = !gia.lanh_dao_theo_doi && !gia.pho_phong && !gia.truong_phong && !gia.pgd_phu_trach;
  // Trưởng phòng tự theo dõi việc của mình là đúng — trên họ không còn ai
  const duocTuTheoDoi = !!nguoiLam && nguoiLam === truongPhongMacDinh;
  const loiTuTheoDoi = !!ldtd && ldtd === nguoiLam && !duocTuTheoDoi
    ? 'Người làm không tự theo dõi chính mình — chọn Trưởng phòng hoặc lãnh đạo khác.'
    : null;

  const luu = async () => {
    if (loiTuTheoDoi) { toast.error(loiTuTheoDoi); return; }
    setDangLuu(true);
    const { error } = await onLuu({
      lanh_dao_theo_doi: ldtd || null,
      pho_phong: pp || null,
      truong_phong: tp || null,
      pgd_phu_trach: pgd || null,
    });
    setDangLuu(false);
    if (error) { toast.error(error); return; }
    toast.success('Đã cập nhật cấp phụ trách — các cấp này sẽ nhận nhịp và trao đổi.');
    setMoSua(false);
    onXong();
  };

  return (
    <div className="sm:col-span-2">
      <span className="text-xs uppercase tracking-wide text-slate-400">Cấp phụ trách</span>
      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-slate-800">
        {gia.lanh_dao_theo_doi && (
          <span>
            <span className="text-slate-400">Theo dõi </span>
            {tenNguoi.get(gia.lanh_dao_theo_doi) ?? '—'}
            {gia.lanh_dao_theo_doi === nguoiLam && !duocTuTheoDoi && (
              <span className="ml-1 font-medium text-amber-700">(đang tự theo dõi mình)</span>
            )}
          </span>
        )}
        {gia.pho_phong && (
          <span><span className="text-slate-400">PP </span>{tenNguoi.get(gia.pho_phong) ?? '—'}</span>
        )}
        {gia.truong_phong && (
          <span><span className="text-slate-400">TP </span>{tenNguoi.get(gia.truong_phong) ?? '—'}</span>
        )}
        {gia.pgd_phu_trach && (
          <span><span className="text-slate-400">PGĐ </span>{tenNguoi.get(gia.pgd_phu_trach) ?? '—'}</span>
        )}
        {trong && <span className="font-medium text-amber-700">— chưa gán cấp phụ trách</span>}
        {suaDuoc && !moSua && (
          <button
            className="text-xs font-medium text-brand-navy underline underline-offset-2"
            onClick={() => setMoSua(true)}
          >
            {trong ? 'Gán cấp phụ trách' : 'Sửa'}
          </button>
        )}
      </span>

      {moSua && (
        <div className="mt-2 rounded-xl border border-amber-300 bg-white p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Lãnh đạo theo dõi</Label>
              <ChonNguoi gia={ldtd} dat={setLdtd} ds={nguoiTrongPhong}
                macDinh={truongPhongMacDinh} ghi="Trưởng phòng" />
              {loiTuTheoDoi && (
                <p className="mt-1 text-2xs font-medium text-amber-700">{loiTuTheoDoi}</p>
              )}
            </div>
            <div>
              <Label className="text-xs">Phó phòng</Label>
              <ChonNguoi gia={pp} dat={setPp} ds={nguoiTrongPhong} />
            </div>
            <div>
              <Label className="text-xs">Trưởng phòng</Label>
              <ChonNguoi gia={tp} dat={setTp} ds={nguoiTrongPhong}
                macDinh={truongPhongMacDinh} ghi="mặc định" />
            </div>
            <div>
              <Label className="text-xs">PGĐ phụ trách</Label>
              <ChonNguoi gia={pgd} dat={setPgd} ds={dsPgd} macDinh={pgdMacDinh} ghi="phụ trách phòng" />
            </div>
          </div>
          <p className="mt-2 text-2xs text-slate-500">
            Trưởng phòng và PGĐ điền sẵn theo danh mục phòng — sửa được. Các cấp
            này nhận thông báo mọi nhịp và trao đổi.
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" className="h-8" disabled={dangLuu || !!loiTuTheoDoi} onClick={luu}>
              {dangLuu ? 'Đang lưu…' : 'Lưu'}
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setMoSua(false)}>Hủy</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChonNguoi({ gia, dat, ds, macDinh, ghi }: {
  gia: string;
  dat: (v: string) => void;
  ds: Ct2NhanSu[];
  macDinh?: string;
  ghi?: string;
}) {
  return (
    <Select value={gia || 'KHONG'} onValueChange={(v) => dat(v === 'KHONG' ? '' : v)}>
      <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="KHONG">— Không gán —</SelectItem>
        {ds.map((n) => (
          <SelectItem key={n.id} value={n.id}>
            {n.full_name}{macDinh && n.id === macDinh ? ` (${ghi})` : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
