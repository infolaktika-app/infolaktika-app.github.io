import { useState } from 'react';
import { GroupRating } from '../components/GroupRating';
import { IArrowR, ICheck, IChevL, IClipboard } from '../components/Icons';
import { Empty, PageLoader, ProgressBar, Spinner, Tabs } from '../components/ui';
import { friendlyError } from '../lib/api';
import { useSession } from '../lib/auth';
import { formatDate } from '../lib/constants';
import { Link, navigate } from '../lib/router';
import { useToast } from '../lib/toast';
import type { TestAttempt } from '../lib/types';
import { useAsync } from '../lib/useAsync';

const pct = (s: number, m: number) => (m ? Math.round((s / m) * 100) : 0);

export default function TestsPage() {
  const { api, profile } = useSession();
  const [tab, setTab] = useState<'tests' | 'rating'>('tests');
  const tests = useAsync(() => api.myTests(), []);
  const rating = useAsync(() => api.groupRating(), []);

  if (tests.loading) return <PageLoader />;
  const list = tests.data ?? [];
  const todo = list.filter((t) => t.score === null);
  const done = list.filter((t) => t.score !== null);

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#2A6B7F] to-[#17404E] p-6 text-white sm:p-8">
        <div className="dot-grid absolute inset-0 opacity-20" />
        <div className="relative flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15"><IClipboard className="h-7 w-7" /></span>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold sm:text-3xl">Тесттер</h1>
            <p className="text-white/75">Кураторыңның тесттері · әр дұрыс жауап = 1 ұпай + 10 💎</p>
          </div>
        </div>
      </header>

      {!profile.curator_id && (
        <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-ink/70">Тесттер ашылуы үшін профильде кураторыңды таңда.</p>
          <Link to="/app/profile" className="btn btn-primary btn-sm">Куратор таңдау <IArrowR className="h-4 w-4" /></Link>
        </div>
      )}

      <Tabs value={tab} onChange={setTab} items={[{ value: 'tests', label: `Тесттер (${list.length})` }, { value: 'rating', label: 'Топ рейтингі' }]} />

      {tab === 'tests' ? (
        list.length === 0 ? (
          <Empty title="Әзірге тест жоқ" text={profile.curator_id ? 'Куратор жаңа тест қосқанда, хабарлама келеді.' : undefined} />
        ) : (
          <div className="space-y-6">
            {todo.length > 0 && (
              <section>
                <h2 className="mb-3 font-extrabold">Тапсыру керек ({todo.length})</h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {todo.map((t) => (
                    <Link key={t.id} to={`/app/tests/${t.id}`} className="card card-hover flex flex-col p-5">
                      <span className="chip self-start bg-sun/35 text-ink">📝 {t.question_count} сұрақ</span>
                      <h3 className="mt-3 text-lg font-extrabold leading-snug">{t.title}</h3>
                      {t.description && <p className="mt-1 line-clamp-2 text-sm text-ink/55">{t.description}</p>}
                      <div className="mt-auto flex items-center justify-between pt-4 text-xs font-semibold text-ink/45">
                        <span className="truncate">{t.curator_name} · {formatDate(t.created_at)}</span>
                        <span className="btn btn-primary btn-sm shrink-0">Бастау</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {done.length > 0 && (
              <section>
                <h2 className="mb-3 font-extrabold">Тапсырылған ({done.length})</h2>
                <div className="card divide-y divide-haze">
                  {done.map((t) => (
                    <Link key={t.id} to={`/app/tests/${t.id}`} className="flex items-center gap-3 p-4 transition hover:bg-mist/60 sm:px-6">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-haze text-emerald-600"><ICheck className="h-5 w-5" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-extrabold">{t.title}</p>
                        <p className="truncate text-xs text-ink/45">{t.curator_name} · {formatDate(t.done_at)}</p>
                      </div>
                      <span className="chip shrink-0 bg-sun/30 text-ink">{t.score}/{t.max_score}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )
      ) : rating.loading ? <PageLoader /> : (
        <GroupRating rows={rating.data ?? []} meId={profile.id} emptyText={profile.curator_id ? undefined : 'Алдымен кураторыңды таңда.'} />
      )}
    </div>
  );
}

function Review({ questions, attempt }: { questions: { q: string; options: string[] }[]; attempt: TestAttempt }) {
  return (
    <div className="space-y-4">
      {questions.map((q, i) => {
        const mine = attempt.answers[i];
        const right = attempt.correct[i];
        return (
          <div key={i} className="card p-5">
            <p className="font-extrabold"><span className="text-ink/40">{i + 1}.</span> {q.q}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {q.options.map((o, j) => {
                const cls = j === right ? 'bg-emerald-50 text-emerald-800 ring-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-200'
                  : j === mine ? 'bg-rose-50 text-rose-700 ring-rose-300 dark:bg-rose-500/15 dark:text-rose-200' : 'bg-mist text-ink/60 ring-transparent';
                return (
                  <div key={j} className={`flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-semibold ring-2 ${cls}`}>
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-card text-xs font-extrabold">{'ABCD'[j]}</span>
                    <span className="min-w-0 flex-1 break-words">{o}</span>
                    {j === right && <span>✓</span>}
                    {j === mine && j !== right && <span>✗</span>}
                  </div>
                );
              })}
            </div>
            {mine === null || mine === undefined ? <p className="mt-2 text-xs font-semibold text-ink/45">Жауап берілмеген</p> : null}
          </div>
        );
      })}
    </div>
  );
}

export function TestTake({ id }: { id: string }) {
  const { api } = useSession();
  const toast = useToast();
  const { data: t, loading, error, setData } = useAsync(() => api.getTest(id), [id]);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [busy, setBusy] = useState(false);

  if (loading) return <PageLoader />;
  if (error || !t) return <Empty title="Тест табылмады" text={friendlyError(error)} action={<Link to="/app/tests" className="btn btn-primary">Тесттерге</Link>} />;

  const back = <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/tests')}><IChevL className="h-4 w-4" /> Тесттер</button>;

  if (t.attempt) {
    const a = t.attempt;
    const p = pct(a.score, a.max_score);
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        {back}
        <div className="card relative overflow-hidden p-6 text-center sm:p-8">
          <div className="text-5xl">{p >= 80 ? '🏆' : p >= 50 ? '👏' : '💪'}</div>
          <h1 className="mt-3 text-2xl font-extrabold">{t.title}</h1>
          <p className="mt-1 text-ink/55">Нәтиже: <b className="text-ink">{a.score} / {a.max_score}</b> · {p}%</p>
          <ProgressBar value={p} className="mx-auto mt-4 max-w-sm" tone="sun" />
          <p className="mt-3 text-xs text-ink/45">Тест бір рет қана тапсырылады. Төменде қателеріңді қарап шық.</p>
        </div>
        <Review questions={t.questions} attempt={a} />
      </div>
    );
  }

  const q = t.questions[i];
  const total = t.questions.length;
  const answered = answers.filter((x) => x !== null && x !== undefined).length;
  const pick = (j: number) => setAnswers((x) => { const n = [...x]; n[i] = j; return n; });

  const submit = async () => {
    setBusy(true);
    try {
      const full = t.questions.map((_, k) => answers[k] ?? null);
      const r = await api.submitTest(t.id, full);
      toast.reward(r, `${r.score}/${r.max_score} дұрыс!`);
      setData({ ...t, attempt: { score: r.score, max_score: r.max_score, answers: full, correct: r.correct, created_at: new Date().toISOString() } });
      window.scrollTo({ top: 0 });
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {back}
      <div>
        <p className="text-sm font-semibold text-ink/45">{t.curator_name}</p>
        <h1 className="text-2xl font-extrabold leading-tight">{t.title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <ProgressBar value={((i + 1) / total) * 100} className="flex-1" />
        <span className="shrink-0 text-sm font-bold text-ink/55">{i + 1} / {total}</span>
      </div>
      <div className="card p-5 sm:p-7">
        <p className="text-lg font-extrabold leading-snug sm:text-xl">{q.q}</p>
        <div className="mt-5 grid gap-3">
          {q.options.map((o, j) => {
            const on = answers[i] === j;
            return (
              <button
                key={j}
                onClick={() => pick(j)}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left font-semibold ring-2 transition active:scale-[.99] ${on ? 'bg-haze text-brand ring-brand' : 'bg-mist ring-transparent hover:ring-lavender/60'}`}
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-extrabold ${on ? 'bg-brand text-white' : 'bg-card text-ink/60'}`}>{'ABCD'[j]}</span>
                <span className="min-w-0 flex-1 break-words">{o}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <button className="btn btn-ghost" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}><IChevL className="h-4 w-4" /> Артқа</button>
        {i < total - 1 ? (
          <button className="btn btn-primary" onClick={() => setI((x) => x + 1)} disabled={answers[i] === undefined || answers[i] === null}>Келесі <IArrowR className="h-4 w-4" /></button>
        ) : (
          <button className="btn btn-sun" onClick={submit} disabled={busy || answered < total}>{busy && <Spinner className="h-4 w-4" />} Тапсыру</button>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {t.questions.map((_, k) => (
          <button
            key={k}
            onClick={() => setI(k)}
            aria-label={`${k + 1}-сұрақ`}
            className={`h-8 w-8 rounded-full text-xs font-extrabold transition ${k === i ? 'bg-brand text-white' : answers[k] !== undefined && answers[k] !== null ? 'bg-sun/60 text-ink' : 'bg-card text-ink/45 shadow-[0_2px_0_var(--edge)]'}`}
          >{k + 1}</button>
        ))}
      </div>
    </div>
  );
}
