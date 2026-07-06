import { Fragment, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Percent, Plus, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  DEFAULT_WEIGHT_CONFIG_PERCENT, ROUND_STATUS_LABELS, SUBJECT_LEVEL_LABELS, WEIGHT_BUCKET_LABELS,
  type CouncilRoundStatus, type CouncilSubjectLevel, type CouncilWeightConfig, type WeightBucket,
} from '@/lib/council';

export interface CouncilRound {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: CouncilRoundStatus;
  voting_deadline: string | null;
  weight_config: CouncilWeightConfig | null;
}

/** ISO timestamptz → giá trị cho <input type="datetime-local"> theo giờ máy người dùng. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Các nhóm trọng số áp dụng cho từng cấp đánh giá
const LEVEL_BUCKETS: Record<CouncilSubjectLevel, WeightBucket[]> = {
  pgd: ['giam_doc', 'pgd_khac', 'thanh_vien'],
  truong_phong: ['giam_doc', 'pgd_phu_trach', 'pgd_khac', 'thanh_vien'],
};

type WeightDraft = Record<CouncilSubjectLevel, Record<string, string>>;

const draftFromConfig = (config: CouncilWeightConfig | null): WeightDraft => {
  const out = {} as WeightDraft;
  (Object.keys(LEVEL_BUCKETS) as CouncilSubjectLevel[]).forEach((level) => {
    out[level] = {};
    LEVEL_BUCKETS[level].forEach((bucket) => {
      const v = config?.[level]?.[bucket] ?? DEFAULT_WEIGHT_CONFIG_PERCENT[level][bucket] ?? 0;
      out[level][bucket] = String(v);
    });
  });
  return out;
};

function WeightEditor({ round, onSaved }: { round: CouncilRound; onSaved: () => void }) {
  const [draft, setDraft] = useState<WeightDraft>(() => draftFromConfig(round.weight_config));
  const [saving, setSaving] = useState(false);

  const sumOf = (level: CouncilSubjectLevel) =>
    LEVEL_BUCKETS[level].reduce((acc, b) => acc + (Number(draft[level][b]) || 0), 0);

  const save = async () => {
    for (const level of Object.keys(LEVEL_BUCKETS) as CouncilSubjectLevel[]) {
      if (LEVEL_BUCKETS[level].some((b) => {
        const n = Number(draft[level][b]);
        return !Number.isFinite(n) || n < 0;
      })) {
        toast.error(`Trọng số ${SUBJECT_LEVEL_LABELS[level]} phải là số không âm`);
        return;
      }
      if (Math.round(sumOf(level)) !== 100) {
        toast.error(`Tổng trọng số ${SUBJECT_LEVEL_LABELS[level]} phải bằng 100% (hiện ${sumOf(level)}%)`);
        return;
      }
    }
    const config: CouncilWeightConfig = {};
    (Object.keys(LEVEL_BUCKETS) as CouncilSubjectLevel[]).forEach((level) => {
      config[level] = {};
      LEVEL_BUCKETS[level].forEach((bucket) => { config[level]![bucket] = Number(draft[level][bucket]); });
    });
    setSaving(true);
    const { error } = await supabase.from('council_rounds').update({ weight_config: config }).eq('id', round.id);
    setSaving(false);
    if (error) { toast.error('Lỗi lưu trọng số: ' + error.message); return; }
    toast.success(`Đã lưu trọng số riêng cho ${round.name} — áp dụng ngay vào báo cáo.`);
    onSaved();
  };

  const resetDefault = async () => {
    setSaving(true);
    const { error } = await supabase.from('council_rounds').update({ weight_config: null }).eq('id', round.id);
    setSaving(false);
    if (error) { toast.error('Lỗi: ' + error.message); return; }
    setDraft(draftFromConfig(null));
    toast.success(`${round.name} quay về trọng số mặc định theo Cơ chế đánh giá.`);
    onSaved();
  };

  return (
    <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs font-medium">Trọng số nhóm đánh giá — {round.name}</p>
        <Badge variant={round.weight_config ? 'default' : 'outline'} className="text-[10px]">
          {round.weight_config ? 'Trọng số riêng của kỳ' : 'Đang dùng mặc định'}
        </Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {(Object.keys(LEVEL_BUCKETS) as CouncilSubjectLevel[]).map((level) => {
          const sum = sumOf(level);
          return (
            <div key={level} className="border rounded-md p-2.5 bg-background space-y-1.5">
              <p className="text-[11px] font-semibold">
                Đầu mối {SUBJECT_LEVEL_LABELS[level]}
                <span className={`ml-2 font-normal ${Math.round(sum) === 100 ? 'text-muted-foreground' : 'text-destructive'}`}>
                  Tổng: {sum}%
                </span>
              </p>
              {LEVEL_BUCKETS[level].map((bucket) => (
                <div key={bucket} className="flex items-center gap-2">
                  <span className="text-xs flex-1">{WEIGHT_BUCKET_LABELS[bucket]}</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={draft[level][bucket]}
                    onChange={(e) => setDraft((prev) => ({
                      ...prev,
                      [level]: { ...prev[level], [bucket]: e.target.value },
                    }))}
                    className="h-7 w-20 text-xs text-right"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Trọng số áp dụng khi tính điểm báo cáo của kỳ này (kể cả phiếu đã chấm). Tổng mỗi cấp phải bằng 100%.
      </p>
      <div className="flex items-center gap-2">
        {round.weight_config && (
          <Button size="sm" variant="outline" onClick={resetDefault} disabled={saving}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Khôi phục mặc định
          </Button>
        )}
        <Button size="sm" onClick={save} disabled={saving} className="ml-auto">
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Lưu trọng số
        </Button>
      </div>
    </div>
  );
}

interface Props {
  rounds: CouncilRound[];
  onChanged: () => void;
}

export function CouncilRoundsTab({ rounds, onChanged }: Props) {
  const [savingId, setSavingId] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [weightEditId, setWeightEditId] = useState('');

  const updateRound = async (id: string, patch: Partial<CouncilRound>) => {
    setSavingId(id);
    const { error } = await supabase.from('council_rounds').update(patch).eq('id', id);
    setSavingId('');
    if (error) { toast.error('Lỗi cập nhật kỳ: ' + error.message); return; }
    toast.success('Đã cập nhật kỳ đánh giá');
    onChanged();
  };

  const createRound = async () => {
    const name = newName.trim();
    if (!name) { toast.error('Nhập tên kỳ (VD: Quý I/2027)'); return; }
    setCreating(true);
    const { error } = await supabase.from('council_rounds').insert({
      name,
      description: `Kỳ đánh giá năng lực thực thi công tác đầu mối ${name}`,
      status: 'draft',
    });
    setCreating(false);
    if (error) { toast.error('Lỗi tạo kỳ: ' + error.message); return; }
    toast.success(`Đã tạo kỳ ${name} (trạng thái Chưa mở). Hãy thiết đặt tiêu chí và danh sách đầu mối trước khi mở.`);
    setNewName('');
    onChanged();
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Chỉ kỳ ở trạng thái <strong>Đang mở</strong> mới nhận phiếu chấm điểm. Kỳ <strong>Chưa mở</strong> ẩn với
        thành viên Hội đồng; kỳ <strong>Đã chốt</strong> khóa toàn bộ chỉnh sửa phiếu và dùng cho lưu trữ/báo cáo.
      </p>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-3 py-2 font-medium">Kỳ đánh giá</th>
                <th className="px-3 py-2 font-medium">Từ ngày</th>
                <th className="px-3 py-2 font-medium">Đến ngày</th>
                <th className="px-3 py-2 font-medium">Trạng thái</th>
                <th className="px-3 py-2 font-medium">Hạn bỏ phiếu</th>
                <th className="px-3 py-2 font-medium">Trọng số</th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((r) => (
                <Fragment key={r.id}>
                  <tr className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium whitespace-nowrap">
                      {r.name}
                      {savingId === r.id && <Loader2 className="w-3.5 h-3.5 animate-spin inline ml-2" />}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="date"
                        defaultValue={r.start_date || ''}
                        onBlur={(e) => e.target.value !== (r.start_date || '') && updateRound(r.id, { start_date: e.target.value || null })}
                        className="h-8 w-36 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="date"
                        defaultValue={r.end_date || ''}
                        onBlur={(e) => e.target.value !== (r.end_date || '') && updateRound(r.id, { end_date: e.target.value || null })}
                        className="h-8 w-36 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Select value={r.status} onValueChange={(v) => updateRound(r.id, { status: v as CouncilRoundStatus })}>
                        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ROUND_STATUS_LABELS) as CouncilRoundStatus[]).map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">{ROUND_STATUS_LABELS[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="datetime-local"
                        defaultValue={isoToLocalInput(r.voting_deadline)}
                        onBlur={(e) => {
                          const iso = localInputToIso(e.target.value);
                          if (iso !== r.voting_deadline) updateRound(r.id, { voting_deadline: iso });
                        }}
                        className="h-8 w-48 text-xs"
                        title="Quá hạn này kỳ sẽ tự chuyển sang Đã chốt; hệ thống nhắc email thành viên chưa gửi phiếu khi còn ≤3 ngày"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        size="sm"
                        variant={weightEditId === r.id ? 'default' : 'outline'}
                        className="h-8 text-xs"
                        onClick={() => setWeightEditId((prev) => (prev === r.id ? '' : r.id))}
                      >
                        <Percent className="w-3.5 h-3.5 mr-1" />
                        {r.weight_config ? 'Riêng' : 'Mặc định'}
                      </Button>
                    </td>
                  </tr>
                  {weightEditId === r.id && (
                    <tr className="border-b last:border-0">
                      <td colSpan={6} className="px-3 py-3">
                        <WeightEditor round={r} onSaved={onChanged} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {rounds.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Chưa có kỳ đánh giá.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <div className="flex items-center gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Tên kỳ mới (VD: Quý I/2027)"
          className="h-9 w-56 text-sm"
        />
        <Button size="sm" onClick={createRound} disabled={creating}>
          {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />} Tạo kỳ mới
        </Button>
      </div>
    </div>
  );
}
