import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarDays, Info } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  CT2_NGUON_VIEC, hanGoiY, kiemTraGhiViec, locEmojiTieuDe,
  type Ct2FormGhiViec, type Ct2NguonViec,
} from '@/lib/ct2';
import {
  ct2TaoDauViec, ct2TaoDeXuat, ct2XuLyDeXuat,
  type Ct2DeXuat, type Ct2NhanSu, type Ct2Phong,
} from './useCt2Data';

/**
 * CỔNG 1 — «Ghi việc» (đúng 3 điều, dưới 30 giây, làm được ngay trong cuộc họp).
 *
 * Thiết kế theo đúng kết luận thực tế của Chi nhánh trong quy chế Miro §A1:
 * bắt điền nhiều trường trên điện thoại là nguyên nhân chính khiến card bị bỏ
 * trống. Ở đây chỉ hỏi: việc gì · ai làm · xong khi nào. Kết quả đầu ra, mục
 * tiêu và các bước chuyển sang Cổng 2 — hỏi lúc người ta bắt tay vào làm, khi
 * đầu óc đã ở đúng chỗ để trả lời.
 *
 * Nguyên tắc tâm lý áp dụng:
 *  · Không dùng thuật ngữ 5W2H/agile trên màn nhập — khung tư duy là giàn giáo
 *    vô hình, không phải bài kiểm tra. Chỉ nhắc «đủ 5W2H» ở Cổng 2 như một lời
 *    khen khi đã xong.
 *  · Hỏi bằng lời nói thường: «Việc gì?» «Ai làm?» «Xong khi nào?».
 *  · Hạn chọn bằng cụm từ đời thường (Cuối tuần này · Cuối tháng) — bấm một
 *    lần thay cho mở lịch và dò ngày trên màn hình nhỏ.
 *  · Mặc định người làm là chính mình: đúng trong đa số trường hợp, và biến
 *    thao tác thường gặp nhất thành 0 lần chạm.
 */

interface Props {
  open: boolean;
  phongId: string | null;
  phongs: Ct2Phong[];
  nhanSu: Ct2NhanSu[];
  cycleId: string | null;
  laLanhDao: boolean;
  /** Duyệt một đề xuất của cán bộ: điền sẵn tên việc, tạo xong đánh dấu ĐÃ DUYỆT */
  deXuat?: Ct2DeXuat | null;
  /** Đang xem bảng nào thì việc mới vào thẳng bảng đó; null = Kanban chung */
  bangId?: string | null;
  onClose: () => void;
  onXong: () => void;
}

export function Ct2CreateDialog({ open, phongId, phongs, nhanSu, cycleId, laLanhDao, deXuat, bangId = null, onClose, onXong }: Props) {
  const { profileId, departmentId } = useAuth();
  const [f, setF] = useState<Ct2FormGhiViec>({
    nguon_viec: 'CHU_DONG', cuoc_hop: '', tieu_de: '', nguoi_chiu_trach_nhiem: '', han_hoan_thanh: '',
  });
  const [lienPhong, setLienPhong] = useState(false);
  // Ba cấp phụ trách — Trưởng phòng và PGĐ tự điền sẵn theo phòng, sửa được
  const [phoPhong, setPhoPhong] = useState('');
  const [truongPhongChon, setTruongPhongChon] = useState('');
  const [pgdChon, setPgdChon] = useState('');
  const [phongThamGia, setPhongThamGia] = useState<string[]>([]);
  const [dangGui, setDangGui] = useState(false);
  const [tiepTuc, setTiepTuc] = useState(false);
  const [truongDo, setTruongDo] = useState<string | null>(null);

  const mocHan = useMemo(() => hanGoiY(), []);

  useEffect(() => {
    if (!open) return;
    setF({
      nguon_viec: deXuat ? 'CHU_DONG' : 'CHU_DONG',
      cuoc_hop: '',
      tieu_de: deXuat?.tieu_de ?? '',
      // Mặc định tự nhận việc — thao tác hay gặp nhất thành 0 lần chạm
      nguoi_chiu_trach_nhiem: deXuat?.nguoi_de_xuat ?? profileId ?? '',
      han_hoan_thanh: '',
    });
    setLienPhong(false);
    setPhongThamGia([]);
    setTiepTuc(false);
    setTruongDo(null);
    setPhoPhong('');
  }, [open, deXuat, profileId]);

  const thieu = useMemo(() => kiemTraGhiViec(f), [f]);
  const phong = phongId ?? departmentId ?? '';
  const nguoiTrongPhong = useMemo(
    () => nhanSu.filter((n) => n.department_id === phong),
    [nhanSu, phong],
  );

  // Trưởng phòng tự link từ danh mục phòng; PGĐ phụ trách tự link qua RPC —
  // cả hai đều SỬA ĐƯỢC trước khi lưu (yêu cầu của GĐ: auto nhưng không khoá)
  const truongPhongMacDinh = phongs.find((p) => p.id === phong)?.manager_id ?? '';
  useEffect(() => {
    if (open) setTruongPhongChon(truongPhongMacDinh);
  }, [open, truongPhongMacDinh]);

  const { data: pgdMacDinh } = useQuery({
    queryKey: ['ct2', 'pgd-cua-phong', phong],
    enabled: open && !!phong,
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await (supabase as unknown as {
        rpc(fn: string, a: Record<string, unknown>): PromiseLike<{ data: unknown }>;
      }).rpc('ct2_pgd_cua_phong', { _phong: phong });
      return (data as string | null) ?? '';
    },
  });
  useEffect(() => {
    if (open) setPgdChon(pgdMacDinh ?? '');
  }, [open, pgdMacDinh]);

  // Ứng viên PGĐ: những người đang là pgd_id của ít nhất một cán bộ — suy từ
  // danh bạ, không cần bảng vai trò riêng
  const { data: dsPgd = [] } = useQuery({
    queryKey: ['ct2', 'ds-pgd'],
    enabled: open,
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase.from('profiles')
        .select('pgd_id').not('pgd_id', 'is', null);
      const ids = [...new Set(((data ?? []) as Array<{ pgd_id: string }>).map((r) => r.pgd_id))];
      if (ids.length === 0) return [] as Ct2NhanSu[];
      const { data: ds } = await supabase.from('profiles')
        .select('id, full_name, department_id').in('id', ids).order('full_name');
      return (ds ?? []) as Ct2NhanSu[];
    },
  });

  // Cán bộ thường giao việc cho người khác → hệ thống tự chuyển thành đề xuất
  const laDeXuat = !laLanhDao && f.nguoi_chiu_trach_nhiem !== profileId;

  const dat = <K extends keyof Ct2FormGhiViec>(k: K, v: Ct2FormGhiViec[K]) => setF((c) => ({ ...c, [k]: v }));
  const vienDo = (t: string) =>
    truongDo === t && thieu.some((x) => x.truong === t) ? 'border-red-500 ring-1 ring-red-300' : '';

  const luu = async () => {
    if (!profileId || thieu.length > 0) return;
    setDangGui(true);

    if (laDeXuat) {
      const { error } = await ct2TaoDeXuat({
        phong,
        tieu_de: locEmojiTieuDe(f.tieu_de),
        ly_do: `Đề xuất giao cho ${nhanSu.find((n) => n.id === f.nguoi_chiu_trach_nhiem)?.full_name ?? 'đồng nghiệp'}, hạn ${f.han_hoan_thanh}`,
        nguoi_de_xuat: profileId,
      });
      setDangGui(false);
      if (error) { toast.error(error); return; }
      toast.success('Đã gửi đề xuất — lãnh đạo Phòng sẽ xem và đưa lên bảng.');
      onXong(); onClose();
      return;
    }

    const { error, id } = await ct2TaoDauViec({
      cycle_id: cycleId,
      nguon_viec: f.nguon_viec,
      cuoc_hop: f.nguon_viec === 'GIAO_BAN' ? (f.cuoc_hop.trim() || null) : null,
      tieu_de: locEmojiTieuDe(f.tieu_de),
      nguoi_chiu_trach_nhiem: f.nguoi_chiu_trach_nhiem,
      // Lãnh đạo theo dõi = Trưởng phòng đã chọn (đặc tả 2.3 — tự điền, sửa được)
      lanh_dao_theo_doi: truongPhongChon || truongPhongMacDinh || f.nguoi_chiu_trach_nhiem,
      pho_phong: phoPhong || null,
      truong_phong: truongPhongChon || null,
      pgd_phu_trach: pgdChon || null,
      bang_id: bangId,
      phong,
      // Phạm vi suy ra, không hỏi: liên phòng thì là việc toàn Chi nhánh
      pham_vi: lienPhong ? 'CHI_NHANH' : 'PHONG',
      // Kanban này không dùng cho việc lặp hằng ngày → luôn là việc tiến trình
      loai_dau_viec: 'TIEN_TRINH',
      lien_phong: lienPhong,
      cac_phong_tham_gia: lienPhong ? phongThamGia : [],
      ngay_bat_dau: new Date().toISOString().slice(0, 10),
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
    toast.success('Đã ghi việc vào cột «Chuẩn bị». Khi bắt tay làm, mở thẻ bấm «Bắt đầu làm».');
    onXong();

    if (tiepTuc) {
      // Ghi tiếp việc cùng cuộc họp: giữ nguồn + cuộc họp + hạn, xóa việc và người
      setF((c) => ({ ...c, tieu_de: '', nguoi_chiu_trach_nhiem: profileId ?? '' }));
      return;
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{deXuat ? 'Đưa đề xuất lên bảng' : 'Ghi việc mới'}</DialogTitle>
          <DialogDescription>
            Chỉ cần ba điều: việc gì · ai làm · xong khi nào. Cách làm và kết quả sẽ hỏi
            sau, lúc anh/chị bắt tay vào làm.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 1. Việc này từ đâu ra? */}
          {laLanhDao && (
            <div>
              <Label className="text-sm">Việc này từ đâu ra?</Label>
              <div className="mt-1.5 grid gap-1.5 sm:grid-cols-3">
                {CT2_NGUON_VIEC.map((n) => (
                  <button
                    key={n.ma}
                    type="button"
                    onClick={() => dat('nguon_viec', n.ma as Ct2NguonViec)}
                    className={`rounded-xl border p-2 text-left transition ${
                      f.nguon_viec === n.ma
                        ? 'border-brand-navy bg-brand-navy/5 ring-1 ring-brand-navy'
                        : 'border-slate-200 hover:border-brand-navy/40'
                    }`}
                  >
                    <span className="block text-sm font-medium text-slate-800">{n.icon} {n.ten}</span>
                    <span className="mt-0.5 block text-2xs leading-snug text-slate-500">{n.mo}</span>
                  </button>
                ))}
              </div>
              {f.nguon_viec === 'GIAO_BAN' && (
                <Input
                  className="mt-2"
                  value={f.cuoc_hop}
                  onChange={(e) => dat('cuoc_hop', e.target.value)}
                  placeholder="Cuộc họp nào? VD: Giao ban tuần 32/2026 (tùy chọn)"
                />
              )}
            </div>
          )}

          {/* 2. Việc gì? */}
          <div>
            <Label htmlFor="ct2-g-tieu_de" className="text-sm">Việc gì cần làm?</Label>
            <Input
              id="ct2-g-tieu_de"
              className={`mt-1 ${vienDo('tieu_de')}`}
              value={f.tieu_de}
              onChange={(e) => dat('tieu_de', e.target.value)}
              placeholder="VD: Hoàn thiện hồ sơ TSBĐ khách hàng Minh Long"
              autoFocus
            />
            <p className="mt-1 text-2xs text-slate-500">
              Ghi như đang nói với đồng nghiệp — làm gì, cho ai. Tránh «theo dõi», «triển khai».
            </p>
          </div>

          {/* 3. Ai làm? */}
          <div>
            <Label htmlFor="ct2-g-nguoi" className="text-sm">Ai làm?</Label>
            <Select value={f.nguoi_chiu_trach_nhiem} onValueChange={(v) => dat('nguoi_chiu_trach_nhiem', v)}>
              <SelectTrigger id="ct2-g-nguoi" className={`mt-1 ${vienDo('nguoi_chiu_trach_nhiem')}`}>
                <SelectValue placeholder="Chọn 1 người" />
              </SelectTrigger>
              <SelectContent>
                {profileId && nguoiTrongPhong.some((n) => n.id === profileId) && (
                  <SelectItem value={profileId}>Tôi</SelectItem>
                )}
                {nguoiTrongPhong.filter((n) => n.id !== profileId).map((n) => (
                  <SelectItem key={n.id} value={n.id}>{n.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {laDeXuat && (
              <p className="mt-1 flex items-start gap-1 text-2xs text-amber-700">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                Giao việc cho người khác cần lãnh đạo Phòng duyệt — nội dung này sẽ được
                gửi đi dưới dạng đề xuất.
              </p>
            )}
          </div>

          {/* 4. Xong khi nào? */}
          <div>
            <Label className="text-sm">Xong khi nào?</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {mocHan.map((m) => (
                <button
                  key={m.ngay}
                  type="button"
                  onClick={() => dat('han_hoan_thanh', m.ngay)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    f.han_hoan_thanh === m.ngay
                      ? 'border-brand-navy bg-brand-navy text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-brand-navy/40'
                  }`}
                >
                  {m.nhan}
                </button>
              ))}
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2">
                <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                <input
                  id="ct2-g-han_hoan_thanh"
                  type="date"
                  className={`h-7 border-0 bg-transparent text-xs outline-none ${vienDo('han_hoan_thanh')}`}
                  value={f.han_hoan_thanh}
                  onChange={(e) => dat('han_hoan_thanh', e.target.value)}
                />
              </span>
            </div>
          </div>

          {/*
            Các cấp phụ trách — GĐ yêu cầu nhập được Phó phòng · Trưởng phòng ·
            PGĐ phụ trách. Trưởng phòng và PGĐ TỰ ĐIỀN SẴN theo phòng (auto-link)
            nhưng sửa được; Phó phòng chọn tay vì hệ thống không biết phó nào
            phụ trách mảng việc này.
          */}
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="mb-2 text-sm font-medium text-slate-700">Các cấp phụ trách</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <Label className="text-xs">Phó phòng</Label>
                <Select value={phoPhong || 'KHONG'} onValueChange={(v) => setPhoPhong(v === 'KHONG' ? '' : v)}>
                  <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KHONG">— Không gán —</SelectItem>
                    {nguoiTrongPhong.map((n) => (
                      <SelectItem key={n.id} value={n.id}>{n.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Trưởng phòng</Label>
                <Select value={truongPhongChon || 'KHONG'} onValueChange={(v) => setTruongPhongChon(v === 'KHONG' ? '' : v)}>
                  <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KHONG">— Không gán —</SelectItem>
                    {nguoiTrongPhong.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.full_name}{n.id === truongPhongMacDinh ? ' (mặc định)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">PGĐ phụ trách</Label>
                <Select value={pgdChon || 'KHONG'} onValueChange={(v) => setPgdChon(v === 'KHONG' ? '' : v)}>
                  <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KHONG">— Không gán —</SelectItem>
                    {dsPgd.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.full_name}{n.id === (pgdMacDinh ?? '') ? ' (phụ trách phòng)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-2xs text-slate-400">Tự link theo PGĐ phụ trách phòng — sửa được.</p>
              </div>
            </div>
          </div>

          {/* Liên phòng — chỉ lãnh đạo, thu gọn vì ít dùng */}
          {laLanhDao && (
            <div className="rounded-xl border border-slate-200 p-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={lienPhong} onCheckedChange={(v) => setLienPhong(v === true)} />
                🤝 Việc này cần phòng khác cùng làm
              </label>
              {lienPhong && (
                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {phongs.filter((p) => p.id !== phong).map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={phongThamGia.includes(p.id)}
                        onCheckedChange={(v) => setPhongThamGia(
                          v === true ? [...phongThamGia, p.id] : phongThamGia.filter((x) => x !== p.id),
                        )}
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Ghi liền nhiều việc sau một cuộc giao ban */}
          {laLanhDao && f.nguon_viec === 'GIAO_BAN' && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <Checkbox checked={tiepTuc} onCheckedChange={(v) => setTiepTuc(v === true)} />
              Ghi tiếp chỉ đạo khác của cùng cuộc họp này
            </label>
          )}
        </div>

        {thieu.length > 0 && (
          <p className="flex flex-wrap gap-1.5 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600">
            <span>Còn thiếu:</span>
            {thieu.map((t) => (
              <button
                key={t.truong}
                type="button"
                onClick={() => {
                  setTruongDo(t.truong);
                  document.getElementById(`ct2-g-${t.truong === 'nguoi_chiu_trach_nhiem' ? 'nguoi' : t.truong}`)?.focus();
                }}
                className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700 hover:bg-red-200"
              >
                {t.ten}{t.ly_do ? ` (${t.ly_do})` : ''}
              </button>
            ))}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
          <Button onClick={luu} disabled={thieu.length > 0 || dangGui}>
            {dangGui ? 'Đang lưu…' : laDeXuat ? 'Gửi đề xuất' : 'Ghi việc'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
