import { useDroppable } from '@dnd-kit/core';
import { ReactNode } from 'react';

interface Props {
  id: string;
  title: string;
  count: number;
  children: ReactNode;
}

export function KanbanColumn({ id, title, count, children }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl bg-muted/40 p-3 min-h-[200px] transition-colors ${isOver ? 'bg-primary/10 ring-2 ring-primary/40' : ''}`}
    >
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
