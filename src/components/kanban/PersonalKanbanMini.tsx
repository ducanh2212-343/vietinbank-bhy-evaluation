import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Kanban as KanbanIcon, AlertTriangle, ChevronDown } from 'lucide-react';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCardItem } from './KanbanCard';
import { UpdateProgressDialog } from './UpdateProgressDialog';
import { CompleteRequestDialog } from './CompleteRequestDialog';
import { CardDetailDialog } from './CardDetailDialog';
import {
  fetchMyCards, fetchSkillMetaForCards, fetchActivityFlagsForCards, fetchWeeklyUpdateMap,
  rpcMove, sortCards, computeBadges, isWeeklyTracked,
  type KanbanCard, type KanbanStatus, type SkillMetaMap, type ActivityFlagsMap, type WeeklyUpdateMap,
} from '@/lib/kanban';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

interface Props { profileId: string; limit?: number; }

const COLS: { id: KanbanStatus; label: string }[] = [
  { id: 'todo', label: 'Phải làm' },
  { id: 'doing', label: 'Đang làm' },
  { id: 'done', label: 'Hoàn thành' },
];

export function PersonalKanbanMini({ profileId, limit = 5 }: Props) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [skillMap, setSkillMap] = useState<SkillMetaMap>({});
  const [flags, setFlags] = useState<ActivityFlagsMap>({});
  const [weeklyMap, setWeeklyMap] = useState<WeeklyUpdateMap>({});
  const [loading, setLoading] = useState(true);
  const [updateCard, setUpdateCard] = useState<KanbanCard | null>(null);
  const [completeCard, setCompleteCard] = useState<KanbanCard | null>(null);
  const [detailCard, setDetailCard] = useState<KanbanCard | null>(null);
  // «Hoàn thành» trên điện thoại gấp lại mặc định — xem ghi chú ở phần dựng
  const [moXong, setMoXong] = useState(false);
  const doingColRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const reload = async () => {
    setLoading(true);
    try {
      const list = await fetchMyCards(profileId);
      setCards(list);
      const [sm, fl, wm] = await Promise.all([
        fetchSkillMetaForCards(list),
        fetchActivityFlagsForCards(list),
        fetchWeeklyUpdateMap(list),
      ]);
      setSkillMap(sm);
      setFlags(fl);
      setWeeklyMap(wm);
    } catch (e: any) { toast.error('Không tải được Kanban'); }
    finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, [profileId]);

  const ctx = { weeklyMap, flagsMap: flags };
  const byStatus: Record<KanbanStatus, KanbanCard[]> = {
    todo: sortCards(cards.filter(c => c.kanban_status === 'todo'), ctx),
    doing: sortCards(cards.filter(c => c.kanban_status === 'doing'), ctx),
    done: sortCards(cards.filter(c => c.kanban_status === 'done'), ctx),
  };

  const doingCount = byStatus.doing.length;
  // Nhịp tuần áp dụng cho MỌI thẻ chưa xong của kế hoạch quý (kể cả 'Phải làm')
  const notUpdated = cards.filter(c => isWeeklyTracked(c) && weeklyMap[c.id] === false);
  const notUpdatedCount = notUpdated.length;
  const overdueCount = cards.filter(c => computeBadges(c).overdue).length;

  // Xếp chồng nên mọi cột đều đang hiện — «Cập nhật ngay» chỉ cần cuộn tới
  // cột Đang làm, cùng một cử chỉ trên điện thoại lẫn web
  const focusRed = () => {
    doingColRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDrag = async (e: DragEndEvent) => {
    const cardId = String(e.active.id);
    const overId = e.over?.id as KanbanStatus | undefined;
    if (!overId) return;
    const card = cards.find(c => c.id === cardId);
    if (!card || card.kanban_status === overId) return;
    if (overId === 'done' && card.kanban_status !== 'done') {
      setCompleteCard(card);
      return;
    }
    try {
      await rpcMove(cardId, overId);
      await reload();
    } catch (err: any) { toast.error(err.message || 'Lỗi chuyển trạng thái'); }
  };

  const handleQuickMove = async (card: KanbanCard, to: KanbanStatus) => {
    if (to === 'done') { setCompleteCard(card); return; }
    try { await rpcMove(card.id, to); await reload(); }
    catch (err: any) { toast.error(err.message || 'Lỗi'); }
  };

  const renderCard = (c: KanbanCard) => (
    <div key={c.id} className="space-y-1">
      <KanbanCardItem
        card={c}
        skillMap={skillMap}
        flags={flags[c.id]}
        weeklyUpdated={weeklyMap[c.id] === true}
        draggable={!isMobile}
        onUpdate={() => setUpdateCard(c)}
        onComplete={() => setCompleteCard(c)}
        onOpen={() => setDetailCard(c)}
      />
      {isMobile && (
        <div className="flex gap-1 px-1">
          {c.kanban_status === 'todo' && <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleQuickMove(c, 'doing')}>Bắt đầu</Button>}
          {c.kanban_status === 'doing' && <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleQuickMove(c, 'todo')}>Trả về</Button>}
          {c.kanban_status === 'done' && c.completion_status !== 'confirmed' && <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleQuickMove(c, 'doing')}>Chuyển lại Đang làm</Button>}
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2"><KanbanIcon className="w-4 h-4" /> Kanban phát triển cá nhân</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Theo dõi các hành động upskill / cải thiện thái độ đã cam kết trong kỳ</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => navigate('/hanh-dong-phat-trien')}>Xem tất cả</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {!loading && cards.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 rounded-full bg-muted text-foreground">Đang làm: <b>{doingCount}</b></span>
              <span className={`px-2 py-1 rounded-full ${notUpdatedCount > 0 ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300' : 'bg-muted'}`}>Chưa cập nhật tuần này: <b>{notUpdatedCount}</b></span>
              <span className={`px-2 py-1 rounded-full ${overdueCount > 0 ? 'bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300' : 'bg-muted'}`}>Quá hạn: <b>{overdueCount}</b></span>
            </div>
            {notUpdatedCount > 0 && (
              <div className="flex items-center justify-between gap-2 rounded-md border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Bạn có <b>{notUpdatedCount}</b> hành động chưa cập nhật trong tuần này.</span>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={focusRed}>Cập nhật ngay</Button>
              </div>
            )}
          </>
        )}

        {loading ? <p className="text-sm text-muted-foreground">Đang tải...</p> : cards.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có hành động nào. Hãy tạo hành động trong bản tự đánh giá / lộ trình phát triển.</p>
        ) : isMobile ? (
          /*
            ĐIỆN THOẠI: xếp chồng, KHÔNG dùng tab — cùng lý lẽ với Kanban Phòng
            trên trang chủ. Tab chỉ hiện một cột, hai cột kia biến mất sau nhãn;
            cán bộ chưa quen tưởng cột đang mở là tất cả việc của mình rồi cập
            nhật thiếu. Trên web ba cột nằm cạnh nhau nên không ai sót.

            «Hoàn thành» gấp lại sau một nút: thành quả để xem, không phải việc
            phải làm — bày hết ra thì đẩy phần cần làm xuống dưới màn hình.
          */
          <div className="space-y-3">
            {COLS.map(col => {
              const ds = byStatus[col.id];
              const gapDuoc = col.id === 'done';
              const dangMo = !gapDuoc || moXong;
              return (
                <div key={col.id} ref={col.id === 'doing' ? doingColRef : undefined}>
                  {gapDuoc ? (
                    <button
                      type="button"
                      onClick={() => setMoXong(v => !v)}
                      className="flex w-full items-center gap-1.5 rounded-lg bg-muted px-2 py-1.5 text-xs font-semibold text-muted-foreground"
                    >
                      {col.label} <span className="opacity-60">({ds.length})</span>
                      <ChevronDown className={`ml-auto w-3.5 h-3.5 transition-transform ${dangMo ? 'rotate-180' : ''}`} />
                    </button>
                  ) : (
                    <p className="rounded-lg bg-muted px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      {col.label} <span className="opacity-60">({ds.length})</span>
                    </p>
                  )}
                  {dangMo && (
                    <div className="mt-2 space-y-2">
                      {ds.slice(0, limit).map(renderCard)}
                      {ds.length === 0 && <p className="px-1 text-xs text-muted-foreground">Không có card.</p>}
                      {ds.length > limit && (
                        <button onClick={() => navigate('/hanh-dong-phat-trien')} className="w-full px-1 text-left text-xs text-primary hover:underline">
                          Còn {ds.length - limit} card khác...
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDrag}>
            <div className="grid grid-cols-3 gap-3">
              {COLS.map(col => (
                <div key={col.id} ref={col.id === 'doing' ? doingColRef : undefined}>
                  <KanbanColumn id={col.id} title={col.label} count={byStatus[col.id].length}>
                    {byStatus[col.id].slice(0, limit).map(renderCard)}
                    {byStatus[col.id].length > limit && (
                      <button onClick={() => navigate('/hanh-dong-phat-trien')} className="text-xs text-primary hover:underline w-full text-left px-1">
                        Còn {byStatus[col.id].length - limit} card khác...
                      </button>
                    )}
                  </KanbanColumn>
                </div>
              ))}
            </div>
          </DndContext>
        )}
      </CardContent>

      {updateCard && <UpdateProgressDialog card={updateCard} open onClose={() => setUpdateCard(null)} onSaved={reload} />}
      {completeCard && <CompleteRequestDialog cardId={completeCard.id} open onClose={() => setCompleteCard(null)} onSaved={reload} />}
      {detailCard && <CardDetailDialog card={detailCard} open onClose={() => setDetailCard(null)} onChanged={reload} />}
    </Card>
  );
}
