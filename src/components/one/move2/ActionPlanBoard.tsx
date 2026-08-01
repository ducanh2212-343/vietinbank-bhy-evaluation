import { useMemo, useState } from 'react';
import {
  AlertTriangle, CalendarClock, Plus, RefreshCw, Trophy, Users2, CircleDot, Check,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import {
  PDCA_SHORT, STATUS_LABEL, boNhipTuan, laQuaHan, sapXepKeHoach, soNgayConLai,
  tomTatTheoPhong, xepHangPhong, type ActionPlan, type ActionStatus,
} from '@/lib/actionPlans';
import { cn } from '@/lib/utils';
import type { PhongBan } from './useActionPlans';

const COT: Array<{ id: ActionStatus; icon: typeof CircleDot }> = [
  { id: 'todo', icon: CircleDot },
  { id: 'doing', icon: RefreshCw },
  { id: 'done', icon: Check },
];

/** Bảng thi đua giữa các phòng — đòn bẩy động lực của Chiêu thức 2. */
function BangThiDua({ plans, departments }: { plans: ActionPlan[]; departments: PhongBan[] }) {
  const tenPhong = useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d.name])),
    [departments],
  );
  const bang = useMemo(() => xepHangPhong(tomTatTheoPhong(plans)), [plans]);

  if (bang.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4 text-brand-gold" />
          Nhịp PDCA theo Phòng
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Xếp theo <strong>nhịp báo cáo tuần</strong> trước, rồi mới tới số việc quá hạn và tiến độ —
          phòng ít việc mà tuần nào cũng báo vẫn đứng trên phòng nhiều việc bỏ bẵng.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">#</th>
              <th className="px-2 py-2 font-medium">Phòng</th>
              <th className="px-2 py-2 text-right font-medium">Nhịp tuần</th>
              <th className="px-2 py-2 text-right font-medium">Tiến độ TB</th>
              <th className="px-2 py-2 text-right font-medium">Quá hạn</th>
              <th className="px-4 py-2 text-right font-medium">Tổng việc</th>
            </tr>
          </thead>
          <tbody>
            {bang.map((r, i) => (
              <tr key={r.departmentId} className="border-b last:border-0">
                <td className="px-4 py-2 tabular-nums text-muted-foreground">{i + 1}</td>
                <td className="px-2 py-2 font-medium">{tenPhong[r.departmentId] ?? 'Chưa rõ phòng'}</td>
                <td className="px-2 py-2 text-right">
                  <span
                    className={cn(
                      'tabular-nums font-semibold',
                      r.tiLeBaoNhip >= 80 ? 'text-emerald-700' : r.tiLeBaoNhip >= 50 ? 'text-amber-700' : 'text-destructive',
                    )}
                  >
                    {r.tiLeBaoNhip}%
                  </span>
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{r.tienDoTrungBinh}%</td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {r.quaHan > 0 ? <span className="font-semibold text-destructive">{r.quaHan}</span> : '—'}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{r.tong}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function TheKeHoach({
  plan,
  tenPhong,
  soPhongThamGia,
  onMo,
}: {
  plan: ActionPlan;
  tenPhong: string;
  soPhongThamGia: number;
  onMo: (p: ActionPlan) => void;
}) {
  const quaHan = laQuaHan(plan);
  const boNhip = boNhipTuan(plan);
  const conLai = soNgayConLai(plan);

  return (
    <button
      type="button"
      onClick={() => onMo(plan)}
      className={cn(
        'w-full rounded-xl border bg-card p-3 text-left shadow-soft transition-all duration-fast',
        'hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        quaHan && 'border-destructive/40',
      )}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="text-2xs">{PDCA_SHORT[plan.pdca_stage]}</Badge>
        {plan.is_campaign && (
          <Badge className="gap-1 bg-brand-royal text-2xs text-white hover:bg-brand-royal">
            <Users2 className="h-3 w-3" />
            Chiến dịch chung{soPhongThamGia > 0 ? ` · ${soPhongThamGia} phòng` : ''}
          </Badge>
        )}
        {quaHan && (
          <Badge variant="destructive" className="gap-1 text-2xs">
            <AlertTriangle className="h-3 w-3" />
            Quá hạn
          </Badge>
        )}
        {!quaHan && boNhip && (
          <Badge variant="outline" className="border-amber-500 text-2xs text-amber-700">
            Chưa báo nhịp tuần này
          </Badge>
        )}
      </div>

      <p className="mb-2 line-clamp-2 text-sm font-medium leading-snug">{plan.title}</p>

      <div className="mb-2 flex items-center gap-2">
        <Progress value={plan.progress_percent} className="h-1.5 flex-1" />
        <span className="shrink-0 tabular-nums text-2xs text-muted-foreground">{plan.progress_percent}%</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-foreground">
        <span className="truncate">{tenPhong}</span>
        {plan.due_date && (
          <span className={cn('inline-flex items-center gap-1', quaHan && 'font-semibold text-destructive')}>
            <CalendarClock className="h-3 w-3" />
            {new Date(plan.due_date).toLocaleDateString('vi-VN')}
            {conLai !== null && conLai >= 0 && conLai <= 7 && ` · còn ${conLai} ngày`}
          </span>
        )}
      </div>
    </button>
  );
}

interface Props {
  plans: ActionPlan[];
  departments: PhongBan[];
  phongThamGia: Record<string, string[]>;
  onMoKeHoach: (p: ActionPlan) => void;
  onTaoMoi: () => void;
  coQuyenTao: boolean;
}

export function ActionPlanBoard({
  plans, departments, phongThamGia, onMoKeHoach, onTaoMoi, coQuyenTao,
}: Props) {
  const { departmentId } = useAuth();
  const [locPhong, setLocPhong] = useState<string>('all');

  const tenPhong = useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d.name])),
    [departments],
  );

  // Chỉ hiện bộ lọc phòng khi người dùng thực sự thấy được nhiều phòng
  const phongCoDuLieu = useMemo(() => {
    const ids = new Set(plans.map((p) => p.owner_department_id));
    return departments.filter((d) => ids.has(d.id));
  }, [plans, departments]);

  const daLoc = useMemo(() => {
    if (locPhong === 'all') return plans;
    if (locPhong === 'cua-toi') {
      return plans.filter(
        (p) => p.owner_department_id === departmentId
          || (phongThamGia[p.id] ?? []).includes(departmentId ?? ''),
      );
    }
    return plans.filter(
      (p) => p.owner_department_id === locPhong || (phongThamGia[p.id] ?? []).includes(locPhong),
    );
  }, [plans, locPhong, departmentId, phongThamGia]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {phongCoDuLieu.length > 1 && (
          <Select value={locPhong} onValueChange={setLocPhong}>
            <SelectTrigger className="h-9 w-full sm:w-64" aria-label="Lọc theo phòng">
              <SelectValue placeholder="Tất cả phòng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả phòng trong tầm nhìn</SelectItem>
              {departmentId && <SelectItem value="cua-toi">Phòng của tôi</SelectItem>}
              {phongCoDuLieu.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex-1" />
        {coQuyenTao && (
          <Button onClick={onTaoMoi} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Lập kế hoạch
          </Button>
        )}
      </div>

      <BangThiDua plans={daLoc} departments={departments} />

      <div className="grid gap-4 lg:grid-cols-3">
        {COT.map(({ id, icon: Icon }) => {
          const cot = sapXepKeHoach(daLoc.filter((p) => p.status === id));
          return (
            <section key={id} aria-label={STATUS_LABEL[id]} className="rounded-2xl bg-muted/40 p-3">
              <h3 className="mb-3 flex items-center gap-2 px-1 text-sm font-semibold">
                <Icon className="h-4 w-4 text-muted-foreground" />
                {STATUS_LABEL[id]}
                <span className="ml-auto tabular-nums text-xs font-normal text-muted-foreground">
                  {cot.length}
                </span>
              </h3>
              <div className="space-y-2.5">
                {cot.map((p) => (
                  <TheKeHoach
                    key={p.id}
                    plan={p}
                    tenPhong={tenPhong[p.owner_department_id] ?? 'Chưa rõ phòng'}
                    soPhongThamGia={(phongThamGia[p.id] ?? []).length}
                    onMo={onMoKeHoach}
                  />
                ))}
                {cot.length === 0 && (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                    Chưa có kế hoạch nào ở cột này.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
