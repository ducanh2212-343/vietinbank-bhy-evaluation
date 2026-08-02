import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, Loader2, CheckCircle2, XCircle, Clock, AlertTriangle, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { STAR_LABELS } from '@/components/profile/StarClassificationCard';

interface Props {
  cycleId: string;
  employeeId: string;
  formId?: string | null;
  myProfileId: string;
  evaluatorLevel: 'manager' | 'pgd' | 'director';
  /** target employee's pgd_id — used as approver default */
  approverDefaultId?: string | null;
  /** true → can propose (manager only) */
  canEvaluate: boolean;
  /** true → can approve/reject (pgd only) */
  canApprove: boolean;
  /** Người đánh giá duy nhất (PGĐ/GĐ không có TP ở giữa): đề xuất + phê duyệt gộp 1 nút —
   *  tự đề xuất rồi tự duyệt đề xuất của chính mình qua 2 bước là vô nghĩa và gây rối. */
  soleApprover?: boolean;
  /** Đổi giá trị → tải lại bản ghi sao (vd. sau khi BGĐ chuyển trả phiếu làm sao bị reset) */
  reloadKey?: string | number;
}

export function StarClassificationBlock(props: Props) {
  const { cycleId, employeeId, formId, myProfileId, evaluatorLevel, approverDefaultId, canEvaluate, canApprove, soleApprover, reloadKey } = props;
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [record, setRecord] = useState<any>(null);
  const [starGroup, setStarGroup] = useState<string>('');
  const [visible, setVisible] = useState(false);
  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const isDirectorOverseer = evaluatorLevel === 'director';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('staff_star_classifications')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('employee_id', employeeId)
        .maybeSingle();
      if (cancelled) return;
      setRecord(data);
      setStarGroup(data?.star_group || '');
      setVisible(!!data?.visible_to_employee);
      setOverrideReason('');
      setOverrideMode(false);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [cycleId, employeeId, reloadKey]);

  if (employeeId === myProfileId) return null;

  const status: string = record?.approval_status || 'none';
  const approved = status === 'approved';
  const rejected = status === 'rejected';
  const pending = status === 'pending';

  // Đồng bộ "Nhóm hiện tại" (admin_evaluations.classification) khi nhóm sao được
  // chốt — các báo cáo/danh sách (StaffList, TeamOverview, Reports...) đọc cột này;
  // ô chọn tay trong mục G đã bỏ (07/2026) nên đây là nguồn duy nhất. Best-effort.
  const syncClassification = async (group: string) => {
    try {
      const { data: existing } = await supabase
        .from('admin_evaluations')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('cycle_id', cycleId)
        .limit(1);
      if (existing?.[0]) {
        await supabase.from('admin_evaluations').update({ classification: group as any }).eq('id', existing[0].id);
      } else {
        await supabase.from('admin_evaluations').insert({ employee_id: employeeId, cycle_id: cycleId, classification: group as any });
      }
    } catch { /* đồng bộ là phụ trợ — không chặn luồng duyệt */ }
  };

  // --- Save proposal (manager) or update content before approval (pgd) ---
  // reason_text/direction_text: ô nhập đã bỏ (07/2026) — giữ nguyên giá trị cũ trong DB,
  // payload không đụng tới 2 cột này.
  const handleSaveProposal = async () => {
    if (!canEvaluate && !canApprove) return;
    if (!starGroup) return;
    setSaving(true);
    const basePayload: any = {
      cycle_id: cycleId,
      employee_id: employeeId,
      form_id: formId || null,
      star_group: starGroup,
    };
    if (!record) {
      // first insert (manager proposing)
      basePayload.evaluator_id = myProfileId;
      basePayload.evaluator_level = evaluatorLevel;
      basePayload.approver_id = approverDefaultId || null;
      basePayload.approval_status = 'pending';
    } else if (canEvaluate && rejected) {
      // manager re-proposing after rejection
      basePayload.evaluator_id = myProfileId;
      basePayload.approval_status = 'pending';
      basePayload.approved_at = null;
    }
    const { data, error } = record
      ? await supabase.from('staff_star_classifications').update(basePayload).eq('id', record.id).select('*').maybeSingle()
      : await supabase.from('staff_star_classifications').insert(basePayload).select('*').maybeSingle();
    setSaving(false);
    if (error) {
      toast({ title: 'Lỗi lưu phân nhóm sao', description: error.message, variant: 'destructive' });
      return;
    }
    setRecord(data);
    toast({ title: canEvaluate ? 'Đã lưu đề xuất' : 'Đã cập nhật nội dung' });
  };

  // Người duyệt duy nhất: lưu + phê duyệt trong MỘT bước (không đi qua trạng thái pending)
  const handleFinalizeDirect = async () => {
    if (!soleApprover || !starGroup) return;
    setSaving(true);
    const payload: any = {
      cycle_id: cycleId,
      employee_id: employeeId,
      form_id: formId || null,
      star_group: starGroup,
      evaluator_id: myProfileId,
      evaluator_level: evaluatorLevel,
      approver_id: myProfileId,
      approval_status: 'approved',
      approved_at: new Date().toISOString(),
    };
    const { data, error } = record
      ? await supabase.from('staff_star_classifications').update(payload).eq('id', record.id).select('*').maybeSingle()
      : await supabase.from('staff_star_classifications').insert(payload).select('*').maybeSingle();
    setSaving(false);
    if (error) {
      toast({ title: 'Lỗi chốt phân nhóm sao', description: error.message, variant: 'destructive' });
      return;
    }
    setRecord(data);
    await syncClassification(starGroup);
    toast({ title: 'Đã chốt phân nhóm sao' });
  };

  const handleApprove = async () => {
    if (!canApprove || !record || !record.star_group) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('staff_star_classifications')
      .update({ approval_status: 'approved', approver_id: myProfileId, approved_at: new Date().toISOString() })
      .eq('id', record.id)
      .select('*')
      .maybeSingle();
    setSaving(false);
    if (error) { toast({ title: 'Lỗi duyệt', description: error.message, variant: 'destructive' }); return; }
    setRecord(data);
    if (data?.star_group) await syncClassification(data.star_group);
    toast({ title: 'Đã phê duyệt phân nhóm sao' });
  };

  const handleReject = async () => {
    if (!canApprove || !record) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('staff_star_classifications')
      .update({ approval_status: 'rejected', approved_at: null })
      .eq('id', record.id)
      .select('*')
      .maybeSingle();
    setSaving(false);
    if (error) { toast({ title: 'Lỗi trả lại', description: error.message, variant: 'destructive' }); return; }
    setRecord(data);
    toast({ title: 'Đã trả lại để TP đề xuất lại' });
  };

  const handleOverride = async () => {
    if (!isDirectorOverseer || !record || !approved) return;
    if (!starGroup || !overrideReason.trim()) {
      toast({ title: 'Thiếu thông tin', description: 'Nhập nhóm sao mới và lý do điều chỉnh.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from('staff_star_classifications')
      .update({
        star_group: starGroup as any,
        override_by: myProfileId,
        override_reason: overrideReason.trim(),
      })
      .eq('id', record.id)
      .select('*')
      .maybeSingle();
    setSaving(false);
    if (error) { toast({ title: 'Lỗi điều chỉnh', description: error.message, variant: 'destructive' }); return; }
    setRecord(data);
    setOverrideMode(false);
    setOverrideReason('');
    await syncClassification(starGroup);
    toast({ title: 'Đã điều chỉnh nhóm sao' });
  };

  const handleToggleVisible = async (next: boolean) => {
    if (!record || !approved) {
      toast({ title: 'Cần duyệt trước', description: 'Phải duyệt nhóm sao trước khi cho cán bộ xem.', variant: 'destructive' });
      return;
    }
    setVisible(next);
    const { data, error } = await supabase
      .from('staff_star_classifications')
      .update({ visible_to_employee: next })
      .eq('id', record.id)
      .select('*')
      .maybeSingle();
    if (error) {
      toast({ title: 'Lỗi cập nhật', description: error.message, variant: 'destructive' });
      setVisible(!next);
      return;
    }
    setRecord(data);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Đang tải phân nhóm sao…
        </CardContent>
      </Card>
    );
  }

  // Timeline
  const renderTimeline = () => {
    const items: { icon: any; text: string; tone?: string }[] = [];
    if (!record) {
      items.push({ icon: Clock, text: soleApprover ? 'Chưa chốt phân nhóm' : 'Chưa đề xuất', tone: 'text-muted-foreground' });
    } else {
      items.push({ icon: CheckCircle2, text: soleApprover ? 'Đã chọn nhóm' : 'TP đã đề xuất', tone: 'text-foreground' });
      if (pending) items.push({ icon: Clock, text: soleApprover ? 'Chưa chốt — bấm "Chốt phân nhóm" bên dưới' : 'Chờ cấp trên phê duyệt', tone: 'text-amber-600 dark:text-amber-400' });
      if (rejected) items.push({ icon: XCircle, text: 'Bị trả lại · TP cần đề xuất lại', tone: 'text-destructive' });
      if (approved) {
        const dt = record.approved_at ? new Date(record.approved_at).toLocaleDateString('vi-VN') : '';
        items.push({ icon: CheckCircle2, text: `Đã duyệt${dt ? ' · ' + dt : ''}`, tone: 'text-emerald-600 dark:text-emerald-400' });
      }
      if (record.override_by) {
        items.push({ icon: AlertTriangle, text: `GĐ điều chỉnh: ${record.override_reason || '—'}`, tone: 'text-amber-700 dark:text-amber-300' });
      }
      if (approved) {
        items.push({
          icon: record.visible_to_employee ? CheckCircle2 : Clock,
          text: record.visible_to_employee ? 'Đã hiện cho cán bộ' : 'Chưa hiện cho cán bộ',
          tone: record.visible_to_employee ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
        });
      }
    }
    return (
      <div className="space-y-1 text-xs">
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <div key={i} className={`flex items-center gap-1.5 ${it.tone || ''}`}>
              <Icon className="w-3.5 h-3.5" />
              <span>{it.text}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const currentStarLabel = record?.star_group ? STAR_LABELS[record.star_group] : null;

  // --- Manager view ---
  const managerCanEdit = !soleApprover && canEvaluate && (!record || rejected);
  const pgdCanEditContent = !soleApprover && canApprove && record && (pending || rejected);
  // Người duyệt duy nhất: một khối, một nút — chốt thẳng, và được chốt lại nếu đổi ý
  const soleCanFinalize = !!soleApprover;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Star className="w-4 h-4" /> Phân nhóm cán bộ theo ma trận hiệu quả – kỹ năng/thái độ
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderTimeline()}

        {currentStarLabel && (
          <div className="text-sm">
            Nhóm hiện tại: <strong>{currentStarLabel}</strong>
          </div>
        )}

        {/* Nội dung 2 ô nhận xét CŨ (đã bỏ ô nhập 07/2026) — chỉ đọc, mọi trạng thái */}
        {(canEvaluate || canApprove) && record && (record.reason_text || record.direction_text) && (
          <div className="text-xs text-muted-foreground border-l-2 border-emerald-500 pl-2 space-y-1">
            {record.reason_text && <div><span className="font-medium">Lý do (mẫu cũ):</span> {record.reason_text}</div>}
            {record.direction_text && <div><span className="font-medium">Định hướng (mẫu cũ):</span> {record.direction_text}</div>}
          </div>
        )}

        {/* Người duyệt duy nhất — chọn nhóm và chốt trong một bước */}
        {soleCanFinalize && (
          <>
            <FormFields starGroup={starGroup} setStarGroup={setStarGroup} />
            <Button onClick={handleFinalizeDirect} disabled={saving || !starGroup} size="sm">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              {approved ? 'Chốt lại phân nhóm' : 'Chốt phân nhóm'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Bạn là người đánh giá duy nhất — chọn nhóm và chốt luôn, không cần bước đề xuất/duyệt riêng.
            </p>
          </>
        )}

        {/* Manager — propose / re-propose */}
        {managerCanEdit && (
          <>
            <FormFields starGroup={starGroup} setStarGroup={setStarGroup} />
            <Button onClick={handleSaveProposal} disabled={saving || !starGroup} size="sm">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {rejected ? 'Đề xuất lại' : 'Lưu đề xuất'}
            </Button>
          </>
        )}

        {/* PGĐ — review/edit content + approve/reject */}
        {pgdCanEditContent && (
          <>
            <FormFields starGroup={starGroup} setStarGroup={setStarGroup} />
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSaveProposal} disabled={saving || !starGroup} size="sm" variant="outline">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Lưu nội dung
              </Button>
              <Button onClick={handleApprove} disabled={saving || !record.star_group} size="sm">
                <CheckCircle2 className="w-4 h-4 mr-1" /> Phê duyệt
              </Button>
              {pending && (
                <Button onClick={handleReject} disabled={saving} size="sm" variant="destructive">
                  <XCircle className="w-4 h-4 mr-1" /> Trả lại
                </Button>
              )}
            </div>
          </>
        )}

        {/* Director overseer — ẩn khi là người duyệt duy nhất (đã có nút "Chốt lại phân nhóm") */}
        {!soleApprover && isDirectorOverseer && record && approved && !overrideMode && (
          <Button variant="outline" size="sm" onClick={() => { setOverrideMode(true); setStarGroup(record.star_group || ''); }}>
            <Pencil className="w-4 h-4 mr-1" /> Điều chỉnh nhóm sao
          </Button>
        )}

        {!soleApprover && isDirectorOverseer && record && approved && overrideMode && (
          <div className="space-y-3 border-l-2 border-amber-500 pl-3">
            <div className="space-y-1">
              <Label className="text-xs">Nhóm sao mới</Label>
              <Select value={starGroup} onValueChange={setStarGroup}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Chọn nhóm sao…" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STAR_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Lý do điều chỉnh</Label>
              <Textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)} rows={2} className="text-sm" placeholder="Lý do GĐ điều chỉnh…" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleOverride} disabled={saving || !starGroup || !overrideReason.trim()} size="sm">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Lưu điều chỉnh
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setOverrideMode(false); setOverrideReason(''); setStarGroup(record.star_group || ''); }}>Huỷ</Button>
            </div>
          </div>
        )}

        {/* Visibility toggle — anyone with access can flip once approved */}
        {approved && record && (
          <div className="flex items-center justify-between border-t pt-3">
            <Label htmlFor="star-visible" className="text-sm">Hiển thị kết quả phân nhóm sao cho cán bộ</Label>
            <Switch id="star-visible" checked={visible} onCheckedChange={handleToggleVisible} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Chỉ còn chọn nhóm — 2 ô "Lý do phân nhóm"/"Định hướng quản trị" đã bỏ (07/2026);
// nội dung định hướng nhập ở khối "Định hướng phát triển kỳ tới" dùng chung của phiếu.
function FormFields({ starGroup, setStarGroup }: {
  starGroup: string; setStarGroup: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">Nhóm sao</Label>
      <Select value={starGroup} onValueChange={setStarGroup}>
        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Chọn nhóm sao…" /></SelectTrigger>
        <SelectContent>
          {Object.entries(STAR_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
