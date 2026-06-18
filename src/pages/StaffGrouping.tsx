import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const groupConfig = [
  { key: 'sao_mai', label: 'Sao Mai', desc: 'Năng lực cao + Hiệu suất cao', css: 'star-mai' },
  { key: 'sao_khue', label: 'Sao Khuê', desc: 'Năng lực cao + Hiệu suất cần cải thiện', css: 'star-khue' },
  { key: 'sao_bang', label: 'Sao Băng', desc: 'Năng lực cần phát triển + Hiệu suất cao', css: 'star-bang' },
  { key: 'sao_hom', label: 'Sao Hôm', desc: 'Năng lực cần phát triển + Hiệu suất cần cải thiện', css: 'star-hom' },
];

export default function StaffGrouping() {
  const navigate = useNavigate();
  const { scope, visibleDeptIds, loading: authLoading } = useAuth();
  const [grouped, setGrouped] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    const load = async () => {
      let profilesQuery = supabase.from('profiles').select('id, full_name, position, department_id');
      if (scope !== 'all' && visibleDeptIds.length > 0) {
        profilesQuery = profilesQuery.in('department_id', visibleDeptIds);
      }
      const [pRes, eRes] = await Promise.all([
        profilesQuery,
        supabase.from('admin_evaluations').select('employee_id, classification'),
      ]);
      const profileMap = new Map((pRes.data || []).map((p) => [p.id, p]));
      const groups: Record<string, any[]> = {};
      (eRes.data || []).forEach((e) => {
        if (e.classification) {
          const p = profileMap.get(e.employee_id);
          if (!p) return;
          if (!groups[e.classification]) groups[e.classification] = [];
          groups[e.classification].push(p);
        }
      });
      setGrouped(groups);
      setLoading(false);
    };
    load();
  }, [authLoading, scope, visibleDeptIds]);

  if (loading) return <div className="p-6 text-muted-foreground">Đang tải...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Phân nhóm cán bộ</h1>
        <p className="page-subtitle">Ma trận 4 nhóm theo năng lực và hiệu suất</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groupConfig.map((g) => (
          <Card key={g.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className={`level-badge ${g.css}`}><Star className="w-3 h-3" /></span>
                {g.label}
                <span className="text-muted-foreground font-normal text-xs ml-auto">{(grouped[g.key] || []).length} cán bộ</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground">{g.desc}</p>
            </CardHeader>
            <CardContent>
              {(grouped[g.key] || []).length === 0 ? (
                <p className="text-xs text-muted-foreground">Chưa có cán bộ trong nhóm này.</p>
              ) : (
                <div className="space-y-1">
                  {(grouped[g.key] || []).map((p) => (
                    <button key={p.id} onClick={() => navigate(`/chi-tiet-can-bo/${p.id}`)}
                      className="w-full text-left p-2 rounded hover:bg-muted/50 text-sm transition-colors">
                      <span className="font-medium">{p.full_name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{p.position || ''}</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
