import { IDEA_DEV_LEVELS, IDEA_DEV_LEVEL_EMOJI, type IdeaDevLevel } from '@/data/one/ideasConfig';
import { demRong, type DemTheoCap } from '@/lib/ideaKpi';

// Ý tưởng CỦA TÔI theo cấp độ hiện tại — nuôi dải «Ý tưởng của bạn» và thẻ
// ý tưởng. Nguồn: hàm máy chủ `bhy_ideas_y_tuong_cua_toi` (migration
// 20261035090000). Cấp độ lấy từ `development_level` của ý tưởng, KHÔNG suy
// từ sổ Bén rễ — sổ Bén rễ vẫn «đã ghi nhận» khi ý tưởng đã lên Vươn cành,
// nên đếm theo sổ là đếm sai (lỗi thấy ngay sau công bố Hội đồng 16/09/2026).

/** 'chu_y_tuong' = tôi tạo phiếu; 'dong_de_xuat' = tên tôi trong ô Người đề xuất */
export type VaiTroYTuong = 'chu_y_tuong' | 'dong_de_xuat';

export interface YTuongCuaToi {
  ideaId: string;
  title: string;
  capDo: IdeaDevLevel;
  vai: VaiTroYTuong;
  /** Mốc ghi sổ của đúng cấp hiện tại — null khi cấp đó chưa có dòng sổ */
  congNhanLuc: string | null;
  /** Tổng tiền đã ghi sổ mọi cấp của ý tưởng */
  thuongLuyKe: number;
}

export const docCapDo = (s: string | null | undefined): IdeaDevLevel =>
  IDEA_DEV_LEVELS.find(c => c === s) ?? 'Ươm mầm';

export const docVaiTro = (s: string | null | undefined): VaiTroYTuong =>
  s === 'dong_de_xuat' ? 'dong_de_xuat' : 'chu_y_tuong';

/** Đếm theo cấp cao nhất mỗi ý tưởng đang đạt — một ý tưởng chỉ nằm ở một ô */
export function demTheoCap(danhSach: readonly { capDo: IdeaDevLevel }[]): DemTheoCap {
  const dem = demRong();
  for (const y of danhSach) dem[y.capDo] += 1;
  return dem;
}

export interface ChipCapDo {
  capDo: IdeaDevLevel;
  so: number;
  emoji: string;
  lop: string;
}

/** Màu chip theo cấp — cùng tông với chip cấp độ trên thẻ ý tưởng */
export const LOP_CHIP_CAP_DO: Record<IdeaDevLevel, string> = {
  'Ươm mầm': 'bg-amber-100 text-amber-800',
  'Bén rễ': 'bg-teal-100 text-teal-800',
  'Vươn cành': 'bg-emerald-100 text-emerald-800',
  'Lan tỏa': 'bg-rose-100 text-rose-800',
};

/** Chip theo thứ tự cấp tăng dần, chỉ hiện cấp có ý tưởng: «2 Bén rễ · 1 Vươn cành» */
export function chipTheoCap(dem: DemTheoCap): ChipCapDo[] {
  return IDEA_DEV_LEVELS
    .filter(c => dem[c] > 0)
    .map(c => ({ capDo: c, so: dem[c], emoji: IDEA_DEV_LEVEL_EMOJI[c], lop: LOP_CHIP_CAP_DO[c] }));
}

/** Cấp đã qua Hội đồng — thẻ ý tưởng nói về cấp này thay vì dòng sổ Bén rễ */
export const laCapHoiDong = (c: IdeaDevLevel): boolean => c === 'Vươn cành' || c === 'Lan tỏa';
