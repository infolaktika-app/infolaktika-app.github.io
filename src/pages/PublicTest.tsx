import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Crystal, Logo, Robot } from '../components/Art';
import { IArrowR, IClipboard, IComic, IGame, ITrophy } from '../components/Icons';
import { MadeBy } from '../components/MadeBy';
import { MobileHeader } from '../components/MobileHeader';
import { ThemeToggle } from '../components/ThemeToggle';
import { Empty, PageLoader, ProgressBar } from '../components/ui';
import { friendlyError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Link, Redirect } from '../lib/router';
import { useToast } from '../lib/toast';
import type { GuestResult, PublicTest } from '../lib/types';
import { QuestionRunner, Review } from './Tests';

/** The guest's attempt id per link is remembered in this browser, so reopening the link shows the result. */
const storeKey = (code: string) => `infolaktika-guest-${code}`;
const remember = (code: string, v: { attempt_id: string; name: string }) => { try { localStorage.setItem(storeKey(code), JSON.stringify(v)); } catch { /* private mode */ } };
const recall = (code: string): { attempt_id: string; name: string } | null => { try { return JSON.parse(localStorage.getItem(storeKey(code)) ?? 'null'); } catch { return null; } };

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="sm:hidden">
        <MobileHeader home="/" left={<span className="w-11" />} right={<ThemeToggle />} />
      </div>
      <div className="mx-auto hidden w-full max-w-3xl items-center justify-between px-5 pt-6 sm:flex">
        <Link to="/"><Logo /></Link>
        <ThemeToggle />
      </div>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-5 sm:py-8">{children}</main>
      <MadeBy className="mb-6" />
    </div>
  );
}

function JoinCta() {
  const perks = [
    { icon: IComic, text: 'ИНФОЛАКТИКА комикстерінің барлық бөлімдері' },
    { icon: IGame, text: 'Информатика бойынша ойындар' },
    { icon: IClipboard, text: 'Жаңа сауалнамалар мен материалдар' },
    { icon: ITrophy, text: 'Кристалл жинап, рейтингте жарыс' },
  ];
  return (
    <section id="join" className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#2A6B7F] via-[#17404E] to-[#0B1D24] p-6 text-white sm:p-8">
      <div className="dot-grid absolute inset-0 opacity-20" />
      <div className="relative grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <h2 className="text-2xl font-extrabold leading-tight sm:text-3xl">Платформаға тіркел!</h2>
          <p className="mt-2 text-white/75">Тіркелсең, сауалнамалар үшін кристалл аласың және нәтижелерің сақталады.</p>
          <ul className="mt-4 grid gap-2.5">
            {perks.map(({ icon: I, text }) => (
              <li key={text} className="flex items-center gap-3 font-semibold"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/15"><I className="h-4 w-4" /></span>{text}</li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/register" className="btn btn-sun">Тіркелу <IArrowR className="h-4 w-4" /></Link>
            <Link to="/login" className="btn bg-white/15 text-white hover:bg-white/25">Менде аккаунт бар</Link>
          </div>
        </div>
        <div className="hidden w-40 sm:block"><Robot className="h-auto w-full" /></div>
      </div>
    </section>
  );
}

export default function PublicTestPage({ code }: { code: string }) {
  const { api, profile } = useAuth();
  const toast = useToast();
  const [test, setTest] = useState<PublicTest | null | undefined>(undefined);
  const [result, setResult] = useState<GuestResult | null>(null);
  const [name, setName] = useState('');
  const [started, setStarted] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!api) return;
    let alive = true;
    (async () => {
      try {
        const t = await api.publicTest(code);
        if (!alive) return;
        setTest(t);
        const saved = recall(code);
        if (t && saved) {
          const r = await api.publicTestResult(code, saved.attempt_id).catch(() => null);
          if (alive && r) { setResult(r); setName(r.name ?? saved.name); }
        }
      } catch (e) {
        if (alive) { setErr(friendlyError(e)); setTest(null); }
      }
    })();
    return () => { alive = false; };
  }, [api, code]);

  if (test === undefined || !api) return <PageLoader />;
  if (!test) {
    return (
      <Frame>
        <Empty title="Сілтеме жұмыс істемейді" text={err || 'Сауалнама жабылған немесе сілтеме ауысқан. Мұғаліміңнен жаңа сілтеме сұра.'}
          action={<Link to="/" className="btn btn-primary">Басты бетке</Link>} />
      </Frame>
    );
  }
  // A signed-in student takes it with their account (crystals + rating).
  if (profile?.role === 'student') return <Redirect to={`/app/tests/${test.id}`} />;

  if (result) {
    const p = result.max_score ? Math.round((result.score / result.max_score) * 100) : 0;
    const first = (name || result.name || '').split(' ')[0];
    return (
      <Frame>
        <div className="space-y-6 fade-up">
          <div className="card relative overflow-hidden p-6 text-center sm:p-8">
            <div className="text-5xl">{p >= 80 ? '🏆' : p >= 50 ? '👏' : '💪'}</div>
            <p className="mt-3 font-bold text-ink/55">{p >= 80 ? 'Керемет' : p >= 50 ? 'Жарайсың' : 'Жақсы талпыныс'}{first ? `, ${first}` : ''}!</p>
            <h1 className="mt-1 text-2xl font-extrabold">{test.title}</h1>
            <p className="mt-1 text-ink/55">Нәтиже: <b className="text-ink">{result.score} / {result.max_score}</b> · {p}%</p>
            <ProgressBar value={p} className="mx-auto mt-4 max-w-sm" tone="sun" />
            <button className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline"
              onClick={() => document.getElementById('join')?.scrollIntoView({ behavior: 'smooth' })}>
              <Crystal className="h-5 w-5" /> Тіркеліп, кристалл жина
            </button>
          </div>
          <Review questions={test.questions} attempt={result} explain={(k) => api.explainGuest(code, result.attempt_id, k)} />
          <JoinCta />
        </div>
      </Frame>
    );
  }

  if (started) {
    return (
      <Frame>
        <QuestionRunner title={test.title} description={test.description} questions={test.questions}
          back={<p className="text-sm font-semibold text-ink/50">Тапсырушы: <b className="text-ink">{name}</b></p>}
          onSubmit={async (answers) => {
            try {
              const r = await api.submitPublicTest(code, name, answers);
              remember(code, { attempt_id: r.attempt_id, name });
              setResult(r);
            } catch (e) {
              toast.error(friendlyError(e));
            }
          }} />
      </Frame>
    );
  }

  const start = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().replace(/\s+/g, ' ').length < 2) return toast.error('Аты-жөніңді жаз', 'Кемінде 2 әріп');
    setName(name.trim().replace(/\s+/g, ' '));
    setStarted(true);
    window.scrollTo({ top: 0 });
  };

  return (
    <Frame>
      <div className="space-y-5 fade-up">
        <header className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#2A6B7F] to-[#17404E] p-6 text-white sm:p-8">
          <div className="dot-grid absolute inset-0 opacity-20" />
          <div className="relative">
            <span className="chip bg-white/15 text-white">📝 {test.questions.length} сұрақ</span>
            <h1 className="mt-3 text-2xl font-extrabold leading-tight [overflow-wrap:anywhere] sm:text-3xl">{test.title}</h1>
            {test.description && <p className="mt-2 text-white/75">{test.description}</p>}
          </div>
        </header>
        <form onSubmit={start} className="card space-y-4 p-5 sm:p-7">
          <div>
            <h2 className="text-lg font-extrabold">Бастау үшін атыңды жаз</h2>
            <p className="mt-1 text-sm text-ink/55">Тіркелудің қажеті жоқ. Соңында нәтижеңді және қателеріңнің түсіндірмесін көресің.</p>
          </div>
          <label className="block"><span className="label">Аты-жөнің</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" placeholder="мысалы: Айгерім Нұрланқызы" autoFocus />
          </label>
          <button className="btn btn-primary w-full sm:w-auto" disabled={name.trim().length < 2}>Бастау <IArrowR className="h-4 w-4" /></button>
        </form>
        {profile?.role === 'admin' && <p className="text-center text-xs font-semibold text-ink/45">Сіз әкімшісіз: бұл бет оқушыға осылай көрінеді. Тапсырсаңыз, нәтиже «қонақ» ретінде жазылады.</p>}
        {!profile && (
          <p className="text-center text-sm text-ink/55">Аккаунтың бар ма? <Link to="/login" className="font-bold text-brand hover:underline">Кіріп тапсыр</Link> — кристалл аласың.</p>
        )}
      </div>
    </Frame>
  );
}

