import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, Medal } from 'lucide-react';
import { formatDurationMs } from '@/lib/quizzi';

export interface LiveParticipant {
  nickname: string;
  is_me: boolean;
  joined_at: string;
  answered: number;
  total: number;
  completed: boolean;
  score: number;
  total_time_ms: number;
}

const MEDAL_CLASSES = ['text-yellow-500', 'text-slate-400', 'text-orange-600'];
const PODIUM_EMOJI = ['🥇', '🥈', '🥉'];

/**
 * Bảng xếp hạng phiên live (dùng chung màn điều hành + màn người chơi).
 * `showPodium` bật bục vinh danh top 3 khi phiên kết thúc.
 * Điểm = số câu đúng (100đ/câu) + tốc độ (≤50đ/câu); đồng điểm → nhanh hơn xếp trên.
 */
export function QuizLiveBoard({
  participants,
  running,
  showPodium,
}: {
  participants: LiveParticipant[];
  running: boolean;
  showPodium: boolean;
}) {
  if (participants.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Chưa có ai tham gia.</p>;
  }

  const top3 = participants.slice(0, 3);

  return (
    <div className="space-y-4">
      {showPodium && top3.length > 0 && (
        <div className="flex items-end justify-center gap-3 pt-2">
          {[1, 0, 2].filter((i) => i < top3.length).map((i) => {
            const p = top3[i];
            const height = i === 0 ? 'h-24' : i === 1 ? 'h-16' : 'h-12';
            return (
              <div key={i} className="flex flex-col items-center gap-1 w-24">
                <span className="text-2xl">{PODIUM_EMOJI[i]}</span>
                <span className={`text-xs font-semibold text-center leading-tight line-clamp-2 ${p.is_me ? 'text-primary' : ''}`}>
                  {p.nickname}
                </span>
                <span className="text-sm font-bold">{p.score}</span>
                <div className={`w-full rounded-t-lg bg-primary/15 ${height} flex items-start justify-center pt-1`}>
                  <span className="text-xs font-bold text-primary">#{i + 1}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-1">
        {participants.map((p, i) => (
          <div
            key={`${p.nickname}-${i}`}
            className={`flex items-center gap-3 rounded-lg px-3 py-2
              ${p.is_me ? 'bg-primary/5 border border-primary/30' : i < 3 ? 'bg-muted/50' : ''}`}
          >
            <span className="w-7 text-center shrink-0">
              {i < 3
                ? <Medal className={`w-5 h-5 inline ${MEDAL_CLASSES[i]}`} />
                : <span className="text-sm text-muted-foreground">{i + 1}</span>}
            </span>
            <span className="flex-1 text-sm font-medium truncate">
              {p.nickname}
              {p.is_me && <Badge variant="outline" className="ml-2">Tôi</Badge>}
            </span>
            <span className="text-xs text-muted-foreground shrink-0 inline-flex items-center gap-1">
              {p.completed ? (
                <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {formatDurationMs(p.total_time_ms)}</>
              ) : running && p.answered > 0 ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> câu {p.answered}/{p.total}</>
              ) : running ? (
                'đang vào bài…'
              ) : (
                'đã vào sảnh'
              )}
            </span>
            <span className="text-sm font-bold w-14 text-right shrink-0">{p.score}</span>
          </div>
        ))}
      </div>

      {showPodium && (
        <p className="text-[11px] text-muted-foreground text-center">
          Điểm = câu đúng (100đ/câu) + tốc độ (tối đa +50đ/câu) · đồng điểm xếp theo tổng thời gian nhanh hơn
        </p>
      )}
    </div>
  );
}
