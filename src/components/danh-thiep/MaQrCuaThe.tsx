/**
 * Mã QR của thẻ, hiện NGAY trên màn «Danh thiếp số của tôi».
 *
 * Vì sao phải hiện chứ không chỉ có nút tải về: tình huống dùng thật là cán bộ
 * đang ngồi với khách, chìa điện thoại ra cho khách quét. Trước đây muốn có mã
 * phải tải tệp PNG rồi mở thư viện ảnh — không ai làm kịp giữa buổi gặp.
 *
 * Nút «Phóng to» mở mã kín màn hình trên nền trắng và kéo độ sáng lên tối đa
 * (nếu trình duyệt cho), vì màn hình tối là lý do phổ biến nhất khiến máy khách
 * quét mãi không ăn.
 */
import { useEffect, useState } from 'react';
import { Expand, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { taoQrPng } from '@/lib/danhThiep/qr';

interface Props {
  /** Đường dẫn thẻ đã kèm tham số kênh, ví dụ https://…/card/abc?c=qr */
  url: string;
  /** Có gắn logo vào giữa mã không (chỉ mẫu thẻ cán bộ) */
  logo: boolean;
  /** Thẻ đã phát hành chưa — chưa thì mã vẫn hiện nhưng nói rõ khách chưa xem được */
  hoatDong: boolean;
}

export function MaQrCuaThe({ url, logo, hoatDong }: Props) {
  const [anh, setAnh] = useState<string | null>(null);
  const [toDay, setToDay] = useState(false);

  useEffect(() => {
    let huy = false;
    let cu: string | null = null;
    taoQrPng(url, { logo })
      .then((b) => {
        if (huy) return;
        cu = URL.createObjectURL(b);
        setAnh(cu);
      })
      .catch(() => setAnh(null));
    return () => { huy = true; if (cu) URL.revokeObjectURL(cu); };
  }, [url, logo]);

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-xl bg-white p-2 shadow-sm">
          {anh
            ? <img src={anh} alt="Mã QR danh thiếp" className="h-40 w-40" />
            : <div className="flex h-40 w-40 items-center justify-center text-muted-foreground"><QrCode className="h-8 w-8" /></div>}
        </div>
        <Button size="sm" variant="outline" onClick={() => setToDay(true)} disabled={!anh}>
          <Expand className="mr-1.5 h-4 w-4" /> Phóng to cho khách quét
        </Button>
        {!hoatDong && (
          <p className="max-w-[16rem] text-center text-xs text-amber-200">
            Thẻ chưa phát hành nên khách quét mã này sẽ chưa xem được. Mã giữ nguyên sau khi phát hành, in trước được.
          </p>
        )}
      </div>

      <Dialog open={toDay} onOpenChange={setToDay}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="text-center text-base text-[#12202E]">Mời khách quét mã</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 pb-2">
            {anh && <img src={anh} alt="Mã QR danh thiếp" className="w-full max-w-[19rem]" />}
            <p className="break-all text-center text-xs text-muted-foreground">{url.replace(/\?.*$/, '')}</p>
            <p className="text-center text-xs text-muted-foreground">Tăng độ sáng màn hình để máy khách bắt mã nhanh hơn.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
