/**
 * Khối «Mã lưu nhanh» trên màn «Danh thiếp số của tôi».
 *
 * Mã QR chứa THẲNG danh bạ (tên + số), camera khách quét là hiện «Thêm liên
 * hệ», không cần mạng. Cán bộ tự đặt tên hiện trong danh bạ khách và chọn số —
 * vì khách có tuổi ở hội trường đền bù dùng máy rẻ tiền nhiều đời, có máy lưu
 * tiếng Việt lỗi dấu; cán bộ ở địa bàn biết rõ hơn máy chủ nên để họ chọn.
 *
 * «Chế độ sự kiện»: mã kín màn hình, nền trắng, tên chữ lớn, cho cán bộ chìa
 * điện thoại ra giữa hội trường.
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
  TIEN_TO, boDauGiuHoa, chuanHoaSoTheoDang, soHopLe, taoVcardNhanh, tenMacDinh, tenTepMaNhanh, type DangSo,
} from '@/lib/danhThiep/maLuuNhanh';
import { soOMotCanh, taiTepVeMay, taoQrPngThuan } from '@/lib/danhThiep/qr';

interface Props {
  cb: CanBo;
  dangLuu: boolean;
  /** Lưu hai cột qr_nhanh_ten / qr_nhanh_sdt; trả lỗi qua toast ở nơi gọi */
  onLuu: (dong: { qr_nhanh_ten: string; qr_nhanh_sdt: string }) => Promise<void>;
}

type NguonSo = 'di_dong' | 'co_quan' | 'khac';

export function MaLuuNhanh({ cb, dangLuu, onLuu }: Props) {
  // Tên: cán bộ gõ phần SAU tiền tố; tiền tố «VietinBank - » luôn cố định để
  // khách gõ «Viet» trong danh bạ là ra, không phụ thuộc cán bộ nhớ hay quên
  const tenDaLuu = cb.qr_nhanh_ten?.startsWith(TIEN_TO) ? cb.qr_nhanh_ten.slice(TIEN_TO.length) : cb.qr_nhanh_ten;
  const [ten, setTen] = useState<string>(tenDaLuu ?? cb.full_name);
  const [nguon, setNguon] = useState<NguonSo>(() => {
    if (cb.qr_nhanh_sdt && cb.phone_office && chuanHoaSoTheoDang(cb.phone_office, 'noi_dia') === chuanHoaSoTheoDang(cb.qr_nhanh_sdt, 'noi_dia')) return 'co_quan';
    if (cb.qr_nhanh_sdt && cb.phone_mobile && chuanHoaSoTheoDang(cb.phone_mobile, 'noi_dia') === chuanHoaSoTheoDang(cb.qr_nhanh_sdt, 'noi_dia')) return 'di_dong';
    return cb.qr_nhanh_sdt ? 'khac' : 'di_dong';
  });
  const [soKhac, setSoKhac] = useState<string>(cb.qr_nhanh_sdt ?? '');
  const [dang, setDang] = useState<DangSo>(cb.qr_nhanh_sdt?.startsWith('+') ? 'quoc_te' : 'noi_dia');
  const [suKien, setSuKien] = useState(false);
  const [anh, setAnh] = useState<string | null>(null);

  const soGoc = nguon === 'di_dong' ? (cb.phone_mobile ?? '') : nguon === 'co_quan' ? (cb.phone_office ?? '') : soKhac;
  const sdt = chuanHoaSoTheoDang(soGoc, dang);
  const tenDayDu = TIEN_TO + ten.replace(/\s+/g, ' ').trim();
  const hopLe = ten.trim().length >= 2 && soHopLe(sdt);
  const vcard = useMemo(() => (hopLe ? taoVcardNhanh({ ten: tenDayDu, sdt }) : ''), [hopLe, tenDayDu, sdt]);
  const soO = useMemo(() => (vcard ? soOMotCanh(vcard) : 0), [vcard]);
  const daDoi = tenDayDu !== (cb.qr_nhanh_ten ?? '') || sdt !== (cb.qr_nhanh_sdt ?? '');
  const coDau = /[̀-ͯ]|[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(ten.normalize('NFD'));

  useEffect(() => {
    let huy = false;
    let cu: string | null = null;
    if (!vcard) { setAnh(null); return; }
    taoQrPngThuan(vcard).then((b) => {
      if (huy) return;
      cu = URL.createObjectURL(b);
      setAnh(cu);
    }).catch(() => setAnh(null));
    return () => { huy = true; if (cu) URL.revokeObjectURL(cu); };
  }, [vcard]);

  const luu = async () => {
    if (!hopLe) { toast.error('Cần tên từ 2 ký tự và số điện thoại 9–15 chữ số'); return; }
    await onLuu({ qr_nhanh_ten: tenDayDu, qr_nhanh_sdt: sdt });
  };

  const taiPng = async () => {
    try { taiTepVeMay(await taoQrPngThuan(vcard), tenTepMaNhanh(tenDayDu)); }
    catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><ScanLine className="h-4 w-4" /> Mã lưu nhanh — khách quét là lưu, không cần mạng</CardTitle>
        <CardDescription>
          Dành cho khách có tuổi, hội trường đông người, sóng yếu. Camera điện thoại khách quét mã này sẽ hiện ngay
          «Thêm liên hệ» với tên <b>{tenDayDu}</b>. Mã không đi qua máy chủ nên không cần mạng, nhưng cũng không thu hồi được — dùng số công vụ.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 lg:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <div>
            <Label htmlFor="mn-ten">Tên hiện trong danh bạ khách</Label>
            <div className="mt-1 flex items-center rounded-md border bg-background pl-3 focus-within:ring-2 focus-within:ring-ring">
              <span className="whitespace-nowrap text-sm text-muted-foreground">{TIEN_TO}</span>
              <Input id="mn-ten" className="border-0 shadow-none focus-visible:ring-0" value={ten} maxLength={60}
                onChange={(e) => setTen(e.target.value)} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setTen(boDauGiuHoa(ten))} disabled={!coDau}>
                Bỏ dấu tiếng Việt
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setTen(cb.full_name)} disabled={ten === cb.full_name}>
                Lấy lại tên trong hồ sơ
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Máy rẻ tiền đời cũ có thể lưu tiếng Việt lỗi dấu. Địa bàn nhiều máy như vậy thì dùng bản không dấu:
              «{tenMacDinh(cb.full_name, true)}» — khách vẫn đọc ra tên, và không bao giờ thành ô vuông.
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
              {!cb.phone_mobile && !cb.phone_office && nguon !== 'khac' && (
                <p className="text-xs text-amber-700 dark:text-amber-400">Hồ sơ chưa có số nào — chọn «Số khác» và nhập.</p>
              )}
            </div>
            <label className="mt-3 flex items-center gap-3 text-sm">
              <Switch checked={dang === 'quoc_te'} onCheckedChange={(v) => setDang(v ? 'quoc_te' : 'noi_dia')} />
              <span>
                Dạng quốc tế <span className="font-mono">{chuanHoaSoTheoDang(soGoc, 'quoc_te') || '+84…'}</span>
                <span className="block text-xs text-muted-foreground">Tắt: dạng {chuanHoaSoTheoDang(soGoc, 'noi_dia') || '0…'} quen mắt với khách trong nước. Bật khi thẻ dùng chung với khách nước ngoài.</span>
              </span>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={luu} disabled={!hopLe || !daDoi || dangLuu}>Lưu mã lưu nhanh</Button>
            <Button variant="outline" onClick={() => setSuKien(true)} disabled={!anh}><Expand className="mr-1.5 h-4 w-4" /> Chế độ sự kiện</Button>
            <Button variant="outline" onClick={taiPng} disabled={!vcard}><Download className="mr-1.5 h-4 w-4" /> Tải PNG để in</Button>
          </div>
          {daDoi && hopLe && <p className="text-xs text-amber-700 dark:text-amber-400">Đang xem bản chưa lưu — bấm «Lưu mã lưu nhanh» để dùng lâu dài trên mọi máy.</p>}
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="rounded-xl bg-white p-2 shadow-sm">
            {anh ? <img src={anh} alt="Mã lưu nhanh" className="h-44 w-44" /> : <div className="h-44 w-44" />}
          </div>
          {soO > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              Mã {soO}×{soO} ô · in tối thiểu {soO <= 49 ? '3 cm' : soO <= 57 ? '4 cm' : '5 cm'}
              {soO > 49 && ' — tên dài làm mã dày, rút ngắn nếu khách quét chậm'}
            </p>
          )}
        </div>
      </CardContent>

      <Dialog open={suKien} onOpenChange={setSuKien}>
        <DialogContent className="max-w-md bg-white p-6 text-[#12202E]">
          <DialogTitle className="sr-only">Chế độ sự kiện</DialogTitle>
          <div className="flex flex-col items-center gap-4">
            {anh && <img src={anh} alt="Mã lưu nhanh" className="w-full max-w-[22rem]" />}
            <p className="text-center text-xl font-bold leading-tight">{tenDayDu}</p>
            <p className="font-mono text-lg tracking-wide">{sdt}</p>
            <p className="text-center text-sm text-muted-foreground">
              Mời bác mở <b>Máy ảnh</b>, chĩa vào mã, bấm vào dòng chữ hiện lên rồi bấm <b>Lưu</b>.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
