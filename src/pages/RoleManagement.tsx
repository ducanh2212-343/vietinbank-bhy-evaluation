import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const ASSIGNABLE_ROLES = [
  { value: 'employee', label: 'Nhân viên' },
  { value: 'manager', label: 'Trưởng phòng' },
  { value: 'bgd', label: 'Ban Giám đốc' },
  { value: 'tcth_admin', label: 'TCTH Admin' },
];

const ROLE_LABELS: Record<string, string> = {
  employee: 'Nhân viên', manager: 'Trưởng phòng', pgd: 'Phó Giám đốc',
  bgd: 'Ban Giám đốc', tcth_admin: 'TCTH Admin', system_admin: 'System Admin',
};

interface StaffRole {
  profileId: string;
  userId: string;
  fullName: string;
  email: string | null;
  currentRole: string | null;
  roleId: string | null;
}

export default function RoleManagement() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [staffRoles, setStaffRoles] = useState<StaffRole[]>([]);
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('id, user_id, full_name, email'),
      supabase.from('user_roles').select('id, user_id, role'),
    ]);
    const roles = rolesRes.data || [];
    const roleMap = new Map(roles.map((r) => [r.user_id, r]));

    setStaffRoles(
      (profilesRes.data || []).map((p) => {
        const role = roleMap.get(p.user_id);
        return {
          profileId: p.id,
          userId: p.user_id,
          fullName: p.full_name,
          email: p.email,
          currentRole: role?.role || null,
          roleId: role?.id || null,
        };
      })
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (sr: StaffRole) => {
    const newRole = pendingChanges[sr.profileId];
    if (!newRole) return;
    setSaving(true);

    if (sr.roleId) {
      const { error } = await supabase.from('user_roles').update({ role: newRole as any }).eq('id', sr.roleId);
      if (error) { toast({ title: 'Lỗi', description: error.message, variant: 'destructive' }); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('user_roles').insert({ user_id: sr.userId, role: newRole as any });
      if (error) { toast({ title: 'Lỗi', description: error.message, variant: 'destructive' }); setSaving(false); return; }
    }

    toast({ title: `Đã cập nhật quyền cho ${sr.fullName}` });
    setPendingChanges((p) => { const n = { ...p }; delete n[sr.profileId]; return n; });
    await load();
    setSaving(false);
  };

  if (!isAdmin) return <div className="p-6 text-muted-foreground">Bạn không có quyền truy cập.</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-header">Phân quyền cán bộ</h1>
        <p className="page-subtitle">Gán vai trò cho cán bộ trong hệ thống</p>
      </div>

      {loading ? <p className="text-muted-foreground">Đang tải...</p> : (
        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Họ tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Quyền hiện tại</TableHead>
                <TableHead>Quyền mới</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffRoles.map((sr) => (
                <TableRow key={sr.profileId}>
                  <TableCell className="font-medium">{sr.fullName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{sr.email || '—'}</TableCell>
                  <TableCell>
                    {sr.currentRole === 'system_admin' ? (
                      <Badge variant="destructive">System Admin</Badge>
                    ) : sr.currentRole ? (
                      <Badge variant="secondary">{ROLE_LABELS[sr.currentRole] || sr.currentRole}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Chưa gán</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {sr.currentRole === 'system_admin' ? (
                      <span className="text-xs text-muted-foreground">Không thể thay đổi</span>
                    ) : (
                      <Select
                        value={pendingChanges[sr.profileId] || sr.currentRole || ''}
                        onValueChange={(v) => setPendingChanges((p) => ({ ...p, [sr.profileId]: v }))}
                      >
                        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Chọn quyền" /></SelectTrigger>
                        <SelectContent>
                          {ASSIGNABLE_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {sr.currentRole !== 'system_admin' && pendingChanges[sr.profileId] && pendingChanges[sr.profileId] !== sr.currentRole && (
                      <Button size="sm" onClick={() => handleSave(sr)} disabled={saving}>Lưu</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
