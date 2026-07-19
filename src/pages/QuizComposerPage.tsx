import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface DraftQuestion {
  id?: string;
  statement: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const emptyQuestion = (): DraftQuestion => ({ statement: '', options: ['', ''], correctIndex: 0, explanation: '' });

/**
 * Soạn quiz cho phòng — bất kỳ thành viên phòng nào cũng tạo được, phát hành
 * ngay khi lưu. Khi quiz đã có người làm, câu hỏi bị khoá (server chặn) —
 * chỉ còn sửa được tiêu đề/mô tả hoặc gỡ xuất bản.
 */
export default function QuizComposerPage() {
  const { id: editId } = useParams<{ id: string }>();
  const { profileId, departmentId } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceRef, setSourceRef] = useState('');
  const [skillId, setSkillId] = useState<string>('none');
  const [seconds, setSeconds] = useState(30);
  const [status, setStatus] = useState<'published' | 'unpublished'>('published');
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [skills, setSkills] = useState<{ id: string; code: string | null; name: string }[]>([]);
  const [hasAttempts, setHasAttempts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('skill_catalog').select('id, code, name')
        .eq('is_active', true).order('sort_order');
      setSkills(data || []);
    })();
  }, []);

  const loadExisting = useCallback(async () => {
    if (!editId) return;
    const [quizRes, qRes, aRes] = await Promise.all([
      supabase.from('quizzes').select('*').eq('id', editId).maybeSingle(),
      supabase.from('quiz_questions').select('*').eq('quiz_id', editId).order('sort_order'),
      supabase.from('quiz_attempts').select('id', { count: 'exact', head: true }).eq('quiz_id', editId),
    ]);
    const quiz = quizRes.data;
    if (!quiz) {
      toast.error('Không tìm thấy quiz hoặc bạn không có quyền sửa');
      navigate('/quizzi');
      return;
    }
    setTitle(quiz.title);
    setDescription(quiz.description || '');
    setSourceRef(quiz.source_ref || '');
    setSkillId(quiz.skill_id || 'none');
    setSeconds(quiz.per_question_seconds);
    setStatus(quiz.status as 'published' | 'unpublished');
    setQuestions(
      (qRes.data || []).map((q: any) => ({
        id: q.id,
        statement: q.statement,
        options: (q.options as string[]) || ['', ''],
        correctIndex: q.correct_index,
        explanation: q.explanation || '',
      })),
    );
    setHasAttempts((aRes.count ?? 0) > 0);
    setLoading(false);
  }, [editId, navigate]);

  useEffect(() => { loadExisting(); }, [loadExisting]);

  const updateQuestion = (i: number, patch: Partial<DraftQuestion>) => {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  };

  const validate = (): string | null => {
    if (!title.trim()) return 'Nhập tiêu đề quiz';
    if (questions.length === 0) return 'Quiz cần ít nhất 1 câu hỏi';
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.statement.trim()) return `Câu ${i + 1}: chưa nhập nội dung`;
      const filled = q.options.map((o) => o.trim());
      if (filled.some((o) => !o)) return `Câu ${i + 1}: phương án còn trống`;
      if (filled.length < 2) return `Câu ${i + 1}: cần ít nhất 2 phương án`;
      if (q.correctIndex < 0 || q.correctIndex >= filled.length) return `Câu ${i + 1}: chưa chọn đáp án đúng`;
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    if (!departmentId || !profileId) { toast.error('Tài khoản chưa gắn phòng'); return; }
    setSaving(true);
    try {
      let quizId = editId;
      if (editId) {
        const { error } = await supabase.from('quizzes').update({
          title: title.trim(),
          description: description.trim() || null,
          source_ref: sourceRef.trim() || null,
          skill_id: skillId === 'none' ? null : skillId,
          per_question_seconds: seconds,
          status,
        }).eq('id', editId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('quizzes').insert({
          department_id: departmentId,
          title: title.trim(),
          description: description.trim() || null,
          source_ref: sourceRef.trim() || null,
          skill_id: skillId === 'none' ? null : skillId,
          per_question_seconds: seconds,
        }).select('id').single();
        if (error) throw error;
        quizId = data.id;
      }

      if (!hasAttempts && quizId) {
        // Ghi lại toàn bộ câu hỏi (xoá cũ, chèn mới theo thứ tự)
        if (editId) {
          const { error: delErr } = await supabase.from('quiz_questions').delete().eq('quiz_id', quizId);
          if (delErr) throw delErr;
        }
        const { error: insErr } = await supabase.from('quiz_questions').insert(
          questions.map((q, i) => ({
            quiz_id: quizId!,
            statement: q.statement.trim(),
            options: q.options.map((o) => o.trim()),
            correct_index: q.correctIndex,
            explanation: q.explanation.trim() || null,
            sort_order: i,
          })),
        );
        if (insErr) throw insErr;
      }

      toast.success(editId ? 'Đã cập nhật quiz' : 'Đã phát hành quiz cho phòng 🎉');
      navigate('/quizzi');
    } catch (e: any) {
      toast.error(e?.message || 'Không lưu được quiz');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/quizzi')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Quizzi
        </Button>
        <h1 className="text-lg font-bold">{editId ? 'Sửa quiz' : 'Tạo quiz cho phòng'}</h1>
      </div>

      {hasAttempts && (
        <Card className="border-amber-300">
          <CardContent className="py-3 text-sm text-amber-700 dark:text-amber-400">
            Quiz đã có người làm — câu hỏi bị khoá để giữ công bằng xếp hạng.
            Bạn chỉ sửa được tiêu đề/mô tả hoặc gỡ xuất bản.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Thông tin chung</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Tiêu đề *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Quiz tuần — Quy định nhận diện khách hàng (KYC)" />
          </div>
          <div className="space-y-1.5">
            <Label>Mô tả</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              placeholder="Giới thiệu ngắn để đồng đội biết quiz nói về gì" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nguồn (công văn / chủ điểm)</Label>
              <Input value={sourceRef} onChange={(e) => setSourceRef(e.target.value)}
                placeholder="VD: CV 1234/TGĐ-NHCT9 hoặc Chủ điểm KYC" />
            </div>
            <div className="space-y-1.5">
              <Label>Skill gắn kèm (tuỳ chọn)</Label>
              <Select value={skillId} onValueChange={setSkillId}>
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Thời gian mỗi câu (giây)</Label>
              <Select value={String(seconds)} onValueChange={(v) => setSeconds(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[15, 20, 30, 45, 60, 90, 120].map((s) => (
                    <SelectItem key={s} value={String(s)}>{s} giây</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editId && (
              <div className="space-y-1.5">
                <Label>Trạng thái</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as 'published' | 'unpublished')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Đang phát hành</SelectItem>
                    <SelectItem value="unpublished">Gỡ xuất bản</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {questions.map((q, i) => (
        <Card key={i}>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Câu {i + 1}</CardTitle>
            <Button variant="ghost" size="sm" disabled={hasAttempts || questions.length <= 1}
              onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={q.statement} disabled={hasAttempts} rows={2}
              onChange={(e) => updateQuestion(i, { statement: e.target.value })}
              placeholder="Nội dung câu hỏi" />
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={hasAttempts}
                    onClick={() => updateQuestion(i, { correctIndex: oi })}
                    title="Chọn làm đáp án đúng"
                    className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full border text-xs font-semibold transition-colors
                      ${q.correctIndex === oi
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-muted-foreground/30 text-muted-foreground hover:border-emerald-400'}`}
                  >
                    {q.correctIndex === oi ? <CheckCircle2 className="w-4 h-4" /> : String.fromCharCode(65 + oi)}
                  </button>
                  <Input value={opt} disabled={hasAttempts}
                    onChange={(e) => updateQuestion(i, { options: q.options.map((o, x) => (x === oi ? e.target.value : o)) })}
                    placeholder={`Phương án ${String.fromCharCode(65 + oi)}`} />
                  <Button variant="ghost" size="sm" disabled={hasAttempts || q.options.length <= 2}
                    onClick={() => {
                      const opts = q.options.filter((_, x) => x !== oi);
                      updateQuestion(i, {
                        options: opts,
                        correctIndex: q.correctIndex === oi ? 0 : q.correctIndex > oi ? q.correctIndex - 1 : q.correctIndex,
                      });
                    }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" disabled={hasAttempts || q.options.length >= 6}
                onClick={() => updateQuestion(i, { options: [...q.options, ''] })}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Thêm phương án
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Giải thích sau khi trả lời (khuyến khích — đây là lúc "học")</Label>
              <Textarea value={q.explanation} disabled={hasAttempts} rows={2}
                onChange={(e) => updateQuestion(i, { explanation: e.target.value })}
                placeholder="VD: Theo mục 2.1 của công văn, ..." />
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button variant="outline" disabled={hasAttempts}
          onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}>
          <Plus className="w-4 h-4 mr-1" /> Thêm câu hỏi
        </Button>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            {questions.length} câu · huy hiệu chính xác/tốc độ cần quiz ≥5 câu
          </p>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {editId ? 'Lưu thay đổi' : 'Phát hành ngay'}
          </Button>
        </div>
      </div>
    </div>
  );
}
