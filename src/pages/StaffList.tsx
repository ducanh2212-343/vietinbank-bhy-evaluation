import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { fetchDefaultCycle, fetchStarByEmployee } from '@/lib/starClassification';

interface Staff {
  id: string;
  employee_code: string | null;
  full_name: string;
  email: string | null;
  position: string | null;
  status: string;
  department: string | null;
  department_id: string | null;
  classification: string | null;
}

const SCROLL_KEY = 'staffListScroll';
const SCROLL_URL_KEY = 'staffListScrollUrl';

export default function StaffList() {
  const { isAdmin, scope, visibleDeptIds, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const search = searchParams.get('q') ?? '';
  const deptFilter = searchParams.get('department') ?? 'all';
  const statusFilter = searchParams.get('status') ?? 'all';
  const groupFilter = searchParams.get('star') ?? 'all';

  const updateParam = (key: string, value: string, defaultValue: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === defaultValue) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (authLoading) return;
    const load = async () => {
      let profilesQuery = supabase.from('profiles').select('id, employee_code, full_name, email, position, position_id, status, department_id').neq('status', 'deleted');
      let deptsQuery = supabase.from('departments').select('id, name').eq('is_active', true);
      if (scope !== 'all' && visibleDeptIds.length > 0) {
        profilesQuery = profilesQuery.in('department_id', visibleDeptIds);
        deptsQuery = deptsQuery.in('id', visibleDeptIds);
      }
      // Xếp sao đọc từ nguồn chuẩn theo kỳ mới nhất (đồng nhất với Báo cáo & các trang khác)
      const cycle = await fetchDefaultCycle();
      const [profilesRes, deptsRes, starByEmp, posRes] = await Promise.all([
        profilesQuery,
        deptsQuery,
        cycle ? fetchStarByEmployee(cycle.id) : Promise.resolve(new Map<string, string>()),
        supabase.from('positions').select('id, name').eq('is_active', true),
      ]);
      const depts = deptsRes.data || [];
      const deptMap = new Map(depts.map((d) => [d.id, d.name]));
      const posMap = new Map((posRes.data || []).map((p) => [p.id, p.name]));
      setDepartments(depts);
      setStaff((profilesRes.data || []).map((p) => ({
        ...p,
        department: p.department_id ? deptMap.get(p.department_id) || null : null,
        position: p.position_id ? posMap.get(p.position_id) || p.position : p.position,
        classification: starByEmp.get(p.id) || null,
      })));
      setLoading(false);
    };
    load();
  }, [authLoading, scope, visibleDeptIds]);

  // Restore scroll position after list renders
  useEffect(() => {
    if (loading) return;
    const savedUrl = sessionStorage.getItem(SCROLL_URL_KEY);
    const savedY = sessionStorage.getItem(SCROLL_KEY);
    const currentUrl = location.pathname + location.search;
    if (savedUrl && savedY && savedUrl === currentUrl) {
      requestAnimationFrame(() => window.scrollTo(0, Number(savedY)));
    }
    sessionStorage.removeItem(SCROLL_KEY);
    sessionStorage.removeItem(SCROLL_URL_KEY);
  }, [loading, location.pathname, location.search]);

  const openStaff = (id: string) => {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    sessionStorage.setItem(SCROLL_URL_KEY, location.pathname + location.search);
    navigate(`/chi-tiet-can-bo/${id}`);
  };

  if (authLoading) return <div className="p-6 text-muted-foreground">Đang tải...</div>;

  const classLabel: Record<string, string> = { sao_mai: 'Sao Mai', sao_khue: 'Sao Khuê', sao_bang: 'Sao Băng', sao_hom: 'Sao Hôm' };
  const classCss: Record<string, string> = { sao_mai: 'star-mai', sao_khue: 'star-khue', sao_bang: 'star-bang', sao_hom: 'star-hom' };

  const filtered = staff.filter((s) => {
    const matchSearch = !search || s.full_name.toLowerCase().includes(search.toLowerCase()) || (s.employee_code || '').toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === 'all' || s.department_id === deptFilter;
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchGroup = groupFilter === 'all' || s.classification === groupFilter;
    return matchSearch && matchDept && matchStatus && matchGroup;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="page-header">Danh sách cán bộ</h1>
          <p className="page-subtitle">Quản lý toàn bộ cán bộ chi nhánh</p>
        </div>
        {isAdmin && <Button onClick={() => navigate('/them-can-bo')} className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" /> Thêm cán bộ</Button>}
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Tìm theo họ tên..." value={search} onChange={(e) => updateParam('q', e.target.value, '')} className="pl-9" />
        </div>
        <Select value={deptFilter} onValueChange={(v) => updateParam('department', v, 'all')}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Phòng ban" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả phòng ban</SelectItem>
            {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => updateParam('status', v, 'all')}>
          <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="active">Đang làm việc</SelectItem>
            <SelectItem value="inactive">Nghỉ việc</SelectItem>
          </SelectContent>
        </Select>
        <Select value={groupFilter} onValueChange={(v) => updateParam('star', v, 'all')}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Nhóm đánh giá" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả nhóm</SelectItem>
            <SelectItem value="sao_mai">Sao Mai</SelectItem>
            <SelectItem value="sao_khue">Sao Khuê</SelectItem>
            <SelectItem value="sao_bang">Sao Băng</SelectItem>
            <SelectItem value="sao_hom">Sao Hôm</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Đang tải...</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-card rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-3 font-medium">Họ tên</th>
                  <th className="text-left py-3 px-3 font-medium">Email</th>
                  <th className="text-left py-3 px-3 font-medium">Phòng ban</th>
                  <th className="text-left py-3 px-3 font-medium">Chức danh</th>
                  <th className="text-center py-3 px-3 font-medium">Trạng thái</th>
                  <th className="text-center py-3 px-3 font-medium">Nhóm</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-muted-foreground py-8">Không tìm thấy cán bộ nào.</td></tr>
                )}
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => openStaff(s.id)}>
                    <td className="py-3 px-3 font-medium">{s.full_name}</td>
                    <td className="py-3 px-3 text-muted-foreground text-sm">{s.email || '—'}</td>
                    <td className="py-3 px-3">{s.department || '—'}</td>
                    <td className="py-3 px-3">{s.position || '—'}</td>
                    <td className="py-3 px-3 text-center">
                      <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status === 'active' ? 'Đang làm' : 'Nghỉ việc'}</Badge>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {s.classification ? <span className={`level-badge ${classCss[s.classification] || ''}`}>{classLabel[s.classification]}</span> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Không tìm thấy cán bộ nào.</p>}
            {filtered.map((s) => (
              <div key={s.id} className="bg-card border rounded-lg p-3 space-y-1 cursor-pointer active:bg-muted/50" onClick={() => openStaff(s.id)}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{s.full_name}</span>
                  <Badge variant={s.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{s.status === 'active' ? 'Đang làm' : 'Nghỉ'}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{s.department || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{s.position || '—'}</span>
                  {s.classification && <span className={`level-badge ${classCss[s.classification]} text-[10px]`}>{classLabel[s.classification]}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
