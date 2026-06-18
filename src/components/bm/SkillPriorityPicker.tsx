import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SkillLevelBadge } from '@/components/SkillLevelBadge';
import { useSkillLevelImages } from '@/hooks/useSkillLevelImages';

interface Skill {
  id: string;
  name: string;
  code: string | null;
  skill_group: string;
  sort_order: number;
}

interface CoreSkillInfo {
  skill_id: string;
  minimum_level: number;
  advanced_level: number;
}

export interface SkillPriority {
  id?: string;
  skill_id: string;
  current_level: number | null;
  target_level: number | null;
  priority_order: number;
  reason_text: string;
  source_type: string;
  status: string;
  skill_name?: string;
  skill_code?: string;
  skill_group?: string;
}

interface Props {
  priorities: SkillPriority[];
  onChange: (p: SkillPriority[]) => void;
  allSkills: Skill[];
  coreSkills: CoreSkillInfo[];
  readOnly?: boolean;
}

export function SkillPriorityPicker({ priorities, onChange, allSkills, coreSkills, readOnly }: Props) {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { getImageUrl } = useSkillLevelImages();

  const coreMap = new Map(coreSkills.map(c => [c.skill_id, c]));
  const selectedIds = new Set(priorities.map(p => p.skill_id));

  const filtered = allSkills.filter(s =>
    !selectedIds.has(s.id) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || (s.code || '').toLowerCase().includes(search.toLowerCase()))
  );

  const sortedFiltered = [...filtered].sort((a, b) => {
    const aCore = coreMap.has(a.id) ? 0 : 1;
    const bCore = coreMap.has(b.id) ? 0 : 1;
    if (aCore !== bCore) return aCore - bCore;
    return a.sort_order - b.sort_order;
  });

  const addSkill = (skill: Skill) => {
    if (priorities.length >= 3) return;
    const core = coreMap.get(skill.id);
    const newP: SkillPriority = {
      skill_id: skill.id,
      current_level: null,
      target_level: core?.advanced_level || null,
      priority_order: priorities.length + 1,
      reason_text: '',
      source_type: core ? 'core_skill' : 'supplementary_skill',
      status: 'planned',
      skill_name: skill.name,
      skill_code: skill.code || undefined,
      skill_group: skill.skill_group,
    };
    onChange([...priorities, newP]);
    setDialogOpen(false);
  };

  const removeSkill = (idx: number) => {
    const updated = priorities.filter((_, i) => i !== idx).map((p, i) => ({ ...p, priority_order: i + 1 }));
    onChange(updated);
  };

  const updateField = (idx: number, field: keyof SkillPriority, value: any) => {
    const updated = [...priorities];
    (updated[idx] as any)[field] = value;
    onChange(updated);
  };

  return (
    <Card>
      <CardHeader className="pb-3 px-3 sm:px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base">II.1. Chọn tối đa 3 skill ưu tiên trong quý</CardTitle>
          <Badge variant="outline">{priorities.length}/3</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-3 sm:px-6">
        {priorities.map((p, idx) => (
          <div key={p.skill_id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <Badge className="text-xs">{p.priority_order}</Badge>
                <span className="font-medium text-sm break-words">
                  {p.skill_code ? <span className="font-mono text-[11px] text-muted-foreground mr-1">{p.skill_code}</span> : null}
                  {p.skill_name || p.skill_id}
                </span>
                <Badge variant={p.source_type === 'core_skill' ? 'default' : 'secondary'} className="text-[10px]">
                  {p.source_type === 'core_skill' ? 'Skill lõi' : 'Skill bổ sung'}
                </Badge>
              </div>
              {!readOnly && (
                <Button variant="ghost" size="sm" className="flex-shrink-0" onClick={() => removeSkill(idx)}><X className="w-4 h-4" /></Button>
              )}
            </div>

            {/* Level display with images */}
            <div className="flex items-center gap-3 flex-wrap text-sm">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Hiện tại:</span>
                <SkillLevelBadge level={p.current_level} imageUrl={getImageUrl(p.skill_id, p.current_level)} />
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Mục tiêu:</span>
                <SkillLevelBadge level={p.target_level} imageUrl={getImageUrl(p.skill_id, p.target_level)} />
              </div>
              <div className="text-xs font-medium">
                Gap: {p.current_level != null && p.target_level != null ? p.target_level - p.current_level : '—'}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Level hiện tại</label>
                <Select
                  value={p.current_level?.toString() ?? '0'}
                  onValueChange={v => updateField(idx, 'current_level', parseInt(v))}
                  disabled={readOnly}
                >
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Chọn" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">L0 - Chưa hình thành</SelectItem>
                    {[1, 2, 3, 4].map(l => <SelectItem key={l} value={l.toString()}>L{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Level mục tiêu</label>
                <Select
                  value={p.target_level?.toString() ?? '0'}
                  onValueChange={v => updateField(idx, 'target_level', parseInt(v))}
                  disabled={readOnly}
                >
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Chọn" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">L0 - Chưa hình thành</SelectItem>
                    {[1, 2, 3, 4].map(l => <SelectItem key={l} value={l.toString()}>L{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-muted-foreground">Trạng thái</label>
                <Select value={p.status} onValueChange={v => updateField(idx, 'status', v)} disabled={readOnly}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Đang lên kế hoạch</SelectItem>
                    <SelectItem value="in_progress">Đang thực hiện</SelectItem>
                    <SelectItem value="completed">Hoàn thành</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Lý do ưu tiên skill này</label>
              <Textarea
                value={p.reason_text}
                onChange={e => updateField(idx, 'reason_text', e.target.value)}
                className="min-h-[40px] text-sm"
                placeholder="Tại sao chọn skill này trong quý?"
                disabled={readOnly}
              />
            </div>
          </div>
        ))}

        {!readOnly && priorities.length < 3 && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full"><Plus className="w-4 h-4 mr-2" />Thêm skill ưu tiên</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[70vh] overflow-hidden flex flex-col">
              <DialogHeader><DialogTitle>Chọn skill ưu tiên</DialogTitle></DialogHeader>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm skill..." className="pl-9" />
              </div>
              <div className="overflow-y-auto flex-1 space-y-1 max-h-[400px]">
                {sortedFiltered.map(s => {
                  const core = coreMap.get(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => addSkill(s)}
                      className="w-full flex items-center justify-between p-2 rounded hover:bg-muted text-left text-sm"
                    >
                      <div>
                        <span className="font-medium">{s.code ? `${s.code}. ` : ''}{s.name}</span>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {core && <Badge className="text-[9px]">Lõi (L{core.minimum_level}→L{core.advanced_level})</Badge>}
                          <Badge variant="outline" className="text-[9px]">{s.skill_group}</Badge>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {sortedFiltered.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">Không tìm thấy skill</p>}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {priorities.length === 0 && !readOnly && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Gợi ý: Chọn skill có gap lớn nhất hoặc liên quan nhất đến vị trí công tác hiện tại.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
