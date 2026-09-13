import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { timVaiTro, type MoHinhVanHanh } from '@/data/one/vanHanhChuongTrinh';

/**
 * SƠ ĐỒ PHÁT BIỂU — bàn tròn, bấm vào ghế nào hiện việc của vị trí đó.
 *
 * Vì sao là bàn tròn chứ không phải danh sách đánh số: thứ tự phát biểu của
 * Credit 360 là thứ tự NGỒI QUANH BÀN, đi một vòng từ cán bộ trực tiếp làm hồ sơ
 * tới Giám đốc — người điều phối — kết luận sau cùng. Vẽ đúng hình cái bàn thì
 * cán bộ lần đầu dự phiên nhìn là biết mình ngồi đâu, sau ai, trước ai; danh
 * sách thì phải đọc hết mới hình dung ra.
 *
 * Vì sao bấm mới hiện việc, không in hết lên sơ đồ: chín vị trí, mỗi vị trí một
 * đoạn trích văn bản 2–3 dòng — in hết thì sơ đồ thành một trang chữ. Sơ đồ chỉ
 * giữ số thứ tự và tên ngắn; nội dung nằm ở thẻ bên cạnh, đổi theo ghế đang chọn.
 *
 * Ghế đầu bàn (12 giờ) là ghế số 9 — Giám đốc. Các ghế còn lại xếp theo chiều
 * kim đồng hồ bắt đầu ngay sau ghế đầu bàn, nên đọc một vòng là hết đúng thứ tự
 * 1 → 9 và kết thúc ở người kết luận.
 */

// Khung rộng hơn chiều cao khá nhiều: nhãn tên toả ngang ra hai bên vòng người,
// nên phần dư phải chừa cho chữ chứ không phải cho hình. Từng để khung 600 và
// nhãn bị cắt cụt ở mép trên điện thoại («LĐP kiểm so…», «Đ phụ trách»).
const KHUNG = 760;
const TAM_X = 380;
const TAM_Y = 250;
const BAN_R = 104;
const GHE_R = 168;
const NHAN_R = 208;
// Nửa bề ngang hình người — thay cho bán kính ghế tròn cũ. Dùng để chừa khoảng
// hai đầu mũi tên nối và để tính vùng bấm, nên vẫn cần một con số «bán kính».
const NGUOI_R = 26;

/**
 * Hình biểu trưng một người ngồi quanh bàn — đầu và vai, tô theo màu vai trò.
 *
 * Vì sao không dùng vòng tròn đánh số như trước: vòng tròn không nói lên đây là
 * NGƯỜI. Cán bộ lần đầu nhìn sơ đồ dễ đọc nhầm thành các bước của quy trình,
 * nhất là khi ngay phía trên đã có một sơ đồ luồng việc cũng vẽ bằng hộp. Hình
 * người thì nhìn phát biết đây là chỗ ngồi, không phải công đoạn.
 *
 * Số thứ tự chuyển sang huy hiệu nhỏ bên vai: vẫn đọc được thứ tự phát biểu mà
 * không chiếm mất thân hình.
 */
function NguoiNgoi({
  x, y, mau, dangChon, so, netDut,
}: {
  x: number; y: number; mau: string; dangChon: boolean; so: number; netDut?: boolean;
}) {
  const to = dangChon ? mau : '#FFFFFF';
  const net = dangChon ? 0 : 3;
  return (
    <g className="transition-[fill] duration-200" filter="url(#bong-ghe)">
      {/* Đầu */}
      <circle cx={x} cy={y - 12} r={9.5} fill={to} stroke={mau} strokeWidth={net}
              strokeDasharray={netDut && !dangChon ? '4 3' : undefined} />
      {/* Vai — vòm nửa tròn, hai bên thẳng xuống cho ra dáng thân người */}
      <path d={`M ${x - 17} ${y + 21} v -4 a 17 17 0 0 1 34 0 v 4 z`}
            fill={to} stroke={mau} strokeWidth={net}
            strokeDasharray={netDut && !dangChon ? '4 3' : undefined} />
      {/* Huy hiệu số thứ tự — nền trắng viền màu khi hình đang tô đặc, để số
          không chìm vào thân; nền màu chữ trắng khi hình còn rỗng */}
      <circle cx={x + 19} cy={y - 19} r={10.5} fill={dangChon ? '#FFFFFF' : mau}
              stroke={dangChon ? mau : '#FFFFFF'} strokeWidth={2} />
      <text x={x + 19} y={y - 15} textAnchor="middle" fontSize={12} fontWeight={900}
            fill={dangChon ? mau : '#FFFFFF'} className="pointer-events-none select-none">
        {so}
      </text>
    </g>
  );
}

/** Toạ độ trên vòng tròn; góc tính bằng độ, 0 = 3 giờ, âm = ngược chiều kim đồng hồ */
function diem(banKinh: number, goc: number) {
  const rad = (goc * Math.PI) / 180;
  return { x: TAM_X + banKinh * Math.cos(rad), y: TAM_Y + banKinh * Math.sin(rad) };
}

/** Cung tròn từ góc a tới góc b trên bán kính r, đi theo chiều kim đồng hồ */
function cung(r: number, a: number, b: number): string {
  const p1 = diem(r, a);
  const p2 = diem(r, b);
  const lon = b - a > 180 ? 1 : 0;
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${lon} 1 ${p2.x} ${p2.y}`;
}

export const SoDoPhatBieu: React.FC<{ moHinh: MoHinhVanHanh }> = ({ moHinh }) => {
  const luot = moHinh.phatBieu;
  const so = luot.length;
  const [chon, setChon] = useState(1);
  const dangChon = luot.find((l) => l.thuTu === chon) ?? luot[0];
  const vaiTroChon = timVaiTro(moHinh, dangChon.vaiTro);

  // Ghế cuối (người kết luận) ở 12 giờ; ghế k nằm ở góc -90° + k·(360/n)
  const gocCua = (thuTu: number) => -90 + (thuTu * 360) / so;

  const truoc = () => setChon((c) => (c <= 1 ? so : c - 1));
  const sau = () => setChon((c) => (c >= so ? 1 : c + 1));

  // Nhóm màu để chú giải: mỗi vai trò có ghế trong phiên là một dòng
  const nhomCoGhe = moHinh.vaiTro.filter((v) => luot.some((l) => l.vaiTro === v.ma));

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* ---- Bàn tròn ---- */}
      <figure className="m-0 rounded-2xl border border-slate-200 bg-white p-3 lg:col-span-3">
        <svg
          viewBox={`0 0 ${KHUNG} ${TAM_Y * 2 + 8}`}
          role="group"
          aria-label={`Sơ đồ phát biểu ${moHinh.ten}: ${so} người ngồi quanh bàn, bấm từng người để xem việc của vị trí đó`}
          className="block h-auto w-full"
        >
          <defs>
            <marker id="mui-ten-vong" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#94A3B8" />
            </marker>
            <filter id="bong-ghe" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.14" />
            </filter>
          </defs>

          {/* Mặt bàn */}
          <circle cx={TAM_X} cy={TAM_Y} r={BAN_R} fill="#F1F5F9" stroke="#CBD5E1" strokeWidth={1.5} />
          <circle cx={TAM_X} cy={TAM_Y} r={BAN_R - 10} fill="none" stroke="#E2E8F0" strokeWidth={1} />
          <text x={TAM_X} y={TAM_Y - 8} textAnchor="middle" fontSize={12} fontWeight={800} fill="#334155">
            Phiên Credit 360
          </text>
          <text x={TAM_X} y={TAM_Y + 12} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="#64748B">
            Thứ tự phát biểu 1 → {so}
          </text>
          <text x={TAM_X} y={TAM_Y + 30} textAnchor="middle" fontSize={9.5} fill="#94A3B8">
            theo chiều kim đồng hồ
          </text>

          {/* Mũi tên vòng nối ghế k → k+1 — vẽ TRƯỚC ghế để không đè lên số */}
          {luot.map((l) => {
            if (l.thuTu === so) return null;
            // Chừa khoảng hai đầu để mũi tên không cắm vào ghế
            const chua = (NGUOI_R + 9) * (180 / (Math.PI * GHE_R));
            const a = gocCua(l.thuTu) + chua;
            const b = gocCua(l.thuTu + 1) - chua;
            return (
              <path
                key={`vong-${l.thuTu}`}
                d={cung(GHE_R, a, b)}
                fill="none"
                stroke="#CBD5E1"
                strokeWidth={2}
                markerEnd="url(#mui-ten-vong)"
              />
            );
          })}

          {/* Ghế */}
          {luot.map((l) => {
            const vt = timVaiTro(moHinh, l.vaiTro);
            const goc = gocCua(l.thuTu);
            const g = diem(GHE_R, goc);
            const n = diem(NHAN_R, goc);
            const dangChonGhe = l.thuTu === chon;
            // Nhãn neo theo phía: bên phải bàn thì neo đầu chữ, bên trái neo cuối,
            // đỉnh và đáy neo giữa — chữ luôn toả ra ngoài, không đè lên ghế
            const cos = Math.cos((goc * Math.PI) / 180);
            const anchor = cos > 0.35 ? 'start' : cos < -0.35 ? 'end' : 'middle';
            const sin = Math.sin((goc * Math.PI) / 180);
            const dy = anchor === 'middle' ? (sin < 0 ? -4 : 12) : 4;
            return (
              <g
                key={l.thuTu}
                role="button"
                tabIndex={0}
                aria-pressed={dangChonGhe}
                aria-label={`Lượt ${l.thuTu}: ${l.viTri}`}
                onClick={() => setChon(l.thuTu)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setChon(l.thuTu);
                  }
                }}
                className="cursor-pointer outline-none [&:focus-visible>circle.vung-bam]:stroke-slate-900"
              >
                <title>{`${l.thuTu}. ${l.viTri} — ${vt.ten}`}</title>
                {/* Nền sáng quanh người đang chọn */}
                {dangChonGhe && (
                  <circle cx={g.x} cy={g.y} r={NGUOI_R + 8} fill={vt.mau} fillOpacity={0.18} />
                )}
                {/* Vùng bấm phủ trọn hình người: bấm vào khoảng trống giữa đầu và
                    vai vẫn ăn, và đây cũng là vòng nhận nét khi đi bằng bàn phím */}
                <circle
                  className="vung-bam"
                  cx={g.x}
                  cy={g.y}
                  r={NGUOI_R + 4}
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth={2}
                />
                {/* Người «nếu có» (VD Phòng đầu mối theo phân khúc) vẽ nét đứt: có
                    trong văn bản nhưng không phải phiên nào cũng có người ngồi */}
                <NguoiNgoi
                  x={g.x}
                  y={g.y}
                  mau={vt.mau}
                  dangChon={dangChonGhe}
                  so={l.thuTu}
                  netDut={l.tuyChon}
                />
                {/* Nhãn ngắn cạnh mỗi người. Trước đây nhãn bị ẩn trên điện thoại
                    (sơ đồ co còn ~60% nên chữ 11px thành 7px) và có một danh sách
                    chín dòng bên dưới thay thế — nhưng danh sách ấy lặp y nguyên
                    những gì vòng tròn đã nói, nên đã bỏ. Nay nhãn hiện ở mọi khổ
                    màn. Cỡ chữ khai bằng CSS chứ không bằng thuộc tính fontSize:
                    ở khổ điện thoại sơ đồ co còn chưa tới một nửa, nên chữ phải
                    khai to gấp rưỡi mới dựng ra đúng cỡ đọc được. */}
                <text
                  x={n.x}
                  y={n.y + dy}
                  textAnchor={anchor}
                  fontWeight={dangChonGhe ? 900 : 700}
                  fill={dangChonGhe ? '#0F172A' : '#475569'}
                  className="pointer-events-none select-none [font-size:22px] sm:[font-size:13px]"
                >
                  {l.viTriNgan}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Chú giải màu = nhóm vai trò */}
        <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] font-bold text-slate-500">
          {nhomCoGhe.map((v) => (
            <span key={v.ma} className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: v.mau }} />
              {v.ten}
            </span>
          ))}
        </figcaption>
      </figure>

      {/* ---- Thẻ chi tiết của ghế đang chọn ---- */}
      <div className="flex flex-col rounded-2xl border border-slate-200 bg-white lg:col-span-2" aria-live="polite">
        <div className="flex items-start gap-3 border-b border-slate-100 p-4">
          <span
            aria-hidden
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg font-black text-white"
            style={{ backgroundColor: vaiTroChon.mau }}
          >
            {dangChon.thuTu}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Lượt {dangChon.thuTu} / {so}
            </p>
            <h4 className="text-base font-black leading-snug text-slate-900">{dangChon.viTri}</h4>
            <span
              className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white"
              style={{ backgroundColor: vaiTroChon.mau }}
            >
              {vaiTroChon.ten}
            </span>
            {/* Vị trí «nếu có» vẽ nét đứt trên sơ đồ; nét đứt không tự nói được ý
                nghĩa nên phải chú ở đây. Trước kia chữ này nằm ở danh sách bên
                dưới — danh sách đã bỏ vì lặp lại sơ đồ. */}
            {dangChon.tuyChon && (
              <span className="mt-1 ml-1.5 inline-block rounded-full border border-dashed border-slate-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                Nếu có
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 p-4">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Việc trong phiên</p>
          {/* Trích nguyên văn — bày như lời trích, để người đọc biết đây là chữ
              của văn bản chứ không phải diễn giải của trang web */}
          <blockquote className="relative rounded-xl bg-slate-50 p-3 pl-9 text-sm leading-relaxed text-slate-800">
            <Quote aria-hidden className="absolute left-3 top-3 h-4 w-4 text-slate-300" />
            {dangChon.nhiemVu}
          </blockquote>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">Nguồn: {dangChon.nguon}</p>

          {/* Câu cán bộ mới dự phiên hay hỏi nhất: «tôi nói sau ai, trước ai?» */}
          {(() => {
            const truocDo = luot.find((l) => l.thuTu === dangChon.thuTu - 1);
            const sauDo = luot.find((l) => l.thuTu === dangChon.thuTu + 1);
            return (
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-slate-200 p-3">
                  <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nói sau</dt>
                  <dd className="mt-1 font-bold text-slate-800">{truocDo ? `${truocDo.thuTu}. ${truocDo.viTri}` : 'Mở đầu phiên'}</dd>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nói trước</dt>
                  <dd className="mt-1 font-bold text-slate-800">{sauDo ? `${sauDo.thuTu}. ${sauDo.viTri}` : 'Kết luận phiên'}</dd>
                </div>
              </dl>
            );
          })()}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={truoc}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100"
          >
            <ChevronLeft className="h-4 w-4" />
            Lượt trước
          </button>
          <button
            type="button"
            onClick={sau}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100"
          >
            Lượt sau
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
