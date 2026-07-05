import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, Star, Clock, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { fetchLatestForm, type ApprovedFormMeta } from '@/lib/approvedForm';
import { ApprovedFormDetail } from '@/components/profile/ApprovedFormDetail';
import { StatusBadge, StatusNoteBanner } from '@/components/profile/StatusBadge';
import { ReviewerActionAlert } from '@/components/evaluation-tracking/ReviewerActionAlert';
import { PersonalKanbanMini } from '@/components/kanban/PersonalKanbanMini';
import { TeamPendingAlert } from '@/components/kanban/TeamPendingAlert';
import { AnniversaryBanner } from '@/components/branding/AnniversaryBanner';


function OverviewSelf({ profileId }: { profileId: string }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [dept, setDept] = useState('');
  const [positionName, setPositionName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [pgdName, setPgdName] = useState('');
  const [latestForm, setLatestForm] = useState<ApprovedFormMeta | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', profileId).maybeSingle();
      setProfile(p);
      if (!p) { setLoading(false); return; }

      const [dRes, posRes, mRes, pgdRes] = await Promise.all([
        p.department_id
          ? supabase.from('departments').select('name').eq('id', p.department_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
        p.position_id
          ? supabase.from('positions').select('name').eq('id', p.position_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
        p.manager_id
          ? supabase.from('profiles').select('full_name').eq('id', p.manager_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
        p.pgd_id
          ? supabase.from('profiles').select('full_name').eq('id', p.pgd_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      setDept(dRes.data?.name || '');
      setPositionName(posRes.data?.name || p.position || '');
      setManagerName(mRes.data?.full_name || '');
      setPgdName(pgdRes.data?.full_name || '');

      const latest = await fetchLatestForm(profileId);
      setLatestForm(latest);

      setLoading(false);
    };
    load();
  }, [profileId]);

  if (loading) return <div className="p-6 text-muted-foreground">Đang tải...</div>;
  if (!profile) return <div className="p-6 text-muted-foreground">Chưa có hồ sơ cá nhân.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Tổng quan của tôi</h1>
        <p className="page-subtitle">Kết quả đánh giá kỳ gần nhất</p>
      </div>

      <AnniversaryBanner />

      <ReviewerActionAlert />

      <PersonalKanbanMini profileId={profileId} />




      {latestForm && (
        <StatusNoteBanner status={latestForm.status} cycleName={latestForm.cycle_name} />
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> Thông tin cán bộ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <InfoRow label="Họ tên" value={profile.full_name} strong />
            <InfoRow label="Phòng / đơn vị" value={dept || '—'} />
            <InfoRow label="Vị trí" value={positionName || '—'} />
            <InfoRow label="Quản lý trực tiếp" value={managerName || '—'} />
            <InfoRow label="Phó giám đốc phụ trách" value={pgdName || '—'} />
            <InfoRow
              label="Kỳ đánh giá gần nhất"
              value={latestForm ? (latestForm as any).cycle_name || '—' : 'Chưa có'}
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            {latestForm ? (
              <StatusBadge status={latestForm.status} />
            ) : (
              <Badge variant="outline">Chưa có dữ liệu đánh giá kỳ nào</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {latestForm ? (
        <ApprovedFormDetail
          form={latestForm}
          employeeId={profileId}
          viewerIsEmployee={true}
          positionId={profile.position_id}
        />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Chưa có dữ liệu đánh giá kỳ nào. Sau khi cán bộ tạo phiếu, kết quả sẽ hiển thị tại đây.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
      <span className={strong ? 'font-semibold' : ''}>{value}</span>
    </div>
  );
}


export default function Overview() {
  const { scope, profileId, visibleDeptIds, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({ total: 0, byDept: [] as any[], byGroup: [] as any[], recentComments: [] as any[] });
  const [loading, setLoading] = useState(true);

  const isSelf = scope === 'self';

  useEffect(() => {
    if (authLoading) return;
    if (isSelf) { setLoading(false); return; }
    const load = async () => {
      let profilesQuery = supabase.from('profiles').select('id, department_id').eq('status', 'active');
      let deptsQuery = supabase.from('departments').select('id, name').eq('is_active', true);
      if (scope !== 'all' && visibleDeptIds.length > 0) {
        profilesQuery = profilesQuery.in('department_id', visibleDeptIds);
        deptsQuery = deptsQuery.in('id', visibleDeptIds);
      }

      const [profilesRes, deptsRes, evalsRes, commentsRes] = await Promise.all([
        profilesQuery,
        deptsQuery,
        supabase.from('admin_evaluations').select('employee_id, classification'),
        supabase.from('admin_comments')
          .select('employee_id, comment, created_at, profiles!admin_comments_employee_id_fkey(full_name)')
          .order('created_at', { ascending: false }).limit(5),
      ]);

      const profiles = profilesRes.data || [];
      const depts = deptsRes.data || [];
      const profileIds = new Set(profiles.map(p => p.id));
      const evals = (evalsRes.data || []).filter(e => profileIds.has(e.employee_id));

      const byDept = depts.map(d => ({ name: d.name, count: profiles.filter(p => p.department_id === d.id).length }));

      const groupMap: Record<string, string> = { sao_mai: 'Sao Mai', sao_khue: 'Sao Khuê', sao_bang: 'Sao Băng', sao_hom: 'Sao Hôm' };
      const groupCounts: Record<string, number> = {};
      evals.forEach(e => { if (e.classification) groupCounts[e.classification] = (groupCounts[e.classification] || 0) + 1; });
      const byGroup = Object.entries(groupMap).map(([key, label]) => ({ key, label, count: groupCounts[key] || 0 }));

      const recentComments = (commentsRes.data || [])
        .filter((c: any) => profileIds.has(c.employee_id))
        .map((c: any) => ({
          name: c.profiles?.full_name || 'N/A',
          comment: c.comment,
          date: new Date(c.created_at).toLocaleDateString('vi-VN'),
        }));

      setStats({ total: profiles.length, byDept, byGroup, recentComments });
      setLoading(false);
    };
    load();
  }, [authLoading, isSelf, scope, visibleDeptIds]);


  if (authLoading) return <div className="p-6 text-muted-foreground">Đang tải...</div>;
  if (isSelf) {
    if (!profileId) return <div className="p-6 text-muted-foreground">Chưa có hồ sơ cá nhân.</div>;
    return <OverviewSelf profileId={profileId} />;
  }
  if (loading) return <div className="p-6 text-muted-foreground">Đang tải...</div>;

  const starCss: Record<string, string> = { sao_mai: 'star-mai', sao_khue: 'star-khue', sao_bang: 'star-bang', sao_hom: 'star-hom' };

  const scopeLabel = scope === 'all' ? 'Toàn chi nhánh' : scope === 'block' ? 'Khối phụ trách' : 'Phòng của tôi';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Tổng quan năng lực & phát triển</h1>
        <p className="page-subtitle">Phạm vi: {scopeLabel}</p>
      </div>

      <AnniversaryBanner />

      <ReviewerActionAlert />

      {/* Nhắc gọn việc đội ngũ cần duyệt (chỉ hiện khi có) */}
      <TeamPendingAlert />

      {/* Kanban phát triển của CHÍNH lãnh đạo/quản lý — như cán bộ thường có ở Tổng quan cá nhân */}
      {profileId && <PersonalKanbanMini profileId={profileId} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="stat-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng cán bộ</p>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>
        {stats.byGroup.map(g => (
          <Card key={g.key} className="stat-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{g.label}</p>
                  <p className="text-2xl font-bold mt-1">{g.count}</p>
                </div>
                <span className={`level-badge ${starCss[g.key]}`}><Star className="w-4 h-4" /></span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4" /> Cán bộ theo phòng ban</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.byDept.map(d => (
                <div key={d.name} className="flex justify-between items-center text-sm">
                  <span>{d.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${stats.total ? (d.count / stats.total) * 100 : 0}%` }} />
                    </div>
                    <span className="font-semibold w-6 text-right">{d.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>




        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4" /> Cập nhật gần nhất</CardTitle></CardHeader>
          <CardContent>
            {stats.recentComments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có cập nhật nào.</p>
            ) : (
              <div className="space-y-3">
                {stats.recentComments.map((c, i) => (
                  <div key={i} className="border-b last:border-0 pb-2 last:pb-0">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground text-xs">{c.date}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{c.comment}</p>
                  </div>
                ))}
              </div>
            )}
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
              <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                <span>Chưa phân nhóm</span>
                <span>{stats.total - stats.byGroup.reduce((s, g) => s + g.count, 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
