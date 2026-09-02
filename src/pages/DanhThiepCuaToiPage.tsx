/**
 * DANH THIẾP CỦA TÔI — trang tự phục vụ (Mục 6 đặc tả).
 *
 * Cán bộ chỉ tự sửa được: số di động, ảnh, tên tiếng nước ngoài (xác nhận mặt
 * chữ), các kênh chat và ảnh QR WeChat/Kakao. Chức danh, đơn vị, email, loại
 * nhân sự là của Phòng TCTH — muốn đổi chức danh đối ngoại thì GỬI ĐỀ NGHỊ để
 * Giám đốc hoặc TCTH duyệt. CSDL chặn mọi cột khác (trigger), màn này chỉ không bày ra.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Camera, Copy, Download, Eye, Loader2, Plus, QrCode, Send, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCauHinhDanhThiep, useDanhThiepCuaToi, useLamTuoiDanhThiep } from '@/hooks/useDanhThiep';
import { db, goiRpc, laChuaKichHoat, urlAnhDanhThiep } from '@/lib/danhThiep/db';
import {
  CAC_KENH, HUONG_DAN_KENH, TEN_KENH, TEN_LOAI_NHAN_SU, kenhCanQr, mauTheTheoLoai, type Kenh, type LoaiKenh,
} from '@/lib/danhThiep/kieu';
import { TEN_NGON_NGU } from '@/lib/danhThiep/ngonNgu';
import { taiTepVeMay, taoQrPng } from '@/lib/danhThiep/qr';
import { HuyHieuTrangThai } from '@/components/danh-thiep/HuyHieuTrangThai';
import { GIA_TRI_6_TRONG, NhapSauNgonNgu, raCotTen, type GiaTri6 } from '@/components/danh-thiep/NhapSauNgonNgu';
import { KhungXemThe } from '@/components/danh-thiep/XemTruocThe';

const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? 'https://whlysprzsguehxmrjwha.supabase.co';

/**
 * Nén ảnh trên máy cán bộ trước khi tải lên: ảnh chân dung 512 px JPEG (~40 KB)
 * — ảnh gốc từ điện thoại 3–8 MB mà thẻ chỉ hiện 96 px. Ảnh QR chat giữ nguyên
 * kích cỡ (tối đa 800 px) và PNG để không mất nét mã.
 */
async function nenAnh(file: File, maxPx: number, kieu: 'image/jpeg' | 'image/png'): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error('Trình duyệt không đọc được ảnh này — thử JPG hoặc PNG');
  const ti = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * ti);
  canvas.height = Math.round(bitmap.height * ti);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((ok, loi) => canvas.toBlob((b) => (b ? ok(b) : loi(new Error('Không nén được ảnh'))), kieu, 0.85));
}

async function kiemQrVuong(file: File): Promise<void> {
  if (file.size > 500 * 1024) throw new Error('Ảnh QR phải ≤ 500 KB');
  const bm = await createImageBitmap(file).catch(() => null);
  if (!bm) throw new Error('Không đọc được ảnh');
  if (bm.width < 500 || bm.height < 500) throw new Error('Ảnh QR phải ≥ 500×500 px');
  if (Math.abs(bm.width - bm.height) > bm.width * 0.05) throw new Error('Ảnh QR phải vuông');
}

export default function DanhThiepCuaToiPage() {
  const { user } = useAuth();
  const { data, isLoading, error: loiTai } = useDanhThiepCuaToi(user?.id);
  const { data: cauHinh = {} } = useCauHinhDanhThiep();
  const lamTuoi = useLamTuoiDanhThiep();
  const baseUrl = typeof cauHinh.card_base_url === 'string' ? cauHinh.card_base_url : 'https://bachungyenone.com/card/';

  const [dangLuu, setDangLuu] = useState(false);
  const [sdt, setSdt] = useState<string | null>(null);
  const [tenCjk, setTenCjk] = useState<{ zh: string; ko: string; ja: string } | null>(null);
  const [dangDung, setDangDung] = useState(false);
  const [kenhMoi, setKenhMoi] = useState<{ type: LoaiKenh; value: string } | null>(null);
  const [deNghi, setDeNghi] = useState<{ ten: GiaTri6; lyDo: string; hetHan: string } | null>(null);

  const cb = data?.canBo ?? null;
  const hoatDong = !!cb && cb.card_enabled && !cb.revoked_at;
  const url = cb ? `${baseUrl}${cb.slug}` : '';

  const { data: luotQuet } = useQuery({
    queryKey: ['nc', 'luot-quet', cb?.id],
    enabled: !!cb,
    queryFn: async () => {
      const tu = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: rows } = await db.from('nc_scan_log').select('lang, action').eq('staff_id', cb!.id).gte('scanned_at', tu);
      const theoNgonNgu: Record<string, number> = {};
      let xem = 0; let luu = 0;
      for (const r of rows ?? []) {
        if (r.action === 'view') { xem++; theoNgonNgu[r.lang ?? '?'] = (theoNgonNgu[r.lang ?? '?'] ?? 0) + 1; }
        if (r.action === 'save_vcard') luu++;
      }
      return { xem, luu, theoNgonNgu };
    },
  });

  const luuTuPhucVu = async (dong: Record<string, unknown>, thongBao: string) => {
    if (!cb) return;
    setDangLuu(true);
    const { error } = await db.from('nc_staff').update(dong).eq('id', cb.id);
    setDangLuu(false);
    if (error) { toast.error(`Không lưu được: ${error.message}`); return; }
    toast.success(thongBao);
    lamTuoi();
  };

  const taiAnh = async (file: File | undefined, loai: 'anh' | LoaiKenh) => {
    if (!file || !cb) return;
    try {
      let blob: Blob; let ten: string; let kieu: string;
      if (loai === 'anh') {
        blob = await nenAnh(file, 512, 'image/jpeg'); ten = `${cb.id}/anh.jpg`; kieu = 'image/jpeg';
      } else {
        await kiemQrVuong(file);
        blob = await nenAnh(file, 800, 'image/png'); ten = `${cb.id}/qr-${loai}.png`; kieu = 'image/png';
      }
      const { error } = await supabase.storage.from('nc-danh-thiep').upload(ten, blob, { upsert: true, contentType: kieu, cacheControl: '3600' });
      if (error) throw new Error(error.message);
      // Thêm ?v= để CDN không trả ảnh cũ sau khi ghi đè cùng đường dẫn
      const urlAnh = `${urlAnhDanhThiep(ten)}?v=${Date.now()}`;
      if (loai === 'anh') {
        await luuTuPhucVu({ photo_url: urlAnh }, 'Đã cập nhật ảnh');
      } else {
        const { error: e2 } = await db.from('nc_channel').upsert({ staff_id: cb.id, type: loai, qr_image_url: urlAnh }, { onConflict: 'staff_id,type' });
        if (e2) throw new Error(e2.message);
        toast.success(`Đã lưu ảnh QR ${TEN_KENH[loai]}`);
        lamTuoi();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const themKenh = async () => {
    if (!kenhMoi || !cb) return;
    if (kenhCanQr(kenhMoi.type)) { toast.error('Kênh này cần tải ảnh QR — dùng nút bên dưới'); return; }
    if (!kenhMoi.value.trim()) { toast.error('Nhập số / ID / đường dẫn'); return; }
    const { error } = await db.from('nc_channel').upsert({ staff_id: cb.id, type: kenhMoi.type, value: kenhMoi.value.trim() }, { onConflict: 'staff_id,type' });
    if (error) { toast.error(error.message); return; }
    toast.success(`Đã lưu ${TEN_KENH[kenhMoi.type]}`);
    setKenhMoi(null);
    lamTuoi();
  };
  const xoaKenh = async (k: Kenh) => {
    const { error } = await db.from('nc_channel').delete().eq('id', k.id);
    if (error) { toast.error(error.message); return; }
    lamTuoi();
  };

  const guiDeNghi = async () => {
    if (!deNghi || !cb) return;
    if (!deNghi.ten.vi.trim() || !deNghi.ten.en.trim()) { toast.error('Cần tên tiếng Việt và tiếng Anh'); return; }
    if (deNghi.lyDo.trim().length < 10) { toast.error('Lý do cần ít nhất 10 ký tự'); return; }
    const { error } = await db.from('nc_custom_title').insert({
      staff_id: cb.id, ...raCotTen(deNghi.ten), reason: deNghi.lyDo.trim(), expires_on: deNghi.hetHan || null, requested_by: user?.id,
    });
    if (error) { toast.error(`Không gửi được: ${error.message}`); return; }
    toast.success('Đã gửi đề nghị — Giám đốc hoặc Phòng TCTH sẽ duyệt');
    setDeNghi(null);
    lamTuoi();
  };

  const kenhDaCo = useMemo(() => new Set((data?.kenh ?? []).map((k) => k.type)), [data]);

  // Cán bộ tự dựng bản nháp từ hồ sơ nhân sự 343 — thấy thẻ của mình ngay,
  // không phải chờ Phòng TCTH nhập tay. Thẻ vẫn chưa công khai cho tới khi duyệt.
  const dungBanNhap = async () => {
    setDangDung(true);
    try {
      await goiRpc('nc_tao_ban_nhap_tu_343', {});
      toast.success('Đã dựng bản nháp danh thiếp từ hồ sơ nhân sự của bạn');
      lamTuoi();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setDangDung(false);
    }
  };

  if (isLoading) return <p className="text-muted-foreground">Đang tải…</p>;
  if (loiTai && laChuaKichHoat(loiTai)) {
    return (
      <div className="space-y-4 animate-fade-in">
        <h1 className="page-header">Danh thiếp số của tôi</h1>
        <Card><CardContent className="p-6 text-sm text-muted-foreground">
          Phân hệ danh thiếp số chưa được kích hoạt trên máy chủ (Phòng TCTH chưa áp cập nhật cơ sở dữ liệu). Bạn sẽ thấy thẻ của mình ngay sau khi kích hoạt.
        </CardContent></Card>
      </div>
    );
  }
  if (loiTai) {
    return (
      <div className="space-y-4 animate-fade-in">
        <h1 className="page-header">Danh thiếp số của tôi</h1>
        <Card><CardContent className="p-6 text-sm text-destructive">Không đọc được hồ sơ danh thiếp: {(loiTai as Error).message}</CardContent></Card>
      </div>
    );
  }
  if (!cb) {
    return (
      <div className="space-y-4 animate-fade-in">
        <h1 className="page-header">Danh thiếp số của tôi</h1>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Bạn chưa có hồ sơ danh thiếp</CardTitle>
            <CardDescription>
              Bấm một nút để máy ghép bản nháp từ hồ sơ nhân sự 343 của bạn (tên, email, phòng → đơn vị, chức danh → chức danh đối ngoại).
              Bạn xem được ngay ở 6 ngôn ngữ; thẻ chỉ công khai sau khi Phòng TCTH duyệt và phát hành.
            </CardDescription></CardHeader>
          <CardContent>
            <Button onClick={dungBanNhap} disabled={dangDung}>
              {dangDung ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Eye className="mr-1.5 h-4 w-4" />} Dựng bản nháp danh thiếp của tôi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="page-header">Danh thiếp số của tôi</h1>
        <p className="page-subtitle">Khách quét QR sẽ thấy thẻ đúng ngôn ngữ của họ và lưu được liên hệ trong vài giây.</p>
      </div>

      {/* Thẻ hiện NGAY ở đầu trang — đúng thứ khách sẽ thấy, kể cả khi còn nháp */}
      <section className="rounded-2xl bg-[#12202E] p-4 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-white/80">
          <span>{hoatDong ? 'Thẻ của bạn — đúng như khách thấy khi quét' : 'Xem trước thẻ của bạn (chưa công khai)'}</span>
          {!hoatDong && !cb.revoked_at && (
            <span className="rounded-full border border-amber-300/50 px-2 py-0.5 text-xs text-amber-200">
              {cb.status === 'approved' ? 'Đã duyệt · chờ TCTH phát hành' : 'Bản nháp · chờ Phòng TCTH duyệt'}
            </span>
          )}
        </div>
        <KhungXemThe slug={cb.slug} gon />
        {!cb.external_title_id && !cb.custom_title_id && (
          <p className="mt-2 text-xs text-amber-200">Chưa gán được chức danh đối ngoại từ chức danh 343 của bạn — Phòng TCTH sẽ gán khi duyệt.</p>
        )}
      </section>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            {cb.full_name} <HuyHieuTrangThai tt={cb.status} />
            {hoatDong ? <span className="text-xs font-normal text-emerald-700">Thẻ đang hoạt động</span>
              : cb.revoked_at ? <span className="text-xs font-normal text-destructive">Thẻ đã thu hồi</span>
              : <span className="text-xs font-normal text-muted-foreground">Chưa phát hành</span>}
          </CardTitle>
          <CardDescription>{TEN_LOAI_NHAN_SU[cb.employment_type]} · mẫu {mauTheTheoLoai(cb.employment_type) === 'TPL_OFFICIAL' ? 'thẻ cán bộ VietinBank' : 'thẻ đối tác / cộng tác viên'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-muted px-2 py-1 text-xs">{url}</code>
            <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(url).then(() => toast.success('Đã sao chép đường dẫn thẻ'))}><Copy className="mr-1 h-4 w-4" /> Sao chép</Button>
            {hoatDong && (
              <>
                <Button size="sm" variant="outline" onClick={async () => {
                  try { taiTepVeMay(await taoQrPng(`${url}?c=qr`, { logo: cauHinh.logo_enabled !== false && mauTheTheoLoai(cb.employment_type) === 'TPL_OFFICIAL' }), `${(cb.full_name_latin ?? cb.slug).replace(/[^A-Za-z0-9]+/g, '')}-QR.png`); }
                  catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
                }}><QrCode className="mr-1 h-4 w-4" /> Tải QR (chữ ký email)</Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={`${SUPABASE_URL}/functions/v1/danh-thiep-vcard?slug=${cb.slug}&lang=vi&c=direct`}><Download className="mr-1 h-4 w-4" /> Tệp .vcf</a>
                </Button>
              </>
            )}
          </div>
          {luotQuet && hoatDong && (
            <p className="text-xs text-muted-foreground">
              30 ngày qua: <b>{luotQuet.xem}</b> lượt xem · <b>{luotQuet.luu}</b> lượt lưu danh bạ
              {Object.keys(luotQuet.theoNgonNgu).length > 0 && ` · theo ngôn ngữ: ${Object.entries(luotQuet.theoNgonNgu).map(([l, n]) => `${TEN_NGON_NGU[l as keyof typeof TEN_NGON_NGU] ?? l} ${n}`).join(', ')}`}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Thông tin tự cập nhật</CardTitle>
            <CardDescription>Chức danh, đơn vị, email do Phòng TCTH quản lý — cần đổi thì báo TCTH.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-muted">
                {cb.photo_url && <img src={cb.photo_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div>
                <Label htmlFor="nc-anh" className="cursor-pointer">
                  <span className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-muted"><Camera className="mr-1.5 h-4 w-4" /> Đổi ảnh chân dung</span>
                </Label>
                <input id="nc-anh" type="file" accept="image/*" className="hidden" onChange={(e) => { void taiAnh(e.target.files?.[0], 'anh'); e.target.value = ''; }} />
                <p className="mt-1 text-xs text-muted-foreground">Ảnh nền sáng, chính diện; tự nén về 512 px.</p>
              </div>
            </div>
            <div>
              <Label htmlFor="nc-sdt">Số di động (hiện trên thẻ, khách bấm là gọi)</Label>
              <div className="flex gap-2">
                <Input id="nc-sdt" value={sdt ?? cb.phone_mobile ?? ''} onChange={(e) => setSdt(e.target.value)} />
                <Button disabled={sdt === null || dangLuu} onClick={() => luuTuPhucVu({ phone_mobile: (sdt ?? '').trim() || null }, 'Đã lưu số di động').then(() => setSdt(null))}>Lưu</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tên bằng chữ nước ngoài — bạn xác nhận mặt chữ đúng</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input lang="zh" placeholder="Hán tự (陳文愷)" value={tenCjk?.zh ?? cb.name_zh ?? ''} onChange={(e) => setTenCjk({ zh: e.target.value, ko: tenCjk?.ko ?? cb.name_ko ?? '', ja: tenCjk?.ja ?? cb.name_ja ?? '' })} />
                <Input lang="ko" placeholder="Hangul" value={tenCjk?.ko ?? cb.name_ko ?? ''} onChange={(e) => setTenCjk({ zh: tenCjk?.zh ?? cb.name_zh ?? '', ko: e.target.value, ja: tenCjk?.ja ?? cb.name_ja ?? '' })} />
                <Input lang="ja" placeholder="Katakana" value={tenCjk?.ja ?? cb.name_ja ?? ''} onChange={(e) => setTenCjk({ zh: tenCjk?.zh ?? cb.name_zh ?? '', ko: tenCjk?.ko ?? cb.name_ko ?? '', ja: e.target.value })} />
              </div>
              <Button size="sm" disabled={tenCjk === null || dangLuu}
                onClick={() => tenCjk && luuTuPhucVu({ name_zh: tenCjk.zh.trim() || null, name_ko: tenCjk.ko.trim() || null, name_ja: tenCjk.ja.trim() || null }, 'Đã lưu tên tiếng nước ngoài').then(() => setTenCjk(null))}>
                Lưu tên
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Kênh chat trên thẻ</CardTitle>
            <CardDescription>Zalo/LINE/WhatsApp mở thẳng khung chat; WeChat và KakaoTalk không có link nên cần ảnh QR cá nhân.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <ul className="divide-y rounded-md border">
              {(data?.kenh ?? []).length === 0 && <li className="p-3 text-sm text-muted-foreground">Chưa có kênh nào.</li>}
              {(data?.kenh ?? []).map((k) => (
                <li key={k.id} className="flex items-center justify-between gap-2 p-2.5 text-sm">
                  <span><b>{TEN_KENH[k.type]}</b> <span className="text-muted-foreground">{k.value ?? (k.qr_image_url ? 'ảnh QR đã tải' : '')}</span></span>
                  <div className="flex items-center gap-1">
                    {kenhCanQr(k.type) && (
                      <Label htmlFor={`qr-${k.type}`} className="cursor-pointer rounded border px-2 py-1 text-xs hover:bg-muted">Đổi QR</Label>
                    )}
                    <Button size="icon" variant="ghost" title="Gỡ" onClick={() => xoaKenh(k)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </li>
              ))}
            </ul>
            {CAC_KENH.filter(kenhCanQr).map((t) => (
              <input key={t} id={`qr-${t}`} type="file" accept="image/*" className="hidden" onChange={(e) => { void taiAnh(e.target.files?.[0], t); e.target.value = ''; }} />
            ))}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setKenhMoi({ type: 'zalo', value: cb.phone_mobile ?? '' })}><Plus className="mr-1 h-4 w-4" /> Thêm kênh</Button>
              {CAC_KENH.filter(kenhCanQr).filter((t) => !kenhDaCo.has(t)).map((t) => (
                <Label key={t} htmlFor={`qr-${t}`} className="inline-flex cursor-pointer items-center rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                  <QrCode className="mr-1.5 h-4 w-4" /> Tải QR {TEN_KENH[t]}
                </Label>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Đề nghị chức danh đối ngoại riêng</CardTitle>
          <CardDescription>Khi cần chức danh không có trong từ điển (VD: «Phó GĐ kiêm phụ trách Japan Desk»). Giám đốc hoặc Phòng TCTH duyệt; có thể đặt hạn.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {(data?.chucDanhRieng ?? []).map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5 text-sm">
              <span><b>{r.name_vi}</b>{r.name_en ? ` · ${r.name_en}` : ''}{r.expires_on ? ` · đến ${r.expires_on}` : ''}</span>
              <span className="flex items-center gap-2"><HuyHieuTrangThai tt={r.status} />{r.reject_reason && <span className="text-xs text-destructive">{r.reject_reason}</span>}</span>
            </div>
          ))}
          {(cb.employment_type === 'bien_che' || cb.employment_type === 'hop_dong') ? (
            <Button size="sm" variant="outline" onClick={() => setDeNghi({ ten: { ...GIA_TRI_6_TRONG }, lyDo: '', hetHan: '' })}><Send className="mr-1 h-4 w-4" /> Gửi đề nghị</Button>
          ) : (
            <p className="text-xs text-muted-foreground">Chức danh riêng chỉ áp dụng cho cán bộ biên chế / hợp đồng.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!kenhMoi} onOpenChange={(o) => { if (!o) setKenhMoi(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm kênh chat</DialogTitle><DialogDescription>Khách bấm vào là mở thẳng ứng dụng đó.</DialogDescription></DialogHeader>
          {kenhMoi && (
            <div className="space-y-3">
              <Select value={kenhMoi.type} onValueChange={(v) => setKenhMoi({ ...kenhMoi, type: v as LoaiKenh })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CAC_KENH.filter((t) => !kenhCanQr(t)).map((t) => <SelectItem key={t} value={t}>{TEN_KENH[t]}</SelectItem>)}</SelectContent>
              </Select>
              <Input value={kenhMoi.value} onChange={(e) => setKenhMoi({ ...kenhMoi, value: e.target.value })} placeholder={HUONG_DAN_KENH[kenhMoi.type]} />
              <p className="text-xs text-muted-foreground">{HUONG_DAN_KENH[kenhMoi.type]}</p>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setKenhMoi(null)}>Hủy</Button><Button onClick={themKenh}>Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deNghi} onOpenChange={(o) => { if (!o) setDeNghi(null); }}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Đề nghị chức danh đối ngoại riêng</DialogTitle>
            <DialogDescription>Tiếng Việt và tiếng Anh bắt buộc; ngôn ngữ khác thiếu thì thẻ rơi về tiếng Anh. Không dịch máy — nhờ người bản ngữ nếu có.</DialogDescription></DialogHeader>
          {deNghi && (
            <div className="space-y-3">
              <NhapSauNgonNgu nhan="Chức danh đề nghị" idPrefix="dn" giaTri={deNghi.ten} onChange={(ten) => setDeNghi({ ...deNghi, ten })} />
              <div><Label htmlFor="dn-ly-do">Lý do *</Label><Textarea id="dn-ly-do" rows={2} value={deNghi.lyDo} onChange={(e) => setDeNghi({ ...deNghi, lyDo: e.target.value })} /></div>
              <div><Label htmlFor="dn-han">Hết hạn (nếu là chức danh dự án / nhiệm kỳ)</Label><Input id="dn-han" type="date" value={deNghi.hetHan} onChange={(e) => setDeNghi({ ...deNghi, hetHan: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setDeNghi(null)}>Hủy</Button><Button onClick={guiDeNghi}>{dangLuu ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gửi duyệt'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
