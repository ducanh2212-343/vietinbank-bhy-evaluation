import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Clock3, Eye, MessageSquarePlus, Trash2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavTree } from '@/hooks/useNavTree';
import { cn } from '@/lib/utils';
import { useGopY, GOP_Y_TRANG_THAI_LABEL, type GopYMuc, type GopYTrangThai } from './useGopY';
import { nhomMucGopY } from './gopYMuc';

/**
 * Nút «Góp ý» trên thanh điều hướng — hiện ở MỌI trang để ai cũng bấm vào
 * đóng góp được ngay. Form chỉ hai bước: tick menu/tính năng liên quan
 * (mục của trang đang mở được tick sẵn) và gõ nội dung. Bên dưới là danh sách
 * góp ý đã gửi của chính mình kèm trạng thái xử lý của Phòng TCTH / BGĐ.
 */

const TRANG_THAI_BADGE: Record<GopYTrangThai, { icon: typeof Clock3; className: string }> = {
  moi: { icon: Clock3, className: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300' },
  da_xem_xet: { icon: Eye, className: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
  da_xu_ly: { icon: Check, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
};

export function GopYNut() {
  const { isGuest, user, departmentId } = useAuth();
  const { sections, location: viTri } = useNavTree();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  // Chỉ tải danh sách khi form đang mở — nút hiện trên mọi trang
  const { gopYs, guiGopY, xoaGopY } = useGopY(open);
  const [noiDung, setNoiDung] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [mucDaChon, setMucDaChon] = useState<Map<string, string>>(new Map());

  // Họ tên + tên phòng chụp vào phiếu góp ý (file kết xuất không phải tra lại
  // profiles). Chỉ tra khi form mở — nút hiện trên mọi trang, không tự truy vấn.
  const { data: nguoiGui } = useQuery({
    queryKey: ['bhy-gop-y-nguoi-gui', user?.id, departmentId],
    enabled: !!user && open,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<{ hoTen: string; phong: string | null }> => {
      const [profileRes, deptRes] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('user_id', user!.id).maybeSingle(),
        departmentId
          ? supabase.from('departments').select('name').eq('id', departmentId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      return {
        hoTen: profileRes.data?.full_name ?? '',
        phong: deptRes.data?.name ?? null,
      };
    },
  });

  const nhomMuc = useMemo(() => nhomMucGopY(sections), [sections]);

  // Mở form: tick sẵn mục của trang đang xem — góp ý đúng chỗ chỉ còn việc gõ chữ
  useEffect(() => {
    if (!open) return;
    setMucDaChon((truoc) => {
      if (truoc.size > 0) return truoc; // giữ lựa chọn đang dở
      const leaf = viTri.leaf;
      return leaf ? new Map([[leaf.path, leaf.label]]) : new Map();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (isGuest || !user) return null;

  const toggleMuc = (m: GopYMuc) => {
    setMucDaChon((truoc) => {
      const sau = new Map(truoc);
      if (sau.has(m.path)) sau.delete(m.path);
      else sau.set(m.path, m.label);
      return sau;
    });
  };

  const handleGui = async () => {
    if (!noiDung.trim()) return;
    setDangGui(true);
    const ok = await guiGopY({
      noiDung,
      mucLienQuan: Array.from(mucDaChon, ([path, label]) => ({ path, label })),
      trangGui: pathname,
      nguoiGui: nguoiGui?.hoTen || user.email || 'Không rõ',
      phongBan: nguoiGui?.phong ?? null,
    });
    setDangGui(false);
    if (ok) {
      setNoiDung('');
      setMucDaChon(new Map());
      setOpen(false);
    }
  };

  const cuaToi = gopYs.filter((g) => g.isMine);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Góp ý cải thiện hệ thống BHY One"
        title="Góp ý cải thiện hệ thống"
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full outline-none transition-colors duration-fast hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MessageSquarePlus className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
          <DialogHeader className="border-b px-5 pb-3 pt-5 text-left">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5 text-primary" />
              Góp ý cải thiện BHY One
            </DialogTitle>
            <DialogDescription>
              Ý kiến gửi tới Phòng Tổ chức Tổng hợp và Ban Giám đốc để hoàn thiện hệ thống.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-5 py-4">
            {/* 1. Tick menu / tính năng liên quan */}
            <div>
              <p className="mb-1.5 text-sm font-medium">
                Góp ý về menu / tính năng nào?{' '}
                <span className="font-normal text-muted-foreground">(tick một hoặc nhiều mục — không bắt buộc)</span>
              </p>
              <div className="max-h-56 space-y-3 overflow-y-auto rounded-xl border p-3">
                {nhomMuc.map((nhom) => (
                  <div key={nhom.nhan}>
                    <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {nhom.nhan}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {nhom.muc.map((m) => {
                        const chon = mucDaChon.has(m.path);
                        return (
                          <button
                            key={m.path}
                            type="button"
                            onClick={() => toggleMuc(m)}
                            aria-pressed={chon}
                            className={cn(
                              'flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                              chon
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}
                          >
                            {chon && <Check className="h-3 w-3" />}
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Nội dung góp ý */}
            <div>
              <label htmlFor="gop-y-noi-dung" className="mb-1.5 block text-sm font-medium">
                Nội dung góp ý
              </label>
              <Textarea
                id="gop-y-noi-dung"
                value={noiDung}
                onChange={(e) => setNoiDung(e.target.value)}
                rows={4}
                placeholder="Điều gì đang bất tiện? Bạn muốn hệ thống cải thiện ra sao?"
                className="text-sm"
              />
            </div>

            <Button
              onClick={handleGui}
              disabled={dangGui || !noiDung.trim()}
              className="h-11 w-full rounded-xl"
            >
              {dangGui ? 'Đang gửi…' : 'Gửi góp ý'}
            </Button>

            {/* 3. Góp ý đã gửi của tôi + trạng thái xử lý */}
            {cuaToi.length > 0 && (
              <div className="border-t pt-3">
                <p className="mb-2 text-sm font-medium">Góp ý của tôi ({cuaToi.length})</p>
                <div className="max-h-52 space-y-2 overflow-y-auto">
                  {cuaToi.map((g) => {
                    const badge = TRANG_THAI_BADGE[g.trangThai];
                    return (
                      <div key={g.id} className="rounded-xl border bg-muted/30 px-3 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm">{g.noiDung}</p>
                          <div className="flex shrink-0 items-center gap-1">
                            <Badge variant="secondary" className={cn('gap-1 font-medium', badge.className)}>
                              <badge.icon className="h-3 w-3" />
                              {GOP_Y_TRANG_THAI_LABEL[g.trangThai]}
                            </Badge>
                            {g.trangThai === 'moi' && (
                              <button
                                type="button"
                                onClick={() => void xoaGopY(g.id)}
                                aria-label="Rút lại góp ý này"
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {g.mucLienQuan.length > 0 && (
                            <span>{g.mucLienQuan.map((m) => m.label).join(' · ')} — </span>
                          )}
                          {new Date(g.createdAt).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
