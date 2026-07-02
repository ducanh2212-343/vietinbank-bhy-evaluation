// AI Advisor edge function — proxies Lovable AI Gateway (Gemini)
// Modes: suggest_evidence | suggest_idp_plan | chat (SSE) | summarize_assessment
// | coach_skill | suggest_attitude_action | competency_portrait
// Prompts/model are loaded from public.ai_prompts (admin-editable).
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DEFAULT_MODEL = 'google/gemini-2.5-flash';

// Giới hạn sử dụng để kiểm soát chi phí credit
const RATE_LIMIT_PER_HOUR = 40; // số lượt gọi AI tối đa / user / giờ (mọi tác vụ cộng lại)
const MAX_CHAT_MESSAGES = 16; // số message hội thoại tối đa gửi lên model
const MAX_MESSAGE_CHARS = 8000; // độ dài tối đa mỗi message

const FALLBACK_SYSTEM = `Bạn là chuyên gia tư vấn phát triển năng lực ngành Ngân hàng tại Việt Nam.
Trả lời bằng tiếng Việt, ngắn gọn, cụ thể, gợi ý hành động đo lường được (theo mô hình 70/20/10 và PDCA).
Luôn nêu bằng chứng/cách kiểm chứng. Không bịa số liệu nội bộ.`;

// Simple {var} substitution. Missing vars => empty string.
function renderTemplate(tpl: string, vars: Record<string, unknown>): string {
  return tpl.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, k) => {
    const v = vars[k];
    if (v === undefined || v === null) return '';
    return typeof v === 'string' ? v : JSON.stringify(v);
  });
}

function lvlTxt(v: any) {
  return v === 0 ? 'L0 (chưa hình thành)' : v ? `L${v}` : 'chưa đánh giá';
}

function buildFallbackUserPrompt(mode: string, body: any): string | null {
  if (mode === 'suggest_evidence') {
    const { skill_name, level, role, context } = body;
    return `Gợi ý 3-5 minh chứng cụ thể cho kỹ năng "${skill_name}" ở mức L${level} của vị trí "${role || 'cán bộ'}".${context ? `\nBối cảnh: ${context}` : ''}\nTrả về dạng gạch đầu dòng, mỗi minh chứng có thể đo lường.`;
  }
  if (mode === 'suggest_idp_plan') {
    const { skill_name, current_level, target_level, role } = body;
    return `Lập kế hoạch IDP 70/20/10 trong 1 quý để nâng kỹ năng "${skill_name}" từ L${current_level} lên L${target_level} cho "${role || 'cán bộ'}".\n- 70% học qua công việc (3 hành động cụ thể, có deadline)\n- 20% học qua người khác (mentor, peer review)\n- 10% học qua đào tạo chính thức\nMỗi hành động phải có: nội dung, kết quả mong đợi, hỗ trợ cần.`;
  }
  if (mode === 'suggest_attitude_action') {
    const { attitude_name, status, context } = body;
    return `Cán bộ đang ở mức "${status}" cho nhóm thái độ "${attitude_name}".${context ? `\nBối cảnh: ${context}` : ''}\nGợi ý 2-3 hành động cải thiện cụ thể trong quý, kèm trụ cột nền tảng (IQ/EQ/PhQ/SQ) phù hợp và bằng chứng tiến bộ.`;
  }
  if (mode === 'summarize_assessment') {
    const { payload } = body;
    return `Tóm tắt kết quả đánh giá quý sau cho quản lý (3-5 gạch đầu dòng, nêu điểm mạnh, điểm cần cải thiện, đề xuất hành động):\n\n${JSON.stringify(payload).slice(0, 8000)}`;
  }
  if (mode === 'competency_portrait') {
    const { payload } = body;
    return `Hãy vẽ "chân dung năng lực TỔNG THỂ" cho cán bộ ngân hàng dựa trên TẤT CẢ dữ liệu sau:
- Mục A (thông tin nhân viên, vị trí, phòng ban, quản lý trực tiếp, PGĐ)
- Câu hỏi trao đổi 1-1 (nếu enabled = true, phải phân tích sâu các câu trả lời)
- Skill LÕI theo vị trí (kèm gap so với mức tối thiểu)
- Skill BỔ SUNG (ngoài chuẩn vị trí)
- ĐỦ 6 NHÓM THÁI ĐỘ (phân tích trục nào yếu/mạnh, không bỏ sót nhóm nào)

YÊU CẦU FORMAT (BẮT BUỘC):
- Trả lời bằng tiếng Việt, dùng markdown.
- Mỗi mục bắt đầu bằng heading cấp 2 (\`## \`) kèm emoji đúng như mẫu.
- Để **một dòng trống** giữa các mục.
- Dùng bullet \`- \` cho danh sách; in đậm tên skill/thái độ/nhóm bằng \`**...**\`.
- **MỖI lần nhắc đến một skill PHẢI ghi đầy đủ theo định dạng \`**MÃ · Tên đầy đủ**\`** (ví dụ: \`**SK01 · Lập kế hoạch bán hàng**\`). KHÔNG được rút gọn, KHÔNG được bỏ mã skill. Mã skill lấy từ trường \`code\` trong dữ liệu JSON bên dưới.
- KHÔNG viết liền một đoạn dài. KHÔNG bỏ heading. KHÔNG thêm mục ngoài cấu trúc.

CẤU TRÚC ĐẦU RA (đúng thứ tự):

## 👤 Tổng quan vai trò
(vị trí, phòng ban, đặc thù công việc — suy luận từ Mục A)

## ✨ Tóm tắt chân dung

## 💪 Điểm mạnh nổi bật (skill lõi + bổ sung)

## 🎯 Điểm cần cải thiện (skill chưa đạt chuẩn / bổ sung tiềm năng)

## 🧠 Phân tích 6 nhóm thái độ
(điểm qua TỪNG nhóm trong 6 nhóm, nêu rõ trục nào yếu/mạnh)

## 💬 Insight từ trao đổi 1-1
(nếu 1-1 enabled, phân tích nội dung trả lời; nếu không enabled, ghi "Cán bộ chưa kích hoạt câu hỏi 1-1")

## 📊 Định vị ma trận năng lực

## 💡 Khuyến nghị phát triển quý tới

Dữ liệu đánh giá (JSON):
${JSON.stringify(payload).slice(0, 12000)}`;
  }
  if (mode === 'coach_skill') {
    const {
      skill = {}, role, required = {}, self_level, manager_level,
      evidence, employee_comment, manager_note, is_core,
    } = body;
    const reqTxt = is_core
      ? `Yêu cầu vị trí: tối thiểu L${required.min ?? '?'}, nâng cao L${required.adv ?? '?'}`
      : `Đây là **skill bổ trợ** (ngoài chuẩn vị trí — không có L tối thiểu/nâng cao bắt buộc).`;
    const cur = typeof self_level === 'number' && self_level > 0 ? self_level : 0;
    const nextLvl = Math.min(4, cur + 1);
    const upskillHint = (skill as any)[`upskill_l${cur}_l${nextLvl}`] || '(không có gợi ý upskill trong DB cho bước này)';
    return `Tư vấn TOÀN DIỆN cho 1 dòng đánh giá kỹ năng. Chỉ dùng dữ liệu được cung cấp, không bịa số liệu.

THÔNG TIN SKILL
- Tên: ${skill.name || '?'} ${skill.code ? `(${skill.code})` : ''}
- Nhóm: ${skill.skill_group || '?'}
- Loại: ${is_core ? 'Skill LÕI theo vị trí' : 'Skill BỔ TRỢ'}
- Vị trí: ${role || 'cán bộ'}
- ${reqTxt}

MÔ TẢ CÁC MỨC
- L1: ${skill.l1 || '—'}
- L2: ${skill.l2 || '—'}
- L3: ${skill.l3 || '—'}
- L4: ${skill.l4 || '—'}

ĐÁNH GIÁ HIỆN TẠI
- Tự đánh giá: ${lvlTxt(self_level)}
- Quản lý: ${lvlTxt(manager_level)}
- Minh chứng: ${evidence || '(trống)'}
- Nhận xét NV: ${employee_comment || '(trống)'}
- Nhận xét QL: ${manager_note || '(trống)'}

GỢI Ý UPSKILL TỪ DB (L${cur}→L${nextLvl}): ${upskillHint}

Hãy trả lời markdown với các heading: ## 🧭 Định vị mức năng lực / ## 🔎 Đánh giá minh chứng / ## 💬 Đối chiếu nhận xét / ## 🎯 So với yêu cầu vị trí / ## 🚀 Lộ trình upskill 1 quý (70/20/10) — L${cur} → L${nextLvl}.`;
  }
  return null;
}

function buildCoachVars(body: any) {
  const {
    skill = {}, role, required = {}, self_level, manager_level,
    evidence, employee_comment, manager_note, is_core,
  } = body;
  const cur = typeof self_level === 'number' && self_level > 0 ? self_level : 0;
  const nextLvl = Math.min(4, cur + 1);
  const upskillHint = (skill as any)[`upskill_l${cur}_l${nextLvl}`] || '';
  const req_text = is_core
    ? `Yêu cầu vị trí: tối thiểu L${required.min ?? '?'}, nâng cao L${required.adv ?? '?'}`
    : 'Skill BỔ TRỢ — không có L tối thiểu/nâng cao bắt buộc.';
  return {
    skill_name: skill.name || '',
    skill_code: skill.code || '',
    skill_group: skill.skill_group || '',
    kind: is_core ? 'Skill LÕI' : 'Skill BỔ TRỢ',
    role: role || 'cán bộ',
    req_text,
    l1: skill.l1 || '', l2: skill.l2 || '', l3: skill.l3 || '', l4: skill.l4 || '',
    self_level_txt: lvlTxt(self_level),
    manager_level_txt: lvlTxt(manager_level),
    evidence_block: evidence || '(trống)',
    employee_comment_block: employee_comment || '(trống)',
    manager_note_block: manager_note || '(trống)',
    upskill_hint: upskillHint,
    current_level: String(cur),
    next_level: String(nextLvl),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY chưa cấu hình' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Require an authenticated end-user (not just a valid anon JWT) to prevent
    // anonymous internet users from consuming AI credits.
    const authHeader = req.headers.get('Authorization') || '';
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }



    const body = await req.json();
    const mode: string = body.mode || 'chat';
    const stream: boolean = mode === 'chat';

    const adminCli = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ============ Rate limit theo user (kiểm soát chi phí) ============
    // Soft-fail: nếu bảng ai_usage_log chưa được tạo thì bỏ qua, không chặn tính năng.
    try {
      const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
      const { count, error: rlErr } = await adminCli
        .from('ai_usage_log')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', oneHourAgo);
      if (!rlErr && (count ?? 0) >= RATE_LIMIT_PER_HOUR) {
        return new Response(JSON.stringify({ error: `Bạn đã dùng quá ${RATE_LIMIT_PER_HOUR} lượt AI trong 1 giờ. Vui lòng thử lại sau.` }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!rlErr) {
        await adminCli.from('ai_usage_log').insert({ user_id: user.id, mode });
      }
    } catch (e) {
      console.warn('ai_usage_log unavailable, skipping rate limit:', e);
    }

    // ============ Load prompt config (mode + system_base) ============
    const { data: promptRows } = await adminCli
      .from('ai_prompts')
      .select('mode, content, model, is_active')
      .in('mode', [mode, 'system_base']);
    const cfg = (promptRows || []).find((r: any) => r.mode === mode);
    const sysRow = (promptRows || []).find((r: any) => r.mode === 'system_base');

    // Admin đã tắt tác vụ này → chặn hẳn (trước đây cờ is_active bị bỏ qua)
    if (cfg && cfg.is_active === false) {
      return new Response(JSON.stringify({ error: 'Tác vụ AI này đang được quản trị viên tắt.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = (sysRow?.is_active !== false && sysRow?.content?.trim()) || FALLBACK_SYSTEM;
    const model = (cfg?.model?.trim()) || DEFAULT_MODEL;
    const tpl = cfg?.content?.trim() || '';

    // ============ Ẩn danh hóa PII trước khi gửi ra gateway bên ngoài ============
    // Model không cần tên/mã cán bộ để tư vấn — chỉ cần vị trí, phòng ban, dữ liệu năng lực.
    if (body.payload && typeof body.payload === 'object') {
      const emp = (body.payload as any).employee;
      if (emp && typeof emp === 'object') {
        delete emp.name;
        delete emp.employee_code;
        delete emp.manager_name;
        delete emp.pgd_name;
      }
    }

    // ============ Special: suggest VTB courses ============
    if (mode === 'suggest_vtb_courses') {
      const { skill_name, skill_group, current_level, target_level, position_id } = body;
      if (!skill_name || !position_id) {
        return new Response(JSON.stringify({ error: 'skill_name và position_id bắt buộc' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: groupRows } = await adminCli
        .from('position_to_vtb_group')
        .select('vtb_position_group')
        .eq('position_id', position_id);
      const groups = (groupRows || []).map((r: any) => r.vtb_position_group);
      if (!groups.length) {
        return new Response(JSON.stringify({ courses: [], message: 'Vị trí này chưa được ánh xạ sang nhóm trong Kế hoạch đào tạo. Vui lòng liên hệ quản trị viên.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: cpgRows } = await adminCli
        .from('vtb_course_position_groups')
        .select('course_id')
        .in('position_group', groups);
      const courseIds = Array.from(new Set((cpgRows || []).map((r: any) => r.course_id)));
      if (!courseIds.length) {
        return new Response(JSON.stringify({ courses: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: courseRows } = await adminCli
        .from('vtb_courses')
        .select('id, code, name, short_name, objective, content, duration_days, format, competency_type')
        .in('id', courseIds)
        .eq('is_active', true);

      // Skill mapping boost: courses tagged for this skill at <= target_level get boost
      const { skill_id } = body as { skill_id?: string };
      const boostMap = new Map<string, number>();
      if (skill_id) {
        const { data: skillMaps } = await adminCli
          .from('vtb_course_skills')
          .select('course_id, target_level_min, relevance')
          .eq('skill_id', skill_id)
          .in('course_id', courseIds);
        for (const sm of skillMaps || []) {
          const tgt = target_level ?? 4;
          if ((sm.target_level_min ?? 1) <= tgt) {
            const b = sm.relevance === 'high' ? 2 : sm.relevance === 'medium' ? 1 : 0;
            boostMap.set(sm.course_id, Math.max(boostMap.get(sm.course_id) || 0, b));
          }
        }
      }

      const candidates = (courseRows || []).map((c: any) => ({
        code: c.code,
        name: c.short_name || c.name,
        objective: (c.objective || '').slice(0, 400),
        content: (c.content || '').slice(0, 600),
        duration_days: c.duration_days, format: c.format,
        admin_tagged: boostMap.has(c.id),
      }));

      const sysMsg = `Bạn là chuyên gia phát triển năng lực ngành Ngân hàng. Trả lời bằng tiếng Việt, ngắn gọn.
Nhiệm vụ: Trong danh sách khóa học của Trường ĐT VietinBank, chọn ra TẤT CẢ những khóa thực sự phù hợp để giúp cán bộ nâng kỹ năng từ mức hiện tại lên mức mục tiêu.
Lưu ý: khóa có "admin_tagged": true là khóa đã được quản trị viên xác nhận liên quan đến kỹ năng này — hãy ưu tiên và cho điểm cao.
Tiêu chí phù hợp: nội dung/mục tiêu khóa học liên quan trực tiếp đến kỹ năng đang phát triển. KHÔNG ép chọn khóa không phù hợp. Nếu không có khóa nào phù hợp, trả mảng rỗng.`;

      // Template chỉnh được qua ai_prompts (mode: suggest_vtb_courses); để trống dùng mặc định.
      const defaultVtbMsg = `KỸ NĂNG CẦN PHÁT TRIỂN: "${skill_name}"${skill_group ? ` (nhóm: ${skill_group})` : ''}
Mức hiện tại: L${current_level ?? '?'} → Mức mục tiêu: L${target_level ?? '?'}

DANH SÁCH KHÓA HỌC (đã lọc theo vị trí ${position_id}):
${JSON.stringify(candidates, false, 0)}

Hãy gọi tool select_courses để trả về tất cả khóa phù hợp, sắp xếp theo relevance_score giảm dần.`;
      const userMsg = tpl
        ? renderTemplate(tpl, {
            skill_name,
            skill_group: skill_group || '',
            current_level: String(current_level ?? '?'),
            target_level: String(target_level ?? '?'),
            position_id,
            candidates: JSON.stringify(candidates),
          })
        : defaultVtbMsg;

      const tools = [{
        type: 'function',
        function: {
          name: 'select_courses',
          description: 'Trả về danh sách khóa học phù hợp.',
          parameters: {
            type: 'object',
            properties: {
              courses: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    relevance_score: { type: 'number', description: '1-5' },
                    reason: { type: 'string', description: '1-2 câu' },
                  },
                  required: ['code', 'relevance_score', 'reason'],
                  additionalProperties: false,
                },
              },
            },
            required: ['courses'],
            additionalProperties: false,
          },
        },
      }];

      const aiRes2 = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: sysMsg }, { role: 'user', content: userMsg }],
          tools,
          tool_choice: { type: 'function', function: { name: 'select_courses' } },
        }),
      });
      if (!aiRes2.ok) {
        if (aiRes2.status === 429) return new Response(JSON.stringify({ error: 'Quá nhiều yêu cầu, thử lại sau.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        if (aiRes2.status === 402) return new Response(JSON.stringify({ error: 'Hết credit AI.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        const t = await aiRes2.text();
        console.error('AI error vtb:', aiRes2.status, t);
        return new Response(JSON.stringify({ error: 'AI gateway lỗi' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const aiData = await aiRes2.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      let picks: Array<{ code: string; relevance_score: number; reason: string }> = [];
      try {
        picks = JSON.parse(toolCall?.function?.arguments || '{}').courses || [];
      } catch { picks = []; }
      // Apply admin boost to final score (capped at 5)
      const byCode = new Map((courseRows || []).map((c: any) => [String(c.code), c]));
      const result = picks
        .map(p => {
          const c: any = byCode.get(String(p.code));
          if (!c) return null;
          const boost = boostMap.get(c.id) || 0;
          return {
            id: c.id, code: c.code, name: c.short_name || c.name, objective: c.objective,
            duration_days: c.duration_days, format: c.format,
            relevance_score: Math.min(5, p.relevance_score + boost),
            reason: p.reason,
            admin_tagged: boostMap.has(c.id),
          };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => b.relevance_score - a.relevance_score);
      return new Response(JSON.stringify({ courses: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // ============ End VTB courses ============



    const messages: any[] = [{ role: 'system', content: systemPrompt }];

    if (mode === 'chat') {
      // Sanitize hội thoại từ client: chỉ nhận role user/assistant (chặn chèn system prompt),
      // ép content về string, giới hạn số lượt và độ dài để kiểm soát chi phí token.
      const rawMsgs = Array.isArray(body.messages) ? body.messages : [];
      const msgs = rawMsgs
        .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
        .map((m: any) => ({
          role: m.role,
          content: String(m.content).slice(0, MAX_MESSAGE_CHARS),
        }))
        .slice(-MAX_CHAT_MESSAGES);
      if (!msgs.length) {
        return new Response(JSON.stringify({ error: 'messages bắt buộc' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      messages.push(...msgs);
    } else {
      let userContent = '';
      if (tpl) {
        // Build variables for templating
        const vars: Record<string, unknown> = {
          ...body,
          context_block: body.context ? `\nBối cảnh: ${body.context}` : '',
          payload: typeof body.payload === 'string' ? body.payload : JSON.stringify(body.payload ?? {}).slice(0, 12000),
        };
        if (mode === 'coach_skill') Object.assign(vars, buildCoachVars(body));
        userContent = renderTemplate(tpl, vars);
      } else {
        const fb = buildFallbackUserPrompt(mode, body);
        if (!fb) {
          return new Response(JSON.stringify({ error: 'mode không hợp lệ' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        userContent = fb;
      }
      messages.push({ role: 'user', content: userContent });
    }

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: 'Quá nhiều yêu cầu, vui lòng thử lại sau.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: 'Hết credit AI. Vui lòng nạp thêm trong Cài đặt Workspace.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const t = await aiRes.text();
      console.error('AI gateway error:', aiRes.status, t);
      return new Response(JSON.stringify({ error: 'AI gateway lỗi' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (stream) {
      return new Response(aiRes.body, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' } });
    }

    const data = await aiRes.json();
    const text = data.choices?.[0]?.message?.content || '';
    return new Response(JSON.stringify({ text }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('ai-advisor error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Lỗi không xác định' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
