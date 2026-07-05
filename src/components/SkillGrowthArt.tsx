import { GROWTH_STAGE_LABELS } from '@/lib/skillLevels';

/**
 * Bộ hình chung 4 nấc phát triển skill theo motif "Cây ký ức"
 * (Vun gốc bền rễ – Vươn tầm tương lai):
 *   L1 Ươm mầm · L2 Bám rễ · L3 Vươn cành · L4 Lan tỏa
 * Dùng khi skill chưa có ảnh riêng lẫn icon riêng. Cùng ngôn ngữ vẽ với
 * MemoryTree: nét tròn, lá ellipse, bảng màu #0057B8 #1E88E5 #60A5FA #E60012.
 */

const ROYAL = '#0057B8';
const SKY = '#1E88E5';
const LIGHT = '#60A5FA';
const LIGHTER = '#93C5FD';
const RED = '#E60012';

function Leaf({ x, y, rot = 0, rx = 4.3, ry = 2.8, tone = SKY }: {
  x: number; y: number; rot?: number; rx?: number; ry?: number; tone?: string;
}) {
  return <ellipse cx={x} cy={y} rx={rx} ry={ry} transform={`rotate(${rot} ${x} ${y})`} fill={tone} opacity={0.95} />;
}

/* L1 — Ươm mầm: hạt đỏ trong đất, mầm hai lá nhú lên */
function StageSprout() {
  return (
    <g>
      <path d="M11 40 Q24 33.5 37 40" stroke={LIGHTER} strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="24" cy="38.5" r="2.6" fill={RED} />
      <path d="M24 36 C 24.4 31, 23.4 27, 24 22.5" stroke={SKY} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <Leaf x={18.5} y={21.5} rot={-32} rx={4.6} ry={2.9} tone={LIGHT} />
      <Leaf x={29.5} y={20} rot={26} rx={4.6} ry={2.9} tone={SKY} />
    </g>
  );
}

/* L2 — Bám rễ: cây non trên mặt đất, bộ rễ xòe rõ bên dưới */
function StageRoots() {
  return (
    <g>
      <path d="M9 32 H39" stroke={LIGHTER} strokeWidth="1.8" strokeLinecap="round" />
      <g stroke={ROYAL} strokeWidth="1.9" strokeLinecap="round" fill="none">
        <path d="M24 32 C 20 36, 16 38.5, 11.5 40.5" />
        <path d="M24 32 C 28 36, 32 38.5, 36.5 40.5" />
        <path d="M24 32 L 24 42.5" />
        <path d="M19 37 C 16.5 39, 14 40.2, 12 41" strokeWidth="1.3" />
        <path d="M29 37 C 31.5 39, 34 40.2, 36 41" strokeWidth="1.3" />
      </g>
      <path d="M24 32 C 24.5 26, 23.5 21, 24 15.5" stroke={SKY} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <Leaf x={18} y={16} rot={-30} tone={LIGHT} />
      <Leaf x={30} y={14} rot={26} tone={SKY} />
      <Leaf x={24} y={9.5} rot={0} tone={LIGHT} />
      <Leaf x={19} y={23} rot={-18} rx={3.4} ry={2.2} tone={LIGHTER} />
    </g>
  );
}

/* L3 — Vươn cành: thân vững, hai cành vươn ngang, tán bắt đầu mở */
function StageBranches() {
  return (
    <g>
      <path d="M17.5 43 Q24 40 30.5 43" stroke={LIGHTER} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <g stroke={SKY} strokeLinecap="round" fill="none">
        <path d="M24 42.5 C 23.2 35, 24.8 29, 24 22" strokeWidth="2.7" />
        <path d="M24 30 C 19.5 26.5, 15.5 24, 12 20" strokeWidth="1.9" />
        <path d="M24 28 C 28.5 24.5, 32.5 22, 36 18" strokeWidth="1.9" />
      </g>
      <Leaf x={11} y={17.5} rot={-35} tone={LIGHT} />
      <Leaf x={17} y={21.5} rot={-15} rx={3.5} ry={2.3} tone={LIGHTER} />
      <Leaf x={37} y={15.5} rot={30} tone={SKY} />
      <Leaf x={31} y={19.5} rot={12} rx={3.5} ry={2.3} tone={LIGHT} />
      <Leaf x={24} y={16.5} rot={0} tone={SKY} />
      <Leaf x={24} y={10.5} rot={0} rx={3.7} ry={2.4} tone={LIGHT} />
    </g>
  );
}

/* L4 — Lan tỏa: tán rộng phủ kín, quả logo và hào quang lan ra xung quanh */
function StageSpread() {
  return (
    <g>
      <path d="M16.5 44 Q24 41 31.5 44" stroke={LIGHTER} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <g stroke={SKY} strokeLinecap="round" fill="none">
        <path d="M24 43.5 C 23.2 37, 24.8 32.5, 24 27" strokeWidth="2.7" />
        <path d="M24 33.5 C 20 30.5, 16.5 28.5, 14 25.5" strokeWidth="1.8" />
        <path d="M24 32 C 28 29, 31.5 27, 34 24" strokeWidth="1.8" />
      </g>
      <Leaf x={10.5} y={20} rot={-35} tone={LIGHT} />
      <Leaf x={16} y={14.5} rot={-22} tone={SKY} />
      <Leaf x={24} y={11} rot={0} tone={LIGHT} />
      <Leaf x={32} y={14} rot={22} tone={SKY} />
      <Leaf x={37.5} y={19.5} rot={38} tone={LIGHT} />
      <Leaf x={19} y={20} rot={-10} rx={3.6} ry={2.4} tone={LIGHTER} />
      <Leaf x={29} y={19.5} rot={10} rx={3.6} ry={2.4} tone={LIGHTER} />
      <Leaf x={24} y={16} rot={0} rx={3.7} ry={2.4} tone={SKY} />
      <Leaf x={13} y={24.5} rot={-30} rx={3.4} ry={2.2} tone={LIGHTER} />
      <Leaf x={36} y={23} rot={30} rx={3.4} ry={2.2} tone={LIGHTER} />
      {/* Quả ngọt — logo VietinBank thu nhỏ */}
      <circle cx="30" cy="24.5" r="2.9" fill="#FFFFFF" />
      <path d="M 27.4 24.5 A 2.6 2.6 0 0 1 32.6 24.5 Z" fill={ROYAL} />
      <path d="M 27.4 24.5 A 2.6 2.6 0 0 0 32.6 24.5 Z" fill={RED} />
      {/* Hào quang lan tỏa */}
      <g fill={LIGHT} opacity={0.8}>
        <circle cx="6" cy="13" r="1.4" />
        <circle cx="42" cy="12.5" r="1.4" />
        <circle cx="24" cy="4" r="1.4" />
        <circle cx="9.5" cy="27" r="1.1" opacity="0.7" />
        <circle cx="39" cy="28" r="1.1" opacity="0.7" />
      </g>
    </g>
  );
}

const STAGES: Record<number, () => JSX.Element> = {
  1: StageSprout,
  2: StageRoots,
  3: StageBranches,
  4: StageSpread,
};

export function SkillGrowthArt({ stage, className = '' }: { stage: number; className?: string }) {
  const s = Math.min(Math.max(stage, 1), 4);
  const Stage = STAGES[s];
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label={`Nấc phát triển: ${GROWTH_STAGE_LABELS[s]}`}
      fill="none"
    >
      <Stage />
    </svg>
  );
}
