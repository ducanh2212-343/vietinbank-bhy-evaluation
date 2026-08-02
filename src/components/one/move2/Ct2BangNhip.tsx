import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import {
  cauHinhNhip, gioNgan, khoangKy, nhanKhoangKy, type KyBaoCao,
} from '@/lib/cauHinhNhip';

/**
 * Bảng tổng hợp nhịp tuần / tháng — «ai không nhập đúng nhịp».
 *
 * ĐỌC TỪ ẢNH CHỤP, KHÔNG TÍNH LẠI. Để biết thứ Ba tuần trước một người «phải
 * ghi mấy việc» thì cần biết hôm đó họ đang giữ bao nhiêu thẻ đang làm — trạng
 * thái thẻ hôm nay không nói được điều đó. Tác vụ chốt sổ 09:00 mỗi ngày làm
 * việc ghi lại ảnh chụp; bảng này chỉ cộng lại.
 *
 * MẪU SỐ LÀ SỐ NGÀY THỰC SỰ CÓ VIỆC PHẢI GHI, không phải số ngày trong kỳ. Ai
 * nghỉ phép cả tuần hoặc không có việc nào đang chạy thì không xuất hiện — bảng
 * mà phạt oan một lần là lần sau không ai tin nữa.
 *
 * Xếp tỷ lệ THẤP NHẤT lên đầu: đây là bảng để nhìn ai cần nhắc, không phải bảng
 * vinh danh.
 */

interface DongNhip {
  profile_id: string;
  full_name: string;
  phong: string;
  ten_phong: string;
  so_ngay_can_ghi: number;
  so_ngay_dung_gio: number;
  so_ngay_muon: number;
  so_ngay_mat_nhip: number;
  tong_viec_phai_ghi: number;
  ti_le: number;
}

interface Props {
  /** Null = mọi phòng trong tầm nhìn của người đang xem */
  phongId: string | null;
}

const NGUONG_CAN_NHAC = 80;

export function Ct2BangNhip({ phongId }: Props) {
  const [ky, setKy] = useState<KyBaoCao>('TUAN');
  const [lui, setLui] = useState(0);

  const khoang = useMemo(() => khoangKy(ky, lui), [ky, lui]);
  const ch = cauHinhNhip();

  const { data: ds = [], isLoading, error } = useQuery({
    queryKey: ['ct2', 'bang-nhip', khoang.tu, khoang.den, phongId],
    staleTime: 300_000,
    queryFn: async () => {
      const db = supabase as unknown as {
        rpc(fn: string, a: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message?: string } | null }>;
      };
      const { data, error: loi } = await db.rpc('ct2_bang_nhip_ky', {
        _tu: khoang.tu, _den: khoang.den, _phong: phongId,
      });
      if (loi) throw loi;
      return (data ?? []) as DongNhip[];
    },
  });

  const canNhac = ds.filter((d) => d.ti_le < NGUONG_CAN_NHAC);
  const tongNgay = ds.reduce((s, d) => s + d.so_ngay_can_ghi, 0);
  const tongDat = ds.reduce((s, d) => s + d.so_ngay_dung_gio + d.so_ngay_muon, 0);
  const tiLeChung = tongNgay ? Math.round((100 * tongDat) / tongNgay) : 100;

  return (
    <div className="space-y-4">
      {/* Chọn kỳ */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button size="sm" variant={ky === 'TUAN' ? 'default' : 'outline'} className="h-8 px-3 text-xs"
            onClick={() => { setKy('TUAN'); setLui(0); }}>
            Theo tuần
          </Button>
          <Button size="sm" variant={ky === 'THANG' ? 'default' : 'outline'} className="h-8 px-3 text-xs"
            onClick={() => { setKy('THANG'); setLui(0); }}>
            Theo tháng
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="outline" className="h-8 w-8 p-0"
            onClick={() => setLui((v) => v + 1)} aria-label="Kỳ trước">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[9rem] text-center text-xs font-medium text-slate-700">
            {khoang.nhan}
            <span className="block text-2xs font-normal text-slate-400">{nhanKhoangKy(khoang)}</span>
          </span>
          <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={lui === 0}
            onClick={() => setLui((v) => Math.max(0, v - 1))} aria-label="Kỳ sau">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : error ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Chưa đọc được bảng nhịp. Nếu vừa triển khai tính năng này thì cần áp migration
          <code className="mx-1 rounded bg-white px-1 py-0.5 text-xs">20260814090000</code>
          vào project Supabase.
        </p>
      ) : ds.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
          <p className="font-medium text-slate-700">Kỳ này chưa có số liệu nhịp.</p>
          <p className="mt-1">
            Bảng đọc từ ảnh chụp nhịp mà tác vụ chốt sổ ghi lại lúc 09:00 mỗi ngày làm việc.
            Kỳ mới bắt đầu, kỳ toàn ngày nghỉ, hoặc Phòng không có việc nào đang chạy thì
            đều chưa có dòng nào — đó là bình thường, không phải lỗi.
          </p>
        </div>
      ) : (
        <>
          {/* Dải số của kỳ */}
          <div className="grid grid-cols-3 gap-2">
            <ONho nhan="Tỷ lệ đúng nhịp" giaTri={`${tiLeChung}%`} tot={tiLeChung >= NGUONG_CAN_NHAC} />
            <ONho nhan="Cán bộ có việc" giaTri={String(ds.length)} />
            <ONho nhan="Cần nhắc" giaTri={String(canNhac.length)} tot={canNhac.length === 0} />
          </div>

          {canNhac.length > 0 && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                <b>{canNhac.length} cán bộ</b> đạt dưới {NGUONG_CAN_NHAC}% trong kỳ này.
                Bảng xếp người thấp nhất lên đầu — đây là danh sách để nhắc, không phải để xếp hạng.
              </span>
            </p>
          )}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <ul className="divide-y divide-slate-100">
              {ds.map((d) => <DongBang key={`${d.profile_id}-${d.phong}`} d={d} />)}
            </ul>
          </div>
        </>
      )}

      <p className="flex items-start gap-2 text-2xs leading-relaxed text-slate-400">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        <span>
          Đúng giờ = ghi trước {gioNgan(ch.gio_dung_gio)}; muộn = ghi trước {gioNgan(ch.gio_an_han)}
          {' '}(lãnh đạo Phòng ghi trong khung này vẫn tính đúng giờ). Mẫu số chỉ tính những ngày
          làm việc mà cán bộ thực sự có việc đang chạy — ngày nghỉ lễ và ngày không có việc không
          bị tính. Đổi mốc giờ ở «Cài đặt ngày giờ».
        </span>
      </p>
    </div>
  );
}

function ONho({ nhan, giaTri, tot }: { nhan: string; giaTri: string; tot?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5">
      <p className={`text-lg font-bold tabular-nums ${tot === false ? 'text-red-600' : 'text-brand-navy'}`}>
        {giaTri}
      </p>
      <p className="mt-0.5 text-2xs leading-snug text-slate-500">{nhan}</p>
    </div>
  );
}

function DongBang({ d }: { d: DongNhip }) {
  const kem = d.ti_le < NGUONG_CAN_NHAC;
  return (
    <li className={`px-3 py-2.5 ${kem ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-emerald-500'}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{d.full_name}</span>
        <span className={`shrink-0 text-sm font-bold tabular-nums ${kem ? 'text-red-600' : 'text-emerald-600'}`}>
          {d.ti_le}%
        </span>
      </div>

      {/* Thanh ba màu: thấy ngay tỷ lệ đúng giờ / muộn / mất nhịp mà không phải đọc số */}
      <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-slate-100">
        <span className="bg-emerald-500" style={{ width: `${(100 * d.so_ngay_dung_gio) / d.so_ngay_can_ghi}%` }} />
        <span className="bg-amber-400" style={{ width: `${(100 * d.so_ngay_muon) / d.so_ngay_can_ghi}%` }} />
        <span className="bg-red-500" style={{ width: `${(100 * d.so_ngay_mat_nhip) / d.so_ngay_can_ghi}%` }} />
      </div>

      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-2xs text-slate-500">
        <span className="truncate">{d.ten_phong}</span>
        <span>·</span>
        <span className="text-emerald-700">{d.so_ngay_dung_gio} đúng giờ</span>
        {d.so_ngay_muon > 0 && <span className="text-amber-700">{d.so_ngay_muon} muộn</span>}
        {d.so_ngay_mat_nhip > 0 && (
          <span className="font-semibold text-red-700">{d.so_ngay_mat_nhip} mất nhịp</span>
        )}
        <span>·</span>
        <span>{d.so_ngay_can_ghi} ngày có việc</span>
      </p>
    </li>
  );
}
