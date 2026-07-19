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
import { toast } from 'sonner';
import { GraduationCap, ChevronDown, ChevronUp, Users, Download } from 'lucide-react';

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
        .select('id, code, name, duration_days, format').in('id', courseIds);
      setCourses(Object.fromEntries((courseRows || []).map((c: CourseRow) => [c.id, c])));
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (!authLoading) load(); }, [authLoading, load]);

  const byCourse = useMemo(() => {
    const map = new Map<string, Reg[]>();
    regs.forEach(r => map.set(r.course_id, [...(map.get(r.course_id) || []), r]));
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [regs]);

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
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!byCourse.length}>
          <Download className="w-4 h-4 mr-1" /> Xuất CSV
        </Button>
      </div>

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
    </div>
  );
}
