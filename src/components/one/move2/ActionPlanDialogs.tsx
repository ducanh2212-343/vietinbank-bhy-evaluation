import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CalendarClock, Users2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  PDCA_LABEL, PDCA_ORDER, STATUS_LABEL, laQuaHan, type ActionPlan, type PdcaStage,
} from '@/lib/actionPlans';
import { ghiNhipPdca, type PhongBan } from './useActionPlans';

/** Bảng mới chưa có trong types.ts sinh tự động — ép kiểu ở đúng ranh giới truy vấn. */
const db = supabase as unknown as {
  from: (t: string) => {
    select: (c: string) => { eq: (c: string, v: string) => { order: (c: string, o?: { ascending?: boolean }) => Promise<{ data: unknown; error: unknown }> } };
    insert: (v: unknown) => { select: (c: string) => { single: () => Promise<{ data: unknown; error: { message?: string } | null }> } };
    delete: () => { eq: (c: string, v: string) => Promise<{ error: unknown }> };
  };
};

// ---------------------------------------------------------------------------
// Chi tiết kế hoạch + nhật ký PDCA
// ---------------------------------------------------------------------------

interface ChiTietProps {
  plan: ActionPlan | null;
  departments: PhongBan[];
  phongThamGia: string[];
  onClose: () => void;
  onDaGhiNhip: () => void;
}

export function ActionPlanDetailDialog({
  plan, departments, phongThamGia, onClose, onDaGhiNhip,
}: ChiTietProps) {
  const { profileId, departmentId } = useAuth();
  const [stage, setStage] = useState<PdcaStage>('do');
  const [progress, setProgress] = useState('');
  const [note, setNote] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [nhatKy, setNhatKy] = useState<Array<{ id: string; note: string; created_at: string; pdca_stage: PdcaStage; progress_percent: number | null }>>([]);

  const tenPhong = useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d.name])),
    [departments],
  );

  useEffect(() => {
    if (!plan) return;
    setStage(plan.pdca_stage);
    setProgress(String(plan.progress_percent));
    setNote('');
    let huy = false;
    (async () => {
      const { data } = await db
        .from('action_plan_updates')
        .select('id, note, created_at, pdca_stage, progress_percent')
        .eq('action_plan_id', plan.id)
        .order('created_at', { ascending: false });
      if (!huy) setNhatKy((data ?? []) as typeof nhatKy);
    })();
    return () => { huy = true; };
  }, [plan]);

  if (!plan) return null;

  const guiNhip = async () => {
    if (!profileId) return;
    if (!note.trim()) {
      toast.error('Hãy ghi vài dòng về việc đã làm hoặc vướng mắc — đây là bằng chứng PDCA.');
      return;
    }
    const soTienDo = progress.trim() === '' ? null : Number(progress);
    if (soTienDo !== null && (Number.isNaN(soTienDo) || soTienDo < 0 || soTienDo > 100)) {
      toast.error('Tiến độ phải là số từ 0 đến 100.');
      return;
    }
    setDangGui(true);
    const { error } = await ghiNhipPdca({
      actionPlanId: plan.id,
      profileId,
      departmentId,
      stage,
      progress: soTienDo,
      note,
    });
    setDangGui(false);
    if (error) {
      toast.error(`Không ghi được nhịp: ${error}`);
      return;
    }
    toast.success('Đã ghi nhịp PDCA');
    onDaGhiNhip();
    onClose();
  };

  const truong: Array<[string, string | null]> = [
    ['Vì sao làm (Why)', plan.why],
    ['Làm ở đâu (Where)', plan.where_place],
    ['Cách làm (How)', plan.how],
    ['Nguồn lực / chỉ tiêu (How much)', plan.how_much],
  ];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-6 text-lg leading-snug">{plan.title}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-1.5 pt-1">
            <Badge variant="secondary">{STATUS_LABEL[plan.status]}</Badge>
            <Badge variant="outline">{PDCA_LABEL[plan.pdca_stage]}</Badge>
            <span className="text-muted-foreground">{tenPhong[plan.owner_department_id] ?? 'Chưa rõ phòng'}</span>
            {plan.due_date && (
              <span className={laQuaHan(plan) ? 'font-semibold text-destructive' : 'text-muted-foreground'}>
                <CalendarClock className="mr-1 inline h-3.5 w-3.5" />
                Hạn {new Date(plan.due_date).toLocaleDateString('vi-VN')}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Progress value={plan.progress_percent} className="h-2 flex-1" />
            <span className="shrink-0 tabular-nums text-sm font-medium">{plan.progress_percent}%</span>
          </div>

          {plan.is_campaign && phongThamGia.length > 0 && (
            <div className="rounded-xl border bg-muted/40 p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold">
                <Users2 className="h-3.5 w-3.5" />
                Chiến dịch chung — các phòng cùng tham gia
              </p>
              <p className="text-sm text-muted-foreground">
                {phongThamGia.map((id) => tenPhong[id] ?? id).join(' · ')}
              </p>
            </div>
          )}

          <dl className="grid gap-3 sm:grid-cols-2">
            {truong.filter(([, v]) => !!v).map(([nhan, giaTri]) => (
              <div key={nhan}>
                <dt className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">{nhan}</dt>
                <dd className="mt-0.5 whitespace-pre-line text-sm">{giaTri}</dd>
              </div>
            ))}
          </dl>

          {/* Báo nhịp — mọi cán bộ trong phạm vi đều ghi được, không riêng lãnh đạo */}
          <div className="space-y-3 rounded-xl border p-3">
            <p className="text-sm font-semibold">Báo nhịp PDCA</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pdca-stage">Đang ở bước</Label>
                <Select value={stage} onValueChange={(v) => setStage(v as PdcaStage)}>
                  <SelectTrigger id="pdca-stage"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PDCA_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>{PDCA_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pdca-progress">Tiến độ (%)</Label>
                <Input
                  id="pdca-progress"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(e) => setProgress(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pdca-note">Đã làm gì / vướng ở đâu</Label>
              <Textarea
                id="pdca-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: đã tiếp cận 12/20 khách hàng mục tiêu, vướng khâu hồ sơ pháp lý của 3 doanh nghiệp…"
              />
              <p className="text-xs text-muted-foreground">
                Nhật ký không sửa và không xóa được — đây là bằng chứng PDCA của Phòng.
              </p>
            </div>
            <Button onClick={guiNhip} disabled={dangGui} className="w-full sm:w-auto">
              {dangGui ? 'Đang ghi…' : 'Ghi nhịp'}
            </Button>
          </div>

          {nhatKy.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">Nhật ký PDCA</p>
              <ul className="space-y-2">
                {nhatKy.map((n) => (
                  <li key={n.id} className="rounded-lg border-l-2 border-primary/40 bg-muted/30 py-1.5 pl-3 pr-2">
                    <p className="text-2xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleString('vi-VN')} · {PDCA_LABEL[n.pdca_stage]}
                      {n.progress_percent !== null && ` · ${n.progress_percent}%`}
                    </p>
                    <p className="whitespace-pre-line text-sm">{n.note}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Lập kế hoạch mới (5W2H)
// ---------------------------------------------------------------------------

interface TaoMoiProps {
  open: boolean;
  departments: PhongBan[];
  cycleId: string | null;
  onClose: () => void;
  onXong: () => void;
}

export function ActionPlanCreateDialog({ open, departments, cycleId, onClose, onXong }: TaoMoiProps) {
  const { profileId, departmentId } = useAuth();
  const [form, setForm] = useState({
    title: '', why: '', where_place: '', how: '', how_much: '',
    start_date: '', due_date: '', owner_department_id: departmentId ?? '',
  });
  const [laChienDich, setLaChienDich] = useState(false);
  const [phongThem, setPhongThem] = useState<string[]>([]);
  const [dangLuu, setDangLuu] = useState(false);

  useEffect(() => {
    if (open) {
      setForm((f) => ({ ...f, owner_department_id: departmentId ?? '' }));
      setLaChienDich(false);
      setPhongThem([]);
    }
  }, [open, departmentId]);

  const dat = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const luu = async () => {
    if (!form.title.trim()) {
      toast.error('Kế hoạch phải có tên việc cần làm (What).');
      return;
    }
    if (!form.owner_department_id) {
      toast.error('Hãy chọn phòng chủ trì.');
      return;
    }
    setDangLuu(true);
    const { data, error } = await db
      .from('action_plans')
      .insert({
        cycle_id: cycleId,
        owner_department_id: form.owner_department_id,
        title: form.title.trim(),
        why: form.why.trim() || null,
        where_place: form.where_place.trim() || null,
        how: form.how.trim() || null,
        how_much: form.how_much.trim() || null,
        start_date: form.start_date || null,
        due_date: form.due_date || null,
        is_campaign: laChienDich,
        created_by: profileId,
      })
      .select('id')
      .single();

    if (error || !data) {
      setDangLuu(false);
      toast.error(`Không lưu được kế hoạch: ${error?.message ?? 'lỗi không rõ'}`);
      return;
    }

    const planId = (data as { id: string }).id;
    if (laChienDich && phongThem.length > 0) {
      const rows = phongThem.map((d) => ({ action_plan_id: planId, department_id: d, added_by: profileId }));
      const { error: e2 } = await (db.from('action_plan_departments') as unknown as {
        insert: (v: unknown) => Promise<{ error: { message?: string } | null }>;
      }).insert(rows);
      if (e2) toast.warning(`Đã lưu kế hoạch nhưng chưa thêm được phòng tham gia: ${e2.message}`);
    }

    setDangLuu(false);
    toast.success(laChienDich ? 'Đã tạo chiến dịch chung' : 'Đã lập kế hoạch hành động');
    setForm({ title: '', why: '', where_place: '', how: '', how_much: '', start_date: '', due_date: '', owner_department_id: departmentId ?? '' });
    onXong();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lập kế hoạch hành động (5W2H)</DialogTitle>
          <DialogDescription>
            Mỗi ô tương ứng một chữ trong công thức 5W2H. Chỉ «What» là bắt buộc — phần còn lại
            điền dần trong quá trình triển khai cũng được.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="kh-title">What — việc cần làm <span className="text-destructive">*</span></Label>
            <Input id="kh-title" value={form.title} onChange={dat('title')} placeholder="Ví dụ: Tăng số dư huy động vốn KHBL 30 tỷ trong quý III" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kh-why">Why — vì sao phải làm</Label>
            <Textarea id="kh-why" rows={2} value={form.why} onChange={dat('why')} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="kh-dept">Phòng chủ trì <span className="text-destructive">*</span></Label>
              <Select
                value={form.owner_department_id}
                onValueChange={(v) => setForm((f) => ({ ...f, owner_department_id: v }))}
              >
                <SelectTrigger id="kh-dept"><SelectValue placeholder="Chọn phòng" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kh-where">Where — địa bàn / phạm vi</Label>
              <Input id="kh-where" value={form.where_place} onChange={dat('where_place')} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="kh-start">When — bắt đầu</Label>
              <Input id="kh-start" type="date" value={form.start_date} onChange={dat('start_date')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kh-due">When — hạn hoàn thành</Label>
              <Input id="kh-due" type="date" value={form.due_date} onChange={dat('due_date')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kh-how">How — cách làm</Label>
            <Textarea id="kh-how" rows={2} value={form.how} onChange={dat('how')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kh-howmuch">How much — nguồn lực / chỉ tiêu định lượng</Label>
            <Input id="kh-howmuch" value={form.how_much} onChange={dat('how_much')} />
          </div>

          <div className="space-y-2 rounded-xl border p-3">
            <label className="flex items-start gap-2.5">
              <Checkbox checked={laChienDich} onCheckedChange={(v) => setLaChienDich(v === true)} className="mt-0.5" />
              <span>
                <span className="block text-sm font-medium">Đây là chiến dịch chung liên phòng</span>
                <span className="block text-xs text-muted-foreground">
                  Các phòng được thêm vào sẽ thấy và cùng báo nhịp trên kế hoạch này.
                </span>
              </span>
            </label>

            {laChienDich && (
              <div className="grid gap-1.5 pt-1 sm:grid-cols-2">
                {departments
                  .filter((d) => d.id !== form.owner_department_id)
                  .map((d) => (
                    <label key={d.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={phongThem.includes(d.id)}
                        onCheckedChange={(v) =>
                          setPhongThem((ds) => (v === true ? [...ds, d.id] : ds.filter((x) => x !== d.id)))
                        }
                      />
                      <span className="truncate">{d.name}</span>
                    </label>
                  ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button onClick={luu} disabled={dangLuu}>{dangLuu ? 'Đang lưu…' : 'Lưu kế hoạch'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
