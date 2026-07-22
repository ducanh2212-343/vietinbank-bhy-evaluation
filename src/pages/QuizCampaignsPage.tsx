import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ArrowLeft, BarChart3, CheckCircle2, EyeOff, Loader2, Megaphone,
  Pencil, Play, Plus, ShieldCheck, Shuffle, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface CampaignRow {
  id: string;
  title: string;
  description: string | null;
  source_ref: string | null;
  status: string;
  question_pool_size: number | null;
  shuffle_options: boolean;
  anonymous_results: boolean;
  start_date: string | null;
  end_date: string | null;
  department_id: string;
  created_by: string;
  rejected_reason: string | null;
  submitted_at: string | null;
}

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Nháp', variant: 'outline' },
  pending: { label: 'Chờ BGĐ duyệt', variant: 'secondary' },
  approved: { label: 'Đang chạy', variant: 'default' },
  rejected: { label: 'Bị từ chối', variant: 'destructive' },
  closed: { label: 'Đã đóng', variant: 'outline' },
};

/**
 * Chiến dịch quiz toàn chi nhánh: mọi người thấy chiến dịch đang chạy để tham
 * gia; phòng khởi tạo thấy nháp/chờ duyệt của mình; Ban Giám đốc thấy hàng
 * chờ phê duyệt với nút Duyệt/Từ chối.
 */
export default function QuizCampaignsPage() {
  const { profileId, departmentId, roles } = useAuth();
  const navigate = useNavigate();
  const isBgd = roles.includes('bgd') || roles.includes('system_admin');
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [myAttempts, setMyAttempts] = useState<Map<string, string>>(new Map());
  const [deptNames, setDeptNames] = useState<Map<string, string>>(new Map());
  const [canInitiate, setCanInitiate] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<CampaignRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!profileId) return;
    const [cRes, aRes, dRes, initRes] = await Promise.all([
      supabase.from('quiz_campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('quiz_campaign_attempts').select('campaign_id, status').eq('profile_id', profileId),
      supabase.from('departments').select('id, name'),
      departmentId
        ? supabase.from('quiz_campaign_initiator_depts').select('department_id').eq('department_id', departmentId).maybeSingle()
        : Promise.resolve({ data: null } as any),
    ]);
    setCampaigns((cRes.data || []) as CampaignRow[]);
    setMyAttempts(new Map((aRes.data || []).map((a: any) => [a.campaign_id, a.status])));
    setDeptNames(new Map((dRes.data || []).map((d: any) => [d.id, d.name])));
    setCanInitiate(!!initRes.data);
    setLoading(false);
  }, [profileId, departmentId]);

  useEffect(() => { load(); }, [load]);

  const review = async (c: CampaignRow, approve: boolean) => {
    setActing(true);
    try {
      const patch = approve
        ? { status: 'approved' }
        : { status: 'rejected', rejected_reason: rejectReason.trim() };
      const { error } = await supabase.from('quiz_campaigns').update(patch).eq('id', c.id);
      if (error) throw error;
      toast.success(approve ? `Đã phê duyệt "${c.title}" — chiến dịch bắt đầu chạy 🚀` : 'Đã từ chối chiến dịch');
      setRejectTarget(null);
      setRejectReason('');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Không cập nhật được');
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>;
  }

  const isOpen = (c: CampaignRow) => {
    const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
    return c.status === 'approved'
      && (!c.start_date || today >= c.start_date)
      && (!c.end_date || today <= c.end_date);
  };

  const running = campaigns.filter((c) => c.status === 'approved');
  const pending = campaigns.filter((c) => c.status === 'pending');
  const mine = campaigns.filter((c) =>
    (c.status === 'draft' || c.status === 'rejected') && c.created_by === profileId);
  const closed = campaigns.filter((c) => c.status === 'closed');

  const renderAntiCheatBadges = (c: CampaignRow) => (
    <div className="flex items-center gap-1.5 flex-wrap">
      {c.question_pool_size != null && (
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground border rounded-full px-1.5 py-0.5">
          <Shuffle className="w-3 h-3" /> Mỗi người {c.question_pool_size} câu ngẫu nhiên
        </span>
      )}
      {c.shuffle_options && (
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground border rounded-full px-1.5 py-0.5">
          <Shuffle className="w-3 h-3" /> Đảo đáp án
        </span>
      )}
      {c.anonymous_results && (
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground border rounded-full px-1.5 py-0.5">
          <EyeOff className="w-3 h-3" /> Ẩn danh
        </span>
      )}
    </div>
  );

  const renderCampaign = (c: CampaignRow, section: 'running' | 'pending' | 'mine' | 'closed') => {
    const attemptStatus = myAttempts.get(c.id);
    const sb = STATUS_BADGES[c.status] || { label: c.status, variant: 'outline' as const };
    const isCreator = c.created_by === profileId;
    return (
      <Card key={c.id}>
        <CardContent className="py-4 space-y-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold">{c.title}</p>
                <Badge variant={sb.variant}>{sb.label}</Badge>
              </div>
              {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
              <p className="text-xs text-muted-foreground">
                Phòng khởi tạo: {deptNames.get(c.department_id) || '—'}
                {c.source_ref ? ` · Nguồn: ${c.source_ref}` : ''}
                {c.end_date ? ` · đến hết ${new Date(c.end_date).toLocaleDateString('vi-VN')}` : ''}
              </p>
              {renderAntiCheatBadges(c)}
              {c.status === 'rejected' && c.rejected_reason && (
                <p className="text-xs text-red-500">BGĐ từ chối: {c.rejected_reason}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {section === 'running' && (
                attemptStatus === 'completed' ? (
                  <>
                    <span className="inline-flex items-center gap-1 text-sm text-emerald-600 font-medium">
                      <CheckCircle2 className="w-4 h-4" /> Đã hoàn thành
                    </span>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/quizzi/chien-dich/${c.id}/ket-qua`}><BarChart3 className="w-4 h-4 mr-1" /> Kết quả</Link>
                    </Button>
                  </>
                ) : isCreator ? (
                  <>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/quizzi/chien-dich/${c.id}/sua`}><Pencil className="w-4 h-4 mr-1" /> Quản lý</Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/quizzi/chien-dich/${c.id}/ket-qua`}><BarChart3 className="w-4 h-4 mr-1" /> Kết quả</Link>
                    </Button>
                  </>
                ) : isOpen(c) ? (
                  <Button size="sm" onClick={() => navigate(`/quizzi/chien-dich/${c.id}`)}>
                    <Play className="w-4 h-4 mr-1" /> Làm ngay
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Chưa đến / đã qua thời gian mở</span>
                )
              )}
              {section === 'pending' && isBgd && (
                <>
                  <Button size="sm" disabled={acting} onClick={() => review(c, true)}>
                    <ShieldCheck className="w-4 h-4 mr-1" /> Phê duyệt
                  </Button>
                  <Button size="sm" variant="outline" disabled={acting}
                    onClick={() => { setRejectTarget(c); setRejectReason(''); }}>
                    <XCircle className="w-4 h-4 mr-1" /> Từ chối
                  </Button>
                </>
              )}
              {section === 'pending' && !isBgd && isCreator && (
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/quizzi/chien-dich/${c.id}/sua`}><Pencil className="w-4 h-4 mr-1" /> Xem / rút về</Link>
                </Button>
              )}
              {section === 'mine' && (
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/quizzi/chien-dich/${c.id}/sua`}><Pencil className="w-4 h-4 mr-1" /> Soạn tiếp</Link>
                </Button>
              )}
              {section === 'closed' && (attemptStatus === 'completed' || isCreator) && (
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/quizzi/chien-dich/${c.id}/ket-qua`}><BarChart3 className="w-4 h-4 mr-1" /> Kết quả</Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/quizzi')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Quizzi
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" /> Chiến dịch toàn chi nhánh
            </h1>
            <p className="text-sm text-muted-foreground">
              Phòng nghiệp vụ trụ sở khởi tạo — Ban Giám đốc phê duyệt — cả chi nhánh cùng làm.
            </p>
          </div>
        </div>
        {canInitiate && (
          <Button onClick={() => navigate('/quizzi/chien-dich/tao-moi')}>
            <Plus className="w-4 h-4 mr-1" /> Tạo chiến dịch
          </Button>
        )}
      </div>

      {pending.length > 0 && (isBgd || pending.some((c) => c.created_by === profileId || c.department_id === departmentId)) && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-500" /> Chờ Ban Giám đốc phê duyệt
          </h2>
          {pending.map((c) => renderCampaign(c, 'pending'))}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Đang diễn ra</h2>
        {running.length === 0 ? (
          <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">
            Chưa có chiến dịch nào đang chạy.
          </CardContent></Card>
        ) : running.map((c) => renderCampaign(c, 'running'))}
      </div>

      {mine.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Nháp / bị từ chối của tôi</h2>
          {mine.map((c) => renderCampaign(c, 'mine'))}
        </div>
      )}

      {closed.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Đã kết thúc</h2>
          {closed.slice(0, 10).map((c) => renderCampaign(c, 'closed'))}
        </div>
      )}

      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) setRejectTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Từ chối chiến dịch "{rejectTarget?.title}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3}
              placeholder="Lý do từ chối (bắt buộc) — phòng khởi tạo sẽ thấy để chỉnh sửa" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectTarget(null)}>Huỷ</Button>
              <Button variant="destructive" disabled={acting || !rejectReason.trim()}
                onClick={() => rejectTarget && review(rejectTarget, false)}>
                Từ chối
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
