import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ATTITUDE_DIMENSIONS } from './AttitudeConstants';

export interface AttitudePriority {
  id?: string;
  attitude_dimension_id: number;
  attitude_name: string;
  current_status: string;
  desired_status: string;
  issue_summary: string;
  improvement_goal: string;
  priority_order: number;
  status: string;
}

interface Props {
  priorities: AttitudePriority[];
  onChange: (p: AttitudePriority[]) => void;
  readOnly?: boolean;
}

export function AttitudePriorityPicker({ priorities, onChange, readOnly }: Props) {
  const selectedIds = new Set(priorities.map(p => p.attitude_dimension_id));

  const toggle = (dim: typeof ATTITUDE_DIMENSIONS[number]) => {
    if (selectedIds.has(dim.id)) {
      const updated = priorities.filter(p => p.attitude_dimension_id !== dim.id)
        .map((p, i) => ({ ...p, priority_order: i + 1 }));
      onChange(updated);
    } else {
      if (priorities.length >= 6) return;
      onChange([...priorities, {
        attitude_dimension_id: dim.id,
        attitude_name: dim.name,
        current_status: '',
        desired_status: '',
        issue_summary: '',
        improvement_goal: '',
        priority_order: priorities.length + 1,
        status: 'planned',
      }]);
    }
  };

  const updateField = (dimId: number, field: keyof AttitudePriority, value: any) => {
    onChange(priorities.map(p => p.attitude_dimension_id === dimId ? { ...p, [field]: value } : p));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">II.3. Chọn nhóm thái độ cần cải thiện trong quý</CardTitle>
          <Badge variant="outline">{priorities.length}/6</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {ATTITUDE_DIMENSIONS.map(dim => {
            const checked = selectedIds.has(dim.id);
            return (
              <label key={dim.id} className={`flex items-start gap-2 p-2 border rounded cursor-pointer transition-colors ${checked ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'}`}>
                <Checkbox checked={checked} onCheckedChange={() => !readOnly && toggle(dim)} disabled={readOnly} className="mt-0.5" />
                <span className="text-sm">{dim.id}. {dim.name}</span>
              </label>
            );
          })}
        </div>

        {priorities.map(p => (
          <div key={p.attitude_dimension_id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Badge>{p.priority_order}</Badge>
              <span className="font-medium text-sm">{p.attitude_name}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Biểu hiện chưa đạt</label>
                <Textarea value={p.issue_summary} onChange={e => updateField(p.attitude_dimension_id, 'issue_summary', e.target.value)} className="min-h-[36px] text-xs" disabled={readOnly} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Trạng thái mong đợi</label>
                <Textarea value={p.desired_status} onChange={e => updateField(p.attitude_dimension_id, 'desired_status', e.target.value)} className="min-h-[36px] text-xs" disabled={readOnly} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Mục tiêu cải thiện trong quý</label>
              <Textarea value={p.improvement_goal} onChange={e => updateField(p.attitude_dimension_id, 'improvement_goal', e.target.value)} className="min-h-[36px] text-xs" disabled={readOnly} />
            </div>
            <Select value={p.status} onValueChange={v => updateField(p.attitude_dimension_id, 'status', v)} disabled={readOnly}>
              <SelectTrigger className="h-8 text-xs w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Chưa bắt đầu</SelectItem>
                <SelectItem value="in_progress">Đang thực hiện</SelectItem>
                <SelectItem value="completed">Hoàn thành</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
