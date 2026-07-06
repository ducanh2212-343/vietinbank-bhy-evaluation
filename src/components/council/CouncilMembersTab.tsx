import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { MEMBER_GROUP_LABELS, type CouncilMemberGroup } from '@/lib/council';

interface MemberRow {
  id: string;
  profile_id: string;
  member_group: CouncilMemberGroup;
  is_active: boolean;
  note: string | null;
  full_name: string;
  position: string | null;
}

interface ProfileOption { id: string; full_name: string; position: string | null; }

const GROUP_SHORT: Record<CouncilMemberGroup, string> = {
  giam_doc: 'Giám đốc CN (trọng số 20%)',
  pho_giam_doc: 'Phó Giám đốc (10%/15%)',
  thanh_vien: 'Thành viên khác (55%/65%)',
};

export function CouncilMembersTab() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [newProfileId, setNewProfileId] = useState('');
  const [newGroup, setNewGroup] = useState<CouncilMemberGroup>('thanh_vien');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [membersRes, profilesRes] = await Promise.all([
      supabase.from('council_members').select('id, profile_id, member_group, is_active, note, profiles(full_name, position)').order('member_group'),
      supabase.from('profiles').select('id, full_name, position').eq('status', 'active').order('full_name'),
    ]);
    if (membersRes.error) { toast.error('Lỗi tải thành viên: ' + membersRes.error.message); setLoading(false); return; }
    setMembers((membersRes.data || []).map((m) => {
      const p = m.profiles as unknown as { full_name: string; position: string | null } | null;
      return {
        id: m.id, profile_id: m.profile_id, member_group: m.member_group as CouncilMemberGroup,
        is_active: m.is_active, note: m.note, full_name: p?.full_name || '(đã xóa hồ sơ)', position: p?.position || null,
      };
    }));
    setProfiles((profilesRes.data || []) as ProfileOption[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const candidates = useMemo(() => {
    const memberIds = new Set(members.map((m) => m.profile_id));
    return profiles.filter((p) => !memberIds.has(p.id));
  }, [profiles, members]);

  const updateMember = async (id: string, patch: Partial<Pick<MemberRow, 'member_group' | 'is_active' | 'note'>>) => {
    const { error } = await supabase.from('council_members').update(patch).eq('id', id);
    if (error) { toast.error('Lỗi cập nhật: ' + error.message); return; }
    toast.success('Đã cập nhật thành viên Hội đồng');
    load();
  };

  const removeMember = async (m: MemberRow) => {
    if (!window.confirm(`Xóa ${m.full_name} khỏi Hội đồng? Phiếu đã chấm của thành viên này vẫn được giữ. Nếu chỉ tạm ngưng, hãy tắt "Hoạt động".`)) return;
    const { error } = await supabase.from('council_members').delete().eq('id', m.id);
    if (error) { toast.error('Lỗi xóa: ' + error.message); return; }
    toast.success(`Đã xóa ${m.full_name} khỏi Hội đồng`);
    load();
  };

  const addMember = async () => {
    if (!newProfileId) { toast.error('Chọn cán bộ để thêm vào Hội đồng'); return; }
    setBusy(true);
    const { error } = await supabase.from('council_members').insert({
      profile_id: newProfileId,
      member_group: newGroup,
    });
    setBusy(false);
    if (error) { toast.error('Lỗi thêm thành viên: ' + error.message); return; }
    toast.success('Đã thêm thành viên Hội đồng');
    setNewProfileId('');
    load();
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground flex items-center gap-2 py-4"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Thành viên Hội đồng được quyền chấm điểm các đầu mối (không tự chấm bản thân). Nhóm vị trí quyết định
        trọng số phiếu: Giám đốc 20%; PGĐ phụ trách 10% (với đầu mối cấp TP); PGĐ còn lại 15%; thành viên khác
        55% (đầu mối cấp TP) hoặc 65% (đầu mối cấp PGĐ). Cán bộ chưa có tài khoản trên hệ thống cần được tạo
        tài khoản trước khi thêm vào Hội đồng.
      </p>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-3 py-2 font-medium">Thành viên</th>
                <th className="px-3 py-2 font-medium">Nhóm trọng số</th>
                <th className="px-3 py-2 font-medium">Ghi chú</th>
                <th className="px-3 py-2 font-medium">Hoạt động</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className={`border-b last:border-0 ${m.is_active ? '' : 'opacity-60'}`}>
                  <td className="px-3 py-2">
                    <div className="font-medium">{m.full_name}</div>
                    <div className="text-xs text-muted-foreground">{m.position || '—'}</div>
                  </td>
                  <td className="px-3 py-2">
                    <Select value={m.member_group} onValueChange={(v) => updateMember(m.id, { member_group: v as CouncilMemberGroup })}>
                      <SelectTrigger className="h-8 w-52 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(GROUP_SHORT) as CouncilMemberGroup[]).map((g) => (
                          <SelectItem key={g} value={g} className="text-xs">{GROUP_SHORT[g]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      defaultValue={m.note || ''}
                      onBlur={(e) => e.target.value !== (m.note || '') && updateMember(m.id, { note: e.target.value || null })}
                      className="h-8 text-xs min-w-40"
                      placeholder="Ghi chú…"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Switch checked={m.is_active} onCheckedChange={(v) => updateMember(m.id, { is_active: v })} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeMember(m)} title="Xóa khỏi Hội đồng">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Chưa có thành viên Hội đồng.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={newProfileId} onValueChange={setNewProfileId}>
          <SelectTrigger className="h-9 w-64 text-sm"><SelectValue placeholder="Chọn cán bộ thêm vào Hội đồng…" /></SelectTrigger>
          <SelectContent>
            {candidates.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-sm">{p.full_name}{p.position ? ` — ${p.position}` : ''}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={newGroup} onValueChange={(v) => setNewGroup(v as CouncilMemberGroup)}>
          <SelectTrigger className="h-9 w-52 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(GROUP_SHORT) as CouncilMemberGroup[]).map((g) => (
              <SelectItem key={g} value={g} className="text-sm">{GROUP_SHORT[g]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={addMember} disabled={busy || !newProfileId}>
          {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1" />} Thêm thành viên
        </Button>
      </div>
    </div>
  );
}
