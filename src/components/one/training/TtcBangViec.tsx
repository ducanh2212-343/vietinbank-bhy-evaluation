import { useMemo } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TTC_PHIEU_CHU_THICH } from '@/lib/trainingCenter';
import type { TtcBoiCanh } from './useTrainingCenter';
import { useTtcKanban, useTtcViecGoiDau } from './useTrainingCenter';
import { TtcKanban } from './TtcKanban';
import { TtcPhieuGiaoViec } from './TtcPhieuGiaoViec';

/**
 * BẢNG VIỆC — ba việc gối đầu («3 việc lựa chọn với cán bộ») + Kanban 3 cột.
 *
 * Luồng đã chốt với Giám đốc 06/09: mỗi việc gối đầu là MỘT PHIẾU GIAO VIỆC
 * bảy ô (xem TtcPhieuGiaoViec) do học viên lập cùng Giám đốc trong cuộc họp
 * chiều Ngày 1; thẻ của phiếu chạy trên Kanban theo trạng thái riêng của
 * phiếu. Việc có thể liên kết thêm với một thẻ Chiêu thức 2 để cán bộ ghi
 * nhịp ở đúng bảng Phòng — liên kết là tuỳ chọn, không phải điều kiện giao.
 *
 * Bố cục một cột dọc (Mục 13 bản mô tả): ba phiếu xếp lần lượt, không chia
 * cột ngang — người điền phải thấy đủ bảy ô cùng lúc trên cả điện thoại.
 */
export function TtcBangViec({ bc }: { bc: TtcBoiCanh }) {
  const ctId = bc.chuongTrinh?.id ?? null;
  const hocVienId = bc.hocVien?.nguoi ?? null;
  const { data: dsGoiDau = [] } = useTtcViecGoiDau(ctId, hocVienId);
  const { data: dsKanban = [] } = useTtcKanban(ctId, hocVienId);
  const theLienKet = useMemo(() => new Map(dsKanban.map((t) => [t.id, t])), [dsKanban]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-brand-navy">Ba việc gối đầu</h2>
          <p className="text-sm text-slate-600">
            Chốt ba việc cùng Giám đốc chiều Ngày 1 · kèm cặp theo điểm kiểm · nghiệm thu Đạt/Chưa đạt cuối kỳ.
          </p>
          <p className="mt-1 text-xs italic text-slate-500">{TTC_PHIEU_CHU_THICH}</p>
        </div>
        <Button size="sm" variant="outline" className="min-h-[44px]" onClick={() => window.print()}>
          <Printer className="mr-1 h-3.5 w-3.5" /> In báo cáo kết quả
        </Button>
      </div>

      <div className="mx-auto max-w-3xl space-y-5">
        {([1, 2, 3] as const).map((so) => {
          const cu = dsGoiDau.find((g) => g.so === so) ?? null;
          return (
            <TtcPhieuGiaoViec
              key={so}
              so={so}
              bc={bc}
              cu={cu}
              hocVienId={hocVienId}
              ctId={ctId ?? ''}
              theLienKet={cu?.dau_viec_id ? theLienKet.get(cu.dau_viec_id) ?? null : null}
            />
          );
        })}
      </div>

      <TtcKanban ctId={ctId} hocVienId={hocVienId} dsGoiDau={dsGoiDau} keoDuoc={bc.laHocVien} />
    </div>
  );
}
