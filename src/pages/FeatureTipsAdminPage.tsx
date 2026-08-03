// Quản trị "Mẹo tính năng hay": CRUD tip, nhắm theo vai trò, bật/tắt nhanh.
// Tip hiển thị cho cán bộ ở banner Tổng quan / modal 1 lần / trang /meo-hay,
// và được edge function send-feature-tip-push dùng để push cho người lâu không đăng nhập.
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, Save } from 'lucide-react';
import type { FeatureTip } from '@/hooks/useFeatureTips';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: 'employee', label: 'Nhân viên' },
  { value: 'manager', label: 'Trưởng phòng' },
  { value: 'pgd', label: 'Phó Giám đốc' },
  { value: 'bgd', label: 'Ban Giám đốc' },
  { value: 'tcth_admin', label: 'Admin TCTH' },
  { value: 'system_admin', label: 'System admin' },
];
const ADMIN_GROUP: AppRole[] = ['bgd', 'tcth_admin', 'system_admin'];
const ROLE_LABEL = new Map(ROLE_OPTIONS.map((r) => [r.value as string, r.label]));

export default function FeatureTipsAdminPage() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tips, setTips] = useState<FeatureTip[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<FeatureTip | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('feature_tips')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });
    setTips((data as FeatureTip[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!search) return tips;
    const s = search.toLowerCase();
    return tips.filter((t) => t.title.toLowerCase().includes(s) || t.content.toLowerCase().includes(s));
  }, [tips, search]);

  if (!isAdmin) return <div className="p-6 text-muted-foreground">Bạn không có quyền truy cập.</div>;
  if (loading) return <div className="p-6 text-muted-foreground">Đang tải...</div>;

  const handleToggleActive = async (t: FeatureTip) => {
    await supabase.from('feature_tips').update({ is_active: !t.is_active }).eq('id', t.id);
    load();
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from('feature_tips').delete().eq('id', deletingId);
    if (error) toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Đã xoá mẹo' }); load(); }
    setDeletingId(null);
  };

  const rolesBadges = (target: string[]) =>
    target.length === 0
      ? <Badge variant="secondary" className="text-[10px]">Mọi người</Badge>
      : target.map((r) => (
          <Badge key={r} variant="outline" className="text-[10px]">{ROLE_LABEL.get(r) || r}</Badge>
        ));

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="page-header">Quản trị mẹo tính năng</h1>
        <p className="page-subtitle">Soạn tip giới thiệu tính năng theo nhóm vai trò — hiện ở Tổng quan, trang Mẹo hay và push nhắc cán bộ lâu không đăng nhập</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tiêu đề/nội dung..." className="pl-9" />
            </div>
            <Button onClick={() => { setCreating(true); setEditing(null); }}>
              <Plus className="w-4 h-4 mr-1" />Thêm mẹo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr>
                  <th className="px-2 py-2 text-left">Tiêu đề</th>
                  <th className="px-2 py-2 text-left">Vai trò áp dụng</th>
                  <th className="px-2 py-2 text-center">Hiển thị</th>
                  <th className="px-2 py-2 text-center">Ưu tiên</th>
                  <th className="px-2 py-2 text-center">Hiệu lực</th>
                  <th className="px-2 py-2 text-center">Active</th>
                  <th className="px-2 py-2 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-t hover:bg-muted/30">
                    <td className="px-2 py-1.5 min-w-[220px]">
                      <div className="font-medium">{t.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{t.content}</div>
                    </td>
                    <td className="px-2 py-1.5"><div className="flex flex-wrap gap-1">{rolesBadges(t.target_roles)}</div></td>
                    <td className="px-2 py-1.5 text-center">
                      <Badge variant={t.display_mode === 'modal' ? 'default' : 'outline'} className="text-[10px]">
                        {t.display_mode === 'modal' ? 'Modal 1 lần' : 'Banner'}
                      </Badge>
                    </td>
                    <td className="px-2 py-1.5 text-center">{t.priority}</td>
                    <td className="px-2 py-1.5 text-center text-xs text-muted-foreground">
                      {t.starts_at || t.ends_at
                        ? `${t.starts_at ? new Date(t.starts_at).toLocaleDateString('vi-VN') : '…'} → ${t.ends_at ? new Date(t.ends_at).toLocaleDateString('vi-VN') : '…'}`
                        : 'Không giới hạn'}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <Switch checked={t.is_active} onCheckedChange={() => handleToggleActive(t)} />
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(t); setCreating(false); }} title="Sửa">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeletingId(t.id)} title="Xoá">
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-muted-foreground py-8">Không tìm thấy mẹo nào.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {(editing || creating) && (
            <TipEditDialog
              tip={editing}
              onClose={() => { setEditing(null); setCreating(false); }}
              onSaved={() => { setEditing(null); setCreating(false); load(); }}
            />
          )}

          <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xoá mẹo này?</AlertDialogTitle>
                <AlertDialogDescription>
                  Hành động không thể hoàn tác. Trạng thái đã xem/đã đóng của cán bộ với mẹo này cũng bị xoá.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Huỷ</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Xoá</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

/* ====================== EDIT/CREATE DIALOG ====================== */
function TipEditDialog({ tip, onClose, onSaved }: {
  tip: FeatureTip | null; onClose: () => void; onSaved: () => void;
}) {
  const isCreate = !tip;
  const [title, setTitle] = useState(tip?.title || '');
  const [content, setContent] = useState(tip?.content || '');
  const [ctaUrl, setCtaUrl] = useState(tip?.cta_url || '');
  const [ctaLabel, setCtaLabel] = useState(tip?.cta_label || '');
  const [roles, setRoles] = useState<Set<AppRole>>(new Set((tip?.target_roles || []) as AppRole[]));
  const [displayMode, setDisplayMode] = useState(tip?.display_mode || 'banner');
  const [priority, setPriority] = useState(tip?.priority ?? 0);
  const [isActive, setIsActive] = useState(tip?.is_active ?? true);
  // Input type="date" dùng YYYY-MM-DD
  const [startsAt, setStartsAt] = useState(tip?.starts_at ? tip.starts_at.slice(0, 10) : '');
  const [endsAt, setEndsAt] = useState(tip?.ends_at ? tip.ends_at.slice(0, 10) : '');
  const [saving, setSaving] = useState(false);

  const toggleRole = (r: AppRole) => {
    const s = new Set(roles);
    if (s.has(r)) s.delete(r); else s.add(r);
    setRoles(s);
  };
  const selectAdminGroup = () => setRoles(new Set([...roles, ...ADMIN_GROUP]));

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast({ title: 'Thiếu thông tin', description: 'Tiêu đề và nội dung không được rỗng', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      title: title.trim(),
      content: content.trim(),
      cta_url: ctaUrl.trim() || null,
      cta_label: ctaLabel.trim() || null,
      target_roles: [...roles],
      display_mode: displayMode,
      priority,
      is_active: isActive,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      // Hết hạn = CUỐI ngày được chọn (giờ VN)
      ends_at: endsAt ? new Date(`${endsAt}T23:59:59+07:00`).toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const { error } = isCreate
      ? await supabase.from('feature_tips').insert(payload)
      : await supabase.from('feature_tips').update(payload).eq('id', tip!.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Lỗi lưu', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: isCreate ? 'Đã tạo mẹo' : 'Đã lưu thay đổi' });
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isCreate ? 'Thêm mẹo mới' : 'Sửa mẹo'}</DialogTitle>
          <DialogDescription>
            Không chọn vai trò nào = áp dụng cho MỌI cán bộ. Nội dung hỗ trợ markdown (in đậm **abc**).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Tiêu đề *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Chiến dịch học tập tập thể" />
          </div>
          <div>
            <Label>Nội dung *</Label>
            <Textarea rows={3} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Mô tả ngắn gọn tính năng và lợi ích (1-3 câu)" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Đường dẫn tính năng (route nội bộ)</Label>
              <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="VD: /chien-dich-hoc-tap" />
            </div>
            <div>
              <Label>Nhãn nút</Label>
              <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="VD: Dùng thử ngay" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Vai trò áp dụng ({roles.size === 0 ? 'mọi người' : `${roles.size} đã chọn`})</Label>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAdminGroup}>
                + Chọn nhóm Admin (BGĐ/TCTH/System)
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 border rounded p-2 bg-muted/30">
              {ROLE_OPTIONS.map((r) => (
                <label key={r.value} className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5">
                  <input type="checkbox" checked={roles.has(r.value)} onChange={() => toggleRole(r.value)} />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label>Hiển thị</Label>
              <Select value={displayMode} onValueChange={setDisplayMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="banner">Banner Tổng quan</SelectItem>
                  <SelectItem value="modal">Modal 1 lần</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ưu tiên</Label>
              <Input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Hiệu lực từ</Label>
              <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div>
              <Label>Đến hết ngày</Label>
              <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Đang áp dụng</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-1" />{saving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
