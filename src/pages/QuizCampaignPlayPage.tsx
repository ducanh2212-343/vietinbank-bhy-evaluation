import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { QuizPlayEngine } from '@/components/quizzi/QuizPlayEngine';

/**
 * Làm chiến dịch quiz toàn chi nhánh — đề của RIÊNG bạn (bốc ngẫu nhiên từ
 * ngân hàng câu hỏi, đáp án đảo thứ tự theo từng người).
 */
export default function QuizCampaignPlayPage() {
  const { id: campaignId } = useParams<{ id: string }>();
  if (!campaignId) return null;
  return (
    <QuizPlayEngine
      start={() => supabase.rpc('quiz_campaign_start_attempt', { _campaign_id: campaignId })}
      answer={(attemptId, index) =>
        supabase.rpc('quiz_campaign_answer', { _attempt_id: attemptId, _selected_index: index })}
      backPath="/quizzi/chien-dich"
      resultsPath={`/quizzi/chien-dich/${campaignId}/ket-qua`}
      completionNote="Cảm ơn bạn đã tham gia chiến dịch của chi nhánh — kết quả đã được ghi nhận 🎉"
    />
  );
}
