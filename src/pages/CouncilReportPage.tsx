import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCouncilAccess } from '@/hooks/useCouncilAccess';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, FileSpreadsheet, Loader2, Mail, Printer } from 'lucide-react';
import { toast } from 'sonner';
import {
  ROUND_STATUS_LABELS,
  computeCouncilReport, formatPercent, formatScore, resolveWeightScheme, weightBucketOf,
  type CouncilReportSummary, type CouncilRoundStatus, type CouncilSubjectLevel, type CouncilWeightConfig,
  type ReportEvaluationRow, type WeightBucket,
} from '@/lib/council';
import { exportCouncilExcel, type CouncilExportItem } from '@/lib/councilExport';

// Giá trị đặc biệt của picker: xem biên bản tổng hợp toàn kỳ (admin)
const ROUND_ALL = '__round__';

interface RoundRow { id: string; name: string; status: CouncilRoundStatus; weight_config: CouncilWeightConfig | null; }
interface SubjectOption { id: string; full_name: string; position: string | null; profile_id: string | null; sort_order: number; }
interface CriterionLite { id: string; title: string; sort_order: number; }

interface ReportPayload {
  subject: {
    id: string; round_id: string; round_name: string; round_status: string;
    full_name: string; position: string | null; subject_level: CouncilSubjectLevel;
    task_summary: string | null; measurement: string | null;
  };
  total_members: number;
  submitted_count: number;
  evaluations: ReportEvaluationRow[];
}

const GROUP_ROW_LABEL: Record<WeightBucket, string> = {
  giam_doc: 'Giám đốc Chi nhánh',
  pgd_phu_trach: 'PGĐ phụ trách',
  pgd_khac: 'Phó Giám đốc khác',
  thanh_vien: 'Thành viên Hội đồng',
};

export default function CouncilReportPage() {
  const { isAdmin, profileId } = useAuth();
  const access = useCouncilAccess();
  const [rounds, setRounds] = useState<RoundRow[]>([]);
  const [roundId, setRoundId] = useState('');
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [criteria, setCriteria] = useState<CriterionLite[]>([]);
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [roundReports, setRoundReports] = useState<ReportPayload[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [exporting, setExporting] = useState(false);

  const allowed = isAdmin || access.isSubject;

  useEffect(() => {
    if (!allowed) return;
    (async () => {
      const { data } = await supabase
        .from('council_rounds')
        .select('id, name, status, weight_config')
        .neq('status', 'draft')
        .order('start_date');
      const list = (data || []) as unknown as RoundRow[];
      setRounds(list);
      setRoundId((prev) => prev || list.find((r) => r.status === 'open')?.id || list[list.length - 1]?.id || '');
    })();
  }, [allowed]);

  useEffect(() => {
    if (!roundId || !allowed) return;
    (async () => {
      const { data, error } = await supabase
        .from('council_subjects')
        .select('id, full_name, position, profile_id, sort_order')
        .eq('round_id', roundId)
        .eq('is_active', true)
        .order('sort_order');
      if (error) { toast.error('Lỗi tải danh sách đầu mối: ' + error.message); return; }
      let list = (data || []) as SubjectOption[];
      // Cán bộ đầu mối (không phải admin) chỉ xem được báo cáo của chính mình
      if (!isAdmin) list = list.filter((s) => s.profile_id === profileId);
      setSubjects(list);
      setSubjectId((prev) => {
        if (isAdmin && prev === ROUND_ALL) return prev;
        return list.some((s) => s.id === prev) ? prev : list[0]?.id || '';
      });
    })();
  }, [roundId, allowed, isAdmin, profileId]);

  const loadReport = useCallback(async () => {
    if (!subjectId) { setReport(null); setRoundReports(null); return; }
    setLoading(true);
    const criteriaRes = await supabase.from('council_criteria')
      .select('id, title, sort_order')
      .eq('round_id', roundId).eq('is_active', true).order('sort_order');
    if (criteriaRes.error) { toast.error('Lỗi tải tiêu chí: ' + criteriaRes.error.message); setLoading(false); return; }
    setCriteria((criteriaRes.data || []) as CriterionLite[]);

    if (subjectId === ROUND_ALL) {
      // Biên bản toàn kỳ: gộp báo cáo của tất cả đầu mối trong kỳ
      const responses = await Promise.all(
        subjects.map((s) => supabase.rpc('get_council_subject_report', { p_subject_id: s.id })),
      );
      setLoading(false);
      const failed = responses.find((r) => r.error);
      if (failed?.error) { toast.error('Lỗi tải biên bản: ' + failed.error.message); setRoundReports(null); return; }
      setReport(null);
      setRoundReports(responses.map((r) => r.data as unknown as ReportPayload));
      return;
    }

    const reportRes = await supabase.rpc('get_council_subject_report', { p_subject_id: subjectId });
    setLoading(false);
    if (reportRes.error) { toast.error('Lỗi tải báo cáo: ' + reportRes.error.message); setReport(null); return; }
    setRoundReports(null);
    setReport(reportRes.data as unknown as ReportPayload);
  }, [subjectId, roundId, subjects]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const weightConfig = useMemo(
    () => rounds.find((r) => r.id === roundId)?.weight_config ?? null,
    [rounds, roundId],
  );

  const summary = useMemo(() => {
    if (!report) return null;
    return computeCouncilReport(report.evaluations, criteria.map((c) => c.id), report.subject.subject_level, weightConfig);
  }, [report, criteria, weightConfig]);

  // Biên bản toàn kỳ: tổng hợp trọng số cho từng đầu mối
  const roundSummaries = useMemo(() => {
    if (!roundReports) return null;
    const ids = criteria.map((c) => c.id);
    return roundReports.map((rp) => ({
      report: rp,
      summary: computeCouncilReport(rp.evaluations, ids, rp.subject.subject_level, weightConfig),
    }));
  }, [roundReports, criteria, weightConfig]);

  const exportExcel = async () => {
    const roundName = rounds.find((r) => r.id === roundId)?.name || '';
    const source = roundSummaries ?? (report && summary ? [{ report, summary }] : []);
    const items: CouncilExportItem[] = source.map(({ report: rp, summary: sm }) => ({
      subjectName: rp.subject.full_name,
      position: rp.subject.position,
      subjectLevel: rp.subject.subject_level,
      submittedCount: rp.submitted_count,
      totalMembers: rp.total_members,
      evaluations: rp.evaluations,
      summary: sm,
    }));
    if (items.length === 0) { toast.info('Chưa có dữ liệu để xuất.'); return; }
    setExporting(true);
    try {
      await exportCouncilExcel(roundName, criteria.map((c) => ({ id: c.id, title: c.title })), items, weightConfig);
      toast.success('Đã xuất file Excel.');
    } catch (e) {
      toast.error('Lỗi xuất Excel: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
  };

  if (access.loading) {
    return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>;
  }
  if (!allowed) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Trang này dành cho Ban Giám đốc/quản trị hệ thống và các cán bộ đầu mối (xem kết quả của chính mình).
      </div>
    );
  }

  const scheme = report ? resolveWeightScheme(report.subject.subject_level, weightConfig) : null;
  const weightOf = (row: ReportEvaluationRow) =>
    scheme?.[weightBucketOf(row, report!.subject.subject_level)] ?? 0;

  const subjectProfileId = subjects.find((s) => s.id === subjectId)?.profile_id || null;

  // Gửi email kết quả đánh giá cho chính cán bộ được đánh giá (admin bấm)
  const sendReportEmail = async () => {
    if (!report || !summary || !subjectProfileId) return;
    if (!window.confirm(`Gửi email kết quả đánh giá ${report.subject.round_name} cho ${report.subject.full_name}?`)) return;
    setSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-hr-notification', {
        body: {
          kind: 'council_report',
          recipient_profile_id: subjectProfileId,
          cycle_name: report.subject.round_name,
          score_text: summary.score100 != null ? formatScore(summary.score100) : '',
          submitted_count: report.submitted_count,
          total_members: report.total_members,
          weight_present: formatPercent(summary.totalWeightPresent),
          groups: summary.buckets.filter((b) => b.votes > 0).map((b) => ({
            label: GROUP_ROW_LABEL[b.bucket],
            votes: b.votes,
            raw_avg: formatScore(b.rawAvg),
            weight: formatPercent(b.weight),
            contribution: formatScore(b.contribution, 4),
          })),
        },
      });
      if (error) throw error;
      const res = data as { success?: boolean; skipped?: string; error?: string };
      if (res?.success) toast.success(`Đã gửi email kết quả cho ${report.subject.full_name}.`);
      else if (res?.skipped === 'duplicate') toast.info('Email kết quả này đã được gửi hôm nay — không gửi lại.');
      else if (res?.skipped === 'no_email') toast.error('Cán bộ chưa có địa chỉ email trong hồ sơ.');
      else if (res?.skipped === 'suppressed') toast.error('Địa chỉ email này đã từ chối nhận thư của hệ thống.');
      else toast.error('Không gửi được email: ' + (res?.error || 'lỗi không xác định'));
    } catch (e) {
      toast.error('Lỗi gửi email: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #council-report, #council-report * { visibility: visible; }
          #council-report { position: absolute; left: 0; top: 0; width: 100%; padding: 0 8px; }
        }
      `}</style>

      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" /> Báo cáo kết quả đánh giá đầu mối
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <Select value={roundId} onValueChange={setRoundId}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Chọn kỳ" /></SelectTrigger>
            <SelectContent>
              {rounds.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name} — {ROUND_STATUS_LABELS[r.status]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="w-[230px] h-9"><SelectValue placeholder="Chọn cán bộ đầu mối" /></SelectTrigger>
            <SelectContent>
              {isAdmin && subjects.length > 0 && (
                <SelectItem value={ROUND_ALL}>📋 Biên bản toàn kỳ (tất cả đầu mối)</SelectItem>
              )}
              {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!report && !roundSummaries}>
            <Printer className="w-4 h-4 mr-1" /> In
          </Button>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={exportExcel} disabled={exporting || loading || (!report && !roundSummaries)}>
              {exporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-1" />}
              Xuất Excel
            </Button>
          )}
          {isAdmin && (
            <Button
              size="sm"
              onClick={sendReportEmail}
              disabled={!report || !summary || sendingEmail || !subjectProfileId || report.submitted_count === 0}
              title={!subjectProfileId ? 'Cán bộ chưa liên kết tài khoản — bổ sung tại Quản trị Hội đồng đầu mối' : undefined}
            >
              {sendingEmail ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Mail className="w-4 h-4 mr-1" />}
              Gửi email kết quả
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải báo cáo…</div>
      ) : subjectId === ROUND_ALL && roundSummaries ? (
        <Card>
          <CardContent className="p-5" id="council-report">
            <div className="flex justify-between gap-4 text-[11px] uppercase leading-snug">
              <div className="text-center">
                <p className="font-semibold">Ngân hàng TMCP Công Thương Việt Nam</p>
                <p>Chi nhánh Bắc Hưng Yên — Hội đồng đánh giá</p>
              </div>
              <div className="text-center">
                <p className="font-semibold">Cộng hòa xã hội chủ nghĩa Việt Nam</p>
                <p className="normal-case">Độc lập - Tự do - Hạnh phúc</p>
              </div>
            </div>
            <h2 className="text-center text-base font-bold mt-4">
              BIÊN BẢN TỔNG HỢP KẾT QUẢ ĐÁNH GIÁ CÔNG TÁC ĐẦU MỐI
            </h2>
            <p className="text-center text-sm text-muted-foreground">
              Kỳ đánh giá: {rounds.find((r) => r.id === roundId)?.name} — Chi nhánh Bắc Hưng Yên · Xuất lúc {new Date().toLocaleString('vi-VN')}
            </p>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-xs border">
                <thead>
                  <tr className="bg-muted/40">
                    <th className="border px-2 py-1.5">STT</th>
                    <th className="border px-2 py-1.5 text-left">Cán bộ đầu mối</th>
                    <th className="border px-2 py-1.5 text-left">Chức vụ</th>
                    <th className="border px-2 py-1.5">Số phiếu</th>
                    <th className="border px-2 py-1.5">Điểm nhóm GĐ</th>
                    <th className="border px-2 py-1.5">PGĐ phụ trách</th>
                    <th className="border px-2 py-1.5">PGĐ khác</th>
                    <th className="border px-2 py-1.5">Thành viên</th>
                    <th className="border px-2 py-1.5">Điểm thang 100</th>
                  </tr>
                </thead>
                <tbody>
                  {roundSummaries.map(({ report: rp, summary: sm }, idx) => {
                    const bucketAvg = (bucket: WeightBucket) => {
                      const b = sm.buckets.find((x) => x.bucket === bucket);
                      return b && b.votes > 0 ? formatScore(b.rawAvg) : '—';
                    };
                    return (
                      <tr key={rp.subject.id}>
                        <td className="border px-2 py-1.5 text-center">{idx + 1}</td>
                        <td className="border px-2 py-1.5 font-medium whitespace-nowrap">{rp.subject.full_name}</td>
                        <td className="border px-2 py-1.5">{rp.subject.position || '—'}</td>
                        <td className="border px-2 py-1.5 text-center">{rp.submitted_count}/{rp.total_members}</td>
                        <td className="border px-2 py-1.5 text-center">{bucketAvg('giam_doc')}</td>
                        <td className="border px-2 py-1.5 text-center">{bucketAvg('pgd_phu_trach')}</td>
                        <td className="border px-2 py-1.5 text-center">{bucketAvg('pgd_khac')}</td>
                        <td className="border px-2 py-1.5 text-center">{bucketAvg('thanh_vien')}</td>
                        <td className="border px-2 py-1.5 text-center font-semibold">
                          {sm.score100 != null ? formatScore(sm.score100) : '—'}
                          {sm.score100 != null && sm.totalWeightPresent < 1 && (
                            <span className="block text-[10px] font-normal text-muted-foreground">
                              (trọng số {formatPercent(sm.totalWeightPresent)})
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Điểm nhóm là điểm trung bình thô (thang 10) của các phiếu trong nhóm; điểm thang 100 đã xử lý
              trọng số theo cấp đánh giá và chuẩn hóa theo tổng trọng số các nhóm đã bỏ phiếu.
            </p>

            <h3 className="text-sm font-bold mt-6 mb-2 text-primary">CÁC THÀNH VIÊN THAM DỰ HỘI ĐỒNG KÝ XÁC NHẬN</h3>
            <div className="grid grid-cols-2 gap-4 text-center text-xs mt-4 mb-2 max-w-xl mx-auto">
              <div>
                <p className="font-semibold uppercase">Thư ký Hội đồng / Kiểm soát</p>
                <p className="text-muted-foreground italic">(Ký và ghi rõ họ tên)</p>
              </div>
              <div>
                <p className="font-semibold uppercase">Đại diện Ban Giám đốc / Chi nhánh</p>
                <p className="text-muted-foreground italic">(Ký, đóng dấu xác nhận)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : !report || !summary ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          {subjects.length === 0 ? 'Không có dữ liệu đầu mối cho kỳ này.' : 'Chọn kỳ và cán bộ đầu mối để xem báo cáo.'}
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-5" id="council-report">
            {/* Tiêu đề báo cáo */}
            <div className="flex justify-between gap-4 text-[11px] uppercase leading-snug">
              <div className="text-center">
                <p className="font-semibold">Ngân hàng TMCP Công Thương Việt Nam</p>
                <p>Chi nhánh Bắc Hưng Yên — Hội đồng đánh giá</p>
              </div>
              <div className="text-center">
                <p className="font-semibold">Cộng hòa xã hội chủ nghĩa Việt Nam</p>
                <p className="normal-case">Độc lập - Tự do - Hạnh phúc</p>
              </div>
            </div>
            <h2 className="text-center text-base font-bold mt-4">
              BÁO CÁO KẾT QUẢ ĐÁNH GIÁ CHI TIẾT CÁN BỘ ĐẦU MỐI (XỬ LÝ TRỌNG SỐ)
            </h2>
            <p className="text-center text-sm text-muted-foreground">
              Kỳ đánh giá: {report.subject.round_name} — Chi nhánh Bắc Hưng Yên
            </p>

            {/* I. Thông tin cán bộ */}
            <h3 className="text-sm font-bold mt-5 mb-2 text-primary">I. THÔNG TIN CÁN BỘ ĐƯỢC ĐÁNH GIÁ</h3>
            <div className="text-sm space-y-1">
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
                <p><span className="text-muted-foreground">Họ và tên cán bộ:</span> <strong>{report.subject.full_name}</strong></p>
                <p><span className="text-muted-foreground">Chức vụ công tác:</span> {report.subject.position || '—'}</p>
                <p><span className="text-muted-foreground">Số phiếu đã tổng hợp:</span> {report.submitted_count}/{report.total_members} thành viên</p>
                <p><span className="text-muted-foreground">Thời điểm xuất báo cáo:</span> {new Date().toLocaleString('vi-VN')}</p>
              </div>
              {report.subject.task_summary && (
                <p><span className="text-muted-foreground">Nhiệm vụ trọng tâm đầu mối:</span> {report.subject.task_summary}</p>
              )}
              {report.subject.measurement && (
                <p><span className="text-muted-foreground">Phương thức đo lường / Cam kết:</span> {report.subject.measurement}</p>
              )}
            </div>

            {/* II. Bảng chi tiết */}
            <h3 className="text-sm font-bold mt-5 mb-2 text-primary">II. BẢNG CHI TIẾT ĐIỂM CHẤM TỪ CÁC THÀNH VIÊN HỘI ĐỒNG</h3>
            {report.evaluations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có phiếu đánh giá nào được gửi.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="border px-1.5 py-1.5">STT</th>
                      <th className="border px-1.5 py-1.5 whitespace-nowrap">Người đánh giá</th>
                      <th className="border px-1.5 py-1.5">Trọng số</th>
                      {criteria.map((c, i) => (
                        <th key={c.id} className="border px-1 py-1.5" title={c.title}>TC{i + 1}</th>
                      ))}
                      <th className="border px-1.5 py-1.5 whitespace-nowrap">TB thô</th>
                      <th className="border px-1.5 py-1.5 min-w-48 w-[24%]">Ý kiến đóng góp</th>
                      <th className="border px-1.5 py-1.5 min-w-40 w-[20%]">Minh chứng ghi nhận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.evaluations.map((ev, idx) => {
                      // Ý kiến câu hỏi mở tách theo mục để text dài không phá bố cục bảng
                      const commentItems = [
                        ev.strengths && { label: 'Ưu điểm', text: ev.strengths },
                        ev.weaknesses && { label: 'Hạn chế', text: ev.weaknesses },
                        ev.suggestions && { label: 'Đề xuất', text: ev.suggestions },
                      ].filter(Boolean) as { label: string; text: string }[];
                      // Minh chứng theo tiêu chí (TC1: …) + minh chứng chung của phiếu cũ (nếu có)
                      const evidenceItems = criteria
                        .map((c, i) => (ev.evidences?.[c.id] ? `TC${i + 1}: ${ev.evidences[c.id]}` : null))
                        .filter(Boolean) as string[];
                      if (ev.evidence) evidenceItems.push(ev.evidence);
                      return (
                        <tr key={ev.anon_code} className="align-top">
                          <td className="border px-1.5 py-1.5 text-center">{idx + 1}</td>
                          <td className="border px-1.5 py-1.5 whitespace-nowrap">
                            Thành viên ẩn danh {ev.anon_code}
                            {ev.is_supervisor && <span className="block text-[10px] text-muted-foreground">(PGĐ phụ trách)</span>}
                          </td>
                          <td className="border px-1.5 py-1.5 text-center">{formatPercent(weightOf(ev))}</td>
                          {criteria.map((c) => (
                            <td key={c.id} className="border px-1 py-1.5 text-center">
                              {ev.scores[c.id] != null ? Number(ev.scores[c.id]) : '—'}
                            </td>
                          ))}
                          <td className="border px-1.5 py-1.5 text-center font-semibold">
                            {formatScore(summary.rowAverages.get(ev.anon_code) ?? null)}
                          </td>
                          <td className="border px-1.5 py-1.5 whitespace-pre-wrap break-words max-w-[280px]">
                            {commentItems.length === 0 ? '—' : commentItems.map((item) => (
                              <p key={item.label} className="mb-1 last:mb-0 leading-snug">
                                <strong>{item.label}:</strong> {item.text}
                              </p>
                            ))}
                          </td>
                          <td className="border px-1.5 py-1.5 whitespace-pre-wrap break-words max-w-[240px]">
                            {evidenceItems.length === 0 ? '—' : evidenceItems.map((t, i) => (
                              <p key={i} className="mb-1 last:mb-0 leading-snug">{t}</p>
                            ))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* III. Phân tích trọng số */}
            <h3 className="text-sm font-bold mt-5 mb-2 text-primary">
              III. PHÂN TÍCH VÀ KIỂM CHỨNG KẾT QUẢ CHẤM ĐIỂM THEO TRỌNG SỐ VỊ TRÍ
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border">
                <thead>
                  <tr className="bg-muted/40">
                    <th className="border px-2 py-1.5 text-left">Nhóm người đánh giá</th>
                    <th className="border px-2 py-1.5">Số phiếu hiện có</th>
                    <th className="border px-2 py-1.5">Điểm TB nhóm thô (thang 10)</th>
                    <th className="border px-2 py-1.5">Trọng số áp dụng (%)</th>
                    <th className="border px-2 py-1.5">Điểm thành phần có trọng số</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.buckets.map((b) => (
                    <tr key={b.bucket}>
                      <td className="border px-2 py-1.5">{GROUP_ROW_LABEL[b.bucket]}</td>
                      <td className="border px-2 py-1.5 text-center">{b.votes}</td>
                      <td className="border px-2 py-1.5 text-center">{b.votes ? formatScore(b.rawAvg) : '—'}</td>
                      <td className="border px-2 py-1.5 text-center">{formatPercent(b.weight)}</td>
                      <td className="border px-2 py-1.5 text-center">{b.votes ? formatScore(b.contribution, 4) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border rounded-lg p-3 text-center mt-3">
              <p className="text-[11px] uppercase text-muted-foreground">Điểm quy về thang 100 kiểm chứng</p>
              <p className="text-lg font-bold mt-1">{summary.score100 != null ? formatScore(summary.score100) : '—'} điểm</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Tổng trọng số bỏ phiếu hiện có: {formatPercent(summary.totalWeightPresent)}
              </p>
            </div>
            {summary.totalWeightPresent < 1 && summary.score100 != null && (
              <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-2">
                Một số nhóm chưa bỏ phiếu — điểm được chuẩn hóa theo tổng trọng số hiện có ({formatPercent(summary.totalWeightPresent)}).
              </p>
            )}

            {/* Ký xác nhận */}
            <h3 className="text-sm font-bold mt-6 mb-2 text-primary">IV. CÁC THÀNH VIÊN THAM DỰ HỘI ĐỒNG KÝ XÁC NHẬN KẾT QUẢ ĐÁNH GIÁ</h3>
            <div className="grid grid-cols-2 gap-4 text-center text-xs mt-4 mb-2 max-w-xl mx-auto">
              <div>
                <p className="font-semibold uppercase">Thư ký Hội đồng / Kiểm soát</p>
                <p className="text-muted-foreground italic">(Ký và ghi rõ họ tên)</p>
              </div>
              <div>
                <p className="font-semibold uppercase">Đại diện Ban Giám đốc / Chi nhánh</p>
                <p className="text-muted-foreground italic">(Ký, đóng dấu xác nhận)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {report && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground pb-4">
          <Badge variant="outline" className="text-[10px]">{report.submitted_count}/{report.total_members} phiếu đã gửi</Badge>
          Kết quả cập nhật theo thời gian thực; danh tính người chấm được ẩn danh theo cơ chế đánh giá của Hội đồng.
        </div>
      )}
    </div>
  );
}
