import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Loader2, MessagesSquare, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAiFeatures } from '@/hooks/useAiFeatures';
import { BrandMascotAI } from '@/components/branding/BrandAssets';
import { filterQuarterCycles, pickDefaultCycle, type QuarterCycleOption } from '@/lib/evaluationCycles';
import { effectiveLevel } from '@/lib/skillInsights';

interface Props {
  profileId: string;
  positionName?: string | null;
  departmentName?: string | null;
}

/** Form mới nhất của một cán bộ trong một kỳ (id + vài cột phục vụ 1-1) */
async function latestForm(profileId: string, cycleId: string) {
  const { data } = await supabase
    .from('form_submissions')
    .select('id, one_on_one_answers, one_on_one_enabled, updated_at')
    .eq('employee_id', profileId)
    .eq('cycle_id', cycleId)
    .order('updated_at', { ascending: false })
    .limit(1);
  return data?.[0] || null;
}

export function OneOnOnePrepPanel({ profileId, positionName, departmentName }: Props) {
  const { isEnabled } = useAiFeatures();
  const [cycles, setCycles] = useState<QuarterCycleOption[]>([]);
  const [cycleId, setCycleId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('evaluation_cycles')
        .select('id, name')
        .eq('cycle_type', 'quarterly')
        .order('start_date');
      const qs = filterQuarterCycles(data || []);
      setCycles(qs);
      setCycleId((prev) => prev || pickDefaultCycle(qs)?.id || '');
    })();
  }, []);

  const prevCycleId = useMemo(() => {
    const idx = cycles.findIndex((c) => c.id === cycleId);
    return idx > 0 ? cycles[idx - 1].id : null;
  }, [cycles, cycleId]);

  const generate = async () => {
    if (!cycleId) return;
    setLoading(true);
    setResult(null);
    try {
      // 1) Form + đánh giá kỹ năng kỳ này (và kỳ trước để so tiến bộ)
      const [form, prevForm, skillsRes, kanbanRes] = await Promise.all([
        latestForm(profileId, cycleId),
        prevCycleId ? latestForm(profileId, prevCycleId) : Promise.resolve(null),
        supabase.from('skill_catalog').select('id, code, name').eq('is_active', true),
        supabase
          .from('kanban_cards')
          .select('title, kanban_status, completion_status, deadline, learning_mode, source_type, last_progress_at')
          .eq('profile_id', profileId)
          .eq('is_active', true),
      ]);
      const skillMap = new Map((skillsRes.data || []).map((s) => [s.id, `${s.code ? `${s.code} · ` : ''}${s.name}`]));

      const loadAssessments = async (formId: string) => {
        const { data } = await supabase
          .from('skill_assessments')
          .select('skill_id, is_core, required_level, self_assessed_level, manager_assessed_level, self_l0, manager_l0, evidence')
          .eq('form_id', formId);
        return data || [];
      };
      const curRows = form ? await loadAssessments(form.id) : [];
      const prevRows = prevForm ? await loadAssessments(prevForm.id) : [];
      const prevLevels = new Map(prevRows.map((r) => [r.skill_id, effectiveLevel(r)]));

      const skills = curRows.map((r) => {
        const lv = effectiveLevel(r);
        const prev = prevLevels.get(r.skill_id) ?? null;
        return {
          skill: skillMap.get(r.skill_id) || 'kỹ năng',
          is_core: r.is_core,
          level: lv,
          required_min: r.required_level,
          gap: r.is_core && r.required_level != null && lv != null ? r.required_level - lv : null,
          prev_level: prev,
          leveled_up: prev != null && lv != null && lv > prev,
          has_evidence: !!(r.evidence || '').trim(),
        };
      });

      // 2) Thái độ + IDP kỳ này
      let attitudes: unknown[] = [];
      let idp: unknown[] = [];
      if (form) {
        const [attRes, idpRes] = await Promise.all([
          supabase
            .from('form_attitude_priorities')
            .select('attitude_name, self_status, manager_status')
            .eq('form_id', form.id),
          supabase
            .from('form_skill_priorities')
            .select('skill_id, current_level, target_level, reason_text, status')
            .eq('form_id', form.id),
        ]);
        attitudes = attRes.data || [];
        idp = (idpRes.data || []).map((p) => ({
          skill: skillMap.get(p.skill_id) || 'kỹ năng',
          current_level: p.current_level,
          target_level: p.target_level,
          reason: p.reason_text,
          status: p.status,
        }));
      }

      // 3) Hành động phát triển (Kanban) — cam kết và tiến độ
      const now = Date.now();
      const kanban = (kanbanRes.data || []).map((c) => ({
        title: c.title,
        status: c.kanban_status,
        completion: c.completion_status,
        deadline: c.deadline,
        overdue: !!c.deadline && c.kanban_status !== 'done' && new Date(c.deadline).getTime() < now,
        stale: c.kanban_status === 'doing' && (!c.last_progress_at || now - new Date(c.last_progress_at).getTime() > 7 * 86400000),
      }));

      // 4) Trả lời 1-1 kỳ trước (nếu có)
      const prevAnswers = prevForm?.one_on_one_enabled ? prevForm.one_on_one_answers : null;

      const cycleName = cycles.find((c) => c.id === cycleId)?.name || '';
      const payload = {
        cycle: cycleName,
        // Không gửi tên/mã cán bộ — chỉ ngữ cảnh vai trò
        employee: { position: positionName || 'cán bộ', department: departmentName || '' },
        has_submission: !!form,
        skills,
        attitudes,
        idp_priorities: idp,
        development_actions: kanban,
        previous_one_on_one_answers: prevAnswers,
      };

      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: { mode: 'one_on_one_prep', payload },
      });
      if (error) throw error;
      const text = (data as { text?: string })?.text || '';
      if (!text) throw new Error('AI không trả về nội dung');
      setResult(text);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('429')) toast.error('Quá nhiều yêu cầu AI, vui lòng thử lại sau.');
      else toast.error(`Không tạo được trang chuẩn bị: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const copyResult = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    toast.success('Đã sao chép nội dung chuẩn bị');
  };

  if (!isEnabled('one_on_one_prep')) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessagesSquare className="w-4 h-4 text-primary" /> Chuẩn bị phiên trao đổi 1-1
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={cycleId} onValueChange={(v) => { setCycleId(v); setResult(null); }}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Kỳ" /></SelectTrigger>
              <SelectContent>{cycles.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" className="h-8 text-xs" onClick={generate} disabled={loading || !cycleId}>
              {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <BrandMascotAI className="w-4 h-4 mr-1.5" />}
              {result ? 'Tạo lại' : 'Tạo trang chuẩn bị'}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          AI tổng hợp từ dữ liệu kỳ đánh giá: điểm nổi bật, gap đáng trao đổi, tiến độ cam kết kỳ trước và câu hỏi nên hỏi — đọc trong 2 phút trước phiên.
        </p>
      </CardHeader>
      {(loading || result) && (
        <CardContent>
          {loading && (
            <div className="text-sm text-muted-foreground flex items-center gap-2 py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Đang tổng hợp dữ liệu và soạn nội dung…
            </div>
          )}
          {result && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm space-y-2">
              <div className="flex items-center justify-end gap-1">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={copyResult}>
                  <Copy className="w-3 h-3 mr-1" /> Sao chép
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={generate} disabled={loading}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Tạo lại
                </Button>
              </div>
              <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-headings:mt-3 prose-headings:mb-1 text-foreground">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                Nội dung do AI tổng hợp để tham khảo — hãy đối chiếu với thực tế trước khi trao đổi.
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
