import { supabase } from '@/integrations/supabase/client';
import { ATTITUDE_DIMENSIONS } from '@/components/bm/AttitudeConstants';

export type KanbanStatus = 'todo' | 'doing' | 'done';
export type CompletionStatus = 'none' | 'waiting_manager_confirmation' | 'confirmed' | 'returned';
export type SourceType = 'skill_upskill' | 'attitude_improvement' | 'ai_application' | 'manager_assigned' | 'carry_over';

export interface KanbanCard {
  id: string;
  profile_id: string;
  form_id: string;
  cycle_id: string | null;
  source_type: SourceType;
  source_table: string;
  source_action_id: string | null;
  title: string;
  skill_id: string | null;
  attitude_dimension_id: number | null;
  learning_mode: string | null;
  deadline: string | null;
  kanban_status: KanbanStatus;
  completion_status: CompletionStatus;
  progress_percent: number;
  started_at: string | null;
  completed_at: string | null;
  last_progress_at: string | null;
  next_update_due_at: string | null;
  manager_confirmed_by: string | null;
  manager_confirmed_at: string | null;
  /** Thẻ sinh từ "Dấu ấn Bắc Hưng Yên Mark" thì trỏ về leadership_marks.id */
  leadership_mark_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SkillMeta { id: string; code: string | null; name: string }
export type SkillMetaMap = Record<string, SkillMeta>;

export interface CardActivityFlags {
  hasBlocker: boolean;
  needsSupport: boolean;
  hasEvidence: boolean;
}
export type ActivityFlagsMap = Record<string, CardActivityFlags>;

export const SOURCE_LABEL: Record<SourceType, string> = {
  skill_upskill: 'Skill',
  attitude_improvement: 'Thái độ',
  ai_application: 'AI áp dụng',
  manager_assigned: 'Lãnh đạo giao',
  carry_over: 'Chuyển tiếp',
};

/** Nhãn nguồn của thẻ: thẻ sinh từ dấu ấn BGĐ giao hiển thị "Dấu ấn" thay vì nhãn chung. */
export function getSourceLabel(card: Pick<KanbanCard, 'source_type' | 'leadership_mark_id'>): string {
  if (card.leadership_mark_id) return 'Dấu ấn';
  return SOURCE_LABEL[card.source_type];
}

export const QUICK_STATUS_OPTIONS = [
  'Bình thường',
  'Có vướng mắc',
  'Cần hỗ trợ',
  'Có bằng chứng',
  'Sẵn sàng hoàn thành',
] as const;
export type QuickStatus = typeof QUICK_STATUS_OPTIONS[number];

export const QUICK_SUGGESTIONS = [
  'Đã bắt đầu thực hiện.',
  'Đang đọc tài liệu liên quan.',
  'Đã áp dụng vào hồ sơ thực tế.',
  'Đang chờ góp ý từ quản lý.',
  'Có vướng mắc cần hỗ trợ:',
  'Sẵn sàng gửi hoàn thành.',
];

export function getAttitudeLabel(dimId: number | null): string | null {
  if (!dimId) return null;
  const d = ATTITUDE_DIMENSIONS.find(x => x.id === dimId);
  return d ? `Thái độ ${d.id} · ${d.name}` : null;
}

export function getSkillLabel(skillId: string | null, map: SkillMetaMap): string | null {
  if (!skillId) return null;
  const s = map[skillId];
  if (!s) return null;
  return s.code ? `${s.code} · ${s.name}` : s.name;
}

export function isTitleMissing(title: string | null | undefined): boolean {
  if (!title) return true;
  const t = title.trim().toLowerCase();
  return t === '' || t === '(chưa đặt tên)' || t.startsWith('chưa nhập');
}

export function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

export interface CardBadges {
  needsUpdate: boolean;
  overdue: boolean;
  dueSoon: boolean;
  waitingConfirm: boolean;
  confirmed: boolean;
  returned: boolean;
  needsContent: boolean;
  notUpdatedThisWeek: boolean;
  updatedThisWeek: boolean;
}

/** Thứ Hai 00:00 giờ VN (UTC+7) của tuần hiện tại, trả về Date UTC. */
export function getVietnamWeekStart(now: Date = new Date()): Date {
  const vn = new Date(now.getTime() + 7 * 3600 * 1000);
  const day = vn.getUTCDay(); // 0=CN..6=T7
  const offset = day === 0 ? 6 : day - 1;
  const mondayVn = Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate() - offset, 0, 0, 0);
  return new Date(mondayVn - 7 * 3600 * 1000);
}

export type WeeklyUpdateMap = Record<string, boolean>;

/**
 * 1 query: log hợp lệ trong tuần hiện tại, gom theo card_id.
 * Mọi thẻ truyền vào đều có mặt trong map (false nếu chưa cập nhật) — nhờ đó
 * sortCards/computeBadges phân biệt được "chưa cập nhật" với "không có dữ liệu".
 * Log 'created' trong tuần cũng tính là đạt: thẻ vừa sinh từ phiếu được ân hạn
 * tuần đầu, sang tuần sau mới bắt đầu báo đỏ.
 */
export async function fetchWeeklyUpdateMap(cards: KanbanCard[]): Promise<WeeklyUpdateMap> {
  const ids = cards.map(c => c.id);
  if (!ids.length) return {};
  const out: WeeklyUpdateMap = {};
  ids.forEach(id => { out[id] = false; });
  const weekStart = getVietnamWeekStart().toISOString();
  const { data, error } = await supabase
    .from('kanban_card_logs')
    .select('card_id, log_type, created_at')
    .in('card_id', ids)
    .gte('created_at', weekStart);
  if (error) return out;
  (data || []).forEach((r: any) => {
    const t = r.log_type as string;
    const valid =
      t === 'progress_update' ||
      t === 'completion_requested' ||
      t === 'evidence_added' ||
      t === 'created';
    if (valid) out[r.card_id] = true;
  });
  return out;
}

/**
 * Thẻ nào phải theo nhịp cập nhật hằng tuần?
 * MỌI thẻ của kế hoạch hành động quý còn hiệu lực — kể cả đang nằm 'todo'.
 * (Trước đây chỉ soi thẻ 'doing' + dấu ấn nên ai để nguyên thẻ ở "Phải làm"
 * suốt quý sẽ không bao giờ bị báo đỏ.) Ngoại lệ:
 * - thẻ 'done' (đã xong, chỉ chờ/được xác nhận);
 * - thẻ placeholder chưa có nội dung (đã có cảnh báo "Cần bổ sung" riêng).
 */
export function isWeeklyTracked(card: Pick<KanbanCard, 'kanban_status' | 'title'>): boolean {
  if (card.kanban_status === 'done') return false;
  if (isTitleMissing(card.title)) return false;
  return true;
}

/** Ngày (YYYY-MM-DD) theo giờ Việt Nam của một thời điểm. */
export function toVietnamDateString(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

export function computeBadges(c: KanbanCard, now = new Date(), weeklyUpdated?: boolean): CardBadges {
  // So sánh theo NGÀY giờ VN: quá hạn khi đã sang ngày sau deadline
  // (trước đây new Date('YYYY-MM-DD') hiểu là 00:00 UTC → báo quá hạn từ 7h sáng ngày hạn)
  const todayVn = toVietnamDateString(now);
  const overdue = !!c.deadline && c.kanban_status !== 'done' && c.deadline < todayVn;
  const dueSoon = !overdue && !!c.deadline && c.kanban_status !== 'done' && (() => {
    const d = Math.round((Date.parse(c.deadline!) - Date.parse(todayVn)) / 86400000);
    return d >= 0 && d <= 3;
  })();
  const needsUpdate =
    c.kanban_status === 'doing' &&
    (!c.last_progress_at || daysBetween(now, new Date(c.last_progress_at)) > 7);
  const weeklyTracked = isWeeklyTracked(c);
  return {
    needsUpdate,
    overdue,
    dueSoon,
    waitingConfirm: c.completion_status === 'waiting_manager_confirmation',
    confirmed: c.completion_status === 'confirmed',
    returned: c.completion_status === 'returned',
    needsContent: isTitleMissing(c.title),
    notUpdatedThisWeek: weeklyTracked && weeklyUpdated === false,
    updatedThisWeek: weeklyTracked && weeklyUpdated === true,
  };
}

export interface SortContext {
  weeklyMap?: WeeklyUpdateMap;
  flagsMap?: ActivityFlagsMap;
}

export function sortCards(list: KanbanCard[], ctx: SortContext = {}): KanbanCard[] {
  return [...list].sort((a, b) => {
    const ba = computeBadges(a, new Date(), ctx.weeklyMap?.[a.id]);
    const bb = computeBadges(b, new Date(), ctx.weeklyMap?.[b.id]);
    const fa = ctx.flagsMap?.[a.id];
    const fb = ctx.flagsMap?.[b.id];
    const rank = (badges: CardBadges, flags?: CardActivityFlags) =>
      badges.overdue ? 0
      : badges.notUpdatedThisWeek ? 1
      : (flags?.hasBlocker || flags?.needsSupport) ? 2
      : badges.dueSoon ? 3
      : 4;
    const pa = rank(ba, fa), pb = rank(bb, fb);
    if (pa !== pb) return pa - pb;
    return (a.deadline || '9999').localeCompare(b.deadline || '9999');
  });
}

export async function fetchMyCards(profileId: string): Promise<KanbanCard[]> {
  const { data, error } = await supabase
    .from('kanban_cards')
    .select('*')
    .eq('profile_id', profileId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return dedupeCards((data as KanbanCard[]) || []);
}

/**
 * Lớp bảo vệ thứ 2 chống render trùng card Kanban.
 * - Loại placeholder (title rỗng/'(Chưa đặt tên)'/…) khi cùng (form_id, source_type, skill_id|attitude_dimension_id) đã có card thật.
 * - Gộp các card có cùng (form_id, source_type, skill_id|attitude_dim, normalized title), giữ winner theo:
 *   done > doing > todo, rồi progress_percent cao hơn, rồi last_progress_at mới hơn, rồi updated_at mới hơn.
 */
export function dedupeCards(list: KanbanCard[]): KanbanCard[] {
  if (!list.length) return list;
  const statusRank = (s: KanbanStatus) => (s === 'done' ? 3 : s === 'doing' ? 2 : 1);
  const score = (c: KanbanCard) => [
    statusRank(c.kanban_status),
    c.progress_percent || 0,
    c.last_progress_at ? new Date(c.last_progress_at).getTime() : 0,
    c.updated_at ? new Date(c.updated_at).getTime() : 0,
  ];
  const better = (a: KanbanCard, b: KanbanCard) => {
    const sa = score(a), sb = score(b);
    for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sa[i] > sb[i] ? a : b;
    return a;
  };

  // Bước 1: nhóm theo placeholder vs real cho (form_id, source_type, skill_id|attitude)
  const groupKey = (c: KanbanCard) =>
    `${c.form_id}|${c.source_type}|${c.skill_id || ''}|${c.attitude_dimension_id || ''}`;
  const hasReal = new Set<string>();
  for (const c of list) if (!isTitleMissing(c.title)) hasReal.add(groupKey(c));
  const stage1 = list.filter(c => !(isTitleMissing(c.title) && hasReal.has(groupKey(c))));

  // Bước 2: gộp theo nội dung
  const contentKey = (c: KanbanCard) =>
    `${c.form_id}|${c.source_type}|${c.skill_id || ''}|${c.attitude_dimension_id || ''}|${(c.title || '').trim().toLowerCase()}`;
  const winners = new Map<string, KanbanCard>();
  for (const c of stage1) {
    const k = contentKey(c);
    const prev = winners.get(k);
    winners.set(k, prev ? better(prev, c) : c);
  }
  return Array.from(winners.values());
}

export async function fetchSkillMetaForCards(cards: KanbanCard[]): Promise<SkillMetaMap> {
  const ids = Array.from(new Set(cards.map(c => c.skill_id).filter(Boolean) as string[]));
  if (!ids.length) return {};
  const { data, error } = await supabase
    .from('skill_catalog').select('id, code, name').in('id', ids);
  if (error) return {};
  const map: SkillMetaMap = {};
  (data || []).forEach((r: any) => { map[r.id] = { id: r.id, code: r.code, name: r.name }; });
  return map;
}

/**
 * Single query — fetch recent progress logs for all visible cards and reduce to per-card flags.
 * Only inspects the latest log per card that has any of the flag fields populated.
 */
export async function fetchActivityFlagsForCards(cards: KanbanCard[]): Promise<ActivityFlagsMap> {
  const ids = cards.map(c => c.id);
  if (!ids.length) return {};
  const { data, error } = await supabase
    .from('kanban_card_logs')
    .select('card_id, blocker_note, support_needed, evidence_text, evidence_url, created_at')
    .in('card_id', ids)
    .eq('log_type', 'progress_update')
    .order('created_at', { ascending: false });
  if (error) return {};
  const seen: Record<string, boolean> = {};
  const out: ActivityFlagsMap = {};
  (data || []).forEach((r: any) => {
    if (seen[r.card_id]) return;
    seen[r.card_id] = true;
    out[r.card_id] = {
      hasBlocker: !!(r.blocker_note && String(r.blocker_note).trim()),
      needsSupport: !!(r.support_needed && String(r.support_needed).trim()),
      hasEvidence: !!((r.evidence_text && String(r.evidence_text).trim()) || (r.evidence_url && String(r.evidence_url).trim())),
    };
  });
  return out;
}

export async function rpcMove(cardId: string, newStatus: KanbanStatus) {
  const { error } = await supabase.rpc('move_kanban_card', { _card_id: cardId, _new_status: newStatus });
  if (error) throw error;
}

export async function rpcUpdateProgress(cardId: string, params: {
  progress_percent: number;
  progress_note: string;
  current_result?: string | null;
  blocker_note?: string | null;
  next_step?: string | null;
  support_needed?: string | null;
  evidence_text?: string | null;
  evidence_url?: string | null;
}) {
  const { error } = await supabase.rpc('update_kanban_progress', {
    _card_id: cardId,
    _progress_percent: params.progress_percent,
    _progress_note: params.progress_note,
    _current_result: params.current_result ?? null,
    _blocker_note: params.blocker_note ?? null,
    _next_step: params.next_step ?? null,
    _support_needed: params.support_needed ?? null,
    _evidence_text: params.evidence_text ?? null,
    _evidence_url: params.evidence_url ?? null,
  });
  if (error) throw error;
}

export async function rpcRequestCompletion(cardId: string, current_result: string, evidence_text: string, evidence_url?: string) {
  const { error } = await supabase.rpc('request_kanban_completion', {
    _card_id: cardId,
    _current_result: current_result,
    _evidence_text: evidence_text,
    _evidence_url: evidence_url ?? null,
  });
  if (error) throw error;
}

export async function rpcConfirm(cardId: string, note?: string) {
  const { error } = await supabase.rpc('confirm_kanban_completion', { _card_id: cardId, _note: note ?? null });
  if (error) throw error;
}

export async function rpcReturn(cardId: string, reason: string) {
  const { error } = await supabase.rpc('return_kanban_card', { _card_id: cardId, _reason: reason });
  if (error) throw error;
}
