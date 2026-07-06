import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Mail, MailCheck, Newspaper, Send } from 'lucide-react';
import { toast } from 'sonner';
import { filterQuarterCycles, pickDefaultCycle, type QuarterCycleOption } from '@/lib/evaluationCycles';
import { effectiveLevel } from '@/lib/skillInsights';
import { BrandMascotAI } from '@/components/branding/BrandAssets';

interface ProfileRow {
  id: string;
  full_name: string;
  email: string | null;
  personal_email: string | null;
  department_id: string | null;
}

type LetterState = {
  status: 'idle' | 'generating' | 'ready' | 'sending' | 'sent' | 'error' | 'skipped';
  text: string;
  note?: string;
};

async function latestFormId(profileId: string, cycleId: string): Promise<string | null> {
  const { data } = await supabase
    .from('form_submissions')
    .select('id, updated_at')
    .eq('employee_id', profileId)
    .eq('cycle_id', cycleId)
    .order('updated_at', { ascending: false })
    .limit(1);
  return data?.[0]?.id || null;
}

export default function QuarterlyNewsletterPage() {
  const [loading, setLoading] = useState(true);
  const [cycles, setCycles] = useState<QuarterCycleOption[]>([]);
  const [cycleId, setCycleId] = useState('');
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [deptMap, setDeptMap] = useState<Map<string, string>>(new Map());
  const [skillMap, setSkillMap] = useState<Map<string, string>>(new Map());
  const [letters, setLetters] = useState<Record<string, LetterState>>({});
  const [bulkRunning, setBulkRunning] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [cyclesRes, profilesRes, deptsRes, skillsRes] = await Promise.all([
        supabase.from('evaluation_cycles').select('id, name').eq('cycle_type', 'quarterly').order('start_date'),
        supabase.from('profiles').select('id, full_name, email, personal_email, department_id').eq('status', 'active').order('full_name'),
        supabase.from('departments').select('id, name').eq('is_active', true),
        supabase.from('skill_catalog').select('id, code, name').eq('is_active', true),
      ]);
      const qs = filterQuarterCycles(cyclesRes.data || []);
      setCycles(qs);
      setProfiles((profilesRes.data || []) as ProfileRow[]);
      setDeptMap(new Map((deptsRes.data || []).map((d) => [d.id, d.name])));
      setSkillMap(new Map((skillsRes.data || []).map((s) => [s.id, `${s.code ? `${s.code} · ` : ''}${s.name}`])));
      setCycleId((prev) => prev || pickDefaultCycle(qs)?.id || '');
      setLoading(false);
    })();
  }, []);

  const prevCycleId = useMemo(() => {
    const idx = cycles.findIndex((c) => c.id === cycleId);
    return idx > 0 ? cycles[idx - 1].id : null;
  }, [cycles, cycleId]);

  const cycleName = cycles.find((c) => c.id === cycleId)?.name || '';

  const setLetter = (profileId: string, patch: Partial<LetterState>) =>
    setLetters((prev) => ({ ...prev, [profileId]: { status: 'idle', text: '', ...prev[profileId], ...patch } }));

  const buildPayload = async (profileId: string) => {
    const [formId, prevFormId] = await Promise.all([
      latestFormId(profileId, cycleId),
      prevCycleId ? latestFormId(profileId, prevCycleId) : Promise.resolve(null),
    ]);
    const loadRows = async (fid: string) => {
      const { data } = await supabase
        .from('skill_assessments')
        .select('skill_id, is_core, required_level, self_assessed_level, manager_assessed_level, self_l0, manager_l0')
        .eq('form_id', fid);
      return data || [];
    };
    const curRows = formId ? await loadRows(formId) : [];
    const prevRows = prevFormId ? await loadRows(prevFormId) : [];
    const prevLevels = new Map(prevRows.map((r) => [r.skill_id, effectiveLevel(r)]));

    const levelUps: { skill: string; from: number; to: number }[] = [];
    let coreMet = 0; let coreTotal = 0;
    const gaps: { skill: string; level: number; required: number }[] = [];
    curRows.forEach((r) => {
      const lv = effectiveLevel(r);
      const prev = prevLevels.get(r.skill_id);
      if (lv != null && prev != null && lv > prev) {
        levelUps.push({ skill: skillMap.get(r.skill_id) || 'kỹ năng', from: prev, to: lv });
      }
      if (r.is_core && r.required_level != null && lv != null) {
        coreTotal++;
        if (lv >= r.required_level) coreMet++;
        else gaps.push({ skill: skillMap.get(r.skill_id) || 'kỹ năng', level: lv, required: r.required_level });
      }
    });

    let idp: unknown[] = [];
    if (formId) {
      const { data } = await supabase
        .from('form_skill_priorities')
        .select('skill_id, current_level, target_level, reason_text')
        .eq('form_id', formId);
      idp = (data || []).map((p) => ({
        skill: skillMap.get(p.skill_id) || 'kỹ năng',
        current_level: p.current_level,
        target_level: p.target_level,
        reason: p.reason_text,
      }));
    }

    return {
      cycle: cycleName,
      has_submission: !!formId,
      level_ups: levelUps,
      core_met: coreMet,
      core_total: coreTotal,
      top_gaps: gaps.sort((a, b) => (b.required - b.level) - (a.required - a.level)).slice(0, 3),
      idp_priorities: idp,
    };
  };

  const generateLetter = async (p: ProfileRow): Promise<boolean> => {
    setLetter(p.id, { status: 'generating', note: undefined });
    try {
      const payload = await buildPayload(p.id);
      if (!payload.has_submission) {
        setLetter(p.id, { status: 'skipped', note: 'Chưa có phiếu đánh giá trong kỳ' });
        return false;
      }
      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: { mode: 'quarterly_letter', payload },
      });
      if (error) throw error;
      const text = (data as { text?: string })?.text || '';
      if (!text) throw new Error('AI không trả về nội dung');
      setLetter(p.id, { status: 'ready', text });
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLetter(p.id, { status: 'error', note: msg });
      if (msg.includes('429')) throw new Error('rate_limited');
      return false;
    }
  };

  const sendLetter = async (p: ProfileRow): Promise<boolean> => {
    const st = letters[p.id];
    if (!st?.text.trim()) return false;
    setLetter(p.id, { status: 'sending' });
    try {
      const { data, error } = await supabase.functions.invoke('send-hr-notification', {
        body: {
          kind: 'quarterly_letter',
          recipient_profile_id: p.id,
          cycle_name: cycleName,
          letter_markdown: st.text,
        },
      });
      if (error) throw error;
      const res = data as { success?: boolean; skipped?: string; error?: string };
      if (res?.success) {
        setLetter(p.id, { status: 'sent', note: undefined });
        return true;
      }
      const reason = res?.skipped === 'duplicate' ? 'Đã gửi thư kỳ này trước đó'
        : res?.skipped === 'no_email' ? 'Cán bộ chưa có email'
        : res?.skipped === 'suppressed' ? 'Email đã từ chối nhận thư'
        : res?.error || 'Không gửi được';
      setLetter(p.id, { status: 'skipped', note: reason });
      return false;
    } catch (e) {
      setLetter(p.id, { status: 'error', note: e instanceof Error ? e.message : String(e) });
      return false;
    }
  };

  const bulkGenerateAndSend = async () => {
    setBulkRunning(true);
    let sent = 0; let skipped = 0; let failed = 0;
    try {
      for (const p of profiles) {
        if (!(p.email || p.personal_email)) { skipped++; continue; }
        const cur = letters[p.id];
        if (cur?.status === 'sent') { skipped++; continue; }
        try {
          const ok = cur?.status === 'ready' && cur.text.trim() ? true : await generateLetter(p);
          if (!ok) { skipped++; continue; }
          const delivered = await sendLetter(p);
          if (delivered) sent++; else skipped++;
        } catch (e) {
          if (e instanceof Error && e.message === 'rate_limited') {
            toast.warning(`Chạm giới hạn AI (40 lượt/giờ) — đã gửi ${sent} thư, hãy chạy tiếp sau 1 giờ.`);
            return;
          }
          failed++;
        }
      }
      toast.success(`Hoàn tất: ${sent} thư đã vào hàng đợi gửi, ${skipped} bỏ qua${failed ? `, ${failed} lỗi` : ''}.`);
    } finally {
      setBulkRunning(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>;
  }

  const withEmail = profiles.filter((p) => p.email || p.personal_email);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-primary" /> Bản tin phát triển cá nhân cuối kỳ
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI viết thư tổng kết riêng cho từng cán bộ (kỹ năng đã lên level, tiến bộ so với chính mình,
            trọng tâm quý tới) — bạn duyệt/sửa nội dung rồi gửi qua email. Mỗi cán bộ chỉ nhận 1 thư/kỳ.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={cycleId} onValueChange={(v) => { setCycleId(v); setLetters({}); }}>
            <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Kỳ" /></SelectTrigger>
            <SelectContent>{cycles.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" disabled={bulkRunning || !cycleId}>
                {bulkRunning ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
                Tạo & gửi tất cả
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Gửi bản tin {cycleName} cho toàn bộ cán bộ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Hệ thống sẽ lần lượt tạo thư bằng AI và gửi email cho {withEmail.length} cán bộ có email
                  (bỏ qua người chưa có phiếu trong kỳ hoặc đã nhận thư kỳ này). Lưu ý giới hạn AI 40 lượt/giờ —
                  với danh sách dài có thể phải chạy thành nhiều đợt.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction onClick={bulkGenerateAndSend}>Bắt đầu gửi</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Danh sách cán bộ <span className="font-normal text-muted-foreground">— {withEmail.length}/{profiles.length} người có email</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {profiles.map((p) => {
            const st = letters[p.id] || { status: 'idle' as const, text: '' };
            const email = p.email || p.personal_email;
            const isOpen = openId === p.id;
            return (
              <div key={p.id} className="rounded-lg border border-border">
                <div className="flex items-center justify-between gap-2 px-3 py-2 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{p.full_name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {(p.department_id && deptMap.get(p.department_id)) || 'Chưa gán phòng'} · {email || 'chưa có email'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {st.status === 'sent' && <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"><MailCheck className="w-3 h-3 mr-1" />Đã vào hàng đợi gửi</Badge>}
                    {st.status === 'skipped' && <Badge variant="outline" className="text-[10px]">{st.note || 'Bỏ qua'}</Badge>}
                    {st.status === 'error' && <Badge variant="outline" className="text-[10px] border-red-300 text-red-700">Lỗi: {st.note?.slice(0, 60)}</Badge>}
                    <Button
                      size="sm" variant="outline" className="h-7 text-xs"
                      disabled={st.status === 'generating' || st.status === 'sending' || bulkRunning}
                      onClick={async () => {
                        setOpenId(p.id);
                        try { await generateLetter(p); } catch { /* rate limit đã báo qua state */ }
                      }}
                    >
                      {st.status === 'generating' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <BrandMascotAI className="w-3.5 h-3.5 mr-1" />}
                      {st.text ? 'Tạo lại thư' : 'Tạo thư AI'}
                    </Button>
                    {st.status === 'ready' && st.text.trim() && email && (
                      <Button
                        size="sm" className="h-7 text-xs"
                        disabled={bulkRunning}
                        onClick={async () => {
                          const ok = await sendLetter(p);
                          if (ok) toast.success(`Đã đưa thư cho ${p.full_name} vào hàng đợi gửi`);
                        }}
                      >
                        <Mail className="w-3 h-3 mr-1" /> Gửi email
                      </Button>
                    )}
                  </div>
                </div>
                {isOpen && st.text && (
                  <div className="border-t border-border p-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-1">Nội dung thư (sửa được trước khi gửi)</div>
                      <Textarea
                        value={st.text}
                        onChange={(e) => setLetter(p.id, { text: e.target.value, status: 'ready' })}
                        className="min-h-[220px] text-xs font-mono"
                      />
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-1">Xem trước</div>
                      <div className="rounded-md border border-border bg-muted/20 p-3 text-xs prose prose-xs max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 max-h-[240px] overflow-y-auto">
                        <ReactMarkdown>{st.text}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {profiles.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">Không có cán bộ active.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
