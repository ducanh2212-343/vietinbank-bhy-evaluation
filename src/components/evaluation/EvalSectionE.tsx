import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardList } from 'lucide-react';
import type { AttitudeAssessment } from './EvalSectionC';
import { ATTITUDE_FOCUS_OPTIONS, getFocusLabel } from './attitudeFocusOptions';

interface Props {
  assessments: AttitudeAssessment[];
  onChange: (next: AttitudeAssessment[]) => void;
  readOnly?: boolean;
}

function hasPlan(a: AttitudeAssessment): boolean {
  return !!(
    a.self_status === 'can_cai_thien' ||
    a.manager_status === 'can_cai_thien' ||
    a.improvement_required
  );
}

function statusLabel(s?: string): string {
  switch (s) {
    case 'in_progress': return 'Đang thực hiện';
    case 'completed': return 'Đã hoàn thành';
    default: return 'Chưa bắt đầu';
  }
}

function statusBadgeCls(s?: string): string {
  switch (s) {
    case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30';
    case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}

function formatFocus(a: AttitudeAssessment): string {
  const codes = a.improvement_focus || [];
  const labels = codes
    .filter(c => c !== 'other')
    .map(c => getFocusLabel(a.attitude_dimension_id, c));
  if (codes.includes('other') && a.improvement_focus_other) labels.push(a.improvement_focus_other);
  return labels.join('; ');
}

export function EvalSectionE({ assessments, onChange, readOnly }: Props) {
  const planned = assessments.filter(hasPlan);

  const update = (dimId: number, field: keyof AttitudeAssessment, value: any) => {
    onChange(assessments.map(a => a.attitude_dimension_id === dimId ? { ...a, [field]: value } : a));
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ClipboardList className="w-4 h-4" /> E. Tổng hợp kế hoạch cải thiện thái độ
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Nội dung dưới đây được tự động tổng hợp từ các nhóm thái độ được đánh giá là <b>Cần cải thiện</b> hoặc được đưa vào kế hoạch cải thiện trong quý. Chỉ chỉnh nhanh Trạng thái và Ghi chú tiến độ tại đây.
        </p>
      </CardHeader>
      <CardContent>
        {planned.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-6 border border-dashed rounded-md">
            Chưa có nhóm thái độ nào cần cải thiện trong quý.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-44">Nhóm thái độ</TableHead>
                    <TableHead>Điểm cần cải thiện</TableHead>
                    <TableHead>Hành động</TableHead>
                    <TableHead className="w-28">Thời hạn</TableHead>
                    <TableHead>Bằng chứng</TableHead>
                    <TableHead>Hỗ trợ</TableHead>
                    <TableHead className="w-36">Trạng thái</TableHead>
                    <TableHead className="w-44">Ghi chú tiến độ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planned.map(a => (
                    <TableRow key={a.attitude_dimension_id}>
                      <TableCell className="font-medium text-xs align-top">
                        <Badge variant="outline" className="text-[10px] mr-1">{a.attitude_dimension_id}</Badge>
                        {a.attitude_name}
                      </TableCell>
                      <TableCell className="text-xs align-top whitespace-pre-line">{formatFocus(a) || '—'}</TableCell>
                      <TableCell className="text-xs align-top whitespace-pre-line">{a.improvement_action || '—'}</TableCell>
                      <TableCell className="text-xs align-top">{a.improvement_deadline || '—'}</TableCell>
                      <TableCell className="text-xs align-top whitespace-pre-line">{a.expected_evidence || '—'}</TableCell>
                      <TableCell className="text-xs align-top whitespace-pre-line">{a.support_needed || '—'}</TableCell>
                      <TableCell className="align-top">
                        <Select
                          value={a.improvement_status || 'not_started'}
                          onValueChange={v => update(a.attitude_dimension_id, 'improvement_status', v)}
                          disabled={readOnly}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_started">Chưa bắt đầu</SelectItem>
                            <SelectItem value="in_progress">Đang thực hiện</SelectItem>
                            <SelectItem value="completed">Đã hoàn thành</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          value={a.progress_note || ''}
                          onChange={e => update(a.attitude_dimension_id, 'progress_note', e.target.value)}
                          className="h-8 text-xs"
                          placeholder="Ghi chú nhanh"
                          disabled={readOnly}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {planned.map(a => (
                <div key={a.attitude_dimension_id} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      <Badge variant="outline" className="text-[10px] mr-1">{a.attitude_dimension_id}</Badge>
                      {a.attitude_name}
                    </div>
                    <Badge className={`text-[10px] border ${statusBadgeCls(a.improvement_status)}`}>
                      {statusLabel(a.improvement_status)}
                    </Badge>
                  </div>
                  <Field label="Điểm cần cải thiện" value={formatFocus(a)} />
                  <Field label="Hành động" value={a.improvement_action || ''} />
                  <Field label="Thời hạn" value={a.improvement_deadline || ''} />
                  <Field label="Bằng chứng" value={a.expected_evidence || ''} />
                  <Field label="Hỗ trợ cần thiết" value={a.support_needed || ''} />
                  <div>
                    <label className="text-[10px] text-muted-foreground">Trạng thái</label>
                    <Select
                      value={a.improvement_status || 'not_started'}
                      onValueChange={v => update(a.attitude_dimension_id, 'improvement_status', v)}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_started">Chưa bắt đầu</SelectItem>
                        <SelectItem value="in_progress">Đang thực hiện</SelectItem>
                        <SelectItem value="completed">Đã hoàn thành</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Ghi chú tiến độ</label>
                    <Input
                      value={a.progress_note || ''}
                      onChange={e => update(a.attitude_dimension_id, 'progress_note', e.target.value)}
                      className="h-8 text-xs"
                      disabled={readOnly}
                    />
                  </div>
                </div>
              ))}
            </div>

            <ul className="mt-3 text-[11px] text-muted-foreground space-y-0.5">
              <li>• Muốn sửa hành động, điểm cần cải thiện hoặc thời hạn? Quay lại <b>mục C</b> tại nhóm thái độ tương ứng.</li>
              <li>• Bảng tự cập nhật khi bạn đổi đánh giá ở mục C.</li>
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground">{label}</label>
      <div className="text-xs whitespace-pre-line">{value || '—'}</div>
    </div>
  );
}
