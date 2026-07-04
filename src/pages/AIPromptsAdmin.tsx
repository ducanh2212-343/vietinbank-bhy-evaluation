import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, RotateCcw, Coins, KeyRound, PlugZap } from 'lucide-react';
import { BrandMascotAI } from '@/components/branding/BrandAssets';

interface AIPrompt {
  mode: string;
  description: string | null;
  content: string;
  model: string;
  is_active: boolean;
  updated_at: string;
}

// Model nhóm theo bậc chi phí — giúp admin chọn linh hoạt theo ngân sách credit.
const MODEL_TIERS: { tier: string; hint: string; models: { value: string; label: string }[] }[] = [
  {
    tier: '💰 Tiết kiệm',
    hint: 'Rẻ nhất — phù hợp tác vụ ngắn, khối lượng lớn',
    models: [
      { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
      { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano' },
    ],
  },
  {
    tier: '💰💰 Cân bằng',
    hint: 'Chất lượng/chi phí tốt — khuyến nghị cho hầu hết tác vụ',
    models: [
      { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (mặc định)' },
      { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash (preview)' },
      { value: 'google/gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
      { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini' },
    ],
  },
  {
    tier: '💰💰💰 Chất lượng cao (đắt)',
    hint: 'Chỉ dùng khi cần phân tích sâu — tốn credit đáng kể',
    models: [
      { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { value: 'openai/gpt-5', label: 'GPT-5' },
    ],
  },
];
const ALL_MODEL_VALUES = new Set(MODEL_TIERS.flatMap((t) => t.models.map((m) => m.value)));
const CUSTOM_MODEL = '__custom__';

const MODE_LABELS: Record<string, string> = {
  system_base: 'System prompt mặc định (áp dụng cho mọi tác vụ)',
  chat: 'Trợ lý hội thoại (chat AI)',
  coach_skill: 'Tư vấn 1 dòng skill (toàn diện)',
  competency_portrait: 'Chân dung năng lực tổng thể',
  suggest_vtb_courses: 'Gợi ý khóa học Trường ĐT VietinBank',
  suggest_idp_plan: 'Gợi ý kế hoạch hành động (IDP 70/20/10)',
};

// Khuyến nghị model theo tác vụ để cân đối chi phí
const MODE_RECOMMENDED_MODEL: Record<string, string> = {
  chat: 'google/gemini-2.5-flash',
  coach_skill: 'google/gemini-2.5-flash',
  competency_portrait: 'google/gemini-2.5-flash',
  suggest_vtb_courses: 'google/gemini-2.5-flash-lite',
  suggest_idp_plan: 'google/gemini-2.5-flash',
};

// Nhà cung cấp AI — BYOK: admin tự nhập API key, không phụ thuộc Lovable.
const PROVIDER_OPTIONS: { value: string; label: string; hint: string; keyUrl?: string }[] = [
  {
    value: 'lovable',
    label: 'Lovable AI Gateway',
    hint: 'Gateway mặc định của Lovable — dùng được cả model Gemini lẫn GPT. Key lấy từ workspace Lovable (hoặc để trống nếu đã đặt secret LOVABLE_API_KEY).',
  },
  {
    value: 'gemini',
    label: 'Google Gemini (API trực tiếp)',
    hint: 'Gọi thẳng Google AI — chủ động chi phí, chỉ dùng được model Gemini. Lấy key tại aistudio.google.com/apikey.',
  },
  {
    value: 'openai',
    label: 'OpenAI (API trực tiếp)',
    hint: 'Gọi thẳng OpenAI — chỉ dùng được model GPT. Lấy key tại platform.openai.com/api-keys.',
  },
  {
    value: 'custom',
    label: 'Gateway tùy chỉnh (OpenAI-compatible)',
    hint: 'Gateway nội bộ hoặc bên thứ ba theo chuẩn OpenAI chat/completions. Cần nhập Base URL (ví dụ https://gateway.noibo.vn/v1).',
  },
];

interface ProviderSettings {
  provider: string;
  api_base_url: string;
  hasKey: boolean;
  keyLast4: string;
}

export default function AIPromptsAdmin() {
  const { isAdmin } = useAuth();
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMode, setSavingMode] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, AIPrompt>>({});
  // Bật ô nhập model tùy chỉnh cho từng mode (khi model không nằm trong danh sách gợi ý)
  const [customModel, setCustomModel] = useState<Record<string, boolean>>({});

  // Nhà cung cấp AI (BYOK)
  const [providerSettings, setProviderSettings] = useState<ProviderSettings>({
    provider: 'lovable', api_base_url: '', hasKey: false, keyLast4: '',
  });
  const [newApiKey, setNewApiKey] = useState('');
  const [newBaseUrl, setNewBaseUrl] = useState('');
  const [savingProvider, setSavingProvider] = useState(false);
  const [testingConn, setTestingConn] = useState(false);

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

    // Cấu hình nhà cung cấp AI — chỉ admin đọc được (RLS)
    const { data: settingsRow } = await (supabase as any)
      .from('ai_settings')
      .select('provider, api_key, api_base_url')
      .eq('id', 1)
      .maybeSingle();
    if (settingsRow) {
      const key = (settingsRow.api_key || '').trim();
      setProviderSettings({
        provider: settingsRow.provider || 'lovable',
        api_base_url: settingsRow.api_base_url || '',
        hasKey: key.length > 0,
        keyLast4: key.length > 4 ? key.slice(-4) : '',
      });
      setNewBaseUrl(settingsRow.api_base_url || '');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const saveProviderSettings = async () => {
    setSavingProvider(true);
    const patch: any = {
      provider: providerSettings.provider,
      api_base_url: providerSettings.provider === 'custom' ? (newBaseUrl.trim() || null) : null,
    };
    // Chỉ ghi đè key khi admin nhập key mới — để trống là giữ key cũ
    if (newApiKey.trim()) patch.api_key = newApiKey.trim();
    const { error } = await (supabase as any)
      .from('ai_settings')
      .update(patch)
      .eq('id', 1);
    setSavingProvider(false);
    if (error) {
      toast({ title: 'Lưu cấu hình thất bại', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Đã lưu nhà cung cấp AI', description: 'Áp dụng ngay cho các lượt gọi AI tiếp theo.' });
    setNewApiKey('');
    load();
  };

  const testConnection = async () => {
    setTestingConn(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: { mode: 'test_connection' },
      });
      if (error) throw error;
      if (data?.ok) {
        toast({ title: '✅ Kết nối AI thành công', description: `Provider: ${data.provider} · Model: ${data.model}` });
      } else {
        toast({
          title: 'Kết nối AI thất bại',
          description: data?.error ? String(data.error).slice(0, 300) : 'Không rõ nguyên nhân',
          variant: 'destructive',
        });
      }
    } catch (e: any) {
      let msg = e?.message || 'Lỗi không xác định';
      try {
        const ctx = (e as { context?: Response }).context;
        const body = ctx ? await ctx.json() : null;
        if (body?.error) msg = body.error;
      } catch { /* giữ msg */ }
      toast({ title: 'Kết nối AI thất bại', description: msg, variant: 'destructive' });
    } finally {
      setTestingConn(false);
    }
  };

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
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <BrandMascotAI className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Quản trị AI & Prompt</h1>
          <p className="text-sm text-muted-foreground">
            Chỉnh sửa system prompt, template prompt và model AI cho từng tác vụ. Để trống <code>content</code> sẽ dùng prompt mặc định trong code.
          </p>
        </div>
      </div>

      <Alert>
        <Coins className="h-4 w-4" />
        <AlertDescription className="space-y-1 text-sm">
          <p className="font-medium">Chọn model theo chi phí — mỗi tác vụ dùng model riêng:</p>
          <ul className="list-disc pl-5 text-muted-foreground">
            <li><strong>💰 Tiết kiệm</strong> (Flash Lite, GPT-5 Nano): tác vụ ngắn, gọi nhiều — ví dụ gợi ý khóa học.</li>
            <li><strong>💰💰 Cân bằng</strong> (Gemini Flash, GPT-5 Mini): chat tư vấn, tư vấn skill, chân dung năng lực — khuyến nghị mặc định.</li>
            <li><strong>💰💰💰 Chất lượng cao</strong> (Gemini Pro, GPT-5): chỉ bật khi cần phân tích sâu; tốn credit đáng kể.</li>
          </ul>
          <p className="text-muted-foreground">
            Tắt công tắc "Bật" sẽ chặn hẳn tác vụ AI đó. Hệ thống cũng giới hạn 40 lượt AI/giờ/người dùng để kiểm soát chi phí.
          </p>
        </AlertDescription>
      </Alert>

      {/* Nhà cung cấp AI & API key — BYOK, không phụ thuộc Lovable */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-semibold">Nhà cung cấp AI & API key</h2>
          <Badge variant="outline" className="text-xs">
            Đang dùng: {PROVIDER_OPTIONS.find((p) => p.value === providerSettings.provider)?.label || providerSettings.provider}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Chọn nơi hệ thống gọi AI và tự nhập API key của đơn vị — có thể chuyển sang Google Gemini hoặc OpenAI trực tiếp để chủ động chi phí, không phụ thuộc Lovable.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Nhà cung cấp</Label>
            <Select
              value={providerSettings.provider}
              onValueChange={(v) => setProviderSettings((s) => ({ ...s, provider: v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROVIDER_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {PROVIDER_OPTIONS.find((p) => p.value === providerSettings.provider)?.hint}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              API key {providerSettings.hasKey
                ? <span className="text-muted-foreground font-normal">(đã lưu ••••{providerSettings.keyLast4} — nhập để thay)</span>
                : <span className="text-destructive font-normal">(chưa có)</span>}
            </Label>
            <Input
              type="password"
              value={newApiKey}
              onChange={(e) => setNewApiKey(e.target.value)}
              placeholder={providerSettings.hasKey ? 'Nhập API key mới nếu muốn thay' : 'Dán API key vào đây'}
              autoComplete="off"
              className="font-mono text-xs"
            />
            {providerSettings.provider === 'custom' && (
              <>
                <Label className="text-xs mt-2 block">Base URL (OpenAI-compatible)</Label>
                <Input
                  value={newBaseUrl}
                  onChange={(e) => setNewBaseUrl(e.target.value)}
                  placeholder="https://gateway.noibo.vn/v1"
                  className="font-mono text-xs"
                />
              </>
            )}
          </div>
        </div>

        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-1">
          <p>
            <strong>Lưu ý model theo nhà cung cấp:</strong> danh sách model bên dưới giữ nguyên tên dạng <code>google/…</code> / <code>openai/…</code> —
            hệ thống tự bỏ tiền tố khi gọi API trực tiếp.
          </p>
          <p>
            Chọn <strong>Google Gemini</strong> thì chỉ các model Gemini hoạt động; chọn <strong>OpenAI</strong> thì chỉ model GPT hoạt động.
            Tác vụ đang gán model không thuộc nhà cung cấp sẽ báo lỗi rõ để đổi model.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={testConnection} disabled={testingConn || savingProvider}>
            {testingConn ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <PlugZap className="w-3.5 h-3.5 mr-1" />}
            Kiểm tra kết nối
          </Button>
          <Button size="sm" onClick={saveProviderSettings} disabled={savingProvider}>
            {savingProvider ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Lưu nhà cung cấp
          </Button>
        </div>
      </Card>

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
                    <Label className="text-xs">Model AI (chọn theo bậc chi phí)</Label>
                    {(() => {
                      const isCustom = customModel[p.mode] || (!!d.model && !ALL_MODEL_VALUES.has(d.model));
                      const recommended = MODE_RECOMMENDED_MODEL[p.mode];
                      return (
                        <>
                          <Select
                            value={isCustom ? CUSTOM_MODEL : d.model}
                            onValueChange={(v) => {
                              if (v === CUSTOM_MODEL) {
                                setCustomModel((c) => ({ ...c, [p.mode]: true }));
                              } else {
                                setCustomModel((c) => ({ ...c, [p.mode]: false }));
                                updateDraft(p.mode, { model: v });
                              }
                            }}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {MODEL_TIERS.map((tier) => (
                                <SelectGroup key={tier.tier}>
                                  <SelectLabel className="text-[11px]">{tier.tier} — {tier.hint}</SelectLabel>
                                  {tier.models.map((m) => (
                                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                  ))}
                                </SelectGroup>
                              ))}
                              <SelectGroup>
                                <SelectLabel className="text-[11px]">Khác</SelectLabel>
                                <SelectItem value={CUSTOM_MODEL}>Nhập model tùy chỉnh…</SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                          {isCustom && (
                            <Input
                              value={d.model}
                              onChange={(e) => updateDraft(p.mode, { model: e.target.value })}
                              placeholder="ví dụ: google/gemini-2.5-flash"
                              className="h-8 text-xs font-mono"
                            />
                          )}
                          {recommended && d.model !== recommended && (
                            <p className="text-[10px] text-muted-foreground">
                              Khuyến nghị cho tác vụ này: <code>{recommended}</code>
                            </p>
                          )}
                        </>
                      );
                    })()}
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
