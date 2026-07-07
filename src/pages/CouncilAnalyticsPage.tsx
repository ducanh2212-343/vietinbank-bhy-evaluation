import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCouncilAccess } from '@/hooks/useCouncilAccess';
import { useTheme } from '@/hooks/useTheme';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingDown, TrendingUp, LineChart as LineChartIcon, Minus } from 'lucide-react';
import { toast } from 'sonner';
import {
  CartesianGrid, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis,
  Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  computeCouncilReport, computeCriterionAverages, formatScore,
  type CouncilMemberGroup, type CouncilSubjectLevel, type CouncilWeightConfig, type ReportEvaluationRow,
} from '@/lib/council';

// Bảng màu categorical đã kiểm định CVD-safe (dataviz reference palette),
// gán cố định theo thứ tự đầu mối — không xoay vòng.
const SERIES_LIGHT = ['#2a78d6', '#1baf7a', '#eda100', '#008300', '#4a3aa7', '#e34948', '#e87ba4', '#eb6834'];
const SERIES_DARK = ['#3987e5', '#199e70', '#c98500', '#008300', '#9085e9', '#e66767', '#d55181', '#d95926'];

interface RoundRow { id: string; name: string; status: string; weight_config: CouncilWeightConfig | null; start_date: string | null; results_published: boolean; }
interface SubjectRow {
  id: string; round_id: string; full_name: string; profile_id: string | null;
  subject_level: CouncilSubjectLevel; supervisor_pgd_id: string | null; is_active: boolean; sort_order: number;
}
interface CriterionRow { id: string; round_id: string; criterion_key: string; title: string; sort_order: number; }
interface EvalRow { id: string; round_id: string; subject_id: string; evaluator_id: string; }
interface ScoreRow { evaluation_id: string; criterion_id: string; score: number; }

interface SubjectRoundResult {
  subjectName: string;
  roundId: string;
  score100: number | null;
  votes: number;
  rows: ReportEvaluationRow[];
  criterionIds: string[];
  criteriaByKey: Map<string, CriterionRow>;
}

export default function CouncilAnalyticsPage() {
  const { roles } = useAuth();
  const councilAccess = useCouncilAccess();
  const { theme } = useTheme();
  // Trang tổng hợp/so sánh toàn chi nhánh: chỉ Giám đốc Chi nhánh + TCTH/System admin.
  // Phó Giám đốc (role 'bgd' nhưng không phải Giám đốc) không có quyền xem tổng hợp — bảo mật
  // thông tin đầu mối giữa các Phó Giám đốc với nhau.
  const isFullAdmin =
    roles.includes('tcth_admin') || roles.includes('system_admin') || councilAccess.memberGroup === 'giam_doc';
  // Vượt khóa embargo: chỉ Giám đốc + Quản trị hệ thống thấy kỳ chưa công bố. TCTH admin phải chờ công bố.
  const canBypassEmbargo = roles.includes('system_admin') || councilAccess.memberGroup === 'giam_doc';
  const [loading, setLoading] = useState(true);
  const [rounds, setRounds] = useState<RoundRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [criteria, setCriteria] = useState<CriterionRow[]>([]);
  const [evals, setEvals] = useState<EvalRow[]>([]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [memberGroups, setMemberGroups] = useState<Map<string, CouncilMemberGroup>>(new Map());
  const [radarSubject, setRadarSubject] = useState('');
  const [radarRoundId, setRadarRoundId] = useState('');

  useEffect(() => {
    if (!isFullAdmin || councilAccess.loading) return;
    (async () => {
      setLoading(true);
      const [roundsRes, subjectsRes, criteriaRes, membersRes, evalsRes, scoresRes] = await Promise.all([
        supabase.from('council_rounds').select('id, name, status, weight_config, start_date, results_published').neq('status', 'draft').order('start_date'),
        supabase.from('council_subjects').select('id, round_id, full_name, profile_id, subject_level, supervisor_pgd_id, is_active, sort_order').eq('is_active', true),
        supabase.from('council_criteria').select('id, round_id, criterion_key, title, sort_order').eq('is_active', true).order('sort_order'),
        supabase.from('council_members').select('profile_id, member_group').eq('is_active', true),
        supabase.from('council_evaluations').select('id, round_id, subject_id, evaluator_id').eq('status', 'submitted'),
        supabase.from('council_evaluation_scores').select('evaluation_id, criterion_id, score'),
      ]);
      const err = roundsRes.error || subjectsRes.error || criteriaRes.error || membersRes.error || evalsRes.error || scoresRes.error;
      if (err) { toast.error('Lỗi tải dữ liệu phân tích: ' + err.message); setLoading(false); return; }
      let roundList = (roundsRes.data || []) as unknown as RoundRow[];
      let subjectList = (subjectsRes.data || []) as SubjectRow[];
      let evalList = (evalsRes.data || []) as EvalRow[];
      // Embargo: TCTH admin (không vượt khóa) chỉ thấy các kỳ đã công bố; ẩn kỳ đang chấm.
      if (!canBypassEmbargo) {
        const publishedRoundIds = new Set(roundList.filter((r) => r.results_published).map((r) => r.id));
        roundList = roundList.filter((r) => publishedRoundIds.has(r.id));
        subjectList = subjectList.filter((s) => publishedRoundIds.has(s.round_id));
        evalList = evalList.filter((e) => publishedRoundIds.has(e.round_id));
      }
      setRounds(roundList);
      setSubjects(subjectList);
      setCriteria((criteriaRes.data || []) as CriterionRow[]);
      setMemberGroups(new Map((membersRes.data || []).map((m) => [m.profile_id, m.member_group as CouncilMemberGroup])));
      setEvals(evalList);
      setScores((scoresRes.data || []).map((s) => ({ ...s, score: Number(s.score) })) as ScoreRow[]);
      setLoading(false);
    })();
  }, [isFullAdmin, councilAccess.loading, canBypassEmbargo]);

  // Kết quả trọng số của từng (đầu mối × kỳ) — tái dùng đúng logic của báo cáo
  const results = useMemo(() => {
    const scoresByEval = new Map<string, ScoreRow[]>();
    for (const s of scores) {
      if (!scoresByEval.has(s.evaluation_id)) scoresByEval.set(s.evaluation_id, []);
      scoresByEval.get(s.evaluation_id)!.push(s);
    }
    const out: SubjectRoundResult[] = [];
    for (const subject of subjects) {
      const round = rounds.find((r) => r.id === subject.round_id);
      if (!round) continue;
      const roundCriteria = criteria.filter((c) => c.round_id === subject.round_id);
      const criterionIds = roundCriteria.map((c) => c.id);
      const rows: ReportEvaluationRow[] = evals
        .filter((e) => e.subject_id === subject.id)
        .map((e) => ({
          anon_code: e.id,
          member_group: memberGroups.get(e.evaluator_id) || 'thanh_vien',
          is_supervisor: !!subject.supervisor_pgd_id && e.evaluator_id === subject.supervisor_pgd_id,
          scores: Object.fromEntries((scoresByEval.get(e.id) || []).map((s) => [s.criterion_id, s.score])),
          strengths: null, weaknesses: null, suggestions: null, evidence: null,
        }));
      const summary = computeCouncilReport(rows, criterionIds, subject.subject_level, round.weight_config);
      out.push({
        subjectName: subject.full_name,
        roundId: subject.round_id,
        score100: summary.score100,
        votes: rows.length,
        rows,
        criterionIds,
        criteriaByKey: new Map(roundCriteria.map((c) => [c.criterion_key, c])),
      });
    }
    return out;
  }, [subjects, rounds, criteria, evals, scores, memberGroups]);

  const subjectNames = useMemo(() => {
    const seen = new Map<string, number>();
    subjects
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach((s) => { if (!seen.has(s.full_name)) seen.set(s.full_name, seen.size); });
    return [...seen.keys()];
  }, [subjects]);

  const palette = theme === 'dark' ? SERIES_DARK : SERIES_LIGHT;
  const colorOf = (name: string) => palette[subjectNames.indexOf(name) % palette.length];
  const gridColor = theme === 'dark' ? 'hsl(0 0% 100% / 0.12)' : 'hsl(0 0% 0% / 0.08)';
  const inkMuted = theme === 'dark' ? '#c3c2b7' : '#5a6577';

  // Dữ liệu biểu đồ đường: mỗi kỳ một điểm dữ liệu, mỗi đầu mối một series
  const trendData = useMemo(() => rounds.map((r) => {
    const point: Record<string, string | number | null> = { round: r.name };
    for (const name of subjectNames) {
      const res = results.find((x) => x.roundId === r.id && x.subjectName === name);
      point[name] = res?.score100 != null ? Number(res.score100.toFixed(2)) : null;
    }
    return point;
  }), [rounds, subjectNames, results]);

  const hasAnyData = results.some((r) => r.votes > 0);

  // Radar: mặc định chọn đầu mối đầu tiên + kỳ gần nhất có dữ liệu
  useEffect(() => {
    if (!radarSubject && subjectNames.length) setRadarSubject(subjectNames[0]);
  }, [subjectNames, radarSubject]);
  useEffect(() => {
    if (radarRoundId || !rounds.length) return;
    const withData = rounds.filter((r) => results.some((x) => x.roundId === r.id && x.votes > 0));
    setRadarRoundId((withData[withData.length - 1] || rounds[rounds.length - 1]).id);
  }, [rounds, results, radarRoundId]);

  const radarData = useMemo(() => {
    if (!radarSubject || !radarRoundId) return [];
    const res = results.find((x) => x.roundId === radarRoundId && x.subjectName === radarSubject);
    if (!res) return [];
    const own = computeCriterionAverages(res.rows, res.criterionIds);
    // Mặt bằng chung: trung bình theo criterion_key của tất cả đầu mối trong kỳ
    const roundResults = results.filter((x) => x.roundId === radarRoundId);
    const roundCriteria = criteria.filter((c) => c.round_id === radarRoundId).sort((a, b) => a.sort_order - b.sort_order);
    return roundCriteria.map((c, i) => {
      const allVals: number[] = [];
      for (const rr of roundResults) {
        const avg = computeCriterionAverages(rr.rows, [c.id]).get(c.id);
        if (avg != null) allVals.push(avg);
      }
      return {
        criterion: `TC${i + 1}`,
        title: c.title,
        subject: own.get(c.id) != null ? Number(own.get(c.id)!.toFixed(2)) : null,
        average: allVals.length ? Number((allVals.reduce((a, b) => a + b, 0) / allVals.length).toFixed(2)) : null,
      };
    });
  }, [radarSubject, radarRoundId, results, criteria]);

  if (councilAccess.loading) {
    return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>;
  }
  if (!isFullAdmin) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Trang phân tích tổng hợp đầu mối dành cho Giám đốc Chi nhánh và quản trị hệ thống.
        Phó Giám đốc xem báo cáo của đầu mối mình phụ trách tại mục “Báo cáo đầu mối”.
      </div>
    );
  }
  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>;
  }

  const deltaBadge = (curr: number | null, prev: number | null) => {
    if (curr == null || prev == null) return null;
    const d = curr - prev;
    if (Math.abs(d) < 0.005) return <Badge variant="outline" className="text-[10px] ml-1"><Minus className="w-3 h-3" /></Badge>;
    return d > 0
      ? <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] ml-1"><TrendingUp className="w-3 h-3 mr-0.5" />+{formatScore(d)}</Badge>
      : <Badge className="bg-red-600 hover:bg-red-600 text-white text-[10px] ml-1"><TrendingDown className="w-3 h-3 mr-0.5" />{formatScore(d)}</Badge>;
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <LineChartIcon className="w-5 h-5 text-primary" /> Phân tích đánh giá đầu mối
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Xu hướng điểm thực thi (thang 100) của các đầu mối qua các kỳ, so sánh trong kỳ và hồ sơ
          10 tiêu chí của từng cán bộ so với mặt bằng chung. Chỉ tính các phiếu đã gửi.
        </p>
      </div>

      {!hasAnyData ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          Chưa có phiếu đánh giá nào được gửi — biểu đồ sẽ hiển thị khi Hội đồng bắt đầu chấm.
        </CardContent></Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Điểm thực thi qua các kỳ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke={gridColor} vertical={false} />
                    <XAxis dataKey="round" tick={{ fontSize: 12, fill: inkMuted }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: inkMuted }} tickLine={false} axisLine={false} width={32} />
                    <Tooltip
                      formatter={(v: number) => [`${formatScore(v)} điểm`, undefined]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {subjectNames.map((name) => (
                      <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={colorOf(name)}
                        strokeWidth={2}
                        dot={{ r: 4, strokeWidth: 0, fill: colorOf(name) }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">So sánh đầu mối × kỳ (điểm thang 100 · số phiếu)</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-3 py-2 font-medium">Cán bộ đầu mối</th>
                    {rounds.map((r) => <th key={r.id} className="px-3 py-2 font-medium whitespace-nowrap">{r.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {subjectNames.map((name) => {
                    let prev: number | null = null;
                    return (
                      <tr key={name} className="border-b last:border-0">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="inline-block w-2.5 h-2.5 rounded-sm mr-2 align-middle" style={{ background: colorOf(name) }} />
                          <span className="font-medium align-middle">{name}</span>
                        </td>
                        {rounds.map((r) => {
                          const res = results.find((x) => x.roundId === r.id && x.subjectName === name);
                          const cell = (
                            <td key={r.id} className="px-3 py-2 whitespace-nowrap">
                              {res?.score100 != null ? (
                                <>
                                  <span className="font-semibold">{formatScore(res.score100)}</span>
                                  <span className="text-xs text-muted-foreground"> · {res.votes} phiếu</span>
                                  {deltaBadge(res.score100, prev)}
                                </>
                              ) : (
                                <span className="text-muted-foreground text-xs">{res && res.votes > 0 ? `${res.votes} phiếu` : '—'}</span>
                              )}
                            </td>
                          );
                          prev = res?.score100 ?? prev;
                          return cell;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Hồ sơ 10 tiêu chí — so với mặt bằng chung các đầu mối</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={radarSubject} onValueChange={setRadarSubject}>
                  <SelectTrigger className="w-[220px] h-9"><SelectValue placeholder="Chọn đầu mối" /></SelectTrigger>
                  <SelectContent>
                    {subjectNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={radarRoundId} onValueChange={setRadarRoundId}>
                  <SelectTrigger className="w-[170px] h-9"><SelectValue placeholder="Chọn kỳ" /></SelectTrigger>
                  <SelectContent>
                    {rounds.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {radarData.every((d) => d.subject == null) ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Đầu mối này chưa có phiếu trong kỳ đã chọn.</p>
              ) : (
                <>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                        <PolarGrid stroke={gridColor} />
                        <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 11, fill: inkMuted }} />
                        <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 10, fill: inkMuted }} tickCount={6} />
                        <Tooltip
                          formatter={(v: number, key: string) => [formatScore(v), key === 'subject' ? radarSubject : 'TB chung']}
                          labelFormatter={(label: string) => {
                            const item = radarData.find((d) => d.criterion === label);
                            return item ? `${label}. ${item.title}` : label;
                          }}
                          contentStyle={{ fontSize: 12, borderRadius: 8, maxWidth: 320 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => (v === 'subject' ? radarSubject : 'Mặt bằng chung các đầu mối')} />
                        <Radar name="average" dataKey="average" stroke={inkMuted} strokeDasharray="5 4" strokeWidth={2} fill="transparent" />
                        <Radar name="subject" dataKey="subject" stroke={palette[0]} strokeWidth={2} fill={palette[0]} fillOpacity={0.18} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Nhãn TC1…TC{radarData.length} theo thứ tự bộ tiêu chí của kỳ — di chuột để xem tên đầy đủ.
                    Đường nét đứt xám là trung bình của tất cả đầu mối trong kỳ.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
