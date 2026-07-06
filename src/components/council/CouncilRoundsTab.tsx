import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ROUND_STATUS_LABELS, type CouncilRoundStatus } from '@/lib/council';

export interface CouncilRound {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: CouncilRoundStatus;
}

interface Props {
  rounds: CouncilRound[];
  onChanged: () => void;
}

export function CouncilRoundsTab({ rounds, onChanged }: Props) {
  const [savingId, setSavingId] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

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
              </tr>
            </thead>
            <tbody>
              {rounds.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
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
                </tr>
              ))}
              {rounds.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Chưa có kỳ đánh giá.</td></tr>
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
