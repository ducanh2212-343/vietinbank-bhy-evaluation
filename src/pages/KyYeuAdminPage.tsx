import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { TreeDeciduous, Upload, Music, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

/**
 * Quản trị Cây Ký Ức — kỷ yếu số 20 năm (Phòng TCTH / quản trị hệ thống).
 *
 * Thay PDF là tăng phien_ban → khóa cache IndexedDB của cán bộ đổi theo,
 * flipbook tự đọc bản mới, KHÔNG cần build lại code. File nằm trong bucket
 * private `ky-yeu`; RLS chỉ cho tcth_admin/system_admin ghi.
 */

const BUCKET = 'ky-yeu';
const GIOI_HAN_PDF = 25 * 1024 * 1024;
const GIOI_HAN_NHAC = 8 * 1024 * 1024;

interface DongAnPham {
  id: string;
  ten: string;
  mo_ta: string | null;
  pdf_path: string;
  nhac_path: string | null;
  so_trang: number | null;
  phien_ban: number;
  trang_thai: string;
  ngay_cap_nhat: string | null;
}

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

/** Đọc số trang của file PDF ngay tại trình duyệt (pdf.js self-host). */
async function demTrangPdf(file: File): Promise<number | null> {
  try {
    const { taoNguonTrangPdf } = await import('@/lib/ky-yeu/nguonTrang');
    const ng = await taoNguonTrangPdf({ data: await file.arrayBuffer() });
    const so = ng.soTrang;
    ng.huy();
    return so;
  } catch {
    return null;
  }
}

export default function KyYeuAdminPage() {
  const { roles, user } = useAuth();
  const duocGhi = roles.some((r) => ['tcth_admin', 'system_admin'].includes(r));
  const queryClient = useQueryClient();
  const [dangXuLy, setDangXuLy] = useState<string | null>(null);
  const [tenMoi, setTenMoi] = useState('');
  const [ngheThu, setNgheThu] = useState<string | null>(null);
  const ngheThuRef = useRef<HTMLAudioElement>(null);

  const { data: dsAnPham = [] } = useQuery({
    queryKey: ['ky-yeu-admin'],
    queryFn: async (): Promise<DongAnPham[]> => {
      const { data, error } = await supabase
        .from('ky_yeu_an_pham')
        .select('id, ten, mo_ta, pdf_path, nhac_path, so_trang, phien_ban, trang_thai, ngay_cap_nhat')
        .order('ngay_tao', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const lamTuoi = () => void queryClient.invalidateQueries({ queryKey: ['ky-yeu-admin'] });

  const taoAnPham = async () => {
    if (!tenMoi.trim()) {
      toast.error('Nhập tên ấn phẩm trước');
      return;
    }
    // pdf_path NOT NULL: giữ chỗ bằng đường dẫn rỗng theo id sinh trước
    const id = crypto.randomUUID();
    const { error } = await supabase.from('ky_yeu_an_pham').insert({
      id,
      ten: tenMoi.trim(),
      pdf_path: `${id}/v1/ky-yeu.pdf`,
      nguoi_tao: user?.id ?? null,
    });
    if (error) {
      toast.error(`Không tạo được ấn phẩm: ${error.message}`);
      return;
    }
    setTenMoi('');
    toast.success('Đã tạo ấn phẩm nháp — tải PDF lên để hoàn thiện');
    lamTuoi();
  };

  const thayPdf = async (dong: DongAnPham, file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Chỉ nhận file PDF');
      return;
    }
    if (file.size > GIOI_HAN_PDF) {
      toast.warning(
        `PDF nặng ${mb(file.size)} (khuyến nghị ≤ 25MB) — cán bộ dùng mạng chi nhánh sẽ chờ lâu. Cân nhắc nén trước khi đăng.`,
      );
    }
    setDangXuLy(dong.id);
    try {
      const phienBanMoi = dong.phien_ban + 1;
      const duongDan = `${dong.id}/v${phienBanMoi}/ky-yeu.pdf`;
      const { error: loiTai } = await supabase.storage.from(BUCKET).upload(duongDan, file, {
        contentType: 'application/pdf',
        upsert: true,
      });
      if (loiTai) throw new Error(loiTai.message);
      const soTrang = await demTrangPdf(file);
      const { error } = await supabase
        .from('ky_yeu_an_pham')
        .update({
          pdf_path: duongDan,
          phien_ban: phienBanMoi,
          so_trang: soTrang,
          ngay_cap_nhat: new Date().toISOString(),
        })
        .eq('id', dong.id);
      if (error) throw new Error(error.message);
      // Dọn bản cũ cho nhẹ bucket (best-effort — file đang được cache phía cán bộ)
      if (dong.pdf_path && dong.pdf_path !== duongDan) {
        await supabase.storage.from(BUCKET).remove([dong.pdf_path]).catch(() => {});
      }
      toast.success(
        `Đã thay PDF (phiên bản ${phienBanMoi}${soTrang ? `, ${soTrang} trang` : ''}) — flipbook của cán bộ tự cập nhật`,
      );
      lamTuoi();
    } catch (e) {
      toast.error(`Không thay được PDF: ${e instanceof Error ? e.message : e}`);
    } finally {
      setDangXuLy(null);
    }
  };

  const thayNhac = async (dong: DongAnPham, file: File) => {
    const hopLe = ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac'];
    if (!hopLe.includes(file.type) && !/\.(mp3|m4a)$/i.test(file.name)) {
      toast.error('Chỉ nhận mp3 hoặc m4a');
      return;
    }
    if (file.size > GIOI_HAN_NHAC) {
      toast.warning(`Nhạc nặng ${mb(file.size)} (khuyến nghị ≤ 8MB, 128kbps) — nên nén trước khi đăng.`);
    }
    setDangXuLy(dong.id);
    try {
      const duoi = /\.m4a$/i.test(file.name) ? 'm4a' : 'mp3';
      const duongDan = `${dong.id}/nhac-${Date.now()}.${duoi}`;
      const { error: loiTai } = await supabase.storage.from(BUCKET).upload(duongDan, file, {
        contentType: file.type || 'audio/mpeg',
        upsert: true,
      });
      if (loiTai) throw new Error(loiTai.message);
      const { error } = await supabase
        .from('ky_yeu_an_pham')
        .update({ nhac_path: duongDan, ngay_cap_nhat: new Date().toISOString() })
        .eq('id', dong.id);
      if (error) throw new Error(error.message);
      if (dong.nhac_path) {
        await supabase.storage.from(BUCKET).remove([dong.nhac_path]).catch(() => {});
      }
      toast.success('Đã thay nhạc nền');
      lamTuoi();
    } catch (e) {
      toast.error(`Không thay được nhạc: ${e instanceof Error ? e.message : e}`);
    } finally {
      setDangXuLy(null);
    }
  };

  const doiTrangThai = async (dong: DongAnPham) => {
    const moi = dong.trang_thai === 'xuat_ban' ? 'nhap' : 'xuat_ban';
    const { error } = await supabase
      .from('ky_yeu_an_pham')
      .update({ trang_thai: moi, ngay_cap_nhat: new Date().toISOString() })
      .eq('id', dong.id);
    if (error) {
      toast.error(`Không đổi được trạng thái: ${error.message}`);
      return;
    }
    toast.success(moi === 'xuat_ban' ? 'Đã xuất bản — cán bộ xem được ngay' : 'Đã gỡ về bản nháp');
    lamTuoi();
  };

  const moNgheThu = async (dong: DongAnPham) => {
    if (!dong.nhac_path) return;
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(dong.nhac_path, 600);
    if (!data?.signedUrl) {
      toast.error('Không mở được file nhạc');
      return;
    }
    setNgheThu(data.signedUrl);
    setTimeout(() => ngheThuRef.current?.play().catch(() => {}), 50);
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <TreeDeciduous className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-semibold">Quản trị Cây Ký Ức</h1>
          <p className="text-sm text-muted-foreground">
            Ấn phẩm hiển thị tại tab «Cây Ký Ức» của cổng BHY ONE. Thay PDF là cán bộ thấy bản mới ngay,
            không cần phát hành lại hệ thống.
          </p>
        </div>
      </div>

      {!duocGhi && (
        <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Bạn đang xem ở chế độ chỉ đọc — chỉ Phòng TCTH và quản trị hệ thống được thay đổi ấn phẩm.
        </p>
      )}

      {duocGhi && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tạo ấn phẩm mới</CardTitle>
            <CardDescription>Tạo ở trạng thái nháp, tải PDF lên rồi mới xuất bản.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input
              placeholder="Tên ấn phẩm — VD: Cây ký ức — 20 năm Bắc Hưng Yên"
              value={tenMoi}
              onChange={(e) => setTenMoi(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void taoAnPham(); }}
            />
            <Button onClick={() => void taoAnPham()}>Tạo</Button>
          </CardContent>
        </Card>
      )}

      {dsAnPham.length === 0 && (
        <p className="text-sm text-muted-foreground">Chưa có ấn phẩm nào.</p>
      )}

      {dsAnPham.map((dong) => (
        <Card key={dong.id}>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{dong.ten}</CardTitle>
              <Badge variant={dong.trang_thai === 'xuat_ban' ? 'default' : 'secondary'}>
                {dong.trang_thai === 'xuat_ban' ? 'Đang xuất bản' : dong.trang_thai === 'nhap' ? 'Bản nháp' : 'Lưu trữ'}
              </Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                Phiên bản {dong.phien_ban}
                {dong.so_trang ? ` · ${dong.so_trang} trang` : ''}
                {dong.ngay_cap_nhat
                  ? ` · cập nhật ${new Date(dong.ngay_cap_nhat).toLocaleString('vi-VN')}`
                  : ''}
              </span>
            </div>
            {dong.mo_ta && <CardDescription>{dong.mo_ta}</CardDescription>}
          </CardHeader>
          {duocGhi && (
            <CardContent className="flex flex-wrap items-center gap-2">
              <label className="inline-flex">
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  disabled={dangXuLy === dong.id}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) void thayPdf(dong, f);
                  }}
                />
                <Button variant="outline" size="sm" asChild>
                  <span className={dangXuLy === dong.id ? 'pointer-events-none cursor-default opacity-50' : 'cursor-pointer'}>
                    <Upload className="mr-1 h-4 w-4" />
                    {dangXuLy === dong.id ? 'Đang tải lên…' : 'Thay PDF'}
                  </span>
                </Button>
              </label>
              <label className="inline-flex">
                <input
                  type="file"
                  accept="audio/mpeg,audio/mp4,.mp3,.m4a"
                  className="hidden"
                  disabled={dangXuLy === dong.id}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) void thayNhac(dong, f);
                  }}
                />
                <Button variant="outline" size="sm" asChild>
                  <span className={dangXuLy === dong.id ? 'pointer-events-none cursor-default opacity-50' : 'cursor-pointer'}>
                    <Music className="mr-1 h-4 w-4" />
                    {dong.nhac_path ? 'Thay nhạc nền' : 'Thêm nhạc nền'}
                  </span>
                </Button>
              </label>
              {dong.nhac_path && (
                <Button variant="ghost" size="sm" onClick={() => void moNgheThu(dong)}>
                  Nghe thử
                </Button>
              )}
              <Button
                size="sm"
                variant={dong.trang_thai === 'xuat_ban' ? 'secondary' : 'default'}
                onClick={() => void doiTrangThai(dong)}
              >
                {dong.trang_thai === 'xuat_ban' ? 'Gỡ xuất bản' : 'Xuất bản'}
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/one/cay-ky-uc">
                  <ExternalLink className="mr-1 h-4 w-4" />
                  Xem tab Cây Ký Ức
                </Link>
              </Button>
            </CardContent>
          )}
        </Card>
      ))}

      {ngheThu && (
        <audio ref={ngheThuRef} src={ngheThu} controls className="w-full" aria-label="Nghe thử nhạc nền" />
      )}
    </div>
  );
}
