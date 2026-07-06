import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { fetchDefaultCycle, fetchStarByEmployee } from '@/lib/starClassification';

export default function TeamOverview() {
  const navigate = useNavigate();
  const { scope, visibleDeptIds, loading: authLoading } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState('all');
  const [positionMap, setPositionMap] = useState<Map<string, any>>(new Map());
  const [coreSkillCounts, setCoreSkillCounts] = useState<Map<string, { total: number; met: number }>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    const load = async () => {
      let profilesQuery = supabase.from('profiles').select('id, full_name, position, position_id, department_id, status').eq('status', 'active');
      let deptsQuery = supabase.from('departments').select('id, name').eq('is_active', true);
      if (scope !== 'all' && visibleDeptIds.length > 0) {
        profilesQuery = profilesQuery.in('department_id', visibleDeptIds);
        deptsQuery = deptsQuery.in('id', visibleDeptIds);
      }
      // Nhóm sao đọc từ nguồn chuẩn theo kỳ mới nhất (đồng nhất với Báo cáo & các trang khác);
      // các cột skill lõi tạm giữ đường dữ liệu cũ (không thuộc phạm vi hợp nhất xếp sao).
      const cycle = await fetchDefaultCycle();
      const [pRes, dRes, eRes, posRes, pcsRes, starByEmp] = await Promise.all([
        profilesQuery,
        deptsQuery,
        supabase.from('admin_evaluations').select('employee_id, classification, completion_status, priority_skill_ids, current_levels'),
        supabase.from('positions').select('id, name'),
        supabase.from('position_core_skills').select('position_id, skill_id, minimum_level'),
        cycle ? fetchStarByEmployee(cycle.id) : Promise.resolve(new Map<string, string>()),
      ]);

      const deptMap = new Map((dRes.data || []).map(d => [d.id, d.name]));
      const evalMap = new Map((eRes.data || []).map(e => [e.employee_id, e]));
      const posMap = new Map((posRes.data || []).map(p => [p.id, p]));
      setPositionMap(posMap);
      setDepartments(dRes.data || []);

      // Core skill counts per position
      const pcsGrouped = new Map<string, any[]>();
      (pcsRes.data || []).forEach(r => {
        if (!pcsGrouped.has(r.position_id)) pcsGrouped.set(r.position_id, []);
        pcsGrouped.get(r.position_id)!.push(r);
      });

      const csMap = new Map<string, { total: number; met: number }>();
      (pRes.data || []).forEach(p => {
        if (!p.position_id) return;
        const skills = pcsGrouped.get(p.position_id) || [];
        const ev = evalMap.get(p.id);
        const pIds = ev?.priority_skill_ids || [];
        const cLevels = ev?.current_levels || [];
        const met = skills.filter(s => {
          const idx = pIds.indexOf(s.skill_id);
          return idx >= 0 && (cLevels[idx] || 0) >= s.minimum_level;
        }).length;
        csMap.set(p.id, { total: skills.length, met });
      });
      setCoreSkillCounts(csMap);

      setStaff((pRes.data || []).map(p => ({
        ...p,
        department: deptMap.get(p.department_id) || '—',
        posName: p.position_id ? posMap.get(p.position_id)?.name : p.position,
        eval: evalMap.get(p.id) || null,
        star: starByEmp.get(p.id) || null,
      })));
      setLoading(false);
    };
    load();
  }, [authLoading, scope, visibleDeptIds]);

  const classLabel: Record<string, string> = { sao_mai: 'Sao Mai', sao_khue: 'Sao Khuê', sao_bang: 'Sao Băng', sao_hom: 'Sao Hôm' };
  const classCss: Record<string, string> = { sao_mai: 'star-mai', sao_khue: 'star-khue', sao_bang: 'star-bang', sao_hom: 'star-hom' };

  const filtered = selectedDept === 'all' ? staff : staff.filter(s => s.department_id === selectedDept);

  if (loading) return <div className="p-6 text-muted-foreground">Đang tải...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-header">Đội ngũ phòng ban</h1>
          <p className="page-subtitle">Tổng quan năng lực đội ngũ ({filtered.length} cán bộ)</p>
        </div>
        <Select value={selectedDept} onValueChange={setSelectedDept}>
          <SelectTrigger className="w-full sm:w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả phòng ban</SelectItem>
            {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cán bộ</TableHead>
                <TableHead>Vị trí</TableHead>
                <TableHead>Phòng ban</TableHead>
                <TableHead>Đáp ứng lõi</TableHead>
                <TableHead>Nhóm</TableHead>
                <TableHead>Tiến độ</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Không có dữ liệu.</TableCell></TableRow>}
              {filtered.map(s => {
                const cs = coreSkillCounts.get(s.id);
                const pct = cs && cs.total > 0 ? Math.round((cs.met / cs.total) * 100) : null;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell className="text-sm">{s.posName || '—'}</TableCell>
                    <TableCell className="text-sm">{s.department}</TableCell>
                    <TableCell>
                      {pct !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-medium">{pct}%</span>
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {s.star ? (
                        <span className={`level-badge ${classCss[s.star]}`}>{classLabel[s.star]}</span>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.eval?.completion_status === 'completed' ? 'default' : 'secondary'}>
                        {s.eval?.completion_status === 'completed' ? 'Hoàn thành' : s.eval?.completion_status === 'in_progress' ? 'Đang thực hiện' : 'Chưa bắt đầu'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/chi-tiet-can-bo/${s.id}`)}><Eye className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
