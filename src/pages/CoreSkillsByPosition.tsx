import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SkillLevelBadge } from '@/components/SkillLevelBadge';
import { useSkillLevelImages } from '@/hooks/useSkillLevelImages';

export default function CoreSkillsByPosition() {
  const { profileId } = useAuth();
  const { getImageUrl } = useSkillLevelImages();
  const [coreSkills, setCoreSkills] = useState<any[]>([]);
  const [evalData, setEvalData] = useState<any>(null);
  const [positionName, setPositionName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) { setLoading(false); return; }
    const load = async () => {
      const { data: profile } = await supabase.from('profiles').select('position_id, position').eq('id', profileId).single();
      const posId = profile?.position_id;
      if (posId) {
        const [posRes, pcsRes, eRes] = await Promise.all([
          supabase.from('positions').select('name').eq('id', posId).single(),
          supabase.from('position_core_skills').select('skill_id, minimum_level, advanced_level, sort_order, skill_catalog(id, code, name, skill_group)').eq('position_id', posId).order('sort_order'),
          supabase.from('admin_evaluations').select('*').eq('employee_id', profileId).order('created_at', { ascending: false }).limit(1),
        ]);
        setPositionName(posRes.data?.name || profile?.position || '');
        setCoreSkills((pcsRes.data || []).map((r: any) => ({ ...r, skill: r.skill_catalog })));
        setEvalData(eRes.data?.[0] || null);
      } else {
        setPositionName(profile?.position || '');
      }
      setLoading(false);
    };
    load();
  }, [profileId]);

  if (loading) return <div className="p-6 text-muted-foreground">Đang tải...</div>;

  const priorityIds = evalData?.priority_skill_ids || [];
  const currentLevels = evalData?.current_levels || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="page-header">Skill lõi theo vị trí</h1>
        <p className="page-subtitle">{positionName || 'Chưa gán vị trí'} — Các kỹ năng bắt buộc theo vị trí công việc</p>
      </div>

      {coreSkills.length > 0 ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Skill lõi bắt buộc ({coreSkills.length} skill)</CardTitle></CardHeader>
          <CardContent>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-3 font-medium w-10">#</th>
                    <th className="text-left py-3 px-3 font-medium">Kỹ năng</th>
                    <th className="text-left py-3 px-3 font-medium">Nhóm</th>
                    <th className="text-center py-3 px-3 font-medium">Min</th>
                    <th className="text-center py-3 px-3 font-medium">Adv</th>
                    <th className="text-center py-3 px-3 font-medium">Hiện tại</th>
                    <th className="text-center py-3 px-3 font-medium">Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {coreSkills.map((cs, i) => {
                    const idx = priorityIds.indexOf(cs.skill_id);
                    const cur = idx >= 0 ? (currentLevels[idx] || 0) : 0;
                    const gap = cs.minimum_level - cur;
                    return (
                      <tr key={cs.skill_id} className="border-b last:border-0">
                        <td className="py-3 px-3 text-muted-foreground">{i + 1}</td>
                        <td className="py-3 px-3 font-medium">{cs.skill?.name || cs.skill_id}</td>
                        <td className="py-3 px-3"><Badge variant="outline" className="text-[10px]">{cs.skill?.skill_group || '—'}</Badge></td>
                        <td className="py-3 px-3 text-center">
                          <SkillLevelBadge level={cs.minimum_level} imageUrl={getImageUrl(cs.skill_id, cs.minimum_level)} />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <SkillLevelBadge level={cs.advanced_level} imageUrl={getImageUrl(cs.skill_id, cs.advanced_level)} />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <SkillLevelBadge level={cur} imageUrl={getImageUrl(cs.skill_id, cur)} />
                        </td>
                        <td className="py-3 px-3 text-center">
                          {cur > 0 ? (gap > 0 ? <Badge variant="destructive">-{gap}</Badge> : <Badge variant="secondary">OK</Badge>) : <span className="text-muted-foreground text-xs">N/A</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {coreSkills.map((cs, i) => {
                const idx = priorityIds.indexOf(cs.skill_id);
                const cur = idx >= 0 ? (currentLevels[idx] || 0) : 0;
                const gap = cs.minimum_level - cur;
                return (
                  <div key={cs.skill_id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs text-muted-foreground">#{i + 1}</span>
                        <p className="text-sm font-medium">{cs.skill?.name}</p>
                        <Badge variant="outline" className="text-[9px] mt-1">{cs.skill?.skill_group}</Badge>
                      </div>
                      {cur > 0 ? (gap > 0 ? <Badge variant="destructive">-{gap}</Badge> : <Badge variant="secondary">OK</Badge>) : <Badge variant="outline">N/A</Badge>}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Min</p>
                        <SkillLevelBadge level={cs.minimum_level} imageUrl={getImageUrl(cs.skill_id, cs.minimum_level)} />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Adv</p>
                        <SkillLevelBadge level={cs.advanced_level} imageUrl={getImageUrl(cs.skill_id, cs.advanced_level)} />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Hiện tại</p>
                        <SkillLevelBadge level={cur} imageUrl={getImageUrl(cs.skill_id, cur)} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          {positionName ? 'Chưa có skill lõi nào được cấu hình cho vị trí này.' : 'Vui lòng liên hệ quản trị viên để được gán vị trí công việc.'}
        </CardContent></Card>
      )}
    </div>
  );
}
