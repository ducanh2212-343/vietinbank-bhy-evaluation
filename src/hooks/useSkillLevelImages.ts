import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SkillLevelImage {
  id: string;
  skill_id: string;
  level_no: number;
  image_url: string;
  image_name: string | null;
  is_active: boolean;
}

// Cache to avoid re-fetching on every component mount
let cachedImages: Map<string, string> | null = null;
let cachePromise: Promise<void> | null = null;

function makeKey(skillId: string, level: number) {
  return `${skillId}__${level}`;
}

async function loadAllImages() {
  const { data } = await supabase
    .from('skill_level_images')
    .select('*')
    .eq('is_active', true);
  cachedImages = new Map();
  (data || []).forEach((img: any) => {
    cachedImages!.set(makeKey(img.skill_id, img.level_no), img.image_url);
  });
}

export function useSkillLevelImages() {
  const [images, setImages] = useState<Map<string, string>>(cachedImages || new Map());
  const [loading, setLoading] = useState(!cachedImages);

  useEffect(() => {
    if (cachedImages) {
      setImages(cachedImages);
      setLoading(false);
      return;
    }
    if (!cachePromise) {
      cachePromise = loadAllImages();
    }
    cachePromise.then(() => {
      setImages(cachedImages || new Map());
      setLoading(false);
    });
  }, []);

  const getImageUrl = (skillId: string, level: number | null | undefined): string | null => {
    if (!level || level === 0) return null;
    return images.get(makeKey(skillId, level)) || null;
  };

  const invalidateCache = async () => {
    cachedImages = null;
    cachePromise = null;
    await loadAllImages();
    setImages(cachedImages || new Map());
  };

  return { getImageUrl, loading, invalidateCache };
}
