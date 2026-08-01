import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Compass, Grid3x3, Info, RefreshCw, Target } from 'lucide-react';
import { OnePageShell } from '@/components/one/OnePageShell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActionPlans } from '@/components/one/move2/useActionPlans';
import { ActionPlanBoard } from '@/components/one/move2/ActionPlanBoard';
import { ActionPlanDetailDialog, ActionPlanCreateDialog } from '@/components/one/move2/ActionPlanDialogs';
import type { ActionPlan } from '@/lib/actionPlans';

// Chiêu thức 2 — «Lập kế hoạch hành động». Trang gồm hai phần:
//  1. Giới thiệu phương pháp: SWOT → TOWS → 5W2H (nội dung nghiệp vụ đã duyệt).
//  2. Bảng kế hoạch hành động cấp Phòng của cả Chi nhánh, theo nhịp PDCA.
// Phạm vi xem do RLS quyết định: phòng mình · phòng PGĐ phụ trách · toàn CN với
// Giám đốc và Phòng TCTH · cộng thêm các phòng được thêm vào chiến dịch chung.

const BUOC = [
  {
    icon: Compass,
    ten: 'SWOT',
    mo: 'Nhìn thẳng vào nội tại: điểm mạnh, điểm yếu của Phòng và cơ hội, thách thức từ địa bàn.',
  },
  {
    icon: Grid3x3,
    ten: 'TOWS',
    mo: 'Ghép cặp các yếu tố để ra hướng đi: lấy điểm mạnh đón cơ hội, khắc phục điểm yếu trước thách thức.',
  },
  {
    icon: Target,
    ten: '5W2H',
    mo: 'Biến hướng đi thành việc cụ thể: What · Why · When · Where · Who · How · How much.',
  },
  {
    icon: RefreshCw,
    ten: 'PDCA',
    mo: 'Báo nhịp hằng tuần trên chính thẻ việc — Plan, Do, Check, Act — để kế hoạch không nằm trên giấy.',
  },
];

interface Cycle { id: string; name: string; status: string }

export default function OneMove2Page() {
  return (
    <OnePageShell>
      <NoiDung />
    </OnePageShell>
  );
}

function NoiDung() {
  const { isAdmin, isManager, isPgd } = useAuth();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [mo, setMo] = useState<ActionPlan | null>(null);
  const [dangTao, setDangTao] = useState(false);

  useEffect(() => {
    let huy = false;
    (async () => {
      const { data } = await supabase
        .from('evaluation_cycles')
        .select('id, name, status')
        .order('start_date', { ascending: false })
        .limit(8);
      if (huy) return;
      const ds = (data ?? []) as Cycle[];
      setCycles(ds);
      // Mặc định vào kỳ đang mở; không có kỳ mở thì lấy kỳ gần nhất
      setCycleId(ds.find((c) => c.status === 'active')?.id ?? ds[0]?.id ?? null);
    })();
    return () => { huy = true; };
  }, []);

  const { plans, phongThamGia, departments, loading, chuaApMigration, loi, taiLai } = useActionPlans(cycleId);

  const coQuyenTao = isAdmin || isManager || isPgd;
  const planDangMo = useMemo(
    () => (mo ? plans.find((p) => p.id === mo.id) ?? mo : null),
    [mo, plans],
  );

  return (
    <>
      {/* Giới thiệu phương pháp */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-blue-50 via-white to-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <p className="text-2xs font-semibold uppercase tracking-widest text-brand-red">Chiêu thức số 2</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
            Lập kế hoạch — Hành động
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-600">
            «Bí kíp bỏ túi» để các Phòng giao chỉ tiêu và lập kế hoạch hành động: đánh giá nội tại theo
            SWOT, kết hợp yếu tố theo ma trận TOWS, rồi cụ thể hóa thành hành động theo công thức 5W2H.
            Nhờ vậy đầu mối PDCA định kỳ dễ dàng và có tính định lượng. Duy trì từ tháng 2/2024.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BUOC.map(({ icon: Icon, ten, mo: moTa }, i) => (
              <div key={ten} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-navy/10 text-brand-navy">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-2xs font-semibold tabular-nums text-slate-400">Bước {i + 1}</span>
                </div>
                <p className="text-sm font-semibold text-brand-navy">{ten}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{moTa}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bảng kế hoạch hành động toàn Chi nhánh */}
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-brand-navy">
              <ClipboardList className="h-5 w-5" />
              Kế hoạch hành động của Chi nhánh
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Anh/chị thấy kế hoạch của phòng mình, các phòng mình phụ trách, và mọi chiến dịch chung
              có phòng mình tham gia.
            </p>
          </div>
          {cycles.length > 0 && (
            <Select value={cycleId ?? ''} onValueChange={setCycleId}>
              <SelectTrigger className="h-9 w-full sm:w-56" aria-label="Chọn kỳ">
                <SelectValue placeholder="Chọn kỳ" />
              </SelectTrigger>
              <SelectContent>
                {cycles.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {chuaApMigration && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Tính năng đã sẵn sàng, còn chờ áp migration</AlertTitle>
            <AlertDescription>
              Bảng kế hoạch hành động chưa có trong database. Quản trị viên cần áp migration
              <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">
                20260805090000_chieu_thuc_2_ke_hoach_hanh_dong_phong.sql
              </code>
              vào project Supabase (SQL Editor hoặc <code className="text-xs">supabase db push</code>),
              rồi tải lại trang.
            </AlertDescription>
          </Alert>
        )}

        {loi && !chuaApMigration && (
          <Alert variant="destructive">
            <AlertTitle>Không đọc được dữ liệu</AlertTitle>
            <AlertDescription>{loi}</AlertDescription>
          </Alert>
        )}

        {loading && !chuaApMigration && (
          <div className="grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
          </div>
        )}

        {!loading && !chuaApMigration && !loi && (
          <>
            {plans.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-10 text-center">
                <p className="text-sm text-slate-600">
                  Kỳ này chưa có kế hoạch hành động nào trong tầm nhìn của anh/chị.
                </p>
                {coQuyenTao && (
                  <p className="mt-1 text-sm text-slate-500">
                    Bấm «Lập kế hoạch» để mở kế hoạch đầu tiên cho Phòng.
                  </p>
                )}
              </div>
            ) : null}

            <div className={plans.length === 0 ? 'mt-4' : ''}>
              <ActionPlanBoard
                plans={plans}
                departments={departments}
                phongThamGia={phongThamGia}
                onMoKeHoach={setMo}
                onTaoMoi={() => setDangTao(true)}
                coQuyenTao={coQuyenTao}
              />
            </div>
          </>
        )}
      </section>

      <ActionPlanDetailDialog
        plan={planDangMo}
        departments={departments}
        phongThamGia={planDangMo ? phongThamGia[planDangMo.id] ?? [] : []}
        onClose={() => setMo(null)}
        onDaGhiNhip={taiLai}
      />

      <ActionPlanCreateDialog
        open={dangTao}
        departments={departments}
        cycleId={cycleId}
        onClose={() => setDangTao(false)}
        onXong={taiLai}
      />
    </>
  );
}
