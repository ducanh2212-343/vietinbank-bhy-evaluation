import { Flame, Snowflake } from 'lucide-react';

/**
 * Ngọn lửa chuỗi tuần kiểu Duolingo — không phạt, không đếm ngược.
 * `thisWeekDone` đổi màu lửa: đã giữ nhịp tuần này (cam) / chưa (xám).
 */
export function StreakFlame({
  streak,
  freezes,
  thisWeekDone,
  size = 'md',
}: {
  streak: number;
  freezes: number;
  thisWeekDone: boolean;
  size?: 'md' | 'lg';
}) {
  const lg = size === 'lg';
  return (
    <div className="flex items-center gap-3">
      <div className="relative inline-flex">
        <span
          className={`inline-flex items-center justify-center rounded-full
            ${lg ? 'w-16 h-16' : 'w-12 h-12'}
            ${thisWeekDone ? 'bg-orange-100 dark:bg-orange-950/50' : 'bg-muted'}`}
        >
          <Flame
            className={`${lg ? 'w-9 h-9' : 'w-7 h-7'}
              ${thisWeekDone ? 'text-orange-500' : 'text-muted-foreground/40'}`}
          />
        </span>
        {freezes > 0 && (
          <span
            className="absolute -bottom-1 -right-1 inline-flex items-center gap-0.5 rounded-full bg-sky-100 dark:bg-sky-950 px-1.5 py-0.5 text-[10px] font-semibold text-sky-600"
            title={`${freezes} lượt đóng băng chuỗi — tự dùng khi bạn lỡ một tuần`}
          >
            <Snowflake className="w-3 h-3" />
            {freezes}
          </span>
        )}
      </div>
      <div>
        <p className={`font-bold leading-none ${lg ? 'text-3xl' : 'text-xl'}`}>{streak}</p>
        <p className="text-xs text-muted-foreground mt-1">
          tuần liên tiếp{thisWeekDone ? ' · tuần này đã giữ nhịp 🔥' : ' · tuần này chưa làm quiz'}
        </p>
      </div>
    </div>
  );
}
