/**
 * Cây ký ức — motif kỷ niệm 20 năm VietinBank Bắc Hưng Yên (2006–2026).
 * Tái hiện bộ nhận diện "Vun gốc bền rễ – Vươn tầm tương lai" bằng SVG vector:
 *   • Gốc rễ  — truyền thống, đoàn kết, nền tảng giá trị cốt lõi
 *   • Thân cây — sức mạnh, sự kiên định
 *   • Cành lá — lan tỏa, phát triển không ngừng (mỗi lá là một kỷ niệm)
 *   • Quả tròn — logo VietinBank: thành quả từ niềm tin và sự đồng hành
 *
 * Bảng màu chính thức: #003A8C #0057B8 #1E88E5 #E60012.
 * Dùng tông sáng để nổi trên nền navy (panel đăng nhập / banner).
 */

// [x, y, rx, ry, rotate, tone]
const LEAVES: [number, number, number, number, number, number][] = [
  [118, 190, 16, 9, -35, 0], [100, 158, 15, 9, -15, 1], [112, 124, 16, 9, 20, 2],
  [138, 96, 15, 9, 40, 0], [172, 76, 16, 9, 10, 1], [208, 68, 15, 9, -10, 2],
  [244, 78, 16, 9, -35, 0], [274, 100, 15, 9, -50, 1], [294, 132, 16, 9, -70, 2],
  [298, 168, 15, 9, 75, 0], [284, 198, 15, 9, 50, 1], [136, 215, 14, 8, -55, 2],
  [262, 219, 14, 8, 55, 0], [148, 148, 13, 8, 0, 2], [252, 150, 13, 8, 0, 1],
  [200, 118, 14, 8, 0, 0], [172, 226, 13, 8, -20, 1], [228, 230, 13, 8, 20, 2],
  [126, 172, 12, 7, -40, 1], [276, 176, 12, 7, 40, 0], [200, 92, 12, 7, 0, 2],
  [160, 108, 12, 7, 25, 1], [240, 108, 12, 7, -25, 0],
];

// [x, y] — "quả ngọt": logo VietinBank, biểu tượng từng cán bộ
const NODES: [number, number][] = [
  [140, 178], [168, 128], [204, 96], [244, 118], [272, 164],
  [226, 176], [184, 192], [252, 200], [160, 92], [200, 148],
];

// Tông sáng dần để nổi trên nền navy
const LEAF_TONES = ['#60A5FA', '#93C5FD', '#1E88E5'];

export function MemoryTree({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 430"
      className={className}
      role="img"
      aria-label="Cây ký ức 20 năm VietinBank Bắc Hưng Yên"
      fill="none"
    >
      <defs>
        <linearGradient id="mt-trunk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="100%" stopColor="#1E88E5" />
        </linearGradient>
      </defs>

      {/* Skyline mờ phía sau — thành phố vươn tầm */}
      <g opacity="0.16" fill="#93C5FD">
        <rect x="18" y="300" width="26" height="80" rx="2" />
        <rect x="52" y="322" width="20" height="58" rx="2" />
        <rect x="330" y="308" width="24" height="72" rx="2" />
        <rect x="362" y="330" width="18" height="50" rx="2" />
      </g>

      {/* Gốc rễ — nền móng, truyền thống */}
      <g stroke="url(#mt-trunk)" strokeLinecap="round" fill="none">
        <path d="M200 352 C 178 366, 148 374, 116 380" strokeWidth="7" />
        <path d="M200 352 C 222 366, 252 374, 284 380" strokeWidth="7" />
        <path d="M200 352 C 190 372, 174 388, 156 398" strokeWidth="5" />
        <path d="M200 352 C 210 372, 226 388, 244 398" strokeWidth="5" />
        <path d="M200 352 L 200 400" strokeWidth="4" />
        <path d="M168 372 C 156 380, 142 386, 128 390" strokeWidth="3" />
        <path d="M232 372 C 244 380, 258 386, 272 390" strokeWidth="3" />
      </g>

      {/* Thân cây — bản lĩnh, kiên định */}
      <g stroke="url(#mt-trunk)" strokeLinecap="round" fill="none">
        <path d="M200 355 C 196 305, 204 262, 200 212" strokeWidth="16" />
        <path d="M200 262 C 172 242, 142 226, 120 206" strokeWidth="9" />
        <path d="M200 262 C 230 242, 262 230, 284 206" strokeWidth="9" />
        <path d="M200 228 C 180 202, 166 186, 152 166" strokeWidth="7" />
        <path d="M200 228 C 222 204, 240 190, 254 166" strokeWidth="7" />
        <path d="M200 212 C 198 186, 202 166, 200 142" strokeWidth="7" />
        <path d="M156 170 C 146 154, 140 142, 136 128" strokeWidth="4" />
        <path d="M250 170 C 260 154, 266 142, 270 128" strokeWidth="4" />
      </g>

      {/* Cành lá — lan tỏa, phát triển */}
      <g>
        {LEAVES.map(([x, y, rx, ry, rot, tone], i) => (
          <ellipse
            key={i}
            cx={x}
            cy={y}
            rx={rx}
            ry={ry}
            transform={`rotate(${rot} ${x} ${y})`}
            fill={LEAF_TONES[tone]}
            opacity={0.92}
          />
        ))}
      </g>

      {/* Quả ngọt — logo VietinBank (navy trên, đỏ dưới) */}
      <g>
        {NODES.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="13" fill="#FFFFFF" />
            <path d={`M ${x - 9} ${y} A 9 9 0 0 1 ${x + 9} ${y} Z`} fill="#0057B8" />
            <path d={`M ${x - 9} ${y} A 9 9 0 0 0 ${x + 9} ${y} Z`} fill="#E60012" />
          </g>
        ))}
      </g>

      {/* Hạt mầm — thế hệ tiếp nối */}
      <g>
        <path d="M96 344 C 96 336, 98 330, 102 324" stroke="#1E88E5" strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="96" cy="322" rx="7" ry="4" transform="rotate(-30 96 322)" fill="#60A5FA" />
        <ellipse cx="108" cy="320" rx="7" ry="4" transform="rotate(25 108 320)" fill="#1E88E5" />
        <circle cx="97" cy="347" r="5" fill="#E60012" />
      </g>
    </svg>
  );
}
