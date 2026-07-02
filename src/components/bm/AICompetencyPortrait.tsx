import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CoreSkillAssessment } from '@/components/evaluation/EvalSectionB';
import type { AttitudeAssessment } from '@/components/evaluation/EvalSectionC';

interface Props {
  profile: any;
  coreAssessments: CoreSkillAssessment[];
  attitudeAssessments: AttitudeAssessment[];
  formId: string | null;
  supplementaryAssessments?: CoreSkillAssessment[];
  oneOnOneEnabled?: boolean;
  oneOnOneAnswers?: Record<string, any>;
}

export function AICompetencyPortrait({
  profile, coreAssessments, attitudeAssessments, formId,
  supplementaryAssessments = [], oneOnOneEnabled = false, oneOnOneAnswers = {},
}: Props) {
  const cacheKey = formId ? `ai-portrait-${formId}` : null;
  const [result, setResult] = useState<string>('');
  const [generatedAt, setGeneratedAt] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Ưu tiên bản đã lưu trong DB (chia sẻ giữa CB/TP, không tốn credit sinh lại);
  // fallback cache localStorage cho các bản sinh trước đây hoặc khi chưa được phép ghi DB.
  useEffect(() => {
    setResult('');
    setGeneratedAt('');
    if (!formId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from('form_submissions')
          .select('ai_portrait, ai_portrait_generated_at')
          .eq('id', formId)
          .maybeSingle();
        if (cancelled) return;
        if (data?.ai_portrait) {
          setResult(data.ai_portrait);
          setGeneratedAt(
            data.ai_portrait_generated_at
              ? new Date(data.ai_portrait_generated_at).toLocaleString('vi-VN')
              : '',
          );
          return;
        }
      } catch { /* cột chưa có trong DB → dùng cache local */ }
      try {
        const cached = cacheKey ? localStorage.getItem(cacheKey) : null;
        if (cached && !cancelled) {
          const parsed = JSON.parse(cached);
          setResult(parsed.text || '');
          setGeneratedAt(parsed.at || '');
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [formId, cacheKey]);

  const assessed = coreAssessments.filter(c => c.self_assessed_level != null);
  const canRun = assessed.length > 0 && !loading;

  const run = async () => {
    if (!canRun) return;
    setLoading(true);
    try {
      // Không gửi tên/mã cán bộ/tên quản lý ra gateway AI bên ngoài —
      // model chỉ cần vị trí, phòng ban và dữ liệu năng lực để tư vấn.
      const payload = {
        employee: {
          position: profile?.pos_name || profile?.position || '',
          department: profile?.dept_name || '',
          join_date: profile?.join_date || '',
        },
        core_skills: coreAssessments.map(c => ({
          name: c.skill_name,
          code: c.skill_code,
          group: c.skill_group,
          self_level: c.self_assessed_level,
          manager_level: c.manager_assessed_level,
          required: c.minimum_level,
          advanced: c.advanced_level,
          gap: c.self_assessed_level != null ? (c.self_assessed_level - (c.minimum_level ?? 0)) : null,
          evidence: c.evidence || '',
          assessed: c.self_assessed_level != null,
        })),
        supplementary_skills: supplementaryAssessments.map(c => ({
          name: c.skill_name,
          code: c.skill_code,
          group: c.skill_group,
          self_level: c.self_assessed_level,
          manager_level: c.manager_assessed_level,
          evidence: c.evidence || '',
        })),
        attitudes: attitudeAssessments.map(a => ({
          name: a.attitude_name,
          self_status: a.self_status || '',
          manager_status: a.manager_status || '',
          current_status: a.current_status || '',
          issue_summary: a.issue_summary || '',
          desired_status: a.desired_status || '',
          evidence: a.evidence || '',
          improvement_goal: a.improvement_goal || '',
          employee_comment: a.employee_comment || '',
          manager_comment: a.manager_comment || '',
        })),
        one_on_one: {
          enabled: !!oneOnOneEnabled,
          answers: oneOnOneAnswers || {},
        },
      };

      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: { mode: 'competency_portrait', payload },
      });
      if (error) throw error;
      const text = (data as any)?.text || '';
      if (!text) throw new Error('AI không trả về nội dung');
      const at = new Date().toLocaleString('vi-VN');
      setResult(text);
      setGeneratedAt(at);

      // Lưu vào DB để CB/TP dùng chung và có vết khi duyệt; nếu RLS không cho ghi
      // (ví dụ CB xem phiếu đã duyệt) thì fallback cache local.
      let persisted = false;
      if (formId) {
        try {
          const { data: saved } = await (supabase as any)
            .from('form_submissions')
            .update({ ai_portrait: text, ai_portrait_generated_at: new Date().toISOString() })
            .eq('id', formId)
            .select('id');
          persisted = !!(saved && saved.length);
        } catch { /* cột chưa có → fallback local */ }
      }
      if (!persisted && cacheKey) {
        localStorage.setItem(cacheKey, JSON.stringify({ text, at }));
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Lỗi khi gọi AI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Chân dung năng lực bằng AI
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">Tổng hợp tự động</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-3 sm:px-6">
        <p className="text-xs text-muted-foreground">
          AI tổng hợp điểm mạnh, điểm cần cải thiện và phong cách làm việc dựa trên đánh giá kỹ năng + thái độ đã nhập ở trên.
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            onClick={run}
            disabled={!canRun}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> AI đang phân tích…</>
            ) : result ? (
              <><RefreshCw className="w-4 h-4 mr-2" /> Phân tích lại</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Phân tích chân dung</>
            )}
          </Button>
          {assessed.length === 0 && (
            <span className="text-xs text-muted-foreground">Hãy tự đánh giá ít nhất 1 skill ở mục B trước.</span>
          )}
          {generatedAt && !loading && (
            <span className="text-xs text-muted-foreground">Cập nhật: {generatedAt}</span>
          )}
        </div>

        {result && (
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="prose prose-sm max-w-none
              prose-headings:font-semibold prose-headings:text-foreground
              prose-h2:text-sm prose-h2:mt-4 prose-h2:mb-2 prose-h2:pb-1 prose-h2:border-b prose-h2:border-border
              first:prose-h2:mt-0
              prose-p:my-1 prose-p:text-sm prose-p:text-foreground/90
              prose-ul:my-1 prose-ul:pl-5 prose-li:my-0.5 prose-li:text-sm
              prose-strong:text-foreground">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
