import { useMemo } from 'react';

/**
 * Hoạ tiết mạng lưới đa giác — cùng ngôn ngữ với logo Bắc Hưng Yên Connect
 * (quả cầu dựng từ các đỉnh và cạnh vàng kim trên nền đỏ chuyển xanh).
 *
 * Vẽ bằng SVG thay vì dùng ảnh: không tốn thêm tệp, đổi màu/độ mờ theo từng
 * nền đặt vào, và điểm được gieo theo hạt cố định nên mỗi lần vẽ đều giống
 * nhau (ảnh chụp kiểm thử không nhảy).
 */
interface Props {
  className?: string;
  /** Màu cạnh/đỉnh — mặc định vàng kim của logo */
  mau?: string;
  /** Số đỉnh; càng nhiều càng dày */
  soDinh?: number;
  hat?: number;
}

function taoNguon(hat: number) {
  let s = hat >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function HoaTietMangLuoi({ className, mau = '#E8C46A', soDinh = 46, hat = 343 }: Props) {
  const { dinh, canh, tamGiac } = useMemo(() => {
    const ngau = taoNguon(hat);
    const dinh = Array.from({ length: soDinh }, () => ({
      x: ngau() * 400,
      y: ngau() * 300,
      r: 1 + ngau() * 2.2,
    }));
    const canh: [number, number][] = [];
    const tamGiac: [number, number, number][] = [];
    dinh.forEach((d, i) => {
      // Nối mỗi đỉnh với 3 đỉnh gần nhất — đủ tạo lưới tam giác như logo, không rối
      const gan = dinh
        .map((k, j) => ({ j, kc: (k.x - d.x) ** 2 + (k.y - d.y) ** 2 }))
        .filter((k) => k.j !== i)
        .sort((a, b) => a.kc - b.kc)
        .slice(0, 3)
        .map((k) => k.j);
      gan.forEach((j) => {
        if (i < j) canh.push([i, j]);
      });
      if (gan.length >= 2 && ngau() < 0.35) tamGiac.push([i, gan[0], gan[1]]);
    });
    return { dinh, canh, tamGiac };
  }, [soDinh, hat]);

  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={className}
    >
      {tamGiac.map(([a, b, c], k) => (
        <polygon
          key={`t${k}`}
          points={`${dinh[a].x},${dinh[a].y} ${dinh[b].x},${dinh[b].y} ${dinh[c].x},${dinh[c].y}`}
          fill={mau}
          fillOpacity={0.08}
        />
      ))}
      {canh.map(([a, b], k) => (
        <line
          key={`c${k}`}
          x1={dinh[a].x}
          y1={dinh[a].y}
          x2={dinh[b].x}
          y2={dinh[b].y}
          stroke={mau}
          strokeOpacity={0.45}
          strokeWidth={0.6}
        />
      ))}
      {dinh.map((d, k) => (
        <circle key={`d${k}`} cx={d.x} cy={d.y} r={d.r} fill={mau} fillOpacity={0.85} />
      ))}
    </svg>
  );
}
