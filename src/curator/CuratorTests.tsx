import { useEffect, useMemo, useState } from 'react';
import { GroupRating } from '../components/GroupRating';
import { IChevL, IEdit, IPlus, ITrash } from '../components/Icons';
import { Avatar, Confirm, Empty, PageLoader, ProgressBar, Spinner, StatCard } from '../components/ui';
import { friendlyError } from '../lib/api';
import { useSession } from '../lib/auth';
import { formatDate, timeAgo } from '../lib/constants';
import { Link, navigate } from '../lib/router';
import { useToast } from '../lib/toast';
import type { Test, TestQuestion } from '../lib/types';
import { useAsync } from '../lib/useAsync';

const blankQ = (): TestQuestion => ({ q: '', options: ['', '', '', ''], answer: 0 });
const LETTERS = 'ABCD';

export default function CuratorTests() {
  const { api } = useSession();
  const toast = useToast();
  const { data, loading, reload } = useAsync(() => api.curatorTests(), []);
  const [del, setDel] = useState<Test | null>(null);
  const [busy, setBusy] = useState(false);
  if (loading && !data) return <PageLoader />;
  const tests = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Сауалнама / Тесттер</h1>
          <p className="mt-1 text-ink/55">Тесттер тек сіздің оқушыларыңызға ашық. Әр дұрыс жауап — 1 ұпай.</p>
        </div>
        <Link to="/curator/tests/new" className="btn btn-primary"><IPlus className="h-5 w-5" /> Жаңа тест</Link>
      </div>

      {tests.length === 0 ? (
        <Empty title="Әзірге тест жоқ" text="Сұрақтар мен 4 жауап нұсқасын жазып, бірінші тестіңізді құрастырыңыз."
          action={<Link to="/curator/tests/new" className="btn btn-primary"><IPlus className="h-5 w-5" /> Тест құрастыру</Link>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tests.map((t) => (
            <article key={t.id} className="card flex flex-col p-5">
              <div className="flex flex-wrap gap-1.5">
                <span className="chip bg-sun/35 text-ink">📝 {t.questions.length} сұрақ</span>
                <span className={`chip ${t.published ? 'bg-haze text-brand' : 'bg-mist text-ink/50'}`}>{t.published ? 'Жарияланған' : 'Жасырын'}</span>
              </div>
              <h3 className="mt-3 text-lg font-extrabold leading-snug [overflow-wrap:anywhere]">{t.title}</h3>
              {t.description && <p className="mt-1 line-clamp-2 text-sm text-ink/55">{t.description}</p>}
              <p className="mt-2 text-xs text-ink/40">{formatDate(t.created_at)}</p>
              <div className="mt-auto flex items-center gap-2 pt-4">
                <Link to={`/curator/tests/${t.id}`} className="btn btn-soft btn-sm flex-1">Нәтижелер</Link>
                <Link to={`/curator/tests/${t.id}/edit`} className="icon-btn !h-10 !w-10" aria-label="Өңдеу" title="Өңдеу"><IEdit className="h-[18px] w-[18px]" /></Link>
                <button className="icon-btn !h-10 !w-10 hover:!text-rose-500" onClick={() => setDel(t)} aria-label="Жою" title="Жою"><ITrash className="h-[18px] w-[18px]" /></button>
              </div>
            </article>
          ))}
        </div>
      )}
      <Confirm open={!!del} onClose={() => setDel(null)} busy={busy} title="Тест жойылсын ба?"
        text={`«${del?.title}» және оның барлық нәтижелері жойылады.`}
        onConfirm={async () => {
          setBusy(true);
          try { await api.deleteTest(del!.id); toast.success('Тест жойылды'); setDel(null); reload(); }
          catch (e) { toast.error(friendlyError(e)); } finally { setBusy(false); }
        }} />
    </div>
  );
}

export function TestEditor({ id }: { id?: string }) {
  const { api } = useSession();
  const toast = useToast();
  const existing = useAsync(() => (id ? api.curatorTests().then((l) => l.find((t) => t.id === id) ?? null) : Promise.resolve(null)), [id]);
  const results = useAsync(() => (id ? api.testResults(id) : Promise.resolve([])), [id]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [published, setPublished] = useState(true);
  const [qs, setQs] = useState<TestQuestion[]>([blankQ()]);
  const [busy, setBusy] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    const t = existing.data;
    if (t) { setTitle(t.title); setDesc(t.description); setPublished(t.published); setQs(t.questions.map((q) => ({ ...q, options: [...q.options] }))); }
  }, [existing.data]);

  const problems = useMemo(() => qs.map((q) => !q.q.trim() || q.options.some((o) => !o.trim())), [qs]);
  if (existing.loading) return <PageLoader />;
  if (id && !existing.data) return <Empty title="Тест табылмады" action={<Link to="/curator/tests" className="btn btn-primary">Тесттерге</Link>} />;

  const upd = (i: number, patch: Partial<TestQuestion>) => setQs((x) => x.map((q, k) => (k === i ? { ...q, ...patch } : q)));
  const updOpt = (i: number, j: number, v: string) => setQs((x) => x.map((q, k) => (k === i ? { ...q, options: q.options.map((o, m) => (m === j ? v : o)) } : q)));

  const save = async () => {
    setShowErrors(true);
    if (!title.trim()) return toast.error('Тест атауын жазыңыз');
    const bad = problems.findIndex(Boolean);
    if (bad >= 0) {
      document.getElementById(`q-${bad}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return toast.error(`${bad + 1}-сұрақ толық емес`, 'Сұрақ мәтіні және 4 жауап нұсқасы керек');
    }
    setBusy(true);
    try {
      await api.saveTest({ id, title, description: desc, published, questions: qs.map((q) => ({ q: q.q.trim(), options: q.options.map((o) => o.trim()), answer: q.answer })) });
      toast.success(id ? 'Тест сақталды' : 'Тест құрастырылды', published ? 'Оқушыларыңызға хабарлама жіберілді' : undefined);
      navigate('/curator/tests');
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/curator/tests')}><IChevL className="h-4 w-4" /> Тесттер</button>
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{id ? 'Тестті өңдеу' : 'Жаңа тест'}</h1>
      {id && (results.data?.length ?? 0) > 0 && (
        <p className="rounded-2xl bg-sun/25 px-4 py-3 text-sm font-semibold text-ink/75">⚠️ Бұл тестті {results.data!.length} оқушы тапсырып қойған. Сұрақтарды өзгертсеңіз, олардың бұрынғы ұпайы сақталады.</p>
      )}

      <div className="card space-y-4 p-5 sm:p-6">
        <label className="block"><span className="label">Тест атауы</span>
          <input className={`input ${showErrors && !title.trim() ? '!ring-2 !ring-rose-300' : ''}`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="мысалы: Python негіздері — 1-апта" />
        </label>
        <label className="block"><span className="label">Сипаттама (міндетті емес)</span>
          <textarea className="input min-h-20" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={1000} placeholder="Тест не туралы?" />
        </label>
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" className="h-5 w-5 accent-[#17404E]" checked={published} onChange={(e) => setPublished(e.target.checked)} />
          <span className="font-semibold">Оқушыларға бірден жариялау</span>
        </label>
      </div>

      {qs.map((q, i) => (
        <div key={i} id={`q-${i}`} className={`card space-y-3 p-5 sm:p-6 ${showErrors && problems[i] ? 'ring-2 ring-rose-300' : ''}`}>
          <div className="flex items-center justify-between gap-3">
            <span className="chip bg-haze text-brand">{i + 1}-сұрақ</span>
            {qs.length > 1 && (
              <button className="icon-btn !h-9 !w-9 hover:!text-rose-500" onClick={() => setQs((x) => x.filter((_, k) => k !== i))} aria-label={`${i + 1}-сұрақты жою`}><ITrash className="h-4 w-4" /></button>
            )}
          </div>
          <textarea className="input min-h-20" value={q.q} onChange={(e) => upd(i, { q: e.target.value })} placeholder="Сұрақ мәтіні" maxLength={500} />
          <p className="text-xs font-semibold text-ink/45">Дұрыс жауапты белгілеңіз:</p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {q.options.map((o, j) => (
              <div key={j} className={`flex items-center gap-2 rounded-2xl p-1.5 pl-2 ring-2 transition ${q.answer === j ? 'bg-emerald-50 ring-emerald-300 dark:bg-emerald-500/10' : 'bg-mist ring-transparent'}`}>
                <button
                  type="button"
                  onClick={() => upd(i, { answer: j })}
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-extrabold transition ${q.answer === j ? 'bg-emerald-500 text-white' : 'bg-card text-ink/50 hover:text-brand'}`}
                  aria-label={`${LETTERS[j]} — дұрыс жауап`}
                  aria-pressed={q.answer === j}
                >{q.answer === j ? '✓' : LETTERS[j]}</button>
                <input className="min-w-0 flex-1 bg-transparent px-1 py-2 text-[15px] font-semibold outline-none placeholder:text-ink/30" value={o} onChange={(e) => updOpt(i, j, e.target.value)} placeholder={`${LETTERS[j]} нұсқасы`} maxLength={200} />
              </div>
            ))}
          </div>
        </div>
      ))}

      <button className="btn btn-soft w-full" onClick={() => setQs((x) => [...x, blankQ()])} disabled={qs.length >= 50}><IPlus className="h-5 w-5" /> Сұрақ қосу</button>

      <div className="card p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-ink/50">{qs.length} сұрақ</span>
          <button className="btn btn-primary" onClick={save} disabled={busy}>{busy && <Spinner className="h-4 w-4 border-white/40 border-t-white" />} {id ? 'Сақтау' : 'Тестті жариялау'}</button>
        </div>
      </div>
    </div>
  );
}

export function TestResults({ id }: { id: string }) {
  const { api } = useSession();
  const test = useAsync(() => api.curatorTests().then((l) => l.find((t) => t.id === id) ?? null), [id]);
  const res = useAsync(() => api.testResults(id), [id]);
  const students = useAsync(() => api.curatorStudents(), []);
  if (test.loading || res.loading) return <PageLoader />;
  const t = test.data;
  if (!t) return <Empty title="Тест табылмады" action={<Link to="/curator/tests" className="btn btn-primary">Тесттерге</Link>} />;
  const rows = res.data ?? [];
  const done = new Set(rows.map((r) => r.user_id));
  const missing = (students.data ?? []).filter((s) => !done.has(s.id));
  const avg = rows.length ? Math.round((rows.reduce((s, r) => s + r.score / r.max_score, 0) / rows.length) * 100) : null;

  return (
    <div className="space-y-6">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/curator/tests')}><IChevL className="h-4 w-4" /> Тесттер</button>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight [overflow-wrap:anywhere] sm:text-3xl">{t.title}</h1>
          <p className="mt-1 text-ink/55">{t.questions.length} сұрақ · {formatDate(t.created_at)}</p>
        </div>
        <Link to={`/curator/tests/${t.id}/edit`} className="btn btn-soft btn-sm self-start sm:self-auto"><IEdit className="h-4 w-4" /> Өңдеу</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard icon="✅" label="Тапсырды" value={rows.length} tone="#5E9A45" />
        <StatCard icon="⏳" label="Тапсырмады" value={missing.length} tone="#2A6B7F" />
        <div className="col-span-2 lg:col-span-1"><StatCard icon="🎯" label="Орташа нәтиже" value={avg == null ? '—' : `${avg}%`} tone="#2683A3" /></div>
      </div>
      <section>
        <h2 className="mb-3 font-extrabold">Нәтижелер</h2>
        {rows.length === 0 ? <div className="card p-6 text-center text-ink/50">Әзірге ешкім тапсырмаған.</div> : (
          <div className="card divide-y divide-haze">
            {rows.map((r, i) => (
              <div key={r.user_id} className="flex items-center gap-3 p-4 sm:px-6">
                <span className="w-6 shrink-0 text-center font-extrabold text-ink/40">{i + 1}</span>
                <Avatar id={r.avatar} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold">{r.first_name} {r.last_name}</p>
                  <p className="truncate text-xs text-ink/45">{r.stream ? `${r.stream} поток · ` : ''}{timeAgo(r.created_at)}</p>
                  <ProgressBar value={(r.score / r.max_score) * 100} className="mt-1.5 !h-1.5 max-w-48" tone="sun" />
                </div>
                <span className="chip shrink-0 bg-sun/30 text-ink">{r.score}/{r.max_score}</span>
              </div>
            ))}
          </div>
        )}
      </section>
      {missing.length > 0 && (
        <section>
          <h2 className="mb-3 font-extrabold">Әлі тапсырмағандар ({missing.length})</h2>
          <div className="flex flex-wrap gap-2">
            {missing.map((s) => <span key={s.id} className="chip bg-card !px-3 !py-1.5 text-sm text-ink/70 shadow-[0_2px_0_var(--edge)]">{s.first_name} {s.last_name}</span>)}
          </div>
        </section>
      )}
    </div>
  );
}

export function CuratorRating() {
  const { api } = useSession();
  const { data, loading } = useAsync(() => api.groupRating(), []);
  if (loading && !data) return <PageLoader />;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Оқушылар рейтингі</h1>
        <p className="mt-1 text-ink/55">Сіздің тесттеріңізден жинаған ұпайлар бойынша</p>
      </div>
      <GroupRating rows={data ?? []} />
    </div>
  );
}

