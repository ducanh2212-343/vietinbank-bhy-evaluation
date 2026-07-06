import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { GitBranch, Loader2, Save, Search, Users, AlertTriangle, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  isBgd, isBranchDirector, isDepartmentHeadPosition, type ProfileLite,
} from '@/lib/reportingLine';

interface StaffRow {
  id: string;
  full_name: string;
  employee_code: string | null;
  position: string | null;
  position_id: string | null;
  department_id: string | null;
  status: string | null;
  manager_id: string | null;
  pgd_id: string | null;
  director_id: string | null;
}

const NONE = '__none__';

export default function EvaluatorAssignmentPage() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [deptMap, setDeptMap] = useState<Map<string, string>>(new Map());
  const [posNameMap, setPosNameMap] = useState<Map<string, string>>(new Map());
  const [edits, setEdits] = useState<Record<string, { manager_id: string | null; pgd_id: string | null; director_id: string | null }>>({});

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [staffRes, deptRes, posRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, employee_code, position, position_id, department_id, status, manager_id, pgd_id, director_id')
        .eq('status', 'active')
        .order('full_name'),
      supabase.from('departments').select('id, name').eq('is_active', true).order('name'),
      supabase.from('positions').select('id, name').eq('is_active', true),
    ]);
    if (staffRes.error) { toast.error('Lỗi tải dữ liệu: ' + staffRes.error.message); setLoading(false); return; }
    const rows = (staffRes.data || []) as StaffRow[];
    setStaff(rows);
    setDeptMap(new Map((deptRes.data || []).map((d) => [d.id, d.name])));
    setPosNameMap(new Map((posRes.data || []).map((p) => [p.id, p.name])));
    const e: Record<string, { manager_id: string | null; pgd_id: string | null; director_id: string | null }> = {};
    rows.forEach((r) => { e[r.id] = { manager_id: r.manager_id, pgd_id: r.pgd_id, director_id: r.director_id }; });
    setEdits(e);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const asProfileLite = (r: StaffRow): ProfileLite => ({
    id: r.id, full_name: r.full_name, position: posNameMap.get(r.position_id || '') || r.position, department_id: r.department_id, status: r.status,
  });

  const posNameOf = (r: StaffRow) => posNameMap.get(r.position_id || '') || r.position || '';

  // Danh sách người đánh giá theo từng cấp
  const bgdOptions = useMemo(() => staff.filter((r) => isBgd(asProfileLite(r))), [staff, posNameMap]);
  const branchDirectors = useMemo(() => staff.filter((r) => isBranchDirector(asProfileLite(r))), [staff, posNameMap]);
  const managersByDept = useMemo(() => {
    const m = new Map<string, StaffRow[]>();
    staff.forEach((r) => {
      if (r.department_id && isDepartmentHeadPosition(posNameOf(r))) {
        m.set(r.department_id, [...(m.get(r.department_id) || []), r]);
      }
    });
    return m;
  }, [staff, posNameMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff
      .filter((r) => deptFilter === 'all' || r.department_id === deptFilter)
      .filter((r) => !q || r.full_name.toLowerCase().includes(q) || (r.employee_code || '').toLowerCase().includes(q))
      .sort((a, b) =>
        (deptMap.get(a.department_id || '') || '').localeCompare(deptMap.get(b.department_id || '') || '', 'vi') ||
        a.full_name.localeCompare(b.full_name, 'vi'));
  }, [staff, deptFilter, search, deptMap]);

  const nameById = (id: string | null) => (id ? staff.find((s) => s.id === id)?.full_name || '—' : '—');

  const isDirty = (r: StaffRow) => {
    const e = edits[r.id];
    return e && (e.manager_id !== r.manager_id || e.pgd_id !== r.pgd_id || e.director_id !== r.director_id);
  };

  const setEdit = (id: string, patch: Partial<{ manager_id: string | null; pgd_id: string | null; director_id: string | null }>) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const saveRow = async (r: StaffRow) => {
    const e = edits[r.id];
    if (!e) return;
    setSavingId(r.id);
    const { error } = await supabase
      .from('profiles')
      .update({ manager_id: e.manager_id, pgd_id: e.pgd_id, director_id: e.director_id })
      .eq('id', r.id);
    setSavingId(null);
    if (error) { toast.error('Lỗi lưu: ' + error.message); return; }
    toast.success(`Đã lưu phân công cho ${r.full_name}`);
    await load();
  };

  const saveAllDirty = async () => {
    const dirtyRows = filtered.filter(isDirty);
    if (!dirtyRows.length) { toast.info('Không có thay đổi để lưu'); return; }
    setSavingId('__all__');
    try {
      for (const r of dirtyRows) {
        const e = edits[r.id];
        const { error } = await supabase
          .from('profiles')
          .update({ manager_id: e.manager_id, pgd_id: e.pgd_id, director_id: e.director_id })
          .eq('id', r.id);
        if (error) throw error;
      }
      toast.success(`Đã lưu ${dirtyRows.length} phân công`);
      await load();
    } catch (err) {
      toast.error('Lỗi lưu hàng loạt: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSavingId(null);
    }
  };

  const dirtyCount = filtered.filter(isDirty).length;

  if (!isAdmin) {
    return <div className="p-6 text-sm text-muted-foreground">Trang này dành cho Giám đốc và TCTH Admin.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" /> Phân công người đánh giá các cấp
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Chỉ định người đánh giá từng cấp cho mỗi cán bộ: <strong>Quản lý trực tiếp</strong> (Trưởng phòng),
            <strong> Phó Giám đốc phụ trách</strong> và <strong>Giám đốc phụ trách</strong>. Luồng duyệt phiếu và người đánh giá mặc định trong
            "Tự đánh giá" sẽ theo phân công này.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
            <Wand2 className="w-4 h-4 mr-1" /> Gán hàng loạt
          </Button>
          <Button size="sm" onClick={saveAllDirty} disabled={savingId === '__all__' || dirtyCount === 0}>
            {savingId === '__all__' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Lưu tất cả{dirtyCount ? ` (${dirtyCount})` : ''}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên / mã CB" className="h-9 pl-8 w-56" />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Phòng ban" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả phòng ban</SelectItem>
            {[...deptMap.entries()].map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-[11px]"><Users className="w-3 h-3 mr-1" /> {filtered.length} cán bộ</Badge>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[1080px]">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b bg-muted/30">
                  <th className="py-2.5 px-3 font-medium">Cán bộ</th>
                  <th className="py-2.5 px-3 font-medium">Phòng ban</th>
                  <th className="py-2.5 px-3 font-medium">Quản lý trực tiếp (TP)</th>
                  <th className="py-2.5 px-3 font-medium">PGĐ phụ trách</th>
                  <th className="py-2.5 px-3 font-medium">Giám đốc phụ trách</th>
                  <th className="py-2.5 px-3 font-medium text-right">Lưu</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const e = edits[r.id] || { manager_id: r.manager_id, pgd_id: r.pgd_id, director_id: r.director_id };
                  const headPos = isDepartmentHeadPosition(posNameOf(r));
                  const isDir = isBranchDirector(asProfileLite(r));
                  const mgrOptions = r.department_id ? (managersByDept.get(r.department_id) || []).filter((m) => m.id !== r.id) : [];
                  const dirty = isDirty(r);
                  return (
                    <tr key={r.id} className={`border-b last:border-0 ${dirty ? 'bg-amber-50/60' : 'hover:bg-muted/30'}`}>
                      <td className="py-2 px-3">
                        <div className="font-medium">{r.full_name}</div>
                        <div className="text-[11px] text-muted-foreground">{posNameOf(r) || '—'}{r.employee_code ? ` · ${r.employee_code}` : ''}</div>
                      </td>
                      <td className="py-2 px-3 text-xs">{r.department_id ? deptMap.get(r.department_id) || '—' : '—'}</td>

                      <td className="py-2 px-3">
                        {headPos || isDir ? (
                          <span className="text-[11px] text-muted-foreground italic">Không áp dụng (lãnh đạo phòng/CN)</span>
                        ) : (
                          <Select value={e.manager_id || NONE} onValueChange={(v) => setEdit(r.id, { manager_id: v === NONE ? null : v })}>
                            <SelectTrigger className="h-8 text-xs min-w-[190px]"><SelectValue placeholder="— Chưa gán —" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>— Chưa gán —</SelectItem>
                              {mgrOptions.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                              {e.manager_id && !mgrOptions.some((m) => m.id === e.manager_id) && (
                                <SelectItem value={e.manager_id}>{nameById(e.manager_id)} (ngoài phòng)</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </td>

                      <td className="py-2 px-3">
                        {isDir ? (
                          <span className="text-[11px] text-muted-foreground italic">Không áp dụng</span>
                        ) : (
                          <Select value={e.pgd_id || NONE} onValueChange={(v) => setEdit(r.id, { pgd_id: v === NONE ? null : v })}>
                            <SelectTrigger className="h-8 text-xs min-w-[190px]"><SelectValue placeholder="— Chưa gán —" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>— Chưa gán —</SelectItem>
                              {bgdOptions.filter((m) => m.id !== r.id).map((m) => (
                                <SelectItem key={m.id} value={m.id}>{m.full_name} — {posNameOf(m)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </td>

                      <td className="py-2 px-3">
                        <Select value={e.director_id || NONE} onValueChange={(v) => setEdit(r.id, { director_id: v === NONE ? null : v })}>
                          <SelectTrigger className="h-8 text-xs min-w-[170px]"><SelectValue placeholder="— Chưa gán —" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>— Chưa gán —</SelectItem>
                            {branchDirectors.filter((m) => m.id !== r.id).map((m) => (
                              <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>

                      <td className="py-2 px-3 text-right">
                        <Button size="sm" variant={dirty ? 'default' : 'ghost'} className="h-8 px-2" disabled={!dirty || savingId === r.id} onClick={() => saveRow(r)}>
                          {savingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-center text-xs text-muted-foreground">Không có cán bộ khớp bộ lọc.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <BulkAssignDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        scopeStaff={filtered}
        deptFilter={deptFilter}
        deptName={deptFilter === 'all' ? 'tất cả phòng đang lọc' : deptMap.get(deptFilter) || ''}
        bgdOptions={bgdOptions}
        branchDirectors={branchDirectors}
        posNameOf={posNameOf}
        onApply={(field, value) => {
          setEdits((prev) => {
            const next = { ...prev };
            filtered.forEach((r) => {
              // Cán bộ là Giám đốc/GĐCN không có cấp trên → bỏ qua
              if (isBranchDirector(asProfileLite(r))) return;
              next[r.id] = { ...next[r.id], [field]: value };
            });
            return next;
          });
          setBulkOpen(false);
          toast.success('Đã áp dụng — kiểm tra lại rồi bấm "Lưu tất cả"');
        }}
      />
    </div>
  );
}

function BulkAssignDialog({
  open, onOpenChange, scopeStaff, deptName, bgdOptions, branchDirectors, posNameOf, onApply,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  scopeStaff: StaffRow[];
  deptFilter: string;
  deptName: string;
  bgdOptions: StaffRow[];
  branchDirectors: StaffRow[];
  posNameOf: (r: StaffRow) => string;
  onApply: (field: 'pgd_id' | 'director_id', value: string | null) => void;
}) {
  const [field, setField] = useState<'pgd_id' | 'director_id'>('pgd_id');
  const [value, setValue] = useState<string>(NONE);
  const options = field === 'pgd_id' ? bgdOptions : branchDirectors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Gán người đánh giá hàng loạt</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Áp dụng cho <strong>{scopeStaff.length} cán bộ</strong> đang hiển thị ({deptName}). Cán bộ là lãnh đạo phòng/chi nhánh sẽ được bỏ qua ở cấp tương ứng.
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Cấp phân công</label>
            <Select value={field} onValueChange={(v) => { setField(v as 'pgd_id' | 'director_id'); setValue(NONE); }}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pgd_id">Phó Giám đốc phụ trách</SelectItem>
                <SelectItem value="director_id">Giám đốc phụ trách</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Người đánh giá</label>
            <Select value={value} onValueChange={setValue}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Chọn" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Bỏ gán (Chưa gán) —</SelectItem>
                {options.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name} — {posNameOf(m)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={() => onApply(field, value === NONE ? null : value)}>Áp dụng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
