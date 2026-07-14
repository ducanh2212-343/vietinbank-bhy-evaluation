import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Mail, RefreshCw, AlertTriangle, Clock3, Inbox, ShieldOff } from 'lucide-react';

/**
 * Quản trị Email — bảng điều khiển cho admin:
 * email đã gửi/lỗi, độ sâu hàng đợi + DLQ, trạng thái cron, danh sách chặn.
 * Dữ liệu lấy 1 lần qua RPC admin_email_overview() (chỉ admin gọi được).
 */

type Overview = {
  recent: { template: string; recipient: string; status: string; error: string | null; at: string }[];
  stats_7d: { day: string; sent: number; failed: number; pending: number }[];
  queues: { queue: string; length: number; oldest_sec: number | null }[];
  crons: { name: string; schedule: string; active: boolean; last_status: string | null; last_run: string | null }[];
  suppressed: number;
};

const STATUS_BADGE: Record<string, string> = {
  sent: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
};

const TEMPLATE_LABELS: Record<string, string> = {
  recovery: 'Đặt lại mật khẩu',
  signup: 'Xác nhận đăng ký',
  magiclink: 'Link đăng nhập',
  invite: 'Lời mời',
  email_change: 'Đổi email',
  reauthentication: 'Mã xác minh',
  reminder_digest: 'Nhắc việc hằng ngày',
  'registration-approved': 'Duyệt đăng ký',
  'registration-rejected': 'Từ chối đăng ký',
};

const CRON_LABELS: Record<string, string> = {
  'process-email-queue': 'Bộ gửi email (hàng đợi)',
  'send-reminders-daily': 'Nhắc việc hằng ngày (08:00)',
};

export default function EmailAdmin() {
  const { toast } = useToast();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: res, error } = await (supabase as any).rpc('admin_email_overview');
    if (error) {
      toast({ title: 'Không tải được dữ liệu email', description: error.message, variant: 'destructive' });
    } else {
      setData(res as Overview);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const dlqTotal = (data?.queues || [])
    .filter(q => q.queue.endsWith('_dlq'))
    .reduce((s, q) => s + q.length, 0);
  const backlogTotal = (data?.queues || [])
    .filter(q => !q.queue.endsWith('_dlq'))
    .reduce((s, q) => s + q.length, 0);
  const failed7d = (data?.stats_7d || []).reduce((s, d) => s + d.failed, 0);
  const sent7d = (data?.stats_7d || []).reduce((s, d) => s + d.sent, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Mail className="w-6 h-6" /> Quản trị Email</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Theo dõi email hệ thống: đặt lại mật khẩu, nhắc việc, duyệt đăng ký — gửi từ noreply@chieuthuc3.com (Resend).
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Làm mới
        </Button>
      </div>

      {/* Cảnh báo khi có vấn đề cần xử lý */}
      {dlqTotal > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Có <strong>{dlqTotal}</strong> email gửi thất bại nhiều lần đang nằm trong hàng đợi lỗi (DLQ).
            Kiểm tra cột "Lỗi" ở bảng dưới; thường do RESEND_API_KEY hết hạn hoặc địa chỉ nhận sai.
          </AlertDescription>
        </Alert>
      )}

      {/* Thẻ tổng quan */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Inbox className="w-4 h-4" /> Đã gửi 7 ngày</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{sent7d}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Lỗi 7 ngày</CardTitle></CardHeader>
          <CardContent><div className={`text-2xl font-bold ${failed7d > 0 ? 'text-red-600' : ''}`}>{failed7d}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Clock3 className="w-4 h-4" /> Đang chờ gửi</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{backlogTotal}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><ShieldOff className="w-4 h-4" /> Bị chặn nhận</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{data?.suppressed ?? 0}</div></CardContent>
        </Card>
      </div>

      {/* Trạng thái lịch tự động */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Lịch tự động (cron)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(data?.crons || []).map(c => (
            <div key={c.name} className="flex items-center justify-between gap-2 text-sm flex-wrap">
              <span className="font-medium">{CRON_LABELS[c.name] || c.name}</span>
              <span className="flex items-center gap-2">
                <Badge className={c.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                  {c.active ? 'Đang bật' : 'Đã tắt'}
                </Badge>
                {c.last_status && (
                  <Badge className={c.last_status === 'succeeded' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    Lần cuối: {c.last_status === 'succeeded' ? 'OK' : 'Lỗi'}
                  </Badge>
                )}
                {c.last_run && (
                  <span className="text-xs text-muted-foreground">{new Date(c.last_run).toLocaleString('vi-VN')}</span>
                )}
              </span>
            </div>
          ))}
          {(data?.crons || []).length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">Chưa có lịch nào.</p>
          )}
        </CardContent>
      </Card>

      {/* Nhật ký gửi gần nhất */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">30 email gần nhất</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 pr-3 font-medium">Thời gian</th>
                  <th className="py-2 pr-3 font-medium">Loại</th>
                  <th className="py-2 pr-3 font-medium">Người nhận</th>
                  <th className="py-2 pr-3 font-medium">Trạng thái</th>
                  <th className="py-2 font-medium">Lỗi</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recent || []).map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">{new Date(r.at).toLocaleString('vi-VN')}</td>
                    <td className="py-2 pr-3">{TEMPLATE_LABELS[r.template] || r.template}</td>
                    <td className="py-2 pr-3">{r.recipient}</td>
                    <td className="py-2 pr-3">
                      <Badge className={STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-600'}>
                        {r.status === 'sent' ? 'Đã gửi' : r.status === 'pending' ? 'Chờ gửi' : r.status === 'failed' ? 'Lỗi' : r.status}
                      </Badge>
                    </td>
                    <td className="py-2 text-xs text-red-600 max-w-[220px] truncate" title={r.error || ''}>{r.error || ''}</td>
                  </tr>
                ))}
                {(data?.recent || []).length === 0 && !loading && (
                  <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Chưa có email nào được gửi.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Ghi chú: "Chờ gửi" quá 5 phút hoặc "Lỗi" lặp lại → kiểm tra RESEND_API_KEY trong Supabase và bảng lỗi (DLQ).
        Trạng thái "pending" của một email đã gửi thành công là dòng log tạo trước khi gửi — không phải lỗi.
      </p>
    </div>
  );
}
