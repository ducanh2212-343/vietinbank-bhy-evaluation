// Floating AI advisor — chat panel using Lovable AI Gateway via edge function
import { useState, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

type Msg = { role: 'user' | 'assistant'; content: string };

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-advisor`;

async function streamChat(messages: Msg[], onDelta: (s: string) => void) {
  const resp = await fetch(FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ mode: 'chat', messages }),
  });
  if (!resp.ok || !resp.body) {
    const t = await resp.text();
    throw new Error(t || `HTTP ${resp.status}`);
  }
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let done = false;
  while (!done) {
    const r = await reader.read();
    if (r.done) break;
    buf += dec.decode(r.value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf('\n')) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line.startsWith('data: ')) continue;
      const j = line.slice(6).trim();
      if (j === '[DONE]') { done = true; break; }
      try {
        const parsed = JSON.parse(j);
        const c = parsed.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch {
        buf = line + '\n' + buf;
        break;
      }
    }
  }
}

export function AIAdvisorPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    let acc = '';
    try {
      await streamChat(next, (chunk) => {
        acc += chunk;
        setMessages([...next, { role: 'assistant', content: acc }]);
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      });
    } catch (e: any) {
      setMessages([...next, { role: 'assistant', content: `⚠️ Lỗi: ${e.message || 'không kết nối được AI'}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-24 right-4 h-12 w-12 rounded-full shadow-lg z-40 bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
          aria-label="AI tư vấn"
        >
          <Sparkles className="w-5 h-5 text-white" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-violet-600" /> AI Tư vấn Skill & Thái độ
          </SheetTitle>
          <p className="text-xs text-muted-foreground">Hỏi về kỹ năng, IDP, kế hoạch hành động, hoặc nhóm thái độ.</p>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.length === 0 && (
            <div className="text-xs text-muted-foreground space-y-2">
              <p>Gợi ý câu hỏi:</p>
              <ul className="space-y-1 pl-3 list-disc">
                <li>Skill "Lập kế hoạch hành động" L2 yêu cầu gì?</li>
                <li>Gợi ý IDP nâng "Tư vấn FDI" từ L1 lên L2 trong 1 quý.</li>
                <li>Cải thiện nhóm thái độ "Lắng nghe & tránh tự mãn" thế nào?</li>
              </ul>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn('rounded-lg p-2.5 text-sm', m.role === 'user' ? 'bg-primary/10 ml-6' : 'bg-muted mr-6')}>
              {m.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Đang soạn câu trả lời…
            </div>
          )}
        </div>

        <div className="border-t p-2 flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Nhập câu hỏi…"
            className="min-h-[40px] max-h-32 text-sm resize-none"
          />
          <Button size="icon" onClick={send} disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
