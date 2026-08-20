import { useMemo } from 'react';
import {
  CT2_COT, cotHienThi, mucChuY, type Ct2DauViec, type Ct2MucChuY, type Ct2TrangThai,
} from '@/lib/ct2';
import type { Ct2NhanSu } from './useCt2Data';

/**
 * Chế độ «Toàn cảnh» — cả bảng của Phòng gói trong MỘT màn hình điện thoại.
 *
 * Vì sao cần: bàn Kanban 7 cột phải cuộn ngang, trên màn 5 inch mỗi lúc chỉ
 * thấy được một cột rưỡi — mất hẳn cái hay nhất của Miro là «liếc một cái thấy
 * cả bảng». Nhưng chép y layout canvas của Miro sang điện thoại thì còn tệ hơn
 * (chính Miro trên điện thoại cũng phải zoom/pan).
 *
 * Nên tái tạo CẢM GIÁC chứ không phải layout: mỗi thẻ rút thành một ô vuông
 * nhỏ tô màu theo cờ tình trạng, xếp thành lưới dày theo từng cột. 40 thẻ lọt
 * trong một màn hình, liếc là thấy ngay phòng đang xanh hay đỏ, cột nào phình
 * to — đúng thứ thông tin mà người ta thật sự lấy từ cái nhìn đầu tiên.
 * Chạm một ô là mở đúng thẻ đó.
 */

interface Props {
  dsThe: Ct2DauViec[];
  nhanSu: Ct2NhanSu[];
  onMoThe: (the: Ct2DauViec) => void;
}

const MAU_O: Record<Ct2MucChuY, string> = {
  DO: 'bg-red-500 hover:bg-red-600',
  VANG: 'bg-amber-400 hover:bg-amber-500',
  XANH: 'bg-emerald-500 hover:bg-emerald-600',
  XONG: 'bg-slate-300 hover:bg-slate-400',
};

export function Ct2OverviewGrid({ dsThe, nhanSu, onMoThe }: Props) {
  const tenNguoi = useMemo(() => new Map(nhanSu.map((n) => [n.id, n.full_name])), [nhanSu]);

  const theoCot = useMemo(() => {
    const m = new Map<Ct2TrangThai, Ct2DauViec[]>();
    for (const c of CT2_COT) m.set(c.ma, []);
    for (const t of dsThe.filter((x) => x.loai_dau_viec === 'TIEN_TRINH')) {
      m.get(cotHienThi(t.trang_thai))?.push(t);
    }
    // Trong mỗi cột: ô đỏ lên trước để mắt bắt được ngay
    const diem = { DO: 0, VANG: 1, XANH: 2, XONG: 3 };
    for (const [k, v] of m) {
      m.set(k, [...v].sort((a, b) => diem[mucChuY(a)] - diem[mucChuY(b)]));
    }
    return m;
  }, [dsThe]);

  const tong = useMemo(() => {
    const d = { DO: 0, VANG: 0, XANH: 0, XONG: 0 };
    for (const t of dsThe.filter((x) => x.loai_dau_viec === 'TIEN_TRINH')) d[mucChuY(t)] += 1;
    return d;
  }, [dsThe]);

  if (dsThe.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
        Phòng chưa có đầu việc nào.
      </p>
    );
  }

  return (
    <div>
      {/* Một dòng đọc được toàn cảnh trước khi nhìn vào lưới */}
      <p className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-red-500" />
          <span className="font-semibold tabular-nums text-red-700">{tong.DO}</span>
          <span className="text-slate-500">cần xử lý ngay</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-amber-400" />
          <span className="font-semibold tabular-nums text-amber-700">{tong.VANG}</span>
          <span className="text-slate-500">cần để mắt</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-500" />
          <span className="font-semibold tabular-nums text-emerald-700">{tong.XANH}</span>
          <span className="text-slate-500">đang ổn</span>
        </span>
      </p>

      <div className="space-y-2.5">
        {CT2_COT.map((cot) => {
          const ds = theoCot.get(cot.ma) ?? [];
          if (ds.length === 0) return null;
          return (
            <div key={cot.ma} className="rounded-xl border border-slate-200 bg-white p-2.5">
              <p className="mb-1.5 flex items-center justify-between text-xs font-semibold text-brand-navy">
                <span>{cot.icon} {cot.ten}</span>
                <span className="tabular-nums text-slate-400">{ds.length}</span>
              </p>
              {/* Lưới ô: tự dãn theo bề rộng, ô đủ to để chạm bằng ngón tay */}
              <div className="flex flex-wrap gap-1.5">
                {ds.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onMoThe(t)}
                    title={`${t.tieu_de} — ${tenNguoi.get(t.nguoi_chiu_trach_nhiem) ?? ''}`}
                    aria-label={t.tieu_de}
                    className={`relative h-9 w-9 rounded-md text-[10px] font-bold text-white transition ${MAU_O[mucChuY(t)]}`}
                  >
                    {/* Chữ cái đầu của người phụ trách: nhìn lưới là biết ai đang ôm phần nào */}
                    {(tenNguoi.get(t.nguoi_chiu_trach_nhiem) ?? '?').trim().split(/\s+/).slice(-1)[0]?.[0]?.toUpperCase()}
                    {t.muc_uu_tien === 'TRONG_DIEM_BGD' && (
                      <span className="absolute -right-0.5 -top-0.5 text-[9px] leading-none">⭐</span>
                    )}
                    {t.lien_phong && (
                      <span className="absolute -bottom-0.5 -left-0.5 text-[9px] leading-none">🤝</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-2xs text-slate-400">
        Mỗi ô là một đầu việc, chữ là người phụ trách. Chạm để mở. ⭐ trọng điểm BGĐ · 🤝 liên phòng.
      </p>
    </div>
  );
}
