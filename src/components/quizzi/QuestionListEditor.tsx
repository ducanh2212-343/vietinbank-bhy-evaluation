import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';

export interface DraftQuestion {
  id?: string;
  statement: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const emptyQuestion = (): DraftQuestion => ({
  statement: '', options: ['', ''], correctIndex: 0, explanation: '',
});

/** Kiểm tra danh sách câu hỏi; trả về thông báo lỗi đầu tiên hoặc null */
export function validateQuestions(questions: DraftQuestion[]): string | null {
  if (questions.length === 0) return 'Cần ít nhất 1 câu hỏi';
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.statement.trim()) return `Câu ${i + 1}: chưa nhập nội dung`;
    const filled = q.options.map((o) => o.trim());
    if (filled.some((o) => !o)) return `Câu ${i + 1}: phương án còn trống`;
    if (filled.length < 2) return `Câu ${i + 1}: cần ít nhất 2 phương án`;
    if (q.correctIndex < 0 || q.correctIndex >= filled.length) return `Câu ${i + 1}: chưa chọn đáp án đúng`;
  }
  return null;
}

/**
 * Editor danh sách câu hỏi trắc nghiệm — dùng chung cho quiz phòng và chiến
 * dịch chi nhánh. Bấm vòng tròn chữ cái để chọn đáp án đúng.
 */
export function QuestionListEditor({
  questions,
  onChange,
  disabled,
}: {
  questions: DraftQuestion[];
  onChange: (questions: DraftQuestion[]) => void;
  disabled: boolean;
}) {
  const updateQuestion = (i: number, patch: Partial<DraftQuestion>) => {
    onChange(questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  };

  return (
    <>
      {questions.map((q, i) => (
        <Card key={i}>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Câu {i + 1}</CardTitle>
            <Button variant="ghost" size="sm" disabled={disabled || questions.length <= 1}
              onClick={() => onChange(questions.filter((_, idx) => idx !== i))}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={q.statement} disabled={disabled} rows={2}
              onChange={(e) => updateQuestion(i, { statement: e.target.value })}
              placeholder="Nội dung câu hỏi" />
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => updateQuestion(i, { correctIndex: oi })}
                    title="Chọn làm đáp án đúng"
                    className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full border text-xs font-semibold transition-colors
                      ${q.correctIndex === oi
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-muted-foreground/30 text-muted-foreground hover:border-emerald-400'}`}
                  >
                    {q.correctIndex === oi ? <CheckCircle2 className="w-4 h-4" /> : String.fromCharCode(65 + oi)}
                  </button>
                  <Input value={opt} disabled={disabled}
                    onChange={(e) => updateQuestion(i, { options: q.options.map((o, x) => (x === oi ? e.target.value : o)) })}
                    placeholder={`Phương án ${String.fromCharCode(65 + oi)}`} />
                  <Button variant="ghost" size="sm" disabled={disabled || q.options.length <= 2}
                    onClick={() => {
                      const opts = q.options.filter((_, x) => x !== oi);
                      updateQuestion(i, {
                        options: opts,
                        correctIndex: q.correctIndex === oi ? 0 : q.correctIndex > oi ? q.correctIndex - 1 : q.correctIndex,
                      });
                    }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" disabled={disabled || q.options.length >= 6}
                onClick={() => updateQuestion(i, { options: [...q.options, ''] })}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Thêm phương án
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Giải thích sau khi trả lời (khuyến khích — đây là lúc "học")</Label>
              <Textarea value={q.explanation} disabled={disabled} rows={2}
                onChange={(e) => updateQuestion(i, { explanation: e.target.value })}
                placeholder="VD: Theo mục 2.1 của công văn, ..." />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
