import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ClipboardList, Loader2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BrandMascotAI } from '@/components/branding/BrandAssets';
import type { SkillPriority } from './SkillPriorityPicker';

interface Props {
  priority: SkillPriority;
  role?: string | null;
}

/**
 * Nút "Gợi ý kế hoạch hành động" — gọi AI lập kế hoạch IDP 70/20/10 cho skill
 * ưu tiên trong mục D (mode: suggest_idp_plan). Kết quả để cán bộ tham khảo
 * rồi tự nhập thành các hành động upskill.
 */
export function IdpPlanSuggestion({ priority, role }: Props) {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);

  const fetchPlan = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: {
          mode: 'suggest_idp_plan',
          skill_name: priority.skill_name || priority.skill_id,
          current_level: priority.current_level ?? 0,
          target_level: priority.target_level ?? 0,
          role: role || 'cán bộ',
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPlan(data?.text || '');
    } catch (e: any) {
      toast.error(e?.message || 'Không lấy được gợi ý kế hoạch hành động');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
          <ClipboardList className="w-3.5 h-3.5" />
          Kế hoạch hành động 70/20/10
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchPlan}
          disabled={loading}
          className="h-8 text-xs"
        >
          {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <BrandMascotAI className="w-4 h-4 mr-1.5" />}
          {plan === null ? 'Gợi ý kế hoạch hành động' : 'Gợi ý lại'}
        </Button>
      </div>

      {loading && (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-16 bg-muted/40 animate-pulse rounded" />
          ))}
        </div>
      )}

      {!loading && plan && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-primary flex items-center gap-1.5">
              <BrandMascotAI className="w-4 h-4" /> Kế hoạch gợi ý từ AI — tham khảo rồi tự nhập vào hành động
            </span>
            <button type="button" onClick={() => setPlan(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="prose prose-xs max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 text-foreground">
            <ReactMarkdown>{plan}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
