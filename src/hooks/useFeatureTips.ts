// Mẹo tính năng hay theo nhóm người dùng: tải tip đang hiệu lực khớp vai trò
// của mình + trạng thái đã xem/đã đóng, và ghi trạng thái khi tương tác.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface FeatureTip {
  id: string;
  title: string;
  content: string;
  cta_url: string | null;
  cta_label: string | null;
  target_roles: string[];
  display_mode: string;
  priority: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export interface TipState {
  tip_id: string;
  seen_at: string | null;
  dismissed_at: string | null;
}

/** target_roles rỗng = áp dụng mọi người; ngược lại cần giao với vai trò của user. */
export function tipMatchesRoles(targetRoles: string[], userRoles: string[]): boolean {
  if (targetRoles.length === 0) return true;
  return targetRoles.some((r) => userRoles.includes(r));
}

/** Tip đang trong khung thời gian hiệu lực (starts_at/ends_at null = không giới hạn). */
export function tipInDateWindow(tip: Pick<FeatureTip, 'starts_at' | 'ends_at'>, now: Date = new Date()): boolean {
  if (tip.starts_at && new Date(tip.starts_at) > now) return false;
  if (tip.ends_at && new Date(tip.ends_at) < now) return false;
  return true;
}

export function useFeatureTips() {
  const { profileId, roles } = useAuth();
  const [tips, setTips] = useState<FeatureTip[]>([]);
  const [states, setStates] = useState<Map<string, TipState>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profileId) return;
    const [tipsRes, statesRes] = await Promise.all([
      supabase
        .from('feature_tips')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('feature_tip_states')
        .select('tip_id, seen_at, dismissed_at')
        .eq('profile_id', profileId),
    ]);
    const now = new Date();
    const matched = ((tipsRes.data as FeatureTip[]) || []).filter(
      (t) => tipMatchesRoles(t.target_roles, roles) && tipInDateWindow(t, now),
    );
    setTips(matched);
    setStates(new Map(((statesRes.data as TipState[]) || []).map((s) => [s.tip_id, s])));
    setLoading(false);
  }, [profileId, roles]);

  useEffect(() => {
    let cancelled = false;
    if (!profileId) return;
    load().catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [profileId, load]);

  const writeState = useCallback(
    async (tipId: string, patch: { seen_at?: string; dismissed_at?: string }) => {
      if (!profileId) return;
      // Cập nhật lạc quan để banner/modal biến mất ngay
      setStates((prev) => {
        const next = new Map(prev);
        const cur = next.get(tipId) || { tip_id: tipId, seen_at: null, dismissed_at: null };
        next.set(tipId, { ...cur, ...patch });
        return next;
      });
      await supabase
        .from('feature_tip_states')
        .upsert({ tip_id: tipId, profile_id: profileId, ...patch }, { onConflict: 'tip_id,profile_id' });
    },
    [profileId],
  );

  const dismiss = useCallback(
    (tipId: string) => writeState(tipId, { dismissed_at: new Date().toISOString() }),
    [writeState],
  );
  const markSeen = useCallback(
    (tipId: string) => writeState(tipId, { seen_at: new Date().toISOString() }),
    [writeState],
  );

  // Banner: 1 tip priority cao nhất chưa bị đóng
  const bannerTip = useMemo(
    () => tips.find((t) => t.display_mode === 'banner' && !states.get(t.id)?.dismissed_at) || null,
    [tips, states],
  );
  // Modal: 1 tip priority cao nhất chưa xem (hiện đúng một lần)
  const modalTip = useMemo(
    () => tips.find((t) => t.display_mode === 'modal' && !states.get(t.id)?.seen_at) || null,
    [tips, states],
  );

  return { tips, states, loading, bannerTip, modalTip, dismiss, markSeen, reload: load };
}
