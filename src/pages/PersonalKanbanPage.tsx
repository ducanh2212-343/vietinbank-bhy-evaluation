import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { KanbanColumn } from '@/components/kanban/KanbanColumn';
import { KanbanCardItem } from '@/components/kanban/KanbanCard';
import { UpdateProgressDialog } from '@/components/kanban/UpdateProgressDialog';
import { CompleteRequestDialog } from '@/components/kanban/CompleteRequestDialog';
import { CardDetailDialog } from '@/components/kanban/CardDetailDialog';
import { TeamReviewPanel } from '@/components/kanban/TeamReviewPanel';
import {
  computeBadges, rpcMove, sortCards, dedupeCards,
  fetchSkillMetaForCards, fetchActivityFlagsForCards, fetchWeeklyUpdateMap,
  type KanbanCard, type KanbanStatus, type SkillMetaMap, type ActivityFlagsMap, type WeeklyUpdateMap,
} from '@/lib/kanban';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

const COLS: { id: KanbanStatus; label: string }[] = [
  { id: 'todo', label: 'Phải làm' },
  { id: 'doing', label: 'Đang làm' },
  { id: 'done', label: 'Hoàn thành' },
];

export default function PersonalKanbanPage() {
  const { profileId, isManager, isPgd, isAdmin } = useAuth();
  const isTeamManager = isManager || isPgd || isAdmin;
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  // Deep-link tới tab "Đội ngũ" qua ?view=team (dùng từ dải nhắc "Chờ xác nhận" trên Tổng quan)
  const [scopeTab, setScopeTab] = useState<'mine' | 'team'>(
    isTeamManager && searchParams.get('view') === 'team' ? 'team' : 'mine',
  );
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [skillMap, setSkillMap] = useState<SkillMetaMap>({});
  const [flags, setFlags] = useState<ActivityFlagsMap>({});
  const [weeklyMap, setWeeklyMap] = useState<WeeklyUpdateMap>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'needs_update' | 'waiting'>('all');
  const [source, setSource] = useState<string>('all');
  const [updateCard, setUpdateCard] = useState<KanbanCard | null>(null);
  const [completeCard, setCompleteCard] = useState<KanbanCard | null>(null);
  const [detailCard, setDetailCard] = useState<KanbanCard | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const reload = async () => {
    if (!profileId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('kanban_cards').select('*').eq('profile_id', profileId).eq('is_active', true);
    if (error) toast.error('Lỗi tải dữ liệu');
    const list = dedupeCards((data as KanbanCard[]) || []);
    setCards(list);
    const [sm, fl, wm] = await Promise.all([
      fetchSkillMetaForCards(list),
      fetchActivityFlagsForCards(list),
      fetchWeeklyUpdateMap(list),
    ]);
    setSkillMap(sm);
    setFlags(fl);
    setWeeklyMap(wm);
    setLoading(false);
  };

  useEffect(() => { reload(); }, [profileId]);

  const filtered = cards.filter(c => {
    if (source !== 'all' && c.source_type !== source) return false;
    const b = computeBadges(c);
    if (filter === 'overdue' && !b.overdue) return false;
    if (filter === 'needs_update' && !b.needsUpdate) return false;
    if (filter === 'waiting' && !b.waitingConfirm) return false;
    return true;
  });

  const ctx = { weeklyMap, flagsMap: flags };
  const byStatus: Record<KanbanStatus, KanbanCard[]> = {
    todo: sortCards(filtered.filter(c => c.kanban_status === 'todo'), ctx),
    doing: sortCards(filtered.filter(c => c.kanban_status === 'doing'), ctx),
    done: sortCards(filtered.filter(c => c.kanban_status === 'done'), ctx),
  };

  const handleDrag = async (e: DragEndEvent) => {
    const cardId = String(e.active.id);
    const overId = e.over?.id as KanbanStatus | undefined;
    if (!overId) return;
    const card = cards.find(c => c.id === cardId);
    if (!card || card.kanban_status === overId) return;
    if (overId === 'done' && card.kanban_status !== 'done') { setCompleteCard(card); return; }
    try { await rpcMove(cardId, overId); await reload(); }
    catch (err: any) { toast.error(err.message || 'Lỗi'); }
  };

  const handleQuickMove = async (card: KanbanCard, to: KanbanStatus) => {
    if (to === 'done') { setCompleteCard(card); return; }
    try { await rpcMove(card.id, to); await reload(); }
    catch (err: any) { toast.error(err.message || 'Lỗi'); }
  };

  const renderCard = (c: KanbanCard) => (
    <div key={c.id} className="space-y-1">
      <KanbanCardItem card={c} skillMap={skillMap} flags={flags[c.id]} weeklyUpdated={weeklyMap[c.id] === true} draggable={!isMobile}
        onUpdate={() => setUpdateCard(c)} onComplete={() => setCompleteCard(c)} onOpen={() => setDetailCard(c)} />
      {isMobile && (
        <div className="flex gap-1 px-1">
          {c.kanban_status === 'todo' && <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleQuickMove(c, 'doing')}>Bắt đầu</Button>}
          {c.kanban_status === 'doing' && <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleQuickMove(c, 'todo')}>Trả về</Button>}
          {c.kanban_status === 'done' && c.completion_status !== 'confirmed' && <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleQuickMove(c, 'doing')}>Chuyển lại Đang làm</Button>}
        </div>
      )}
    </div>
  );

  if (!profileId) return <div className="p-6 text-muted-foreground">Chưa có hồ sơ.</div>;

  const myView = (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả nguồn</SelectItem>
              <SelectItem value="skill_upskill">Skill upskill</SelectItem>
              <SelectItem value="attitude_improvement">Thái độ</SelectItem>
              <SelectItem value="ai_application">Ứng dụng AI</SelectItem>
              <SelectItem value="manager_assigned">QL giao</SelectItem>
              <SelectItem value="carry_over">Chuyển kỳ</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="overdue">Quá hạn</SelectItem>
              <SelectItem value="needs_update">Cần cập nhật</SelectItem>
              <SelectItem value="waiting">Chờ xác nhận</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? <p className="text-muted-foreground">Đang tải...</p> : isMobile ? (
        <Tabs defaultValue="todo">
          <TabsList className="grid grid-cols-3 w-full">
            {COLS.map(c => <TabsTrigger key={c.id} value={c.id}>{c.label} ({byStatus[c.id].length})</TabsTrigger>)}
          </TabsList>
          {COLS.map(col => (
            <TabsContent key={col.id} value={col.id} className="space-y-2 mt-3">
              {byStatus[col.id].map(renderCard)}
              {byStatus[col.id].length === 0 && <p className="text-xs text-muted-foreground">Không có card.</p>}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDrag}>
          <div className="grid grid-cols-3 gap-4">
            {COLS.map(col => (
              <KanbanColumn key={col.id} id={col.id} title={col.label} count={byStatus[col.id].length}>
                {byStatus[col.id].map(renderCard)}
              </KanbanColumn>
            ))}
          </div>
        </DndContext>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Hành động phát triển</h1>
        <p className="page-subtitle">Kanban đầy đủ các hành động bạn đã cam kết</p>
      </div>

      {isTeamManager ? (
        <Tabs value={scopeTab} onValueChange={(v: any) => setScopeTab(v)}>
          <TabsList>
            <TabsTrigger value="mine">Của tôi</TabsTrigger>
            <TabsTrigger value="team">Đội ngũ</TabsTrigger>
          </TabsList>
          <TabsContent value="mine" className="space-y-6 mt-4">{myView}</TabsContent>
          <TabsContent value="team" className="mt-4"><TeamReviewPanel /></TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6">{myView}</div>
      )}

      {updateCard && <UpdateProgressDialog card={updateCard} open onClose={() => setUpdateCard(null)} onSaved={reload} />}
      {completeCard && <CompleteRequestDialog cardId={completeCard.id} open onClose={() => setCompleteCard(null)} onSaved={reload} />}
      {detailCard && <CardDetailDialog card={detailCard} open onClose={() => setDetailCard(null)} onChanged={reload} />}
    </div>
  );
}
