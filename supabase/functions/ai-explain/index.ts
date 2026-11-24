// INFOLAKTIKA — "ai-explain" Edge Function.
// Writes a short Kazakh explanation for a survey question with an AI model and caches it
// in tests.questions[i].explain, so every question is generated only once.
//
//   POST {test_id, index}  — a student who already took the test (or the admin) asks for
//                            the explanation of one question. Cached text is returned as is.
//   POST {share_code, attempt_id, index} — a guest who took a shared survey by link (no account).
//   POST {question}        — admin only: draft an explanation in the test editor (not saved).
//
// Secrets (Supabase → Edge Functions → Secrets), one of:
//   GEMINI_API_KEY      (free key from https://aistudio.google.com/apikey)   — used first
//   ANTHROPIC_API_KEY   (https://console.anthropic.com)
// Optional: AI_MODEL to override the model name.
import { createClient } from 'npm:@supabase/supabase-js@2';

// Allow whatever headers the browser asks for (supabase-js adds new ones over time).
let cors: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

type Q = { q: string; options: string[]; type?: 'single' | 'multi'; answer?: number; answers?: number[]; explain?: string | null };
const L = 'ABCD';

function serviceKey(): string {
  const direct = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY');
  if (direct) return direct;
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
    const first = Object.values(keys)[0];
    if (typeof first === 'string') return first;
  } catch { /* ignore */ }
  throw new Error('service key missing');
}

function validQuestion(q: any): q is Q {
  return q && typeof q.q === 'string' && q.q.trim() && Array.isArray(q.options) && q.options.length === 4
    && q.options.every((o: unknown) => typeof o === 'string' && o.trim())
    && (q.type === 'multi'
      ? Array.isArray(q.answers) && q.answers.length > 0 && q.answers.every((a: unknown) => [0, 1, 2, 3].includes(a as number))
      : [0, 1, 2, 3].includes(q.answer));
}

function prompt(q: Q) {
  const right = q.type === 'multi' ? [...new Set(q.answers)].sort() : [q.answer!];
  const opts = q.options.map((o, i) => `${L[i]}) ${o.trim()}`).join('\n');
  const rightTxt = right.map((i) => `${L[i]}) ${q.options[i].trim()}`).join('; ');
  return {
    system:
      'Сен мектеп оқушыларына информатика пәнін үйрететін мейірімді мұғалімсің. Тек қазақ тілінде жаз. ' +
      'Оқушы тест сұрағына қате жауап берді. Қысқа түсіндірме жаз: 2–3 сөйлем, 70 сөзден аспасын. ' +
      'Дұрыс жауаптың неге дұрыс екенін және басқа нұсқалардың неге дұрыс емес екенін қарапайым тілмен айт. ' +
      'Сәлемдесу, тақырып, markdown, тізім, эмодзи қолданба. Дұрыс жауапты қайта толық көшірмей, мағынасын түсіндір.',
    user:
      `Сұрақ: ${q.q.trim()}\n${q.type === 'multi' ? '(Бірнеше дұрыс жауабы бар сұрақ)\n' : ''}Нұсқалар:\n${opts}\n` +
      `Дұрыс жауап${right.length > 1 ? 'тар' : ''}: ${rightTxt}`,
  };
}

async function generate(q: Q): Promise<string> {
  const p = prompt(q);
  const gemini = Deno.env.get('GEMINI_API_KEY');
  const claude = Deno.env.get('ANTHROPIC_API_KEY');
  let text = '';
  if (gemini) {
    // Try the configured model first, then Flash-Lite models (largest free quota, plenty for 2–3 sentences),
    // then Flash. A busy (503) or out-of-quota (429) model just moves on to the next one — each has its own quota.
    const models = [...new Set([Deno.env.get('AI_MODEL'), 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite',
      'gemini-flash-latest', 'gemini-2.5-flash'].filter(Boolean))] as string[];
    let last = '';
    for (const model of models) {
      // Short answers need no "thinking": turn it down, otherwise Flash models think for 5–15 s first.
      const thinking = /2\.5/.test(model) ? { thinkingBudget: 0 } : { thinkingLevel: 'minimal' };
      const tries = [{ temperature: 0.3, maxOutputTokens: 600, thinkingConfig: thinking }, { temperature: 0.3 }];
      for (let k = 0; k < tries.length; k++) {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': gemini.trim() },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: p.system }] },
            contents: [{ role: 'user', parts: [{ text: p.user }] }],
            generationConfig: tries[k],
          }),
        });
        const d = await r.json().catch(() => ({}));
        if (r.ok) { text = (d?.candidates?.[0]?.content?.parts ?? []).filter((x: any) => !x.thought).map((x: any) => x.text ?? '').join(''); break; }
        last = `Gemini ${r.status} (${model}): ${d?.error?.message ?? r.statusText}`;
        console.error(last);
        if (r.status === 503 && k === 0) { await new Promise((res) => setTimeout(res, 1200)); continue; }  // brief retry when busy
        if (r.status !== 400) break;          // 400 = model rejects the thinking setting → retry plainly
      }
      if (text) break;
      if (/Gemini (401|403)/.test(last)) break;   // bad key: other models won't help
    }
    if (!text) throw new Error(`ai error: ${last}`);
  } else if (claude) {
    const model = Deno.env.get('AI_MODEL') ?? 'claude-haiku-5-5';
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': claude, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 500, system: p.system, messages: [{ role: 'user', content: p.user }] }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(`ai error: ${d?.error?.message ?? r.status}`);
    text = (d?.content ?? []).map((x: any) => x.text ?? '').join('');
  } else {
    throw new Error('ai not configured');
  }
  text = text.replace(/[*#_`]/g, '').replace(/\s+/g, ' ').trim();
  if (!text) throw new Error('ai error: empty answer');
  return text.length > 700 ? text.slice(0, 700).replace(/\s\S*$/, '') + '…' : text;
}

async function explainCached(db: any, t: { id: string; questions: Q[] }, index: number) {
  const q = t.questions?.[index];
  if (!q) throw new Error('test not found');
  if (q.explain && q.explain.trim()) return { explain: q.explain, cached: true };
  if (!validQuestion(q)) throw new Error('invalid question');
  const text = await generate(q);
  const { error } = await db.rpc('_set_explain', { p_test: t.id, p_index: index, p_text: text });
  if (error) console.error('cache failed', error.message);
  return { explain: text };
}

Deno.serve(async (req) => {
  const asked = req.headers.get('access-control-request-headers');
  if (asked) cors = { ...cors, 'Access-Control-Allow-Headers': asked };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  try {
    const db = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey(), { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));

    // Guest who took a shared survey by link (no account): proven by the share code + their attempt id.
    if (typeof body.attempt_id === 'string' && typeof body.share_code === 'string') {
      const index = Number(body.index);
      const { data: g } = await db.from('guest_attempts').select('test_id').eq('id', body.attempt_id).maybeSingle();
      if (!g || !Number.isInteger(index)) return json({ error: 'forbidden' }, 403);
      const { data: t } = await db.from('tests').select('id, questions, share_code').eq('id', g.test_id).single();
      if (!t || t.share_code !== body.share_code) return json({ error: 'forbidden' }, 403);
      return json(await explainCached(db, t, index));
    }

    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: au } = await db.auth.getUser(jwt);
    if (!au?.user) return json({ error: 'ai error: not authenticated (сайтқа қайта кіріңіз)' }, 401);
    const { data: me } = await db.from('profiles').select('role, is_blocked').eq('id', au.user.id).single();
    if (!me || me.is_blocked) return json({ error: 'forbidden' }, 403);
    const isAdmin = me.role === 'admin';

    // admin draft in the editor
    if (body.question) {
      if (!isAdmin) return json({ error: 'forbidden' }, 403);
      if (!validQuestion(body.question)) return json({ error: 'invalid question' }, 400);
      return json({ explain: await generate(body.question) });
    }

    const index = Number(body.index);
    if (typeof body.test_id !== 'string' || !Number.isInteger(index)) return json({ error: 'invalid request' }, 400);
    const { data: t } = await db.from('tests').select('id, questions').eq('id', body.test_id).single();
    const q = t?.questions?.[index] as Q | undefined;
    if (!t || !q) return json({ error: 'test not found' }, 404);
    if (!isAdmin) {
      const { data: a } = await db.from('test_attempts').select('user_id').eq('test_id', t.id).eq('user_id', au.user.id).maybeSingle();
      if (!a) return json({ error: 'forbidden' }, 403);  // answers stay hidden until the student has submitted
    }
    return json(await explainCached(db, t, index));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(msg);
    return json({ error: msg }, msg === 'ai not configured' ? 503 : 500);
  }
});
