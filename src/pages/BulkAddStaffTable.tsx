import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { buildHandoverMessage } from '@/lib/handoverMessage';
import { isDepartmentHeadPosition } from '@/pages/EditStaff';
import { Info, Plus, Trash2, MessageSquareText, Copy, FileSpreadsheet, ListPlus } from 'lucide-react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Cán bộ' },
  { value: 'manager', label: 'Trưởng phòng/Trưởng đơn vị' },
  { value: 'pgd', label: 'PGĐ phụ trách' },
  { value: 'tcth_admin', label: 'TCTH/Admin' },
  { value: 'bgd', label: 'Ban Giám đốc' },
  { value: 'system_admin', label: 'Quản trị hệ thống' },
];

interface EntryRow {
  key: number;
  full_name: string;
  email: string;
  phone: string;
  position_id: string;
  role: string;
  error?: string | null;
}

interface RowResult {
  row_number: number;
  email: string | null;
  status: 'created' | 'updated' | 'error';
  message: string;
  temp_password?: string | null;
}

interface BulkResponse {
  total: number;
  created: number;
  updated: number;
  errors: number;
  results: RowResult[];
}

interface DeptRef { id: string; name: string }
interface PosRef { id: string; name: string; department_id: string | null }
interface ProfileRef { id: string; full_name: string; email: string | null; position: string | null; department_id: string | null }

let rowKeySeq = 1;
const blankRow = (): EntryRow => ({ key: rowKeySeq++, full_name: '', email: '', phone: '', position_id: '', role: 'employee' });

export default function BulkAddStaffTable() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [departments, setDepartments] = useState<DeptRef[]>([]);
  const [positions, setPositions] = useState<PosRef[]>([]);
  const [profiles, setProfiles] = useState<ProfileRef[]>([]);

  const [deptId, setDeptId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [rows, setRows] = useState<EntryRow[]>(() => Array.from({ length: 10 }, blankRow));
  const [submitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState<BulkResponse | null>(null);
  // Giữ lại danh sách đã gửi để soạn tin nhắn bàn giao theo tên sau khi có kết quả.
  const [submittedRows, setSubmittedRows] = useState<EntryRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const [d, p, pr] = await Promise.all([
        supabase.from('departments').select('id, name').eq('is_active', true).order('name'),
        supabase.from('positions').select('id, name, department_id').eq('is_active', true).order('sort_order'),
        supabase.from('profiles').select('id, full_name, email, position, department_id').eq('status', 'active').order('full_name'),
      ]);
      setDepartments((d.data || []) as DeptRef[]);
      setPositions((p.data || []) as PosRef[]);
      setProfiles((pr.data || []) as ProfileRef[]);
    };
    load();
  }, []);

  const deptPositions = useMemo(() => positions.filter((p) => p.department_id === deptId), [positions, deptId]);
  const managerOptions = useMemo(
    () => profiles.filter((p) => p.department_id === deptId && isDepartmentHeadPosition(p.position) && p.email),
    [profiles, deptId],
  );
  const existingEmails = useMemo(
    () => new Set(profiles.map((p) => (p.email || '').toLowerCase()).filter(Boolean)),
    [profiles],
  );

  if (!isAdmin) return <div className="p-6 text-muted-foreground">Bạn không có quyền truy cập.</div>;

  const setRow = (key: number, patch: Partial<EntryRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch, error: null } : r)));
  };

  const removeRow = (key: number) => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  const addRows = (n: number) => setRows((prev) => [...prev, ...Array.from({ length: n }, blankRow)]);

  // Dán từ Excel: mỗi dòng "Họ tên [Tab] Email [Tab] SĐT" đổ vào bảng từ vị trí dòng đang dán.
  const handlePaste = (e: React.ClipboardEvent, startKey: number) => {
    const text = e.clipboardData.getData('text/plain');
    if (!text.includes('\n') && !text.includes('\t')) return; // dán thường — để mặc định
    e.preventDefault();
    const lines = text.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim() !== '');
    setRows((prev) => {
      const next = [...prev];
      let idx = next.findIndex((r) => r.key === startKey);
      if (idx < 0) return prev;
      for (const line of lines) {
        const cols = line.split('\t').map((c) => c.trim());
        if (idx >= next.length) next.push(blankRow());
        next[idx] = {
          ...next[idx],
          full_name: cols[0] ?? next[idx].full_name,
          email: cols[1] ?? next[idx].email,
          phone: cols[2] ?? next[idx].phone,
          error: null,
        };
        idx++;
      }
      return next;
    });
    toast({ title: `Đã dán ${lines.length} dòng từ bảng tính` });
  };

  const filledRows = rows.filter((r) => r.full_name.trim() || r.email.trim());

  const validate = (): boolean => {
    if (!deptId) {
      toast({ title: 'Vui lòng chọn phòng ban trước', variant: 'destructive' });
      return false;
    }
    if (filledRows.length === 0) {
      toast({ title: 'Chưa có dòng nào được nhập', variant: 'destructive' });
      return false;
    }
    let ok = true;
    const seen = new Map<string, number>();
    const validated = rows.map((r) => {
      if (!r.full_name.trim() && !r.email.trim()) return { ...r, error: null }; // dòng trống — bỏ qua
      const email = r.email.trim().toLowerCase();
      let error: string | null = null;
      if (!r.full_name.trim()) error = 'Thiếu họ tên';
      else if (!email) error = 'Thiếu email';
      else if (!EMAIL_RE.test(email)) error = 'Email không hợp lệ';
      else if (seen.has(email)) error = `Trùng email với dòng ${seen.get(email)}`;
      else if (!r.position_id) error = 'Chưa chọn vị trí';
      if (email && !seen.has(email)) seen.set(email, rows.indexOf(r) + 1);
      if (error) ok = false;
      return { ...r, error };
    });
    setRows(validated);
    if (!ok) toast({ title: 'Có dòng chưa hợp lệ', description: 'Kiểm tra các dòng được đánh dấu đỏ.', variant: 'destructive' });
    return ok;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const managerEmail = managerOptions.find((m) => m.id === managerId)?.email || null;
    const payload = filledRows.map((r, i) => ({
      row_number: i + 1,
      full_name: r.full_name.trim(),
      email: r.email.trim().toLowerCase(),
      phone: r.phone.trim() || null,
      department_id: deptId,
      position_id: r.position_id,
      role: r.role,
      manager_email: managerEmail,
      status: 'active',
      send_password_email: false,
    }));

    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke('bulk-create-staff-users', {
      body: { rows: payload, options: { update_existing: true, send_password_email: false } },
    });
    setSubmitting(false);

    if (error || data?.error) {
      let message = data?.error || error?.message || 'Lỗi không xác định';
      try {
        const ctx = (error as { context?: Response } | null)?.context;
        const body = ctx ? await ctx.json() : null;
        if (body?.error) message = body.error;
      } catch { /* keep default */ }
      toast({ title: 'Lỗi tạo tài khoản hàng loạt', description: message, variant: 'destructive' });
      return;
    }
    setSubmittedRows(filledRows);
    setResponse(data as BulkResponse);
    toast({ title: `Hoàn tất: ${data.created} tạo mới, ${data.updated} cập nhật, ${data.errors} lỗi` });
  };

  const copyText = async (text: string, title: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title });
    } catch {
      toast({ title: 'Không sao chép được', description: 'Vui lòng copy thủ công.', variant: 'destructive' });
    }
  };

  const rowMessage = (r: RowResult): string | null => {
    if (!r.temp_password || !r.email) return null;
    const fullName = submittedRows[r.row_number - 1]?.full_name ?? null;
    return buildHandoverMessage({ fullName, email: r.email, tempPassword: r.temp_password });
  };

  const copyAllMessages = () => {
    if (!response) return;
    const messages = response.results.map(rowMessage).filter((m): m is string => !!m);
    if (messages.length === 0) {
      toast({ title: 'Không có tin nhắn nào để sao chép', description: 'Chỉ các dòng tạo mới có mật khẩu tạm mới có tin nhắn.' });
      return;
    }
    void copyText(messages.join('\n\n----------\n\n'), `Đã sao chép ${messages.length} tin nhắn bàn giao`);
  };

  const resetForNext = () => {
    setResponse(null);
    setSubmittedRows([]);
    setRows(Array.from({ length: 10 }, blankRow));
  };

  // ---- Màn hình kết quả ---------------------------------------------------
  if (response) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="page-header flex items-center gap-2"><FileSpreadsheet className="w-6 h-6" /> Kết quả nhập cán bộ</h1>
          <p className="page-subtitle">Copy tin nhắn bàn giao và gửi riêng cho từng cán bộ qua Zalo/SMS.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
              <span>
                Tổng {response.total} — <span className="text-green-700">{response.created} tạo mới</span>,{' '}
                <span className="text-blue-700">{response.updated} cập nhật</span>,{' '}
                <span className="text-red-700">{response.errors} lỗi</span>
              </span>
              <span className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={copyAllMessages}>
                  <MessageSquareText className="w-4 h-4 mr-2" /> Sao chép tất cả tin nhắn bàn giao
                </Button>
                <Button onClick={resetForNext}><Plus className="w-4 h-4 mr-2" /> Nhập phòng khác</Button>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Họ tên</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Kết quả</TableHead>
                    <TableHead>Thông báo</TableHead>
                    <TableHead>Bàn giao</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {response.results.map((r) => {
                    const message = rowMessage(r);
                    return (
                      <TableRow key={r.row_number}>
                        <TableCell>{r.row_number}</TableCell>
                        <TableCell className="text-sm">{submittedRows[r.row_number - 1]?.full_name || '—'}</TableCell>
                        <TableCell className="text-sm">{r.email}</TableCell>
                        <TableCell>
                          {r.status === 'created'
                            ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Tạo mới</Badge>
                            : r.status === 'updated'
                              ? <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Cập nhật</Badge>
                              : <Badge variant="destructive">Lỗi</Badge>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.message}</TableCell>
                        <TableCell>
                          {message && (
                            <Button type="button" size="sm" variant="outline" onClick={() => copyText(message, `Đã sao chép tin nhắn cho ${r.email}`)}>
                              <Copy className="w-3.5 h-3.5 mr-1" /> Tin nhắn
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              Cán bộ đăng nhập bằng mật khẩu tạm sẽ bị bắt buộc đổi mật khẩu ngay lần đầu.
              Dòng "Cập nhật" là tài khoản đã có từ trước — nếu cần cấp mật khẩu, vào Chi tiết cán bộ → "Cấp mật khẩu".
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Màn hình nhập ------------------------------------------------------
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header flex items-center gap-2"><ListPlus className="w-6 h-6" /> Nhập nhanh cán bộ theo phòng</h1>
        <p className="page-subtitle">Nhập trực tiếp dạng bảng — phù hợp mỗi phòng 8–15 người. Danh sách lớn hơn dùng <Link to="/upload-danh-sach-cb" className="text-primary hover:underline">Upload Excel</Link>.</p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Chọn <strong>phòng ban</strong> một lần cho cả bảng, sau đó nhập từng người. Mẹo: copy 3 cột
          <strong> Họ tên | Email | SĐT</strong> từ Excel rồi dán vào ô "Họ tên" của dòng đầu — bảng tự đổ dữ liệu xuống các dòng dưới.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader><CardTitle className="text-base">Thông tin chung cho cả bảng</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Phòng ban *</Label>
            <Select value={deptId} onValueChange={(v) => { setDeptId(v); setManagerId(''); setRows((prev) => prev.map((r) => ({ ...r, position_id: '' }))); }}>
              <SelectTrigger><SelectValue placeholder="Chọn phòng ban" /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quản lý trực tiếp (áp cho cả bảng)</Label>
            <Select value={managerId} onValueChange={setManagerId} disabled={!deptId}>
              <SelectTrigger><SelectValue placeholder={deptId ? 'Chọn Trưởng/Phụ trách phòng (tùy chọn)' : 'Chọn phòng ban trước'} /></SelectTrigger>
              <SelectContent>
                {managerOptions.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name} — {m.position}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {deptId && managerOptions.length === 0 && (
              <p className="text-xs text-muted-foreground">Phòng này chưa có Trưởng/Phụ trách phòng — có thể bổ sung sau trong Sửa hồ sơ.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
            <span>Danh sách cán bộ ({filledRows.length} dòng có dữ liệu)</span>
            <span className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => addRows(5)}><Plus className="w-4 h-4 mr-1" /> Thêm 5 dòng</Button>
              <Button onClick={handleSubmit} disabled={submitting || !deptId || filledRows.length === 0}>
                {submitting ? 'Đang tạo...' : `Tạo ${filledRows.length} tài khoản`}
              </Button>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead className="min-w-[180px]">Họ tên *</TableHead>
                  <TableHead className="min-w-[220px]">Email đăng nhập *</TableHead>
                  <TableHead className="min-w-[130px]">Số điện thoại</TableHead>
                  <TableHead className="min-w-[180px]">Vị trí *</TableHead>
                  <TableHead className="min-w-[170px]">Vai trò</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={r.key} className={r.error ? 'bg-destructive/5' : undefined}>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <Input
                        value={r.full_name}
                        onChange={(e) => setRow(r.key, { full_name: e.target.value })}
                        onPaste={(e) => handlePaste(e, r.key)}
                        placeholder="Nguyễn Văn A"
                        className={`h-8 ${r.error ? 'border-destructive' : ''}`}
                      />
                      {r.error && <p className="text-xs text-destructive mt-1">{r.error}</p>}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="email"
                        value={r.email}
                        onChange={(e) => setRow(r.key, { email: e.target.value })}
                        placeholder="a@343skill.com"
                        className="h-8"
                      />
                      {r.email && existingEmails.has(r.email.trim().toLowerCase()) && (
                        <p className="text-xs text-amber-600 mt-1">Email đã tồn tại — sẽ cập nhật hồ sơ</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input value={r.phone} onChange={(e) => setRow(r.key, { phone: e.target.value })} placeholder="09xx" className="h-8" />
                    </TableCell>
                    <TableCell>
                      <Select value={r.position_id} onValueChange={(v) => setRow(r.key, { position_id: v })} disabled={!deptId}>
                        <SelectTrigger className="h-8"><SelectValue placeholder={deptId ? 'Chọn vị trí' : 'Chọn phòng trước'} /></SelectTrigger>
                        <SelectContent>
                          {deptPositions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={r.role} onValueChange={(v) => setRow(r.key, { role: v })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => removeRow(r.key)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Dòng để trống hoàn toàn sẽ được bỏ qua. Sau khi tạo, mỗi cán bộ mới có một tin nhắn bàn giao kèm mật khẩu tạm để copy gửi Zalo/SMS.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
