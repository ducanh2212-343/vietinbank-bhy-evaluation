import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Copy, Search, Upload, Save, AlertTriangle, X } from 'lucide-react';
// xlsx imported lazily inside handleFile to keep it out of the main bundle

interface VtbCourse {
  id: string;
  code: string;
  name: string;
  short_name: string | null;
  objective: string | null;
  content: string | null;
  duration_days: number | null;
  format: string | null;
  competency_type: string | null;
  is_active: boolean;
  source: string;
  internal_note: string | null;
}
interface SkillCat { id: string; code: string | null; name: string; skill_group: string; sort_order: number; }
interface PositionRow { id: string; code: string | null; name: string; }
interface CourseSkillMap { course_id: string; skill_id: string; target_level_min: number; relevance: 'high'|'medium'|'low'; }

const FORMAT_OPTIONS = ['Online', 'Offline', 'Blended', 'E-learning', 'Tự học'];
const COMPETENCY_OPTIONS = ['Cốt lõi', 'Nghiệp vụ', 'Lãnh đạo', 'Bổ trợ'];

export default function VtbCoursesAdminPage() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('list');
  const [loading, setLoading] = useState(true);

  const [courses, setCourses] = useState<VtbCourse[]>([]);
  const [skills, setSkills] = useState<SkillCat[]>([]);
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [allGroups, setAllGroups] = useState<string[]>([]);
  const [cpgMap, setCpgMap] = useState<Map<string, Set<string>>>(new Map()); // course_id -> set(group)
  const [csMap, setCsMap] = useState<Map<string, CourseSkillMap[]>>(new Map()); // course_id -> mappings
  const [posMap, setPosMap] = useState<Map<string, string>>(new Map()); // position_id -> group

  const loadAll = async () => {
    setLoading(true);
    const [coursesRes, skillsRes, posRes, cpgRes, csRes, p2vRes] = await Promise.all([
      supabase.from('vtb_courses').select('*').order('code'),
      supabase.from('skill_catalog').select('id, code, name, skill_group, sort_order').eq('is_active', true).order('sort_order'),
      supabase.from('positions').select('id, code, name').eq('is_active', true).order('sort_order'),
      supabase.from('vtb_course_position_groups').select('course_id, position_group'),
      supabase.from('vtb_course_skills').select('*'),
      supabase.from('position_to_vtb_group').select('position_id, vtb_position_group'),
    ]);
    setCourses((coursesRes.data as VtbCourse[]) || []);
    setSkills((skillsRes.data as SkillCat[]) || []);
    setPositions((posRes.data as PositionRow[]) || []);
    const cMap = new Map<string, Set<string>>();
    const groupSet = new Set<string>();
    for (const r of cpgRes.data || []) {
      if (!cMap.has(r.course_id)) cMap.set(r.course_id, new Set());
      cMap.get(r.course_id)!.add(r.position_group);
      groupSet.add(r.position_group);
    }
    setCpgMap(cMap);
    const sMap = new Map<string, CourseSkillMap[]>();
    for (const r of (csRes.data as CourseSkillMap[]) || []) {
      if (!sMap.has(r.course_id)) sMap.set(r.course_id, []);
      sMap.get(r.course_id)!.push(r);
    }
    setCsMap(sMap);
    const pMap = new Map<string, string>();
    for (const r of p2vRes.data || []) pMap.set(r.position_id, r.vtb_position_group);
    setPosMap(pMap);
    setAllGroups(Array.from(groupSet).sort());
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  if (!isAdmin) return <div className="p-6 text-muted-foreground">Bạn không có quyền truy cập.</div>;
  if (loading) return <div className="p-6 text-muted-foreground">Đang tải...</div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="page-header">Quản trị khóa học Trường ĐT VietinBank</h1>
        <p className="page-subtitle">Thêm/sửa khóa học, mapping skill & vị trí, import từ Excel</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 gap-1 h-auto">
          <TabsTrigger value="list">Danh sách ({courses.length})</TabsTrigger>
          <TabsTrigger value="import">Import Excel</TabsTrigger>
          <TabsTrigger value="mapping">Mapping vị trí</TabsTrigger>
          <TabsTrigger value="help">Hướng dẫn</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <CourseListTab
            courses={courses} skills={skills} allGroups={allGroups}
            cpgMap={cpgMap} csMap={csMap} positions={positions} posMap={posMap}
            onReload={loadAll}
          />
        </TabsContent>
        <TabsContent value="import" className="mt-4">
          <ImportTab onReload={loadAll} existing={courses} />
        </TabsContent>
        <TabsContent value="mapping" className="mt-4">
          <MappingTab positions={positions} allGroups={allGroups} posMap={posMap} onReload={loadAll} />
        </TabsContent>
        <TabsContent value="help" className="mt-4">
          <HelpTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ====================== TAB 1: LIST ====================== */
function CourseListTab({
  courses, skills, allGroups, cpgMap, csMap, positions, posMap, onReload,
}: {
  courses: VtbCourse[]; skills: SkillCat[]; allGroups: string[];
  cpgMap: Map<string, Set<string>>; csMap: Map<string, CourseSkillMap[]>;
  positions: PositionRow[]; posMap: Map<string, string>; onReload: () => void;
}) {
  const [search, setSearch] = useState('');
  const [fmt, setFmt] = useState('all');
  const [comp, setComp] = useState('all');
  const [src, setSrc] = useState('all');
  const [editing, setEditing] = useState<VtbCourse | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<{ id: string; value: string } | null>(null);

  const filtered = useMemo(() => courses.filter(c => {
    if (fmt !== 'all' && c.format !== fmt) return false;
    if (comp !== 'all' && c.competency_type !== comp) return false;
    if (src !== 'all' && c.source !== src) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!c.name.toLowerCase().includes(s) && !String(c.code).toLowerCase().includes(s)) return false;
    }
    return true;
  }), [courses, search, fmt, comp, src]);

  const saveInlineName = async (id: string, value: string) => {
    const v = value.trim();
    if (!v) { setEditingName(null); return; }
    const { error } = await supabase.from('vtb_courses').update({ name: v }).eq('id', id);
    if (error) toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Đã cập nhật tên' }); onReload(); }
    setEditingName(null);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from('vtb_courses').delete().eq('id', deletingId);
    if (error) toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Đã xoá' }); onReload(); }
    setDeletingId(null);
  };

  const handleToggleActive = async (c: VtbCourse) => {
    await supabase.from('vtb_courses').update({ is_active: !c.is_active }).eq('id', c.id);
    onReload();
  };

  const duplicateCourse = (c: VtbCourse) => {
    setCreating(true);
    setEditing({ ...c, id: '', code: `${c.code}-COPY`, name: `${c.name} (bản sao)`, source: 'manual' });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo mã/tên..." className="pl-9" />
          </div>
          <Select value={fmt} onValueChange={setFmt}>
            <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Hình thức" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi hình thức</SelectItem>
              {FORMAT_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={comp} onValueChange={setComp}>
            <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Loại NL" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi loại</SelectItem>
              {COMPETENCY_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={src} onValueChange={setSrc}>
            <SelectTrigger className="w-full sm:w-[130px]"><SelectValue placeholder="Nguồn" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi nguồn</SelectItem>
              <SelectItem value="excel">Từ Excel</SelectItem>
              <SelectItem value="manual">Thủ công</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => { setCreating(true); setEditing(null); }}>
            <Plus className="w-4 h-4 mr-1" />Thêm khóa
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs">
              <tr>
                <th className="px-2 py-2 text-left">Mã</th>
                <th className="px-2 py-2 text-left">Tên khóa (click để sửa)</th>
                <th className="px-2 py-2 text-center">Ngày</th>
                <th className="px-2 py-2 text-left">Hình thức</th>
                <th className="px-2 py-2 text-center">Vị trí</th>
                <th className="px-2 py-2 text-center">Skill</th>
                <th className="px-2 py-2 text-center">Nguồn</th>
                <th className="px-2 py-2 text-center">Active</th>
                <th className="px-2 py-2 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const nGroups = cpgMap.get(c.id)?.size || 0;
                const nSkills = csMap.get(c.id)?.length || 0;
                return (
                  <tr key={c.id} className="border-t hover:bg-muted/30">
                    <td className="px-2 py-1.5 font-mono text-xs">{c.code}</td>
                    <td className="px-2 py-1.5 min-w-[280px]">
                      {editingName?.id === c.id ? (
                        <Input
                          autoFocus
                          value={editingName.value}
                          onChange={e => setEditingName({ id: c.id, value: e.target.value })}
                          onBlur={() => saveInlineName(c.id, editingName.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveInlineName(c.id, editingName.value);
                            if (e.key === 'Escape') setEditingName(null);
                          }}
                          className="h-7 text-sm"
                        />
                      ) : (
                        <button
                          className="text-left hover:text-primary"
                          onClick={() => setEditingName({ id: c.id, value: c.name })}
                          title="Click để sửa tên"
                        >
                          {c.name}
                          {c.short_name && <span className="text-muted-foreground text-xs ml-2">({c.short_name})</span>}
                        </button>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center">{c.duration_days ?? '-'}</td>
                    <td className="px-2 py-1.5"><Badge variant="outline" className="text-[10px]">{c.format || '-'}</Badge></td>
                    <td className="px-2 py-1.5 text-center">
                      <Badge variant={nGroups ? 'secondary' : 'outline'} className="text-[10px]">{nGroups}</Badge>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <Badge variant={nSkills ? 'default' : 'outline'} className="text-[10px]">{nSkills}</Badge>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <Badge variant={c.source === 'manual' ? 'default' : 'outline'} className="text-[10px]">
                        {c.source === 'manual' ? 'Thủ công' : 'Excel'}
                      </Badge>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <Switch checked={c.is_active} onCheckedChange={() => handleToggleActive(c)} />
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setCreating(false); }} title="Sửa chi tiết">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => duplicateCourse(c)} title="Nhân bản">
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeletingId(c.id)} title="Xoá">
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center text-muted-foreground py-8">Không tìm thấy khóa nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {(editing || creating) && (
          <CourseEditDialog
            course={editing}
            isCreate={creating}
            skills={skills}
            allGroups={allGroups}
            positions={positions}
            posMap={posMap}
            initialGroups={editing ? Array.from(cpgMap.get(editing.id) || []) : []}
            initialSkills={editing ? (csMap.get(editing.id) || []) : []}
            onClose={() => { setEditing(null); setCreating(false); }}
            onSaved={() => { setEditing(null); setCreating(false); onReload(); }}
          />
        )}

        <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xoá khóa học?</AlertDialogTitle>
              <AlertDialogDescription>
                Hành động không thể hoàn tác. Mapping vị trí và skill liên quan cũng sẽ bị xoá.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Huỷ</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Xoá</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

/* ====================== EDIT/CREATE DIALOG ====================== */
function CourseEditDialog({
  course, isCreate, skills, allGroups, positions, posMap, initialGroups, initialSkills, onClose, onSaved,
}: {
  course: VtbCourse | null; isCreate: boolean; skills: SkillCat[];
  allGroups: string[]; positions: PositionRow[]; posMap: Map<string, string>;
  initialGroups: string[]; initialSkills: CourseSkillMap[];
  onClose: () => void; onSaved: () => void;
}) {
  const empty: VtbCourse = {
    id: '', code: '', name: '', short_name: '', objective: '', content: '',
    duration_days: 1, format: 'Online', competency_type: 'Nghiệp vụ',
    is_active: true, source: 'manual', internal_note: '',
  };
  const [form, setForm] = useState<VtbCourse>(course || empty);
  const [groups, setGroups] = useState<Set<string>>(new Set(initialGroups));
  const [skillMaps, setSkillMaps] = useState<CourseSkillMap[]>(initialSkills);
  const [saving, setSaving] = useState(false);

  const toggleGroup = (g: string) => {
    const s = new Set(groups);
    s.has(g) ? s.delete(g) : s.add(g);
    setGroups(s);
  };
  const toggleSkill = (skillId: string) => {
    if (skillMaps.find(m => m.skill_id === skillId)) {
      setSkillMaps(skillMaps.filter(m => m.skill_id !== skillId));
    } else {
      setSkillMaps([...skillMaps, { course_id: form.id, skill_id: skillId, target_level_min: 1, relevance: 'medium' }]);
    }
  };
  const updateSkillMap = (skillId: string, field: 'target_level_min'|'relevance', value: any) => {
    setSkillMaps(skillMaps.map(m => m.skill_id === skillId ? { ...m, [field]: value } : m));
  };

  const matchingPositions = positions.filter(p => {
    const g = posMap.get(p.id);
    return g && groups.has(g);
  });

  const skillsByGroup = useMemo(() => {
    const map = new Map<string, SkillCat[]>();
    for (const s of skills) {
      if (!map.has(s.skill_group)) map.set(s.skill_group, []);
      map.get(s.skill_group)!.push(s);
    }
    return map;
  }, [skills]);

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast({ title: 'Thiếu thông tin', description: 'Mã khóa và tên không được rỗng', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      let courseId = form.id;
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        short_name: form.short_name?.trim() || null,
        objective: form.objective || null,
        content: form.content || null,
        duration_days: form.duration_days,
        format: form.format,
        competency_type: form.competency_type,
        is_active: form.is_active,
        internal_note: form.internal_note || null,
        source: isCreate ? 'manual' : form.source,
      };

      if (isCreate || !courseId) {
        const { data, error } = await supabase.from('vtb_courses').insert(payload).select('id').single();
        if (error) throw error;
        courseId = data.id;
      } else {
        const { error } = await supabase.from('vtb_courses').update(payload).eq('id', courseId);
        if (error) throw error;
      }

      // Sync position groups
      await supabase.from('vtb_course_position_groups').delete().eq('course_id', courseId);
      if (groups.size > 0) {
        await supabase.from('vtb_course_position_groups').insert(
          Array.from(groups).map(g => ({ course_id: courseId, position_group: g }))
        );
      }

      // Sync skill mappings
      await supabase.from('vtb_course_skills').delete().eq('course_id', courseId);
      if (skillMaps.length > 0) {
        await supabase.from('vtb_course_skills').insert(
          skillMaps.map(m => ({
            course_id: courseId, skill_id: m.skill_id,
            target_level_min: m.target_level_min, relevance: m.relevance,
          }))
        );
      }

      toast({ title: isCreate ? 'Đã tạo khóa' : 'Đã lưu thay đổi' });
      onSaved();
    } catch (e: any) {
      toast({ title: 'Lỗi lưu', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{isCreate ? 'Thêm khóa học mới' : `Sửa khóa: ${form.code}`}</DialogTitle>
          <DialogDescription>Sửa thông tin, mapping vị trí và skill liên quan để AI gợi ý chính xác hơn.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* A. Thông tin */}
          <section className="space-y-3">
            <h3 className="font-semibold text-sm">A. Thông tin khóa học</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Mã khóa *</Label>
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="VD: MAN-001" />
              </div>
              <div className="sm:col-span-2">
                <Label>Tên khóa (đầy đủ) *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Không viết tắt" />
              </div>
            </div>
            <div>
              <Label>Tên rút gọn (để hiển thị card gợi ý)</Label>
              <Input value={form.short_name || ''} onChange={e => setForm({ ...form, short_name: e.target.value })} placeholder="Tuỳ chọn" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Thời lượng (ngày)</Label>
                <Input type="number" min={0} step={0.5} value={form.duration_days ?? ''} onChange={e => setForm({ ...form, duration_days: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label>Hình thức</Label>
                <Select value={form.format || ''} onValueChange={(v) => setForm({ ...form, format: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FORMAT_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Loại năng lực</Label>
                <Select value={form.competency_type || ''} onValueChange={(v) => setForm({ ...form, competency_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COMPETENCY_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Mục tiêu khóa học</Label>
              <Textarea rows={2} value={form.objective || ''} onChange={e => setForm({ ...form, objective: e.target.value })} />
            </div>
            <div>
              <Label>Nội dung chính (AI dùng để match skill)</Label>
              <Textarea rows={3} value={form.content || ''} onChange={e => setForm({ ...form, content: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Đang áp dụng</Label>
            </div>
          </section>

          {/* B. Vị trí */}
          <section className="space-y-2">
            <h3 className="font-semibold text-sm">B. Áp dụng cho nhóm vị trí ({groups.size} đã chọn)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 max-h-48 overflow-y-auto border rounded p-2 bg-muted/30">
              {allGroups.map(g => (
                <label key={g} className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5">
                  <input type="checkbox" checked={groups.has(g)} onChange={() => toggleGroup(g)} />
                  <span>{g}</span>
                </label>
              ))}
            </div>
            {matchingPositions.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">→ Sẽ áp dụng cho {matchingPositions.length} vị trí:</span>{' '}
                {matchingPositions.map(p => p.name).join(', ')}
              </div>
            )}
            {groups.size === 0 && (
              <div className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Chưa chọn nhóm vị trí — khóa này sẽ không xuất hiện ở bất kỳ ai.
              </div>
            )}
          </section>

          {/* C. Skill */}
          <section className="space-y-2">
            <h3 className="font-semibold text-sm">C. Skill liên quan ({skillMaps.length}) — giúp AI gợi ý chính xác</h3>
            <div className="border rounded p-2 max-h-64 overflow-y-auto bg-muted/30 space-y-2">
              {Array.from(skillsByGroup.entries()).map(([gname, gskills]) => (
                <div key={gname}>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">{gname}</div>
                  <div className="space-y-1">
                    {gskills.map(s => {
                      const m = skillMaps.find(x => x.skill_id === s.id);
                      return (
                        <div key={s.id} className="flex items-center gap-2 text-xs">
                          <input type="checkbox" checked={!!m} onChange={() => toggleSkill(s.id)} />
                          <Badge variant="outline" className="text-[10px] w-12 justify-center">{s.code}</Badge>
                          <span className="flex-1 truncate">{s.name}</span>
                          {m && (
                            <>
                              <Select value={String(m.target_level_min)} onValueChange={(v) => updateSkillMap(s.id, 'target_level_min', Number(v))}>
                                <SelectTrigger className="h-7 w-[80px] text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>{[1,2,3,4].map(l => <SelectItem key={l} value={String(l)}>≥ L{l}</SelectItem>)}</SelectContent>
                              </Select>
                              <Select value={m.relevance} onValueChange={(v) => updateSkillMap(s.id, 'relevance', v)}>
                                <SelectTrigger className="h-7 w-[90px] text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="high">Cao</SelectItem>
                                  <SelectItem value="medium">Trung bình</SelectItem>
                                  <SelectItem value="low">Thấp</SelectItem>
                                </SelectContent>
                              </Select>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* D. Note */}
          <section>
            <Label>Ghi chú nội bộ (admin)</Label>
            <Textarea rows={2} value={form.internal_note || ''} onChange={e => setForm({ ...form, internal_note: e.target.value })} placeholder="VD: đã đổi tên 11/2026 từ ..." />
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-1" />{saving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ====================== TAB: IMPORT ====================== */
type ImportRow = {
  code: string; name: string; objective?: string; content?: string;
  duration_days?: number | null; format?: string; competency_type?: string;
  groups: string[]; status: 'new' | 'update' | 'error'; error?: string;
};

function ImportTab({ onReload, existing }: { onReload: () => void; existing: VtbCourse[] }) {
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [mode, setMode] = useState<'upsert' | 'replace'>('upsert');
  const [includeMapping, setIncludeMapping] = useState(true);
  const [importing, setImporting] = useState(false);

  const existingByCode = useMemo(() => new Map(existing.map(c => [c.code, c])), [existing]);

  const handleFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const XLSX = await import('xlsx');
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });
      if (!json.length) { toast({ title: 'File trống', variant: 'destructive' }); return; }

      const headers = Object.keys(json[0]);
      const findCol = (...names: string[]) => headers.find(h => names.some(n => h.toLowerCase().includes(n.toLowerCase())));
      const codeCol = findCol('mã khóa', 'mã', 'code');
      const nameCol = findCol('tên khóa', 'tên');
      const objCol = findCol('mục tiêu');
      const contentCol = findCol('nội dung');
      const durCol = findCol('thời lượng', 'ngày');
      const fmtCol = findCol('hình thức');
      const compCol = findCol('loại năng lực', 'loại');
      const fixedCols = new Set([codeCol, nameCol, objCol, contentCol, durCol, fmtCol, compCol].filter(Boolean) as string[]);
      const groupCols = headers.filter(h => !fixedCols.has(h) && h.trim());

      const parsed: ImportRow[] = json.map((r) => {
        const code = String(r[codeCol || ''] || '').trim();
        const name = String(r[nameCol || ''] || '').trim();
        if (!code || !name) return { code, name, groups: [], status: 'error', error: 'Thiếu mã/tên' };
        const groups = groupCols.filter(g => {
          const v = String(r[g] || '').trim().toLowerCase();
          return v === 'x' || v === '1' || v === 'true' || v === 'có';
        });
        return {
          code, name,
          objective: String(r[objCol || ''] || '').trim(),
          content: String(r[contentCol || ''] || '').trim(),
          duration_days: r[durCol || ''] ? Number(r[durCol || '']) : null,
          format: String(r[fmtCol || ''] || '').trim() || undefined,
          competency_type: String(r[compCol || ''] || '').trim() || undefined,
          groups,
          status: existingByCode.has(code) ? 'update' : 'new',
        };
      });
      setRows(parsed);
    } catch (e: any) {
      toast({ title: 'Lỗi đọc Excel', description: e.message, variant: 'destructive' });
    }
  };

  const handleImport = async () => {
    if (!rows) return;
    setImporting(true);
    try {
      if (mode === 'replace') {
        // Delete excel-source courses only
        await supabase.from('vtb_courses').delete().eq('source', 'excel');
      }
      const valid = rows.filter(r => r.status !== 'error');
      for (const r of valid) {
        const payload = {
          code: r.code, name: r.name,
          objective: r.objective || null, content: r.content || null,
          duration_days: r.duration_days ?? null,
          format: r.format || null, competency_type: r.competency_type || null,
          source: 'excel', is_active: true,
        };
        const { data, error } = await supabase.from('vtb_courses')
          .upsert(payload, { onConflict: 'code' }).select('id').single();
        if (error) { console.error(error); continue; }
        if (includeMapping && data?.id) {
          await supabase.from('vtb_course_position_groups').delete().eq('course_id', data.id);
          if (r.groups.length) {
            await supabase.from('vtb_course_position_groups').insert(
              r.groups.map(g => ({ course_id: data.id, position_group: g }))
            );
          }
        }
      }
      toast({ title: `Đã import ${valid.length} khóa` });
      setRows(null);
      onReload();
    } catch (e: any) {
      toast({ title: 'Lỗi import', description: e.message, variant: 'destructive' });
    } finally { setImporting(false); }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Import từ Excel</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Chọn file Excel (.xlsx)</Label>
          <Input type="file" accept=".xlsx,.xls" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <p className="text-xs text-muted-foreground mt-1">
            Cột bắt buộc: <code>Mã khóa</code>, <code>Tên khóa học</code>. Các cột khác (Mục tiêu, Nội dung, Thời lượng, Hình thức, Loại năng lực) tuỳ chọn.
            Các cột còn lại được coi là <strong>nhóm vị trí</strong>; ô có giá trị <code>x</code> = áp dụng.
          </p>
        </div>

        {rows && (
          <>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between p-3 border rounded bg-muted/30">
              <div className="flex gap-4 text-sm">
                <span>📋 Tổng: <strong>{rows.length}</strong></span>
                <span className="text-green-700">+ Mới: <strong>{rows.filter(r => r.status === 'new').length}</strong></span>
                <span className="text-blue-700">↻ Cập nhật: <strong>{rows.filter(r => r.status === 'update').length}</strong></span>
                <span className="text-destructive">✗ Lỗi: <strong>{rows.filter(r => r.status === 'error').length}</strong></span>
              </div>
              <div className="flex gap-2 items-center">
                <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upsert">Upsert (an toàn)</SelectItem>
                    <SelectItem value="replace">Replace khóa Excel</SelectItem>
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={includeMapping} onChange={e => setIncludeMapping(e.target.checked)} />
                  Mapping vị trí
                </label>
              </div>
            </div>
            {mode === 'replace' && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Sẽ XOÁ toàn bộ khóa có nguồn = Excel trước khi import lại. Khóa thủ công không bị ảnh hưởng.
              </div>
            )}
            <div className="overflow-x-auto max-h-96 border rounded">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr><th className="px-2 py-1 text-left">TT</th><th className="px-2 py-1 text-left">Mã</th><th className="px-2 py-1 text-left">Tên</th><th className="px-2 py-1 text-center">Nhóm VT</th><th className="px-2 py-1 text-center">Trạng thái</th></tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1">{i + 1}</td>
                      <td className="px-2 py-1 font-mono">{r.code || '-'}</td>
                      <td className="px-2 py-1">{r.name || <em className="text-muted-foreground">(rỗng)</em>}</td>
                      <td className="px-2 py-1 text-center">{r.groups.length}</td>
                      <td className="px-2 py-1 text-center">
                        {r.status === 'new' && <Badge className="bg-green-100 text-green-800 text-[10px]">Mới</Badge>}
                        {r.status === 'update' && <Badge className="bg-blue-100 text-blue-800 text-[10px]">Cập nhật</Badge>}
                        {r.status === 'error' && <Badge variant="destructive" className="text-[10px]">{r.error}</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRows(null)}><X className="w-4 h-4 mr-1" />Huỷ</Button>
              <Button onClick={handleImport} disabled={importing}>
                <Upload className="w-4 h-4 mr-1" />{importing ? 'Đang import...' : 'Xác nhận import'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ====================== TAB: MAPPING ====================== */
function MappingTab({
  positions, allGroups, posMap, onReload,
}: { positions: PositionRow[]; allGroups: string[]; posMap: Map<string, string>; onReload: () => void }) {
  const setMapping = async (positionId: string, group: string | null) => {
    await supabase.from('position_to_vtb_group').delete().eq('position_id', positionId);
    if (group) {
      await supabase.from('position_to_vtb_group').insert({ position_id: positionId, vtb_position_group: group });
    }
    toast({ title: 'Đã cập nhật mapping' });
    onReload();
  };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Mapping vị trí hệ thống ↔ Nhóm vị trí VTB</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs">
              <tr><th className="px-2 py-2 text-left">Vị trí hệ thống</th><th className="px-2 py-2 text-left">Nhóm VTB</th></tr>
            </thead>
            <tbody>
              {positions.map(p => {
                const g = posMap.get(p.id) || '';
                return (
                  <tr key={p.id} className="border-t">
                    <td className="px-2 py-1.5">
                      {p.name}
                      {!g && <Badge variant="outline" className="ml-2 text-[10px] text-amber-600 border-amber-300">⚠ chưa map</Badge>}
                    </td>
                    <td className="px-2 py-1.5">
                      <Select value={g || 'none'} onValueChange={(v) => setMapping(p.id, v === 'none' ? null : v)}>
                        <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Chưa map —</SelectItem>
                          {allGroups.map(grp => <SelectItem key={grp} value={grp}>{grp}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ====================== TAB: HELP ====================== */
function HelpTab() {
  return (
    <Card>
      <CardContent className="pt-6 prose prose-sm max-w-none">
        <h3>Cách sử dụng</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li><strong>Sửa tên nhanh:</strong> tại tab Danh sách, click vào tên khóa để chỉnh inline.</li>
          <li><strong>Thêm khóa thủ công:</strong> nút "Thêm khóa". Điền mã (unique), tên, chọn nhóm vị trí + skill liên quan.</li>
          <li><strong>Mapping skill:</strong> chọn skill và đặt mức tối thiểu + độ liên quan. AI sẽ ưu tiên các khóa đã tag rõ skill.</li>
          <li><strong>Import Excel:</strong> chế độ Upsert giữ khóa cũ; chế độ Replace chỉ xoá khóa có nguồn Excel (không đụng khóa thủ công).</li>
          <li><strong>Mapping vị trí:</strong> với vị trí có badge ⚠, chọn nhóm VTB tương ứng để cán bộ ở vị trí đó nhận được gợi ý.</li>
        </ol>
      </CardContent>
    </Card>
  );
}
