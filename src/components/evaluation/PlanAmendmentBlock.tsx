import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Loader2, FilePen, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { PLAN_LIMITS } from '@/lib/planTransfer';

/**
 * Sửa kế hoạch hành động SAU khi phiếu đã phê duyệt — phải qua phê duyệt (GĐ chốt 27/07).
 *
 * mode='employee' (trang Tự đánh giá, phiếu approved): cán bộ chỉnh D/E/F ngay trên
 * màn hình rồi gửi ĐỀ XUẤT kèm lý do — chưa ghi vào phiếu. mode='reviewer' (trang
 * Đánh giá cán bộ): người đánh giá của phiếu (đúng cấp đã duyệt phiếu) bấm Phê duyệt
 * → RPC decide_plan_change_request áp bản sửa vào phiếu, thẻ Kanban tự đồng bộ theo
 * trigger; hoặc Từ chối kèm ý kiến. Giới hạn 3 upskill / 3 AI được RPC ép lại ở server.
 */

interface Props {
  formId: string;
  mode: 'employee' | 'reviewer';
  /** employee: dựng payload từ state D/E/F đang hiển thị */
  buildPayload?: () => any;
  /** reviewer: có quyền quyết định (là reviewer_id của phiếu / system_admin) */
  canDecide?: boolean;
  onApplied?: () => void;
}

const payloadCounts = (pl: any) => ({
  sp: (pl?.skill_priorities || []).length,
  sa: (pl?.skill_actions || []).length,
  aa: (pl?.attitude_actions || []).length,
  ai: (pl?.ai_actions || []).length,
});

export function PlanAmendmentBlock({ formId, mode, buildPayload, canDecide, onApplied }: Props) {
  const [req, setReq] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [proposeOpen, setProposeOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('plan_change_requests' as any)
      .select('*, requester:requested_by(full_name), decider:decided_by(full_name)')
      .eq('form_id', formId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setReq(data);
    setLoading(false);
  }, [formId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return null;

  const pending = req?.status === 'pending';

  const submitProposal = async () => {
    if (!buildPayload) return;
    if (note.trim().length < 10) { toast.error('Nêu lý do sửa kế hoạch (tối thiểu 10 ký tự)'); return; }
    const payload = buildPayload();
    const c = payloadCounts(payload);
    if (c.sa > PLAN_LIMITS.SKILL_ACTIONS || c.ai > PLAN_LIMITS.AI_ACTIONS) {
      toast.error(`Kế hoạch vượt giới hạn: tối đa ${PLAN_LIMITS.SKILL_ACTIONS} hành động upskill và ${PLAN_LIMITS.AI_ACTIONS} hành động AI. Hãy bớt trước khi gửi.`);
      return;
    }
    setBusy(true);
    const { data: me } = await supabase.rpc('get_my_profile_id' as any);
    const { error } = await supabase.from('plan_change_requests' as any).insert({
      form_id: formId, employee_id: me, requested_by: me,
      note: note.trim(), payload,
    } as any);
    setBusy(false);
    if (error) { toast.error('Lỗi gửi đề xuất: ' + error.message); return; }
    toast.success('Đã gửi đề xuất sửa kế hoạch — chờ người đánh giá phê duyệt');
    setNote(''); setProposeOpen(false);
    await load();
  };

  const withdraw = async () => {
    if (!req) return;
    setBusy(true);
    const { error } = await supabase.from('plan_change_requests' as any).delete().eq('id', req.id);
    setBusy(false);
    if (error) { toast.error('Lỗi rút đề xuất: ' + error.message); return; }
    toast.success('Đã rút đề xuất');
    await load();
  };

  const decide = async (approve: boolean) => {
    if (!req) return;
    if (!approve && decisionNote.trim().length < 10) {
      toast.error('Từ chối phải kèm ý kiến (tối thiểu 10 ký tự) để cán bộ nắm được');
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc('decide_plan_change_request' as any, {
      p_request_id: req.id, p_approve: approve, p_note: decisionNote.trim() || null,
    } as any);
    setBusy(false);
    if (error) { toast.error('Lỗi xử lý đề xuất: ' + error.message); return; }
    toast.success(data === 'approved' ? 'Đã phê duyệt — kế hoạch mới đã áp vào phiếu, thẻ Kanban tự cập nhật' : 'Đã từ chối đề xuất');
    setDecisionNote('');
    await load();
    onApplied?.();
  };

  const c = req ? payloadCounts(req.payload) : null;

  return (
    <Card className={pending ? 'border-amber-400' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FilePen className="w-4 h-4" /> Sửa kế hoạch hành động sau phê duyệt
          {pending && <Badge variant="outline" className="border-amber-400 text-amber-700"><Clock className="w-3 h-3 mr-1" />Chờ duyệt</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* Trạng thái đề xuất gần nhất */}
        {req && (
          <div className="rounded-md border bg-muted/30 p-2.5 text-xs space-y-1">
            <div>
              <span className="text-muted-foreground">Đề xuất của </span>
              <strong>{req.requester?.full_name || 'Cán bộ'}</strong>
              <span className="text-muted-foreground"> · {new Date(req.created_at).toLocaleString('vi-VN')}</span>
              {c && <span className="text-muted-foreground"> · {c.sp} skill ưu tiên · {c.sa} HĐ upskill · {c.aa} HĐ thái độ · {c.ai} HĐ AI</span>}
            </div>
            <div><span className="text-muted-foreground">Lý do:</span> {req.note}</div>
            {req.status === 'approved' && (
              <div className="text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Đã phê duyệt bởi {req.decider?.full_name}{req.decision_note ? ` — ${req.decision_note}` : ''}
              </div>
            )}
            {req.status === 'rejected' && (
              <div className="text-destructive flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Bị từ chối bởi {req.decider?.full_name}{req.decision_note ? ` — ${req.decision_note}` : ''}
              </div>
            )}
          </div>
        )}

        {/* Phía cán bộ */}
        {mode === 'employee' && pending && (
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground flex-1">
              Kế hoạch mới chỉ có hiệu lực (và cập nhật thẻ Kanban) sau khi người đánh giá phê duyệt.
            </p>
            <Button size="sm" variant="outline" onClick={withdraw} disabled={busy}>Rút đề xuất</Button>
          </div>
        )}
        {mode === 'employee' && !pending && !proposeOpen && (
          <div className="space-y-1">
            <Button size="sm" variant="outline" onClick={() => setProposeOpen(true)}>
              <FilePen className="w-3.5 h-3.5 mr-1" /> Đề xuất sửa kế hoạch
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Chỉnh trực tiếp mục D/E/F phía trên rồi gửi đề xuất — giới hạn {PLAN_LIMITS.SKILL_ACTIONS} hành động upskill,
              {' '}{PLAN_LIMITS.AI_ACTIONS} hành động AI; hành động thái độ không giới hạn.
            </p>
          </div>
        )}
        {mode === 'employee' && !pending && proposeOpen && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Lý do sửa kế hoạch <span className="text-destructive">*</span></label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
              placeholder="VD: Bỏ 2 hành động dồn từ kỳ trước không còn phù hợp, thêm hành động gắn mục tiêu quý này…" />
            <div className="flex gap-2">
              <Button size="sm" onClick={submitProposal} disabled={busy}>
                {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                Gửi đề xuất (kế hoạch D/E/F đang hiển thị)
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setProposeOpen(false)} disabled={busy}>Huỷ</Button>
            </div>
          </div>
        )}

        {/* Phía người đánh giá */}
        {mode === 'reviewer' && pending && canDecide && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Ý kiến (bắt buộc khi từ chối)</label>
            <Textarea value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} rows={2}
              placeholder="Ý kiến gửi lại cán bộ…" />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => decide(true)} disabled={busy}>
                {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                Phê duyệt & áp dụng
              </Button>
              <Button size="sm" variant="destructive" onClick={() => decide(false)} disabled={busy}>
                <XCircle className="w-3.5 h-3.5 mr-1" /> Từ chối
              </Button>
            </div>
          </div>
        )}
        {mode === 'reviewer' && pending && !canDecide && (
          <p className="text-xs text-muted-foreground">Chờ người đánh giá của phiếu xử lý đề xuất này.</p>
        )}
        {mode === 'reviewer' && !req && (
          <p className="text-xs text-muted-foreground">Chưa có đề xuất sửa kế hoạch nào cho phiếu này.</p>
        )}
      </CardContent>
    </Card>
  );
}
