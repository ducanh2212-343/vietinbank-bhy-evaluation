import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Ct2Co, Ct2DauViec, Ct2TrangThai } from '@/lib/ct2';
import { FormGhiNhip } from './Ct2CardDialog';
import { useCt2LamTuoi, useCt2NhatKy } from './useCt2Data';

/**
 * «Ghi nhịp nhanh» — lướt từng thẻ, mỗi thẻ một câu, xong tự sang thẻ kế.
 *
 * Mục tiêu đo được: ≤ 60 giây cho 6 thẻ trên điện thoại 5 inch, không cuộn
 * ngang. Đây là lý do nó là một cửa lướt chứ không phải mở lần lượt 6 hộp
 * thoại chi tiết — mở chi tiết là mất nhịp.
 *
 * Tách khỏi Ct2MyWork vì trang chủ dùng lại y hệt: cán bộ vào cổng buổi sáng
 * phải ghi được nhịp ngay tại đó. Hai bản sao của cùng một cửa nhập liệu thì
 * sớm muộn cũng lệch luật nhau.
 */

/** Đủ để lướt — nhận cả bản rút gọn của RPC lẫn `Ct2DauViec` đầy đủ */
export interface TheGhiNhip {
  id: string;
  tieu_de: string;
  ma_hien_thi: string | null;
  han_hoan_thanh: string | null;
  trang_thai: string;
  phan_tram: number;
  co_tinh_trang: 'XANH' | 'VANG' | 'DO';
}

interface Props {
  dsThe: TheGhiNhip[];
  onDong: () => void;
}

export function Ct2GhiNhipNhanh({ dsThe, onDong }: Props) {
  const lamTuoi = useCt2LamTuoi();
  const [buoc, setBuoc] = useState(0);
  const the = dsThe[buoc];
  // Câu nhịp gần nhất của thẻ đang mở — để chặn copy-paste ngay tại client
  const { data: nhatKy = [] } = useCt2NhatKy(the?.id ?? null);
  // Nạp TRƯỚC nhật ký của thẻ kế tiếp: lúc bấm «Lưu» xong là thẻ kế hiện ngay,
  // không có một giây trắng chờ mạng giữa hai thẻ — 6 thẻ là 6 giây tiết kiệm
  useCt2NhatKy(dsThe[buoc + 1]?.id ?? null);

  if (!the) return null;

  const sangKe = () => {
    if (buoc + 1 >= dsThe.length) { onDong(); return; }
    setBuoc(buoc + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 sm:rounded-2xl">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-brand-navy">
            Ghi nhịp nhanh — thẻ {buoc + 1}/{dsThe.length}
          </p>
          <Button variant="ghost" size="sm" onClick={onDong}>Đóng</Button>
        </div>
        <p className="mb-1 text-sm font-medium text-slate-800">{the.tieu_de}</p>
        <p className="mb-3 text-xs text-slate-500">
          {the.ma_hien_thi} · {the.han_hoan_thanh
            ? `hạn ${new Date(`${the.han_hoan_thanh}T00:00:00`).toLocaleDateString('vi-VN')}`
            : 'chưa có hạn'}
        </p>
        <FormGhiNhip
          the={{
            id: the.id,
            trang_thai: the.trang_thai as Ct2DauViec['trang_thai'] & Ct2TrangThai,
            phan_tram: the.phan_tram,
            co_tinh_trang: the.co_tinh_trang as Ct2Co,
          }}
          cauGanNhat={nhatKy[0]?.noi_dung ?? null}
          tuTap
          onXong={() => { lamTuoi('nhip'); sangKe(); }}
        />
        <div className="mt-3 flex justify-between">
          <Button variant="outline" size="sm" disabled={buoc === 0} onClick={() => setBuoc(buoc - 1)}>
            <ChevronLeft className="h-4 w-4" /> Thẻ trước
          </Button>
          <Button variant="outline" size="sm" onClick={sangKe}>
            Bỏ qua thẻ này <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
