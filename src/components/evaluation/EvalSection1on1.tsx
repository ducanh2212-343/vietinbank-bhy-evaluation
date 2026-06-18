import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MessagesSquare, Sparkles } from 'lucide-react';

export interface OneOnOneAnswer { employee: string; manager: string; }
export type OneOnOneAnswers = Record<string, OneOnOneAnswer>;

export const ONE_ON_ONE_QUESTIONS: { key: string; text: string }[] = [
  { key: 'q1', text: 'Đâu là công việc bạn đã làm tốt nhất từ đầu năm đến nay?' },
  { key: 'q2', text: 'Đâu là công việc bạn nghĩ mình có thể làm tốt hơn những gì đã thực hiện từ đầu năm đến nay? Lý do?' },
  { key: 'q3', text: 'Đâu là công việc/năng lực bạn nghĩ trong 5 tháng vừa qua mình đã có sự tiến bộ so với các năm trước? Tại sao bạn đánh giá như vậy?' },
  { key: 'q4', text: 'Bạn đã làm gì để hỗ trợ cho đồng nghiệp hoặc cho cả nhóm đạt được kết quả công việc tốt hơn?' },
  { key: 'q5', text: 'Đâu là năng lực (kiến thức, kỹ năng, khả năng, tố chất) mà bạn cho rằng đó là thế mạnh của mình? Bạn mong muốn được phát huy thế mạnh nào hơn nữa trong công việc hiện tại? Bạn cần sự hỗ trợ gì của lãnh đạo để phát huy được năng lực đó?' },
  { key: 'q6', text: 'Đâu là những năng lực mà bạn cho rằng mình cần cải thiện để làm tốt hơn vị trí công việc hiện tại và/hoặc đạt được vị trí công việc mà bạn mơ ước? Bạn cần sự hỗ trợ gì của lãnh đạo để cải thiện được năng lực đó?' },
  { key: 'q7', text: 'Bạn có đề xuất gì để phòng/nhóm của bạn làm việc hiệu quả hơn?' },
  { key: 'q8', text: 'Mục tiêu công việc của bạn trong 3-5 năm tới là gì? Bạn cần lãnh đạo hỗ trợ gì để đạt được mục tiêu đó?' },
];

interface Props {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  answers: OneOnOneAnswers;
  onAnswersChange: (v: OneOnOneAnswers) => void;
  isManager?: boolean;
}

export function EvalSection1on1({ enabled, onEnabledChange, answers, onAnswersChange, isManager = false }: Props) {
  const update = (key: string, field: 'employee' | 'manager', value: string) => {
    onAnswersChange({
      ...answers,
      [key]: { ...(answers[key] || { employee: '', manager: '' }), [field]: value },
    });
  };

  const hasEmployeeAnswers = Object.values(answers || {}).some(
    (a) => (a?.employee || '').trim().length > 0,
  );
  // Khi CB đã nhập, ép hiển thị nội dung; với manager, khoá toggle để tránh vô tình tắt → save ghi đè rỗng.
  const effectiveEnabled = enabled || hasEmployeeAnswers;
  const toggleLocked = isManager && hasEmployeeAnswers;

  const handleToggle = (v: boolean) => {
    if (toggleLocked) return;
    onEnabledChange(v);
  };

  return (
    <Card
      id="one-on-one"
      className="border-2 border-primary/40 bg-gradient-to-br from-primary/5 via-background to-accent/5 shadow-md scroll-mt-24"
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/15 text-primary shrink-0">
              <MessagesSquare className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-semibold">Câu hỏi trao đổi 1-1</span>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">Tùy chọn</Badge>
              </div>
              <p className="text-xs font-normal text-muted-foreground">
                Bước gợi mở — nên trả lời trước khi đánh giá skill để CBQL hiểu rõ bối cảnh.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 rounded-md border bg-background/70 px-3 py-2">
            <Label
              htmlFor="oneOnOneToggle"
              className={`text-xs font-medium ${effectiveEnabled ? 'text-primary' : 'text-muted-foreground'}`}
            >
              {effectiveEnabled ? 'Đang trả lời' : 'Bật trả lời'}
            </Label>
            <Switch
              id="oneOnOneToggle"
              checked={effectiveEnabled}
              onCheckedChange={handleToggle}
              disabled={toggleLocked}
            />
          </div>
        </CardTitle>
      </CardHeader>
      {!effectiveEnabled && !isManager && (
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 text-xs text-primary/80 bg-primary/5 border border-dashed border-primary/30 rounded-md px-3 py-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Bật công tắc để mở 8 câu hỏi gợi mở giúp CBQL hiểu bối cảnh trước khi đánh giá skill.</span>
          </div>
        </CardContent>
      )}
      {isManager && !hasEmployeeAnswers && (
        <CardContent className="pt-0">
          <div className="text-xs text-muted-foreground bg-muted/40 border border-dashed rounded-md px-3 py-2">
            Cán bộ chưa nhập nội dung trao đổi 1-1.
          </div>
        </CardContent>
      )}
      {effectiveEnabled && !(isManager && !hasEmployeeAnswers) && (
        <CardContent className="space-y-4">
          {ONE_ON_ONE_QUESTIONS.map((q, idx) => {
            const a = answers[q.key] || { employee: '', manager: '' };
            return (
              <div key={q.key} className="border rounded-md p-3 space-y-2 bg-background">
                <p className="text-sm font-medium">
                  <span className="text-primary mr-1">{idx + 1}.</span>
                  {q.text}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Đánh giá của cán bộ</Label>
                    <Textarea
                      value={a.employee}
                      onChange={(e) => update(q.key, 'employee', e.target.value)}
                      placeholder="Cán bộ nhập tại đây..."
                      rows={3}
                      disabled={isManager}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Ý kiến của CBQL/lãnh đạo</Label>
                    <Textarea
                      value={a.manager}
                      onChange={(e) => update(q.key, 'manager', e.target.value)}
                      placeholder="CBQL nhập tại đây..."
                      rows={3}
                      disabled={!isManager}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
