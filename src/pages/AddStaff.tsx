import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft } from 'lucide-react';

export default function AddStaff() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [positions, setPositions] = useState<{ id: string; name: string; department_id: string }[]>([]);
  const [managers, setManagers] = useState<{ id: string; full_name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    employee_code: '', full_name: '', email: '', phone: '',
    department_id: '', position_id: '', manager_id: '', pgd_id: '', director_id: '',
    status: 'active', note: '',
  });

  useEffect(() => {
    const load = async () => {
      const [d, pos, p] = await Promise.all([
        supabase.from('departments').select('id, name').eq('is_active', true).order('name'),
        supabase.from('positions').select('id, name, department_id').eq('is_active', true).order('sort_order'),
        supabase.from('profiles').select('id, full_name'),
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
    if (!form.full_name) { toast({ title: 'Vui lòng nhập họ tên', variant: 'destructive' }); return; }
    setSaving(true);

    const placeholderUserId = crypto.randomUUID();
    const selectedPosition = positions.find(p => p.id === form.position_id);

    const { data: inserted, error } = await supabase.from('profiles').insert({
      user_id: placeholderUserId,
      employee_code: form.employee_code || null,
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone || null,
      department_id: form.department_id || null,
      position_id: form.position_id || null,
      position: selectedPosition?.name || null,
      manager_id: form.manager_id || null,
      pgd_id: form.pgd_id || null,
      director_id: form.director_id || null,
      status: form.status,
      note: form.note || null,
    }).select('id').single();

    setSaving(false);
    if (error) {
      toast({ title: 'Lỗi khi thêm cán bộ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Đã thêm cán bộ thành công' });
      if (inserted?.id) {
        navigate(`/chi-tiet-can-bo/${inserted.id}`);
      } else {
        navigate('/danh-sach-can-bo');
      }
    }
  };

  if (!isAdmin) return <div className="p-6 text-muted-foreground">Bạn không có quyền truy cập.</div>;

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <div className="max-w-2xl space-y-4">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2" /> Quay lại</Button>
      <Card>
        <CardHeader><CardTitle>Thêm cán bộ mới</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mã cán bộ</Label>
                <Input value={form.employee_code} onChange={(e) => set('employee_code', e.target.value)} placeholder="VTB-XXX" />
              </div>
              <div className="space-y-2">
                <Label>Họ tên *</Label>
                <Input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
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
                <Label>Chức vụ / Vị trí</Label>
                <Select value={form.position_id} onValueChange={(v) => set('position_id', v)} disabled={!form.department_id}>
                  <SelectTrigger><SelectValue placeholder={form.department_id ? "Chọn vị trí" : "Chọn phòng ban trước"} /></SelectTrigger>
                  <SelectContent>
                    {filteredPositions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
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
                <Label>Ban giám đốc Phụ trách</Label>
                <Select value={form.pgd_id} onValueChange={(v) => set('pgd_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn thành viên Ban giám đốc" /></SelectTrigger>
                  <SelectContent>
                    {managers.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Giám đốc Chi nhánh</Label>
                <Select value={form.director_id} onValueChange={(v) => set('director_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn Giám đốc Chi nhánh" /></SelectTrigger>
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
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Hủy</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu cán bộ'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
