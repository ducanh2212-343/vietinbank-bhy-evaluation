import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/hooks/useAuth';
import { useAiFeatures } from '@/hooks/useAiFeatures';
import { toast } from '@/hooks/use-toast';
import { Search, ChevronDown, Loader2, Save, Undo2 } from 'lucide-react';
import { SkillCriteriaEditor } from '@/components/admin/SkillCriteriaEditor';
import {
  fetchAllCriteria,
  saveCriteriaChanges,
  type CriterionDraft,
  type CriterionRow,
} from '@/lib/skillCriteria';

interface SkillItem {
  id: string;
  name: string;
  code: string | null;
  skill_group: string;
  sort_order: number;
}

export default function SkillCriteriaAdminPage() {
  const { isAdmin } = useAuth();
  const { isEnabled: isAiEnabled } = useAiFeatures();
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [criteria, setCriteria] = useState<CriterionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [openSkillId, setOpenSkillId] = useState<string | null>(null);

  // State soạn thảo của skill đang mở
  const [drafts, setDrafts] = useState<CriterionDraft[]>([]);
  const [snapshot, setSnapshot] = useState<Map<string, CriterionRow>>(new Map());
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const loadData = async () => {
    const [skillsRes, crits] = await Promise.all([
      supabase.from('skill_catalog').select('id, name, code, skill_group, sort_order').eq('is_active', true).order('sort_order'),
      fetchAllCriteria(),
    ]);
    setSkills((skillsRes.data as SkillItem[]) || []);
    setCriteria(crits);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const critBySkill = useMemo(() => {
    const m = new Map<string, CriterionRow[]>();
    criteria.forEach((c) => {
      if (!m.has(c.skill_id)) m.set(c.skill_id, []);
      m.get(c.skill_id)!.push(c);
    });
    return m;
  }, [criteria]);

  const openEditor = (skillId: string) => {
    if (openSkillId === skillId) {
      setOpenSkillId(null);
      return;
    }
    const rows = critBySkill.get(skillId) || [];
    setDrafts(rows.map((r) => ({ ...r })));
    setSnapshot(new Map(rows.map((r) => [r.id, r])));
    setOpenSkillId(skillId);
  };

  const resetEditor = () => {
    const rows = critBySkill.get(openSkillId!) || [];
    setDrafts(rows.map((r) => ({ ...r })));
    toast({ title: 'Đã hoàn tác về bản đã lưu' });
  };

  const handleGenerate = async (levelNo: number | null) => {
    if (!openSkillId) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: { mode: 'generate_criteria', skill_id: openSkillId, level_no: levelNo ?? undefined },
      });
      if (error) throw error;
      const res = data as {
        levels?: Array<{ level_no: number; criteria: Array<{ statement: string; is_gate: boolean; requires_evidence: boolean }> }>;
        error?: string;
      } | null;
      const levels = res?.levels || [];
      if (!levels.length) throw new Error(res?.error || 'AI không trả về tiêu chí nào');

      setDrafts((prev) => {
        let next = [...prev];
        for (const lv of levels) {
          // Nháp mới THAY THẾ các dòng chưa lưu của level đó; dòng đã lưu giữ nguyên
          next = next.filter((d) => !(d.level_no === lv.level_no && !d.id));
          const baseSort = Math.max(0, ...next.filter((d) => d.level_no === lv.level_no && !d.deleted).map((d) => d.sort_order));
          lv.criteria.forEach((c, i) => {
            next.push({
              level_no: lv.level_no,
              statement: c.statement,
              is_gate: c.is_gate,
              requires_evidence: c.requires_evidence,
              sort_order: baseSort + i + 1,
              isDraft: true,
            });
          });
        }
        return next;
      });
      toast({ title: 'Đã sinh nháp AI', description: 'Biên tập lại rồi bấm Lưu — nháp chưa được ghi vào hệ thống.' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('429')) toast({ title: 'Quá nhiều yêu cầu AI', description: 'Vui lòng thử lại sau.', variant: 'destructive' });
      else toast({ title: 'Lỗi sinh tiêu chí', description: msg, variant: 'destructive' });
    }
    setGenerating(false);
  };

  const handleSave = async () => {
    if (!openSkillId) return;
    setSaving(true);
    const err = await saveCriteriaChanges(openSkillId, drafts, snapshot);
    if (err) {
      toast({ title: 'Lỗi lưu tiêu chí', description: err, variant: 'destructive' });
      setSaving(false);
      return;
    }
    toast({ title: 'Đã lưu bộ tiêu chí' });
    const crits = await fetchAllCriteria();
    setCriteria(crits);
    const rows = crits.filter((c) => c.skill_id === openSkillId);
    setDrafts(rows.map((r) => ({ ...r })));
    setSnapshot(new Map(rows.map((r) => [r.id, r])));
    setSaving(false);
  };

  if (!isAdmin) return <div className="p-6 text-muted-foreground">Bạn không có quyền truy cập.</div>;
  if (loading) return <div className="p-6 text-muted-foreground">Đang tải...</div>;

  const groups = [...new Set(skills.map((s) => s.skill_group))];
  const filtered = skills.filter((s) => {
    const matchGroup = !groupFilter || s.skill_group === groupFilter;
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.code || '').toLowerCase().includes(search.toLowerCase());
    return matchGroup && matchSearch;
  });

  const coveredSkills = skills.filter((s) => {
    const rows = critBySkill.get(s.id) || [];
    return [1, 2, 3, 4].every((l) => rows.some((r) => r.level_no === l));
  }).length;

  const hasUnsaved = openSkillId !== null && (
    drafts.some((d) => !d.id || d.deleted || d.isDraft) ||
    drafts.some((d) => {
      if (!d.id) return false;
      const old = snapshot.get(d.id);
      return old && (old.statement !== d.statement || old.is_gate !== d.is_gate || old.requires_evidence !== d.requires_evidence || old.sort_order !== d.sort_order);
    })
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="page-header">Tiêu chí xác định level</h1>
        <p className="page-subtitle">
          Bộ câu hỏi hành vi (BARS) cho từng skill × level — nền tảng để chấm level khách quan thay vì chọn cảm tính.
          AI chỉ sinh bản nháp; mọi tiêu chí đều do quản trị viên duyệt, sửa, sắp xếp và có thể tắt bất cứ lúc nào.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Độ phủ: <strong className="text-foreground">{coveredSkills}/{skills.length}</strong> skill đã đủ tiêu chí cả 4 level · {criteria.length} tiêu chí đang hoạt động
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm skill..." className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setGroupFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${!groupFilter ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}>
            Tất cả
          </button>
          {groups.map((g) => (
            <button key={g} onClick={() => setGroupFilter(g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${groupFilter === g ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}>
              {g.length > 30 ? g.substring(0, 28) + '...' : g}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((skill) => {
          const rows = critBySkill.get(skill.id) || [];
          const isOpen = openSkillId === skill.id;
          return (
            <Collapsible key={skill.id} open={isOpen} onOpenChange={() => openEditor(skill.id)}>
              <Card className={isOpen ? 'border-primary/40' : ''}>
                <CollapsibleTrigger className="w-full text-left">
                  <CardHeader className="py-3 px-3 sm:px-6">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-sm">{skill.code ? `${skill.code}. ` : ''}{skill.name}</CardTitle>
                      <Badge variant="outline" className="text-[10px]">{skill.skill_group}</Badge>
                      <div className="ml-auto flex items-center gap-1.5">
                        {[1, 2, 3, 4].map((l) => {
                          const n = rows.filter((r) => r.level_no === l).length;
                          return (
                            <span key={l} className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${n > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                              L{l}·{n}
                            </span>
                          );
                        })}
                        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {isOpen && (
                    <CardContent className="px-3 sm:px-6 space-y-3">
                      <SkillCriteriaEditor
                        value={drafts}
                        onChange={setDrafts}
                        onGenerate={handleGenerate}
                        generating={generating}
                        aiEnabled={isAiEnabled('generate_criteria')}
                      />
                      <div className="flex items-center gap-2 pt-1">
                        <Button type="button" size="sm" className="h-8 text-xs gap-1.5" onClick={handleSave} disabled={saving || !hasUnsaved}>
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          Lưu thay đổi
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={resetEditor} disabled={saving || !hasUnsaved}>
                          <Undo2 className="w-3.5 h-3.5" /> Hoàn tác
                        </Button>
                        {hasUnsaved && <span className="text-[11px] text-orange-500">Có thay đổi chưa lưu</span>}
                      </div>
                    </CardContent>
                  )}
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Không tìm thấy skill nào.</p>
        )}
      </div>
    </div>
  );
}
