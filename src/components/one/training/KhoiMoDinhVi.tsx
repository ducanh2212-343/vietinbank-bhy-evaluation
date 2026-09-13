import { useEffect, useState } from 'react';
import { MapPin, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  LoiViTri, huongDanMoDinhVi, nenTangHienTai, trangThaiQuyenViTri,
} from '@/lib/quyenViTri';

/**
 * KHỐI MỞ QUYỀN ĐỊNH VỊ (Giám đốc 07/09/2026).
 *
 * Hiện khi trình duyệt CHẶN quyền — chỉ đúng đường đi trong Cài đặt của máy
 * đang cầm, kèm nút bấm lại ngay tại chỗ.
 *
 * Vì sao là khối cố định chứ không phải toast: người đang đứng ở phòng học cần
 * đọc ba bước rồi rời màn hình sang Cài đặt, quay lại vẫn phải thấy mình đang
 * làm tới bước nào. Toast biến mất sau vài giây là vô dụng ở đúng lúc cần nhất.
 *
 * Vì sao nút gọi lại thay vì bảo tải lại trang: iOS hỏi quyền ở lần gọi kế
 * tiếp, nên bấm lại là đủ — bắt tải lại trang thì mất luôn ô toạ độ đang nhập.
 */
export function KhoiMoDinhVi({ loi, dangThu, onThuLai }: {
  /** Lỗi vừa gặp; null = chưa bấm lần nào */
  loi: LoiViTri | null;
  dangThu: boolean;
  onThuLai: () => void;
}) {
  const [quyen, setQuyen] = useState<'cho_phep' | 'tu_choi' | 'se_hoi' | 'khong_ro'>('khong_ro');
  useEffect(() => { void trangThaiQuyenViTri().then(setQuyen); }, [loi]);

  // Hiện khi vừa bị từ chối, hoặc khi trình duyệt đã báo sẵn là đang chặn —
  // biết trước thì đỡ phải bấm một lần thất bại mới hiện hướng dẫn
  const biChan = loi?.ma === 'TU_CHOI' || quyen === 'tu_choi';
  if (!biChan) return null;

  const hd = huongDanMoDinhVi(nenTangHienTai());
  return (
    <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
        <ShieldAlert className="h-4 w-4" /> Trình duyệt đang chặn định vị của trang này
      </p>
      <p className="mt-1 text-2xs font-semibold uppercase tracking-wider text-amber-800">{hd.tieuDe}</p>
      <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-xs text-amber-900">
        {hd.buoc.map((b) => <li key={b}>{b}</li>)}
      </ol>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button size="sm" className="h-8" disabled={dangThu} onClick={onThuLai}>
          <MapPin className="mr-1 h-3.5 w-3.5" /> {dangThu ? 'Đang lấy vị trí…' : 'Cho phép định vị'}
        </Button>
        <span className="text-2xs text-amber-800">Bật xong thì bấm nút này, không cần tải lại trang.</span>
      </div>
    </div>
  );
}
