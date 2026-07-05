import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Flag, Loader2, Plus, Users2 } from 'lucide-react';
import { toast } from 'sonner';
import { LEVEL_LABELS } from '@/lib/skillLevels';
import { effectiveLevel } from '@/lib/skillInsights';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  skill_id: string;
  target_level: number;
  cycle_id: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface CampaignTarget {
  campaign_id: string;
  department_id: string | null;
  profile_id: string | null;
}

interface Progress { total_members: number; achieved: number }

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

export default function LearningCampaignsPage() {
  const { isAdmin, profileId, departmentId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [targets, setTargets] = useState<CampaignTarget[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [skills, setSkills] = useState<{ id: string; code: string | null; name: string }[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string; department_id: string | null }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [campRes, targetRes, deptRes, skillRes] = await Promise.all([
      supabase.from('learning_campaigns').select('*').order('is_active', { ascending: false }).order('end_date', { ascending: false }),
      supabase.from('learning_campaign_targets').select('campaign_id, department_id, profile_id'),
      supabase.from('departments').select('id, name').eq('is_active', true).order('name'),
      supabase.from('skill_catalog').select('id, code, name').eq('is_active', true).order('sort_order'),
    ]);
    const camps = (campRes.data || []) as Campaign[];
    setCampaigns(camps);
    setTargets((targetRes.data || []) as CampaignTarget[]);
    setDepartments(deptRes.data || []);
    setSkills(skillRes.data || []);
    // Tiến trình tập thể qua RPC (nhân viên thường chỉ thấy con số tổng hợp)
    const entries = await Promise.all(camps.map(async (c) => {
      const { data } = await supabase.rpc('get_campaign_progress', { _campaign_id: c.id });
      const row = (data as Progress[] | null)?.[0];
      return [c.id, row || { total_members: 0, achieved: 0 }] as const;
    }));
    setProgress(Object.fromEntries(entries));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, department_id')
        .eq('status', 'active')
        .order('full_name');
      setProfiles(data || []);
    })();
  }, [isAdmin]);

  const skillMap = useMemo(() => new Map(skills.map((s) => [s.id, `${s.code ? `${s.code} · ` : ''}${s.name}`])), [skills]);
  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);
  const targetsByCampaign = useMemo(() => {
    const m = new Map<string, CampaignTarget[]>();
    targets.forEach((t) => m.set(t.campaign_id, [...(m.get(t.campaign_id) || []), t]));
    return m;
  }, [targets]);

  const isMine = (c: Campaign): boolean => {
    const ts = targetsByCampaign.get(c.id) || [];
    return ts.some((t) => (t.profile_id && t.profile_id === profileId) || (t.department_id && t.department_id === departmentId));
  };

  const daysLeft = (c: Campaign): number => Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>;
  }

  const active = campaigns.filter((c) => c.is_active);
  const inactive = campaigns.filter((c) => !c.is_active);

  const renderCampaign = (c: Campaign) => {
    const p = progress[c.id] || { total_members: 0, achieved: 0 };
    const pct = p.total_members > 0 ? Math.round((p.achieved / p.total_members) * 100) : 0;
    const ts = targetsByCampaign.get(c.id) || [];
    const deptNames = ts.filter((t) => t.department_id).map((t) => deptMap.get(t.department_id!) || '').filter(Boolean);
    const namedCount = ts.filter((t) => t.profile_id).length;
    const left = daysLeft(c);
    return (
      <Card key={c.id} className={isMine(c) ? 'border-primary/50' : undefined}>
        <CardContent className="py-4 space-y-2.5">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{c.name}</span>
                {isMine(c) && <Badge className="text-[10px] bg-primary/10 text-primary border border-primary/30 hover:bg-primary/10">Bạn thuộc chiến dịch này</Badge>}
                {!c.is_active && <Badge variant="outline" className="text-[10px]">Đã kết thúc</Badge>}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {skillMap.get(c.skill_id) || 'Kỹ năng'} · mục tiêu tối thiểu <b>L{c.target_level} ({LEVEL_LABELS[c.target_level]})</b>
              </div>
              {c.description && <p className="text-xs text-muted-foreground mt-1">{c.description}</p>}
            </div>
            <div className="text-right text-[11px] text-muted-foreground shrink-0">
              <div>{fmtDate(c.start_date)} → {fmtDate(c.end_date)}</div>
              {c.is_active && (
                <div className={left < 0 ? 'text-red-600 font-medium' : left <= 14 ? 'text-orange-600 font-medium' : ''}>
                  {left < 0 ? `Quá hạn ${-left} ngày` : `Còn ${left} ngày`}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <span className="text-sm font-semibold whitespace-nowrap">{p.achieved}/{p.total_members}</span>
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">cán bộ đạt mục tiêu ({pct}%)</span>
          </div>
          {pct >= 100 && p.total_members > 0 && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-1.5">
              🎉 Cả tập thể đã đạt mục tiêu — thành tựu chung, xứng đáng được vinh danh trong giao ban!
            </p>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground">
              <Users2 className="w-3.5 h-3.5" />
              {deptNames.map((n) => <Badge key={n} variant="secondary" className="text-[10px]">{n}</Badge>)}
              {namedCount > 0 && <Badge variant="outline" className="text-[10px]">{namedCount} cán bộ đích danh</Badge>}
              {deptNames.length === 0 && namedCount === 0 && <span>Chưa gán đối tượng</span>}
            </div>
            {isAdmin && (
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setDetailId(c.id)}>Chi tiết</Button>
                <Button
                  size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={async () => {
                    const { error } = await supabase.from('learning_campaigns').update({ is_active: !c.is_active }).eq('id', c.id);
                    if (error) toast.error(error.message);
                    else { toast.success(c.is_active ? 'Đã kết thúc chiến dịch' : 'Đã mở lại chiến dịch'); load(); }
                  }}
                >
                  {c.is_active ? 'Kết thúc' : 'Mở lại'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Flag className="w-5 h-5 text-primary" /> Chiến dịch học tập tập thể
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cả phòng / nhóm cán bộ cùng nâng một kỹ năng lên mức mục tiêu trong mùa. Tiến trình là
            thành tựu chung của tập thể — không xếp hạng cá nhân.
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Tạo chiến dịch
          </Button>
        )}
      </div>

      {active.length === 0 && inactive.length === 0 && (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          Chưa có chiến dịch nào.{isAdmin ? ' Bấm "Tạo chiến dịch" để phát động phong trào đầu tiên.' : ''}
        </CardContent></Card>
      )}

      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Đang diễn ra ({active.length})</h2>
          {active.map(renderCampaign)}
        </div>
      )}
      {inactive.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Đã kết thúc ({inactive.length})</h2>
          {inactive.map(renderCampaign)}
        </div>
      )}

      {isAdmin && (
        <CreateCampaignDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          departments={departments}
          skills={skills}
          profiles={profiles}
          onCreated={() => { setDialogOpen(false); load(); }}
        />
      )}

      {isAdmin && detailId && (
        <CampaignDetailDialog
          campaign={campaigns.find((c) => c.id === detailId) || null}
          targets={targetsByCampaign.get(detailId) || []}
          skillLabel={skillMap.get(campaigns.find((c) => c.id === detailId)?.skill_id || '') || ''}
          deptMap={deptMap}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
}

/* ── Dialog tạo chiến dịch (admin) ── */
function CreateCampaignDialog({
  open, onOpenChange, departments, skills, profiles, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  departments: { id: string; name: string }[];
  skills: { id: string; code: string | null; name: string }[];
  profiles: { id: string; full_name: string; department_id: string | null }[];
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [skillId, setSkillId] = useState('');
  const [targetLevel, setTargetLevel] = useState('2');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deptIds, setDeptIds] = useState<Set<string>>(new Set());
  const [staffSearch, setStaffSearch] = useState('');
  const [staffIds, setStaffIds] = useState<Set<string>>(new Set());

  const toggle = (set: Set<string>, id: string, apply: (s: Set<string>) => void) => {
    const n = new Set(set);
    if (n.has(id)) n.delete(id); else n.add(id);
    apply(n);
  };

  const filteredStaff = profiles.filter((p) =>
    !staffSearch.trim() || p.full_name.toLowerCase().includes(staffSearch.trim().toLowerCase()));

  const save = async () => {
    if (!name.trim() || !skillId || !startDate || !endDate) {
      toast.error('Điền đủ: tên chiến dịch, kỹ năng, ngày bắt đầu/kết thúc');
      return;
    }
    if (deptIds.size === 0 && staffIds.size === 0) {
      toast.error('Chọn ít nhất một phòng ban hoặc một cán bộ tham gia');
      return;
    }
    if (endDate < startDate) {
      toast.error('Ngày kết thúc phải sau ngày bắt đầu');
      return;
    }
    setSaving(true);
    try {
      const { data: camp, error } = await supabase
        .from('learning_campaigns')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          skill_id: skillId,
          target_level: parseInt(targetLevel),
          start_date: startDate,
          end_date: endDate,
          created_by: user?.id ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;
      const rows = [
        ...[...deptIds].map((d) => ({ campaign_id: camp.id, department_id: d, profile_id: null as string | null })),
        ...[...staffIds].map((p) => ({ campaign_id: camp.id, department_id: null as string | null, profile_id: p })),
      ];
      const { error: tErr } = await supabase.from('learning_campaign_targets').insert(rows);
      if (tErr) throw tErr;
      toast.success('Đã phát động chiến dịch');
      setName(''); setDescription(''); setSkillId(''); setTargetLevel('2');
      setStartDate(''); setEndDate(''); setDeptIds(new Set()); setStaffIds(new Set());
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không tạo được chiến dịch');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Phát động chiến dịch học tập</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div>
            <label className="text-xs text-muted-foreground">Tên chiến dịch</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder='VD: "Mùa Tuân thủ Quý IV — cả phòng đạt L2"' />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Mô tả (tuỳ chọn)</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[48px] text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Kỹ năng mục tiêu</label>
              <Select value={skillId} onValueChange={setSkillId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Chọn kỹ năng…" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {skills.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.code ? `${s.code}. ` : ''}{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Mức tối thiểu cần đạt</label>
              <Select value={targetLevel} onValueChange={setTargetLevel}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((l) => <SelectItem key={l} value={String(l)}>L{l} — {LEVEL_LABELS[l]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Bắt đầu</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Kết thúc</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Phòng ban tham gia</label>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {departments.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-xs rounded border border-border px-2 py-1.5 cursor-pointer hover:bg-muted/40">
                  <Checkbox checked={deptIds.has(d.id)} onCheckedChange={() => toggle(deptIds, d.id, setDeptIds)} />
                  <span className="truncate">{d.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Nhóm cán bộ đích danh (tuỳ chọn{staffIds.size ? ` — đã chọn ${staffIds.size}` : ''})</label>
            <Input value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} placeholder="Tìm cán bộ…" className="h-8 text-xs mt-1" />
            <div className="max-h-36 overflow-y-auto mt-1 space-y-1">
              {filteredStaff.slice(0, 50).map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-xs rounded border border-border px-2 py-1 cursor-pointer hover:bg-muted/40">
                  <Checkbox checked={staffIds.has(p.id)} onCheckedChange={() => toggle(staffIds, p.id, setStaffIds)} />
                  <span className="truncate">{p.full_name}</span>
                </label>
              ))}
            </div>
          </div>
          <Button className="w-full" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Flag className="w-4 h-4 mr-1.5" />}
            Phát động chiến dịch
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Dialog chi tiết tiến độ từng người (admin) ── */
function CampaignDetailDialog({
  campaign, targets, skillLabel, deptMap, onClose,
}: {
  campaign: Campaign | null;
  targets: CampaignTarget[];
  skillLabel: string;
  deptMap: Map<string, string>;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<{ id: string; full_name: string; department_id: string | null; level: number | null }[]>([]);

  useEffect(() => {
    if (!campaign) return;
    (async () => {
      setLoading(true);
      // Thành viên: theo phòng + đích danh
      const deptIds = targets.filter((t) => t.department_id).map((t) => t.department_id as string);
      const namedIds = targets.filter((t) => t.profile_id).map((t) => t.profile_id as string);
      const queries = [];
      if (deptIds.length) queries.push(supabase.from('profiles').select('id, full_name, department_id').eq('status', 'active').in('department_id', deptIds));
      if (namedIds.length) queries.push(supabase.from('profiles').select('id, full_name, department_id').eq('status', 'active').in('id', namedIds));
      const results = await Promise.all(queries);
      const byId = new Map<string, { id: string; full_name: string; department_id: string | null }>();
      results.forEach((r) => (r.data || []).forEach((p) => byId.set(p.id, p)));
      const memberList = [...byId.values()];

      // Kỳ tính tiến độ: kỳ gắn với chiến dịch hoặc kỳ quý mới nhất
      let cycleId = campaign.cycle_id;
      if (!cycleId) {
        const { data } = await supabase
          .from('evaluation_cycles')
          .select('id')
          .eq('cycle_type', 'quarterly')
          .order('start_date', { ascending: false })
          .limit(1);
        cycleId = data?.[0]?.id || null;
      }
      const levels = new Map<string, number>();
      if (cycleId && memberList.length) {
        const { data: subs } = await supabase
          .from('form_submissions')
          .select('id, employee_id, updated_at')
          .eq('cycle_id', cycleId)
          .in('employee_id', memberList.map((m) => m.id));
        const latest = new Map<string, { id: string; updated_at: string }>();
        (subs || []).forEach((s) => {
          const prev = latest.get(s.employee_id);
          if (!prev || new Date(s.updated_at) > new Date(prev.updated_at)) latest.set(s.employee_id, s);
        });
        const formToEmp = new Map([...latest.entries()].map(([emp, s]) => [s.id, emp]));
        if (formToEmp.size) {
          const { data: rows } = await supabase
            .from('skill_assessments')
            .select('form_id, skill_id, self_assessed_level, manager_assessed_level, self_l0, manager_l0')
            .in('form_id', [...formToEmp.keys()])
            .eq('skill_id', campaign.skill_id);
          (rows || []).forEach((r) => {
            const emp = formToEmp.get(r.form_id);
            const lv = effectiveLevel(r);
            if (emp && lv != null) levels.set(emp, lv);
          });
        }
      }
      setMembers(memberList
        .map((m) => ({ ...m, level: levels.get(m.id) ?? null }))
        .sort((a, b) => (b.level ?? -1) - (a.level ?? -1) || a.full_name.localeCompare(b.full_name, 'vi')));
      setLoading(false);
    })();
  }, [campaign, targets]);

  if (!campaign) return null;
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{campaign.name}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">{skillLabel} · mục tiêu L{campaign.target_level}+</p>
        {loading ? (
          <div className="py-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {members.map((m) => {
              const achieved = m.level != null && m.level >= campaign.target_level;
              return (
                <div key={m.id} className="flex items-center justify-between gap-2 rounded border border-border px-2.5 py-1.5">
                  <div>
                    <div className="text-xs font-medium">{m.full_name}</div>
                    <div className="text-[10px] text-muted-foreground">{(m.department_id && deptMap.get(m.department_id)) || '—'}</div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${achieved ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'text-muted-foreground'}`}
                  >
                    {m.level == null ? 'Chưa có dữ liệu' : achieved ? `Đạt · L${m.level}` : `L${m.level}`}
                  </Badge>
                </div>
              );
            })}
            {members.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Không có thành viên.</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
