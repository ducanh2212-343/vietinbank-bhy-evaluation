import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { TempPasswordHandover } from '@/components/staff/TempPasswordHandover';
import { ArrowLeft, Info, ShieldAlert, CheckCircle2 } from 'lucide-react';

// Vai trò trên hệ thống — nhãn dễ hiểu cho người dùng nghiệp vụ.
const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'employee', label: 'Cán bộ' },
  { value: 'manager', label: 'Trưởng phòng/Trưởng đơn vị' },
  { value: 'pgd', label: 'PGĐ phụ trách' },
  { value: 'tcth_admin', label: 'TCTH/Admin' },
  { value: 'bgd', label: 'Ban Giám đốc' },
  { value: 'system_admin', label: 'Quản trị hệ thống' },
];

interface CreateResult {
  user_id: string;
  profile_id: string;
  created_new: boolean;
  email_sent: boolean;
  temp_password: string | null;
  message: string;
  // Giữ lại từ form để soạn tin nhắn bàn giao.
  full_name: string;
  email: string;
}

export default function AddStaff() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [positions, setPositions] = useState<{ id: string; name: string; department_id: string }[]>([]);
  const [managers, setManagers] = useState<{ id: string; full_name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<CreateResult | null>(null);

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '',
    department_id: '', position_id: '', role: 'employee',
    manager_id: '', pgd_id: '', director_id: '',
    status: 'active', note: '', send_password_email: false,
  });

  useEffect(() => {
    const load = async () => {
      const [d, pos, p] = await Promise.all([
        supabase.from('departments').select('id, name').eq('is_active', true).order('name'),
        supabase.from('positions').select('id, name, department_id').eq('is_active', true).order('sort_order'),
        supabase.from('profiles').select('id, full_name').order('full_name'),
      ]);
      setDepartments(d.data || []);
      setPositions(pos.data || []);
      setManagers(p.data || []);
    };
    load();
  }, []);

  const filteredPositions = positions.filter(p => p.department_id === form.department_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) { toast({ title: 'Vui lòng nhập họ tên', variant: 'destructive' }); return; }
    if (!form.email.trim()) { toast({ title: 'Vui lòng nhập email đăng nhập', variant: 'destructive' }); return; }
    if (!form.department_id) { toast({ title: 'Vui lòng chọn phòng ban', variant: 'destructive' }); return; }
    if (!form.position_id) { toast({ title: 'Vui lòng chọn chức vụ/vị trí', variant: 'destructive' }); return; }

    if (form.role === 'system_admin') {
      const ok = window.confirm(
        'Bạn đang cấp quyền "Quản trị hệ thống" — quyền cao nhất, toàn quyền hệ thống. Bạn có chắc chắn?'
      );
      if (!ok) return;
    }

    setSaving(true);
    const { data, error } = await supabase.functions.invoke('create-staff-user', {
      body: {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        department_id: form.department_id,
        position_id: form.position_id,
        role: form.role,
        manager_id: form.manager_id || null,
        pgd_id: form.pgd_id || null,
        director_id: form.director_id || null,
        status: form.status,
        note: form.note,
        send_password_email: form.send_password_email,
      },
    });
    setSaving(false);

    if (error) {
      let message = error.message;
      try {
        const ctx = (error as { context?: Response }).context;
        const body = ctx ? await ctx.json() : null;
        if (body?.error) message = body.error;
      } catch { /* keep default */ }
      toast({ title: 'Không tạo được tài khoản', description: message, variant: 'destructive' });
      return;
    }
    if (data?.error) {
      toast({ title: 'Không tạo được tài khoản', description: data.error, variant: 'destructive' });
      return;
    }

    toast({ title: 'Đã tạo tài khoản cán bộ thành công' });
    // If a temp password must be relayed manually, keep the admin on-screen to copy it.
    if (data?.temp_password) {
      setResult({ ...(data as CreateResult), full_name: form.full_name, email: form.email });
    } else {
      navigate(`/chi-tiet-can-bo/${data.profile_id}`);
    }
  };

  if (!isAdmin) return <div className="p-6 text-muted-foreground">Bạn không có quyền truy cập.</div>;

  const set = (key: string, val: string | boolean) => setForm((p) => ({ ...p, [key]: val }));

  // Success screen with temporary password to relay (fallback when no email sent).
  if (result) {
    return (
      <div className="max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" /> Đã tạo tài khoản cán bộ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{result.message}</p>
            <TempPasswordHandover
              fullName={result.full_name}
              email={result.email}
              tempPassword={result.temp_password || ''}
            />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setResult(null); setForm((p) => ({ ...p, full_name: '', email: '', phone: '', note: '' })); }}>
                Tạo cán bộ khác
              </Button>
              <Button onClick={() => navigate(`/chi-tiet-can-bo/${result.profile_id}`)}>Xem chi tiết cán bộ</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2" /> Quay lại</Button>
      <Card>
        <CardHeader><CardTitle>Tạo tài khoản cán bộ</CardTitle></CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Tài khoản sau khi tạo sẽ có thể đăng nhập vào hệ thống 343skill.com theo vai trò được cấp. Mỗi cán bộ cần có email đăng nhập duy nhất.
            </AlertDescription>
          </Alert>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Họ tên *</Label>
                <Input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Email đăng nhập *</Label>
                <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Số điện thoại</Label>
                <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phòng ban *</Label>
                <Select value={form.department_id} onValueChange={(v) => { set('department_id', v); set('position_id', ''); }}>
                  <SelectTrigger><SelectValue placeholder="Chọn phòng ban" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Chức vụ / Vị trí *</Label>
                <Select value={form.position_id} onValueChange={(v) => set('position_id', v)} disabled={!form.department_id}>
                  <SelectTrigger><SelectValue placeholder={form.department_id ? "Chọn vị trí" : "Chọn phòng ban trước"} /></SelectTrigger>
                  <SelectContent>
                    {filteredPositions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vai trò trên hệ thống *</Label>
                <Select value={form.role} onValueChange={(v) => set('role', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quản lý trực tiếp</Label>
                <Select value={form.manager_id} onValueChange={(v) => set('manager_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn quản lý" /></SelectTrigger>
                  <SelectContent>
                    {managers.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>PGĐ phụ trách</Label>
                <Select value={form.pgd_id} onValueChange={(v) => set('pgd_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn PGĐ phụ trách" /></SelectTrigger>
                  <SelectContent>
                    {managers.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Giám đốc phụ trách</Label>
                <Select value={form.director_id} onValueChange={(v) => set('director_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn Giám đốc phụ trách" /></SelectTrigger>
                  <SelectContent>
                    {managers.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <Select value={form.status} onValueChange={(v) => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Đang làm việc</SelectItem>
                    <SelectItem value="inactive">Nghỉ việc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Textarea value={form.note} onChange={(e) => set('note', e.target.value)} rows={3} />
            </div>

            {form.role === 'system_admin' && (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertDescription>
                  Bạn đang cấp quyền <strong>Quản trị hệ thống</strong> — quyền cao nhất. Chỉ cấp khi thật sự cần thiết.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>Gửi email đặt mật khẩu cho cán bộ</Label>
                <p className="text-xs text-muted-foreground">
                  Khuyến nghị <strong>tắt</strong>: hệ thống hiển thị mật khẩu tạm kèm tin nhắn bàn giao để bạn gửi riêng cho cán bộ.
                  Chỉ bật khi đã cấu hình email tên miền 343skill.com — khi bật, mật khẩu tạm sẽ không hiển thị mà gửi qua email đặt lại mật khẩu.
                </p>
              </div>
              <Switch checked={form.send_password_email} onCheckedChange={(v) => set('send_password_email', v)} />
            </div>

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Hủy</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Đang tạo...' : 'Tạo tài khoản'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
