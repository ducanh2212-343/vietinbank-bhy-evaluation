import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, Sparkles, RotateCcw } from 'lucide-react';

interface AIPrompt {
  mode: string;
  description: string | null;
  content: string;
  model: string;
  is_active: boolean;
  updated_at: string;
}

const MODELS = [
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (mặc định, nhanh)' },
  { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (rẻ nhất)' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (mạnh nhất Gemini)' },
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash (preview)' },
  { value: 'google/gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
  { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano (rẻ, nhanh)' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini' },
  { value: 'openai/gpt-5', label: 'GPT-5 (mạnh, đắt)' },
];

const MODE_LABELS: Record<string, string> = {
  system_base: 'System prompt mặc định (áp dụng cho mọi tác vụ)',
  chat: 'Trợ lý hội thoại (chat AI)',
  suggest_evidence: 'Gợi ý minh chứng cho skill',
  coach_skill: 'Tư vấn 1 dòng skill (toàn diện)',
  suggest_idp_plan: 'Lập kế hoạch IDP 70/20/10',
  suggest_attitude_action: 'Gợi ý cải thiện thái độ',
  summarize_assessment: 'Tóm tắt phiếu đánh giá',
  competency_portrait: 'Chân dung năng lực tổng thể',
};

export default function AIPromptsAdmin() {
  const { isAdmin } = useAuth();
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMode, setSavingMode] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, AIPrompt>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_prompts')
      .select('mode, description, content, model, is_active, updated_at')
      .order('mode');
    if (error) {
      toast({ title: 'Lỗi tải prompt', description: error.message, variant: 'destructive' });
    } else {
      const list = (data as AIPrompt[]) || [];
      setPrompts(list);
      const map: Record<string, AIPrompt> = {};
      list.forEach((p) => (map[p.mode] = { ...p }));
      setDrafts(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateDraft = (mode: string, patch: Partial<AIPrompt>) => {
    setDrafts((d) => ({ ...d, [mode]: { ...d[mode], ...patch } }));
  };

  const isDirty = (mode: string) => {
    const orig = prompts.find((p) => p.mode === mode);
    const d = drafts[mode];
    if (!orig || !d) return false;
    return (
      orig.content !== d.content ||
      orig.model !== d.model ||
      orig.is_active !== d.is_active ||
      (orig.description || '') !== (d.description || '')
    );
  };

  const save = async (mode: string) => {
    const d = drafts[mode];
    if (!d) return;
    setSavingMode(mode);
    const { error } = await supabase
      .from('ai_prompts')
      .update({
        content: d.content,
        model: d.model,
        is_active: d.is_active,
        description: d.description,
      })
      .eq('mode', mode);
    setSavingMode(null);
    if (error) {
      toast({ title: 'Lưu thất bại', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Đã lưu', description: `Prompt "${MODE_LABELS[mode] || mode}" đã cập nhật.` });
      load();
    }
  };

  const reset = (mode: string) => {
    const orig = prompts.find((p) => p.mode === mode);
    if (orig) setDrafts((d) => ({ ...d, [mode]: { ...orig } }));
  };

  if (!isAdmin) {
    return (
      <div className="p-8">
        <Card className="p-8 text-center text-muted-foreground">
          Bạn không có quyền truy cập trang này.
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Quản trị AI & Prompt</h1>
          <p className="text-sm text-muted-foreground">
            Chỉnh sửa system prompt, template prompt và model AI cho từng tác vụ. Để trống <code>content</code> sẽ dùng prompt mặc định trong code.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground p-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
        </div>
      ) : (
        <div className="space-y-5">
          {prompts.map((p) => {
            const d = drafts[p.mode] || p;
            const dirty = isDirty(p.mode);
            return (
              <Card key={p.mode} className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-semibold">{MODE_LABELS[p.mode] || p.mode}</h2>
                      <Badge variant="outline" className="font-mono text-xs">{p.mode}</Badge>
                      {!d.is_active && <Badge variant="destructive">Đã tắt</Badge>}
                      {dirty && <Badge className="bg-amber-500 hover:bg-amber-600">Chưa lưu</Badge>}
                    </div>
                    {d.description && (
                      <p className="text-xs text-muted-foreground mt-1">{d.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Label className="text-xs">Bật</Label>
                    <Switch
                      checked={d.is_active}
                      onCheckedChange={(v) => updateDraft(p.mode, { is_active: v })}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Model AI</Label>
                    <Select
                      value={d.model}
                      onValueChange={(v) => updateDraft(p.mode, { model: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MODELS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ghi chú / mô tả</Label>
                    <Textarea
                      value={d.description || ''}
                      onChange={(e) => updateDraft(p.mode, { description: e.target.value })}
                      placeholder="Mô tả tác vụ, liệt kê biến..."
                      rows={3}
                      className="text-xs resize-y min-h-[60px]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {p.mode === 'system_base'
                      ? 'Nội dung system prompt'
                      : 'Template user prompt (dùng cú pháp {tên_biến}, để trống = dùng prompt cứng trong code)'}
                  </Label>
                  <Textarea
                    value={d.content || ''}
                    onChange={(e) => updateDraft(p.mode, { content: e.target.value })}
                    rows={p.mode === 'system_base' ? 6 : 14}
                    className="font-mono text-xs"
                    placeholder={
                      p.mode === 'system_base'
                        ? 'Bạn là chuyên gia tư vấn...'
                        : 'Ví dụ: Gợi ý 3-5 minh chứng cho kỹ năng "{skill_name}" ở mức L{level} cho vị trí "{role}".{context_block}'
                    }
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Cập nhật lần cuối: {new Date(p.updated_at).toLocaleString('vi-VN')}
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => reset(p.mode)}
                    disabled={!dirty}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Hoàn tác
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => save(p.mode)}
                    disabled={!dirty || savingMode === p.mode}
                  >
                    {savingMode === p.mode ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5 mr-1" />
                    )}
                    Lưu
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
