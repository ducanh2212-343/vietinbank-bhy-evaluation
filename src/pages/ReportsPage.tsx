import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { BarChart3, Users, Star, Target } from 'lucide-react';

export default function ReportsPage() {
  const { scope, visibleDeptIds, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({ total: 0, byDept: [] as any[], byGroup: [] as any[], coreByDept: [] as any[] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    const load = async () => {
      let profilesQuery = supabase.from('profiles').select('id, department_id, position_id').eq('status', 'active');
      let deptsQuery = supabase.from('departments').select('id, name').eq('is_active', true);
      if (scope !== 'all' && visibleDeptIds.length > 0) {
        profilesQuery = profilesQuery.in('department_id', visibleDeptIds);
        deptsQuery = deptsQuery.in('id', visibleDeptIds);
      }
      const [pRes, dRes, eRes, pcsRes] = await Promise.all([
        profilesQuery,
        deptsQuery,
        supabase.from('admin_evaluations').select('employee_id, classification, priority_skill_ids, current_levels'),
        supabase.from('position_core_skills').select('position_id, skill_id, minimum_level'),
      ]);
      const profiles = pRes.data || [];
      const depts = dRes.data || [];
      const profileIds = new Set(profiles.map(p => p.id));
      const evals = (eRes.data || []).filter(e => profileIds.has(e.employee_id));
      const evalMap = new Map(evals.map(e => [e.employee_id, e]));

      const byDept = depts.map(d => ({ name: d.name, count: profiles.filter(p => p.department_id === d.id).length }));

      const groupLabels: Record<string, string> = { sao_mai: 'Sao Mai', sao_khue: 'Sao Khuê', sao_bang: 'Sao Băng', sao_hom: 'Sao Hôm' };
      const groupCounts: Record<string, number> = {};
      evals.forEach(e => { if (e.classification) groupCounts[e.classification] = (groupCounts[e.classification] || 0) + 1; });
      const byGroup = Object.entries(groupLabels).map(([k, l]) => ({ key: k, label: l, count: groupCounts[k] || 0 }));

      const pcsGrouped = new Map<string, any[]>();
      (pcsRes.data || []).forEach(r => {
        if (!pcsGrouped.has(r.position_id)) pcsGrouped.set(r.position_id, []);
        pcsGrouped.get(r.position_id)!.push(r);
      });
      const coreByDept = depts.map(d => {
        const deptProfiles = profiles.filter(p => p.department_id === d.id);
        let totalSkills = 0, metSkills = 0;
        deptProfiles.forEach(p => {
          if (!p.position_id) return;
          const skills = pcsGrouped.get(p.position_id) || [];
          const ev = evalMap.get(p.id);
          const pIds = ev?.priority_skill_ids || [];
          const cLevels = ev?.current_levels || [];
          skills.forEach(s => {
            totalSkills++;
            const idx = pIds.indexOf(s.skill_id);
            if (idx >= 0 && (cLevels[idx] || 0) >= s.minimum_level) metSkills++;
          });
        });
        return { name: d.name, pct: totalSkills > 0 ? Math.round((metSkills / totalSkills) * 100) : 0, total: totalSkills };
      });

      setStats({ total: profiles.length, byDept, byGroup, coreByDept });
      setLoading(false);
    };
    load();
  }, [authLoading, scope, visibleDeptIds]);

  if (loading) return <div className="p-6 text-muted-foreground">Đang tải...</div>;

  const starCss: Record<string, string> = { sao_mai: 'star-mai', sao_khue: 'star-khue', sao_bang: 'star-bang', sao_hom: 'star-hom' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Báo cáo</h1>
        <p className="page-subtitle">Tổng hợp dữ liệu quản trị nhân sự</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> Cán bộ theo phòng ban</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.byDept.map(d => (
                <div key={d.name} className="flex justify-between items-center text-sm">
                  <span>{d.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${stats.total ? (d.count / stats.total) * 100 : 0}%` }} />
                    </div>
                    <span className="font-semibold w-8 text-right">{d.count}</span>
                  </div>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                <span>Tổng</span><span>{stats.total}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Star className="w-4 h-4" /> Phân nhóm cán bộ</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.byGroup.map(g => (
                <div key={g.key} className="flex justify-between items-center text-sm">
                  <span className={`level-badge ${starCss[g.key]}`}>{g.label}</span>
                  <span className="font-semibold">{g.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4" /> Tỷ lệ đáp ứng skill lõi theo phòng ban</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.coreByDept.map(d => (
                <div key={d.name} className="flex justify-between items-center text-sm">
                  <span className="w-48">{d.name}</span>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${d.pct}%`, backgroundColor: d.pct >= 80 ? 'hsl(var(--primary))' : d.pct >= 50 ? 'hsl(40 95% 50%)' : 'hsl(0 80% 55%)' }} />
                    </div>
                    <span className="font-semibold w-12 text-right">{d.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
