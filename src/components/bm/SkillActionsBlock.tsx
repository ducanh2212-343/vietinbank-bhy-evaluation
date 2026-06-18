import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';
import type { SkillPriority } from './SkillPriorityPicker';
import { SkillLevelBadge } from '@/components/SkillLevelBadge';
import { useSkillLevelImages } from '@/hooks/useSkillLevelImages';

export interface SkillAction {
  id?: string;
  skill_priority_id: string;
  row_no: number;
  action_type: string;
  action_text: string;
  expected_result: string;
  deadline: string;
  requested_support: string;
  evidence_expected: string;
  status: string;
  actual_result: string;
  manager_review: string;
}

interface Props {
  priorities: SkillPriority[];
  actions: SkillAction[];
  onChange: (a: SkillAction[]) => void;
  readOnly?: boolean;
}

const ACTION_TYPES = [
  { value: '70', label: '70% Học qua công việc' },
  { value: '20', label: '20% Kèm cặp/trao đổi' },
  { value: '10', label: '10% Đào tạo/Tài liệu' },
];

const fmtDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const endOfMonth = () => {
  const n = new Date();
  return fmtDate(new Date(n.getFullYear(), n.getMonth() + 1, 0));
};

const endOfQuarter = () => {
  const n = new Date();
  const q = Math.floor(n.getMonth() / 3);
  return fmtDate(new Date(n.getFullYear(), q * 3 + 3, 0));
};

export function SkillActionsBlock({ priorities, actions, onChange, readOnly }: Props) {
  const { getImageUrl } = useSkillLevelImages();

  const addAction = (priorityId: string) => {
    // Reuse dòng còn rỗng cùng priority nếu có, để tránh tạo card Kanban trùng/placeholder mồ côi.
    const emptyIdx = actions.findIndex(
      a => a.skill_priority_id === priorityId && !(a.action_text || '').trim()
    );
    if (emptyIdx !== -1) return; // đã có dòng rỗng để nhập, không thêm dòng mới
    const existing = actions.filter(a => a.skill_priority_id === priorityId);
    const newAction: SkillAction = {
      skill_priority_id: priorityId,
      row_no: existing.length + 1,
      action_type: '70',
      action_text: '',
      expected_result: '',
      deadline: '',
      requested_support: '',
      evidence_expected: '',
      status: 'planned',
      actual_result: '',
      manager_review: '',
    };
    onChange([...actions, newAction]);
  };

  const removeAction = (idx: number) => {
    onChange(actions.filter((_, i) => i !== idx));
  };

  const updateAction = (idx: number, field: keyof SkillAction, value: string) => {
    const updated = [...actions];
    (updated[idx] as any)[field] = value;
    // Mirror gộp: expected_result <-> evidence_expected để giữ tương thích DB/export
    if (field === 'expected_result') {
      (updated[idx] as any).evidence_expected = value;
    }
    onChange(updated);
  };

  return (
    <Card>
      <CardHeader className="pb-3 px-3 sm:px-6">
        <CardTitle className="text-sm sm:text-base">II.2. Hành động cụ thể để upskill</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-3 sm:px-6">
        <p className="text-xs text-muted-foreground italic">
          Hành động phải trả lời rõ: làm gì để nâng skill này từ level hiện tại lên level mục tiêu trong quý?
        </p>

        {priorities.map(p => {
          const pActions = actions.filter(a => a.skill_priority_id === (p.id || p.skill_id));
          return (
            <div key={p.skill_id} className="border rounded-lg p-3 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge>{p.priority_order}</Badge>
                  {p.skill_code && <span className="font-mono text-[10px] text-muted-foreground">{p.skill_code}</span>}
                  <span className="font-medium text-sm break-words">{p.skill_name}</span>
                </div>
                <div className="flex items-center gap-2 ml-0 sm:ml-auto">
                  <SkillLevelBadge level={p.current_level} imageUrl={getImageUrl(p.skill_id, p.current_level)} />
                  <span className="text-xs text-muted-foreground">→</span>
                  <SkillLevelBadge level={p.target_level} imageUrl={getImageUrl(p.skill_id, p.target_level)} />
                </div>
              </div>

              {pActions.map((action, aIdx) => {
                const globalIdx = actions.indexOf(action);
                // Hiển thị gộp: ưu tiên expected_result, fallback evidence_expected
                const resultValue = action.expected_result || action.evidence_expected || '';
                return (
                  <div key={aIdx} className="bg-muted/30 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium">Hành động #{action.row_no}</span>
                      <div className="flex items-center gap-2">
                        <Select value={action.status} onValueChange={v => updateAction(globalIdx, 'status', v)} disabled={readOnly}>
                          <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planned">Kế hoạch</SelectItem>
                            <SelectItem value="in_progress">Đang làm</SelectItem>
                            <SelectItem value="completed">Hoàn thành</SelectItem>
                          </SelectContent>
                        </Select>
                        {!readOnly && (
                          <Button variant="ghost" size="sm" onClick={() => removeAction(globalIdx)}><X className="w-3 h-3" /></Button>
                        )}
                      </div>
                    </div>

                    {/* Dòng 1: Hình thức học | Thời hạn */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground">Hình thức học</label>
                        <Select value={action.action_type} onValueChange={v => updateAction(globalIdx, 'action_type', v)} disabled={readOnly}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ACTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Thời hạn <span className="text-destructive">*</span></label>
                        <div className="space-y-1">
                          {!readOnly && (
                            <div className="flex gap-1">
                              <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-[10px]" onClick={() => updateAction(globalIdx, 'deadline', endOfMonth())}>Cuối tháng này</Button>
                              <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-[10px]" onClick={() => updateAction(globalIdx, 'deadline', endOfQuarter())}>Cuối quý</Button>
                            </div>
                          )}
                          <Input type="date" value={action.deadline} onChange={e => updateAction(globalIdx, 'deadline', e.target.value)} className="h-8 text-xs" disabled={readOnly} />
                        </div>
                      </div>
                    </div>

                    {/* Dòng 2: Việc sẽ làm */}
                    <div>
                      <label className="text-[10px] text-muted-foreground">Việc sẽ làm <span className="text-destructive">*</span></label>
                      <Textarea
                        value={action.action_text}
                        onChange={e => updateAction(globalIdx, 'action_text', e.target.value)}
                        placeholder="Ví dụ: Đăng ký và hoàn thành khóa học… / Áp dụng checklist vào tối thiểu 2 hồ sơ thực tế… / Trao đổi với quản lý mỗi tháng 1 lần để được góp ý…"
                        className="min-h-[44px] text-xs"
                        disabled={readOnly}
                      />
                    </div>

                    {/* Dòng 3: Kết quả/Minh chứng | Hỗ trợ cần */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground">Kết quả/Minh chứng hoàn thành <span className="text-destructive">*</span></label>
                        <Textarea
                          value={resultValue}
                          onChange={e => updateAction(globalIdx, 'expected_result', e.target.value)}
                          placeholder="Ví dụ: Chứng nhận hoàn thành khóa học; 2 checklist hồ sơ đã áp dụng; 1 bản tóm tắt bài học; phản hồi/xác nhận của quản lý…"
                          className="min-h-[44px] text-xs"
                          disabled={readOnly}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Hỗ trợ cần</label>
                        <Textarea
                          value={action.requested_support}
                          onChange={e => updateAction(globalIdx, 'requested_support', e.target.value)}
                          placeholder="Ví dụ: Quản lý góp ý trên 1 hồ sơ thực tế; hỗ trợ đăng ký khóa học; hướng dẫn cách áp dụng checklist…"
                          className="min-h-[44px] text-xs"
                          disabled={readOnly}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {!readOnly && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => addAction(p.id || p.skill_id)}>
                  <Plus className="w-3 h-3 mr-1" />Thêm hành động
                </Button>
              )}
            </div>
          );
        })}

        {priorities.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Chưa chọn skill ưu tiên nào.</p>
        )}
      </CardContent>
    </Card>
  );
}
