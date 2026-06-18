import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function DevelopmentPlanPage() {
  const { profileId } = useAuth();
  const [evalData, setEvalData] = useState<any>(null);
  const [skills, setSkills] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [eRes, sRes] = await Promise.all([
        profileId ? supabase.from('admin_evaluations').select('*').eq('employee_id', profileId).order('created_at', { ascending: false }).limit(1) : Promise.resolve({ data: [] }),
        supabase.from('skill_catalog').select('id, name'),
      ]);
      setEvalData((eRes as any).data?.[0] || null);
      setSkills(new Map((sRes.data || []).map((s: any) => [s.id, s.name])));
      setLoading(false);
    };
    load();
  }, [profileId]);

  if (loading) return <div className="p-6 text-muted-foreground">Đang tải...</div>;

  const priorityIds = evalData?.priority_skill_ids || [];
  const currentLevels = evalData?.current_levels || [];
  const targetLevels = evalData?.target_levels || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Kế hoạch phát triển cá nhân (IDP)</h1>
        <p className="page-subtitle">Theo dõi mục tiêu và hành động phát triển</p>
      </div>

      {priorityIds.length > 0 ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Mục tiêu phát triển</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Kỹ năng</TableHead>
                  <TableHead>Level hiện tại</TableHead>
                  <TableHead>Level mục tiêu</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priorityIds.map((sid: string, i: number) => (
                  <TableRow key={sid}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{skills.get(sid) || sid}</TableCell>
                    <TableCell><span className={`level-badge level-${currentLevels[i] || 1}`}>L{currentLevels[i] || '?'}</span></TableCell>
                    <TableCell><span className={`level-badge level-${targetLevels[i] || 1}`}>L{targetLevels[i] || '?'}</span></TableCell>
                    <TableCell><Badge variant="outline">{evalData?.completion_status === 'completed' ? 'Hoàn thành' : evalData?.completion_status === 'in_progress' ? 'Đang thực hiện' : 'Chưa bắt đầu'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Chưa có kế hoạch phát triển.</CardContent></Card>
      )}

      {evalData?.development_plan && (
        <Card>
          <CardHeader><CardTitle className="text-base">Kế hoạch chi tiết</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{evalData.development_plan}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
