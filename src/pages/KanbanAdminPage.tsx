// Quản lý hành động Kanban (/quan-ly-hanh-dong) — màn điều hành cho TCTH/BGĐ (toàn
// chi nhánh), PGĐ (khối phụ trách) và Trưởng phòng (phòng mình).
// Trả lời 3 câu hỏi điều hành: (1) toàn cảnh kế hoạch hành động quý đang ở đâu;
// (2) phòng nào / cán bộ nào đang bỏ nhịp cập nhật tuần hoặc quá hạn;
// (3) đi thẳng vào từng thẻ để xem dòng thời gian, xác nhận hoặc trả lại.
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { CardDetailDialog } from '@/components/kanban/CardDetailDialog';
import {
  computeBadges, dedupeCards, getSourceLabel, fetchWeeklyUpdateMap, isWeeklyTracked,
  getVietnamWeekStart, sortCards,
  type KanbanCard, type WeeklyUpdateMap,
} from '@/lib/kanban';
import { toast } from 'sonner';
import { ListChecks, Download, AlertTriangle, Users, Building2 } from 'lucide-react';
import { dongCsv } from '@/lib/xuatCsv';

interface StaffProfile {
  id: string;
  full_name: string;
  department_id: string | null;
  position: string | null;
}

const STATUS_LABEL: Record<string, string> = { todo: 'Phải làm', doing: 'Đang làm', done: 'Hoàn thành' };
type RowFilter = 'all' | 'not_weekly' | 'overdue' | 'waiting';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN');
}

export default function KanbanAdminPage() {
  const { profileId, isAdmin, isManager, isPgd, scope, departmentId, visibleDeptIds, loading: authLoading } = useAuth();
  const canView = isAdmin || isManager || isPgd;
  const [profiles, setProfiles] = useState<StaffProfile[]>([]);
  const [deptMap, setDeptMap] = useState<Record<string, string>>({});
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [weeklyMap, setWeeklyMap] = useState<WeeklyUpdateMap>({});
  const [loading, setLoading] = useState(true);
  const [detailCard, setDetailCard] = useState<KanbanCard | null>(null);
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [rowFilter, setRowFilter] = useState<RowFilter>('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      let pq = supabase
        .from('profiles')
        .select('id, full_name, department_id, position')
        .eq('status', 'active');
      if (scope === 'department') {
        if (!departmentId) { setProfiles([]); setCards([]); return; }
        pq = pq.eq('department_id', departmentId);
      } else if (scope === 'block') {
        if (!visibleDeptIds.length) { setProfiles([]); setCards([]); return; }
        pq = pq.in('department_id', visibleDeptIds);
      } else if (scope === 'self') {
        setProfiles([]); setCards([]); return;
      }
      const { data: pData, error: pErr } = await pq;
      if (pErr) { toast.error('Lỗi tải danh sách cán bộ'); return; }
      const list = (pData as StaffProfile[]) || [];
      setProfiles(list);

      const { data: dData } = await supabase.from('departments').select('id, name');
      const dm: Record<string, string> = {};
      (dData || []).forEach((d: any) => { dm[d.id] = d.name; });
      setDeptMap(dm);

      const ids = list.map(p => p.id);
      const all: KanbanCard[] = [];
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        const { data: cData, error: cErr } = await supabase
          .from('kanban_cards').select('*').in('profile_id', batch).eq('is_active', true);
        if (cErr) { toast.error('Lỗi tải thẻ công việc'); return; }
        all.push(...((cData as KanbanCard[]) || []));
      }
      setCards(all);
      setWeeklyMap(await fetchWeeklyUpdateMap(all));
    } finally {
      setLoading(false);
    }
  };

  const deptKey = visibleDeptIds.join(',');
  useEffect(() => {
    if (!authLoading && canView) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, canView, scope, departmentId, deptKey]);

  // Gom + khử trùng thẻ theo cán bộ
  const cardsByProfile = useMemo(() => {
    const m: Record<string, KanbanCard[]> = {};
    for (const c of cards) (m[c.profile_id] ||= []).push(c);
    for (const k of Object.keys(m)) m[k] = dedupeCards(m[k]);
    return m;
  }, [cards]);

  interface StaffRow {
    profile: StaffProfile;
    list: KanbanCard[];
    deptName: string;
    todo: number; doing: number; done: number;
    tracked: number; notWeekly: number; overdue: number; waiting: number;
  }
  const staffRows: StaffRow[] = useMemo(() => {
    return profiles.map(p => {
      const list = cardsByProfile[p.id] || [];
      let todo = 0, doing = 0, done = 0, tracked = 0, notWeekly = 0, overdue = 0, waiting = 0;
      for (const c of list) {
        if (c.kanban_status === 'todo') todo++;
        else if (c.kanban_status === 'doing') doing++;
        else done++;
        const b = computeBadges(c, new Date(), weeklyMap[c.id]);
        if (isWeeklyTracked(c)) {
          tracked++;
          if (weeklyMap[c.id] === false) notWeekly++;
        }
        if (b.overdue) overdue++;
        if (b.waitingConfirm) waiting++;
      }
      return {
        profile: p, list, deptName: p.department_id ? deptMap[p.department_id] || '—' : '—',
        todo, doing, done, tracked, notWeekly, overdue, waiting,
      };
    });
  }, [profiles, cardsByProfile, weeklyMap, deptMap]);

  // Bảng theo phòng ban (chỉ có ý nghĩa khi phạm vi > 1 phòng)
  const deptRows = useMemo(() => {
    const m = new Map<string, { name: string; staff: number; cards: number; doing: number; done: number; staffNotWeekly: number; overdue: number; waiting: number; staffTracked: number }>();
    for (const r of staffRows) {
      if (!r.list.length) continue;
      const key = r.profile.department_id || '—';
      const e = m.get(key) || { name: r.deptName, staff: 0, cards: 0, doing: 0, done: 0, staffNotWeekly: 0, overdue: 0, waiting: 0, staffTracked: 0 };
      e.staff++;
      e.cards += r.list.length;
      e.doing += r.doing;
      e.done += r.done;
      if (r.tracked > 0) e.staffTracked++;
      if (r.notWeekly > 0) e.staffNotWeekly++;
      e.overdue += r.overdue;
      e.waiting += r.waiting;
      m.set(key, e);
    }
    return Array.from(m.entries())
      .sort((a, b) => (b[1].staffNotWeekly - a[1].staffNotWeekly) || (b[1].overdue - a[1].overdue) || a[1].name.localeCompare(b[1].name, 'vi'));
  }, [staffRows]);

  const totals = useMemo(() => {
    let cardsN = 0, doing = 0, done = 0, overdue = 0, waiting = 0, notWeeklyCards = 0, staffNotWeekly = 0;
    for (const r of staffRows) {
      cardsN += r.list.length; doing += r.doing; done += r.done;
      overdue += r.overdue; waiting += r.waiting; notWeeklyCards += r.notWeekly;
      if (r.notWeekly > 0) staffNotWeekly++;
    }
    return { cardsN, doing, done, overdue, waiting, notWeeklyCards, staffNotWeekly };
  }, [staffRows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staffRows
      .filter(r => r.list.length > 0)
      .filter(r => deptFilter === 'all' || r.profile.department_id === deptFilter)
      .filter(r => !q || r.profile.full_name.toLowerCase().includes(q))
      .filter(r => {
        if (rowFilter === 'not_weekly') return r.notWeekly > 0;
        if (rowFilter === 'overdue') return r.overdue > 0;
        if (rowFilter === 'waiting') return r.waiting > 0;
        return true;
      })
      .sort((a, b) => (b.notWeekly - a.notWeekly) || (b.overdue - a.overdue) || (b.waiting - a.waiting) ||
        a.profile.full_name.localeCompare(b.profile.full_name, 'vi'));
  }, [staffRows, deptFilter, rowFilter, search]);

  const weekStart = getVietnamWeekStart();
  const weekLabel = `${weekStart.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit' })} – nay`;

  const exportCsv = () => {
    // Tên cán bộ và tiêu đề thẻ do người dùng tự gõ nên phải qua dongCsv:
    // vừa chặn ô mở đầu bằng '=' chạy như công thức trên máy người mở tệp, vừa
    // giữ đúng cột khi tiêu đề có dấu ';'. Xem src/lib/xuatCsv.ts.
    const lines = [dongCsv(['Cán bộ', 'Phòng', 'Hành động', 'Nguồn', 'Trạng thái', 'Tiến độ %', 'Cập nhật tuần này', 'Quá hạn', 'Hạn', 'Cập nhật gần nhất'])];
    for (const r of filteredRows) {
      for (const c of r.list) {
        const b = computeBadges(c, new Date(), weeklyMap[c.id]);
        lines.push(dongCsv([
          r.profile.full_name, r.deptName, c.title || '', getSourceLabel(c),
          STATUS_LABEL[c.kanban_status] || c.kanban_status, c.progress_percent,
          isWeeklyTracked(c) ? (weeklyMap[c.id] ? 'Đã cập nhật' : 'CHƯA') : '—',
          b.overdue ? 'QUÁ HẠN' : '', c.deadline || '', fmtDate(c.last_progress_at),
        ]));
      }
    }
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'quan-ly-hanh-dong-kanban.csv';
    a.click();
  };

  if (authLoading || loading) return <div className="p-6 text-muted-foreground">Đang tải…</div>;
  if (!canView) return <div className="p-6 text-muted-foreground">Màn hình dành cho Trưởng phòng, Ban Giám đốc và Phòng TCTH.</div>;

  const detailOwner = detailCard ? profiles.find(p => p.id === detailCard.profile_id) : null;
  const deptOptions = Array.from(new Set(profiles.map(p => p.department_id).filter(Boolean) as string[]))
    .map(id => ({ id, name: deptMap[id] || '—' }))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-header flex items-center gap-2">
            <ListChecks className="w-6 h-6 text-primary" /> Quản lý hành động Kanban
          </h1>
          <p className="page-subtitle">
            Kế hoạch hành động quý của {scope === 'all' ? 'toàn chi nhánh' : scope === 'block' ? 'khối phụ trách' : 'phòng'} —
            tuần hiện tại: {weekLabel}. Quy ước: mỗi thẻ chưa xong phải có ít nhất 1 cập nhật/tuần (T2 → hết CN).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filteredRows.length}>
          <Download className="w-4 h-4 mr-1" /> Xuất CSV
        </Button>
      </div>

      {/* Thẻ thống kê */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Tổng thẻ', value: totals.cardsN, tone: '' },
          { label: 'Đang làm', value: totals.doing, tone: 'text-blue-600 dark:text-blue-400' },
          { label: 'Hoàn thành', value: totals.done, tone: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'CB chưa cập nhật tuần', value: totals.staffNotWeekly, tone: totals.staffNotWeekly ? 'text-amber-600 dark:text-amber-400' : '' },
          { label: 'Quá hạn', value: totals.overdue, tone: totals.overdue ? 'text-rose-600 dark:text-rose-400' : '' },
          { label: 'Chờ xác nhận', value: totals.waiting, tone: totals.waiting ? 'text-blue-600 dark:text-blue-400' : '' },
        ].map(t => (
          <Card key={t.label}>
            <CardContent className="py-3 px-4">
              <div className={`text-2xl font-bold ${t.tone}`}>{t.value}</div>
              <div className="text-xs text-muted-foreground leading-tight">{t.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bảng phòng ban — chỉ hiện khi phạm vi nhiều phòng */}
      {deptRows.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Theo phòng ban
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="py-2 pr-3">Phòng</th>
                  <th className="py-2 pr-3 text-right">CB có thẻ</th>
                  <th className="py-2 pr-3 text-right">Thẻ</th>
                  <th className="py-2 pr-3 text-right">Đang làm</th>
                  <th className="py-2 pr-3 text-right">Hoàn thành</th>
                  <th className="py-2 pr-3 text-right">CB chưa cập nhật tuần</th>
                  <th className="py-2 pr-3 text-right">Quá hạn</th>
                  <th className="py-2 text-right">Chờ duyệt</th>
                </tr>
              </thead>
              <tbody>
                {deptRows.map(([deptId, d]) => (
                  <tr key={deptId}
                      className={`border-b last:border-0 cursor-pointer hover:bg-muted/50 ${deptFilter === deptId ? 'bg-muted/60' : ''}`}
                      onClick={() => setDeptFilter(prev => prev === deptId ? 'all' : deptId)}>
                    <td className="py-2 pr-3 font-medium">{d.name}</td>
                    <td className="py-2 pr-3 text-right">{d.staff}</td>
                    <td className="py-2 pr-3 text-right">{d.cards}</td>
                    <td className="py-2 pr-3 text-right">{d.doing}</td>
                    <td className="py-2 pr-3 text-right">{d.done}</td>
                    <td className={`py-2 pr-3 text-right font-semibold ${d.staffNotWeekly ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {d.staffNotWeekly}/{d.staffTracked}
                    </td>
                    <td className={`py-2 pr-3 text-right ${d.overdue ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}`}>{d.overdue}</td>
                    <td className={`py-2 text-right ${d.waiting ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}`}>{d.waiting}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[11px] text-muted-foreground mt-2">Bấm vào một phòng để lọc danh sách cán bộ bên dưới.</p>
          </CardContent>
        </Card>
      )}

      {/* Bộ lọc cán bộ */}
      <Card>
        <CardContent className="pt-4 flex flex-wrap gap-3 items-center">
          <Input placeholder="Tìm theo tên cán bộ…" value={search} onChange={e => setSearch(e.target.value)} className="w-[220px] h-9" />
          {deptOptions.length > 1 && (
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-[220px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả phòng ban</SelectItem>
                {deptOptions.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={rowFilter} onValueChange={(v: any) => setRowFilter(v)}>
            <SelectTrigger className="w-[230px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả cán bộ có thẻ</SelectItem>
              <SelectItem value="not_weekly">Chưa cập nhật tuần này</SelectItem>
              <SelectItem value="overdue">Có thẻ quá hạn</SelectItem>
              <SelectItem value="waiting">Có thẻ chờ xác nhận</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> {filteredRows.length} cán bộ
          </span>
        </CardContent>
      </Card>

      {/* Danh sách cán bộ */}
      <Card>
        <CardContent className="pt-2">
          {filteredRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Không có cán bộ nào khớp bộ lọc.</p>
          ) : (
            <Accordion type="multiple" className="w-full">
              {filteredRows.map(r => (
                <AccordionItem key={r.profile.id} value={r.profile.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 pr-3 text-left">
                      <span className="font-medium">{r.profile.full_name}</span>
                      <span className="text-xs text-muted-foreground">{r.deptName}</span>
                      <div className="ml-auto flex flex-wrap items-center gap-1">
                        {r.notWeekly > 0 && (
                          <Badge className="text-[10px] py-0 bg-amber-500 hover:bg-amber-500">
                            <AlertTriangle className="w-3 h-3 mr-0.5" /> Chưa cập nhật tuần {r.notWeekly}
                          </Badge>
                        )}
                        {r.overdue > 0 && <Badge variant="destructive" className="text-[10px] py-0">Quá hạn {r.overdue}</Badge>}
                        {r.waiting > 0 && <Badge className="text-[10px] py-0 bg-blue-500 hover:bg-blue-500">Chờ duyệt {r.waiting}</Badge>}
                        <Badge variant="outline" className="text-[10px] py-0">Phải làm {r.todo}</Badge>
                        <Badge variant="outline" className="text-[10px] py-0">Đang làm {r.doing}</Badge>
                        <Badge variant="outline" className="text-[10px] py-0">Hoàn thành {r.done}</Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {sortCards(r.list, { weeklyMap }).map(c => {
                        const b = computeBadges(c, new Date(), weeklyMap[c.id]);
                        return (
                          <div key={c.id} className="flex flex-col gap-2 rounded-lg border bg-card/95 p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 space-y-1">
                              <div className="text-sm font-medium leading-snug">{c.title}</div>
                              <div className="flex flex-wrap items-center gap-1">
                                <Badge variant="secondary" className="text-[10px] py-0">{getSourceLabel(c)}</Badge>
                                <Badge variant="outline" className="text-[10px] py-0">{STATUS_LABEL[c.kanban_status]}</Badge>
                                <Badge variant="outline" className="text-[10px] py-0">{c.progress_percent}%</Badge>
                                {b.notUpdatedThisWeek && <Badge className="text-[10px] py-0 bg-amber-500 hover:bg-amber-500">Chưa cập nhật tuần này</Badge>}
                                {b.updatedThisWeek && !b.notUpdatedThisWeek && (
                                  <Badge variant="outline" className="text-[10px] py-0 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300">Đã cập nhật tuần này</Badge>
                                )}
                                {b.overdue && <Badge variant="destructive" className="text-[10px] py-0">Quá hạn</Badge>}
                                {b.waitingConfirm && <Badge className="text-[10px] py-0 bg-blue-500 hover:bg-blue-500">Chờ QL xác nhận</Badge>}
                                {b.confirmed && <Badge className="text-[10px] py-0 bg-emerald-600 hover:bg-emerald-600">Đã xác nhận</Badge>}
                                {b.returned && <Badge variant="destructive" className="text-[10px] py-0">Cần làm tiếp</Badge>}
                                {c.deadline && <span className="text-[11px] text-muted-foreground">Hạn: {fmtDate(c.deadline)}</span>}
                                <span className="text-[11px] text-muted-foreground">Cập nhật cuối: {fmtDate(c.last_progress_at)}</span>
                              </div>
                            </div>
                            <Button size="sm" variant="outline" className="shrink-0" onClick={() => setDetailCard(c)}>
                              Xem &amp; duyệt
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {detailCard && (
        <CardDetailDialog
          card={detailCard}
          ownerName={detailCard.profile_id === profileId ? undefined : detailOwner?.full_name}
          open
          onClose={() => setDetailCard(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
