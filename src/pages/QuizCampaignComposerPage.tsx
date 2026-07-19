import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, EyeOff, Loader2, Plus, Send, Shuffle } from 'lucide-react';
import { toast } from 'sonner';
import {
  DraftQuestion, QuestionListEditor, emptyQuestion, validateQuestions,
} from '@/components/quizzi/QuestionListEditor';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Nháp', pending: 'Chờ BGĐ duyệt', approved: 'Đang chạy',
  rejected: 'Bị từ chối', closed: 'Đã đóng',
};

/**
 * Soạn chiến dịch quiz toàn chi nhánh — chỉ phòng nghiệp vụ trụ sở khởi tạo,
 * BẮT BUỘC Ban Giám đốc phê duyệt trước khi chạy. Cấu hình chống làm bài hộ
 * (bốc đề ngẫu nhiên mỗi người, đảo đáp án) và ẩn danh do người khởi tạo chọn.
 */
export default function QuizCampaignComposerPage() {
  const { id: editId } = useParams<{ id: string }>();
  const { profileId, departmentId } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceRef, setSourceRef] = useState('');
  const [skillId, setSkillId] = useState<string>('none');
  const [seconds, setSeconds] = useState(30);
  const [poolEnabled, setPoolEnabled] = useState(false);
  const [poolSize, setPoolSize] = useState(10);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [anonymousResults, setAnonymousResults] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('draft');
  const [rejectedReason, setRejectedReason] = useState<string | null>(null);
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [skills, setSkills] = useState<{ id: string; code: string | null; name: string }[]>([]);
  const [canInitiate, setCanInitiate] = useState<boolean | null>(null);
  const [hasAttempts, setHasAttempts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);

  const editable = !hasAttempts && (status === 'draft' || status === 'pending');
  const configEditable = !hasAttempts && status === 'draft';

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('skill_catalog').select('id, code, name')
        .eq('is_active', true).order('sort_order');
      setSkills(data || []);
    })();
  }, []);

  useEffect(() => {
    if (!departmentId) { setCanInitiate(false); return; }
    (async () => {
      const { data } = await supabase.from('quiz_campaign_initiator_depts')
        .select('department_id').eq('department_id', departmentId).maybeSingle();
      setCanInitiate(!!data);
    })();
  }, [departmentId]);

  const loadExisting = useCallback(async () => {
    if (!editId) return;
    const [cRes, qRes] = await Promise.all([
      supabase.from('quiz_campaigns').select('*').eq('id', editId).maybeSingle(),
      supabase.from('quiz_campaign_questions').select('*').eq('campaign_id', editId).order('sort_order'),
    ]);
    const c = cRes.data;
    if (!c) {
      toast.error('Không tìm thấy chiến dịch hoặc bạn không có quyền sửa');
      navigate('/quizzi/chien-dich');
      return;
    }
    setTitle(c.title);
    setDescription(c.description || '');
    setSourceRef(c.source_ref || '');
    setSkillId(c.skill_id || 'none');
    setSeconds(c.per_question_seconds);
    setPoolEnabled(c.question_pool_size != null);
    setPoolSize(c.question_pool_size ?? 10);
    setShuffleOptions(c.shuffle_options);
    setAnonymousResults(c.anonymous_results);
    setStartDate(c.start_date || '');
    setEndDate(c.end_date || '');
    setStatus(c.status);
    setRejectedReason(c.rejected_reason);
    setQuestions(
      (qRes.data || []).map((q: any) => ({
        id: q.id,
        statement: q.statement,
        options: (q.options as string[]) || ['', ''],
        correctIndex: q.correct_index,
        explanation: q.explanation || '',
      })),
    );
    // Người khởi tạo không SELECT được attempts của người khác (ẩn danh) —
    // dựa vào trạng thái: approved/closed coi như đã khoá đề.
    setHasAttempts(c.status === 'approved' || c.status === 'closed');
    setLoading(false);
  }, [editId, navigate]);

  useEffect(() => { loadExisting(); }, [loadExisting]);

  const save = async (submitForApproval: boolean): Promise<void> => {
    const err = !title.trim() ? 'Nhập tiêu đề chiến dịch' : validateQuestions(questions);
    if (err) { toast.error(err); return; }
    if (poolEnabled && (poolSize < 3 || poolSize > questions.length)) {
      toast.error(`Số câu mỗi đề phải từ 3 đến ${questions.length} (ngân hàng hiện có ${questions.length} câu)`);
      return;
    }
    if (!departmentId || !profileId) { toast.error('Tài khoản chưa gắn phòng'); return; }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        source_ref: sourceRef.trim() || null,
        skill_id: skillId === 'none' ? null : skillId,
        per_question_seconds: seconds,
        question_pool_size: poolEnabled ? poolSize : null,
        shuffle_options: shuffleOptions,
        anonymous_results: anonymousResults,
        start_date: startDate || null,
        end_date: endDate || null,
      };
      let campaignId = editId;
      if (editId) {
        const { error } = await supabase.from('quiz_campaigns').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('quiz_campaigns')
          .insert({ ...payload, department_id: departmentId }).select('id').single();
        if (error) throw error;
        campaignId = data.id;
      }

      if (editable || !editId) {
        if (editId) {
          const { error: delErr } = await supabase.from('quiz_campaign_questions')
            .delete().eq('campaign_id', campaignId!);
          if (delErr) throw delErr;
        }
        const { error: insErr } = await supabase.from('quiz_campaign_questions').insert(
          questions.map((q, i) => ({
            campaign_id: campaignId!,
            statement: q.statement.trim(),
            options: q.options.map((o) => o.trim()),
            correct_index: q.correctIndex,
            explanation: q.explanation.trim() || null,
            sort_order: i,
          })),
        );
        if (insErr) throw insErr;
      }

      if (submitForApproval) {
        const { error: subErr } = await supabase.from('quiz_campaigns')
          .update({ status: 'pending' }).eq('id', campaignId!);
        if (subErr) throw subErr;
        toast.success('Đã gửi Ban Giám đốc phê duyệt 📨');
      } else {
        toast.success(editId ? 'Đã lưu chiến dịch' : 'Đã lưu nháp chiến dịch');
      }
      navigate('/quizzi/chien-dich');
    } catch (e: any) {
      toast.error(e?.message || 'Không lưu được chiến dịch');
    } finally {
      setSaving(false);
    }
  };

  const withdraw = async () => {
    if (!editId) return;
    const { error } = await supabase.from('quiz_campaigns').update({ status: 'draft' }).eq('id', editId);
    if (error) { toast.error(error.message); return; }
    setStatus('draft');
    toast.success('Đã rút về nháp — bạn có thể sửa tiếp');
  };

  if (loading || canInitiate === null) {
    return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>;
  }

  if (!editId && !canInitiate) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Chỉ các phòng nghiệp vụ tại trụ sở chi nhánh (DVKH, KHDN, Bán lẻ,
            Hỗ trợ tín dụng, Tổ chức tổng hợp) khởi tạo được chiến dịch quiz toàn chi nhánh.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate('/quizzi/chien-dich')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Chiến dịch
        </Button>
        <h1 className="text-lg font-bold">{editId ? 'Sửa chiến dịch' : 'Tạo chiến dịch toàn chi nhánh'}</h1>
        {editId && <Badge variant={status === 'approved' ? 'default' : 'outline'}>{STATUS_LABELS[status] || status}</Badge>}
      </div>

      {status === 'rejected' && rejectedReason && (
        <Card className="border-red-300">
          <CardContent className="py-3 text-sm text-red-600">
            Ban Giám đốc từ chối: {rejectedReason}. Sửa nội dung rồi gửi duyệt lại.
          </CardContent>
        </Card>
      )}
      {status === 'pending' && (
        <Card className="border-amber-300">
          <CardContent className="py-3 text-sm text-amber-700 dark:text-amber-400 flex items-center justify-between gap-2 flex-wrap">
            <span>Đang chờ Ban Giám đốc phê duyệt — cấu hình đã khoá, muốn sửa hãy rút về nháp.</span>
            <Button size="sm" variant="outline" onClick={withdraw}>Rút về nháp</Button>
          </CardContent>
        </Card>
      )}
      {hasAttempts && (
        <Card className="border-amber-300">
          <CardContent className="py-3 text-sm text-amber-700 dark:text-amber-400">
            Chiến dịch đã duyệt/đang chạy — nội dung khoá để giữ công bằng.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Thông tin chung</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Tiêu đề *</Label>
            <Input value={title} disabled={!editable && !!editId} onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Chiến dịch Quý III — Nhận diện rủi ro gian lận" />
          </div>
          <div className="space-y-1.5">
            <Label>Mô tả</Label>
            <Textarea value={description} disabled={!editable && !!editId} rows={2}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mục tiêu, phạm vi áp dụng của chiến dịch" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nguồn (công văn / chủ điểm)</Label>
              <Input value={sourceRef} disabled={!editable && !!editId}
                onChange={(e) => setSourceRef(e.target.value)}
                placeholder="VD: CV 5678/TGĐ-NHCT9" />
            </div>
            <div className="space-y-1.5">
              <Label>Skill gắn kèm (tuỳ chọn)</Label>
              <Select value={skillId} onValueChange={setSkillId} disabled={!editable && !!editId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Không gắn skill —</SelectItem>
                  {skills.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.code ? `${s.code} · ` : ''}{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Thời gian mỗi câu</Label>
              <Select value={String(seconds)} onValueChange={(v) => setSeconds(Number(v))} disabled={!configEditable && !!editId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[15, 20, 30, 45, 60, 90, 120].map((s) => (
                    <SelectItem key={s} value={String(s)}>{s} giây</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Mở từ ngày (tuỳ chọn)</Label>
              <Input type="date" value={startDate} disabled={!configEditable && !!editId}
                onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Đến hết ngày (tuỳ chọn)</Label>
              <Input type="date" value={endDate} disabled={!configEditable && !!editId}
                onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Chống làm bài hộ & ẩn danh</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-1.5"><Shuffle className="w-4 h-4" /> Mỗi người một đề (bốc ngẫu nhiên)</Label>
              <p className="text-xs text-muted-foreground">
                Mỗi người bốc ngẫu nhiên N câu từ ngân hàng câu hỏi — hai người làm cạnh nhau
                sẽ nhận đề khác nhau. Tắt = mọi người làm toàn bộ (thứ tự câu vẫn đảo).
              </p>
            </div>
            <Switch checked={poolEnabled} disabled={!configEditable && !!editId} onCheckedChange={setPoolEnabled} />
          </div>
          {poolEnabled && (
            <div className="space-y-1.5 pl-6">
              <Label className="text-xs">Số câu mỗi đề (ngân hàng hiện có {questions.length} câu)</Label>
              <Input type="number" min={3} max={Math.max(questions.length, 3)} value={poolSize}
                disabled={!configEditable && !!editId}
                onChange={(e) => setPoolSize(Number(e.target.value))} className="w-28" />
            </div>
          )}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-1.5"><Shuffle className="w-4 h-4" /> Đảo thứ tự đáp án theo từng người</Label>
              <p className="text-xs text-muted-foreground">
                Phương án A/B/C/D hiển thị theo thứ tự khác nhau với mỗi người — nhìn bài nhau vô nghĩa.
              </p>
            </div>
            <Switch checked={shuffleOptions} disabled={!configEditable && !!editId} onCheckedChange={setShuffleOptions} />
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-1.5"><EyeOff className="w-4 h-4" /> Ẩn danh người làm bài</Label>
              <p className="text-xs text-muted-foreground">
                Bật: không ai (kể cả người khởi tạo) thấy tên người làm — chỉ số liệu tổng hợp
                và thống kê từng câu. Phù hợp khảo sát kiến thức trung thực.
              </p>
            </div>
            <Switch checked={anonymousResults} disabled={!configEditable && !!editId} onCheckedChange={setAnonymousResults} />
          </div>
        </CardContent>
      </Card>

      <QuestionListEditor questions={questions} onChange={setQuestions} disabled={!!editId && !editable} />

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button variant="outline" disabled={!!editId && !editable}
          onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}>
          <Plus className="w-4 h-4 mr-1" /> Thêm câu hỏi
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs text-muted-foreground">
            Ngân hàng {questions.length} câu{poolEnabled ? ` · mỗi đề ${poolSize} câu` : ''}
          </p>
          {(status === 'draft' || status === 'rejected' || !editId) && (
            <>
              <Button variant="outline" onClick={() => save(false)} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Lưu nháp
              </Button>
              <Button onClick={() => save(true)} disabled={saving}>
                <Send className="w-4 h-4 mr-1" /> Gửi BGĐ phê duyệt
              </Button>
            </>
          )}
          {status === 'approved' && (
            <Button variant="outline" onClick={async () => {
              const { error } = await supabase.from('quiz_campaigns').update({ status: 'closed' }).eq('id', editId!);
              if (error) { toast.error(error.message); return; }
              toast.success('Đã đóng chiến dịch');
              navigate('/quizzi/chien-dich');
            }}>Đóng chiến dịch</Button>
          )}
        </div>
      </div>
    </div>
  );
}
