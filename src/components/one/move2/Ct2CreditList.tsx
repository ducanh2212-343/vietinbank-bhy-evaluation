import { useMemo } from 'react';
import { AlertTriangle, CalendarClock, CircleAlert, CircleCheck, CircleDot } from 'lucide-react';
import {
  HS_COT, HS_NGUONG_IM_LANG, HS_TEN_LOAI, canhBaoHoSo, dinhDangTien,
  hsCacLoai, hsChuaGhiLanNao, hsMucImLang, hsNgayImLang, hsQuaHan, hsTuoiCho,
  type HoSoTinDung, type MucImLang,
} from '@/lib/ct2TinDung';

/**
 * «Toàn cảnh hồ sơ» — mọi hồ sơ của MỌI cán bộ trên một màn hình dọc.
 *
 * Vì sao cần bên cạnh bàn Kanban: bảy cột × cuộn ngang là bố cục của màn hình
 * rộng. Trên điện thoại, lãnh đạo Phòng muốn biết «phòng mình đang có gì, ai
 * đang ôm hồ sơ nào, cái nào bỏ quên» thì phải vuốt ngang bảy lần rồi cuộn dọc
 * trong từng cột — không ai làm thế mỗi sáng. Màn này gộp tất cả thành một danh
 * sách cuộn dọc, gom theo cán bộ, xấu nhất lên trước.
 *
 * NGÔN NGỮ HÌNH ẢNH — cố ý chỉ ba mức, đọc bằng mắt không cần đọc chữ:
 *   ● đỏ nhấp nháy  = bỏ quên (im lặng ≥ gấp đôi ngưỡng) hoặc có cảnh báo đỏ
 *   ● vàng          = chậm cập nhật, hoặc có cảnh báo vàng
 *   ● xanh          = đang chạy bình thường
 * Vạch màu bên trái mỗi dòng lặp lại đúng ba mức đó, để lướt nhanh vẫn thấy.
 */

interface Props {
  dsHoSo: HoSoTinDung[];
  tenNguoi: Map<string, string>;
  onMoHoSo: (h: HoSoTinDung) => void;
}

type MucDo = 'DO' | 'VANG' | 'XANH';

function mucCuaHoSo(h: HoSoTinDung): MucDo {
  const cb = canhBaoHoSo(h);
  if (cb.some((c) => c.muc === 'DO')) return 'DO';
  if (cb.length > 0) return 'VANG';
  return 'XANH';
}

const DIEM =
  { DO: 0, VANG: 1, XANH: 2 } as const;

const VACH: Record<MucDo, string> = {
  DO: 'border-l-red-500',
  VANG: 'border-l-amber-500',
  XANH: 'border-l-emerald-500',
};

export function Ct2CreditList({ dsHoSo, tenNguoi, onMoHoSo }: Props) {
  // Gom theo cán bộ; trong mỗi nhóm xấu nhất lên trước. Nhóm nào có hồ sơ bỏ
  // quên thì cả nhóm nổi lên đầu — đó là người cần nhắc trước.
  const nhom = useMemo(() => {
    const m = new Map<string, HoSoTinDung[]>();
    for (const h of dsHoSo) {
      const cu = m.get(h.can_bo) ?? [];
      cu.push(h);
      m.set(h.can_bo, cu);
    }
    return [...m.entries()]
      .map(([canBo, ds]) => {
        const xep = [...ds].sort((a, b) => {
          const d = DIEM[mucCuaHoSo(a)] - DIEM[mucCuaHoSo(b)];
          if (d !== 0) return d;
          return hsNgayImLang(b) - hsNgayImLang(a);
        });
        return {
          canBo,
          ten: tenNguoi.get(canBo) ?? 'Chưa rõ cán bộ',
          ds: xep,
          soBoQuen: ds.filter((h) => hsMucImLang(h) === 'BO_QUEN').length,
          soChuaCapNhat: ds.filter((h) => hsMucImLang(h) !== 'MOI').length,
          tien: ds.reduce((s, h) => s + (h.so_tien ?? 0), 0),
          soThieuTien: ds.filter((h) => h.so_tien === null).length,
        };
      })
      .sort((a, b) => (b.soBoQuen - a.soBoQuen)
        || (b.soChuaCapNhat - a.soChuaCapNhat)
        || a.ten.localeCompare(b.ten, 'vi'));
  }, [dsHoSo, tenNguoi]);

  const tongChuaCapNhat = nhom.reduce((s, n) => s + n.soChuaCapNhat, 0);

  if (dsHoSo.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
        Phòng chưa có hồ sơ tín dụng nào đang chạy.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <span className="font-semibold text-brand-navy">{dsHoSo.length} hồ sơ</span>
        <span>·</span>
        <span>{nhom.length} cán bộ</span>
        {tongChuaCapNhat > 0 && (
          <>
            <span>·</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">
              <AlertTriangle className="h-3 w-3" />
              {tongChuaCapNhat} hồ sơ chưa cập nhật
            </span>
          </>
        )}
      </p>

      {nhom.map((n) => (
        <section key={n.canBo} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {/*
            Hai dòng chứ không một: tên người phải đọc được nguyên vẹn. Nhồi tên,
            số liệu và huy hiệu cảnh báo vào cùng một dòng thì trên điện thoại tên
            bị cắt thành «Nguy…» — mà tên chính là thứ lãnh đạo cần đọc đầu tiên.
          */}
          <header className="border-b border-slate-100 bg-slate-50/70 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-navy/10 text-2xs font-bold text-brand-navy">
                {chuDau(n.ten)}
              </span>
              <span className="min-w-0 flex-1 text-sm font-semibold leading-tight text-brand-navy">
                {n.ten}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 pl-9">
              <span className="text-2xs tabular-nums text-slate-500">
                {n.ds.length} hồ sơ · {n.tien > 0 ? dinhDangTien(n.tien) : 'chưa có số tiền'}
                {n.tien > 0 && n.soThieuTien > 0 && ` (thiếu ${n.soThieuTien} hồ sơ)`}
              </span>
              {n.soChuaCapNhat > 0 && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold ${
                  n.soBoQuen > 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                }`}>
                  <CircleAlert className="h-3 w-3" />
                  {n.soChuaCapNhat} chưa cập nhật
                </span>
              )}
            </div>
          </header>

          <ul className="divide-y divide-slate-100">
            {n.ds.map((h) => (
              <DongHoSo key={h.id} hoSo={h} tenNguoi={tenNguoi} onMo={() => onMoHoSo(h)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function chuDau(ten: string): string {
  const tu = ten.trim().split(/\s+/);
  return (tu[tu.length - 1]?.[0] ?? '?').toUpperCase();
}

function DongHoSo({ hoSo, tenNguoi, onMo }: {
  hoSo: HoSoTinDung; tenNguoi: Map<string, string>; onMo: () => void;
}) {
  const muc = mucCuaHoSo(hoSo);
  const imLang: MucImLang = hsMucImLang(hoSo);
  const soNgayImLang = hsNgayImLang(hoSo);
  const quaHan = hsQuaHan(hoSo);
  const tuoi = hsTuoiCho(hoSo);
  const buoc = HS_COT.find((c) => c.ma === hoSo.trang_thai);

  return (
    <li>
      <button
        onClick={onMo}
        className={`flex w-full items-start gap-2.5 border-l-4 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ${VACH[muc]}`}
      >
        <ChamTrangThai muc={muc} imLang={imLang} />

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
              {hoSo.khach_hang}
            </span>
            <span className={`shrink-0 text-xs font-semibold tabular-nums ${
              hoSo.so_tien === null ? 'text-amber-600' : 'text-brand-navy'
            }`}>
              {hoSo.so_tien === null ? 'chưa có số' : dinhDangTien(hoSo.so_tien)}
            </span>
          </span>

          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-slate-500">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
              {buoc?.icon} {buoc?.ten ?? hoSo.trang_thai}
            </span>
            <span>{hsCacLoai(hoSo).map((l) => HS_TEN_LOAI[l]).join(' + ')}</span>
            {hoSo.cap_phe_duyet === 'TSC' && <span className="font-semibold text-red-600">TSC</span>}
            {tuoi > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <CalendarClock className="h-3 w-3" /> chờ {tuoi}n
              </span>
            )}
            {hoSo.nguoi_dang_giu && (
              <span className="truncate">ở {tenNguoi.get(hoSo.nguoi_dang_giu) ?? '—'}</span>
            )}
          </span>

          {/* Dải cảnh báo — thứ cần thấy ngay, đặt cuối cùng để mắt dừng lại ở đây */}
          <span className="mt-1 flex flex-wrap gap-1">
            {imLang !== 'MOI' && (
              <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-2xs font-semibold ${
                imLang === 'BO_QUEN' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
              }`}>
                <CircleAlert className="h-3 w-3" />
                {hsChuaGhiLanNao(hoSo)
                  ? `Chưa cập nhật lần nào · ${soNgayImLang} ngày`
                  : `Chưa cập nhật ${soNgayImLang} ngày`}
              </span>
            )}
            {quaHan > 0 && (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-2xs font-semibold text-red-700">
                Quá hạn xử lý {quaHan} ngày
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}

/**
 * Một chấm nói hết tình trạng. Hồ sơ bỏ quên thì chấm ĐẬP — chuyển động là thứ
 * duy nhất mắt không bỏ qua được khi lướt nhanh một danh sách dài.
 */
function ChamTrangThai({ muc, imLang }: { muc: MucDo; imLang: MucImLang }) {
  if (imLang === 'BO_QUEN') {
    return (
      <span className="relative mt-1 grid h-4 w-4 shrink-0 place-items-center" aria-label="Hồ sơ bỏ quên">
        <span className="absolute inline-flex h-4 w-4 animate-ping rounded-full bg-red-400 opacity-60" />
        <CircleAlert className="relative h-4 w-4 text-red-600" />
      </span>
    );
  }
  if (imLang === 'CHAM' || muc === 'VANG') {
    return <CircleDot className="mt-1 h-4 w-4 shrink-0 text-amber-500" aria-label="Cần chú ý" />;
  }
  if (muc === 'DO') {
    return <CircleAlert className="mt-1 h-4 w-4 shrink-0 text-red-600" aria-label="Có cảnh báo đỏ" />;
  }
  return <CircleCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-500" aria-label="Đang chạy bình thường" />;
}

/** Câu giải thích ngưỡng, dùng ở chân màn danh sách */
export const CT2_GIAI_THICH_IM_LANG =
  `Hồ sơ không có dòng nhật ký nào trong ${HS_NGUONG_IM_LANG} ngày làm việc bị đánh dấu «chưa cập nhật»; `
  + `quá ${HS_NGUONG_IM_LANG * 2} ngày thì chấm đỏ nhấp nháy.`;
