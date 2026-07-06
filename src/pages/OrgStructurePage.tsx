import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  Building2, Briefcase, Plus, Pencil, Trash2, Loader2, Copy,
  ArrowUp, ArrowDown, Users,
} from 'lucide-react';
import { toast } from 'sonner';

interface DeptRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface PositionRow {
  id: string;
  department_id: string | null;
  name: string;
  code: string | null;
  sort_order: number;
  is_active: boolean;
}

/** "Phòng giao dịch Mỹ Hào" → "PHONG_GIAO_DICH_MY_HAO" (bỏ dấu tiếng Việt). */
function suggestCode(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

/** Mã chức danh khi sao chép sang phòng mới: thay hậu tố _<mã phòng nguồn> bằng _<mã phòng đích>. */
function remapPositionCode(srcCode: string | null, srcDeptCode: string | undefined, newDeptCode: string): string | null {
  if (!srcCode) return null;
  if (srcDeptCode && srcCode.endsWith(`_${srcDeptCode}`)) {
    return srcCode.slice(0, srcCode.length - srcDeptCode.length - 1) + `_${newDeptCode}`;
  }
  return `${srcCode}_${newDeptCode}`;
}

const EMPTY_DEPT_FORM = { name: '', code: '', codeTouched: false, description: '', copyFromId: '' };
const EMPTY_POS_FORM = { name: '', code: '' };

export default function OrgStructurePage() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [departments, setDepartments] = useState<DeptRow[]>([]);
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [staffByDept, setStaffByDept] = useState<Map<string, number>>(new Map());
  const [staffByPosition, setStaffByPosition] = useState<Map<string, number>>(new Map());
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  // Dialog phòng ban (tạo mới hoặc sửa)
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DeptRow | null>(null);
  const [deptForm, setDeptForm] = useState(EMPTY_DEPT_FORM);

  // Dialog chức danh (tạo mới hoặc sửa)
  const [posDialogOpen, setPosDialogOpen] = useState(false);
  const [editingPos, setEditingPos] = useState<PositionRow | null>(null);
  const [posForm, setPosForm] = useState(EMPTY_POS_FORM);

  // Dialog sao chép chức danh vào phòng đang chọn
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copySourceId, setCopySourceId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [dRes, pRes, profRes] = await Promise.all([
      supabase.from('departments').select('id, code, name, description, is_active').order('name'),
      supabase.from('positions').select('id, department_id, name, code, sort_order, is_active').order('sort_order'),
      supabase.from('profiles').select('id, department_id, position_id, status').neq('status', 'deleted'),
    ]);
    const err = dRes.error || pRes.error || profRes.error;
    if (err) {
      toast.error('Lỗi tải dữ liệu: ' + err.message);
      setLoading(false);
      return;
    }
    setDepartments((dRes.data || []) as DeptRow[]);
    setPositions((pRes.data || []) as PositionRow[]);
    const byDept = new Map<string, number>();
    const byPos = new Map<string, number>();
    (profRes.data || []).forEach((p: { department_id: string | null; position_id: string | null }) => {
      if (p.department_id) byDept.set(p.department_id, (byDept.get(p.department_id) || 0) + 1);
      if (p.position_id) byPos.set(p.position_id, (byPos.get(p.position_id) || 0) + 1);
    });
    setStaffByDept(byDept);
    setStaffByPosition(byPos);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Giữ phòng đang chọn hợp lệ sau mỗi lần tải lại
  useEffect(() => {
    if (!loading && departments.length && !departments.some((d) => d.id === selectedDeptId)) {
      setSelectedDeptId(departments[0].id);
    }
  }, [loading, departments, selectedDeptId]);

  const selectedDept = departments.find((d) => d.id === selectedDeptId) || null;
  const deptPositions = useMemo(
    () => positions.filter((p) => p.department_id === selectedDeptId).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [positions, selectedDeptId],
  );
  const positionCountByDept = useMemo(() => {
    const m = new Map<string, number>();
    positions.forEach((p) => { if (p.department_id) m.set(p.department_id, (m.get(p.department_id) || 0) + 1); });
    return m;
  }, [positions]);

  // ===== Phòng ban =====

  const openCreateDept = () => {
    setEditingDept(null);
    setDeptForm(EMPTY_DEPT_FORM);
    setDeptDialogOpen(true);
  };

  const openEditDept = (d: DeptRow) => {
    setEditingDept(d);
    setDeptForm({ name: d.name, code: d.code, codeTouched: true, description: d.description || '', copyFromId: '' });
    setDeptDialogOpen(true);
  };

  /** Sao chép chức danh + cấu hình skill lõi từ phòng nguồn sang phòng đích (bỏ qua chức danh trùng tên). */
  const copyPositionsInto = async (sourceDeptId: string, targetDept: { id: string; code: string }): Promise<number> => {
    const srcDept = departments.find((d) => d.id === sourceDeptId);
    const srcPositions = positions.filter((p) => p.department_id === sourceDeptId);
    const existingNames = new Set(
      positions.filter((p) => p.department_id === targetDept.id).map((p) => p.name.trim().toLowerCase()),
    );
    const toCopy = srcPositions.filter((p) => !existingNames.has(p.name.trim().toLowerCase()));
    if (toCopy.length === 0) return 0;

    const { data: inserted, error } = await supabase
      .from('positions')
      .insert(toCopy.map((p) => ({
        department_id: targetDept.id,
        name: p.name,
        code: remapPositionCode(p.code, srcDept?.code, targetDept.code),
        sort_order: p.sort_order,
        is_active: p.is_active,
      })))
      .select('id, name');
    if (error) throw new Error('Lỗi sao chép chức danh: ' + error.message);

    // Sao chép cấu hình skill lõi theo từng chức danh nguồn → chức danh mới cùng tên
    const srcIds = toCopy.map((p) => p.id);
    const { data: skills, error: sErr } = await supabase
      .from('position_core_skills')
      .select('position_id, skill_id, minimum_level, advanced_level, weight, sort_order')
      .in('position_id', srcIds);
    if (sErr) throw new Error('Lỗi đọc skill lõi: ' + sErr.message);

    const newIdByName = new Map((inserted || []).map((p) => [p.name, p.id]));
    const skillRows = (skills || []).flatMap((s) => {
      const srcPos = toCopy.find((p) => p.id === s.position_id);
      const newId = srcPos ? newIdByName.get(srcPos.name) : null;
      return newId ? [{
        position_id: newId,
        skill_id: s.skill_id,
        minimum_level: s.minimum_level,
        advanced_level: s.advanced_level,
        weight: s.weight,
        sort_order: s.sort_order,
      }] : [];
    });
    if (skillRows.length) {
      const { error: insErr } = await supabase.from('position_core_skills').insert(skillRows);
      if (insErr) throw new Error('Đã sao chép chức danh nhưng lỗi sao chép skill lõi: ' + insErr.message);
    }
    return toCopy.length;
  };

  const saveDept = async () => {
    const name = deptForm.name.trim();
    const code = deptForm.code.trim();
    if (!name || !code) {
      toast.error('Cần nhập tên và mã phòng ban');
      return;
    }
    const dup = departments.find((d) => d.id !== editingDept?.id && (d.name.trim().toLowerCase() === name.toLowerCase() || d.code === code));
    if (dup) {
      toast.error(`Trùng với phòng ban "${dup.name}" (mã ${dup.code})`);
      return;
    }
    setBusy(true);
    try {
      if (editingDept) {
        const { error } = await supabase.from('departments')
          .update({ name, code, description: deptForm.description.trim() || null })
          .eq('id', editingDept.id);
        if (error) throw new Error(error.message);
        toast.success(`Đã cập nhật phòng ban "${name}"`);
      } else {
        const { data, error } = await supabase.from('departments')
          .insert({ name, code, description: deptForm.description.trim() || null, is_active: true })
          .select('id, code')
          .single();
        if (error) throw new Error(error.message);
        let copied = 0;
        if (deptForm.copyFromId && data) {
          copied = await copyPositionsInto(deptForm.copyFromId, data);
        }
        toast.success(copied > 0
          ? `Đã tạo phòng ban "${name}" và sao chép ${copied} chức danh (kèm skill lõi)`
          : `Đã tạo phòng ban "${name}"`);
        if (data) setSelectedDeptId(data.id);
      }
      setDeptDialogOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Có lỗi xảy ra');
    } finally {
      setBusy(false);
    }
  };

  const toggleDeptActive = async (d: DeptRow) => {
    const { error } = await supabase.from('departments').update({ is_active: !d.is_active }).eq('id', d.id);
    if (error) { toast.error('Lỗi cập nhật: ' + error.message); return; }
    toast.success(d.is_active ? `Đã ngừng sử dụng "${d.name}"` : `Đã kích hoạt lại "${d.name}"`);
    await load();
  };

  const deleteDept = async (d: DeptRow) => {
    const staffCount = staffByDept.get(d.id) || 0;
    if (staffCount > 0) {
      toast.error(`Không thể xoá: còn ${staffCount} cán bộ thuộc phòng này. Hãy chuyển cán bộ sang phòng khác hoặc dùng "Ngừng sử dụng".`);
      return;
    }
    const deptPos = positions.filter((p) => p.department_id === d.id);
    const posWithStaff = deptPos.filter((p) => (staffByPosition.get(p.id) || 0) > 0);
    if (posWithStaff.length > 0) {
      toast.error(`Không thể xoá: chức danh "${posWithStaff[0].name}" vẫn còn cán bộ đang giữ.`);
      return;
    }
    const ok = window.confirm(
      `Xoá vĩnh viễn phòng ban "${d.name}"${deptPos.length ? ` cùng ${deptPos.length} chức danh (và cấu hình skill lõi kèm theo)` : ''}?\n` +
      'Thao tác này không thể hoàn tác. Nếu chỉ muốn ẩn khỏi danh sách chọn, hãy dùng "Ngừng sử dụng".',
    );
    if (!ok) return;
    setBusy(true);
    try {
      if (deptPos.length) {
        const { error } = await supabase.from('positions').delete().in('id', deptPos.map((p) => p.id));
        if (error) throw new Error(error.message);
      }
      const { error } = await supabase.from('departments').delete().eq('id', d.id);
      if (error) throw new Error(error.message);
      toast.success(`Đã xoá phòng ban "${d.name}"`);
      await load();
    } catch (e) {
      toast.error('Lỗi xoá phòng ban: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };

  // ===== Chức danh =====

  const openCreatePos = () => {
    setEditingPos(null);
    setPosForm(EMPTY_POS_FORM);
    setPosDialogOpen(true);
  };

  const openEditPos = (p: PositionRow) => {
    setEditingPos(p);
    setPosForm({ name: p.name, code: p.code || '' });
    setPosDialogOpen(true);
  };

  const savePos = async () => {
    const name = posForm.name.trim();
    if (!name) { toast.error('Cần nhập tên chức danh'); return; }
    if (!selectedDept && !editingPos) return;
    const deptId = editingPos ? editingPos.department_id : selectedDept!.id;
    const dup = positions.find((p) => p.department_id === deptId && p.id !== editingPos?.id && p.name.trim().toLowerCase() === name.toLowerCase());
    if (dup) { toast.error(`Chức danh "${dup.name}" đã tồn tại trong phòng này`); return; }
    setBusy(true);
    try {
      if (editingPos) {
        const { error } = await supabase.from('positions')
          .update({ name, code: posForm.code.trim() || null })
          .eq('id', editingPos.id);
        if (error) throw new Error(error.message);
        // Đồng bộ tên chức danh (dạng text) đang lưu trên hồ sơ cán bộ để nhận diện
        // lãnh đạo phòng và hiển thị không bị lệch tên cũ.
        if (name !== editingPos.name) {
          const { error: syncErr } = await supabase.from('profiles')
            .update({ position: name })
            .eq('position_id', editingPos.id);
          if (syncErr) {
            toast.warning('Đã đổi tên chức danh nhưng chưa đồng bộ được hồ sơ cán bộ: ' + syncErr.message);
          }
        }
        toast.success(`Đã cập nhật chức danh "${name}"`);
      } else {
        const maxOrder = deptPositions.reduce((m, p) => Math.max(m, p.sort_order), 0);
        const { error } = await supabase.from('positions').insert({
          department_id: selectedDept!.id,
          name,
          code: posForm.code.trim() || null,
          sort_order: maxOrder + 1,
          is_active: true,
        });
        if (error) throw new Error(error.message);
        toast.success(`Đã thêm chức danh "${name}" vào ${selectedDept!.name}`);
      }
      setPosDialogOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Có lỗi xảy ra');
    } finally {
      setBusy(false);
    }
  };

  const togglePosActive = async (p: PositionRow) => {
    const { error } = await supabase.from('positions').update({ is_active: !p.is_active }).eq('id', p.id);
    if (error) { toast.error('Lỗi cập nhật: ' + error.message); return; }
    toast.success(p.is_active ? `Đã ngừng sử dụng "${p.name}"` : `Đã kích hoạt lại "${p.name}"`);
    await load();
  };

  const deletePos = async (p: PositionRow) => {
    const staffCount = staffByPosition.get(p.id) || 0;
    if (staffCount > 0) {
      toast.error(`Không thể xoá: còn ${staffCount} cán bộ đang giữ chức danh này. Hãy đổi chức danh cho cán bộ trước hoặc dùng "Ngừng sử dụng".`);
      return;
    }
    const ok = window.confirm(`Xoá vĩnh viễn chức danh "${p.name}" (kèm cấu hình skill lõi của chức danh)?\nNếu chức danh có thể dùng lại, hãy chọn "Ngừng sử dụng" thay vì xoá.`);
    if (!ok) return;
    const { error } = await supabase.from('positions').delete().eq('id', p.id);
    if (error) { toast.error('Lỗi xoá chức danh: ' + error.message); return; }
    toast.success(`Đã xoá chức danh "${p.name}"`);
    await load();
  };

  const movePos = async (p: PositionRow, dir: -1 | 1) => {
    const idx = deptPositions.findIndex((x) => x.id === p.id);
    const other = deptPositions[idx + dir];
    if (!other) return;
    // Hoán đổi sort_order; nếu hai giá trị trùng nhau thì tách ra theo vị trí mới.
    const a = { id: p.id, sort_order: other.sort_order === p.sort_order ? p.sort_order + dir : other.sort_order };
    const b = { id: other.id, sort_order: p.sort_order };
    const [r1, r2] = await Promise.all([
      supabase.from('positions').update({ sort_order: a.sort_order }).eq('id', a.id),
      supabase.from('positions').update({ sort_order: b.sort_order }).eq('id', b.id),
    ]);
    const error = r1.error || r2.error;
    if (error) { toast.error('Lỗi sắp xếp: ' + error.message); return; }
    await load();
  };

  const runCopyIntoSelected = async () => {
    if (!copySourceId || !selectedDept) return;
    setBusy(true);
    try {
      const copied = await copyPositionsInto(copySourceId, { id: selectedDept.id, code: selectedDept.code });
      toast.success(copied > 0
        ? `Đã sao chép ${copied} chức danh (kèm skill lõi) vào ${selectedDept.name}`
        : 'Không có chức danh mới để sao chép (các chức danh trùng tên đã được bỏ qua)');
      setCopyDialogOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Có lỗi xảy ra');
    } finally {
      setBusy(false);
    }
  };

  if (!isAdmin) {
    return <div className="p-6 text-sm text-muted-foreground">Bạn không có quyền truy cập trang này.</div>;
  }

  return (
    <div className="space-y-4 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" /> Quản lý Phòng ban & Chức danh
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Thêm phòng ban / phòng giao dịch mới và quản lý chức danh của từng phòng. Khi tạo phòng giao dịch mới, bạn có thể
          <strong> sao chép chức danh kèm cấu hình skill lõi</strong> từ một phòng có sẵn. Chức danh thay đổi trong năm:
          dùng <strong>Sửa</strong> để đổi tên (hồ sơ cán bộ tự đồng bộ) hoặc <strong>Ngừng sử dụng</strong> để ẩn khỏi danh sách chọn mà vẫn giữ lịch sử.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[5fr_6fr] gap-4 items-start">
          {/* Cột trái: danh sách phòng ban */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" /> Phòng ban ({departments.length})
                </CardTitle>
                <Button size="sm" onClick={openCreateDept}>
                  <Plus className="w-4 h-4 mr-1" /> Thêm phòng ban
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {departments.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">Chưa có phòng ban nào.</p>
              )}
              {departments.map((d) => {
                const active = d.id === selectedDeptId;
                const staffCount = staffByDept.get(d.id) || 0;
                const posCount = positionCountByDept.get(d.id) || 0;
                return (
                  <div
                    key={d.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedDeptId(d.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedDeptId(d.id); }}
                    className={`rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${active ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'} ${!d.is_active ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{d.name}</span>
                          <Badge variant="outline" className="text-[10px]">{d.code}</Badge>
                          {!d.is_active && <Badge variant="secondary" className="text-[10px]">Ngừng sử dụng</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {staffCount} cán bộ</span>
                          <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {posCount} chức danh</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={d.is_active}
                          onCheckedChange={() => toggleDeptActive(d)}
                          className="scale-75"
                          aria-label={`Kích hoạt ${d.name}`}
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDept(d)} aria-label={`Sửa ${d.name}`}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteDept(d)}
                          disabled={busy}
                          aria-label={`Xoá ${d.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Cột phải: chức danh của phòng đang chọn */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-base flex items-center gap-2 min-w-0">
                  <Briefcase className="w-4 h-4 text-primary" />
                  <span className="truncate">Chức danh{selectedDept ? ` — ${selectedDept.name}` : ''}</span>
                </CardTitle>
                {selectedDept && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setCopySourceId(''); setCopyDialogOpen(true); }}>
                      <Copy className="w-3.5 h-3.5 mr-1" /> Sao chép từ phòng khác
                    </Button>
                    <Button size="sm" onClick={openCreatePos}>
                      <Plus className="w-4 h-4 mr-1" /> Thêm chức danh
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {!selectedDept ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Chọn một phòng ban ở danh sách bên trái.</p>
              ) : deptPositions.length === 0 ? (
                <div className="py-6 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Phòng này chưa có chức danh nào.</p>
                  <p className="text-xs text-muted-foreground">
                    Mẹo: dùng <strong>"Sao chép từ phòng khác"</strong> để lấy nguyên bộ chức danh + skill lõi của một phòng giao dịch có sẵn.
                  </p>
                </div>
              ) : (
                deptPositions.map((p, idx) => {
                  const staffCount = staffByPosition.get(p.id) || 0;
                  return (
                    <div key={p.id} className={`rounded-lg border px-3 py-2 flex items-center gap-2 ${!p.is_active ? 'opacity-60' : ''}`}>
                      <div className="flex flex-col flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === 0} onClick={() => movePos(p, -1)} aria-label="Chuyển lên">
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === deptPositions.length - 1} onClick={() => movePos(p, 1)} aria-label="Chuyển xuống">
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{p.name}</span>
                          {p.code && <Badge variant="outline" className="text-[10px]">{p.code}</Badge>}
                          {!p.is_active && <Badge variant="secondary" className="text-[10px]">Ngừng sử dụng</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Users className="w-3 h-3" /> {staffCount} cán bộ đang giữ
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Switch
                          checked={p.is_active}
                          onCheckedChange={() => togglePosActive(p)}
                          className="scale-75"
                          aria-label={`Kích hoạt ${p.name}`}
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditPos(p)} aria-label={`Sửa ${p.name}`}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deletePos(p)}
                          aria-label={`Xoá ${p.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog tạo / sửa phòng ban */}
      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDept ? `Sửa phòng ban: ${editingDept.name}` : 'Thêm phòng ban mới'}</DialogTitle>
            {!editingDept && (
              <DialogDescription>
                Ví dụ: "Phòng giao dịch Văn Lâm". Chọn phòng nguồn để sao chép sẵn bộ chức danh + skill lõi.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-muted-foreground font-medium">Tên phòng ban *</label>
              <Input
                value={deptForm.name}
                onChange={(e) => setDeptForm((f) => ({
                  ...f,
                  name: e.target.value,
                  code: f.codeTouched ? f.code : suggestCode(e.target.value),
                }))}
                placeholder="Phòng giao dịch …"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-medium">Mã phòng ban * (viết tắt, không dấu)</label>
              <Input
                value={deptForm.code}
                onChange={(e) => setDeptForm((f) => ({ ...f, code: e.target.value.toUpperCase(), codeTouched: true }))}
                placeholder="PGD_VAN_LAM"
              />
            </div>
            {!editingDept && (
              <div>
                <label className="text-[11px] text-muted-foreground font-medium">Sao chép chức danh + skill lõi từ phòng</label>
                <Select value={deptForm.copyFromId || 'none'} onValueChange={(v) => setDeptForm((f) => ({ ...f, copyFromId: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="— Không sao chép —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Không sao chép —</SelectItem>
                    {departments
                      .filter((d) => (positionCountByDept.get(d.id) || 0) > 0)
                      .map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name} ({positionCountByDept.get(d.id)} chức danh)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-[11px] text-muted-foreground font-medium">Mô tả</label>
              <Textarea rows={2} value={deptForm.description} onChange={(e) => setDeptForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptDialogOpen(false)}>Huỷ</Button>
            <Button onClick={saveDept} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : (editingDept ? <Pencil className="w-3.5 h-3.5 mr-1" /> : <Plus className="w-4 h-4 mr-1" />)}
              {editingDept ? 'Lưu thay đổi' : 'Tạo phòng ban'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog tạo / sửa chức danh */}
      <Dialog open={posDialogOpen} onOpenChange={setPosDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPos ? `Sửa chức danh: ${editingPos.name}` : `Thêm chức danh vào ${selectedDept?.name || ''}`}
            </DialogTitle>
            {editingPos && (staffByPosition.get(editingPos.id) || 0) > 0 && (
              <DialogDescription>
                Đang có {staffByPosition.get(editingPos.id)} cán bộ giữ chức danh này — khi đổi tên, hồ sơ của họ sẽ được cập nhật theo tên mới.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-muted-foreground font-medium">Tên chức danh *</label>
              <Input value={posForm.name} onChange={(e) => setPosForm((f) => ({ ...f, name: e.target.value }))} placeholder="Cán bộ giao dịch viên" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-medium">Mã chức danh (tuỳ chọn)</label>
              <Input value={posForm.code} onChange={(e) => setPosForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="GDV_PGD_VAN_LAM" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPosDialogOpen(false)}>Huỷ</Button>
            <Button onClick={savePos} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : (editingPos ? <Pencil className="w-3.5 h-3.5 mr-1" /> : <Plus className="w-4 h-4 mr-1" />)}
              {editingPos ? 'Lưu thay đổi' : 'Thêm chức danh'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog sao chép chức danh vào phòng đang chọn */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sao chép chức danh vào {selectedDept?.name}</DialogTitle>
            <DialogDescription>
              Sao chép toàn bộ chức danh và cấu hình skill lõi từ phòng nguồn. Chức danh trùng tên với chức danh đã có sẽ được bỏ qua.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-[11px] text-muted-foreground font-medium">Phòng nguồn</label>
            <Select value={copySourceId} onValueChange={setCopySourceId}>
              <SelectTrigger><SelectValue placeholder="Chọn phòng nguồn" /></SelectTrigger>
              <SelectContent>
                {departments
                  .filter((d) => d.id !== selectedDeptId && (positionCountByDept.get(d.id) || 0) > 0)
                  .map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({positionCountByDept.get(d.id)} chức danh)
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>Huỷ</Button>
            <Button onClick={runCopyIntoSelected} disabled={busy || !copySourceId}>
              {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              Sao chép
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
