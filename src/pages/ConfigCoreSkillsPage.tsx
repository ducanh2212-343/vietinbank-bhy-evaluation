import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Save, Plus, Trash2 } from 'lucide-react';

export default function ConfigCoreSkillsPage() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedPos, setSelectedPos] = useState('');
  const [mappings, setMappings] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [dRes, pRes, sRes] = await Promise.all([
        supabase.from('departments').select('id, name').eq('is_active', true).order('name'),
        supabase.from('positions').select('id, name, department_id').eq('is_active', true).order('sort_order'),
        supabase.from('skill_catalog').select('id, code, name, skill_group').eq('is_active', true).order('sort_order'),
      ]);
      setDepartments(dRes.data || []);
      setPositions(pRes.data || []);
      setSkills(sRes.data || []);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    setSelectedPos('');
    setMappings([]);
  }, [selectedDept]);

  useEffect(() => {
    if (!selectedPos) { setMappings([]); return; }
    const load = async () => {
      const { data } = await supabase
        .from('position_core_skills')
        .select('id, skill_id, minimum_level, advanced_level, weight, sort_order')
        .eq('position_id', selectedPos)
        .order('sort_order');
      setMappings(data || []);
    };
    load();
  }, [selectedPos]);

  const filteredPositions = positions.filter(p => p.department_id === selectedDept);

  const addSkill = (skillId: string) => {
    if (mappings.some(m => m.skill_id === skillId)) {
      toast({ title: 'Skill đã tồn tại', variant: 'destructive' });
      return;
    }
    setMappings(prev => [...prev, { skill_id: skillId, minimum_level: 1, advanced_level: 3, weight: 1, sort_order: prev.length + 1, _new: true }]);
  };

  const removeSkill = (idx: number) => {
    setMappings(prev => prev.filter((_, i) => i !== idx));
  };

  const updateMapping = (idx: number, field: string, value: number) => {
    setMappings(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const handleSave = async () => {
    if (!selectedPos) return;
    for (const m of mappings) {
      if (!m.minimum_level || !m.advanced_level) {
        toast({ title: 'Lỗi', description: 'Minimum level và Advanced level không được để trống', variant: 'destructive' });
        return;
      }
    }
    setSaving(true);
    // Delete existing then re-insert
    await supabase.from('position_core_skills').delete().eq('position_id', selectedPos);
    if (mappings.length > 0) {
      const rows = mappings.map((m, i) => ({
        position_id: selectedPos,
        skill_id: m.skill_id,
        minimum_level: m.minimum_level,
        advanced_level: m.advanced_level,
        weight: m.weight || 1,
        sort_order: i + 1,
      }));
      const { error } = await supabase.from('position_core_skills').insert(rows);
      if (error) {
        toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    toast({ title: 'Đã lưu cấu hình skill lõi' });
    // Reload
    const { data } = await supabase.from('position_core_skills').select('id, skill_id, minimum_level, advanced_level, weight, sort_order').eq('position_id', selectedPos).order('sort_order');
    setMappings(data || []);
  };

  if (!isAdmin) return <div className="p-6 text-muted-foreground">Bạn không có quyền truy cập.</div>;
  if (loading) return <div className="p-6 text-muted-foreground">Đang tải...</div>;

  const unusedSkills = skills.filter(s => !mappings.some(m => m.skill_id === s.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Cấu hình skill lõi theo vị trí</h1>
        <p className="page-subtitle">Gán kỹ năng lõi bắt buộc cho từng vị trí công việc</p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Select value={selectedDept} onValueChange={setSelectedDept}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Chọn phòng ban" /></SelectTrigger>
          <SelectContent>
            {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {selectedDept && (
          <Select value={selectedPos} onValueChange={setSelectedPos}>
            <SelectTrigger className="w-[280px]"><SelectValue placeholder="Chọn vị trí" /></SelectTrigger>
            <SelectContent>
              {filteredPositions.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {selectedPos && (
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" /> {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </Button>
        )}
      </div>

      {selectedPos && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Skill lõi đã gán ({mappings.length} skill)</CardTitle>
            </CardHeader>
            <CardContent>
              {mappings.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Chưa có skill lõi nào được gán cho vị trí này.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Kỹ năng</TableHead>
                      <TableHead>Nhóm</TableHead>
                      <TableHead className="w-28">Min Level</TableHead>
                      <TableHead className="w-28">Adv Level</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappings.map((m, i) => {
                      const skill = skills.find(s => s.id === m.skill_id);
                      return (
                        <TableRow key={m.skill_id}>
                          <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-medium">{skill?.name || m.skill_id}</TableCell>
                          <TableCell><Badge variant="outline">{skill?.skill_group || '—'}</Badge></TableCell>
                          <TableCell>
                            <select value={m.minimum_level} onChange={e => updateMapping(i, 'minimum_level', +e.target.value)} className="w-16 px-2 py-1 border rounded text-sm">
                              {[1,2,3,4].map(l => <option key={l} value={l}>L{l}</option>)}
                            </select>
                          </TableCell>
                          <TableCell>
                            <select value={m.advanced_level} onChange={e => updateMapping(i, 'advanced_level', +e.target.value)} className="w-16 px-2 py-1 border rounded text-sm">
                              {[1,2,3,4].map(l => <option key={l} value={l}>L{l}</option>)}
                            </select>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => removeSkill(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Thêm skill lõi</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                {unusedSkills.map(s => (
                  <button key={s.id} onClick={() => addSkill(s.id)} className="flex items-center gap-2 p-2 text-sm text-left hover:bg-muted/50 rounded transition-colors">
                    <Plus className="w-3 h-3 text-primary shrink-0" />
                    <span className="text-muted-foreground w-10">{s.code}</span>
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
