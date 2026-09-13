import { Badge } from '@/components/ui/badge';
import { MAU_TRANG_THAI, TEN_TRANG_THAI, type TrangThaiDuyet } from '@/lib/danhThiep/kieu';

export function HuyHieuTrangThai({ tt }: { tt: TrangThaiDuyet }) {
  return <Badge variant="outline" className={`border-0 ${MAU_TRANG_THAI[tt]}`}>{TEN_TRANG_THAI[tt]}</Badge>;
}
