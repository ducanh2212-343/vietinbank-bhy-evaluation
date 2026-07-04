import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Pencil, ClipboardCheck, Shield, Trash2 } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  employee: 'Nhân viên', manager: 'Trưởng phòng', pgd: 'Phó Giám đốc',
  bgd: 'Ban Giám đốc', tcth_admin: 'TCTH Admin', system_admin: 'System Admin',
};

const CLASS_LABELS: Record<string, string> = {
  sao_mai: 'Sao Mai', sao_khue: 'Sao Khuê', sao_bang: 'Sao Băng', sao_hom: 'Sao Hôm',
};
const CLASS_CSS: Record<string, string> = {
  sao_mai: 'star-mai', sao_khue: 'star-khue', sao_bang: 'star-bang', sao_hom: 'star-hom',
};

export default function StaffDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, isManager, isPgd } = useAuth();
  const canEdit = isAdmin;
  const canEvaluate = isAdmin || isManager || isPgd;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [department, setDepartment] = useState<string>('');
  const [manager, setManager] = useState<string>('');
  const [pgd, setPgd] = useState<string>('');
  const [director, setDirector] = useState<string>('');
  const [role, setRole] = useState<string | null>(null);
  const [evalData, setEvalData] = useState<any>(null);
  const [skills, setSkills] = useState<Map<string, string>>(new Map());
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [profileRes, evalRes, commentsRes, skillsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id!).single(),
        supabase.from('admin_evaluations').select('*').eq('employee_id', id!).order('created_at', { ascending: false }).limit(1),
        supabase.from('admin_comments').select('*').eq('employee_id', id!).order('created_at', { ascending: false }),
        supabase.from('skill_catalog').select('id, name'),
      ]);

      const p = profileRes.data;
      setProfile(p);
      setSkills(new Map((skillsRes.data || []).map((s) => [s.id, s.name])));

      if (p?.department_id) {
        const { data } = await supabase.from('departments').select('name').eq('id', p.department_id).single();
        if (data) setDepartment(data.name);
      }
      // Resolve position name from position_id
      let resolvedPosition = p?.position || '';
      if (p?.position_id) {
        const { data: posData } = await supabase.from('positions').select('name').eq('id', p.position_id).single();
        if (posData) resolvedPosition = posData.name;
      }
      if (p) setProfile({ ...p, resolved_position: resolvedPosition });
      if (p?.manager_id) {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', p.manager_id).single();
        if (data) setManager(data.full_name);
      }
      if (p?.pgd_id) {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', p.pgd_id).single();
        if (data) setPgd(data.full_name);
      }
      if (p?.director_id) {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', p.director_id).single();
        if (data) setDirector(data.full_name);
      }
      if (p?.user_id) {
        const { data } = await supabase.from('user_roles').select('role').eq('user_id', p.user_id).maybeSingle();
        if (data) setRole(data.role);
      }

      setEvalData(evalRes.data?.[0] || null);
      setComments(commentsRes.data || []);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <div className="p-6 text-muted-foreground">Đang tải...</div>;
  if (!profile) return <div className="p-6 text-muted-foreground">Không tìm thấy cán bộ.</div>;

  const infoRows = [
    ['Họ tên', profile.full_name],
    ['Email', profile.email],
    ['Điện thoại', profile.phone],
    ['Phòng ban', department],
    ['Chức danh', profile.resolved_position || profile.position],
    ['Quản lý', manager],
    ['Ban giám đốc Phụ trách', pgd],
    ['Giám đốc Chi nhánh', director],
    ['Trạng thái', profile.status === 'active' ? 'Đang làm việc' : 'Nghỉ việc'],
    ['Ngày vào làm', profile.join_date ? new Date(profile.join_date).toLocaleDateString('vi-VN') : ''],
    ['Ghi chú', profile.note],
  ];

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/danh-sach-can-bo')}><ArrowLeft className="w-4 h-4 mr-2" /> Danh sách</Button>
        <div className="flex gap-2">
          {canEdit && <Button variant="outline" size="sm" onClick={() => navigate(`/sua-can-bo/${id}`)}><Pencil className="w-3 h-3 mr-1" /> Sửa hồ sơ</Button>}
          {canEvaluate && <Button variant="outline" size="sm" onClick={() => navigate(`/danh-gia/${id}`)}><ClipboardCheck className="w-3 h-3 mr-1" /> Đánh giá</Button>}
          {canEdit && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm"><Trash2 className="w-3 h-3 mr-1" /> Xoá</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xoá vĩnh viễn cán bộ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bạn sắp XOÁ VĨNH VIỄN <strong>{profile.full_name}</strong>: hồ sơ, tài khoản đăng nhập và
                    toàn bộ dữ liệu đánh giá, kế hoạch phát triển, kanban của cán bộ này. Thao tác
                    <strong> không thể khôi phục</strong>. Nếu cán bộ đang là quản lý/PGĐ của người khác,
                    các liên kết đó sẽ được gỡ (đặt trống) để bạn phân công lại.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Huỷ</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async () => {
                      setDeleting(true);
                      const { data, error } = await supabase.functions.invoke('delete-staff', {
                        body: { profile_id: id },
                      });
                      if (error || data?.error) {
                        let message = data?.error || error?.message || 'Lỗi không xác định';
                        try {
                          const ctx = (error as { context?: Response } | null)?.context;
                          const body = ctx ? await ctx.json() : null;
                          if (body?.error) message = body.error;
                        } catch { /* keep default */ }
                        toast({ title: 'Không xoá được cán bộ', description: message, variant: 'destructive' });
                        setDeleting(false);
                      } else {
                        toast({ title: 'Đã xoá vĩnh viễn cán bộ' });
                        navigate('/danh-sach-can-bo');
                      }
                    }}
                  >
                    {deleting ? 'Đang xoá...' : 'Xoá vĩnh viễn'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Hồ sơ cán bộ</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-y-3 gap-x-8 text-sm">
            {infoRows.map(([label, val]) => (
              <div key={label}>
                <span className="text-muted-foreground">{label}:</span>{' '}
                <span className="font-medium">{val || '—'}</span>
              </div>
            ))}
          </div>
          {role && (
            <div className="mt-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Vai trò:</span>
              <Badge variant="secondary">{ROLE_LABELS[role] || role}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {evalData && (
        <Card>
          <CardHeader><CardTitle className="text-base">Đánh giá hiện tại</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">Nhóm:</span>
              {evalData.classification ? (
                <span className={`level-badge ${CLASS_CSS[evalData.classification]}`}>{CLASS_LABELS[evalData.classification]}</span>
              ) : '—'}
              <span className="text-muted-foreground ml-4">Hoàn thành:</span>
              <Badge variant="outline">{evalData.completion_status === 'completed' ? 'Hoàn thành' : evalData.completion_status === 'in_progress' ? 'Đang thực hiện' : 'Chưa bắt đầu'}</Badge>
            </div>
            {evalData.remark && <div><span className="text-muted-foreground">Nhận xét:</span> {evalData.remark}</div>}
            {(evalData.priority_skill_ids || []).length > 0 && (
              <div>
                <span className="text-muted-foreground">Skill ưu tiên:</span>
                <ul className="mt-1 space-y-1 ml-4">
                  {(evalData.priority_skill_ids || []).map((sid: string, i: number) => (
                    <li key={sid}>
                      {skills.get(sid) || sid} — {((evalData.current_levels || [])[i] || 0) === 0 ? 'L0 (Chưa hình thành)' : `Level ${(evalData.current_levels || [])[i]}`} → {((evalData.target_levels || [])[i] || 0) === 0 ? 'L0 (Chưa hình thành)' : `Level ${(evalData.target_levels || [])[i]}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {evalData.development_plan && <div><span className="text-muted-foreground">Kế hoạch:</span> {evalData.development_plan}</div>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Lịch sử nhận xét</CardTitle></CardHeader>
        <CardContent>
          {comments.length === 0 && <p className="text-sm text-muted-foreground">Chưa có nhận xét.</p>}
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="border rounded-lg p-3 text-sm">
                <div className="text-xs text-muted-foreground mb-1">
                  {new Date(c.created_at).toLocaleDateString('vi-VN')} {new Date(c.created_at).toLocaleTimeString('vi-VN')}
                </div>
                <p>{c.comment}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
