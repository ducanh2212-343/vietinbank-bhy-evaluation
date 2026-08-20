import { leavesOf, type NavSection } from '@/lib/navigation';
import type { GopYMuc } from './useGopY';

/**
 * Nhóm mục tick-chọn của form góp ý: mỗi khu menu một nhóm, mục lá đã lọc theo
 * quyền (truyền vào sections từ useNavTree — cán bộ chỉ tick được mục mình thấy).
 */
export function nhomMucGopY(sections: NavSection[]): Array<{ nhan: string; muc: GopYMuc[] }> {
  const daCo = new Set<string>();
  return sections
    .map((s) => ({
      nhan: s.label,
      muc: leavesOf(s)
        .filter((l) => !l.hidden)
        .filter((l) => (daCo.has(l.path) ? false : (daCo.add(l.path), true)))
        .map((l) => ({ path: l.path, label: l.label })),
    }))
    .filter((g) => g.muc.length > 0);
}
