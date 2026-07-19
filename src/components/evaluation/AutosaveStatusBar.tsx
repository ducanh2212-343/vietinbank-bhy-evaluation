import { Loader2, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AutosaveState } from '@/hooks/useEvaluationAutosave';

interface Props {
  state: AutosaveState;
  lastSavedAt: Date | null;
  dirty: boolean;
}

/** Dòng trạng thái tự lưu đặt trong thanh nút đáy form; phóng to thành banner khi xung đột. */
export function AutosaveStatusBar({ state, lastSavedAt, dirty }: Props) {
  if (state === 'conflict') {
    return (
      <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/40 px-2.5 py-1.5 text-[11px] text-amber-800 dark:text-amber-300">
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span className="flex-1">
          Phiếu vừa được cập nhật ở nơi khác (tab/máy khác) — tự lưu đã tạm dừng để không ghi đè.
          Hãy sao chép nội dung quan trọng đang gõ dở (nếu có) rồi tải lại trang.
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[11px] shrink-0"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="w-3 h-3 mr-1" /> Tải lại
        </Button>
      </div>
    );
  }

  let icon: React.ReactNode = null;
  let text: string;
  if (state === 'saving') {
    icon = <Loader2 className="w-3 h-3 animate-spin" />;
    text = 'Đang tự lưu…';
  } else if (state === 'error') {
    icon = <AlertTriangle className="w-3 h-3 text-amber-600" />;
    text = 'Chưa tự lưu được — sẽ thử lại';
  } else if (lastSavedAt) {
    icon = <Check className="w-3 h-3 text-emerald-600" />;
    const hhmm = lastSavedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    text = dirty ? `Đã tự lưu ${hhmm} · có thay đổi mới` : `Đã tự lưu ${hhmm}`;
  } else if (dirty) {
    text = 'Có thay đổi chưa lưu — sẽ tự lưu sau vài giây';
  } else {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      {icon}
      <span>{text}</span>
    </div>
  );
}
