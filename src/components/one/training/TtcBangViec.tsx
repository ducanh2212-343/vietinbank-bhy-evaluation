import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, BadgeCheck, Link2, Printer, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { CT2_COT, cotHienThi } from '@/lib/ct2';
import { goiDauDuTruong, type TtcViecGoiDau } from '@/lib/trainingCenter';
import { useCt2NhanSu } from '@/components/one/move2/useCt2Data';
import type { TtcBoiCanh } from './useTrainingCenter';
import {
  luuViecGoiDau, nghiemThuViecGoiDau, useTtcKanban, useTtcLamTuoi, useTtcPhongCua, useTtcTheChonGoiDau, useTtcViecGoiDau,
} from './useTrainingCenter';
import { TtcKanban } from './TtcKanban';

/**
 * BẢNG VIỆC — ba việc gối đầu («3 việc lựa chọn với cán bộ») + Kanban 3 cột.
 *
 * Luồng đã chốt với Giám đốc 06/09: việc giao cho cán bộ được NHẬP Ở CHIÊU
 * THỨC 2 (đúng bảng của Phòng, cán bộ ghi nhịp như mọi thẻ khác) và HIỂN THỊ
 * tại Kanban hàng ngày của Training Center. Vì vậy mỗi việc gối đầu ở đây gồm
 * hai nửa: nửa «giao việc» theo phiếu WHY–WHAT–OWNER–STANDARD–DEADLINE–
 * CHECKPOINT do học viên lập, và nửa «thẻ thật» là một liên kết tới thẻ Chiêu
 * thức 2. Ban Giám đốc nghiệm thu ngay trên nửa thứ nhất.
 */
export function TtcBangViec({ bc }: { bc: TtcBoiCanh }) {
  const ctId = bc.chuongTrinh?.id ?? null;
  const hocVienId = bc.hocVien?.nguoi ?? null;
  const { data: dsGoiDau = [] } = useTtcViecGoiDau(ctId, hocVienId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-brand-navy">Ba việc gối đầu</h2>
          <p className="text-sm text-slate-600">
            Giao việc (Ngày 7) · Kèm cặp (Ngày 8) · IDP (Ngày 8). Đủ sáu trường 5W2H rồi mới liên kết thẻ Chiêu thức 2 và mở ô nghiệm thu.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <Printer className="mr-1 h-3.5 w-3.5" /> In báo cáo kết quả
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {[1, 2, 3].map((so) => (
          <TheGoiDau key={so} so={so as 1 | 2 | 3} bc={bc} cu={dsGoiDau.find((g) => g.so === so) ?? null} />
        ))}
      </div>

      <TtcKanban ctId={ctId} hocVienId={hocVienId} dsGoiDau={dsGoiDau} />
    </div>
  );
}

const RONG = {
  ten: '', muc_dich: '', dau_ra: '', can_bo: '', tieu_chuan: '', han: '', moc_kiem_tra: '', ket_qua: '', dau_viec_id: '',
};

function TheGoiDau({ so, bc, cu }: { so: 1 | 2 | 3; bc: TtcBoiCanh; cu: TtcViecGoiDau | null }) {
  const { profileId } = useAuth();
  const lamTuoi = useTtcLamTuoi();
  const ctId = bc.chuongTrinh!.id;
  const hocVienId = bc.hocVien?.nguoi ?? null;
  const { data: nhanSu = [] } = useCt2NhanSu();
  const { data: phongHocVien } = useTtcPhongCua(hocVienId);
  const { data: dsKanban = [] } = useTtcKanban(ctId, hocVienId);
  const [sua, setSua] = useState(false);
  const { data: dsChon = [] } = useTtcTheChonGoiDau(phongHocVien ?? null, sua && bc.laHocVien);

  const [f, setF] = useState({ ...RONG });
  const [nghiemThu, setNghiemThu] = useState('');
  const [dangLuu, setDangLuu] = useState(false);
  useEffect(() => {
    setF({
      ten: cu?.ten ?? '', muc_dich: cu?.muc_dich ?? '', dau_ra: cu?.dau_ra ?? '', can_bo: cu?.can_bo ?? '',
      tieu_chuan: cu?.tieu_chuan ?? '', han: cu?.han ?? '', moc_kiem_tra: cu?.moc_kiem_tra ?? '',
      ket_qua: cu?.ket_qua ?? '', dau_viec_id: cu?.dau_viec_id ?? '',
    });
    setNghiemThu(cu?.nghiem_thu ?? '');
  }, [cu]);

  const tenNguoi = useMemo(() => new Map(nhanSu.map((n) => [n.id, n.full_name])), [nhanSu]);
  const theLienKet = dsKanban.find((t) => t.id === cu?.dau_viec_id) ?? null;
  const cotThe = theLienKet ? CT2_COT.find((c) => c.ma === cotHienThi(theLienKet.trang_thai)) : null;
  const duTruong = cu ? goiDauDuTruong(cu) : false;
  // Người của phòng học viên trước, để danh sách chọn cán bộ không dài 150 tên
  const nhanSuChon = useMemo(
    () => [...nhanSu].sort((a, b) => Number(b.department_id === phongHocVien) - Number(a.department_id === phongHocVien)),
    [nhanSu, phongHocVien],
  );

  const luu = async () => {
    if (!hocVienId || !profileId) return;
    if (f.ten.trim().length < 5) { toast.error('Tên việc ít nhất 5 ký tự.'); return; }
    setDangLuu(true);
    try {
      await luuViecGoiDau({
        id: cu?.id, chuong_trinh_id: ctId, hoc_vien: hocVienId, so, ten: f.ten.trim(),
        muc_dich: f.muc_dich.trim() || null, dau_ra: f.dau_ra.trim() || null, can_bo: f.can_bo || null,
        tieu_chuan: f.tieu_chuan.trim() || null, han: f.han || null, moc_kiem_tra: f.moc_kiem_tra || null,
        ket_qua: f.ket_qua.trim() || null, dau_viec_id: f.dau_viec_id || null,
      });
      lamTuoi();
      setSua(false);
      toast.success(`Đã lưu việc gối đầu số ${so}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không lưu được');
    } finally { setDangLuu(false); }
  };

  const nghiem = async () => {
    if (!cu) return;
    if (nghiemThu.trim().length < 5) { toast.error('Ghi kết luận nghiệm thu ít nhất một câu.'); return; }
    try {
      await nghiemThuViecGoiDau(cu.id, nghiemThu.trim());
      lamTuoi();
      toast.success('Đã nghiệm thu.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không lưu được');
    }
  };

  const dat = (k: keyof typeof RONG, v: string) => setF((c) => ({ ...c, [k]: v }));

  return (
    <article className={`flex flex-col rounded-2xl border bg-white p-4 shadow-sm ${cu?.nghiem_thu ? 'border-emerald-300' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#A8763E] text-sm font-black text-white">{so}</span>
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400">Việc gối đầu {so}</p>
            <p className="text-sm font-bold leading-snug text-brand-navy">{cu?.ten ?? 'Chưa lập'}</p>
          </div>
        </div>
        {bc.laHocVien && !sua && (
          <Button size="sm" variant="ghost" onClick={() => setSua(true)}>{cu ? 'Sửa' : 'Lập'}</Button>
        )}
      </div>

      {sua && bc.laHocVien ? (
        <div className="mt-3 space-y-2 text-sm">
          <div><Label className="text-xs">WHAT — Việc gì</Label><Input value={f.ten} onChange={(e) => dat('ten', e.target.value)} placeholder="VD: Tổng hợp dữ liệu doanh nghiệp trong các KCN/CCN trên địa bàn" /></div>
          <div><Label className="text-xs">WHY — Vì sao cần làm</Label><Textarea rows={2} value={f.muc_dich} onChange={(e) => dat('muc_dich', e.target.value)} /></div>
          <div><Label className="text-xs">Đầu ra cần có</Label><Textarea rows={2} value={f.dau_ra} onChange={(e) => dat('dau_ra', e.target.value)} /></div>
          <div>
            <Label className="text-xs">OWNER — Cán bộ được giao</Label>
            <Select value={f.can_bo || 'KHONG'} onValueChange={(v) => dat('can_bo', v === 'KHONG' ? '' : v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Chọn cán bộ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="KHONG">— Chưa chọn —</SelectItem>
                {nhanSuChon.map((n) => <SelectItem key={n.id} value={n.id}>{n.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">STANDARD — Tiêu chuẩn đạt</Label><Textarea rows={2} value={f.tieu_chuan} onChange={(e) => dat('tieu_chuan', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">DEADLINE — Hạn</Label><Input type="date" value={f.han} onChange={(e) => dat('han', e.target.value)} /></div>
            <div><Label className="text-xs">CHECKPOINT — Mốc kiểm tra</Label><Input type="date" value={f.moc_kiem_tra} onChange={(e) => dat('moc_kiem_tra', e.target.value)} /></div>
          </div>
          <div>
            <Label className="text-xs">Thẻ trên Chiêu thức 2</Label>
            <Select value={f.dau_viec_id || 'KHONG'} onValueChange={(v) => dat('dau_viec_id', v === 'KHONG' ? '' : v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Chọn thẻ đã ghi ở Chiêu thức 2" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="KHONG">— Chưa liên kết —</SelectItem>
                {dsChon.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.ma_hien_thi ? `${t.ma_hien_thi} · ` : ''}{t.tieu_de}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-2xs text-slate-500">
              Chưa có thẻ? <Link to="/one/chieu-thuc-2" className="font-semibold text-brand-navy underline">Ghi việc ở Chiêu thức 2</Link> với cán bộ là người chịu trách nhiệm, rồi quay lại chọn.
            </p>
          </div>
          <div><Label className="text-xs">Kết quả (cập nhật khi xong)</Label><Textarea rows={2} value={f.ket_qua} onChange={(e) => dat('ket_qua', e.target.value)} /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" variant="ghost" onClick={() => setSua(false)}>Huỷ</Button>
            <Button size="sm" onClick={luu} disabled={dangLuu}><Save className="mr-1 h-3.5 w-3.5" /> Lưu</Button>
          </div>
        </div>
      ) : cu ? (
        <dl className="mt-3 space-y-1.5 text-sm">
          <Dong nhan="WHY" gia={cu.muc_dich} />
          <Dong nhan="Đầu ra" gia={cu.dau_ra} />
          <Dong nhan="Cán bộ" gia={cu.can_bo ? tenNguoi.get(cu.can_bo) ?? '—' : null} />
          <Dong nhan="Tiêu chuẩn" gia={cu.tieu_chuan} />
          <Dong nhan="Hạn" gia={cu.han ? cu.han.split('-').reverse().join('/') : null} />
          <Dong nhan="Mốc kiểm tra" gia={cu.moc_kiem_tra ? cu.moc_kiem_tra.split('-').reverse().join('/') : null} />
          <Dong nhan="Kết quả" gia={cu.ket_qua} />
          <div className="mt-2 rounded-xl bg-slate-50 p-2.5 text-xs">
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
          {!duTruong && <p className="text-2xs text-amber-700">Chưa đủ sáu trường 5W2H — ô nghiệm thu chưa mở.</p>}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-slate-500">Học viên lập theo phiếu WHY – WHAT – OWNER – STANDARD – DEADLINE – CHECKPOINT ở Ngày 7 và Ngày 8.</p>
      )}

      {/* Nghiệm thu của Ban Giám đốc */}
      {cu && (
        <div className={`mt-3 rounded-xl border p-3 ${cu.nghiem_thu ? 'border-emerald-200 bg-emerald-50/60' : 'border-dashed border-slate-300'}`}>
          <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-slate-500">
            <BadgeCheck className={`h-3.5 w-3.5 ${cu.nghiem_thu ? 'text-emerald-600' : ''}`} /> Nghiệm thu của Ban Giám đốc
          </p>
          {cu.nghiem_thu ? (
            <p className="mt-1 text-sm leading-relaxed text-slate-800">
              {cu.nghiem_thu}
              <span className="block text-2xs text-slate-500">
                {cu.nguoi_nghiem_thu ? tenNguoi.get(cu.nguoi_nghiem_thu) ?? '' : ''}{cu.nghiem_thu_luc ? ` · ${new Date(cu.nghiem_thu_luc).toLocaleDateString('vi-VN')}` : ''}
              </span>
            </p>
          ) : bc.laBgd && duTruong ? (
            <div className="mt-2 space-y-2">
              <Textarea rows={2} value={nghiemThu} onChange={(e) => setNghiemThu(e.target.value)} placeholder="Kết luận: đạt/chưa đạt tiêu chuẩn, bằng chứng, việc tiếp theo…" className="bg-white" />
              <div className="flex justify-end"><Button size="sm" onClick={nghiem}>Nghiệm thu</Button></div>
            </div>
          ) : (
            <p className="mt-1 text-xs text-slate-500">{duTruong ? 'Chờ Ban Giám đốc nghiệm thu.' : 'Mở khi đủ 5W2H.'}</p>
          )}
        </div>
      )}
      {!cu && !sua && bc.laHocVien && (
        <p className="mt-auto pt-3 text-2xs text-slate-400">
          <ArrowRight className="mr-1 inline h-3 w-3" /> Bấm «Lập» để bắt đầu.
        </p>
      )}
    </article>
  );
}

function Dong({ nhan, gia }: { nhan: string; gia: string | null | undefined }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-2">
      <dt className="text-2xs font-semibold uppercase tracking-wider text-slate-400 pt-0.5">{nhan}</dt>
      <dd className={gia ? 'text-slate-800' : 'text-slate-400'}>{gia || '—'}</dd>
    </div>
  );
}
