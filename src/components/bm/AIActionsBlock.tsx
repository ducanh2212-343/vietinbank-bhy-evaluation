import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { SkillPriority } from './SkillPriorityPicker';
import type { AttitudePriority } from './AttitudePriorityPicker';

export interface AIAction {
  id?: string;
  linked_skill_priority_id: string;
  linked_attitude_priority_id: string;
  row_no: number;
  ai_action_text: string;
  expected_result: string;
  deadline: string;
  requested_support: string;
  evidence_expected: string;
  status: string;
  actual_result: string;
  manager_review: string;
  unlinked_reason: string;
}

interface Props {
  aiActions: AIAction[];
  onChange: (a: AIAction[]) => void;
  skillPriorities: SkillPriority[];
  attitudePriorities: AttitudePriority[];
  readOnly?: boolean;
  quarterLabel: string;
}

export function AIActionsBlock({ aiActions, onChange, skillPriorities, attitudePriorities, readOnly, quarterLabel }: Props) {
  const addAction = () => {
    onChange([...aiActions, {
      linked_skill_priority_id: '',
      linked_attitude_priority_id: '',
      row_no: aiActions.length + 1,
      ai_action_text: '',
      expected_result: '',
      deadline: '',
      requested_support: '',
      evidence_expected: '',
      status: 'planned',
      actual_result: '',
      manager_review: '',
      unlinked_reason: '',
    }]);
  };

  const removeAction = (idx: number) => onChange(aiActions.filter((_, i) => i !== idx).map((a, i) => ({ ...a, row_no: i + 1 })));
  const update = (idx: number, field: keyof AIAction, value: string) => {
    const updated = [...aiActions];
    (updated[idx] as any)[field] = value;
    onChange(updated);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">II.5. Hành động AI áp dụng trong công việc {quarterLabel}</CardTitle>
        <p className="text-xs text-muted-foreground">Tối thiểu 2 hành động AI mỗi quý. Nên gắn với skill hoặc thái độ đã chọn.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {aiActions.map((a, idx) => (
          <div key={idx} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Hành động AI #{a.row_no}</span>
              {!readOnly && <Button variant="ghost" size="sm" onClick={() => removeAction(idx)}><Trash2 className="w-3 h-3" /></Button>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Gắn với skill</label>
                <Select value={a.linked_skill_priority_id || '__none__'} onValueChange={v => update(idx, 'linked_skill_priority_id', v === '__none__' ? '' : v)} disabled={readOnly}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Không gắn" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Không gắn</SelectItem>
                    {skillPriorities.map(sp => (
                      <SelectItem key={sp.skill_id} value={sp.id || sp.skill_id}>
                        {sp.skill_code ? `${sp.skill_code} · ` : ''}{sp.skill_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Gắn với thái độ</label>
                <Select value={a.linked_attitude_priority_id || '__none__'} onValueChange={v => update(idx, 'linked_attitude_priority_id', v === '__none__' ? '' : v)} disabled={readOnly}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Không gắn" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Không gắn</SelectItem>
                    {attitudePriorities.map(ap => (
                      <SelectItem key={ap.attitude_dimension_id} value={ap.id || ap.attitude_dimension_id.toString()}>{ap.attitude_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Textarea value={a.ai_action_text} onChange={e => update(idx, 'ai_action_text', e.target.value)} placeholder="Mô tả hành động AI cụ thể" className="min-h-[36px] text-xs" disabled={readOnly} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Kết quả mục tiêu</label>
                <Textarea value={a.expected_result} onChange={e => update(idx, 'expected_result', e.target.value)} className="min-h-[36px] text-xs" disabled={readOnly} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Thời hạn</label>
                <Input type="date" value={a.deadline} onChange={e => update(idx, 'deadline', e.target.value)} className="h-8 text-xs" disabled={readOnly} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Trạng thái</label>
                <Select value={a.status} onValueChange={v => update(idx, 'status', v)} disabled={readOnly}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Chưa bắt đầu</SelectItem>
                    <SelectItem value="in_progress">Đang thực hiện</SelectItem>
                    <SelectItem value="completed">Hoàn thành</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!a.linked_skill_priority_id && !a.linked_attitude_priority_id && (
              <div>
                <label className="text-xs text-muted-foreground">Lý do không gắn với skill/thái độ</label>
                <Textarea value={a.unlinked_reason} onChange={e => update(idx, 'unlinked_reason', e.target.value)} className="min-h-[36px] text-xs" placeholder="Giải thích ngắn..." disabled={readOnly} />
              </div>
            )}
          </div>
        ))}

        {!readOnly && (
          <Button variant="outline" onClick={addAction} className="w-full">
            <Plus className="w-4 h-4 mr-2" />Thêm hành động AI
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
