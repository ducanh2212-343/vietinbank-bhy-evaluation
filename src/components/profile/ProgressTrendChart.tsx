import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

export interface TrendPoint {
  cycle: string;
  meet: number;
  gap: number;
  attitude_weak: number;
  actions_done: number;
}

export function ProgressTrendChart({ data }: { data: TrendPoint[] }) {
  if (!data || data.length < 2) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Xu hướng phát triển theo kỳ</CardTitle>
        <p className="text-[11px] text-muted-foreground">Chỉ tính các kỳ đã được lãnh đạo duyệt (reviewed / approved / closed).</p>
      </CardHeader>
      <CardContent>
        <div className="w-full" style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="cycle" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="meet" name="Skill đạt chuẩn" stroke="hsl(var(--primary))" strokeWidth={2} />
              <Line type="monotone" dataKey="gap" name="Skill còn GAP" stroke="hsl(0 80% 55%)" strokeWidth={2} />
              <Line type="monotone" dataKey="attitude_weak" name="Thái độ cần cải thiện" stroke="hsl(40 95% 50%)" strokeWidth={2} />
              <Line type="monotone" dataKey="actions_done" name="Hành động hoàn thành" stroke="hsl(160 65% 45%)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
