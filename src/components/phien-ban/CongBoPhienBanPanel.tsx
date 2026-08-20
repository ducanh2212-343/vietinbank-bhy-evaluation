// Công bố phiên bản cho cán bộ — khối trong màn Cài đặt (chỉ quản trị viên).
//
// Vì sao phải có một NÚT BẤM chứ không tự động báo khi bản mới lên:
//   - Bản mới lên máy chủ không có nghĩa là đã dùng được: có đợt còn chờ áp
//     migration, chờ deploy edge function. Báo trước là đẩy cán bộ tới một màn
//     hình lỗi rồi bảo họ "tính năng mới đấy".
//   - Người bấm nút là người biết đợt này đã chạy thật hay chưa, và chọn được
//     giờ báo cho hợp (đầu giờ sáng, tránh lúc cả Chi nhánh đang chốt số).
//
// Sổ công bố nằm ở database nên hai quản trị viên cùng bấm cũng chỉ ra một tin:
// RPC loại sẵn những mục đã có trong `phien_ban_cong_bo`.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Megaphone, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  LICH_SU_PHIEN_BAN, TEN_LOAI, MAU_LOAI, soanTinCongBo, dangKeVoiCanBo,
  type MucPhienBan,
} from '@/lib/lichSuPhienBan';

/** Gom mục theo ĐÚNG nhóm người nhận: mục dành riêng quản trị không làm phiền cả Chi nhánh. */
function gomTheoNguoiNhan(ds: MucPhienBan[]): Array<{ vaiTro: string[]; muc: MucPhienBan[] }> {
  const nhom = new Map<string, { vaiTro: string[]; muc: MucPhienBan[] }>();
  for (const m of ds) {
    const vaiTro = [...(m.danhCho ?? [])].sort();
    const khoa = vaiTro.join(',');
    if (!nhom.has(khoa)) nhom.set(khoa, { vaiTro, muc: [] });
    nhom.get(khoa)!.muc.push(m);
  }
  // Nhóm "mọi cán bộ" (vai trò rỗng) lên trước
  return [...nhom.values()].sort((a, b) => a.vaiTro.length - b.vaiTro.length);
}

export function CongBoPhienBanPanel() {
  const { toast } = useToast();
  const [daCongBo, setDaCongBo] = useState<Set<string> | null>(null);
  const [coPush, setCoPush] = useState(true);
  const [dangGui, setDangGui] = useState(false);
  /** Mục được tick để xử lý trong lần bấm này (null = chưa động vào, mặc định tick hết) */
  const [daChon, setDaChon] = useState<Set<string> | null>(null);

  const nap = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('phien_ban_cong_bo')
      .select('ma');
    if (error) {
      // Chưa áp migration → coi như chưa công bố gì, khối vẫn hiện để biết là có việc phải làm
      setDaCongBo(new Set());
      return;
    }
    setDaCongBo(new Set(((data as { ma: string }[]) || []).map((r) => r.ma)));
  }, []);

  useEffect(() => { void nap(); }, [nap]);

  const chuaCongBo = useMemo(() => {
    if (!daCongBo) return [];
    return LICH_SU_PHIEN_BAN.filter((m) => !daCongBo.has(m.ma) && dangKeVoiCanBo(m));
  }, [daCongBo]);

  const dangChon = useMemo(
    () => chuaCongBo.filter((m) => daChon === null || daChon.has(m.ma)),
    [chuaCongBo, daChon],
  );
  const cacNhom = useMemo(() => gomTheoNguoiNhan(dangChon), [dangChon]);

  const doiChon = (ma: string) => {
    setDaChon((truoc) => {
      const gop = new Set(truoc ?? chuaCongBo.map((m) => m.ma));
      if (gop.has(ma)) gop.delete(ma); else gop.add(ma);
      return gop;
    });
  };

  /**
   * guiTin=false → chỉ đóng sổ, không sinh tin nào. Dùng cho phần tồn đọng:
   * các mục đã lên hệ thống từ lâu, cán bộ đã dùng rồi, báo lại chỉ là nhiễu.
   */
  const congBo = async (guiTin = true) => {
    setDangGui(true);
    let tongNguoi = 0;
    let tongMuc = 0;
    try {
      for (const nhom of cacNhom) {
        const tin = soanTinCongBo(nhom.muc);
        if (!tin) continue;
        const { data, error } = await (supabase as any).rpc('phien_ban_cong_bo_dot', {
          _cac_muc: nhom.muc.map((m) => ({
            ma: m.ma, phien_ban: m.phienBan, ngay: m.ngay, loai: m.loai, tieu_de: m.tieuDe,
          })),
          _tieu_de: tin.tieuDe,
          _noi_dung: tin.noiDung,
          _co_push: coPush,
          _vai_tro: nhom.vaiTro,
          _gui_tin: guiTin,
        });
        if (error) throw error;
        tongNguoi += Number(data?.so_nguoi_nhan ?? 0);
        tongMuc += Number(data?.so_muc ?? 0);
      }
      toast({
        title: guiTin ? 'Đã công bố tới cán bộ' : 'Đã đóng sổ, không gửi tin nào',
        description: guiTin
          ? `${tongMuc} mục cập nhật · ${tongNguoi} lượt nhận tin`
            + (coPush ? ' · có thông báo đẩy' : ' · chỉ hiện ở chuông trong ứng dụng')
          : `${tongMuc} mục được đánh dấu đã báo — cán bộ không nhận thông báo nào`,
      });
      setDaChon(null);
      await nap();
    } catch (e) {
      toast({
        title: 'Chưa công bố được',
        description: (e as Error)?.message || 'Lỗi không xác định',
        variant: 'destructive',
      });
    } finally {
      setDangGui(false);
    }
  };

  const tinXemTruoc = useMemo(
    () => (cacNhom[0] ? soanTinCongBo(cacNhom[0].muc) : null),
    [cacNhom],
  );

  return (
    <div className="stat-card">
      <div className="mb-3 flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Công bố phiên bản cho cán bộ</h3>
      </div>

      {daCongBo === null ? (
        <p className="text-xs text-muted-foreground">Đang kiểm tra sổ công bố…</p>
      ) : chuaCongBo.length === 0 ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Check className="h-3.5 w-3.5 text-emerald-600" />
          Mọi tính năng mới đã báo tới cán bộ. Bản sửa lỗi và tinh chỉnh không báo — chỉ ghi vào lịch sử.
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted-foreground">
            Có <span className="font-semibold text-foreground">{chuaCongBo.length}</span> mục chưa báo cho cán bộ.
            Bỏ tick những mục chưa muốn báo. Phần đang chọn gộp thành{' '}
            {cacNhom.length <= 1 ? 'MỘT tin' : `${cacNhom.length} tin (tách theo nhóm người nhận)`} —
            bấm nút khi đợt này đã chạy thật trên hệ thống.
          </p>

          <ul className="mb-3 space-y-1.5">
            {chuaCongBo.map((m) => (
              <li key={m.ma} className="flex items-start gap-2 text-xs">
                <Checkbox
                  checked={daChon === null || daChon.has(m.ma)}
                  onCheckedChange={() => doiChon(m.ma)}
                  aria-label={`Chọn mục v${m.phienBan}`}
                  className="mt-0.5"
                />
                <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', MAU_LOAI[m.loai])} />
                <span className="min-w-0">
                  <span className="font-medium">v{m.phienBan}</span>{' '}
                  <span className="text-muted-foreground">{m.tieuDe}</span>{' '}
                  <Badge variant="outline" className="ml-1 text-[9px] font-normal">{TEN_LOAI[m.loai]}</Badge>
                  {m.danhCho && m.danhCho.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-[9px] font-normal">chỉ quản trị</Badge>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {tinXemTruoc && (
            <div className="mb-3 rounded-lg border bg-muted/40 p-3">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                Tin cán bộ sẽ nhận
              </div>
              <div className="text-xs font-semibold">🔔 {tinXemTruoc.tieuDe}</div>
              <div className="whitespace-pre-wrap text-xs text-muted-foreground">{tinXemTruoc.noiDung}</div>
            </div>
          )}

          <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="min-w-0">
              <div className="text-xs font-medium">Gửi cả thông báo đẩy</div>
              <div className="text-[11px] leading-snug text-muted-foreground">
                Tắt = chỉ hiện ở chuông trong ứng dụng, điện thoại không rung.
                Ngoài giờ làm việc hoặc ngày nghỉ, tin tự nằm chờ tới 7h00 buổi làm việc kế tiếp.
              </div>
            </div>
            <Switch checked={coPush} onCheckedChange={setCoPush} aria-label="Gửi thông báo đẩy" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => congBo(true)} disabled={dangGui || dangChon.length === 0} size="sm">
              {dangGui && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Công bố {dangChon.length} mục tới cán bộ
            </Button>
            {/* Lối thoát cho phần tồn đọng: đóng sổ mà không làm phiền ai */}
            <Button
              onClick={() => congBo(false)}
              disabled={dangGui || dangChon.length === 0}
              size="sm"
              variant="outline"
            >
              Đánh dấu đã báo, không gửi tin
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
