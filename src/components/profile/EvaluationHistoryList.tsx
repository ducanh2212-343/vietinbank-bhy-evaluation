import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { History } from 'lucide-react';
import { ApprovedFormDetail } from './ApprovedFormDetail';
import { StatusBadge } from './StatusBadge';
import { getFormStatusMeta, type ApprovedFormMeta } from '@/lib/approvedForm';

interface Props {
  forms: ApprovedFormMeta[];
  employeeId: string;
  viewerIsEmployee: boolean;
  positionId?: string | null;
}

export function EvaluationHistoryList({ forms, employeeId, viewerIsEmployee, positionId }: Props) {
  const [opened, setOpened] = useState<string[]>(forms[0] ? [forms[0].id] : []);

  if (forms.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><History className="w-4 h-4" /> Lịch sử đánh giá</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Chưa có kỳ đánh giá nào.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><History className="w-4 h-4" /> Lịch sử đánh giá ({forms.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" value={opened} onValueChange={setOpened} className="w-full">
          {forms.map(f => {
            const meta = getFormStatusMeta(f.status);
            return (
              <AccordionItem key={f.id} value={f.id}>
                <AccordionTrigger className="text-sm hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-2 gap-3 flex-wrap">
                    <span className="font-medium text-left">{f.cycle_name || 'Kỳ đánh giá'}</span>
                    <div className="flex items-center gap-2">
                      {f.reviewed_at && (
                        <span className="text-[11px] text-muted-foreground">Duyệt: {new Date(f.reviewed_at).toLocaleDateString('vi-VN')}</span>
                      )}
                      <StatusBadge status={f.status} />
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <div className="text-[11px] text-muted-foreground mb-2 flex flex-wrap gap-x-4 gap-y-1">
                    {f.submitted_at && <span>Cán bộ gửi: {new Date(f.submitted_at).toLocaleDateString('vi-VN')}</span>}
                    {f.reviewer_name && <span>Người duyệt: <strong>{f.reviewer_name}</strong></span>}
                  </div>
                  {!meta.isApproved && (
                    <div className="text-[11px] text-muted-foreground italic mb-3 px-2 py-1 bg-muted/40 rounded">
                      Lưu ý: {meta.note}
                    </div>
                  )}
                  {opened.includes(f.id) && (
                    <ApprovedFormDetail
                      form={f}
                      employeeId={employeeId}
                      viewerIsEmployee={viewerIsEmployee}
                      positionId={positionId}
                    />
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
