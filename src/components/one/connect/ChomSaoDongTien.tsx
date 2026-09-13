import { useMemo } from 'react';

/**
 * Chòm sao đồng tiền — hình tượng của Bắc Hưng Yên Connect.
 *
 * Ý tưởng (Giám đốc 08/09/2026): mỗi khách hàng, mỗi đối tác là một vì sao;
 * nối những vì sao lại thành hình đồng tiền VietinBank — đồng tiền mang lại
 * giá trị, may mắn và thành công cho khách hàng.
 *
 * Vẽ bằng SVG: các đỉnh được đặt trên đường viền đồng tiền (vòng tròn ngoài,
 * khe vuông mở ở đỉnh, vành cong phía dưới — đúng cấu trúc biểu tượng
 * VietinBank), nối với nhau bằng cạnh vàng kim như lưới trên logo Connect.
 * Ngoài đường viền có thêm vài sao rải rác «đang chờ nối» — khách hàng mới.
 * Sao nhấp nháy bằng CSS; máy bật «giảm chuyển động» thì đứng yên.
 *
 * Chuyển động khi rê chuột (Giám đốc 08/09: «khi quét chuột qua thì chuyển
 * động»): đặt SVG trong một khung mang lớp `chom-sao-khung`; khi khung được
 * hover, vòng sao xoay chậm quanh tâm, sao nhấp nháy dồn hơn và sao rải quanh
 * trôi về phía đồng tiền — như khách hàng mới đang được nối vào. Không dùng JS
 * cho phần này để hàng chục sao không kéo giật khung hình.
 */
interface Props {
  className?: string;
  mau?: string;
  hat?: number;
}

function taoNguon(hat: number) {
  let s = hat >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface Sao { x: number; y: number; r: number; tre: number }

export function ChomSaoDongTien({ className, mau = '#F2D27A', hat = 88 }: Props) {
  const { sao, canh, saoRoi } = useMemo(() => {
    const ngau = taoNguon(hat);
    const tam = { x: 200, y: 200 };
    const R = 150;
    const sao: Sao[] = [];

    // 1) Vòng tròn ngoài — chừa khoảng hở phía trên cho khe mở
    const soDinhVong = 28;
    for (let i = 0; i < soDinhVong; i++) {
      const goc = (-Math.PI / 2) + (i / soDinhVong) * Math.PI * 2;
      // Bỏ hai đỉnh sát đỉnh trên (khe mở của đồng tiền)
      if (Math.abs(goc + Math.PI / 2) < 0.22) continue;
      const nhieu = (ngau() - 0.5) * 6;
      sao.push({ x: tam.x + Math.cos(goc) * (R + nhieu), y: tam.y + Math.sin(goc) * (R + nhieu), r: 2 + ngau() * 2.2, tre: ngau() * 4 });
    }
    // 2) Khe vuông mở ở đỉnh — hai vách thẳng đi xuống rồi đáy ngang
    const nuaKhe = 34;
    const dayKhe = tam.y - 40;
    const dinhKhe = tam.y - R + 4;
    for (const dau of [-1, 1]) {
      for (let k = 0; k <= 3; k++) {
        const y = dinhKhe + ((dayKhe - dinhKhe) * k) / 3;
        sao.push({ x: tam.x + dau * nuaKhe, y, r: 2 + ngau() * 1.5, tre: ngau() * 4 });
      }
    }
    sao.push({ x: tam.x, y: dayKhe, r: 3.2, tre: 1 });
    // 3) Vành cong phía dưới — nét cười của đồng tiền VietinBank
    const soDinhVanh = 9;
    for (let i = 0; i <= soDinhVanh; i++) {
      const t = i / soDinhVanh;
      const x = tam.x - 105 + t * 210;
      const y = tam.y + 62 + Math.sin(t * Math.PI) * 26;
      sao.push({ x, y, r: 1.8 + ngau() * 1.6, tre: ngau() * 4 });
    }

    // Nối mỗi sao với 2 sao gần nhất → đường viền liền mạch, thêm vài dây chéo
    const canh: [number, number][] = [];
    sao.forEach((d, i) => {
      const gan = sao
        .map((k, j) => ({ j, kc: (k.x - d.x) ** 2 + (k.y - d.y) ** 2 }))
        .filter((k) => k.j !== i)
        .sort((a, b) => a.kc - b.kc)
        .slice(0, 2)
        .map((k) => k.j);
      for (const j of gan) if (i < j) canh.push([i, j]);
      if (ngau() < 0.12) {
        const xa = Math.floor(ngau() * sao.length);
        if (xa !== i) canh.push([i, xa]);
      }
    });

    // 4) Sao rải rác quanh — khách hàng mới «đang chờ nối»
    const saoRoi: Sao[] = Array.from({ length: 26 }, () => {
      let x = 0, y = 0;
      do { x = ngau() * 400; y = ngau() * 400; } while ((x - tam.x) ** 2 + (y - tam.y) ** 2 < (R + 18) ** 2);
      return { x, y, r: 0.8 + ngau() * 1.4, tre: ngau() * 5 };
    });

    return { sao, canh, saoRoi };
  }, [hat]);

  return (
    <svg viewBox="0 0 400 400" aria-hidden="true" className={className}>
      <defs>
        <radialGradient id="chom-sao-hao-quang" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={mau} stopOpacity="0.28" />
          <stop offset="60%" stopColor={mau} stopOpacity="0.06" />
          <stop offset="100%" stopColor={mau} stopOpacity="0" />
        </radialGradient>
        <style>{`
          @keyframes chom-sao-nhap-nhay { 0%, 100% { opacity: .55 } 50% { opacity: 1 } }
          @keyframes chom-sao-xoay { to { transform: rotate(360deg) } }
          @keyframes chom-sao-troi { 0%, 100% { transform: scale(1) } 50% { transform: scale(.94) } }
          .chom-sao-sao { animation: chom-sao-nhap-nhay 3.6s ease-in-out infinite; }
          .chom-sao-vong, .chom-sao-roi { transform-origin: 200px 200px; transform-box: view-box; }
          .chom-sao-khung:hover .chom-sao-vong { animation: chom-sao-xoay 36s linear infinite; }
          .chom-sao-khung:hover .chom-sao-roi { animation: chom-sao-troi 5s ease-in-out infinite; }
          .chom-sao-khung:hover .chom-sao-sao { animation-duration: 1.4s; }
          .chom-sao-khung:hover .chom-sao-canh { stroke-opacity: .95; }
          .chom-sao-canh { transition: stroke-opacity .6s ease; }
          @media (prefers-reduced-motion: reduce) {
            .chom-sao-sao, .chom-sao-khung:hover .chom-sao-vong, .chom-sao-khung:hover .chom-sao-roi { animation: none; }
            .chom-sao-sao { opacity: .9 }
          }
        `}</style>
      </defs>
      <circle cx="200" cy="200" r="190" fill="url(#chom-sao-hao-quang)" />
      <g className="chom-sao-roi">
        {saoRoi.map((s, k) => (
          <circle key={`r${k}`} cx={s.x} cy={s.y} r={s.r} fill="#fff" fillOpacity={0.7} className="chom-sao-sao" style={{ animationDelay: `${s.tre}s` }} />
        ))}
      </g>
      <g className="chom-sao-vong">
        {canh.map(([a, b], k) => (
          <line key={`c${k}`} className="chom-sao-canh" x1={sao[a].x} y1={sao[a].y} x2={sao[b].x} y2={sao[b].y} stroke={mau} strokeOpacity={0.55} strokeWidth={0.9} />
        ))}
        {sao.map((s, k) => (
          <g key={`s${k}`} className="chom-sao-sao" style={{ animationDelay: `${s.tre}s` }}>
            <circle cx={s.x} cy={s.y} r={s.r * 2.6} fill={mau} fillOpacity={0.14} />
            <circle cx={s.x} cy={s.y} r={s.r} fill={mau} />
          </g>
        ))}
      </g>
    </svg>
  );
}
