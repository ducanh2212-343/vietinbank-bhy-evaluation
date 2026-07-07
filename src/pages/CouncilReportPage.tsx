import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCouncilAccess } from '@/hooks/useCouncilAccess';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, FileDown, FileSpreadsheet, Loader2, Mail, Printer } from 'lucide-react';
import { toast } from 'sonner';
import {
  ROUND_STATUS_LABELS, SECTION_LABELS,
  computeCouncilReport, computeCriterionAverages, formatPercent, formatScore, sectionAverage,
  type CouncilRoundStatus, type CouncilSection, type CouncilSubjectLevel, type CouncilWeightConfig,
  type ReportEvaluationRow,
} from '@/lib/council';
import { exportCouncilExcel, type CouncilExportItem } from '@/lib/councilExport';

// Giá trị đặc biệt của picker: xem biên bản tổng hợp toàn kỳ (admin)
const ROUND_ALL = '__round__';
// Màu cố định (in PDF hiển thị nhất quán): Phần I xanh dương, Phần II xanh lá
const COLOR_PART1 = '#2a78d6';
const COLOR_PART2 = '#1baf7a';

interface RoundRow { id: string; name: string; status: CouncilRoundStatus; weight_config: CouncilWeightConfig | null; }
interface SubjectOption {
  id: string; full_name: string; position: string | null; profile_id: string | null;
  supervisor_pgd_id: string | null; sort_order: number;
}
interface CriterionLite { id: string; title: string; sort_order: number; section: CouncilSection; }

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

interface CriterionScore { criterion: string; title: string; score: number | null }

// Biểu đồ thanh ngang điểm TB theo tiêu chí (thang 10) — ghi rõ số điểm từng tiêu chí,
// dùng CSS thuần nên in PDF luôn hiển thị đúng (không phụ thuộc canvas/SVG).
// Chỉ dùng điểm trung bình tổng hợp (ẩn danh — không lộ ai chấm bao nhiêu).
function CriterionBars({ data, title, color }: { data: CriterionScore[]; title: string; color: string }) {
  const scored = data.filter((d) => d.score != null);
  const avg = scored.length ? scored.reduce((a, d) => a + (d.score as number), 0) / scored.length : null;
  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <p className="text-xs font-semibold">{title}</p>
        {avg != null && <span className="text-[11px] text-muted-foreground">TB phần: <strong>{formatScore(avg)}/10</strong></span>}
      </div>
      {scored.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Chưa có dữ liệu.</p>
      ) : (
        <div className="space-y-2">
          {data.map((d) => (
            <div key={d.criterion} className="text-xs">
              <div className="flex items-baseline justify-between gap-2 mb-0.5">
                <span className="leading-snug"><strong>{d.criterion}.</strong> {d.title}</span>
                <span className="font-bold tabular-nums whitespace-nowrap">{d.score != null ? `${formatScore(d.score)}/10` : '—'}</span>
              </div>
              <div className="h-3 rounded bg-muted overflow-hidden">
                <div className="h-full bar-fill rounded" style={{ width: `${((d.score ?? 0) / 10) * 100}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CouncilReportPage() {
  const { isAdmin, profileId, roles } = useAuth();
  const access = useCouncilAccess();
  // Giám đốc Chi nhánh + tcth_admin/system_admin: xem toàn bộ báo cáo.
  // Phó Giám đốc (role 'bgd' nhưng không phải Giám đốc): chỉ xem đầu mối mình phụ trách + báo cáo của chính mình.
  const isFullAdmin = roles.includes('tcth_admin') || roles.includes('system_admin') || access.memberGroup === 'giam_doc';
  const isPgdSupervisor = isAdmin && !isFullAdmin;
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
  const [exportingPdf, setExportingPdf] = useState(false);

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
    if (!roundId || !allowed || access.loading) return;
    (async () => {
      const { data, error } = await supabase
        .from('council_subjects')
        .select('id, full_name, position, profile_id, supervisor_pgd_id, sort_order')
        .eq('round_id', roundId)
        .eq('is_active', true)
        .order('sort_order');
      if (error) { toast.error('Lỗi tải danh sách đầu mối: ' + error.message); return; }
      let list = (data || []) as SubjectOption[];
      // Giám đốc/tcth_admin/system_admin: xem tất cả. Phó Giám đốc: chỉ đầu mối mình phụ trách
      // (supervisor_pgd_id) + báo cáo của chính mình. Người khác: chỉ báo cáo của chính mình.
      if (isPgdSupervisor) {
        list = list.filter((s) => s.supervisor_pgd_id === profileId || s.profile_id === profileId);
      } else if (!isFullAdmin) {
        list = list.filter((s) => s.profile_id === profileId);
      }
      setSubjects(list);
      setSubjectId((prev) => {
        if ((isFullAdmin || isPgdSupervisor) && prev === ROUND_ALL) return prev;
        return list.some((s) => s.id === prev) ? prev : list[0]?.id || '';
      });
    })();
  }, [roundId, allowed, access.loading, isFullAdmin, isPgdSupervisor, profileId]);

  const loadReport = useCallback(async () => {
    if (!subjectId) { setReport(null); setRoundReports(null); return; }
    setLoading(true);
    const criteriaRes = await supabase.from('council_criteria')
      .select('id, title, sort_order, section')
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

  // Điểm trung bình tổng hợp từng tiêu chí (ẩn danh) — nguồn cho 2 radar
  const criterionAverages = useMemo(
    () => (report ? computeCriterionAverages(report.evaluations, criteria.map((c) => c.id)) : new Map<string, number>()),
    [report, criteria],
  );

  // Chia tiêu chí theo Phần I (năng lực) / Phần II (hiệu quả) để vẽ biểu đồ thanh
  const scoresBySection = useMemo(() => {
    const idxOf = new Map(criteria.map((c, i) => [c.id, i]));
    const build = (section: CouncilSection): CriterionScore[] => criteria
      .filter((c) => c.section === section)
      .map((c) => ({
        criterion: `TC${(idxOf.get(c.id) ?? 0) + 1}`,
        title: c.title,
        score: criterionAverages.has(c.id) ? Number(criterionAverages.get(c.id)!.toFixed(2)) : null,
      }));
    return { nang_luc: build('nang_luc'), hieu_qua: build('hieu_qua') };
  }, [criteria, criterionAverages]);

  // Nhận xét & minh chứng gộp ẩn danh (không gắn nhóm/mã người chấm)
  const pooledComments = useMemo(() => {
    const strengths: string[] = [], weaknesses: string[] = [], suggestions: string[] = [], evidences: string[] = [];
    if (report) {
      const idxOf = new Map(criteria.map((c, i) => [c.id, i]));
      for (const ev of report.evaluations) {
        if (ev.strengths?.trim()) strengths.push(ev.strengths.trim());
        if (ev.weaknesses?.trim()) weaknesses.push(ev.weaknesses.trim());
        if (ev.suggestions?.trim()) suggestions.push(ev.suggestions.trim());
        if (ev.evidences) {
          for (const [cid, txt] of Object.entries(ev.evidences)) {
            if (txt?.trim()) evidences.push(`TC${(idxOf.get(cid) ?? 0) + 1}: ${txt.trim()}`);
          }
        }
        if (ev.evidence?.trim()) evidences.push(ev.evidence.trim());
      }
    }
    return { strengths, weaknesses, suggestions, evidences };
  }, [report, criteria]);

  // Lời chúc EQ gộp ẩn danh — chỉ dùng cho email gửi cán bộ (không hiện trong bản/PDF)
  const pooledWishes = useMemo(
    () => (report ? report.evaluations.map((ev) => ev.wish?.trim()).filter((w): w is string => !!w) : []),
    [report],
  );


  const sectionIds = useMemo(() => ({
    nang_luc: criteria.filter((c) => c.section === 'nang_luc').map((c) => c.id),
    hieu_qua: criteria.filter((c) => c.section === 'hieu_qua').map((c) => c.id),
  }), [criteria]);

  // Biên bản toàn kỳ: điểm thang 100 + điểm TB Phần I/II cho từng đầu mối
  const roundSummaries = useMemo(() => {
    if (!roundReports) return null;
    const ids = criteria.map((c) => c.id);
    return roundReports.map((rp) => ({
      report: rp,
      summary: computeCouncilReport(rp.evaluations, ids, rp.subject.subject_level, weightConfig),
      part1: sectionAverage(rp.evaluations, sectionIds.nang_luc),
      part2: sectionAverage(rp.evaluations, sectionIds.hieu_qua),
    }));
  }, [roundReports, criteria, weightConfig, sectionIds]);

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
      await exportCouncilExcel(roundName, criteria.map((c) => ({ id: c.id, title: c.title, section: c.section })), items);
      toast.success('Đã xuất file Excel.');
    } catch (e) {
      toast.error('Lỗi xuất Excel: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
  };

  // Xuất PDF một chạm: chụp #council-report (html2canvas) → jsPDF A4 đa trang
  const exportPdf = async () => {
    const el = document.getElementById('council-report');
    if (!el) { toast.info('Chưa có nội dung để xuất.'); return; }
    setExportingPdf(true);
    try {
      const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        // Ép bản chụp về giao diện sáng, chữ đen trên nền trắng (tránh chữ trắng/xám khi đang ở dark mode)
        onclone: (doc) => {
          doc.documentElement.classList.remove('dark');
          const style = doc.createElement('style');
          style.textContent =
            '#council-report, #council-report * { color:#111827 !important; }' +
            '#council-report { background:#ffffff !important; }';
          doc.head.appendChild(style);
        },
      });
      const pdf = new JsPDF('p', 'mm', 'a4');
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pw) / canvas.width;
      const img = canvas.toDataURL('image/jpeg', 0.92);
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(img, 'JPEG', 0, position, pw, imgH);
      heightLeft -= ph;
      while (heightLeft > 0) {
        position -= ph;
        pdf.addPage();
        pdf.addImage(img, 'JPEG', 0, position, pw, imgH);
        heightLeft -= ph;
      }
      const label = subjectId === ROUND_ALL
        ? `bien-ban-toan-ky-${rounds.find((r) => r.id === roundId)?.name || ''}`
        : `bao-cao-danh-gia-${report?.subject.full_name || ''}-${report?.subject.round_name || ''}`;
      pdf.save(`${label.replace(/[^\p{L}\p{N}]+/gu, '-')}.pdf`);
      toast.success('Đã xuất file PDF.');
    } catch (e) {
      toast.error('Lỗi xuất PDF: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExportingPdf(false);
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
          // Điểm TB theo tiêu chí (ẩn danh) — KHÔNG gửi nhận xét (chuyển sang phụ lục nội bộ),
          // chỉ kèm Lời chúc EQ ở cuối email.
          criteria_avg: [...scoresBySection.nang_luc, ...scoresBySection.hieu_qua]
            .filter((d) => d.score != null)
            .map((d) => ({ code: d.criterion, title: d.title, score: formatScore(d.score as number) })),
          wishes: pooledWishes,
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
        /* Thanh điểm luôn in đúng màu trong PDF */
        #council-report .bar-fill { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
              {(isFullAdmin || isPgdSupervisor) && subjects.length > 0 && (
                <SelectItem value={ROUND_ALL}>
                  📋 {isFullAdmin ? 'Biên bản toàn kỳ (tất cả đầu mối)' : 'Biên bản đầu mối tôi phụ trách'}
                </SelectItem>
              )}
              {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!report && !roundSummaries}>
            <Printer className="w-4 h-4 mr-1" /> In
          </Button>
          <Button size="sm" variant="outline" onClick={exportPdf} disabled={exportingPdf || loading || (!report && !roundSummaries)}>
            {exportingPdf ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileDown className="w-4 h-4 mr-1" />}
            Xuất PDF
          </Button>
          {(isFullAdmin || isPgdSupervisor) && (
            <Button size="sm" variant="outline" onClick={exportExcel} disabled={exporting || loading || (!report && !roundSummaries)}>
              {exporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-1" />}
              Xuất Excel
            </Button>
          )}
          {(isFullAdmin || isPgdSupervisor) && (
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

            <div className="overflow-x-auto mt-4 max-w-3xl mx-auto">
              <table className="w-full text-xs border">
                <thead>
                  <tr className="bg-muted/40">
                    <th className="border px-2 py-1.5">STT</th>
                    <th className="border px-2 py-1.5 text-left">Cán bộ đầu mối</th>
                    <th className="border px-2 py-1.5 text-left">Chức vụ</th>
                    <th className="border px-2 py-1.5">Số phiếu</th>
                    <th className="border px-2 py-1.5">Phần I<br/>(Năng lực)</th>
                    <th className="border px-2 py-1.5">Phần II<br/>(Hiệu quả)</th>
                    <th className="border px-2 py-1.5">Điểm thang 100</th>
                  </tr>
                </thead>
                <tbody>
                  {roundSummaries.map(({ report: rp, summary: sm, part1, part2 }, idx) => (
                    <tr key={rp.subject.id}>
                      <td className="border px-2 py-1.5 text-center">{idx + 1}</td>
                      <td className="border px-2 py-1.5 font-medium whitespace-nowrap">{rp.subject.full_name}</td>
                      <td className="border px-2 py-1.5">{rp.subject.position || '—'}</td>
                      <td className="border px-2 py-1.5 text-center">{rp.submitted_count}/{rp.total_members}</td>
                      <td className="border px-2 py-1.5 text-center">{part1 != null ? `${formatScore(part1)}/10` : '—'}</td>
                      <td className="border px-2 py-1.5 text-center">{part2 != null ? `${formatScore(part2)}/10` : '—'}</td>
                      <td className="border px-2 py-1.5 text-center font-semibold">
                        {sm.score100 != null ? formatScore(sm.score100) : '—'}
                        {sm.score100 != null && sm.totalWeightPresent < 1 && (
                          <span className="block text-[10px] font-normal text-muted-foreground">
                            (trọng số {formatPercent(sm.totalWeightPresent)})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 text-center">
              Điểm Phần I (Năng lực) và Phần II (Hiệu quả) là điểm trung bình thang 10 của các tiêu chí thuộc phần đó.
              Điểm thang 100 đã xử lý trọng số theo cấp đánh giá. Điểm chấm của từng nhóm/thành viên được ẩn danh
              để bảo đảm tính khách quan.
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

            {report.evaluations.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-4">Chưa có phiếu đánh giá nào được gửi.</p>
            ) : (
              <>
                {/* II. Phân tích điểm theo tiêu chí — biểu đồ thanh có số điểm (ẩn danh) */}
                <h3 className="text-sm font-bold mt-5 mb-2 text-primary">II. ĐIỂM TRUNG BÌNH THEO TỪNG TIÊU CHÍ</h3>
                <p className="text-[11px] text-muted-foreground mb-2">
                  Điểm trung bình của Hội đồng theo từng tiêu chí (thang 10), tổng hợp từ toàn bộ
                  {' '}{report.submitted_count} phiếu đã gửi. Điểm chấm của từng thành viên được ẩn danh
                  hoàn toàn — báo cáo không hiển thị điểm của bất kỳ cá nhân hay nhóm vị trí nào.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <CriterionBars data={scoresBySection.nang_luc} title={SECTION_LABELS.nang_luc} color={COLOR_PART1} />
                  <CriterionBars data={scoresBySection.hieu_qua} title={SECTION_LABELS.hieu_qua} color={COLOR_PART2} />
                </div>

                <div className="border rounded-lg p-3 text-center mt-4">
                  <p className="text-[11px] uppercase text-muted-foreground">Điểm quy về thang 100</p>
                  <p className="text-2xl font-bold mt-1">{summary.score100 != null ? formatScore(summary.score100) : '—'} điểm</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Đã xử lý trọng số theo cấp đánh giá · Tổng trọng số bỏ phiếu hiện có: {formatPercent(summary.totalWeightPresent)}
                  </p>
                </div>
                {summary.totalWeightPresent < 1 && summary.score100 != null && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-2">
                    Một số nhóm chưa bỏ phiếu — điểm được chuẩn hóa theo tổng trọng số hiện có ({formatPercent(summary.totalWeightPresent)}).
                  </p>
                )}

              </>
            )}

            {/* III. Ký xác nhận (nhận xét/góp ý đưa vào phụ lục riêng, không nằm trong bản chính) */}
            <h3 className="text-sm font-bold mt-6 mb-2 text-primary">III. CÁC THÀNH VIÊN THAM DỰ HỘI ĐỒNG KÝ XÁC NHẬN KẾT QUẢ ĐÁNH GIÁ</h3>
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

            {/* PHỤ LỤC — nhận xét/góp ý (lưu nội bộ, trang riêng khi in/PDF) */}
            {(() => {
              const blocks: { label: string; items: string[] }[] = [
                { label: '1. Ưu điểm nổi bật', items: pooledComments.strengths },
                { label: '2. Mặt hạn chế, khuyết điểm', items: pooledComments.weaknesses },
                { label: '3. Ý kiến đóng góp, đề xuất phát triển', items: pooledComments.suggestions },
                { label: '4. Minh chứng ghi nhận', items: pooledComments.evidences },
              ];
              if (!blocks.some((b) => b.items.length > 0)) return null;
              return (
                <div className="mt-8 pt-4 border-t-2 border-dashed break-before-page">
                  <h3 className="text-sm font-bold mb-1 text-primary">PHỤ LỤC — Ý KIẾN NHẬN XÉT, GÓP Ý CỦA HỘI ĐỒNG</h3>
                  <p className="text-[11px] text-muted-foreground mb-3">
                    (Tài liệu tham khảo lưu nội bộ Hội đồng — tách khỏi bản chấm điểm chính thức, tổng hợp ẩn danh)
                  </p>
                  <div className="space-y-2.5">
                    {blocks.map((b) => (
                      <div key={b.label}>
                        <p className="text-xs font-semibold">{b.label}</p>
                        {b.items.length === 0 ? (
                          <p className="text-xs text-muted-foreground pl-3">—</p>
                        ) : (
                          <ul className="list-disc pl-6 mt-0.5 space-y-1">
                            {b.items.map((t, i) => (
                              <li key={i} className="text-xs leading-snug whitespace-pre-wrap break-words">{t}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {report && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground pb-4 flex-wrap">
          <Badge variant="outline" className="text-[10px]">{report.submitted_count}/{report.total_members} phiếu đã gửi</Badge>
          {pooledWishes.length > 0 && (
            <Badge variant="outline" className="text-[10px]">💌 {pooledWishes.length} lời chúc — kèm trong email</Badge>
          )}
          Nhận xét/góp ý nằm ở PHỤ LỤC (lưu nội bộ); lời chúc chỉ hiển thị trong email gửi cán bộ. Danh tính người chấm được ẩn danh.
        </div>
      )}
    </div>
  );
}
