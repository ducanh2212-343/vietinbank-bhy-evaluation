import React from 'react';
import { Search, X } from 'lucide-react';
import {
  BO_LOC_RONG,
  TRANG_THAI_CHAM_LABELS,
  danhSachPhong,
  dangLoc,
  sapXepPhien,
  type BoLocCham,
  type PhienTrinhBay,
  type TrangThaiChamCuaToi,
  type YTuongLocDuoc,
} from '@/lib/ideaCouncilPhien';

// Thanh tìm & lọc của màn chấm Hội đồng.
//
// Vì sao cần: đợt «Tháng 6,7,8» có 20 ý tưởng trong một danh sách dọc, riêng
// Phòng KHDN 11 ý tưởng và bốn ý tưởng cùng mở đầu «Xây dựng Dashboard». Thành
// viên ngồi họp nghe xong một bài trình bày phải cuộn tìm đúng thẻ để chấm.
//
// Ô tìm gộp cả bốn thứ (mã, tên ý tưởng, người đề xuất, phòng) thay vì bốn ô
// riêng: người ngồi họp chỉ nhớ được MỘT manh mối — hoặc tên người vừa trình
// bày, hoặc mã đọc trên slide — và không muốn nghĩ xem manh mối đó thuộc ô nào.
// Gõ không dấu vẫn ra (xem khongDau ở lib).

interface Props {
  /** Toàn bộ ý tưởng của đợt — để dựng chip phòng và đếm */
  tatCa: readonly YTuongLocDuoc[];
  phien: readonly PhienTrinhBay[];
  loc: BoLocCham;
  datLoc: (l: BoLocCham) => void;
  /** Số ý tưởng còn lại sau khi lọc */
  soHienThi: number;
}

const TRANG_THAI_OPTIONS = Object.keys(TRANG_THAI_CHAM_LABELS) as TrangThaiChamCuaToi[];

export const IdeaCouncilBoLoc: React.FC<Props> = ({ tatCa, phien, loc, datLoc, soHienThi }) => {
  const cacPhong = danhSachPhong(tatCa);
  const cacPhien = sapXepPhien(phien);
  const coLoc = dangLoc(loc);

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={loc.tuKhoa}
            onChange={e => datLoc({ ...loc, tuKhoa: e.target.value })}
            placeholder="Tìm theo mã, tên ý tưởng, người đề xuất, phòng… (gõ không dấu cũng ra)"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-xs font-medium outline-none focus:border-amber-500"
          />
        </div>
        <select
          value={loc.phong ?? ''}
          onChange={e => datLoc({ ...loc, phong: e.target.value || null })}
          className="rounded-lg border border-slate-200 bg-white p-2 text-xs font-bold text-slate-700 outline-none focus:border-amber-500"
        >
          <option value="">Mọi phòng đề xuất</option>
          {cacPhong.map(p => (
            <option key={p.ten} value={p.ten}>{p.ten} ({p.so})</option>
          ))}
        </select>
        {cacPhien.length > 0 && (
          <select
            value={loc.phienId ?? ''}
            onChange={e => datLoc({ ...loc, phienId: e.target.value || null })}
            className="rounded-lg border border-slate-200 bg-white p-2 text-xs font-bold text-slate-700 outline-none focus:border-amber-500"
          >
            <option value="">Mọi phiên trình bày</option>
            {cacPhien.map(p => (
              <option key={p.id} value={p.id}>{p.ten}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {TRANG_THAI_OPTIONS.map(tt => (
          <button
            key={tt}
            type="button"
            onClick={() => datLoc({ ...loc, trangThaiCham: tt })}
            className={`cursor-pointer rounded-lg px-2.5 py-1 text-2xs font-bold transition-colors ${
              loc.trangThaiCham === tt
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {TRANG_THAI_CHAM_LABELS[tt]}
          </button>
        ))}
        <span className="ml-auto text-2xs font-bold text-slate-500">
          Hiện {soHienThi}/{tatCa.length} ý tưởng
        </span>
        {coLoc && (
          <button
            type="button"
            onClick={() => datLoc(BO_LOC_RONG)}
            className="flex cursor-pointer items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-2xs font-bold text-slate-600 transition-colors hover:bg-slate-200"
          >
            <X className="h-3 w-3" /> Bỏ lọc
          </button>
        )}
      </div>
    </div>
  );
};
