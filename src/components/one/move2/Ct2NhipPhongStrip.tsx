import { Skeleton } from '@/components/ui/skeleton';
import type { Ct2NhipNguoi } from './useCt2Data';

/**
 * Dải «Nhịp Phòng hôm nay» — hàng ảnh đại diện cả phòng, cuộn ngang.
 *
 * Đây là câu trả lời cho «Miro cho thấy đồng nghiệp online». Với ngân hàng,
 * thứ đáng thấy không phải AI ĐANG MỞ ỨNG DỤNG mà là AI ĐÃ GHI NHỊP SÁNG NAY:
 *  · Có ý nghĩa nghiệp vụ thật, không phải thông tin trang trí.
 *  · Tạo minh bạch ngang hàng đúng theo đặc tả §1.1 — thấy 8/12 đồng nghiệp đã
 *    ghi lúc 7h50 thúc mạnh hơn mọi lời nhắc từ trên xuống.
 *  · Không cần 150 kết nối websocket mở suốt ngày.
 *
 * Một hàng ngang cuộn được là dạng hiển thị hợp màn hình nhỏ nhất: 12 người
 * lọt trong chiều cao của một dòng, không đẩy nội dung khác xuống dưới.
 */

interface Props {
  ds: Ct2NhipNguoi[];
  dangTai?: boolean;
  /** Ẩn phần chú thích khi nhúng vào chỗ chật (trang chủ) */
  gonGang?: boolean;
  onChonNguoi?: (profileId: string) => void;
}

/** Chữ cái đầu của tên, dùng khi cán bộ chưa có ảnh đại diện */
function chuDau(ten: string): string {
  const tu = ten.trim().split(/\s+/);
  return (tu[tu.length - 1]?.[0] ?? '?').toUpperCase();
}

const VIEN: Record<Ct2NhipNguoi['ket_qua'], string> = {
  DUNG_GIO: 'ring-emerald-500',
  MUON: 'ring-amber-500',
  CHUA_DU: 'ring-amber-400',
  CHUA_GHI: 'ring-slate-300',
  KHONG_CO_VIEC: 'ring-slate-200',
};

const NHAN: Record<Ct2NhipNguoi['ket_qua'], string> = {
  DUNG_GIO: 'đã ghi đủ, đúng giờ',
  MUON: 'đã ghi đủ, hơi muộn',
  CHUA_DU: 'mới ghi một phần',
  CHUA_GHI: 'chưa ghi nhịp',
  KHONG_CO_VIEC: 'không có việc cần ghi',
};

export function Ct2NhipPhongStrip({ ds, dangTai, gonGang, onChonNguoi }: Props) {
  if (dangTai) {
    return (
      <div className="flex gap-3">
        {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-11 rounded-xl" />)}
      </div>
    );
  }

  const coViec = ds.filter((n) => n.ket_qua !== 'KHONG_CO_VIEC');
  if (coViec.length === 0) {
    return <p className="text-sm text-slate-500">Phòng chưa có việc nào đang chạy cần ghi nhịp.</p>;
  }

  const daGhi = coViec.filter((n) => n.ket_qua === 'DUNG_GIO' || n.ket_qua === 'MUON').length;
  // Người chưa ghi đứng trước — đó là phần cần nhìn, không phải phần đã xong
  const xepTheoViec = [...coViec].sort((a, b) => {
    const diem = (n: Ct2NhipNguoi) =>
      n.ket_qua === 'CHUA_GHI' ? 0 : n.ket_qua === 'CHUA_DU' ? 1 : n.ket_qua === 'MUON' ? 2 : 3;
    return diem(a) - diem(b);
  });

  return (
    <div>
      {!gonGang && (
        <p className="mb-2 text-sm text-slate-600">
          <span className="font-semibold text-brand-navy">{daGhi}/{coViec.length}</span> đồng nghiệp
          đã ghi nhịp sáng nay
        </p>
      )}

      {/* Cuộn ngang: 12 người vẫn chỉ chiếm chiều cao một dòng trên điện thoại */}
      <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1.5">
        {xepTheoViec.map((n) => {
          const chuaGhi = n.ket_qua === 'CHUA_GHI';
          return (
            <button
              key={n.profile_id}
              type="button"
              onClick={() => onChonNguoi?.(n.profile_id)}
              title={`${n.full_name} — ${NHAN[n.ket_qua]} (${n.so_viec_da_ghi}/${n.so_viec_dang_chay} việc)`}
              className="flex w-14 shrink-0 flex-col items-center gap-1 rounded-xl px-0.5 py-1 transition hover:bg-slate-50"
            >
              <span className="relative">
                {n.avatar_url ? (
                  <img
                    src={n.avatar_url}
                    alt=""
                    referrerPolicy="no-referrer"
                    className={`h-11 w-11 rounded-full object-cover ring-2 ring-offset-2 ${VIEN[n.ket_qua]} ${
                      chuaGhi ? 'opacity-45 grayscale' : ''
                    }`}
                  />
                ) : (
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-full bg-brand-navy/10 text-sm font-bold text-brand-navy ring-2 ring-offset-2 ${VIEN[n.ket_qua]} ${
                      chuaGhi ? 'opacity-45 grayscale' : ''
                    }`}
                  >
                    {chuDau(n.full_name)}
                  </span>
                )}
                {/* Chấm góc: đã ghi đủ thì tích, còn thiếu thì hiện số việc còn lại */}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full px-0.5 text-[9px] font-bold text-white ${
                    n.ket_qua === 'DUNG_GIO' ? 'bg-emerald-500'
                      : n.ket_qua === 'MUON' ? 'bg-amber-500'
                        : 'bg-slate-400'
                  }`}
                >
                  {n.ket_qua === 'DUNG_GIO' || n.ket_qua === 'MUON'
                    ? '✓'
                    : n.so_viec_dang_chay - n.so_viec_da_ghi}
                </span>
                {n.so_the_do > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"
                    title={`${n.so_the_do} việc đang vướng`}
                  />
                )}
              </span>
              <span className="w-full truncate text-center text-[10px] leading-tight text-slate-600">
                {n.full_name.split(' ').slice(-2).join(' ')}
              </span>
            </button>
          );
        })}
      </div>

      {!gonGang && (
        <p className="mt-1 text-2xs text-slate-400">
          Vòng xanh = đã ghi đúng giờ · vàng = muộn · xám mờ = chưa ghi · chấm đỏ = có việc đang vướng
        </p>
      )}
    </div>
  );
}
