import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ArrowUp, ArrowDown, Loader2, Sparkles, KeyRound, FileCheck } from 'lucide-react';
import { LEVEL_LABELS, GROWTH_STAGE_LABELS } from '@/lib/skillLevels';
import type { CriterionDraft } from '@/lib/skillCriteria';

interface Props {
  value: CriterionDraft[];
  onChange: (next: CriterionDraft[]) => void;
  /** Gọi AI sinh nháp — level cụ thể hoặc null = cả 4 level */
  onGenerate?: (levelNo: number | null) => void;
  generating?: boolean;
  aiEnabled?: boolean;
}

/**
 * Trình soạn thảo tiêu chí theo 4 level — thuần UI, mọi thao tác chỉ đổi state,
 * việc lưu do trang cha quyết định (quản lý được, điều chỉnh được, hoàn tác được).
 */
export function SkillCriteriaEditor({ value, onChange, onGenerate, generating, aiEnabled = true }: Props) {
  const visible = value.filter((d) => !d.deleted);

  const patch = (target: CriterionDraft, changes: Partial<CriterionDraft>) => {
    onChange(value.map((d) => (d === target ? { ...d, ...changes } : d)));
  };

  const addRow = (levelNo: number) => {
    const maxSort = Math.max(0, ...visible.filter((d) => d.level_no === levelNo).map((d) => d.sort_order));
    onChange([
      ...value,
      { level_no: levelNo, statement: '', is_gate: false, requires_evidence: false, sort_order: maxSort + 1 },
    ]);
  };

  const removeRow = (target: CriterionDraft) => {
    if (target.id) patch(target, { deleted: true });
    else onChange(value.filter((d) => d !== target));
  };

  const move = (levelNo: number, index: number, dir: -1 | 1) => {
    const rows = visible.filter((d) => d.level_no === levelNo);
    const j = index + dir;
    if (j < 0 || j >= rows.length) return;
    const a = rows[index];
    const b = rows[j];
    onChange(value.map((d) => {
      if (d === a) return { ...d, sort_order: b.sort_order };
      if (d === b) return { ...d, sort_order: a.sort_order };
      return d;
    }));
  };

  return (
    <div className="space-y-4">
      {aiEnabled && onGenerate && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50"
          disabled={generating}
          onClick={() => onGenerate(null)}
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Sinh nháp AI cho cả 4 level
        </Button>
      )}

      {[1, 2, 3, 4].map((levelNo) => {
        const rows = visible
          .filter((d) => d.level_no === levelNo)
          .sort((a, b) => a.sort_order - b.sort_order);
        return (
          <div key={levelNo} className="rounded-lg border overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
              <span className={`level-badge level-${levelNo} text-[10px]`}>
                L{levelNo} · {LEVEL_LABELS[levelNo]} · {GROWTH_STAGE_LABELS[levelNo]}
              </span>
              <span className="text-[10px] text-muted-foreground">{rows.length} tiêu chí</span>
              <div className="ml-auto flex items-center gap-1.5">
                {aiEnabled && onGenerate && (
                  <Button
                    type="button" size="sm" variant="ghost"
                    className="h-6 px-2 text-[10px] gap-1 text-violet-700 hover:bg-violet-50"
                    disabled={generating}
                    onClick={() => onGenerate(levelNo)}
                    title={`Sinh nháp AI riêng cho L${levelNo}`}
                  >
                    <Sparkles className="w-3 h-3" /> AI
                  </Button>
                )}
                <Button
                  type="button" size="sm" variant="ghost"
                  className="h-6 px-2 text-[10px] gap-1"
                  onClick={() => addRow(levelNo)}
                >
                  <Plus className="w-3 h-3" /> Thêm
                </Button>
              </div>
            </div>

            {rows.length === 0 ? (
              <p className="px-3 py-3 text-[11px] text-muted-foreground italic">
                Chưa có tiêu chí — thêm tay hoặc sinh nháp AI rồi biên tập lại.
              </p>
            ) : (
              <div className="divide-y">
                {rows.map((row, idx) => (
                  <div key={row.id || `new-${levelNo}-${idx}`} className={`p-2.5 space-y-1.5 ${row.isDraft ? 'bg-violet-50/50' : ''}`}>
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] text-muted-foreground font-medium pt-2 w-4 text-right flex-shrink-0">{idx + 1}.</span>
                      <Textarea
                        value={row.statement}
                        onChange={(e) => patch(row, { statement: e.target.value })}
                        placeholder='Hành vi quan sát được, bắt đầu bằng động từ — VD: "Tự xử lý trọn vẹn hồ sơ ... không cần hỗ trợ trong quý"'
                        className="min-h-[38px] text-xs flex-1"
                      />
                      <div className="flex flex-col gap-0.5 flex-shrink-0">
                        <button type="button" className="p-0.5 rounded hover:bg-muted disabled:opacity-30" disabled={idx === 0} onClick={() => move(levelNo, idx, -1)} title="Lên">
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button type="button" className="p-0.5 rounded hover:bg-muted disabled:opacity-30" disabled={idx === rows.length - 1} onClick={() => move(levelNo, idx, 1)} title="Xuống">
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                      <button type="button" className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex-shrink-0" onClick={() => removeRow(row)} title="Xoá tiêu chí">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-4 pl-6 flex-wrap">
                      <label className="flex items-center gap-1.5 text-[11px] cursor-pointer" title="Bắt buộc đạt thì level mới được công nhận">
                        <Checkbox
                          checked={row.is_gate}
                          onCheckedChange={(v) => patch(row, { is_gate: !!v, requires_evidence: !!v || row.requires_evidence })}
                          className="w-3.5 h-3.5"
                        />
                        <KeyRound className="w-3 h-3 text-orange-500" /> Gate (bắt buộc)
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] cursor-pointer" title="Phải nhập minh chứng khi tự nhận đạt">
                        <Checkbox
                          checked={row.requires_evidence}
                          disabled={row.is_gate}
                          onCheckedChange={(v) => patch(row, { requires_evidence: !!v })}
                          className="w-3.5 h-3.5"
                        />
                        <FileCheck className="w-3 h-3 text-sky-600" /> Yêu cầu minh chứng
                      </label>
                      {row.isDraft && (
                        <Badge variant="outline" className="text-[9px] border-violet-300 text-violet-700 bg-violet-50">
                          Nháp AI — chưa lưu
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
