import { useDraggable } from '@dnd-kit/core';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  computeBadges, SOURCE_LABEL, getAttitudeLabel, getSkillLabel,
  type KanbanCard as Card, type SkillMetaMap, type CardActivityFlags,
} from '@/lib/kanban';
import { Calendar, Clock, FileWarning } from 'lucide-react';

interface Props {
  card: Card;
  skillMap?: SkillMetaMap;
  flags?: CardActivityFlags;
  weeklyUpdated?: boolean;
  onUpdate: () => void;
  onComplete: () => void;
  onOpen: () => void;
  draggable?: boolean;
}

export function KanbanCardItem({ card, skillMap = {}, flags, weeklyUpdated, onUpdate, onComplete, onOpen, draggable = true }: Props) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id, disabled: !draggable });
  const b = computeBadges(card, new Date(), weeklyUpdated);
  const skillLabel = getSkillLabel(card.skill_id, skillMap);
  const attitudeLabel = getAttitudeLabel(card.attitude_dimension_id);
  const contextLabel = skillLabel || attitudeLabel;

  const stop = (e: React.MouseEvent | React.PointerEvent) => { e.stopPropagation(); };

  const dragProps = draggable ? { ...attributes, ...listeners } : {};

  return (
    <div
      ref={setNodeRef}
      {...dragProps}
      className={`group rounded-xl border bg-card/95 p-3 shadow-sm space-y-2 ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'opacity-50' : ''}`}
    >
      {b.needsContent ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-amber-700">
            <FileWarning className="w-4 h-4" />
            <span className="text-sm font-medium">Chưa có nội dung hành động</span>
          </div>
          <Badge className="text-[10px] py-0 bg-amber-500 hover:bg-amber-500">Cần bổ sung</Badge>
        </div>
      ) : (
        <button
          onClick={(e) => { stop(e); onOpen(); }}
          onPointerDown={stop}
          className="block w-full text-left text-sm font-medium leading-snug hover:underline line-clamp-3"
        >
          {card.title}
        </button>
      )}

      {contextLabel && (
        <div className="text-xs text-muted-foreground truncate" title={contextLabel}>
          {contextLabel}
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        <Badge variant="secondary" className="text-[10px] py-0">{SOURCE_LABEL[card.source_type]}</Badge>
        {card.learning_mode && <Badge variant="outline" className="text-[10px] py-0">{card.learning_mode}%</Badge>}
        {b.overdue && <Badge variant="destructive" className="text-[10px] py-0">Quá hạn</Badge>}
        {b.notUpdatedThisWeek && <Badge className="text-[10px] py-0 bg-amber-500 hover:bg-amber-500">Chưa cập nhật tuần này</Badge>}
        {flags?.hasBlocker && <Badge variant="outline" className="text-[10px] py-0 border-rose-300 text-rose-700">Có vướng mắc</Badge>}
        {flags?.needsSupport && <Badge variant="outline" className="text-[10px] py-0 border-violet-300 text-violet-700">Cần hỗ trợ</Badge>}
        {b.dueSoon && <Badge className="text-[10px] py-0 bg-orange-400 hover:bg-orange-400">Sắp đến hạn</Badge>}
        {b.waitingConfirm && <Badge className="text-[10px] py-0 bg-blue-500 hover:bg-blue-500">Chờ QL xác nhận</Badge>}
        {b.confirmed && <Badge className="text-[10px] py-0 bg-emerald-600 hover:bg-emerald-600">Đã xác nhận</Badge>}
        {b.returned && <Badge variant="destructive" className="text-[10px] py-0">Cần làm tiếp</Badge>}
        {b.updatedThisWeek && !b.overdue && !b.notUpdatedThisWeek && (
          <Badge variant="outline" className="text-[10px] py-0 border-emerald-300 text-emerald-700">Đã cập nhật tuần này</Badge>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          {card.deadline && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{card.deadline}</span>}
          {card.last_progress_at && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(card.last_progress_at).toLocaleDateString('vi-VN')}</span>}
        </div>
        <span className="font-semibold text-foreground">{card.progress_percent}%</span>
      </div>

      <div className="flex flex-wrap gap-1" onPointerDown={stop}>
        {b.needsContent ? (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs flex-1"
            onClick={(e) => {
              stop(e);
              const focus = card.source_action_id ? `&focus=${card.source_table}:${card.source_action_id}` : '';
              navigate(`/tu-danh-gia?form=${card.form_id}${focus}`);
            }}
          >
            Bổ sung hành động
          </Button>
        ) : (
          <>
            {card.kanban_status !== 'done' && (
              <Button size="sm" variant="outline" className="h-8 text-xs flex-1" onClick={(e) => { stop(e); onUpdate(); }}>
                Cập nhật
              </Button>
            )}
            {card.kanban_status === 'doing' && (
              <Button size="sm" className="h-8 text-xs" onClick={(e) => { stop(e); onComplete(); }}>
                Gửi hoàn thành
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={(e) => { stop(e); onOpen(); }}>
              Xem chi tiết
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
