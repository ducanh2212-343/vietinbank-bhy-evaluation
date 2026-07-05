import { lazy, Suspense, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Briefcase, Pencil } from 'lucide-react';
import { fetchAllForms, APPROVED_STATUSES, type ApprovedFormMeta } from '@/lib/approvedForm';
import { EvaluationHistoryList } from '@/components/profile/EvaluationHistoryList';
import { SkillCollectionGrid } from '@/components/profile/SkillCollectionGrid';
import type { TrendPoint } from '@/components/profile/ProgressTrendChart';
const ProgressTrendChart = lazy(() => import('@/components/profile/ProgressTrendChart').then(m => ({ default: m.ProgressTrendChart })));
import { StatusBadge, StatusNoteBanner } from '@/components/profile/StatusBadge';

export default function PersonalProfile() {
  const { id } = useParams<{ id: string }>();
  const { profileId } = useAuth();
  const targetId = id || profileId;
  const [profile, setProfile] = useState<any>(null);
  const [dept, setDept] = useState('');
  const [manager, setManager] = useState('');
  const [pgdName, setPgdName] = useState('');
  const [positionName, setPositionName] = useState('');
  const [forms, setForms] = useState<ApprovedFormMeta[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetId) { setLoading(false); return; }
    const load = async () => {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', targetId).maybeSingle();
      setProfile(p);
      if (!p) { setLoading(false); return; }

      const [dRes, posRes, mRes, pgdRes, formsList] = await Promise.all([
        p.department_id ? supabase.from('departments').select('name').eq('id', p.department_id).maybeSingle() : Promise.resolve({ data: null } as any),
        p.position_id ? supabase.from('positions').select('name').eq('id', p.position_id).maybeSingle() : Promise.resolve({ data: null } as any),
        p.manager_id ? supabase.from('profiles').select('full_name').eq('id', p.manager_id).maybeSingle() : Promise.resolve({ data: null } as any),
        p.pgd_id ? supabase.from('profiles').select('full_name').eq('id', p.pgd_id).maybeSingle() : Promise.resolve({ data: null } as any),
        fetchAllForms(targetId),
      ]);
      setDept(dRes.data?.name || '');
      setPositionName(posRes.data?.name || p.position || '');
      setManager(mRes.data?.full_name || '');
      setPgdName(pgdRes.data?.full_name || '');
      setForms(formsList);

      // Trend chart — only from approved cycles to avoid drafts skewing data
      const approvedForms = formsList.filter(f => APPROVED_STATUSES.includes(f.status as any));
      if (approvedForms.length >= 2) {
        const ids = approvedForms.map(f => f.id);
        const [assessRes, attRes, actRes] = await Promise.all([
          supabase.from('skill_assessments').select('form_id, required_level, manager_assessed_level, self_assessed_level, is_core').in('form_id', ids),
          supabase.from('form_attitude_priorities').select('form_id, manager_status, self_status').in('form_id', ids),
          supabase.from('form_skill_actions').select('form_id, status').in('form_id', ids),
        ]);
        const byForm = new Map<string, TrendPoint>();
        const ordered = [...approvedForms].reverse();
        ordered.forEach(f => byForm.set(f.id, { cycle: f.cycle_name || '—', meet: 0, gap: 0, attitude_weak: 0, actions_done: 0 }));
        (assessRes.data || []).forEach((r: any) => {
          if (!r.is_core) return;
          const point = byForm.get(r.form_id);
          if (!point) return;
          const required = r.required_level ?? 0;
          const actual = r.manager_assessed_level ?? r.self_assessed_level ?? 0;
          if (required > 0) {
            if (actual >= required) point.meet += 1;
            else point.gap += 1;
          }
        });
        (attRes.data || []).forEach((r: any) => {
          const point = byForm.get(r.form_id);
          if (!point) return;
          const status = r.manager_status || r.self_status;
          if (status === 'can_cai_thien' || status === 'needs_improvement') point.attitude_weak += 1;
        });
        (actRes.data || []).forEach((r: any) => {
          const point = byForm.get(r.form_id);
          if (!point) return;
          if (r.status === 'completed' || r.status === 'done') point.actions_done += 1;
        });
        setTrend(Array.from(byForm.values()));
      } else {
        setTrend([]);
      }
      setLoading(false);
    };
    load();
  }, [targetId]);

  if (loading) return <div className="p-6 text-muted-foreground">Đang tải...</div>;
  if (!profile) return <div className="p-6 text-muted-foreground">Chưa có hồ sơ cá nhân.</div>;

  const isOwn = !id || id === profileId;
  const latest = forms[0];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-header">Hồ sơ cá nhân</h1>
          <p className="page-subtitle">{profile.full_name} — phát triển năng lực theo thời gian</p>
        </div>
        {isOwn && (
          <Button asChild variant="outline" size="sm">
            <Link to="/ho-so-ca-nhan/sua"><Pencil className="w-4 h-4 mr-2" /> Sửa hồ sơ</Link>
          </Button>
        )}
      </div>

      {latest && (
        <StatusNoteBanner status={latest.status} cycleName={latest.cycle_name} />
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> Thông tin hồ sơ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-primary" />
              )}
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm min-w-0">
              <Field label="Họ tên" value={profile.full_name} strong />
              <Field label="Phòng" value={dept || '—'} />
              <Field label="Vị trí" value={positionName || '—'} />
              <Field label="Quản lý trực tiếp" value={manager || '—'} />
              <Field label="Phó giám đốc phụ trách" value={pgdName || '—'} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs items-center">
            <Badge variant="outline" className="gap-1"><Briefcase className="w-3 h-3" /> {forms.length} kỳ đánh giá</Badge>
            {latest && (
              <>
                <span className="text-[11px] text-muted-foreground">Kỳ mới nhất: <strong>{latest.cycle_name}</strong></span>
                <StatusBadge status={latest.status} />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {latest && (
        <SkillCollectionGrid formId={latest.id} cycleName={latest.cycle_name} />
      )}

      {trend.length >= 2 && (
        <Suspense fallback={<div className="h-48" />}>
          <ProgressTrendChart data={trend} />
        </Suspense>
      )}

      <EvaluationHistoryList
        forms={forms}
        employeeId={targetId!}
        viewerIsEmployee={isOwn}
        positionId={profile.position_id}
      />
    </div>
  );
}

function Field({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
      <span className={`break-words ${strong ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  );
}

