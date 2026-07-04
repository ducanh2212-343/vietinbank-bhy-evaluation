/**
 * Huy hiệu "20 năm" — VietinBank Bắc Hưng Yên (2006–2026).
 * Số 20 navy với vòng đỏ nhận diện, dùng ở sidebar, login, banner.
 */
export function AnniversaryBadge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} role="img" aria-label="20 năm VietinBank Bắc Hưng Yên" fill="none">
      {/* Vòng đỏ nhận diện */}
      <path
        d="M78 20 A44 44 0 1 0 84 52"
        stroke="#E60012"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Số 20 */}
      <text
        x="48"
        y="56"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="800"
        fontSize="42"
        fill="#003A8C"
        letterSpacing="-1"
      >
        20
      </text>
      {/* Gạch năm 2006 - 2026 */}
      <text
        x="48"
        y="72"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="600"
        fontSize="9"
        fill="#0057B8"
        letterSpacing="1"
      >
        2006–2026
      </text>
    </svg>
  );
}
