/**
 * Hộp «Xem trước thẻ»: dựng đúng thành phần tấm thẻ của trang công khai
 * (src/danh-thiep-cong-khai/TheDanhThiep.tsx) từ payload nc_resolve_card(slug,
 * xem_truoc = true) — nghĩa là xem trước cả hồ sơ chưa phát hành, theo đúng
 * ma trận quyền hiển thị mà khách sẽ thấy.
 */
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { goiRpc } from '@/lib/danhThiep/db';
import type { KetQuaResolve, PayloadThe } from '@/lib/danhThiep/kieu';
import { CAC_NGON_NGU, TEN_NGON_NGU, type MaNgonNgu } from '@/lib/danhThiep/ngonNgu';
import { CHUOI } from '@/danh-thiep-cong-khai/chuoi';
import { TheDanhThiep } from '@/danh-thiep-cong-khai/TheDanhThiep';

interface Props {
  /** Slug của cán bộ cần xem; null = đóng hộp */
  slug: string | null;
  /** Hoặc đưa sẵn payload (xem mẫu từ điển) */
  payload?: PayloadThe | null;
  tieuDe?: string;
  onDong: () => void;
}

export function XemTruocThe({ slug, payload, tieuDe, onDong }: Props) {
  const [lang, setLang] = useState<MaNgonNgu>('vi');
  const [the, setThe] = useState<PayloadThe | null>(payload ?? null);
  const [loi, setLoi] = useState<string | null>(null);
  const mo = !!slug || !!payload;

  useEffect(() => {
    if (payload) { setThe(payload); return; }
    if (!slug) return;
    let huy = false;
    setThe(null);
    setLoi(null);
    goiRpc<KetQuaResolve>('nc_resolve_card', { _slug: slug, _xem_truoc: true })
      .then((r) => {
        if (huy) return;
        if (r.status === 'ok' || r.status === 'preview') setThe(r);
        else setLoi(r.status === 'revoked' ? 'Thẻ này đã thu hồi — khách sẽ thấy trang «đã chuyển công tác».' : 'Không đọc được hồ sơ này.');
      })
      .catch((e: Error) => { if (!huy) setLoi(e.message); });
    return () => { huy = true; };
  }, [slug, payload]);

  return (
    <Dialog open={mo} onOpenChange={(o) => { if (!o) onDong(); }}>
      <DialogContent className="max-w-lg bg-[#12202E] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-white">{tieuDe ?? 'Xem trước thẻ'}</DialogTitle>
          <DialogDescription className="text-white/70">
            Đúng những gì khách thấy sau khi quét — đổi ngôn ngữ để rà bản dịch.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap justify-center gap-1.5">
          {CAC_NGON_NGU.map((l) => (
            <Button key={l} type="button" size="sm" variant={l === lang ? 'default' : 'outline'}
              className={l === lang ? 'bg-[#A8763E] hover:bg-[#8f6233]' : 'border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white'}
              onClick={() => setLang(l)}>
              {TEN_NGON_NGU[l]}
            </Button>
          ))}
        </div>
        <div className="max-h-[70vh] overflow-y-auto py-2">
          {loi ? (
            <p className="rounded-lg bg-white p-4 text-center text-sm text-destructive">{loi}</p>
          ) : the ? (
            <TheDanhThiep the={the} lang={lang} chuoi={CHUOI[lang]} />
          ) : (
            <p className="flex items-center justify-center gap-2 py-10 text-white/80"><Loader2 className="h-4 w-4 animate-spin" /> Đang dựng thẻ…</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
