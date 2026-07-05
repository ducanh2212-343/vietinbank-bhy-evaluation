import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { LevelCriterion } from '@/lib/levelCheck';

// Cache module-level (như useSkillLevelImages) — bộ tiêu chí ít thay đổi trong phiên
let cached: Map<string, LevelCriterion[]> | null = null;
let cachePromise: Promise<void> | null = null;

async function loadAll() {
  const { data } = await supabase
    .from('skill_level_criteria')
    .select('id, skill_id, level_no, statement, is_gate, requires_evidence, weight, sort_order')
    .eq('is_active', true)
    .order('level_no')
    .order('sort_order');
  cached = new Map();
  ((data || []) as LevelCriterion[]).forEach((c) => {
    if (!cached!.has(c.skill_id)) cached!.set(c.skill_id, []);
    cached!.get(c.skill_id)!.push(c);
  });
}

/** Bộ tiêu chí level theo skill — dùng cho wizard "Xác định level" trong mục B. */
export function useSkillCriteria() {
  const [criteria, setCriteria] = useState<Map<string, LevelCriterion[]>>(cached || new Map());
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) {
      setCriteria(cached);
      setLoading(false);
      return;
    }
    if (!cachePromise) cachePromise = loadAll();
    cachePromise.then(() => {
      setCriteria(cached || new Map());
      setLoading(false);
    });
  }, []);

  const getCriteria = (skillId: string): LevelCriterion[] => criteria.get(skillId) || [];

  return { getCriteria, loading };
}
