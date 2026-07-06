import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, Coins, Plus, RefreshCw, Wallet } from 'lucide-react';

interface PricingRow {
  model: string;
  label: string | null;
  input_price: number;
  output_price: number;
  is_active: boolean;
}
interface BudgetSettings {
  monthly_budget: number | null;
  budget_enforce: boolean;
  pricing_currency: string;
}
interface UsageBucket { calls: number; tokens: number; cost: number }
interface Summary {
  range_days: number;
  total_calls: number;
  total_tokens: number;
  total_cost: number;
  month_cost: number;
  by_mode: (UsageBucket & { mode: string })[];
  by_model: (UsageBucket & { model: string })[];
  by_day: (UsageBucket & { day: string })[];
  top_users: (UsageBucket & { user_id: string; full_name: string | null })[];
}

const db = supabase as any;
const fmtInt = (n: number) => (n ?? 0).toLocaleString('vi-VN');
const fmtCost = (n: number, cur: string) => `${(n ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 4 })} ${cur}`;

export default function AICostPanel() {
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<PricingRow[]>([]);
  const [budget, setBudget] = useState<BudgetSettings>({ monthly_budget: null, budget_enforce: false, pricing_currency: 'USD' });
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rangeDays, setRangeDays] = useState(30);
  const [savingBudget, setSavingBudget] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);
  const [pricingDirty, setPricingDirty] = useState(false);

  const load = async (days = rangeDays) => {
    setLoading(true);
    const [priceRes, setRes, sumRes] = await Promise.all([
      db.from('ai_model_pricing').select('model, label, input_price, output_price, is_active').order('model'),
      db.from('ai_settings').select('monthly_budget, budget_enforce, pricing_currency').eq('id', 1).maybeSingle(),
      db.rpc('get_ai_usage_summary', { _days: days }),
    ]);
    if (priceRes.data) setPricing(priceRes.data.map((r: PricingRow) => ({ ...r, input_price: Number(r.input_price), output_price: Number(r.output_price) })));
    if (setRes.data) {
      setBudget({
        monthly_budget: setRes.data.monthly_budget != null ? Number(setRes.data.monthly_budget) : null,
        budget_enforce: !!setRes.data.budget_enforce,
        pricing_currency: setRes.data.pricing_currency || 'USD',
      });
    }
    if (sumRes.data) setSummary(sumRes.data as Summary);
    setPricingDirty(false);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // load phụ thuộc rangeDays nhưng chỉ chạy khi mount; changeRange gọi load(days) trực tiếp.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeRange = (days: number) => { setRangeDays(days); load(days); };

  const saveBudget = async () => {
    setSavingBudget(true);
    const { error } = await db.from('ai_settings').update({
      monthly_budget: budget.monthly_budget,
      budget_enforce: budget.budget_enforce,
      pricing_currency: budget.pricing_currency.trim() || 'USD',
    }).eq('id', 1);
    setSavingBudget(false);
    if (error) return toast({ title: 'Lưu ngân sách thất bại', description: error.message, variant: 'destructive' });
    toast({ title: 'Đã lưu ngân sách AI' });
    load();
  };

  const updatePricing = (model: string, patch: Partial<PricingRow>) => {
    setPricing((rows) => rows.map((r) => (r.model === model ? { ...r, ...patch } : r)));
    setPricingDirty(true);
  };
  const addPricingRow = () => {
    const model = prompt('Nhập tên model (dạng gateway, ví dụ: deepseek/deepseek-chat):')?.trim();
    if (!model) return;
    if (pricing.some((r) => r.model === model)) return toast({ title: 'Model đã có trong bảng giá', variant: 'destructive' });
    setPricing((rows) => [...rows, { model, label: model, input_price: 0, output_price: 0, is_active: true }]);
    setPricingDirty(true);
  };
  const savePricing = async () => {
    setSavingPricing(true);
    const payload = pricing.map((r) => ({
      model: r.model, label: r.label,
      input_price: Number(r.input_price) || 0, output_price: Number(r.output_price) || 0,
      is_active: r.is_active, updated_at: new Date().toISOString(),
    }));
    const { error } = await db.from('ai_model_pricing').upsert(payload, { onConflict: 'model' });
    setSavingPricing(false);
    if (error) return toast({ title: 'Lưu bảng giá thất bại', description: error.message, variant: 'destructive' });
    toast({ title: 'Đã lưu bảng giá model' });
    load();
  };

  const cur = budget.pricing_currency || 'USD';
  const budgetPct = budget.monthly_budget && summary
    ? Math.min(100, Math.round((summary.month_cost / budget.monthly_budget) * 100))
    : 0;

  if (loading) {
    return (
      <Card className="p-8 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Đang tải dữ liệu chi phí AI...
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Ngân sách + tổng quan tháng */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-semibold">Chi phí & Ngân sách AI</h2>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => load()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Làm mới
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Ngân sách mỗi tháng ({cur})</Label>
            <Input
              type="number" min="0" step="0.01"
              value={budget.monthly_budget ?? ''}
              onChange={(e) => setBudget((b) => ({ ...b, monthly_budget: e.target.value === '' ? null : Number(e.target.value) }))}
              placeholder="Để trống = không đặt trần"
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Đơn vị tiền</Label>
            <Input
              value={budget.pricing_currency}
              onChange={(e) => setBudget((b) => ({ ...b, pricing_currency: e.target.value }))}
              placeholder="USD"
              className="text-sm"
            />
            <p className="text-[10px] text-muted-foreground">Đơn giá bảng dưới &amp; chi phí ghi nhận theo đơn vị này.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Chặn khi vượt ngân sách</Label>
            <div className="flex items-center gap-2 h-9">
              <Switch checked={budget.budget_enforce} onCheckedChange={(v) => setBudget((b) => ({ ...b, budget_enforce: v }))} />
              <span className="text-xs text-muted-foreground">
                {budget.budget_enforce ? 'Bật — chặn gọi AI khi hết ngân sách' : 'Tắt — chỉ theo dõi, không chặn'}
              </span>
            </div>
          </div>
        </div>

        {budget.monthly_budget != null && summary && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Đã dùng tháng này</span>
              <span className={budgetPct >= 90 ? 'font-semibold text-destructive' : 'font-medium'}>
                {fmtCost(summary.month_cost, cur)} / {fmtCost(budget.monthly_budget, cur)} ({budgetPct}%)
              </span>
            </div>
            <Progress value={budgetPct} className={budgetPct >= 90 ? '[&>div]:bg-destructive' : ''} />
          </div>
        )}

        <div className="flex justify-end">
          <Button size="sm" onClick={saveBudget} disabled={savingBudget}>
            {savingBudget ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Lưu ngân sách
          </Button>
        </div>
      </Card>

      {/* Dashboard sử dụng */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Coins className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-semibold">Thống kê sử dụng</h2>
          <Select value={String(rangeDays)} onValueChange={(v) => changeRange(Number(v))}>
            <SelectTrigger className="w-[140px] h-8 ml-auto text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 ngày qua</SelectItem>
              <SelectItem value="30">30 ngày qua</SelectItem>
              <SelectItem value="90">90 ngày qua</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {summary && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Số lượt gọi" value={fmtInt(summary.total_calls)} />
              <Stat label="Tổng token" value={fmtInt(summary.total_tokens)} />
              <Stat label={`Chi phí ước tính (${cur})`} value={fmtCost(summary.total_cost, cur)} highlight />
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <UsageTable title="Theo tác vụ" rows={summary.by_mode.map((r) => ({ name: r.mode, ...r }))} cur={cur} />
              <UsageTable title="Theo model" rows={summary.by_model.map((r) => ({ name: r.model, ...r }))} cur={cur} />
            </div>

            <UsageTable
              title="Top người dùng (theo chi phí)"
              rows={summary.top_users.map((r) => ({ name: r.full_name || r.user_id.slice(0, 8), ...r }))}
              cur={cur}
            />

            {summary.total_cost === 0 && (
              <Alert>
                <AlertDescription className="text-xs text-muted-foreground">
                  Chưa có chi phí nào được ghi nhận trong khoảng thời gian này. Chi phí chỉ bắt đầu ghi sau khi
                  deploy lại edge function <code>ai-advisor</code> và có model nằm trong bảng giá bên dưới.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </Card>

      {/* Bảng giá model */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-semibold">Bảng giá model</h2>
          <Badge variant="outline" className="text-xs">đơn giá / 1 triệu token ({cur})</Badge>
          <Button variant="outline" size="sm" className="ml-auto" onClick={addPricingRow}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Thêm model
          </Button>
        </div>
        <Alert>
          <AlertDescription className="text-xs text-muted-foreground">
            Giá seed sẵn chỉ mang tính <strong>tham khảo</strong> — vui lòng cập nhật theo bảng giá chính thức của
            từng nhà cung cấp. Model không có trong bảng này vẫn gọi được nhưng chi phí sẽ không được tính.
          </AlertDescription>
        </Alert>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Model</TableHead>
                <TableHead className="text-xs w-[130px]">Giá input</TableHead>
                <TableHead className="text-xs w-[130px]">Giá output</TableHead>
                <TableHead className="text-xs w-[80px]">Bật</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricing.map((r) => (
                <TableRow key={r.model}>
                  <TableCell className="font-mono text-xs">{r.model}</TableCell>
                  <TableCell>
                    <Input type="number" min="0" step="0.0001" value={r.input_price}
                      onChange={(e) => updatePricing(r.model, { input_price: Number(e.target.value) })}
                      className="h-8 text-xs font-mono" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" min="0" step="0.0001" value={r.output_price}
                      onChange={(e) => updatePricing(r.model, { output_price: Number(e.target.value) })}
                      className="h-8 text-xs font-mono" />
                  </TableCell>
                  <TableCell>
                    <Switch checked={r.is_active} onCheckedChange={(v) => updatePricing(r.model, { is_active: v })} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={savePricing} disabled={savingPricing || !pricingDirty}>
            {savingPricing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Lưu bảng giá
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'}`}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold mt-0.5">{value}</p>
    </div>
  );
}

function UsageTable({ title, rows, cur }: { title: string; rows: { name: string; calls: number; tokens: number; cost: number }[]; cur: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{title}</Label>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Tên</TableHead>
              <TableHead className="text-xs text-right">Lượt</TableHead>
              <TableHead className="text-xs text-right">Token</TableHead>
              <TableHead className="text-xs text-right">Chi phí ({cur})</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-xs text-muted-foreground text-center py-4">Chưa có dữ liệu</TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.name}>
                <TableCell className="text-xs">{r.name}</TableCell>
                <TableCell className="text-xs text-right font-mono">{fmtInt(r.calls)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{fmtInt(r.tokens)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{(r.cost ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 4 })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
