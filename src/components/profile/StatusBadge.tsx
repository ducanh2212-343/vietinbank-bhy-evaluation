import { Info } from 'lucide-react';
import { getFormStatusMeta } from '@/lib/approvedForm';
import { cn } from '@/lib/utils';

export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  const meta = getFormStatusMeta(status);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
        meta.badgeClass,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}

export function StatusNoteBanner({
  status,
  cycleName,
  className,
}: {
  status: string | null | undefined;
  cycleName?: string;
  className?: string;
}) {
  const meta = getFormStatusMeta(status);
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2 text-xs',
        meta.badgeClass,
        className,
      )}
    >
      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="space-y-0.5">
        <div className="font-semibold">
          Kỳ {cycleName || '—'} · {meta.label}
        </div>
        <div className="opacity-90">{meta.note}</div>
        {!meta.isApproved && (
          <div className="opacity-90 italic">Lưu ý: số liệu có thể còn thay đổi sau khi lãnh đạo duyệt.</div>
        )}
      </div>
    </div>
  );
}
