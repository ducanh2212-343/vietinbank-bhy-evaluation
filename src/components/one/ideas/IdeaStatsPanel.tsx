import React from 'react';
import { BarChart3, Coins, Layers, TrendingUp } from 'lucide-react';
import {
  IDEA_DEV_LEVELS,
  IDEA_DEV_LEVEL_EMOJI,
  IDEA_TIER_REWARDS,
  type IdeaDevLevel,
} from '@/data/one/ideasConfig';
import type { PortalIdea } from './usePortalIdeas';

// Bảng thống kê sáng kiến — tính trực tiếp từ danh sách ý tưởng (không hardcode):
// 3 bộ đếm, thanh tiến độ theo phạm vi áp dụng & cấp độ phát triển,
// và dự toán ngân sách khen thưởng theo đơn giá IDEA_TIER_REWARDS.

/** Tổng dự toán thưởng = Σ (số ý tưởng mỗi cấp × đơn giá cấp đó) — tách thuần để unit-test */
export function computeIdeaBudget(counts: Record<IdeaDevLevel, number>): number {
  return IDEA_DEV_LEVELS.reduce((sum, lv) => sum + (counts[lv] ?? 0) * IDEA_TIER_REWARDS[lv], 0);
}

const formatVnd = (n: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

/** Nhãn đơn giá ngắn gọn kiểu bản gốc: 100k / 300k / 1M / 3M */
const rewardShort = (n: number): string =>
  n >= 1_000_000 ? `${n / 1_000_000}M` : `${n / 1_000}k`;

const DEV_LEVEL_BAR_COLORS: Record<IdeaDevLevel, string> = {
  'Ươm mầm': 'bg-amber-400',
  'Bén rễ': 'bg-teal-500',
  'Vươn cành': 'bg-emerald-500',
  'Lan tỏa': 'bg-rose-500',
};

const APPLICABILITY_BARS = [
  { label: 'Cấp Phòng', color: 'bg-[#005a9c]' },
  { label: 'Cấp Chi nhánh', color: 'bg-amber-500' },
  { label: 'Toàn hàng', color: 'bg-[#ed1b24]' },
] as const;

interface IdeaStatsPanelProps {
  ideas: PortalIdea[];
}

export const IdeaStatsPanel: React.FC<IdeaStatsPanelProps> = ({ ideas }) => {
  const total = ideas.length;
  const internalCount = ideas.filter(i => i.level === 'Nội bộ CN').length;
  const tscCount = ideas.filter(i => i.level === 'Đề xuất TSC').length;

  const devCounts = Object.fromEntries(
    IDEA_DEV_LEVELS.map(lv => [lv, ideas.filter(i => i.developmentLevel === lv).length]),
  ) as Record<IdeaDevLevel, number>;
  const totalBudget = computeIdeaBudget(devCounts);

  const pct = (count: number) => (total > 0 ? (count / total) * 100 : 0);

  return (
    <div className="bg-gradient-to-br from-amber-50/50 to-slate-50 p-5 rounded-2xl border border-amber-200 shadow-sm space-y-4">
      <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 border-b pb-2.5 border-amber-200/70">
        <BarChart3 className="w-4 h-4 text-amber-500" />
        <span>Thống Kê Sáng Kiến Thời Gian Thực</span>
      </h4>

      {/* 3 bộ đếm */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white p-3 rounded-xl text-center border shadow-sm">
          <span className="text-2xs text-slate-400 block uppercase font-bold tracking-tight">Tổng số</span>
          <span className="text-xl font-black text-amber-600">{total}</span>
        </div>
        <div className="bg-white p-3 rounded-xl text-center border shadow-sm">
          <span className="text-2xs text-slate-400 block uppercase font-bold tracking-tight">Nội bộ CN</span>
          <span className="text-xl font-black text-[#005a9c]">{internalCount}</span>
        </div>
        <div className="bg-white p-3 rounded-xl text-center border shadow-sm">
          <span className="text-2xs text-slate-400 block uppercase font-bold tracking-tight">Đề xuất TSC</span>
          <span className="text-xl font-black text-[#ed1b24]">{tscCount}</span>
        </div>
      </div>

      {/* Thanh tiến độ theo phạm vi áp dụng */}
      <div className="space-y-3 pt-1 text-xs">
        <span className="font-bold text-slate-700 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          Phạm vi áp dụng dự kiến:
        </span>
        {APPLICABILITY_BARS.map(item => {
          const count = ideas.filter(i => i.applicability === item.label).length;
          const percentage = pct(count);
          return (
            <div key={item.label} className="space-y-1">
              <div className="flex justify-between text-2xs font-medium">
                <span className="text-slate-600 font-semibold">{item.label}</span>
                <span className="text-slate-800 font-extrabold">{count} ý tưởng ({percentage.toFixed(0)}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border">
                <div className={`h-full ${item.color} transition-all duration-500`} style={{ width: `${percentage}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Thanh tiến độ theo cấp độ phát triển */}
      <div className="space-y-3 pt-3 border-t border-dashed text-xs border-amber-200">
        <span className="font-bold text-slate-700 flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
          Phân cấp độ phát triển ý tưởng:
        </span>
        {IDEA_DEV_LEVELS.map(lv => {
          const count = devCounts[lv];
          const percentage = pct(count);
          return (
            <div key={lv} className="space-y-1">
              <div className="flex justify-between text-2xs font-medium">
                <span className="text-slate-600 font-semibold">{lv} {IDEA_DEV_LEVEL_EMOJI[lv]}</span>
                <span className="text-slate-800 font-extrabold">{count} ý tưởng ({percentage.toFixed(0)}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border">
                <div className={`h-full ${DEV_LEVEL_BAR_COLORS[lv]} transition-all duration-500`} style={{ width: `${percentage}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Dự toán ngân sách khen thưởng */}
      <div className="space-y-2 pt-3 border-t border-dashed text-xs border-amber-200">
        <span className="font-bold text-slate-700 flex items-center gap-1">
          <Coins className="w-3.5 h-3.5 text-amber-600" />
          Dự toán ngân sách khen thưởng:
        </span>

        <div className="bg-amber-50/40 p-2.5 rounded-xl border border-amber-200/50 space-y-1.5 font-medium text-slate-700">
          {IDEA_DEV_LEVELS.map(lv => (
            <div key={lv} className="flex justify-between text-2xs">
              <span className="text-slate-600 font-semibold">
                {lv} {IDEA_DEV_LEVEL_EMOJI[lv]} ({rewardShort(IDEA_TIER_REWARDS[lv])}/ý tưởng):
              </span>
              <span className="font-bold text-slate-800">{formatVnd(devCounts[lv] * IDEA_TIER_REWARDS[lv])}</span>
            </div>
          ))}
          <div className="border-t border-amber-200 pt-1.5 mt-1 flex justify-between text-xs font-black text-amber-900">
            <span className="flex items-center gap-0.5 uppercase tracking-wide">Tổng dự toán:</span>
            <span className="text-amber-700 font-black text-sm">{formatVnd(totalBudget)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
