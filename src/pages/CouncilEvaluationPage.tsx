import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCouncilAccess } from '@/hooks/useCouncilAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, CheckCircle2, ClipboardCheck, Gavel, Loader2, Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  EXTREME_HIGH, EXTREME_LOW, ROUND_STATUS_LABELS, SCORE_SCALE, SECTION_LABELS,
  extremeScoreCriteria, formatScore, rawAverage, scoreBandOf,
  type CouncilRoundStatus, type CouncilSection,
} from '@/lib/council';

interface RoundRow { id: string; name: string; status: CouncilRoundStatus; end_date: string | null; }
interface SubjectRow {
  id: string; full_name: string; position: string | null; profile_id: string | null;
  task_summary: string | null; measurement: string | null; sort_order: number;
}
interface CriterionRow {
  id: string; criterion_key: string; section: CouncilSection; title: string; description: string | null;
  anchor_10: string | null; anchor_8: string | null; anchor_6: string | null; anchor_3: string | null; anchor_0: string | null;
  sort_order: number;
}
interface MyEvaluation {
  id: string; subject_id: string; status: 'draft' | 'submitted';
  strengths: string | null; weaknesses: string | null; suggestions: string | null;
}

type AnchorField = keyof Pick<CriterionRow, 'anchor_10' | 'anchor_8' | 'anchor_6' | 'anchor_3' | 'anchor_0'>;

const ANCHOR_LEVELS: { score: number; field: AnchorField }[] = [
  { score: 10, field: 'anchor_10' },
  { score: 8, field: 'anchor_8' },
  { score: 6, field: 'anchor_6' },
  { score: 3, field: 'anchor_3' },
  { score: 0, field: 'anchor_0' },
];

// Tooltip cho các nấc điểm trùng mốc chuẩn hành vi (nấc 1 tham chiếu mức 0đ)
const SCALE_ANCHOR_FIELD: Record<number, AnchorField> = {
  10: 'anchor_10', 8: 'anchor_8', 6: 'anchor_6', 3: 'anchor_3', 1: 'anchor_0',
};

// Bấm vào mô tả hành vi → chấm mốc điểm tương ứng (mức 0đ → nấc 1, thang bắt đầu từ 1)
const ANCHOR_PICK_SCORE: Record<number, number> = { 10: 10, 8: 8, 6: 6, 3: 3, 0: 1 };
const ANCHOR_RANGE_LABEL: Record<number, string> = { 10: '9–10', 8: '7–8', 6: '5–6', 3: '2–4', 0: '1' };

export default function CouncilEvaluationPage() {
  const { profileId } = useAuth();
  const access = useCouncilAccess();
  const [rounds, setRounds] = useState<RoundRow[]>([]);
  const [roundId, setRoundId] = useState('');
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [criteria, setCriteria] = useState<CriterionRow[]>([]);
  const [myEvals, setMyEvals] = useState<MyEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Phiếu đang mở
  const [subjectId, setSubjectId] = useState('');
  const [scores, setScores] = useState<Record<string, number | ''>>({});
  const [evidences, setEvidences] = useState<Record<string, string>>({}); // criterion_id -> minh chứng
  const [savedScoreIds, setSavedScoreIds] = useState<Record<string, string>>({}); // criterion_id -> score row id
  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [suggestions, setSuggestions] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('council_rounds')
        .select('id, name, status, end_date')
        .neq('status', 'draft')
        .order('start_date');
      const list = (data || []) as RoundRow[];
      setRounds(list);
      const open = list.find((r) => r.status === 'open');
      setRoundId((prev) => prev || open?.id || list[list.length - 1]?.id || '');
      if (!list.length) setLoading(false);
    })();
  }, []);

  const loadRound = useCallback(async () => {
    if (!roundId || !profileId) return;
    setLoading(true);
    const [subjectsRes, criteriaRes, evalsRes] = await Promise.all([
      supabase.from('council_subjects')
        .select('id, full_name, position, profile_id, task_summary, measurement, sort_order')
        .eq('round_id', roundId).eq('is_active', true).order('sort_order'),
      supabase.from('council_criteria')
        .select('id, criterion_key, section, title, description, anchor_10, anchor_8, anchor_6, anchor_3, anchor_0, sort_order')
        .eq('round_id', roundId).eq('is_active', true).order('sort_order'),
      supabase.from('council_evaluations')
        .select('id, subject_id, status, strengths, weaknesses, suggestions')
        .eq('round_id', roundId).eq('evaluator_id', profileId),
    ]);
    if (subjectsRes.error || criteriaRes.error || evalsRes.error) {
      toast.error('Lỗi tải dữ liệu: ' + (subjectsRes.error || criteriaRes.error || evalsRes.error)!.message);
      setLoading(false);
      return;
    }
    setSubjects((subjectsRes.data || []) as SubjectRow[]);
    setCriteria((criteriaRes.data || []) as CriterionRow[]);
    setMyEvals((evalsRes.data || []) as MyEvaluation[]);
    setSubjectId('');
    setLoading(false);
  }, [roundId, profileId]);

  useEffect(() => { loadRound(); }, [loadRound]);

  const round = useMemo(() => rounds.find((r) => r.id === roundId), [rounds, roundId]);
  const roundOpen = round?.status === 'open';
  const subject = useMemo(() => subjects.find((s) => s.id === subjectId), [subjects, subjectId]);
  const myEvalFor = useCallback((sid: string) => myEvals.find((e) => e.subject_id === sid), [myEvals]);
  const visibleSubjects = useMemo(
    () => subjects.filter((s) => !s.profile_id || s.profile_id !== profileId),
    [subjects, profileId],
  );
  const criterionIds = useMemo(() => criteria.map((c) => c.id), [criteria]);

  const openSubject = async (sid: string) => {
    const ev = myEvalFor(sid);
    setStrengths(ev?.strengths || '');
    setWeaknesses(ev?.weaknesses || '');
    setSuggestions(ev?.suggestions || '');
    setScores({});
    setEvidences({});
    setSavedScoreIds({});
    if (ev) {
      const { data, error } = await supabase
        .from('council_evaluation_scores')
        .select('id, criterion_id, score, evidence')
        .eq('evaluation_id', ev.id);
      if (error) { toast.error('Lỗi tải điểm đã chấm: ' + error.message); return; }
      setScores(Object.fromEntries((data || []).map((r) => [r.criterion_id, Number(r.score)])));
      setEvidences(Object.fromEntries((data || []).filter((r) => r.evidence).map((r) => [r.criterion_id, r.evidence as string])));
      setSavedScoreIds(Object.fromEntries((data || []).map((r) => [r.criterion_id, r.id])));
    }
    setSubjectId(sid);
  };

  // Chọn nấc điểm 1-10; bấm lại nấc đang chọn để bỏ chấm
  const pickScore = (criterionId: string, value: number) => {
    setScores((p) => ({ ...p, [criterionId]: p[criterionId] === value ? '' : value }));
  };

  const numericScores = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(scores)) if (typeof v === 'number') out[k] = v;
    return out;
  }, [scores]);

  const currentAvg = useMemo(() => rawAverage(numericScores, criterionIds), [numericScores, criterionIds]);

  const persist = async (submit: boolean) => {
    if (!subject || !profileId || !roundId) return;
    const scoredIds = Object.keys(numericScores);
    if (submit) {
      const missing = criteria.filter((c) => !(c.id in numericScores));
      if (missing.length > 0) {
        toast.error(`Chưa chấm điểm ${missing.length} tiêu chí: ${missing.map((c) => c.title).slice(0, 3).join('; ')}${missing.length > 3 ? '…' : ''}`);
        return;
      }
      const extremes = extremeScoreCriteria(numericScores, criterionIds);
      const missingEvidence = extremes.filter((cid) => !(evidences[cid] || '').trim());
      if (missingEvidence.length > 0) {
        const names = missingEvidence
          .map((cid) => criteria.find((c) => c.id === cid)?.title || '')
          .filter(Boolean);
        toast.error(
          `Tiêu chí chấm rất cao (${EXTREME_HIGH} điểm) hoặc rất thấp (≤${EXTREME_LOW} điểm) phải kèm minh chứng. Còn thiếu: ${names.slice(0, 3).join('; ')}${names.length > 3 ? '…' : ''}`,
        );
        return;
      }
    } else if (scoredIds.length === 0 && !strengths.trim() && !weaknesses.trim() && !suggestions.trim()) {
      toast.info('Chưa có nội dung để lưu.');
      return;
    }

    setSaving(true);
    try {
      const existing = myEvalFor(subject.id);
      const payload = {
        round_id: roundId,
        subject_id: subject.id,
        evaluator_id: profileId,
        strengths: strengths.trim() || null,
        weaknesses: weaknesses.trim() || null,
        suggestions: suggestions.trim() || null,
        ...(submit
          ? { status: 'submitted' as const, submitted_at: new Date().toISOString() }
          : existing?.status === 'submitted' ? {} : { status: 'draft' as const }),
      };
      let evaluationId = existing?.id;
      if (evaluationId) {
        const { error } = await supabase.from('council_evaluations').update(payload).eq('id', evaluationId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('council_evaluations').insert(payload).select('id').single();
        if (error) throw error;
        evaluationId = data.id;
      }

      // Ghi điểm: upsert các tiêu chí đã chấm, xóa các tiêu chí bị bỏ trống
      const upserts = scoredIds.map((cid) => ({
        evaluation_id: evaluationId!,
        criterion_id: cid,
        score: numericScores[cid],
        evidence: (evidences[cid] || '').trim() || null,
      }));
      if (upserts.length > 0) {
        const { error } = await supabase
          .from('council_evaluation_scores')
          .upsert(upserts, { onConflict: 'evaluation_id,criterion_id' });
        if (error) throw error;
      }
      const clearedIds = Object.keys(savedScoreIds).filter((cid) => !(cid in numericScores));
      if (clearedIds.length > 0) {
        const { error } = await supabase
          .from('council_evaluation_scores')
          .delete()
          .in('id', clearedIds.map((cid) => savedScoreIds[cid]));
        if (error) throw error;
      }

      toast.success(submit ? `Đã gửi phiếu đánh giá ${subject.full_name}` : 'Đã lưu nháp phiếu đánh giá');
      // Cập nhật trạng thái cục bộ
      const { data: refreshed } = await supabase
        .from('council_evaluations')
        .select('id, subject_id, status, strengths, weaknesses, suggestions')
        .eq('round_id', roundId).eq('evaluator_id', profileId);
      setMyEvals((refreshed || []) as MyEvaluation[]);
      if (submit) setSubjectId('');
      else {
        const { data: sc } = await supabase
          .from('council_evaluation_scores').select('id, criterion_id').eq('evaluation_id', evaluationId!);
        setSavedScoreIds(Object.fromEntries((sc || []).map((r) => [r.criterion_id, r.id])));
      }
    } catch (e) {
      toast.error('Lỗi lưu phiếu: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  if (access.loading) {
    return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>;
  }
  if (!access.isMember) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Trang này dành cho thành viên Hội đồng đánh giá công tác đầu mối (Ban Giám đốc, Trưởng/Phó phụ trách các Phòng và đầu mối KPI).
        Nếu ông/bà thuộc Hội đồng nhưng chưa truy cập được, vui lòng liên hệ Phòng Tổ chức Tổng hợp.
      </div>
    );
  }

  const statusBadge = (sid: string) => {
    const ev = myEvalFor(sid);
    if (ev?.status === 'submitted') return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1" /> Đã gửi</Badge>;
    if (ev) return <Badge variant="secondary" className="text-[10px]">Bản nháp</Badge>;
    return <Badge variant="outline" className="text-[10px]">Chưa đánh giá</Badge>;
  };

  // ===== Màn hình chấm điểm một đầu mối =====
  if (subject) {
    const ev = myEvalFor(subject.id);
    const sections: CouncilSection[] = ['nang_luc', 'hieu_qua'];
    return (
      <div className="space-y-4 max-w-4xl">
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="ghost" onClick={() => setSubjectId('')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Danh sách đầu mối
          </Button>
          <Badge variant="outline">{round?.name}</Badge>
          {statusBadge(subject.id)}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" /> Phiếu đánh giá: {subject.full_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1.5">
            <p><span className="text-muted-foreground">Chức vụ công tác:</span> {subject.position || '—'}</p>
            {subject.task_summary && <p><span className="text-muted-foreground">Nhiệm vụ trọng tâm đầu mối:</span> {subject.task_summary}</p>}
            {subject.measurement && <p><span className="text-muted-foreground">Phương thức đo lường/cam kết:</span> {subject.measurement}</p>}
            {!roundOpen && (
              <p className="text-amber-600 dark:text-amber-500">Kỳ đánh giá đã chốt — phiếu chỉ xem, không chỉnh sửa được.</p>
            )}
          </CardContent>
        </Card>

        {sections.map((section) => {
          const list = criteria.filter((c) => c.section === section);
          if (list.length === 0) return null;
          return (
            <Card key={section}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{SECTION_LABELS[section]}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {list.map((c) => {
                  const idx = criteria.findIndex((x) => x.id === c.id);
                  const value = scores[c.id];
                  const isExtreme = typeof value === 'number' && (value >= EXTREME_HIGH || value <= EXTREME_LOW);
                  const band = typeof value === 'number' ? scoreBandOf(value) : null;
                  return (
                    <div key={c.id} className="border rounded-lg p-3 space-y-2.5 bg-muted/20">
                      <div className="flex items-start gap-2 flex-wrap">
                        <div className="flex-1 min-w-[240px]">
                          <p className="text-sm font-medium">{idx + 1}. {c.title}</p>
                          {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                        </div>
                        {typeof value === 'number' && band && (
                          <Badge className={`text-[11px] ${band.badgeClass}`}>
                            {SCORE_SCALE.includes(value) ? value : formatScore(value, 1)} điểm · {band.label}
                          </Badge>
                        )}
                      </div>

                      {/* Chuẩn hành vi hiển thị trước — bấm vào mô tả phù hợp để chấm mốc điểm tương ứng */}
                      <div className="space-y-1">
                        <p className="text-[11px] text-muted-foreground">
                          Chọn mô tả hành vi sát thực tế nhất (tự điền mốc điểm), sau đó tinh chỉnh trên thang 1-10:
                        </p>
                        {ANCHOR_LEVELS.map((a) => {
                          const text = c[a.field];
                          if (!text) return null;
                          const active = typeof value === 'number' && band?.anchorScore === a.score;
                          return (
                            <button
                              key={a.score}
                              type="button"
                              disabled={!roundOpen}
                              onClick={() => pickScore(c.id, ANCHOR_PICK_SCORE[a.score])}
                              className={`w-full text-left text-xs rounded-md border px-2.5 py-1.5 transition-all ${
                                active
                                  ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-sm'
                                  : 'bg-background hover:border-primary/60 hover:bg-primary/5'
                              } ${roundOpen ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default opacity-80'}`}
                            >
                              <span className={`font-semibold ${active ? 'text-primary' : ''}`}>Mức {a.score}đ</span>
                              <span className="text-muted-foreground"> (nấc {ANCHOR_RANGE_LABEL[a.score]})</span>
                              {': '}{text}
                            </button>
                          );
                        })}
                      </div>

                      {/* Thang điểm chi tiết 10 nấc (1 → 10) */}
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] text-muted-foreground mr-0.5">Thấp</span>
                        {SCORE_SCALE.map((n) => {
                          const anchorField = SCALE_ANCHOR_FIELD[n];
                          return (
                            <Button
                              key={n}
                              size="sm"
                              variant={value === n ? 'default' : 'outline'}
                              className={`h-8 w-9 px-0 text-sm font-semibold transition-all ${value === n ? 'scale-110' : 'text-foreground/80'}`}
                              disabled={!roundOpen}
                              onClick={() => pickScore(c.id, n)}
                              title={anchorField ? c[anchorField] || undefined : undefined}
                            >
                              {n}
                            </Button>
                          );
                        })}
                        <span className="text-[10px] text-muted-foreground ml-0.5">Cao</span>
                        {typeof value === 'number' && !SCORE_SCALE.includes(value) && (
                          <span className="text-[11px] text-muted-foreground ml-1">
                            (điểm cũ {formatScore(value, 1)} — chọn lại nấc 1-10 để cập nhật)
                          </span>
                        )}
                      </div>
                      {(isExtreme || (evidences[c.id] || '').trim()) && (
                        <div>
                          <label className={`text-[11px] font-medium ${isExtreme ? 'text-amber-600 dark:text-amber-500' : ''}`}>
                            Minh chứng cho tiêu chí này {isExtreme && <>(bắt buộc khi chấm {EXTREME_HIGH} điểm hoặc ≤{EXTREME_LOW} điểm)</>}
                          </label>
                          <Textarea
                            value={evidences[c.id] || ''}
                            onChange={(e) => setEvidences((prev) => ({ ...prev, [c.id]: e.target.value }))}
                            rows={2}
                            disabled={!roundOpen}
                            className={`mt-0.5 text-xs bg-background ${isExtreme && !(evidences[c.id] || '').trim() ? 'border-amber-500' : ''}`}
                            placeholder="VD: Tỷ lệ GDV đạt chuẩn kỹ năng bán hàng tăng lên 95%; điểm hài lòng khách hàng 9.8/10…"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Nhận xét và góp ý tổng hợp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium">1. Ưu điểm nổi bật</label>
              <Textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} rows={2} disabled={!roundOpen} className="mt-1 text-sm bg-background" />
            </div>
            <div>
              <label className="text-xs font-medium">2. Mặt hạn chế, khuyết điểm</label>
              <Textarea value={weaknesses} onChange={(e) => setWeaknesses(e.target.value)} rows={2} disabled={!roundOpen} className="mt-1 text-sm bg-background" />
            </div>
            <div>
              <label className="text-xs font-medium">3. Ý kiến đóng góp, đề xuất giải pháp phát triển cán bộ</label>
              <Textarea value={suggestions} onChange={(e) => setSuggestions(e.target.value)} rows={2} disabled={!roundOpen} className="mt-1 text-sm bg-background" />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2 flex-wrap pb-4">
          <span className="text-sm text-muted-foreground">
            Đã chấm {Object.keys(numericScores).length}/{criteria.length} tiêu chí
            {currentAvg != null && <> · Điểm TB thô: <strong>{formatScore(currentAvg)}</strong></>}
          </span>
          {roundOpen && (
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => persist(false)} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Lưu nháp
              </Button>
              <Button size="sm" onClick={() => persist(true)} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                {ev?.status === 'submitted' ? 'Cập nhật phiếu đã gửi' : 'Gửi đánh giá'}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== Danh sách đầu mối theo kỳ =====
  const submittedCount = visibleSubjects.filter((s) => myEvalFor(s.id)?.status === 'submitted').length;
  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Gavel className="w-5 h-5 text-primary" /> Đánh giá năng lực thực thi đầu mối
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hội đồng chấm điểm các cán bộ đầu mối theo bộ câu hỏi định hướng — thang điểm chi tiết
          <strong> 10 nấc từ 1 đến 10</strong> (1 = thấp nhất, 10 = cao nhất), tham chiếu chuẩn hành vi từng mốc.
          Việc chấm điểm dựa trên báo cáo tự đánh giá, hồ sơ minh chứng, nội dung trình bày tại phiên họp Hội đồng và kết quả thực tế —
          không đánh giá theo cảm tính.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={roundId} onValueChange={setRoundId}>
          <SelectTrigger className="w-[190px] h-9"><SelectValue placeholder="Chọn kỳ đánh giá" /></SelectTrigger>
          <SelectContent>
            {rounds.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.name} — {ROUND_STATUS_LABELS[r.status]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {round && (
          <Badge variant={roundOpen ? 'default' : 'secondary'} className="text-[10px]">
            {ROUND_STATUS_LABELS[round.status]}
          </Badge>
        )}
        {visibleSubjects.length > 0 && (
          <span className="text-xs text-muted-foreground">Đã gửi {submittedCount}/{visibleSubjects.length} phiếu</span>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>
      ) : rounds.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Chưa có kỳ đánh giá nào được mở.</CardContent></Card>
      ) : visibleSubjects.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Kỳ này chưa có danh sách cán bộ đầu mối.</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleSubjects.map((s) => (
            <Card key={s.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openSubject(s.id)}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold flex-1 min-w-0 truncate">{s.full_name}</p>
                  {statusBadge(s.id)}
                </div>
                <p className="text-xs text-muted-foreground">{s.position || '—'}</p>
                {s.task_summary && <p className="text-xs text-muted-foreground line-clamp-3">{s.task_summary}</p>}
                <Button size="sm" variant="outline" className="w-full mt-1">
                  {myEvalFor(s.id) ? 'Mở phiếu đánh giá' : 'Bắt đầu chấm điểm'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
