import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import type { AttitudePriority } from './AttitudePriorityPicker';

export interface AttitudeAction {
  id?: string;
  attitude_priority_id: string;
  row_no: number;
  action_text: string;
  expected_evidence: string;
  deadline: string;
  requested_support: string;
  status: string;
  actual_result: string;
  manager_review: string;
}

interface Props {
  priorities: AttitudePriority[];
  actions: AttitudeAction[];
  onChange: (a: AttitudeAction[]) => void;
  readOnly?: boolean;
}

export function AttitudeActionsBlock({ priorities, actions, onChange, readOnly }: Props) {
  const addAction = (apId: string) => {
    // Reuse dòng còn rỗng cùng priority nếu có
    const emptyIdx = actions.findIndex(
      a => a.attitude_priority_id === apId && !(a.action_text || '').trim()
    );
    if (emptyIdx !== -1) return;
    const existing = actions.filter(a => a.attitude_priority_id === apId);
    onChange([...actions, {
      attitude_priority_id: apId,
      row_no: existing.length + 1,
      action_text: '',
      expected_evidence: '',
      deadline: '',
      requested_support: '',
      status: 'planned',
      actual_result: '',
      manager_review: '',
    }]);
  };

  const removeAction = (idx: number) => onChange(actions.filter((_, i) => i !== idx));
  const updateAction = (idx: number, field: keyof AttitudeAction, value: string) => {
    const updated = [...actions];
    (updated[idx] as any)[field] = value;
    onChange(updated);
  };

  if (priorities.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">II.4. Hành động cải thiện thái độ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {priorities.map(p => {
          const pId = p.id || p.attitude_dimension_id.toString();
          const attActions = actions.map((a, i) => ({ ...a, _idx: i })).filter(a => a.attitude_priority_id === pId);

          return (
            <div key={pId} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge>{p.priority_order}</Badge>
                <span className="font-medium text-sm">{p.attitude_name}</span>
              </div>

              {attActions.map(a => (
                <div key={a._idx} className="bg-muted/30 rounded p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Hành động #{a.row_no}</span>
                    {!readOnly && <Button variant="ghost" size="sm" onClick={() => removeAction(a._idx)}><Trash2 className="w-3 h-3" /></Button>}
                  </div>
                  <Textarea value={a.action_text} onChange={e => updateAction(a._idx, 'action_text', e.target.value)} placeholder="Hành động cải thiện cụ thể" className="min-h-[36px] text-xs" disabled={readOnly} />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Bằng chứng mong đợi</label>
                      <Textarea value={a.expected_evidence} onChange={e => updateAction(a._idx, 'expected_evidence', e.target.value)} className="min-h-[36px] text-xs" disabled={readOnly} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Thời hạn</label>
                      <Input type="date" value={a.deadline} onChange={e => updateAction(a._idx, 'deadline', e.target.value)} className="h-8 text-xs" disabled={readOnly} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Hỗ trợ từ quản lý</label>
                      <Textarea value={a.requested_support} onChange={e => updateAction(a._idx, 'requested_support', e.target.value)} className="min-h-[36px] text-xs" disabled={readOnly} />
                    </div>
                  </div>
                  <Select value={a.status} onValueChange={v => updateAction(a._idx, 'status', v)} disabled={readOnly}>
                    <SelectTrigger className="h-8 text-xs w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Chưa bắt đầu</SelectItem>
                      <SelectItem value="in_progress">Đang thực hiện</SelectItem>
                      <SelectItem value="completed">Hoàn thành</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}

              {!readOnly && (
                <Button variant="outline" size="sm" onClick={() => addAction(pId)} className="w-full">
                  <Plus className="w-3 h-3 mr-1" />Thêm hành động
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
