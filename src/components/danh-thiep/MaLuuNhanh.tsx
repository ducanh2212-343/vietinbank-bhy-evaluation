/**
 * Phần «QR offline» trên màn «Danh thiếp số của tôi».
 *
 * Mã QR chứa THẲNG danh bạ (tên + số), camera khách quét là hiện «Thêm liên
 * hệ», không cần mạng. Cán bộ tự gõ toàn bộ tên hiện trong danh bạ khách (chỉ
 * gợi ý «VietinBank - Tên», không ép) và chọn số — vì khách có tuổi ở hội
 * trường đền bù dùng máy rẻ tiền nhiều đời, có máy lưu tiếng Việt lỗi dấu; cán
 * bộ ở địa bàn biết rõ hơn máy chủ nên để họ chọn.
 *
 * Ảnh tải về có bốn mẫu (mã trần, mã có thương hiệu, name card, biển để bàn);
 * mẫu nào cũng vẽ mã ở mức M không logo, mỗi ô ≥ 8 px để camera quét được.
 */
import { useEffect, useMemo, useState } from 'react';
import { Download, Expand, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { CanBo } from '@/lib/danhThiep/kieu';
import {
  boDauGiuHoa, chuanHoaSoTheoDang, soHopLe, taoVcardNhanh, tenMacDinh, type DangSo,
} from '@/lib/danhThiep/maLuuNhanh';
import { CAC_MAU, TEN_MAU, tenTepMau, veMauAnh, type MauAnh } from '@/lib/danhThiep/mauAnhQr';
import { soOMotCanh, taiTepVeMay, taoQrPngThuan } from '@/lib/danhThiep/qr';

interface Props {
  cb: CanBo;
  dangLuu: boolean;
  /** Chức danh / đơn vị / email lấy từ thẻ online — chỉ vẽ lên mẫu name card, không vào mã */
  phu?: { chucDanh?: string; donVi?: string; email?: string };
  /** Lưu hai cột qr_nhanh_ten / qr_nhanh_sdt; lỗi báo qua toast ở nơi gọi */
  onLuu: (dong: { qr_nhanh_ten: string; qr_nhanh_sdt: string }) => Promise<void>;
}

type NguonSo = 'di_dong' | 'co_quan' | 'khac';

function dinhDangDeDoc(sdt: string): string {
  // 0966503279 → 0966 503 279 ; +84966503279 → +84 966 503 279
  const m = /^(\+84|0)(\d{3})(\d{3})(\d{3,4})$/.exec(sdt);
  return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]}` : sdt;
}

export function MaLuuNhanh({ cb, dangLuu, phu, onLuu }: Props) {
  const [ten, setTen] = useState<string>(cb.qr_nhanh_ten ?? tenMacDinh(cb.full_name, false));
  const [nguon, setNguon] = useState<NguonSo>(() => {
    const cung = (a: string | null, b: string | null) => !!a && !!b && chuanHoaSoTheoDang(a, 'noi_dia') === chuanHoaSoTheoDang(b, 'noi_dia');
    if (cung(cb.qr_nhanh_sdt, cb.phone_office)) return 'co_quan';
    if (cung(cb.qr_nhanh_sdt, cb.phone_mobile)) return 'di_dong';
    return cb.qr_nhanh_sdt ? 'khac' : cb.phone_mobile ? 'di_dong' : cb.phone_office ? 'co_quan' : 'khac';
  });
  const [soKhac, setSoKhac] = useState<string>(cb.qr_nhanh_sdt ?? '');
  const [dang, setDang] = useState<DangSo>(cb.qr_nhanh_sdt?.startsWith('+') ? 'quoc_te' : 'noi_dia');
  const [mau, setMau] = useState<MauAnh>('qr_thuong_hieu');
  const [suKien, setSuKien] = useState(false);
  const [anhQr, setAnhQr] = useState<string | null>(null);
  const [anhMau, setAnhMau] = useState<string | null>(null);
  const [dangVe, setDangVe] = useState(false);

  const soGoc = nguon === 'di_dong' ? (cb.phone_mobile ?? '') : nguon === 'co_quan' ? (cb.phone_office ?? '') : soKhac;
  const sdt = chuanHoaSoTheoDang(soGoc, dang);
  const tenSach = ten.replace(/\s+/g, ' ').trim();
  const hopLe = tenSach.length >= 3 && soHopLe(sdt);
  const vcard = useMemo(() => (hopLe ? taoVcardNhanh({ ten: tenSach, sdt }) : ''), [hopLe, tenSach, sdt]);
  const soO = useMemo(() => (vcard ? soOMotCanh(vcard) : 0), [vcard]);
  const daDoi = tenSach !== (cb.qr_nhanh_ten ?? '') || sdt !== (cb.qr_nhanh_sdt ?? '');
  const coDau = boDauGiuHoa(ten) !== ten.replace(/\s+/g, ' ').trim();

  // Mã trần cho ô xem trước nhỏ và chế độ sự kiện
  useEffect(() => {
    let huy = false; let cu: string | null = null;
    if (!vcard) { setAnhQr(null); return; }
    taoQrPngThuan(vcard).then((b) => { if (huy) return; cu = URL.createObjectURL(b); setAnhQr(cu); }).catch(() => setAnhQr(null));
    return () => { huy = true; if (cu) URL.revokeObjectURL(cu); };
  }, [vcard]);

  // Mẫu ảnh đang chọn: vẽ lại khi đổi mẫu hoặc đổi nội dung (chờ 300 ms cho người gõ xong)
  useEffect(() => {
    let huy = false; let cu: string | null = null;
    if (!vcard) { setAnhMau(null); return; }
    setDangVe(true);
    const t = setTimeout(() => {
      veMauAnh(mau, { vcard, ten: tenSach, sdt: dinhDangDeDoc(sdt), ...phu })
        .then((b) => { if (huy) return; cu = URL.createObjectURL(b); setAnhMau(cu); })
        .catch((e: Error) => { if (!huy) { setAnhMau(null); toast.error(e.message); } })
        .finally(() => { if (!huy) setDangVe(false); });
    }, 300);
    return () => { huy = true; clearTimeout(t); if (cu) URL.revokeObjectURL(cu); };
  }, [vcard, mau, tenSach, sdt, phu]);

  const luu = async () => {
    if (!hopLe) { toast.error('Cần tên từ 3 ký tự và số điện thoại 9–15 chữ số'); return; }
    await onLuu({ qr_nhanh_ten: tenSach, qr_nhanh_sdt: sdt });
  };

  const taiPng = async () => {
    try {
      taiTepVeMay(await veMauAnh(mau, { vcard, ten: tenSach, sdt: dinhDangDeDoc(sdt), ...phu }), tenTepMau(mau, boDauGiuHoa(tenSach)));
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><ScanLine className="h-4 w-4" /> Nội dung mã</CardTitle>
          <CardDescription>
            Khách mở máy ảnh, chĩa vào mã là hiện «Thêm liên hệ» — không cần mạng, không cần cài gì. Mã không đi qua máy chủ
            nên cũng không thu hồi được: dùng số công vụ.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <div>
              <Label htmlFor="mn-ten">Tên hiện trong danh bạ khách</Label>
              <Input id="mn-ten" className="mt-1" value={ten} maxLength={80} onChange={(e) => setTen(e.target.value)} />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setTen(boDauGiuHoa(ten))} disabled={!coDau}>
                  Bỏ dấu tiếng Việt
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setTen(tenMacDinh(cb.full_name, false))}
                  disabled={ten === tenMacDinh(cb.full_name, false)}>
                  Gợi ý: {tenMacDinh(cb.full_name, false)}
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Gõ đúng chữ muốn khách thấy. Nên bắt đầu bằng «VietinBank» để khách gõ «Viet» trong danh bạ là ra.
                Địa bàn nhiều máy rẻ tiền đời cũ thì dùng bản không dấu — khách vẫn đọc ra tên, không thành ô vuông.
              </p>
            </div>

            <div>
              <Label>Số điện thoại đưa vào mã</Label>
              <div className="mt-1 space-y-1.5 text-sm">
                {cb.phone_mobile && (
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="radio" name="mn-nguon" checked={nguon === 'di_dong'} onChange={() => setNguon('di_dong')} />
                    Số di động trên thẻ <span className="font-mono text-muted-foreground">{cb.phone_mobile}</span>
                  </label>
                )}
                {cb.phone_office && (
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="radio" name="mn-nguon" checked={nguon === 'co_quan'} onChange={() => setNguon('co_quan')} />
                    Số cơ quan <span className="font-mono text-muted-foreground">{cb.phone_office}</span>
                  </label>
                )}
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="radio" name="mn-nguon" checked={nguon === 'khac'} onChange={() => setNguon('khac')} />
                  Số khác
                </label>
                {nguon === 'khac' && (
                  <Input inputMode="tel" placeholder="0966 503 279" value={soKhac} onChange={(e) => setSoKhac(e.target.value)} className="max-w-xs" />
                )}
              </div>
              <label className="mt-3 flex items-center gap-3 text-sm">
                <Switch checked={dang === 'quoc_te'} onCheckedChange={(v) => setDang(v ? 'quoc_te' : 'noi_dia')} />
                <span>
                  Dạng quốc tế <span className="font-mono">{chuanHoaSoTheoDang(soGoc, 'quoc_te') || '+84…'}</span>
                  <span className="block text-xs text-muted-foreground">Tắt: dạng {chuanHoaSoTheoDang(soGoc, 'noi_dia') || '0…'} quen mắt với khách trong nước. Bật khi dùng chung với khách nước ngoài.</span>
                </span>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={luu} disabled={!hopLe || !daDoi || dangLuu}>Lưu nội dung mã</Button>
              <Button variant="outline" onClick={() => setSuKien(true)} disabled={!anhQr}><Expand className="mr-1.5 h-4 w-4" /> Chế độ sự kiện</Button>
            </div>
            {daDoi && hopLe && <p className="text-xs text-amber-700 dark:text-amber-400">Đang xem bản chưa lưu — bấm «Lưu nội dung mã» để dùng trên mọi máy đăng nhập.</p>}
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="rounded-xl bg-white p-2 shadow-sm">
              {anhQr ? <img src={anhQr} alt="Mã lưu nhanh" className="h-44 w-44" /> : <div className="h-44 w-44" />}
            </div>
            {soO > 0 && (
              <p className="max-w-[12rem] text-center text-xs text-muted-foreground">
                Mã {soO}×{soO} ô{soO > 49 && ' — tên dài làm mã dày, rút ngắn nếu khách quét chậm'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ảnh để in hoặc gửi khách</CardTitle>
          <CardDescription>Chọn mẫu rồi tải PNG. Mẫu nào cũng vẽ mã đủ lớn để camera điện thoại quét được ở cỡ in ghi kèm.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {CAC_MAU.map((m) => (
              <button key={m} type="button" onClick={() => setMau(m)}
                className={`rounded-lg border p-3 text-left text-sm transition-colors ${mau === m ? 'border-[#A8763E] bg-[#A8763E]/10' : 'hover:bg-muted'}`}>
                <span className="block font-medium">{TEN_MAU[m].ten}</span>
                <span className="block text-xs text-muted-foreground">{TEN_MAU[m].dung}</span>
                <span className="mt-1 block text-xs font-medium text-[#A8763E]">{TEN_MAU[m].coIn}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="flex w-full items-center justify-center rounded-xl border bg-muted/40 p-3" style={{ minHeight: '16rem' }}>
              {anhMau
                ? <img src={anhMau} alt={TEN_MAU[mau].ten} className="max-h-[26rem] max-w-full rounded shadow-sm" />
                : <span className="text-sm text-muted-foreground">{dangVe ? 'Đang vẽ mẫu…' : 'Nhập tên và số để xem mẫu'}</span>}
            </div>
            <Button onClick={taiPng} disabled={!vcard || dangVe}><Download className="mr-1.5 h-4 w-4" /> Tải PNG — {TEN_MAU[mau].ten}</Button>
            {mau === 'name_card' && !phu?.chucDanh && (
              <p className="text-center text-xs text-muted-foreground">Chức danh và đơn vị trên name card lấy từ danh thiếp online — chưa có thì để trống.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={suKien} onOpenChange={setSuKien}>
        <DialogContent className="max-w-md bg-white p-6 text-[#12202E]">
          <DialogTitle className="sr-only">Chế độ sự kiện</DialogTitle>
          <div className="flex flex-col items-center gap-4">
            {anhQr && <img src={anhQr} alt="Mã lưu nhanh" className="w-full max-w-[22rem]" />}
            <p className="text-center text-xl font-bold leading-tight">{tenSach}</p>
            <p className="font-mono text-lg tracking-wide">{dinhDangDeDoc(sdt)}</p>
            <p className="text-center text-sm text-muted-foreground">
              Mời bác mở <b>Máy ảnh</b>, chĩa vào mã, bấm vào dòng chữ hiện lên rồi bấm <b>Lưu</b>.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
