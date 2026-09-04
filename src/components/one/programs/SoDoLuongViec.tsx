import React from 'react';
import { timVaiTro, tongThoiLuongPhien, type MoHinhVanHanh } from '@/data/one/vanHanhChuongTrinh';

/**
 * SƠ ĐỒ LUỒNG VIỆC (swimlane) và DẢI THỜI GIAN PHIÊN — vẽ bằng SVG.
 *
 * Vì sao là SVG chứ không phải thẻ xếp dọc như bản trước: danh sách thẻ trả lời
 * được «bước này làm gì» nhưng KHÔNG trả lời được hai câu mà chỉ hình vẽ mới nói
 * nổi — «việc chuyền tay qua bao nhiêu người» và «có hồ sơ nào KHÔNG phải qua
 * phiên không». Làn bơi cho thấy bốn lần đổi tay; nhánh rẽ cho thấy lối thoát.
 *
 * Vì sao SVG chứ không phải một tấm ảnh xuất từ Visio/Miro:
 *   - Nội dung đọc từ `vanHanhChuongTrinh.ts`; quy chế đổi là sơ đồ đổi theo,
 *     không ai phải nhớ vẽ lại rồi thay tệp.
 *   - Chữ trong SVG là chữ thật: tìm kiếm được, trình đọc màn hình đọc được,
 *     phóng to không vỡ.
 *   - Nhẹ hơn ảnh, không thêm một vòng tải mạng.
 *
 * Bố cục CỘT theo vai trò, dòng chảy đi XUỐNG. Xếp ngang (làn nằm ngang, bước
 * chạy sang phải) thì 8 bước cần ~1650px, màn hình laptop nào cũng phải cuộn
 * ngang. Xếp dọc thì 5 làn vừa đúng 980px — vào gọn khung nội dung 1152px.
 */

/** Chiều rộng một làn */
const RONG_LAN = 196;
/** Chiều cao một hàng bước */
const CAO_HANG = 96;
/** Chiều cao dải tên làn ở đầu sơ đồ */
const CAO_DAU = 58;
const RONG_O = 172;
const CAO_O = 66;

/** Cắt nhãn thành tối đa 2 dòng để chữ không tràn khỏi ô */
export function catDong(text: string, moiDong = 22, toiDa = 2): string[] {
  const tu = text.split(' ');
  const dong: string[] = [];
  let hienTai = '';
  for (const t of tu) {
    const thu = hienTai ? `${hienTai} ${t}` : t;
    // `!hienTai`: một từ dài hơn cả dòng vẫn phải được nhận, nếu không thì rơi
    // vào vòng lặp vô ích và nhãn ra rỗng
    if (thu.length <= moiDong || !hienTai) {
      hienTai = thu;
      continue;
    }
    dong.push(hienTai);
    hienTai = t;
    if (dong.length === toiDa) break;
  }
  if (hienTai && dong.length < toiDa) dong.push(hienTai);
  // Còn chữ chưa dùng thì cắt dòng cuối bằng «…» — thà cụt một nhãn còn hơn để
  // chữ tràn sang làn bên cạnh và đè lên mũi tên
  if (dong.join(' ').length < text.length) {
    dong[dong.length - 1] = `${dong[dong.length - 1].slice(0, moiDong - 1).trimEnd()}…`;
  }
  return dong;
}

/** Đường nối hai ô: thẳng nếu cùng làn, gấp khúc bo góc nếu đổi làn */
function duongNoi(x1: number, y1: number, x2: number, y2: number): string {
  if (Math.abs(x1 - x2) < 1) return `M ${x1} ${y1} L ${x2} ${y2}`;
  const giua = (y1 + y2) / 2;
  const r = 10;
  const sang = x2 > x1 ? 1 : -1;
  return [
    `M ${x1} ${y1}`,
    `L ${x1} ${giua - r}`,
    `Q ${x1} ${giua} ${x1 + sang * r} ${giua}`,
    `L ${x2 - sang * r} ${giua}`,
    `Q ${x2} ${giua} ${x2} ${giua + r}`,
    `L ${x2} ${y2}`,
  ].join(' ');
}

interface Props {
  moHinh: MoHinhVanHanh;
}

export const SoDoLuongViec: React.FC<Props> = ({ moHinh }) => {
  // Làn = các vai trò THỰC SỰ cầm việc, xếp theo thứ tự vai trò đó nhận việc lần
  // đầu. Xếp theo thứ tự khai trong mô hình thì bước 1 rơi vào cột thứ hai và
  // mắt phải nhảy ngược lại để tìm chỗ bắt đầu. Vai trò không cầm bước nào (VD
  // cán bộ trình bày — có phát biểu nhưng không sở hữu bước) không có làn riêng,
  // nếu không sơ đồ thừa một cột trống.
  const thuTuNhanViec = [...moHinh.buoc.map((b) => b.vaiTro), moHinh.ketThuc.vaiTro];
  const maLan = thuTuNhanViec.filter((ma, i) => thuTuNhanViec.indexOf(ma) === i);
  const lan = maLan.map((ma) => timVaiTro(moHinh, ma));
  const chiSoLan = (ma: string) => Math.max(0, lan.findIndex((v) => v.ma === ma));

  const soHang = moHinh.buoc.length + 1; // + hàng kết thúc
  const rong = lan.length * RONG_LAN;
  const cao = CAO_DAU + soHang * CAO_HANG + 16;

  const tamX = (ma: string) => chiSoLan(ma) * RONG_LAN + RONG_LAN / 2;
  const dinhY = (hang: number) => CAO_DAU + hang * CAO_HANG + (CAO_HANG - CAO_O) / 2;

  return (
    <figure className="m-0">
      {/* Cuộn ngang chỉ xảy ra dưới ~1000px; trên máy tính sơ đồ vào trọn khung */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3">
        <svg
          viewBox={`0 0 ${rong} ${cao}`}
          width={rong}
          height={cao}
          role="img"
          aria-label={`Sơ đồ luồng việc ${moHinh.ten}: ${moHinh.buoc.length} bước chia theo ${lan.length} vai trò`}
          className="block h-auto max-w-none"
          style={{ minWidth: rong }}
        >
          <defs>
            <marker id="mui-ten" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#94A3B8" />
            </marker>
            <marker id="mui-ten-re" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#CBD5E1" />
            </marker>
          </defs>

          {/* Dải làn: nền xen kẽ để mắt bám được cột, không dùng 5 màu rực —
              màu ở đây là cấu trúc, không phải dữ liệu, nên phải lùi về sau */}
          {lan.map((v, i) => (
            <g key={v.ma}>
              <rect
                x={i * RONG_LAN}
                y={0}
                width={RONG_LAN}
                height={cao}
                fill={i % 2 === 0 ? '#F8FAFC' : '#FFFFFF'}
              />
              <line x1={i * RONG_LAN} y1={0} x2={i * RONG_LAN} y2={cao} stroke="#E2E8F0" strokeWidth={1} />
              {/* Tên làn + vạch màu nhận diện vai trò */}
              <rect x={i * RONG_LAN + 10} y={12} width={RONG_LAN - 20} height={4} rx={2} fill={v.mau} />
              {catDong(v.ten, 20, 2).map((d, k) => (
                <text
                  key={k}
                  x={i * RONG_LAN + RONG_LAN / 2}
                  y={32 + k * 13}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={800}
                  fill="#334155"
                >
                  {d}
                </text>
              ))}
            </g>
          ))}
          <line x1={0} y1={CAO_DAU} x2={rong} y2={CAO_DAU} stroke="#CBD5E1" strokeWidth={1} />

          {/* Mũi tên nối các bước — vẽ TRƯỚC ô để đường không đè lên chữ */}
          {moHinh.buoc.map((buoc, i) => {
            if (i === moHinh.buoc.length - 1) return null;
            const sau = moHinh.buoc[i + 1];
            return (
              <path
                key={`noi-${buoc.ma}`}
                d={duongNoi(tamX(buoc.vaiTro), dinhY(i) + CAO_O, tamX(sau.vaiTro), dinhY(i + 1) - 8)}
                fill="none"
                stroke="#94A3B8"
                strokeWidth={2}
                markerEnd="url(#mui-ten)"
              />
            );
          })}
          {/* Bước cuối chảy tiếp tới điểm kết thúc */}
          <path
            d={duongNoi(
              tamX(moHinh.buoc[moHinh.buoc.length - 1].vaiTro),
              dinhY(moHinh.buoc.length - 1) + CAO_O,
              tamX(moHinh.ketThuc.vaiTro),
              dinhY(moHinh.buoc.length) - 8,
            )}
            fill="none"
            stroke="#94A3B8"
            strokeWidth={2}
            markerEnd="url(#mui-ten)"
          />

          {/* Nhánh rẽ khỏi dòng chính — nét đứt, màu nhạt: có thật nhưng không
              phải đường đi chính, mắt không được bám vào nó trước */}
          {moHinh.buoc.map((buoc, i) => {
            if (!buoc.nhanhRe) return null;
            const x = tamX(buoc.vaiTro);
            const y = dinhY(i) + CAO_O / 2;
            const xRe = tamX(moHinh.ketThuc.vaiTro);
            const dongRe = catDong(buoc.nhanhRe.ketQua, 24, 2);
            return (
              <g key={`re-${buoc.ma}`}>
                <path
                  d={`M ${x + RONG_O / 2} ${y} L ${xRe - RONG_O / 2 - 8} ${y}`}
                  fill="none"
                  stroke="#CBD5E1"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  markerEnd="url(#mui-ten-re)"
                />
                <text
                  x={(x + RONG_O / 2 + xRe - RONG_O / 2) / 2}
                  y={y - 8}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={700}
                  fill="#94A3B8"
                >
                  {buoc.nhanhRe.nhan}
                </text>
                {/* Đầu nhánh phải là một ô có chữ. Mũi tên chỉ vào khoảng trống
                    khiến người đọc tưởng sơ đồ vẽ dở hoặc thiếu mất một bước. */}
                <rect
                  x={xRe - RONG_O / 2}
                  y={y - CAO_O / 2 + 6}
                  width={RONG_O}
                  height={CAO_O - 12}
                  rx={(CAO_O - 12) / 2}
                  fill="#F1F5F9"
                  stroke="#CBD5E1"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                />
                {dongRe.map((d, k) => (
                  <text
                    key={k}
                    x={xRe}
                    y={y - (dongRe.length - 1) * 6 + k * 13 + 4}
                    textAnchor="middle"
                    fontSize={10.5}
                    fontWeight={700}
                    fill="#475569"
                  >
                    {d}
                  </text>
                ))}
              </g>
            );
          })}

          {/* Ô của từng bước */}
          {moHinh.buoc.map((buoc, i) => {
            const vaiTro = timVaiTro(moHinh, buoc.vaiTro);
            const x = tamX(buoc.vaiTro) - RONG_O / 2;
            const y = dinhY(i);
            return (
              <g key={buoc.ma}>
                <title>{`Bước ${i + 1}: ${buoc.ten} — ${vaiTro.ten}. ${buoc.moTa}`}</title>
                <rect x={x} y={y} width={RONG_O} height={CAO_O} rx={12} fill="#FFFFFF" stroke="#CBD5E1" strokeWidth={1.5} />
                {/* Vạch màu bên trái = vai trò cầm bước; nhận ra ngay cả khi ô bị
                    đẩy sang làn khác lúc quy trình đổi */}
                <rect x={x} y={y + 10} width={4} height={CAO_O - 20} rx={2} fill={vaiTro.mau} />
                <circle cx={x + 22} cy={y + 20} r={9} fill={vaiTro.mau} />
                <text x={x + 22} y={y + 24} textAnchor="middle" fontSize={11} fontWeight={800} fill="#FFFFFF">
                  {i + 1}
                </text>
                {catDong(buoc.ten, 20, 2).map((d, k) => (
                  <text key={k} x={x + 38} y={y + 20 + k * 14} fontSize={12} fontWeight={800} fill="#0F172A">
                    {d}
                  </text>
                ))}
                {/* Ô sơ đồ hẹp nên dùng bản mốc rút gọn; câu đầy đủ vẫn nằm ở
                    danh sách chi tiết ngay dưới sơ đồ */}
                {(buoc.mocNgan ?? buoc.moc) && (
                  <text x={x + 12} y={y + CAO_O - 12} fontSize={9.5} fontWeight={700} fill="#64748B">
                    ⏱ {buoc.mocNgan ?? buoc.moc}
                  </text>
                )}
                {buoc.bieuMau?.length ? (
                  <text x={x + RONG_O - 12} y={y + CAO_O - 12} textAnchor="end" fontSize={9.5} fontWeight={800} fill="#047857">
                    ▤ Mẫu {buoc.bieuMau.join(', ')}
                  </text>
                ) : null}
              </g>
            );
          })}

          {/* Điểm kết thúc — bo tròn hẳn để phân biệt với ô bước */}
          {(() => {
            const vt = timVaiTro(moHinh, moHinh.ketThuc.vaiTro);
            const x = tamX(moHinh.ketThuc.vaiTro) - RONG_O / 2;
            const y = dinhY(moHinh.buoc.length);
            return (
              <g>
                <title>{`${moHinh.ketThuc.nhan} — ${vt.trachNhiem}`}</title>
                <rect x={x} y={y} width={RONG_O} height={CAO_O} rx={CAO_O / 2} fill={vt.mau} />
                {catDong(moHinh.ketThuc.nhan, 22, 3).map((d, k) => (
                  <text
                    key={k}
                    x={x + RONG_O / 2}
                    y={y + 26 + k * 14}
                    textAnchor="middle"
                    fontSize={11.5}
                    fontWeight={800}
                    fill="#FFFFFF"
                  >
                    {d}
                  </text>
                ))}
              </g>
            );
          })()}
        </svg>
      </div>
      <figcaption className="mt-2 text-[11px] leading-relaxed text-slate-500">
        Mỗi cột là một vai trò. Đường liền là dòng chảy chính, đường đứt là nhánh hồ sơ không thuộc diện
        phải qua phiên. Chi tiết từng bước ở ngay bên dưới.
      </figcaption>
    </figure>
  );
};

/**
 * DẢI THỜI GIAN PHIÊN — một thanh xếp chồng thay cho vòng tròn.
 *
 * Chọn thanh ngang chứ không phải biểu đồ tròn: dữ liệu ở đây vừa có TỈ LỆ vừa
 * có THỨ TỰ. Vòng tròn diễn được tỉ lệ nhưng làm mất thứ tự (không có điểm bắt
 * đầu tự nhiên), mà thứ tự mới là thứ cán bộ cần — «đến lượt tôi là lúc nào».
 * Thanh ngang chạy trái sang phải đúng như phiên họp chạy theo thời gian.
 *
 * Màu đi theo VAI TRÒ chứ không theo lượt: người điều phối nói ở lượt 1 và lượt
 * 5, hai đoạn cùng màu thì mới thấy là một người quay lại.
 */
export const DaiThoiGianPhien: React.FC<Props> = ({ moHinh }) => {
  const tong = tongThoiLuongPhien(moHinh);
  // Mốc 15 phút một, luôn kết thúc bằng chính tổng thời lượng của phiên
  const moc = [...new Set([...[0, 15, 30, 45, 60, 75, 90].filter((m) => m < tong), tong])];

  return (
    <figure className="m-0 rounded-2xl border border-slate-200 bg-white p-4">
      {/* Vạch mốc đặt theo ĐÚNG tỉ lệ phút, không chia đều: phiên không phải lúc
          nào cũng tròn 60 phút, chia đều thì mốc 15′ rơi sai chỗ ngay khi tổng
          thời lượng đổi, mà sai vạch mốc thì cả dải đọc ra số khác */}
      <div className="relative mb-1.5 h-4 text-[10px] font-bold text-slate-400">
        {moc.map((m, i) => (
          <span
            key={m}
            className="absolute whitespace-nowrap"
            style={{
              left: `${(m / tong) * 100}%`,
              transform: i === 0 ? 'none' : i === moc.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
            }}
          >
            {m === 0 ? 'Bắt đầu' : `${m}′`}
          </span>
        ))}
      </div>
      {/* gap-[2px]: khe nền giữa hai đoạn để ranh giới không phải chỉ nhờ màu */}
      <div className="flex h-11 w-full gap-[2px] overflow-hidden rounded-lg">
        {moHinh.phatBieu.map((luot) => {
          const vt = timVaiTro(moHinh, luot.vaiTro);
          const tiLe = (luot.phut / tong) * 100;
          return (
            <div
              key={luot.thuTu}
              className="flex items-center justify-center"
              style={{ width: `${tiLe}%`, backgroundColor: vt.mau }}
              title={`Lượt ${luot.thuTu} · ${vt.ten} · ~${luot.phut} phút`}
            >
              {/* Đoạn hẹp thì bỏ nhãn thay vì bóp chữ cho vừa — số lượt vẫn đọc
                  được ở danh sách ngay dưới */}
              {tiLe >= 12 && (
                <span className="text-[11px] font-black text-white">
                  {luot.thuTu} · {luot.phut}′
                </span>
              )}
            </div>
          );
        })}
      </div>

      <ol className="mt-3 space-y-1.5">
        {moHinh.phatBieu.map((luot) => {
          const vt = timVaiTro(moHinh, luot.vaiTro);
          return (
            <li key={luot.thuTu} className="flex items-start gap-2.5">
              <span
                aria-hidden
                className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md text-[10px] font-black text-white"
                style={{ backgroundColor: vt.mau }}
              >
                {luot.thuTu}
              </span>
              <p className="min-w-0 text-xs leading-relaxed text-slate-600">
                <span className="font-black text-slate-900">{vt.ten}</span>
                <span className="font-bold text-slate-400"> · ~{luot.phut} phút</span>
                <br />
                {luot.noiDung}
              </p>
            </li>
          );
        })}
      </ol>
    </figure>
  );
};
