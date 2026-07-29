import { supabase } from '@/integrations/supabase/client';

// Bucket bhy-one là private — mọi ảnh render qua signed URL có hạn.
const BUCKET = 'bhy-one';
const SIGN_TTL_SECONDS = 60 * 60 * 6; // 6 giờ, đủ cho một phiên làm việc

const cache = new Map<string, { url: string; expiresAt: number }>();

export async function signOnePath(path: string): Promise<string | null> {
  if (!path) return null;
  const hit = cache.get(path);
  if (hit && hit.expiresAt > Date.now() + 60_000) return hit.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGN_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  cache.set(path, { url: data.signedUrl, expiresAt: Date.now() + SIGN_TTL_SECONDS * 1000 });
  return data.signedUrl;
}

export async function signOnePaths(paths: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const missing = paths.filter(p => {
    const hit = cache.get(p);
    if (hit && hit.expiresAt > Date.now() + 60_000) {
      out[p] = hit.url;
      return false;
    }
    return true;
  });
  if (missing.length) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(missing, SIGN_TTL_SECONDS);
    for (const item of data ?? []) {
      if (item.signedUrl && item.path) {
        out[item.path] = item.signedUrl;
        cache.set(item.path, { url: item.signedUrl, expiresAt: Date.now() + SIGN_TTL_SECONDS * 1000 });
      }
    }
  }
  return out;
}

// Upload 1 ảnh (dataURL base64 hoặc File) lên bucket, trả về path đã lưu.
export async function uploadOneImage(source: string | File, prefix: 'staff' | 'shared' = 'staff'): Promise<string> {
  let blob: Blob;
  let ext: string;
  if (typeof source === 'string') {
    const m = /^data:image\/(png|jpe?g|webp);base64,(.+)$/s.exec(source);
    if (!m) throw new Error('Ảnh không hợp lệ (cần jpg/png/webp)');
    const bytes = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));
    blob = new Blob([bytes], { type: `image/${m[1]}` });
    ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  } else {
    blob = source;
    ext = source.type === 'image/png' ? 'png' : source.type === 'image/webp' ? 'webp' : 'jpg';
  }
  const path = `${prefix}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type });
  if (error) throw new Error(error.message);
  return path;
}
