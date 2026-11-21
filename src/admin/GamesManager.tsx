import { useState, type FormEvent } from 'react';
import { IEdit, IPlay, IPlus, ITrash } from '../components/Icons';
import { CategoryChip, Confirm, Modal, PageLoader, Spinner } from '../components/ui';
import { friendlyError } from '../lib/api';
import { useSession } from '../lib/auth';
import { CATEGORIES, DIFFICULTY, GAME_TYPES } from '../lib/constants';
import { useToast } from '../lib/toast';
import type { Game, GameType } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { AdminHeader } from './AdminHeader';

const TEMPLATES: Record<GameType, unknown> = {
  quiz: { time_per_question: 20, questions: [{ q: 'Сұрақ мәтіні?', options: ['A', 'B', 'C', 'D'], answer: 0, explain: 'Түсіндірме' }] },
  pairs: { pairs: [{ term: 'Термин', definition: 'Анықтама' }, { term: 'Термин 2', definition: 'Анықтама 2' }] },
  code_puzzle: { levels: [{ task: 'Тапсырма', lang: 'python', lines: ['x = 1', 'print(x)'] }] },
  find_mistake: { items: [{ lang: 'python', task: 'Қатені тап', code: ['x = 5', 'print(X)'], wrong_line: 1, explain: 'Айнымалы аты сәйкес емес', fix: 'print(x)' }] },
  true_false: { statements: [{ text: 'Тұжырым', answer: true, explain: 'Түсіндірме' }] },
  drag_drop: { buckets: ['1-топ', '2-топ'], items: [{ text: 'Элемент', bucket: 0 }, { text: 'Элемент 2', bucket: 1 }] },
  computer_parts: { parts: [{ id: 'cpu', name: 'Процессор', hint: 'Есептеулерді орындайды' }, { id: 'ram', name: 'Жедел жад', hint: 'Уақытша жад' }] },
  maze: { levels: [{ grid: ['S..', '.#.', '..G'], max_commands: 4 }] },
};

/** Light structural validation so a typo in JSON can't break a game for students. */
function validate(type: GameType, d: any): string | null {
  const arr = (k: string) => Array.isArray(d?.[k]) && d[k].length > 0;
  switch (type) {
    case 'quiz': return arr('questions') && d.questions.every((q: any) => q.q && Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(q.answer) && q.answer < q.options.length) ? null : 'questions: [{q, options[], answer}] қажет';
    case 'pairs': return arr('pairs') && d.pairs.length >= 2 && d.pairs.every((p: any) => p.term && p.definition) ? null : 'pairs: кемінде 2 {term, definition}';
    case 'code_puzzle': return arr('levels') && d.levels.every((l: any) => l.task && Array.isArray(l.lines) && l.lines.length >= 2) ? null : 'levels: [{task, lang, lines[]}] қажет';
    case 'find_mistake': return arr('items') && d.items.every((i: any) => Array.isArray(i.code) && Number.isInteger(i.wrong_line) && i.wrong_line < i.code.length) ? null : 'items: [{code[], wrong_line, explain}] қажет';
    case 'true_false': return arr('statements') && d.statements.every((s: any) => s.text && typeof s.answer === 'boolean') ? null : 'statements: [{text, answer: true/false}] қажет';
    case 'drag_drop': return arr('buckets') && arr('items') && d.items.every((i: any) => i.text && Number.isInteger(i.bucket) && i.bucket < d.buckets.length) ? null : 'buckets[] және items: [{text, bucket}] қажет';
    case 'computer_parts': return arr('parts') && d.parts.every((p: any) => ['cpu', 'ram', 'gpu', 'psu', 'ssd', 'motherboard', 'fan'].includes(p.id) && p.name) ? null : 'parts id: cpu, ram, gpu, psu, ssd, motherboard, fan';
    case 'maze': return arr('levels') && d.levels.every((l: any) => Array.isArray(l.grid) && l.grid.join('').includes('S') && l.grid.join('').includes('G') && l.max_commands > 0) ? null : 'levels: [{grid[] (S, G, #, .), max_commands}] қажет';
  }
}

export default function GamesManager() {
  const { api } = useSession();
  const toast = useToast();
  const { data, loading, reload } = useAsync(async () => {
    const [games, stats] = await Promise.all([api.listGames(), api.adminStats()]);
    return { games, stats };
  }, []);
  const [edit, setEdit] = useState<Partial<Game> | null>(null);
  const [del, setDel] = useState<Game | null>(null);

  if (loading || !data) return <PageLoader />;
  const plays: Record<string, number> = {};
  data.stats.popular_games.forEach((g) => (plays[g.title] = g.plays));

  const toggle = async (g: Game) => {
    try { await api.saveGame({ ...g, published: !g.published }); toast.success(g.published ? 'Ойын жасырылды' : 'Ойын жарияланды'); reload(); }
    catch (e) { toast.error(friendlyError(e)); }
  };

  return (
    <div>
      <AdminHeader title="Ойындарды басқару" sub={`${data.games.length} ойын · 8 түрлі ойын механикасы`} action={
        <button className="btn btn-primary" onClick={() => setEdit({ type: 'quiz', category: 'computer_literacy', difficulty: 'easy', xp_reward: 60, published: true, sort: data.games.length + 1, data: TEMPLATES.quiz, title: '', description: '' })}><IPlus /> Жаңа ойын</button>
      } />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.games.map((g) => {
          const t = GAME_TYPES[g.type];
          return (
            <div key={g.id} className={`card flex flex-col p-5 ${g.published ? '' : 'opacity-70'}`}>
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-haze text-2xl">{t.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-extrabold leading-snug">{g.title}</p>
                  <p className="text-xs font-semibold text-ink/45">{t.label} · {DIFFICULTY[g.difficulty]?.label} · 💎 {g.xp_reward}</p>
                </div>
              </div>
              <div className="mt-3"><CategoryChip slug={g.category} small /></div>
              <p className="mt-2 line-clamp-2 text-sm text-ink/55">{g.description}</p>
              <div className="mt-auto flex items-center gap-2 pt-4">
                <button onClick={() => toggle(g)} className={`rounded-full px-3 py-1 text-xs font-bold ${g.published ? 'bg-emerald-50 text-emerald-700' : 'bg-haze text-ink/55'}`}>{g.published ? '● Жарияланды' : '○ Жасырын'}</button>
                <span className="text-xs font-semibold text-ink/40"><IPlay className="inline h-3 w-3" /> {plays[g.title] ?? 0}</span>
                <span className="flex-1" />
                <button className="icon-btn !h-9 !w-9" aria-label="Өңдеу" onClick={() => setEdit(g)}><IEdit className="h-4 w-4" /></button>
                <button className="icon-btn !h-9 !w-9 hover:!text-rose-500" aria-label="Жою" onClick={() => setDel(g)}><ITrash className="h-4 w-4" /></button>
              </div>
            </div>
          );
        })}
      </div>
      {edit && <GameForm game={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
      <Confirm open={!!del} onClose={() => setDel(null)} title={`«${del?.title}» жойылсын ба?`} text="Ойынның барлық нәтижелері де жойылады. Оқушылардың кристалдары сақталады."
        onConfirm={async () => { try { await api.deleteGame(del!.id); toast.success('Ойын жойылды'); setDel(null); reload(); } catch (e) { toast.error(friendlyError(e)); } }} />
    </div>
  );
}

function GameForm({ game, onClose, onSaved }: { game: Partial<Game>; onClose: () => void; onSaved: () => void }) {
  const { api } = useSession();
  const toast = useToast();
  const [g, setG] = useState(game);
  const [json, setJson] = useState(JSON.stringify(game.data ?? {}, null, 2));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isNew = !game.id;

  const changeType = (type: GameType) => {
    setG({ ...g, type });
    if (isNew) setJson(JSON.stringify(TEMPLATES[type], null, 2));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    let parsed: unknown;
    try { parsed = JSON.parse(json); } catch (x) { return setErr('JSON қатесі: ' + (x as Error).message); }
    const v = validate(g.type as GameType, parsed);
    if (v) return setErr(v);
    if (!g.title?.trim()) return setErr('Атауын жазыңыз');
    setErr(null);
    setBusy(true);
    try {
      await api.saveGame({ ...g, title: g.title!.trim(), data: parsed, slug: g.slug || `${g.type}-${Date.now().toString(36)}` });
      toast.success(isNew ? 'Ойын қосылды' : 'Ойын сақталды');
      onSaved();
    } catch (x) { setErr(friendlyError(x)); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={isNew ? 'Жаңа ойын' : 'Ойынды өңдеу'} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className="label">Атауы</span><input className="input" value={g.title ?? ''} onChange={(e) => setG({ ...g, title: e.target.value })} /></label>
          <label className="block sm:col-span-2"><span className="label">Сипаттама</span><input className="input" value={g.description ?? ''} onChange={(e) => setG({ ...g, description: e.target.value })} /></label>
          <label className="block"><span className="label">Ойын түрі</span>
            <select className="input" value={g.type} onChange={(e) => changeType(e.target.value as GameType)} disabled={!isNew}>
              {(Object.keys(GAME_TYPES) as GameType[]).map((t) => <option key={t} value={t}>{GAME_TYPES[t].icon} {GAME_TYPES[t].label}</option>)}
            </select>
          </label>
          <label className="block"><span className="label">Санат</span>
            <select className="input" value={g.category} onChange={(e) => setG({ ...g, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.icon} {c.label}</option>)}
            </select>
          </label>
          <label className="block"><span className="label">Қиындығы</span>
            <select className="input" value={g.difficulty} onChange={(e) => setG({ ...g, difficulty: e.target.value as Game['difficulty'] })}>
              {Object.entries(DIFFICULTY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="label">Кристалл (макс.)</span><input type="number" min={0} max={1000} className="input" value={g.xp_reward ?? 0} onChange={(e) => setG({ ...g, xp_reward: Number(e.target.value) })} /></label>
            <label className="block"><span className="label">Реті</span><input type="number" className="input" value={g.sort ?? 100} onChange={(e) => setG({ ...g, sort: Number(e.target.value) })} /></label>
          </div>
        </div>
        <label className="block">
          <span className="label">Ойын мазмұны (JSON)</span>
          <textarea className="input code min-h-72 !text-[13px] leading-relaxed" spellCheck={false} value={json} onChange={(e) => setJson(e.target.value)} />
        </label>
        <label className="flex items-center gap-3"><input type="checkbox" className="h-5 w-5 accent-[#17404E]" checked={!!g.published} onChange={(e) => setG({ ...g, published: e.target.checked })} /> <span className="font-bold">Оқушыларға жариялау</span></label>
        {err && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{err}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Бас тарту</button>
          <button className="btn btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4 border-white/40 border-t-white" />} Сақтау</button>
        </div>
      </form>
    </Modal>
  );
}
