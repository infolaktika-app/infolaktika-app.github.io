import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { GroupRating } from '../components/GroupRating';
import { IArrowR, ICheck, IChevL, IClipboard, IBulb, IRefresh } from '../components/Icons';
import { Empty, PageLoader, ProgressBar, Spinner, Tabs } from '../components/ui';
import { friendlyError } from '../lib/api';
import { useSession } from '../lib/auth';
import { formatDate } from '../lib/constants';
import { Link, navigate } from '../lib/router';
import { useToast } from '../lib/toast';
import { cleanAnswer, hasAnswer, includesOpt, isMulti, LETTERS, sameAnswer } from '../lib/testLogic';
import type { TestAnswer, TestAttempt, TestForStudent } from '../lib/types';
import { useAsync } from '../lib/useAsync';

const pct = (s: number, m: number) => (m ? Math.round((s / m) * 100) : 0);

export default function TestsPage() {
  const { api, profile } = useSession();
  const [tab, setTab] = useState<'tests' | 'rating'>('tests');
  const tests = useAsync(() => api.myTests(), []);
  const rating = useAsync(() => api.testRating(), []);

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
            <h1 className="text-2xl font-extrabold sm:text-3xl">Сауалнамалар</h1>
            <p className="text-white/75">Әр дұрыс жауап = 1 ұпай + 10 💎 · әр сауалнама бір рет тапсырылады</p>
          </div>
        </div>
      </header>

      <Tabs value={tab} onChange={setTab} items={[{ value: 'tests', label: `Сауалнамалар (${list.length})` }, { value: 'rating', label: 'Ұпай рейтингі' }]} />

      {tab === 'tests' ? (
        list.length === 0 ? (
          <Empty title="Әзірге сауалнама жоқ" text="Жаңа сауалнама қосылғанда, хабарлама келеді." />
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
                        <span className="truncate">{formatDate(t.created_at)}</span>
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
                        <p className="truncate text-xs text-ink/45">Тапсырылды: {formatDate(t.done_at)}</p>
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
        <GroupRating rows={rating.data ?? []} meId={profile.id} />
      )}
    </div>
  );
}

/** Explanation of a wrongly answered question (written by AI on the server; students just see "Түсіндірме"). Fetched lazily (when the card scrolls into view) and cached on the server. */
function ExplainBox({ fetchText, initial }: { fetchText: () => Promise<string>; initial: string | null | undefined }) {
  const [text, setText] = useState<string | null>(initial ?? null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [err, setErr] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setState('loading');
    try { setText(await fetchText()); setState('idle'); }
    catch { setErr('Түсіндірме әзірге дайын емес.'); setState('error'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (text || !ref.current) return;
    if (typeof IntersectionObserver === 'undefined') { load(); return; }
    const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: '200px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [text, load]);

  return (
    <div ref={ref} className="mt-4 rounded-2xl bg-gradient-to-br from-haze to-mist p-4 ring-1 ring-lavender/40">
      <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-brand"><IBulb className="h-4 w-4" /> Түсіндірме</p>
      {text ? (
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink/80">{text}</p>
      ) : state === 'error' ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-ink/60">
          <span>{err}</span>
          <button className="btn btn-ghost btn-sm" onClick={load}><IRefresh className="h-4 w-4" /> Қайталау</button>
        </div>
      ) : (
        <div className="mt-2 space-y-2" aria-live="polite">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink/50"><Spinner className="h-4 w-4" /> Түсіндірме жүктелуде…</p>
          <div className="h-2.5 w-full animate-pulse rounded-full bg-lavender/30" />
          <div className="h-2.5 w-2/3 animate-pulse rounded-full bg-lavender/30" />
        </div>
      )}
    </div>
  );
}

export type ReviewAttempt = Pick<TestAttempt, 'answers' | 'correct' | 'explain'>;

export function Review({ questions, attempt, explain }: { questions: TestForStudent['questions']; attempt: ReviewAttempt; explain: (index: number) => Promise<string> }) {
  const [onlyWrong, setOnlyWrong] = useState(false);
  const status = questions.map((_, i) => (!hasAnswer(attempt.answers[i]) ? 'empty' : sameAnswer(attempt.answers[i], attempt.correct[i]) ? 'right' : 'wrong'));
  const wrong = status.filter((x) => x !== 'right').length;
  const jump = (i: number) => {
    if (onlyWrong && status[i] === 'right') setOnlyWrong(false);
    setTimeout(() => document.getElementById(`rq-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 30);
  };

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-extrabold">Сұрақтар бойынша нәтиже</h2>
          <span className="text-sm font-bold"><span className="text-emerald-600 dark:text-emerald-400">✓ {status.length - wrong} дұрыс</span>
            <span className="text-ink/30"> · </span><span className="text-rose-600 dark:text-rose-400">✗ {wrong} қате</span></span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {status.map((st, i) => (
            <button key={i} onClick={() => jump(i)} aria-label={`${i + 1}-сұрақ: ${st === 'right' ? 'дұрыс' : 'қате'}`}
              className={`grid h-10 w-10 place-items-center rounded-xl text-sm font-extrabold ring-2 transition active:scale-95 ${st === 'right'
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-200'
                : 'bg-rose-50 text-rose-700 ring-rose-300 dark:bg-rose-500/15 dark:text-rose-200'}`}>{i + 1}</button>
          ))}
        </div>
        {wrong > 0 && (
          <div className="mt-4 flex gap-2">
            <button className={`chip !px-3 !py-1.5 ${!onlyWrong ? 'bg-brand text-white' : 'bg-mist text-ink/60'}`} onClick={() => setOnlyWrong(false)}>Барлығы</button>
            <button className={`chip !px-3 !py-1.5 ${onlyWrong ? 'bg-brand text-white' : 'bg-mist text-ink/60'}`} onClick={() => setOnlyWrong(true)}>Тек қателер ({wrong})</button>
          </div>
        )}
      </div>

      {questions.map((q, i) => {
        if (onlyWrong && status[i] === 'right') return null;
        const mine = attempt.answers[i];
        const right = attempt.correct[i];
        const multi = isMulti(q);
        const st = status[i];
        return (
          <div key={i} id={`rq-${i}`} className={`card scroll-mt-24 p-5 ring-2 ${st === 'right' ? 'ring-emerald-200/70 dark:ring-emerald-500/25' : 'ring-rose-200/80 dark:ring-rose-500/25'}`}>
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className={`chip ${st === 'right' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200'}`}>
                {i + 1}-сұрақ · {st === 'right' ? 'Дұрыс ✓' : st === 'empty' ? 'Жауап берілмеген' : 'Қате ✗'}
              </span>
              {multi && <span className="chip bg-sun/30 text-ink">Бірнеше жауап</span>}
            </div>
            <p className="font-extrabold leading-snug">{q.q}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {q.options.map((o, j) => {
                const isRight = includesOpt(right, j);
                const picked = includesOpt(mine, j);
                const cls = isRight ? 'bg-emerald-50 text-emerald-800 ring-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-200'
                  : picked ? 'bg-rose-50 text-rose-700 ring-rose-300 dark:bg-rose-500/15 dark:text-rose-200' : 'bg-mist text-ink/60 ring-transparent';
                return (
                  <div key={j} className={`flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-semibold ring-2 ${cls}`}>
                    <span className={`grid h-6 w-6 shrink-0 place-items-center ${multi ? 'rounded-md' : 'rounded-full'} bg-card text-xs font-extrabold`}>{LETTERS[j]}</span>
                    <span className="min-w-0 flex-1 break-words">{o}</span>
                    {picked && <span className="shrink-0 rounded-full bg-card/80 px-2 py-0.5 text-[11px] font-bold">сенің жауабың</span>}
                    {isRight && <span aria-label="дұрыс">✓</span>}
                    {picked && !isRight && <span aria-label="қате">✗</span>}
                  </div>
                );
              })}
            </div>
            {multi && st === 'wrong' && (
              <p className="mt-2 text-xs font-semibold text-ink/50">Бұл сұрақта барлық дұрыс нұсқаны (және тек соларды) белгілеу керек еді.</p>
            )}
            {st !== 'right' && <ExplainBox fetchText={() => explain(i)} initial={attempt.explain?.[i]} />}
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

  if (loading) return <PageLoader />;
  if (error || !t) return <Empty title="Сауалнама табылмады" text={friendlyError(error)} action={<Link to="/app/tests" className="btn btn-primary">Сауалнамаларға</Link>} />;

  const back = <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/tests')}><IChevL className="h-4 w-4" /> Сауалнамалар</button>;

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
          <p className="mt-3 text-xs text-ink/45">Сауалнама бір рет қана тапсырылады. Төменде қай сұрақтан қате кеткенін және түсіндірмесін қарап шық.</p>
        </div>
        <Review questions={t.questions} attempt={a} explain={(k) => api.explainQuestion(t.id, k)} />
      </div>
    );
  }

  return (
    <QuestionRunner title={t.title} description={t.description} questions={t.questions} back={back}
      onSubmit={async (full) => {
        try {
          const r = await api.submitTest(t.id, full);
          toast.reward(r, `${r.score}/${r.max_score} дұрыс!`);
          setData({ ...t, attempt: { score: r.score, max_score: r.max_score, answers: full, correct: r.correct, explain: r.explain, created_at: new Date().toISOString() } });
        } catch (e) {
          toast.error(friendlyError(e));
        }
      }} />
  );
}

/** One question at a time; used by signed-in students and by guests on a shared link. */
export function QuestionRunner({ title, description, questions, back, onSubmit }: {
  title: string; description: string; questions: TestForStudent['questions']; back?: ReactNode;
  onSubmit: (answers: TestAnswer[]) => Promise<void>;
}) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<TestAnswer[]>([]);
  const [busy, setBusy] = useState(false);
  const q = questions[i];
  const total = questions.length;
  const multi = isMulti(q);
  const answered = questions.filter((_, k) => hasAnswer(answers[k])).length;
  const pick = (j: number) => setAnswers((x) => {
    const n = [...x];
    if (multi) {
      const cur = Array.isArray(n[i]) ? (n[i] as number[]) : [];
      n[i] = cur.includes(j) ? cur.filter((v) => v !== j) : [...cur, j].sort((p, r) => p - r);
    } else n[i] = j;
    return n;
  });

  const submit = async () => {
    setBusy(true);
    try { await onSubmit(questions.map((qq, k) => cleanAnswer(qq, answers[k]))); window.scrollTo({ top: 0 }); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {back}
      <div>
        <h1 className="text-2xl font-extrabold leading-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink/55">{description}</p>}
      </div>
      <div className="flex items-center gap-3">
        <ProgressBar value={((i + 1) / total) * 100} className="flex-1" />
        <span className="shrink-0 text-sm font-bold text-ink/55">{i + 1} / {total}</span>
      </div>
      <div className="card p-5 sm:p-7">
        {multi && <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-sun/30 px-3 py-1 text-xs font-bold text-ink/75"><ICheck className="h-3.5 w-3.5" /> Бірнеше дұрыс жауап болуы мүмкін — барлығын белгіле</p>}
        <p className="text-lg font-extrabold leading-snug sm:text-xl">{q.q}</p>
        <div className="mt-5 grid gap-3" role={multi ? 'group' : 'radiogroup'}>
          {q.options.map((o, j) => {
            const on = includesOpt(answers[i], j);
            return (
              <button
                key={j}
                onClick={() => pick(j)}
                role={multi ? 'checkbox' : 'radio'}
                aria-checked={on}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left font-semibold ring-2 transition active:scale-[.99] ${on ? 'bg-haze text-brand ring-brand' : 'bg-mist ring-transparent hover:ring-lavender/60'}`}
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center ${multi ? 'rounded-lg' : 'rounded-full'} text-sm font-extrabold ${on ? 'bg-brand text-white' : 'bg-card text-ink/60'}`}>{multi && on ? <ICheck className="h-4 w-4" /> : LETTERS[j]}</span>
                <span className="min-w-0 flex-1 break-words">{o}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <button className="btn btn-ghost" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}><IChevL className="h-4 w-4" /> Артқа</button>
        {i < total - 1 ? (
          <button className="btn btn-primary" onClick={() => setI((x) => x + 1)} disabled={!hasAnswer(answers[i])}>Келесі <IArrowR className="h-4 w-4" /></button>
        ) : (
          <button className="btn btn-sun" onClick={submit} disabled={busy || answered < total}>{busy && <Spinner className="h-4 w-4" />} Тапсыру</button>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {questions.map((_, k) => (
          <button
            key={k}
            onClick={() => setI(k)}
            aria-label={`${k + 1}-сұрақ`}
            className={`h-8 w-8 rounded-full text-xs font-extrabold transition ${k === i ? 'bg-brand text-white' : hasAnswer(answers[k]) ? 'bg-sun/60 text-ink' : 'bg-card text-ink/45 shadow-[0_2px_0_var(--edge)]'}`}
          >{k + 1}</button>
        ))}
      </div>
    </div>
  );
}
