// Tổng hợp nhu cầu đào tạo (/tong-hop-nhu-cau-dao-tao) — dành cho Phòng TCTH.
// Cán bộ đăng ký nhu cầu học khóa Trường ĐT từ phiếu tự đánh giá; màn này gom theo khóa
// để TCTH quyết cách tổ chức: tự tổ chức / đề nghị Trường tổ chức / ghi danh lớp Trường
// chuẩn bị mở — và đánh dấu đã tổ chức khi xong.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { GraduationCap, ChevronDown, ChevronUp, Users, Download, Target, Building2, Briefcase, Layers } from 'lucide-react';

const sb = supabase as any;

const PLAN_LABEL: Record<string, string> = {
  new: 'Chưa xử lý',
  tu_to_chuc: 'Chi nhánh tự tổ chức',
  de_nghi_truong: 'Đề nghị Trường tổ chức',
  lop_truong_mo: 'Ghi danh lớp Trường sắp mở',
  da_to_chuc: 'Đã tổ chức',
  khong_to_chuc: 'Không tổ chức',
};
const PLAN_TONE: Record<string, string> = {
  new: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  tu_to_chuc: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  de_nghi_truong: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  lop_truong_mo: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  da_to_chuc: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  khong_to_chuc: 'bg-muted text-muted-foreground',
};

interface Reg {
  id: string;
  course_id: string;
  created_at: string;
  profiles: { full_name: string; position: string | null; departments: { name: string } | null } | null;
  skill_catalog: { code: string | null; name: string } | null;
}
interface CourseRow {
  id: string; code: string; name: string; duration_days: number | null; format: string | null;
  competency_type: string | null;
}
interface Plan { course_id: string; status: string; note: string | null }

export default function TrainingNeedsPage() {
  const { isAdmin, profileId, loading: authLoading } = useAuth();
  const [regs, setRegs] = useState<Reg[]>([]);
  const [courses, setCourses] = useState<Record<string, CourseRow>>({});
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [regRes, planRes] = await Promise.all([
      sb.from('vtb_course_registrations')
        .select('id, course_id, created_at, profiles ( full_name, position, departments!profiles_department_id_fkey ( name ) ), skill_catalog ( code, name )')
        .order('created_at', { ascending: false }),
      sb.from('vtb_course_training_plans').select('course_id, status, note'),
    ]);
    const regRows: Reg[] = regRes.data || [];
    setRegs(regRows);
    const planMap: Record<string, Plan> = {};
    (planRes.data || []).forEach((p: Plan) => { planMap[p.course_id] = p; });
    setPlans(planMap);
    setNotes(Object.fromEntries(Object.values(planMap).map(p => [p.course_id, p.note || ''])));
    const courseIds = Array.from(new Set(regRows.map(r => r.course_id)));
    if (courseIds.length) {
      const { data: courseRows } = await sb.from('vtb_courses')
        .select('id, code, name, duration_days, format, competency_type').in('id', courseIds);
      setCourses(Object.fromEntries((courseRows || []).map((c: CourseRow) => [c.id, c])));
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (!authLoading) load(); }, [authLoading, load]);

  const [deptFilter, setDeptFilter] = useState<string>('all');

  const deptNames = useMemo(
    () => Array.from(new Set(regs.map(r => r.profiles?.departments?.name).filter(Boolean) as string[])).sort(),
    [regs],
  );
  // Bộ lọc phòng áp dụng cho MỌI chiều phân tích
  const filteredRegs = useMemo(
    () => deptFilter === 'all' ? regs : regs.filter(r => r.profiles?.departments?.name === deptFilter),
    [regs, deptFilter],
  );

  const byCourse = useMemo(() => {
    const map = new Map<string, Reg[]>();
    filteredRegs.forEach(r => map.set(r.course_id, [...(map.get(r.course_id) || []), r]));
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filteredRegs]);

  // Gom đa chiều: key → { count, people(distinct), courses } — dùng chung cho các tab phân tích
  const aggregate = (keyOf: (r: Reg) => string | null) => {
    const map = new Map<string, { count: number; people: Set<string>; courses: Map<string, number> }>();
    filteredRegs.forEach(r => {
      const key = keyOf(r);
      if (!key) return;
      const e = map.get(key) || { count: 0, people: new Set<string>(), courses: new Map<string, number>() };
      e.count++;
      if (r.profiles?.full_name) e.people.add(r.profiles.full_name);
      e.courses.set(r.course_id, (e.courses.get(r.course_id) || 0) + 1);
      map.set(key, e);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count);
  };
  const bySkill = useMemo(() => aggregate(r => r.skill_catalog ? `${r.skill_catalog.code} · ${r.skill_catalog.name}` : 'Không gắn skill'), [filteredRegs]);
  const byDept = useMemo(() => aggregate(r => r.profiles?.departments?.name || 'Chưa có phòng'), [filteredRegs]);
  const byPosition = useMemo(() => aggregate(r => r.profiles?.position || 'Chưa có vị trí'), [filteredRegs]);
  const byCompetency = useMemo(() => aggregate(r => courses[r.course_id]?.competency_type || 'Chưa phân nhóm'), [filteredRegs, courses]);

  const stats = useMemo(() => ({
    total: filteredRegs.length,
    people: new Set(filteredRegs.map(r => r.profiles?.full_name).filter(Boolean)).size,
    coursesCount: new Set(filteredRegs.map(r => r.course_id)).size,
    pending: byCourse.filter(([cid]) => (plans[cid]?.status || 'new') === 'new').length,
  }), [filteredRegs, byCourse, plans]);

  const savePlan = async (courseId: string, status: string) => {
    const { error } = await sb.from('vtb_course_training_plans').upsert({
      course_id: courseId, status, note: notes[courseId]?.trim() || null,
      updated_by: profileId, updated_at: new Date().toISOString(),
    });
    if (error) { toast.error('Lỗi lưu: ' + error.message); return; }
    setPlans(prev => ({ ...prev, [courseId]: { course_id: courseId, status, note: notes[courseId] || null } }));
    toast.success('Đã lưu phương án tổ chức');
  };

  const exportCsv = () => {
    const lines = [['Mã khóa', 'Tên khóa', 'Cán bộ', 'Phòng', 'Vị trí', 'Skill liên quan', 'Ngày đăng ký', 'Phương án tổ chức'].join(';')];
    byCourse.forEach(([cid, list]) => {
      const c = courses[cid];
      list.forEach(r => lines.push([
        c?.code || '', `"${c?.name || ''}"`, r.profiles?.full_name || '',
        r.profiles?.departments?.name || '', r.profiles?.position || '',
        r.skill_catalog ? `${r.skill_catalog.code} ${r.skill_catalog.name}` : '',
        new Date(r.created_at).toLocaleDateString('vi-VN'),
        PLAN_LABEL[plans[cid]?.status || 'new'],
      ].join(';')));
    });
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tong-hop-nhu-cau-dao-tao.csv';
    a.click();
  };

  // Một tab phân tích: hàng xếp hạng theo lượt đăng ký, kèm thanh tỷ trọng và các khóa liên quan
  const renderDimension = (rows: ReturnType<typeof aggregate>, emptyLabel: string) => {
    if (!rows.length) return <Card><CardContent className="py-8 text-center text-muted-foreground">{emptyLabel}</CardContent></Card>;
    const max = rows[0][1].count;
    return (
      <Card>
        <CardContent className="pt-4 divide-y">
          {rows.map(([key, e]) => (
            <div key={key} className="py-2.5 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium flex-1 min-w-0">{key}</span>
                <Badge variant="secondary" className="text-[11px]">{e.count} lượt</Badge>
                <span className="text-xs text-muted-foreground"><Users className="w-3 h-3 inline mr-0.5" />{e.people.size} cán bộ</span>
              </div>
              <div className="h-1.5 rounded bg-muted overflow-hidden">
                <div className="h-full rounded bg-primary" style={{ width: `${Math.max(4, Math.round(e.count / max * 100))}%` }} />
              </div>
              <div className="flex flex-wrap gap-1">
                {Array.from(e.courses.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([cid, n]) => (
                    <Badge key={cid} variant="outline" className="text-[10px] font-normal">
                      {courses[cid]?.code} {courses[cid]?.name}{n > 1 ? ` ×${n}` : ''}
                    </Badge>
                  ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  if (authLoading || loading) return <div className="p-6 text-muted-foreground">Đang tải…</div>;
  if (!isAdmin) return <div className="p-6 text-muted-foreground">Chỉ TCTH/Ban Giám đốc truy cập màn hình này.</div>;

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" /> Tổng hợp nhu cầu đào tạo
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cán bộ đăng ký nhu cầu từ gợi ý khóa học trong phiếu tự đánh giá. TCTH chọn phương án:
            chi nhánh tự tổ chức, đề nghị Trường ĐT tổ chức, hoặc ghi danh lớp Trường chuẩn bị mở.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="h-9 w-[210px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả phòng ban</SelectItem>
              {deptNames.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!byCourse.length}>
            <Download className="w-4 h-4 mr-1" /> Xuất CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Lượt đăng ký', value: stats.total },
          { label: 'Cán bộ có nhu cầu', value: stats.people },
          { label: 'Khóa có nhu cầu', value: stats.coursesCount },
          { label: 'Khóa chưa xử lý', value: stats.pending, tone: stats.pending > 0 ? 'text-amber-600 dark:text-amber-400' : '' },
        ].map(t => (
          <Card key={t.label}>
            <CardContent className="py-3 px-4">
              <div className={`text-2xl font-bold ${t.tone || ''}`}>{t.value}</div>
              <div className="text-xs text-muted-foreground">{t.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="courses">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="courses" className="text-xs sm:text-sm"><GraduationCap className="w-3.5 h-3.5 mr-1" /> Theo khóa học</TabsTrigger>
          <TabsTrigger value="skills" className="text-xs sm:text-sm"><Target className="w-3.5 h-3.5 mr-1" /> Theo skill</TabsTrigger>
          <TabsTrigger value="depts" className="text-xs sm:text-sm"><Building2 className="w-3.5 h-3.5 mr-1" /> Theo phòng ban</TabsTrigger>
          <TabsTrigger value="positions" className="text-xs sm:text-sm"><Briefcase className="w-3.5 h-3.5 mr-1" /> Theo vị trí</TabsTrigger>
          <TabsTrigger value="competency" className="text-xs sm:text-sm"><Layers className="w-3.5 h-3.5 mr-1" /> Theo nhóm năng lực</TabsTrigger>
        </TabsList>

        <TabsContent value="skills" className="mt-3">
          {renderDimension(bySkill, 'Chưa có dữ liệu skill.')}
        </TabsContent>
        <TabsContent value="depts" className="mt-3">
          {renderDimension(byDept, 'Chưa có dữ liệu phòng ban.')}
        </TabsContent>
        <TabsContent value="positions" className="mt-3">
          {renderDimension(byPosition, 'Chưa có dữ liệu vị trí.')}
        </TabsContent>
        <TabsContent value="competency" className="mt-3">
          {renderDimension(byCompetency, 'Chưa có dữ liệu nhóm năng lực.')}
        </TabsContent>

        <TabsContent value="courses" className="mt-3 space-y-3">
      {byCourse.length === 0 && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          Chưa có cán bộ nào đăng ký nhu cầu học.
        </CardContent></Card>
      )}

      {byCourse.map(([cid, list]) => {
        const c = courses[cid];
        const plan = plans[cid]?.status || 'new';
        return (
          <Card key={cid}>
            <CardHeader className="pb-2 cursor-pointer" onClick={() => setOpen(p => ({ ...p, [cid]: !p[cid] }))}>
              <CardTitle className="text-sm flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground text-xs">#{c?.code}</span>
                <span className="flex-1 min-w-0">{c?.name || '—'}</span>
                <Badge variant="secondary" className="text-[11px]">
                  <Users className="w-3 h-3 mr-1" /> {list.length} cán bộ
                </Badge>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${PLAN_TONE[plan]}`}>{PLAN_LABEL[plan]}</span>
                {open[cid] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </CardTitle>
            </CardHeader>
            {open[cid] && (
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  {c?.duration_days != null && <Badge variant="outline" className="mr-1 text-[10px]">{c.duration_days} ngày</Badge>}
                  {c?.format && <Badge variant="outline" className="text-[10px]">{c.format}</Badge>}
                </div>
                <div className="rounded border divide-y">
                  {list.map(r => (
                    <div key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-1.5 text-sm">
                      <span className="font-medium">{r.profiles?.full_name || '—'}</span>
                      <span className="text-xs text-muted-foreground">{r.profiles?.departments?.name}</span>
                      <span className="text-xs text-muted-foreground">{r.profiles?.position}</span>
                      {r.skill_catalog && (
                        <Badge variant="secondary" className="text-[10px]">{r.skill_catalog.code} · {r.skill_catalog.name}</Badge>
                      )}
                      <span className="text-[11px] text-muted-foreground ml-auto">
                        {new Date(r.created_at).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="grid sm:grid-cols-[220px_1fr_auto] gap-2 items-start">
                  <Select value={plan} onValueChange={(v) => savePlan(cid, v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PLAN_LABEL).map(([k, label]) => (
                        <SelectItem key={k} value={k}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea rows={1} placeholder="Ghi chú tổ chức (thời gian dự kiến, giảng viên, lớp của Trường…)"
                            value={notes[cid] || ''}
                            onChange={e => setNotes(p => ({ ...p, [cid]: e.target.value }))} />
                  <Button size="sm" variant="outline" onClick={() => savePlan(cid, plan)}>Lưu ghi chú</Button>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
