import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { KeyRound, ChevronRight, RotateCcw, Compass } from 'lucide-react';
import { SkillLevelArt } from '@/components/SkillLevelArt';
import { useSkillLevelImages } from '@/hooks/useSkillLevelImages';
import { LEVEL_LABELS, GROWTH_STAGE_LABELS } from '@/lib/skillLevels';
import {
  evaluateLevel,
  pickStartLevel,
  decideNext,
  buildWizardSummary,
  PASS_THRESHOLD,
  type LevelCriterion,
  type AnswerValue,
  type LevelEvalResult,
} from '@/lib/levelCheck';

export interface WizardApplyPayload {
  level: number;
  summary: string;
  answers: { criterionId: string; answer: AnswerValue; evidence: string }[];
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  skillId: string;
  skillName: string;
  skillCode?: string | null;
  /** Toàn bộ tiêu chí của skill (mọi level) */
  criteria: LevelCriterion[];
  /** Level tự đánh giá hiện tại — điểm khởi đầu của luồng thích ứng */
  startLevel: number;
  onApply: (payload: WizardApplyPayload) => void;
}

const ANSWER_OPTIONS: { value: AnswerValue; label: string; activeCls: string }[] = [
  { value: 1, label: 'Đạt', activeCls: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 0.5, label: 'Một phần', activeCls: 'bg-amber-500 text-white border-amber-500' },
  { value: 0, label: 'Chưa', activeCls: 'bg-slate-500 text-white border-slate-500' },
];

/**
 * Wizard "Xác định level theo bộ tiêu chí" — thay cảm tính bằng câu hỏi hành vi.
 * Luồng thích ứng: bắt đầu ở level hiện tại, đạt (≥80% + đủ gate) thì thử level
 * cao hơn, trượt ngay câu đầu thì dò xuống xác nhận sàn. Kết quả chỉ là ĐỀ XUẤT —
 * cán bộ bấm Áp dụng mới ghi vào tự đánh giá, quản lý vẫn duyệt lại sau.
 */
export function LevelCheckWizard({
  open,
  onOpenChange,
  skillId,
  skillName,
  skillCode,
  criteria,
  startLevel,
  onApply,
}: Props) {
  const { getImageUrl, getIconUrl, getStageImageUrl } = useSkillLevelImages();

  const byLevel = useMemo(() => {
    const m = new Map<number, LevelCriterion[]>();
    criteria.forEach((c) => {
      if (!m.has(c.level_no)) m.set(c.level_no, []);
      m.get(c.level_no)!.push(c);
    });
    return m;
  }, [criteria]);
  const levels = useMemo(() => [...byLevel.keys()].sort((a, b) => a - b), [byLevel]);

  const [currentLevel, setCurrentLevel] = useState(0);
  const [answers, setAnswers] = useState<Map<string, AnswerValue>>(new Map());
  const [evidences, setEvidences] = useState<Map<string, string>>(new Map());
  const [evalResults, setEvalResults] = useState<LevelEvalResult[]>([]);
  const [passMap, setPassMap] = useState<Map<number, boolean>>(new Map());
  const [suggested, setSuggested] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);

  // Reset khi mở cho skill mới
  useEffect(() => {
    if (!open) return;
    setCurrentLevel(pickStartLevel(levels, startLevel));
    setAnswers(new Map());
    setEvidences(new Map());
    setEvalResults([]);
    setPassMap(new Map());
    setSuggested(null);
    setTouched(false);
  }, [open, levels, startLevel]);

  const rows = (byLevel.get(currentLevel) || []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const allAnswered = rows.every((c) => answers.has(c.id));
  const missingEvidence = rows.filter(
    (c) => c.requires_evidence && answers.get(c.id) === 1 && !(evidences.get(c.id) || '').trim(),
  );
  const canContinue = allAnswered && missingEvidence.length === 0;

  const submitLevel = () => {
    setTouched(true);
    if (!canContinue) return;
    const result = evaluateLevel(rows, answers);
    const nextResults = [...evalResults.filter((r) => r.levelNo !== currentLevel), result];
    const nextPass = new Map(passMap).set(currentLevel, result.passed);
    setEvalResults(nextResults);
    setPassMap(nextPass);
    setTouched(false);

    const step = decideNext(levels, nextPass, currentLevel);
    if (step.type === 'ask') setCurrentLevel(step.level);
    else setSuggested(step.suggested);
  };

  const handleApply = () => {
    if (suggested === null) return;
    const answeredCriteria = criteria.filter((c) => answers.has(c.id));
    onApply({
      level: suggested,
      summary: buildWizardSummary(evalResults, suggested),
      answers: answeredCriteria.map((c) => ({
        criterionId: c.id,
        answer: answers.get(c.id)!,
        evidence: evidences.get(c.id) || '',
      })),
    });
    onOpenChange(false);
  };

  const isResult = suggested !== null;
  const artProps = (lvl: number, locked = false) => ({
    level: Math.max(lvl, 1),
    imageUrl: lvl >= 1 ? getImageUrl(skillId, lvl) : null,
    iconUrl: getIconUrl(skillId),
    stageImageUrl: getStageImageUrl(Math.max(lvl, 1)),
    locked,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-muted/50 border-b flex items-center gap-3">
          <Compass className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">
              Xác định level — {skillCode ? `${skillCode}. ` : ''}{skillName}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Level đạt khi: điểm ≥ {Math.round(PASS_THRESHOLD * 100)}% và mọi tiêu chí gate đều "Đạt"
            </p>
          </div>
        </div>

        {!isResult ? (
          <>
            {/* Câu hỏi của level hiện tại */}
            <div className="px-5 py-3 flex items-center gap-3 border-b bg-background">
              <SkillLevelArt {...artProps(currentLevel)} size="md" />
              <div>
                <p className="text-sm font-medium">
                  Đang kiểm tra L{currentLevel} — {LEVEL_LABELS[currentLevel]} · {GROWTH_STAGE_LABELS[currentLevel]}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Bạn có làm được những điều sau trong công việc thực tế?
                </p>
              </div>
              {evalResults.length > 0 && (
                <span className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap">
                  Đã chấm: {evalResults.map((r) => `L${r.levelNo}${r.passed ? '✓' : '✗'}`).join(' ')}
                </span>
              )}
            </div>

            <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
              {rows.map((c, i) => {
                const val = answers.get(c.id);
                const needEvidence = c.requires_evidence && val === 1;
                const evidenceMissing = needEvidence && !(evidences.get(c.id) || '').trim();
                return (
                  <div key={c.id} className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <span className="text-[11px] text-muted-foreground font-semibold pt-0.5">{i + 1}.</span>
                      <p className="text-sm flex-1">
                        {c.statement}
                        {c.is_gate && (
                          <Badge variant="outline" className="ml-1.5 text-[9px] border-orange-300 text-orange-600 bg-orange-50 align-middle gap-0.5">
                            <KeyRound className="w-2.5 h-2.5" /> Gate
                          </Badge>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-1.5 pl-5">
                      {ANSWER_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAnswers((prev) => new Map(prev).set(c.id, opt.value))}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            val === opt.value ? opt.activeCls : 'bg-background hover:bg-muted border-border'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                      {touched && !answers.has(c.id) && (
                        <span className="text-[10px] text-destructive self-center">Chưa chọn</span>
                      )}
                    </div>
                    {needEvidence && (
                      <div className="pl-5">
                        <Textarea
                          value={evidences.get(c.id) || ''}
                          onChange={(e) => setEvidences((prev) => new Map(prev).set(c.id, e.target.value))}
                          placeholder="Tiêu chí gate — bắt buộc nêu minh chứng (số hồ sơ, tên việc, thời gian...)"
                          className={`min-h-[36px] text-xs ${touched && evidenceMissing ? 'border-destructive' : ''}`}
                        />
                        {touched && evidenceMissing && (
                          <p className="text-[10px] text-destructive mt-0.5">Cần minh chứng khi tự nhận "Đạt" tiêu chí gate.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-3 border-t bg-muted/30 flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                {rows.filter((c) => answers.has(c.id)).length}/{rows.length} câu đã trả lời
              </span>
              <Button size="sm" className="ml-auto h-8 text-xs gap-1" onClick={submitLevel}>
                Chấm level này <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </>
        ) : (
          /* Kết quả */
          <div className="px-5 py-6 flex flex-col items-center gap-4 overflow-y-auto">
            {suggested >= 1 ? (
              <SkillLevelArt {...artProps(suggested)} size="xl" className="skill-art-pop" />
            ) : (
              <SkillLevelArt {...artProps(1, true)} size="xl" />
            )}
            <div className="text-center">
              <p className="text-base font-bold">
                Đề xuất: L{suggested} — {LEVEL_LABELS[suggested]}
              </p>
              {suggested >= 1 && (
                <p className="text-xs text-muted-foreground mt-0.5">Nấc phát triển: {GROWTH_STAGE_LABELS[suggested]}</p>
              )}
            </div>

            <div className="w-full rounded-lg border divide-y">
              {[...evalResults].sort((a, b) => a.levelNo - b.levelNo).map((r) => (
                <div key={r.levelNo} className="flex items-center gap-2 px-3 py-2 text-xs">
                  <span className={`level-badge level-${r.levelNo} text-[10px]`}>L{r.levelNo}</span>
                  <span className="text-muted-foreground">{r.metCount}/{r.total} tiêu chí đạt · điểm {Math.round(r.score * 100)}%</span>
                  {!r.gatesMet && <Badge variant="outline" className="text-[9px] border-orange-300 text-orange-600">thiếu gate</Badge>}
                  <span className={`ml-auto font-semibold ${r.passed ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {r.passed ? '✓ Đạt' : '✗ Chưa đạt'}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              Đây là mức đề xuất từ câu trả lời của bạn — quản lý sẽ xem lại cùng minh chứng khi duyệt phiếu.
            </p>

            <div className="w-full flex gap-2">
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1 flex-1" onClick={() => onOpenChange(false)}>
                Đóng, không áp dụng
              </Button>
              <Button size="sm" className="h-9 text-xs gap-1 flex-1" onClick={handleApply}>
                <RotateCcw className="w-3.5 h-3.5 rotate-180" /> Áp dụng L{suggested} vào tự đánh giá
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
