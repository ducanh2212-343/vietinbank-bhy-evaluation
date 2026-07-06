import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gavel } from 'lucide-react';
import { ROUND_STATUS_LABELS } from '@/lib/council';
import { CouncilRoundsTab, type CouncilRound } from '@/components/council/CouncilRoundsTab';
import { CouncilCriteriaTab } from '@/components/council/CouncilCriteriaTab';
import { CouncilSubjectsTab } from '@/components/council/CouncilSubjectsTab';
import { CouncilMembersTab } from '@/components/council/CouncilMembersTab';
import { CouncilProgressTab } from '@/components/council/CouncilProgressTab';

export default function CouncilAdminPage() {
  const { isAdmin } = useAuth();
  const [rounds, setRounds] = useState<CouncilRound[]>([]);
  const [roundId, setRoundId] = useState('');

  const loadRounds = useCallback(async () => {
    const { data } = await supabase
      .from('council_rounds')
      .select('id, name, description, start_date, end_date, status, voting_deadline, weight_config')
      .order('start_date');
    const list = (data || []) as unknown as CouncilRound[];
    setRounds(list);
    setRoundId((prev) => prev || list.find((r) => r.status === 'open')?.id || list[0]?.id || '');
  }, []);

  useEffect(() => { loadRounds(); }, [loadRounds]);

  const round = useMemo(() => rounds.find((r) => r.id === roundId), [rounds, roundId]);

  if (!isAdmin) {
    return <div className="p-6 text-sm text-muted-foreground">Bạn không có quyền truy cập trang này.</div>;
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Gavel className="w-5 h-5 text-primary" /> Quản trị Hội đồng đánh giá đầu mối
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Thiết đặt kỳ đánh giá, bộ câu hỏi định hướng, danh sách cán bộ đầu mối, thành viên Hội đồng
          và theo dõi tiến độ bỏ phiếu.
        </p>
      </div>

      <Tabs defaultValue="rounds">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="rounds">Kỳ đánh giá</TabsTrigger>
          <TabsTrigger value="criteria">Bộ câu hỏi</TabsTrigger>
          <TabsTrigger value="subjects">Đầu mối</TabsTrigger>
          <TabsTrigger value="members">Thành viên HĐ</TabsTrigger>
          <TabsTrigger value="progress">Tiến độ</TabsTrigger>
        </TabsList>

        <TabsContent value="rounds" className="mt-4">
          <CouncilRoundsTab rounds={rounds} onChanged={loadRounds} />
        </TabsContent>

        {(['criteria', 'subjects', 'progress'] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Select value={roundId} onValueChange={setRoundId}>
                <SelectTrigger className="w-[190px] h-9"><SelectValue placeholder="Chọn kỳ" /></SelectTrigger>
                <SelectContent>
                  {rounds.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {round && <Badge variant="outline" className="text-[10px]">{ROUND_STATUS_LABELS[round.status]}</Badge>}
            </div>
            {roundId && tab === 'criteria' && (
              <CouncilCriteriaTab roundId={roundId} roundName={round?.name || ''} rounds={rounds} />
            )}
            {roundId && tab === 'subjects' && (
              <CouncilSubjectsTab roundId={roundId} roundName={round?.name || ''} />
            )}
            {roundId && tab === 'progress' && (
              <CouncilProgressTab
                roundId={roundId}
                roundName={round?.name || ''}
                roundOpen={round?.status === 'open'}
                votingDeadline={round?.voting_deadline ?? null}
              />
            )}
          </TabsContent>
        ))}

        <TabsContent value="members" className="mt-4">
          <CouncilMembersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
