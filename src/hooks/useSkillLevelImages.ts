import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Cache to avoid re-fetching on every component mount
let cachedImages: Map<string, string> | null = null;
let cachedIcons: Map<string, string> | null = null;
let cachedStages: Map<number, string> | null = null;
let cachePromise: Promise<void> | null = null;

function makeKey(skillId: string, level: number) {
  return `${skillId}__${level}`;
}

async function loadAllImages() {
  const [imagesRes, iconsRes, stagesRes] = await Promise.all([
    supabase.from('skill_level_images').select('*').eq('is_active', true),
    supabase.from('skill_catalog').select('id, icon_url').eq('is_active', true),
    supabase.from('skill_growth_stage_images').select('*').eq('is_active', true),
  ]);
  cachedImages = new Map();
  (imagesRes.data || []).forEach((img: { skill_id: string; level_no: number; image_url: string }) => {
    cachedImages!.set(makeKey(img.skill_id, img.level_no), img.image_url);
  });
  cachedIcons = new Map();
  (iconsRes.data || []).forEach((s: { id: string; icon_url: string | null }) => {
    if (s.icon_url) cachedIcons!.set(s.id, s.icon_url);
  });
  cachedStages = new Map();
  (stagesRes.data || []).forEach((s: { stage_no: number; image_url: string }) => {
    cachedStages!.set(s.stage_no, s.image_url);
  });
}

export function useSkillLevelImages() {
  const [images, setImages] = useState<Map<string, string>>(cachedImages || new Map());
  const [icons, setIcons] = useState<Map<string, string>>(cachedIcons || new Map());
  const [stages, setStages] = useState<Map<number, string>>(cachedStages || new Map());
  const [loading, setLoading] = useState(!cachedImages);

  useEffect(() => {
    if (cachedImages) {
      setImages(cachedImages);
      setIcons(cachedIcons || new Map());
      setStages(cachedStages || new Map());
      setLoading(false);
      return;
    }
    if (!cachePromise) {
      cachePromise = loadAllImages();
    }
    cachePromise.then(() => {
      setImages(cachedImages || new Map());
      setIcons(cachedIcons || new Map());
      setStages(cachedStages || new Map());
      setLoading(false);
    });
  }, []);

  const getImageUrl = (skillId: string, level: number | null | undefined): string | null => {
    if (!level || level === 0) return null;
    return images.get(makeKey(skillId, level)) || null;
  };

  /** Icon riêng của skill (skill_catalog.icon_url) — nền cho khung level compose */
  const getIconUrl = (skillId: string): string | null => {
    return icons.get(skillId) || null;
  };

  /** Ảnh chung theo nấc phát triển (Ươm mầm/Bám rễ/Vươn cành/Lan tỏa) do admin upload */
  const getStageImageUrl = (level: number | null | undefined): string | null => {
    if (!level || level === 0) return null;
    return stages.get(level) || null;
  };

  const invalidateCache = async () => {
    cachedImages = null;
    cachedIcons = null;
    cachedStages = null;
    cachePromise = null;
    await loadAllImages();
    setImages(cachedImages || new Map());
    setIcons(cachedIcons || new Map());
    setStages(cachedStages || new Map());
  };

  return { getImageUrl, getIconUrl, getStageImageUrl, loading, invalidateCache };
}
