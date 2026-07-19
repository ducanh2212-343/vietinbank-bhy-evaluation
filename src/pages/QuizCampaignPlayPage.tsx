import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { QuizPlayEngine } from '@/components/quizzi/QuizPlayEngine';
import { QuizPledgeGate } from '@/components/quizzi/QuizPledgeGate';

/**
 * Làm chiến dịch quiz toàn chi nhánh — qua cổng cam kết EQ (nếu chiến dịch
 * yêu cầu), đề của RIÊNG bạn (bốc ngẫu nhiên từ ngân hàng câu hỏi, đáp án
 * đảo thứ tự theo từng người).
 */
export default function QuizCampaignPlayPage() {
  const { id: campaignId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<{ title: string; require_pledge: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pledged, setPledged] = useState(false);

  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('quiz_campaigns')
        .select('title, require_pledge').eq('id', campaignId).maybeSingle();
      if (cancelled) return;
      setCampaign(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [campaignId]);

  if (!campaignId) return null;
  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>;
  }

  if (campaign?.require_pledge && !pledged) {
    return (
      <QuizPledgeGate
        quizTitle={campaign.title}
        onConfirm={() => setPledged(true)}
        onBack={() => navigate('/quizzi/chien-dich')}
      />
    );
  }

  return (
    <QuizPlayEngine
      start={() => supabase.rpc('quiz_campaign_start_attempt', { _campaign_id: campaignId, _pledge_accepted: true })}
      answer={(attemptId, index) =>
        supabase.rpc('quiz_campaign_answer', { _attempt_id: attemptId, _selected_index: index })}
      backPath="/quizzi/chien-dich"
      resultsPath={`/quizzi/chien-dich/${campaignId}/ket-qua`}
      completionNote="Cảm ơn bạn đã tham gia chiến dịch của chi nhánh — kết quả đã được ghi nhận 🎉"
    />
  );
}
