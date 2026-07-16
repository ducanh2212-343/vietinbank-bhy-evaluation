import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { CardDetailDialog } from './CardDetailDialog';
import { computeBadges, dedupeCards, getSourceLabel, type KanbanCard } from '@/lib/kanban';
import { toast } from 'sonner';
import { Clock, AlertTriangle, Inbox } from 'lucide-react';

interface TeamProfile {
  id: string;
  full_name: string;
  department_id: string | null;
  position: string | null;
  avatar_url: string | null;
}

const STATUS_LABEL: Record<string, string> = { todo: 'Phải làm', doing: 'Đang làm', done: 'Hoàn thành' };

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN');
}

export function TeamReviewPanel() {
  const { profileId, scope, departmentId, visibleDeptIds } = useAuth();
  const [profiles, setProfiles] = useState<TeamProfile[]>([]);
  const [deptMap, setDeptMap] = useState<Record<string, string>>({});
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailCard, setDetailCard] = useState<KanbanCard | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // 1) Danh sách cán bộ trong phạm vi
      let pq = supabase
        .from('profiles')
        .select('id, full_name, department_id, position, avatar_url')
        .eq('status', 'active');
      if (scope === 'department') {
        if (!departmentId) { setProfiles([]); setCards([]); return; }
        pq = pq.eq('department_id', departmentId);
      } else if (scope === 'block') {
        if (!visibleDeptIds.length) { setProfiles([]); setCards([]); return; }
        pq = pq.in('department_id', visibleDeptIds);
      }
      // scope === 'all' → không lọc phòng
      const { data: pData, error: pErr } = await pq;
      if (pErr) { toast.error('Lỗi tải danh sách cán bộ'); return; }
      const list = ((pData as TeamProfile[]) || []).filter(p => p.id !== profileId);
      setProfiles(list);

      // 2) Tên phòng để hiển thị
      const { data: dData, error: dErr } = await supabase.from('departments').select('id, name');
      if (dErr) { toast.error('Lỗi tải danh sách phòng'); }
      const dm: Record<string, string> = {};
      (dData || []).forEach((d: any) => { dm[d.id] = d.name; });
      setDeptMap(dm);

      // 3) Thẻ Kanban của cán bộ (chia lô 100 id)
      const ids = list.map(p => p.id);
      if (!ids.length) { setCards([]); return; }
      const all: KanbanCard[] = [];
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        const { data: cData, error: cErr } = await supabase
          .from('kanban_cards')
          .select('*')
          .in('profile_id', batch)
          .eq('is_active', true);
        if (cErr) { toast.error('Lỗi tải thẻ công việc'); return; }
        all.push(...((cData as KanbanCard[]) || []));
      }
      setCards(all);
    } finally {
      setLoading(false);
    }
  };

  // visibleDeptIds là mảng — dùng chuỗi nối làm dependency ổn định
  const deptKey = visibleDeptIds.join(',');
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [scope, departmentId, deptKey, profileId]);

  // Gom + khử trùng thẻ theo từng cán bộ
  const cardsByProfile = useMemo(() => {
    const m: Record<string, KanbanCard[]> = {};
    for (const c of cards) (m[c.profile_id] ||= []).push(c);
    for (const k of Object.keys(m)) m[k] = dedupeCards(m[k]);
    return m;
  }, [cards]);

  // Hàng đợi ưu tiên: các thẻ chờ QL xác nhận (đợi lâu nhất lên trước)
  const waiting = useMemo(() => {
    const out: { card: KanbanCard; profile: TeamProfile }[] = [];
    for (const p of profiles) {
      for (const c of cardsByProfile[p.id] || []) {
        if (c.completion_status === 'waiting_manager_confirmation') out.push({ card: c, profile: p });
      }
    }
    out.sort((a, b) => (a.card.last_progress_at || a.card.updated_at || '').localeCompare(b.card.last_progress_at || b.card.updated_at || ''));
    return out;
  }, [profiles, cardsByProfile]);

  // Tổng quan theo cán bộ (đưa người có việc chờ / quá hạn lên trước)
  const overview = useMemo(() => {
    const rows = profiles.map(p => {
      const list = cardsByProfile[p.id] || [];
      let todo = 0, doing = 0, done = 0, overdue = 0, waitingCnt = 0;
      for (const c of list) {
        if (c.kanban_status === 'todo') todo++;
        else if (c.kanban_status === 'doing') doing++;
        else if (c.kanban_status === 'done') done++;
        const b = computeBadges(c);
        if (b.overdue) overdue++;
        if (b.waitingConfirm) waitingCnt++;
      }
      return { profile: p, list, todo, doing, done, overdue, waitingCnt, total: list.length };
    });
    rows.sort((a, b) =>
      (b.waitingCnt - a.waitingCnt) ||
      (b.overdue - a.overdue) ||
      a.profile.full_name.localeCompare(b.profile.full_name, 'vi'),
    );
    return rows;
  }, [profiles, cardsByProfile]);

  const detailOwnerName = detailCard ? profiles.find(p => p.id === detailCard.profile_id)?.full_name : undefined;

  if (loading) return <p className="text-muted-foreground">Đang tải...</p>;

  if (!profiles.length) {
    return <p className="text-muted-foreground">Không có cán bộ nào trong phạm vi quản lý của bạn.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Hàng đợi Chờ xác nhận */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Inbox className="w-4 h-4" />
            Chờ xác nhận
            <Badge className="bg-blue-500 hover:bg-blue-500">{waiting.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {waiting.length === 0 && <p className="text-sm text-muted-foreground">Không có thẻ nào chờ xác nhận.</p>}
          {waiting.map(({ card, profile }) => (
            <div key={card.id} className="flex flex-col gap-2 rounded-lg border bg-card/95 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="text-sm font-medium leading-snug">{card.title}</div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{profile.full_name}</span>
                  <Badge variant="secondary" className="text-[10px] py-0">{getSourceLabel(card)}</Badge>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Gửi: {fmtDate(card.last_progress_at)}</span>
                </div>
              </div>
              <Button size="sm" className="shrink-0" onClick={() => setDetailCard(card)}>Xem &amp; duyệt</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tổng quan theo cán bộ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tổng quan đội ngũ ({overview.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {overview.map(row => (
              <AccordionItem key={row.profile.id} value={row.profile.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 pr-3 text-left">
                    <span className="font-medium">{row.profile.full_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {row.profile.department_id ? deptMap[row.profile.department_id] || '—' : '—'}
                    </span>
                    <div className="ml-auto flex flex-wrap items-center gap-1">
                      {row.waitingCnt > 0 && <Badge className="text-[10px] py-0 bg-blue-500 hover:bg-blue-500">Chờ duyệt {row.waitingCnt}</Badge>}
                      {row.overdue > 0 && <Badge variant="destructive" className="text-[10px] py-0">Quá hạn {row.overdue}</Badge>}
                      <Badge variant="outline" className="text-[10px] py-0">Phải làm {row.todo}</Badge>
                      <Badge variant="outline" className="text-[10px] py-0">Đang làm {row.doing}</Badge>
                      <Badge variant="outline" className="text-[10px] py-0">Hoàn thành {row.done}</Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {row.list.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Chưa có thẻ công việc.</p>
                  ) : (
                    <div className="space-y-2">
                      {row.list.map(c => {
                        const b = computeBadges(c);
                        return (
                          <div key={c.id} className="flex flex-col gap-2 rounded-lg border bg-card/95 p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 space-y-1">
                              <div className="text-sm font-medium leading-snug">{c.title}</div>
                              <div className="flex flex-wrap items-center gap-1">
                                <Badge variant="secondary" className="text-[10px] py-0">{getSourceLabel(c)}</Badge>
                                <Badge variant="outline" className="text-[10px] py-0">{STATUS_LABEL[c.kanban_status]}</Badge>
                                <Badge variant="outline" className="text-[10px] py-0">{c.progress_percent}%</Badge>
                                {b.overdue && <Badge variant="destructive" className="text-[10px] py-0 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Quá hạn</Badge>}
                                {b.waitingConfirm && <Badge className="text-[10px] py-0 bg-blue-500 hover:bg-blue-500">Chờ QL xác nhận</Badge>}
                                {b.confirmed && <Badge className="text-[10px] py-0 bg-emerald-600 hover:bg-emerald-600">Đã xác nhận</Badge>}
                                {b.returned && <Badge variant="destructive" className="text-[10px] py-0">Cần làm tiếp</Badge>}
                                {c.deadline && <span className="text-[11px] text-muted-foreground">Hạn: {fmtDate(c.deadline)}</span>}
                              </div>
                            </div>
                            <Button size="sm" variant="outline" className="shrink-0" onClick={() => setDetailCard(c)}>Xem chi tiết</Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {detailCard && (
        <CardDetailDialog
          card={detailCard}
          ownerName={detailOwnerName}
          open
          onClose={() => setDetailCard(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
