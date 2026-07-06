import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { TempPasswordHandover } from '@/components/staff/TempPasswordHandover';
import { CheckCircle, XCircle, Eye, Search } from 'lucide-react';

type RegistrationRequest = {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  department_id: string | null;
  position_id: string | null;
  note: string | null;
  requested_role: string;
  status: string;
  review_comment: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type Dept = { id: string; name: string };
type Pos = { id: string; name: string };

const STATUS_LABELS: Record<string, string> = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' };
const STATUS_COLORS: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800' };
const ROLE_LABELS: Record<string, string> = { employee: 'Nhân viên', manager: 'Quản lý', tcth_admin: 'TCTH Admin', bgd: 'Ban Giám đốc' };
const ASSIGNABLE_ROLES = ['employee', 'manager', 'tcth_admin', 'bgd'] as const;

export default function ApproveRegistrations() {
  const { roles, profileId } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [positions, setPositions] = useState<Pos[]>([]);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<RegistrationRequest | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [assignedRole, setAssignedRole] = useState('employee');
  const [processing, setProcessing] = useState(false);
  // Kết quả duyệt: mật khẩu tạm server sinh, hiện đúng 1 lần để bàn giao riêng.
  const [approvedResult, setApprovedResult] = useState<{ fullName: string; email: string; tempPassword: string } | null>(null);

  const isSystemAdmin = roles.includes('system_admin');
  const canApprove = roles.some(r => ['bgd', 'tcth_admin', 'system_admin'].includes(r));

  const fetchData = useCallback(async () => {
    const [reqRes, deptRes, posRes] = await Promise.all([
      supabase.from('registration_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('departments').select('id, name'),
      supabase.from('positions').select('id, name'),
    ]);
    if (reqRes.data) setRequests(reqRes.data as RegistrationRequest[]);
    if (deptRes.data) setDepartments(deptRes.data);
    if (posRes.data) setPositions(posRes.data);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const deptName = (id: string | null) => departments.find(d => d.id === id)?.name ?? '—';
  const posName = (id: string | null) => positions.find(p => p.id === id)?.name ?? '—';

  const filtered = requests.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return r.full_name.toLowerCase().includes(s) || r.email.toLowerCase().includes(s);
    }
    return true;
  });

  const handleApprove = async () => {
    if (!selected) return;

    setProcessing(true);
    try {
      // Server tự sinh mật khẩu tạm ngẫu nhiên và trả về đúng 1 lần.
      const { data, error } = await supabase.functions.invoke('approve-registration', {
        body: {
          request_id: selected.id,
          assigned_role: assignedRole,
          review_comment: reviewComment || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Thành công', description: `Tài khoản ${selected.email} đã được tạo.` });
      if (data?.temp_password) {
        setApprovedResult({
          fullName: data.full_name || selected.full_name,
          email: data.email || selected.email,
          tempPassword: data.temp_password,
        });
      }
      setSelected(null);
      setReviewComment('');
      setAssignedRole('employee');
      fetchData();
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message || 'Không thể duyệt yêu cầu.', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('approve-registration', {
        body: {
          request_id: selected.id,
          action: 'reject',
          review_comment: reviewComment || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Đã từ chối', description: `Yêu cầu của ${selected.email} đã bị từ chối. Email thông báo đã được gửi.` });
      setSelected(null);
      setReviewComment('');
      fetchData();
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  if (!canApprove) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold">Duyệt yêu cầu đăng ký tài khoản</h1>

      <div className="flex flex-wrap gap-3 items-center">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="pending">Chờ duyệt</SelectItem>
            <SelectItem value="approved">Đã duyệt</SelectItem>
            <SelectItem value="rejected">Từ chối</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm theo tên hoặc email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">Không có yêu cầu nào.</p>
      ) : (
        <div className="grid gap-3">
          {filtered.map(r => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                <div className="space-y-1 flex-1">
                  <div className="font-medium">{r.full_name}</div>
                  <div className="text-sm text-muted-foreground">{r.email} · {r.phone_number}</div>
                  <div className="text-sm text-muted-foreground">{deptName(r.department_id)} — {posName(r.position_id)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[r.status] || ''}>{STATUS_LABELS[r.status] || r.status}</Badge>
                  <Button size="sm" variant="outline" onClick={() => { setSelected(r); setAssignedRole(r.requested_role || 'employee'); setReviewComment(''); }}>
                    <Eye className="w-4 h-4 mr-1" /> Chi tiết
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail / Approve / Reject Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết yêu cầu đăng ký</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Họ và tên:</span><br />{selected.full_name}</div>
                <div><span className="text-muted-foreground">Email:</span><br />{selected.email}</div>
                <div><span className="text-muted-foreground">Số điện thoại:</span><br />{selected.phone_number}</div>
                <div><span className="text-muted-foreground">Phòng ban:</span><br />{deptName(selected.department_id)}</div>
                <div><span className="text-muted-foreground">Chức vụ:</span><br />{posName(selected.position_id)}</div>
                <div><span className="text-muted-foreground">Trạng thái:</span><br /><Badge className={STATUS_COLORS[selected.status]}>{STATUS_LABELS[selected.status]}</Badge></div>
              </div>
              {selected.note && <div className="text-sm"><span className="text-muted-foreground">Ghi chú:</span><br />{selected.note}</div>}
              <div className="text-xs text-muted-foreground">Ngày gửi: {new Date(selected.created_at).toLocaleString('vi-VN')}</div>

              {selected.status === 'pending' && (
                <>
                  <hr />
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Vai trò gán cho tài khoản</Label>
                      <Select value={assignedRole} onValueChange={setAssignedRole}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ASSIGNABLE_ROLES.filter(r => (r as string) !== 'system_admin' || isSystemAdmin).map(r => (
                            <SelectItem key={r} value={r}>{ROLE_LABELS[r] || r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Ghi chú duyệt</Label>
                      <Textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Ghi chú (không bắt buộc)" rows={2} />
                    </div>

                    <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      Hệ thống sẽ sinh mật khẩu tạm ngẫu nhiên và hiển thị <strong>một lần duy nhất</strong> sau khi duyệt
                      — bạn bàn giao riêng cho cán bộ qua Zalo/SMS (không gửi qua email).
                    </p>
                  </div>

                  <DialogFooter className="gap-2">
                    <Button variant="destructive" disabled={processing} onClick={handleReject}>
                      <XCircle className="w-4 h-4 mr-1" /> Từ chối
                    </Button>
                    <Button disabled={processing} onClick={handleApprove}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Duyệt
                    </Button>
                  </DialogFooter>
                </>
              )}

              {selected.status !== 'pending' && selected.review_comment && (
                <div className="text-sm"><span className="text-muted-foreground">Ghi chú duyệt:</span><br />{selected.review_comment}</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bàn giao mật khẩu tạm sau khi duyệt — hiện đúng 1 lần, đóng là mất */}
      <Dialog open={!!approvedResult} onOpenChange={(open) => { if (!open) setApprovedResult(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Đã tạo tài khoản — bàn giao mật khẩu tạm</DialogTitle>
          </DialogHeader>
          {approvedResult && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Mật khẩu tạm chỉ hiển thị <strong>một lần duy nhất</strong>. Hãy sao chép tin nhắn bàn giao
                và gửi riêng cho cán bộ trước khi đóng hộp thoại này.
              </p>
              <TempPasswordHandover
                fullName={approvedResult.fullName}
                email={approvedResult.email}
                tempPassword={approvedResult.tempPassword}
                variant="create"
              />
              <DialogFooter>
                <Button onClick={() => setApprovedResult(null)}>Đã bàn giao xong</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


