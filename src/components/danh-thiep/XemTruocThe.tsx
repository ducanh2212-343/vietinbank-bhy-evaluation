/**
 * Hộp «Xem trước thẻ»: dựng đúng thành phần tấm thẻ của trang công khai
 * (src/danh-thiep-cong-khai/TheDanhThiep.tsx) từ payload nc_resolve_card(slug,
 * xem_truoc = true) — nghĩa là xem trước cả hồ sơ chưa phát hành, theo đúng
 * ma trận quyền hiển thị mà khách sẽ thấy.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { goiRpc, thuLaiNc } from '@/lib/danhThiep/db';
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

/**
 * Lõi xem thẻ (nút ngôn ngữ + tấm thẻ) — dùng inline ở «Danh thiếp số của tôi»
 * để cán bộ thấy ngay thẻ của mình, và trong hộp thoại ở màn quản trị.
 */
export function KhungXemThe({ slug, payload, gon }: { slug: string | null; payload?: PayloadThe | null; gon?: boolean }) {
  const [lang, setLang] = useState<MaNgonNgu>('vi');

  // Dùng React Query (không phải useEffect + useState) để mọi thao tác lưu gọi
  // useLamTuoiDanhThiep() đều kéo lại tấm thẻ. Trước đây khung này chỉ nạp một
  // lần theo slug, nên cán bộ đổi số điện thoại hay ảnh xong vẫn thấy thẻ cũ và
  // tưởng hệ thống không lưu được.
  const { data: tai, error: loiTai } = useQuery({
    queryKey: ['nc', 'the', slug],
    enabled: !!slug && !payload,
    retry: thuLaiNc,
    queryFn: () => goiRpc<KetQuaResolve>('nc_resolve_card', { _slug: slug, _xem_truoc: true }),
  });

  const the: PayloadThe | null = payload
    ?? (tai && (tai.status === 'ok' || tai.status === 'preview') ? tai : null);
  const loi = loiTai
    ? (loiTai as Error).message
    : tai && tai.status === 'revoked'
      ? 'Thẻ này đã thu hồi — khách sẽ thấy trang «đã chuyển công tác».'
      : tai && tai.status === 'not_found'
        ? 'Không đọc được hồ sơ này.'
        : null;

  return (
    <>
      <div className="flex flex-wrap justify-center gap-1.5">
        {CAC_NGON_NGU.map((l) => (
          <Button key={l} type="button" size="sm" variant={l === lang ? 'default' : 'outline'}
            className={l === lang ? 'bg-[#A8763E] hover:bg-[#8f6233]' : 'border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white'}
            onClick={() => setLang(l)}>
            {TEN_NGON_NGU[l]}
          </Button>
        ))}
      </div>
      <div className={gon ? 'py-3' : 'max-h-[70vh] overflow-y-auto py-2'}>
        {loi ? (
          <p className="rounded-lg bg-white p-4 text-center text-sm text-destructive">{loi}</p>
        ) : the ? (
          <TheDanhThiep the={the} lang={lang} chuoi={CHUOI[lang]} />
        ) : (
          <p className="flex items-center justify-center gap-2 py-10 text-white/80"><Loader2 className="h-4 w-4 animate-spin" /> Đang dựng thẻ…</p>
        )}
      </div>
    </>
  );
}

export function XemTruocThe({ slug, payload, tieuDe, onDong }: Props) {
  const mo = !!slug || !!payload;
  return (
    <Dialog open={mo} onOpenChange={(o) => { if (!o) onDong(); }}>
      <DialogContent className="max-w-lg bg-[#12202E] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-white">{tieuDe ?? 'Xem trước thẻ'}</DialogTitle>
          <DialogDescription className="text-white/70">
            Đúng những gì khách thấy sau khi quét — đổi ngôn ngữ để rà bản dịch.
          </DialogDescription>
        </DialogHeader>
        {mo && <KhungXemThe slug={slug} payload={payload} />}
      </DialogContent>
    </Dialog>
  );
}
