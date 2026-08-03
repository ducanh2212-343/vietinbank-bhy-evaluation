import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, CheckCheck } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CT2_DAU_MUC, duongDanThongBao, khiNaoThongBao, type Ct2ThongBao } from '@/lib/ct2';
import { cn } from '@/lib/utils';

/**
 * Chuông thông báo Chiêu thức 2 + Phê duyệt tín dụng.
 *
 * Vì sao có chuông trong ứng dụng chứ không chỉ Web Push: trên iPhone chưa cài
 * ứng dụng ra màn hình chính thì KHÔNG nhận được push, và nhiều cán bộ sẽ bấm
 * «Không cho phép» ngay lần hỏi đầu tiên. Bảng ct2_thong_bao mới là nguồn sự
 * thật; push chỉ là một kênh phát. Ai tắt push vẫn thấy đủ ở đây.
 *
 * Không dùng realtime: 150 kết nối websocket cùng lúc đắt hơn nhiều so với một
 * truy vấn nhẹ mỗi 2 phút trên chỉ mục riêng cho «chưa đọc».
 */

const HAI_PHUT = 120_000;

export function Ct2ChuongThongBao() {
  const { profileId, isGuest } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mo, setMo] = useState(false);

  const { data: dsTb = [] } = useQuery({
    queryKey: ['ct2', 'thong-bao', profileId],
    enabled: !!profileId && !isGuest,
    staleTime: HAI_PHUT,
    refetchInterval: HAI_PHUT,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const db = supabase as unknown as {
        from(t: string): {
          select(c: string): {
            eq(c: string, v: unknown): {
              order(c: string, o?: { ascending?: boolean }): {
                limit(n: number): PromiseLike<{ data: unknown; error: unknown }>;
              };
            };
          };
        };
      };
      const { data } = await db.from('ct2_thong_bao')
        .select('id, ma_su_kien, dau_viec_id, tieu_de, noi_dung, muc, created_at, doc_luc')
        .eq('nguoi_nhan', profileId)
        .order('created_at', { ascending: false })
        .limit(20);
      return (data ?? []) as Ct2ThongBao[];
    },
  });

  const chuaDoc = useMemo(() => dsTb.filter((t) => !t.doc_luc), [dsTb]);
  if (!profileId || isGuest) return null;

  const danhDau = async (ids: string[]) => {
    if (!ids.length) return;
    const db = supabase as unknown as { rpc(fn: string, a: Record<string, unknown>): PromiseLike<unknown> };
    await db.rpc('ct2_danh_dau_da_doc', { _ids: ids });
    qc.invalidateQueries({ queryKey: ['ct2', 'thong-bao'] });
  };

  return (
    <DropdownMenu open={mo} onOpenChange={setMo}>
      <DropdownMenuTrigger
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full outline-none transition-colors duration-fast hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={chuaDoc.length ? `${chuaDoc.length} thông báo chưa đọc` : 'Thông báo'}
      >
        <Bell className="h-4 w-4" />
        {chuaDoc.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-2xs font-bold text-white">
            {chuaDoc.length > 9 ? '9+' : chuaDoc.length}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold">Thông báo</p>
          {chuaDoc.length > 0 && (
            <Button
              variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs"
              onClick={() => danhDau(chuaDoc.map((t) => t.id))}
            >
              <CheckCheck className="h-3.5 w-3.5" /> Đánh dấu đã đọc
            </Button>
          )}
        </div>

        {dsTb.length === 0 ? (
          <p className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
            <BellOff className="h-4 w-4 shrink-0" />
            Chưa có thông báo nào. Hệ thống chỉ báo khi việc đổi tay hoặc có lệch
            chuẩn — im lặng nghĩa là mọi thứ đang đúng nhịp.
          </p>
        ) : (
          <div className="max-h-[26rem] overflow-y-auto">
            {dsTb.map((t) => (
              <button
                key={t.id}
                className={cn(
                  'block w-full border-b border-border/60 px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-muted',
                  !t.doc_luc && 'bg-blue-50/60 dark:bg-blue-950/20',
                )}
                onClick={async () => {
                  setMo(false);
                  await danhDau([t.id]);
                  navigate(duongDanThongBao(t));
                }}
              >
                <p className="flex items-start gap-1.5 text-sm font-medium">
                  <span aria-hidden>{CT2_DAU_MUC[t.muc] ?? '🔔'}</span>
                  <span className="flex-1">{t.tieu_de}</span>
                </p>
                <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{t.noi_dung}</p>
                <p className="mt-1 text-2xs text-muted-foreground">{khiNaoThongBao(t.created_at)}</p>
              </button>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
