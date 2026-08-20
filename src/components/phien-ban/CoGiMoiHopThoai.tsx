// Hộp «Có gì mới» — hiện MỘT LẦN sau mỗi đợt cập nhật đáng kể.
//
// Ranh giới cố ý hẹp (xem docs/lich-su-phien-ban-va-bao-tin-moi-2026-08.md):
//   - Chỉ NÂNG CẤP LỚN và TÍNH NĂNG MỚI mới được chen ngang. Sửa lỗi và tinh
//     chỉnh vẫn vào lịch sử nhưng im lặng — hộp thoại nào bật quá thường thì
//     người dùng học được phản xạ bấm tắt trước khi kịp đọc.
//   - Mở trễ 1,2 giây để không giành chỗ với hộp mẹo tính năng và các hộp khác
//     đang mở lúc vừa đăng nhập.
//   - Đóng hộp = đánh dấu đã xem toàn bộ; muốn đọc lại thì vào «Có gì mới».
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePhienBanMoi } from '@/hooks/usePhienBanMoi';
import { MAU_LOAI, TEN_LOAI } from '@/lib/lichSuPhienBan';

const CHO_MO_MS = 1200;

export function CoGiMoiHopThoai() {
  const { chuaXemDangKe, danhDauDaXem } = usePhienBanMoi();
  const navigate = useNavigate();
  const [mo, setMo] = useState(false);
  // Chốt danh sách ngay lần đầu đủ điều kiện: đánh dấu đã xem sẽ làm
  // `chuaXemDangKe` rỗng đi, nội dung hộp không được biến mất theo.
  const [dsHien, setDsHien] = useState<typeof chuaXemDangKe>([]);

  useEffect(() => {
    if (mo || dsHien.length > 0 || chuaXemDangKe.length === 0) return;
    setDsHien(chuaXemDangKe);
    const hen = setTimeout(() => setMo(true), CHO_MO_MS);
    return () => clearTimeout(hen);
  }, [chuaXemDangKe, mo, dsHien.length]);

  const dong = () => {
    setMo(false);
    void danhDauDaXem();
  };

  if (dsHien.length === 0) return null;
  const dan = dsHien[0];

  return (
    <Dialog open={mo} onOpenChange={(o) => { if (!o) dong(); }}>
      <DialogContent className="max-w-md p-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </span>
          <h2 className="brand-gradient-text text-lg font-bold">Hệ thống vừa có thứ mới</h2>
          <p className="text-xs text-muted-foreground">
            Phiên bản v{dan.phienBan} · {dan.ngayHienThi}
            {dsHien.length > 1 && ` · ${dsHien.length} cập nhật`}
          </p>
        </div>

        <ul className="mt-2 space-y-3">
          {dsHien.slice(0, 3).map((m) => (
            <li key={m.ma} className="flex gap-2.5">
              <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', MAU_LOAI[m.loai])} />
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-snug">{m.tieuDe}</div>
                <div className="text-xs leading-snug text-muted-foreground">{m.tomTat}</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {TEN_LOAI[m.loai]}
                </div>
              </div>
            </li>
          ))}
        </ul>
        {dsHien.length > 3 && (
          <p className="text-xs text-muted-foreground">Và {dsHien.length - 3} cập nhật khác.</p>
        )}

        <div className="mt-2 flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={() => { dong(); navigate('/co-gi-moi'); }}
          >
            Xem chi tiết
          </Button>
          <Button variant="ghost" className="w-full" onClick={dong}>Để sau</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
