import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useEffect, useState } from 'react';
import { formatSkillLabel } from '@/lib/utils';

export interface RadarSkill {
  skill_id: string;
  code?: string | null;
  short_name: string;
  full_name: string;
  required: number;
  actual: number;
}

// Custom tick: render code on first line, short name on second line (wrap)
function AxisTick({ payload, x, y, textAnchor, cx, cy }: any) {
  const raw: string = payload?.value || '';
  // raw is formatSkillLabel(code, short_name) e.g. "SK01 · Lập KH bán hàng"
  const [code, ...rest] = raw.split(' · ');
  const name = rest.join(' · ');
  // Push label slightly outward from center to avoid clipping
  const dx = x > cx ? 4 : x < cx ? -4 : 0;
  const dy = y > cy ? 4 : y < cy ? -2 : 0;
  return (
    <g transform={`translate(${x + dx},${y + dy})`}>
      <text textAnchor={textAnchor} fill="hsl(var(--foreground))" fontSize={11} fontWeight={600}>
        <tspan x={0} dy={0}>{code}</tspan>
        {name && (
          <tspan x={0} dy={12} fontWeight={400} fill="hsl(var(--muted-foreground))" fontSize={10}>
            {name.length > 16 ? name.slice(0, 15) + '…' : name}
          </tspan>
        )}
      </text>
    </g>
  );
}

export function SkillRadarChart({ data }: { data: RadarSkill[] }) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 480px)');
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (!data || data.length < 3) {
    return <p className="text-sm text-muted-foreground">Cần ít nhất 3 skill lõi để vẽ biểu đồ radar.</p>;
  }
  const chartData = data.map(d => ({
    ...d,
    // On mobile: code only on axis; on larger screens: code + short name
    axis_label: isMobile ? (d.code || d.short_name) : formatSkillLabel(d.code, d.short_name),
  }));
  const height = isMobile ? 420 : 360;
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart
          data={chartData}
          margin={isMobile ? { top: 24, right: 48, bottom: 24, left: 48 } : { top: 16, right: 60, bottom: 16, left: 60 }}
        >
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="axis_label"
            tick={isMobile
              ? { fontSize: 11, fontWeight: 600, fill: 'hsl(var(--foreground))' }
              : (props: any) => <AxisTick {...props} />}
          />
          <PolarRadiusAxis angle={90} domain={[0, 4]} tickCount={5} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 13 }}
            labelFormatter={(_, payload: any) => {
              const item = payload?.[0]?.payload;
              if (!item) return '';
              return formatSkillLabel(item.code, item.full_name, ' — ');
            }}
          />
          <Radar name="Yêu cầu" dataKey="required" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.15} strokeDasharray="4 4" />
          <Radar name="Lãnh đạo duyệt" dataKey="actual" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.35} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
      {isMobile && (
        <p className="text-[11px] text-muted-foreground mt-2 px-1">
          Nhãn trục hiển thị mã skill. Chạm vào điểm trên biểu đồ để xem tên đầy đủ.
        </p>
      )}
    </div>
  );
}
