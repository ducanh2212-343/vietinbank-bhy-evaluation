// Quản trị Push — thống kê thông báo đẩy của cả cổng.
//
// Vì sao có trang này: cổng đã phát 21+ loại tin, ~6.000 tin/tháng, và quyết
// định «thêm một loại tin mới» là quyết định nghiệp vụ (CLAUDE.md §5). Không có
// con số thì quyết định đó là đoán. Trang chỉ hiện SỐ ĐẾM gom theo loại/ngày/phòng
// — không đọc nội dung hay người nhận của bất kỳ tin nào (RPC push_thong_ke).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BellRing, CheckCheck, Clock3, RefreshCw, Smartphone, TriangleAlert, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface ThongKe {
  so_ngay: number;
  tong: {
    can_bo: number; nguoi_bat_push: number; thiet_bi: number; thiet_bi_loi: number;
    tin_ky: number; tin_da_gui: number; tin_da_doc: number; tin_da_xu_ly: number;
    dang_cho: number; ton_qua_han: number; so_loai: number;
  };
  theo_loai: { ma_su_kien: string; muc: string; so_tin: number; da_gui: number; da_doc: number; so_nguoi: number }[];
  theo_ngay: { ngay: string; so_tin: number; da_gui: number; da_doc: number }[];
  theo_phong: { phong: string; can_bo: number; bat_push: number }[];
  cron: { name: string; schedule: string; active: boolean; last_status: string | null; last_run: string | null }[];
}

/** Nhãn tiếng Việt cho mã sự kiện — mã kỹ thuật không nói gì với người đọc. */
export const TEN_LOAI_TIN: Record<string, string> = {
  N12: 'Trao đổi / @nhắc tên trên thẻ',
  N13: 'Được giao đầu việc mới',
  N14: 'BGĐ đặt mức trọng điểm',
  N15: 'Thẻ hoàn thành chờ lãnh đạo chốt',
  N16: 'Đầu việc bị dừng / hủy',
  N17: 'Đầu việc lùi hạn',
  N18: 'Thẻ Kanban cập nhật',
  N19: 'Nhắc thẻ im lặng',
  NHIP: 'Nhịp PDCA / bằng chứng trên thẻ',
  NHIP_SANG: 'Nhắc nhịp sáng',
  NHIP_NGAY: 'Bảng nhịp ngày cho trưởng phòng',
  NHIP_TUAN: 'Báo cáo nhịp tuần',
  CHUOI_MOC: 'Khen chuỗi đúng giờ',
  HS_GIAO: 'Hồ sơ tín dụng được giao',
  HS_TRINH: 'Hồ sơ tín dụng trình duyệt',
  HS_TRA: 'Hồ sơ tín dụng trả lại',
  HS_TU_CHOI: 'Hồ sơ tín dụng bị từ chối',
  SAO_NHAN: 'Sao Xứng Đáng — tới người nhận',
  SAO_CHUNG_VUI: 'Sao Xứng Đáng — chung vui toàn chi nhánh',
  SAO_BAN_TIN: 'Sao Xứng Đáng — bản tin ngày',
  IDEA_TIEN_TRINH: 'BHY Ideas — tiến trình ý tưởng',
  IDEA_TRA_VE: 'BHY Ideas — ý tưởng bị trả về',
  TTC_HOAN_THANH: 'Training Center — hoàn thành đầu việc',
  TTC_CUNG_CO: 'Training Center — cần củng cố',
  GOP_Y: 'Góp ý hệ thống',
  LICH_NGHI: 'Nhắc nhập lịch nghỉ lễ',
  PHIEN_BAN: 'Công bố phiên bản mới',
  ZALO_LOI: 'Kênh Zalo gặp lỗi',
};

const TEN_MUC: Record<string, string> = { CHAN: 'Chặn', DO: 'Đỏ', NHE: 'Nhẹ', KHEN: 'Khen', VANG: 'Vàng' };
const MAU_MUC: Record<string, string> = {
  CHAN: 'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300',
  DO: 'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300',
  NHE: 'bg-yellow-100 dark:bg-yellow-500/15 text-yellow-800 dark:text-yellow-300',
  KHEN: 'bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-300',
  VANG: 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300',
};

const TEN_CRON: Record<string, string> = {
  'ct2-phat-thong-bao-hoan': 'Phát tin hoãn qua đêm (07:00)',
  'ct2-nhac-nhip-sang': 'Nhắc nhịp sáng (07:30)',
  'ct2-khen-chuoi-moc': 'Khen chuỗi đúng giờ (09:05)',
  'sao-ban-tin-ngay': 'Bản tin Sao cuối ngày (16:30)',
  'gop-y-ban-tin-sang': 'Bản tin góp ý sáng (09:10)',
  'nhac-lich-nghi': 'Nhắc lịch nghỉ lễ (07:05)',
};

/** Tỷ lệ phần trăm an toàn khi mẫu bằng 0. */
export function phanTram(tu: number, mau: number): number {
  if (!mau) return 0;
  return Math.round((tu / mau) * 100);
}

const CAC_KY = [7, 30, 90] as const;

export default function QuanTriPushPage() {
  const { toast } = useToast();
  const [soNgay, setSoNgay] = useState<number>(30);
  const [data, setData] = useState<ThongKe | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: res, error } = await (supabase as any).rpc('push_thong_ke', { _so_ngay: soNgay });
    if (error) {
      toast({ title: 'Không tải được thống kê push', description: error.message, variant: 'destructive' });
    } else {
      setData(res as ThongKe);
    }
    setLoading(false);
  }, [soNgay, toast]);

  useEffect(() => { load(); }, [load]);

  const tong = data?.tong;
  const tyLeBat = phanTram(tong?.nguoi_bat_push ?? 0, tong?.can_bo ?? 0);
  const tyLeDoc = phanTram(tong?.tin_da_doc ?? 0, tong?.tin_da_gui ?? 0);
  const tinMoiNgay = data ? Math.round((tong?.tin_ky ?? 0) / data.so_ngay) : 0;
  const maxNgay = useMemo(() => Math.max(1, ...(data?.theo_ngay ?? []).map((d) => d.so_tin)), [data]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BellRing className="w-6 h-6" /> Quản trị Push</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Số lượng thông báo đẩy, ai bật, loại nào nhiều — để cân trước khi thêm tin mới. Chỉ có con số, không có nội dung tin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden">
            {CAC_KY.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setSoNgay(k)}
                className={`px-3 py-1.5 text-sm ${soNgay === k ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
              >
                {k} ngày
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </Button>
        </div>
      </div>

      {(tong?.ton_qua_han ?? 0) > 0 && (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertDescription>
            Có <strong>{tong!.ton_qua_han}</strong> tin đã tới giờ phát mà chưa được gửi. Nếu con số này còn sau 07:00 sáng
            làm việc, bộ phát push (notify-ct2) đang gặp sự cố.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Users className="w-4 h-4" /> Cán bộ bật push</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tong?.nguoi_bat_push ?? 0}<span className="text-base font-normal text-muted-foreground">/{tong?.can_bo ?? 0}</span></div>
            <p className="text-xs text-muted-foreground">{tyLeBat}% cán bộ đang hoạt động</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Smartphone className="w-4 h-4" /> Thiết bị đăng ký</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tong?.thiet_bi ?? 0}</div>
            <p className={`text-xs ${(tong?.thiet_bi_loi ?? 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
              {tong?.thiet_bi_loi ?? 0} thiết bị báo lỗi lần gửi gần nhất
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><BellRing className="w-4 h-4" /> Tin {data?.so_ngay ?? soNgay} ngày</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(tong?.tin_ky ?? 0).toLocaleString('vi-VN')}</div>
            <p className="text-xs text-muted-foreground">≈ {tinMoiNgay} tin/ngày · {tong?.so_loai ?? 0} loại</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><CheckCheck className="w-4 h-4" /> Tỷ lệ mở đọc</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tyLeDoc}%</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock3 className="w-3 h-3" /> {tong?.dang_cho ?? 0} tin đang chờ tới giờ phát</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="loai">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="loai">Theo loại tin</TabsTrigger>
          <TabsTrigger value="ngay">Theo ngày</TabsTrigger>
          <TabsTrigger value="phong">Theo phòng</TabsTrigger>
          <TabsTrigger value="cron">Lịch tự động</TabsTrigger>
        </TabsList>

        <TabsContent value="loai">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Loại tin nào chiếm nhiều nhất</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2 pr-3 font-medium">Loại tin</th>
                      <th className="py-2 pr-3 font-medium">Mức</th>
                      <th className="py-2 pr-3 font-medium text-right">Số tin</th>
                      <th className="py-2 pr-3 font-medium text-right">% tổng</th>
                      <th className="py-2 pr-3 font-medium text-right">Người nhận</th>
                      <th className="py-2 pr-3 font-medium text-right">Đã gửi</th>
                      <th className="py-2 font-medium text-right">Mở đọc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.theo_loai ?? []).map((r) => (
                      <tr key={`${r.ma_su_kien}-${r.muc}`} className="border-b last:border-0">
                        <td className="py-2 pr-3">
                          <div>{TEN_LOAI_TIN[r.ma_su_kien] ?? r.ma_su_kien}</div>
                          <div className="text-xs text-muted-foreground font-mono">{r.ma_su_kien}</div>
                        </td>
                        <td className="py-2 pr-3"><Badge className={MAU_MUC[r.muc] ?? ''}>{TEN_MUC[r.muc] ?? r.muc}</Badge></td>
                        <td className="py-2 pr-3 text-right font-medium">{r.so_tin.toLocaleString('vi-VN')}</td>
                        <td className="py-2 pr-3 text-right text-muted-foreground">{phanTram(r.so_tin, tong?.tin_ky ?? 0)}%</td>
                        <td className="py-2 pr-3 text-right">{r.so_nguoi}</td>
                        <td className="py-2 pr-3 text-right">{phanTram(r.da_gui, r.so_tin)}%</td>
                        <td className="py-2 text-right">{phanTram(r.da_doc, r.da_gui)}%</td>
                      </tr>
                    ))}
                    {(data?.theo_loai ?? []).length === 0 && !loading && (
                      <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">Chưa có tin nào trong kỳ.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                «Mở đọc» = cán bộ bấm vào tin hoặc mở chuông. Loại tin nhiều mà mở đọc thấp là ứng viên đầu tiên để gộp hoặc giảm tần suất.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ngay">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Số tin theo ngày</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {(data?.theo_ngay ?? []).map((d) => (
                <div key={d.ngay} className="flex items-center gap-2 text-sm">
                  <span className="w-24 shrink-0 text-muted-foreground tabular-nums">{new Date(d.ngay + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
                  <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-primary/70" style={{ width: `${Math.round((d.so_tin / maxNgay) * 100)}%` }} />
                  </div>
                  <span className="w-16 text-right tabular-nums font-medium">{d.so_tin}</span>
                  <span className="w-14 text-right tabular-nums text-xs text-muted-foreground">{phanTram(d.da_doc, d.da_gui)}% đọc</span>
                </div>
              ))}
              {(data?.theo_ngay ?? []).length === 0 && !loading && (
                <p className="text-sm text-muted-foreground">Chưa có tin nào trong kỳ.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="phong">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Phòng nào bật push</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[420px]">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2 pr-3 font-medium">Phòng</th>
                      <th className="py-2 pr-3 font-medium text-right">Cán bộ</th>
                      <th className="py-2 pr-3 font-medium text-right">Bật push</th>
                      <th className="py-2 font-medium">Tỷ lệ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.theo_phong ?? []).map((p) => {
                      const tl = phanTram(p.bat_push, p.can_bo);
                      return (
                        <tr key={p.phong} className="border-b last:border-0">
                          <td className="py-2 pr-3">{p.phong}</td>
                          <td className="py-2 pr-3 text-right">{p.can_bo}</td>
                          <td className="py-2 pr-3 text-right font-medium">{p.bat_push}</td>
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-32 h-2 bg-muted rounded overflow-hidden">
                                <div className={`h-full ${tl >= 70 ? 'bg-green-500' : tl >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${tl}%` }} />
                              </div>
                              <span className="text-xs tabular-nums">{tl}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cron">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Lịch tự động phát tin</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(data?.cron ?? []).map((c) => (
                <div key={c.name} className="flex items-center justify-between gap-2 text-sm flex-wrap">
                  <span className="font-medium">{TEN_CRON[c.name] ?? c.name}</span>
                  <span className="flex items-center gap-2">
                    <Badge className={c.active ? 'bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'}>
                      {c.active ? 'Đang bật' : 'Đã tắt'}
                    </Badge>
                    {c.last_status && (
                      <Badge className={c.last_status === 'succeeded' ? 'bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300'}>
                        Lần cuối: {c.last_status === 'succeeded' ? 'OK' : 'Lỗi'}
                      </Badge>
                    )}
                    {c.last_run && <span className="text-xs text-muted-foreground">{new Date(c.last_run).toLocaleString('vi-VN')}</span>}
                  </span>
                </div>
              ))}
              {(data?.cron ?? []).length === 0 && !loading && <p className="text-sm text-muted-foreground">Chưa có lịch nào.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Tin sinh ngoài 07:00–18:00 hoặc ngày nghỉ tự nằm chờ tới 07:00 buổi làm việc kế tiếp, nên «đang chờ» buổi tối là bình thường.
        Muốn xem kênh Zalo, mở <a className="underline" href="/quan-tri-zalo">Quản trị Zalo</a>.
      </p>
    </div>
  );
}
