import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Crystal, Robot, Star3D, Trophy } from '../components/Art';
import { IChevL, IPlay, IRefresh } from '../components/Icons';
import { CategoryChip, Empty, PageLoader, Spinner } from '../components/ui';
import { friendlyError } from '../lib/api';
import { useSession } from '../lib/auth';
import { DIFFICULTY, GAME_TYPES } from '../lib/constants';
import { Link, navigate } from '../lib/router';
import { useToast } from '../lib/toast';
import type { Game, GameType, RewardResult } from '../lib/types';
import { useAsync } from '../lib/useAsync';

const ENGINES: Record<GameType, React.LazyExoticComponent<React.ComponentType<{ data: any; onFinish: (s: number, m: number) => void }>>> = {
  quiz: lazy(() => import('../games/QuizBattle')),
  pairs: lazy(() => import('../games/MatchPairs')),
  code_puzzle: lazy(() => import('../games/CodePuzzle')),
  find_mistake: lazy(() => import('../games/FindMistake')),
  true_false: lazy(() => import('../games/TrueFalse')),
  drag_drop: lazy(() => import('../games/DragDrop')),
  computer_parts: lazy(() => import('../games/ComputerParts')),
  maze: lazy(() => import('../games/AlgorithmMaze')),
};

const HOW: Record<GameType, string> = {
  quiz: 'Әр сұраққа уақыт шектеулі. 4 нұсқаның біреуін таңда.',
  pairs: 'Терминді таңдап, оған сәйкес анықтаманы бас. Қате неғұрлым аз болса, ұпай көп.',
  code_puzzle: 'Командаларды дұрыс ретпен жина. Бірінші әрекеттен тапсаң — 2 ұпай.',
  find_mistake: 'Кодты мұқият оқы да, қате жолды шерт. Әр тапсырмаға бір мүмкіндік.',
  true_false: 'Тұжырымды оқы: ақиқат па, әлде жалған ба? Пернетақта: ← ақиқат, → жалған.',
  drag_drop: 'Әр элементті тиісті топқа сүйреп апар немесе басып орналастыр.',
  computer_parts: 'Сұралған бөлікті суреттен тауып, шерт. 3 әрекет бар.',
  maze: 'Роботқа бағыт командаларын құр (×N — қадам саны), сосын «Іске қосу» бас.',
};

type Phase = 'intro' | 'play' | 'saving' | 'result';

export default function GamePlay({ id }: { id: string }) {
  const { api, refresh } = useSession();
  const toast = useToast();
  const { data, loading } = useAsync(async () => {
    const [game, results, games] = await Promise.all([api.getGame(id), api.myResults(), api.listGames()]);
    return { game, results: results.filter((r) => r.game_id === game?.id), games };
  }, [id]);
  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState(0);
  const [outcome, setOutcome] = useState<{ score: number; max: number; reward: RewardResult | null } | null>(null);
  const started = useRef(0);

  useEffect(() => { setPhase('intro'); setOutcome(null); }, [id]);

  const best = useMemo(() => (data?.results ?? []).reduce((m, r) => Math.max(m, r.score / r.max_score), 0), [data]);
  const nextGame = useMemo(() => {
    if (!data?.game) return null;
    const played = new Set((data.results ?? []).map((r) => r.game_id));
    return data.games.find((g) => g.id !== data.game!.id && !played.has(g.id) && g.category === data.game!.category)
      ?? data.games.find((g) => g.id !== data.game!.id && g.type !== data.game!.type) ?? null;
  }, [data]);

  if (loading) return <PageLoader />;
  const game = data?.game as Game | null;
  if (!game) return <Empty title="Ойын табылмады" action={<Link to="/app/games" className="btn btn-primary">Ойындарға қайту</Link>} />;

  const Engine = ENGINES[game.type];
  const t = GAME_TYPES[game.type];

  const begin = () => { started.current = Date.now(); setRound((r) => r + 1); setPhase('play'); };

  const finish = async (score: number, max: number) => {
    setPhase('saving');
    const dur = Math.round((Date.now() - started.current) / 1000);
    try {
      const reward = await api.completeGame(game.id, score, max, dur);
      setOutcome({ score, max, reward });
      toast.reward(reward, 'Ойын аяқталды!');
      refresh();
    } catch (e) {
      toast.error('Нәтиже сақталмады', friendlyError(e));
      setOutcome({ score, max, reward: null });
    }
    setPhase('result');
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex items-center gap-3">
        <button className="icon-btn" onClick={() => (phase === 'play' ? setPhase('intro') : navigate('/app/games'))} aria-label="Артқа"><IChevL /></button>
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold leading-tight sm:text-xl">{game.title}</p>
          <p className="text-sm font-semibold text-ink/45">{t.icon} {t.label}</p>
        </div>
      </div>

      {phase === 'intro' && (
        <div className="card relative overflow-hidden p-6 sm:p-10 fade-up">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-lavender/25 blur-3xl" />
          <div className="relative grid items-center gap-8 md:grid-cols-[1.3fr_1fr]">
            <div>
              <div className="flex flex-wrap gap-2">
                <CategoryChip slug={game.category} />
                <span className={`chip ${DIFFICULTY[game.difficulty]?.cls}`}>{DIFFICULTY[game.difficulty]?.label}</span>
                <span className="chip bg-sun/35 text-ink">⭐ {game.xp_reward} XP дейін</span>
              </div>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{game.title}</h1>
              <p className="mt-2 text-ink/60">{game.description}</p>
              <div className="mt-5 rounded-2xl bg-mist p-4 text-sm">
                <p className="font-extrabold">Қалай ойнаймыз?</p>
                <p className="mt-1 text-ink/65">{HOW[game.type]}</p>
              </div>
              {best > 0 && (
                <p className="mt-4 text-sm font-semibold text-ink/55">
                  Сенің рекордың: <b className="text-brand">{Math.round(best * 100)}%</b>
                  {best < 1 ? ' · Рекордты жақсартсаң, қосымша XP аласың!' : ' · Мінсіз! Енді тек жаттығу үшін 😊'}
                </p>
              )}
              <button className="btn btn-primary mt-6 px-8 py-4 text-base" onClick={begin}><IPlay className="h-5 w-5" /> Ойынды бастау</button>
            </div>
            <div className="relative mx-auto hidden h-60 w-60 md:block">
              <div className="absolute inset-6 rounded-full bg-gradient-to-br from-[#2A6B7F] to-[#17404E] opacity-90" />
              <Robot className="float absolute inset-0 m-auto w-44" />
              <Crystal className="float-slow absolute bottom-4 left-2 w-8 drop-shadow-[0_0_14px_rgba(95,208,224,.7)]" />
              <Star3D className="twinkle absolute right-2 top-2 w-10" />
            </div>
          </div>
        </div>
      )}

      {phase === 'play' && (
        <div className="card p-5 sm:p-8">
          <Suspense fallback={<PageLoader />}>
            <Engine key={round} data={game.data} onFinish={finish} />
          </Suspense>
        </div>
      )}

      {phase === 'saving' && (
        <div className="card grid place-items-center p-16"><Spinner className="h-8 w-8" /><p className="mt-3 font-semibold text-ink/55">Нәтиже сақталуда…</p></div>
      )}

      {phase === 'result' && outcome && <Result outcome={outcome} xpMax={game.xp_reward} onReplay={begin} next={nextGame} />}
    </div>
  );
}

function Result({ outcome, onReplay, next, xpMax }: { outcome: { score: number; max: number; reward: RewardResult | null }; onReplay: () => void; next: Game | null; xpMax: number }) {
  const pct = Math.round((outcome.score / outcome.max) * 100);
  const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : pct >= 30 ? 1 : 0;
  const msg = pct === 100 ? 'Мінсіз! Сен нағыз чемпионсың! 🏆' : pct >= 75 ? 'Керемет нәтиже! 🎉' : pct >= 50 ? 'Жақсы! Тағы бір рет байқап көр 💪' : 'Бастамасы жақсы! Қайта ойнап, рекорд жаса 🚀';
  return (
    <div className="card relative overflow-hidden p-8 text-center sm:p-12">
      {pct >= 75 && <Confetti />}
      <Trophy className="pop mx-auto h-32" />
      <div className="mt-4 flex justify-center gap-2">
        {[0, 1, 2].map((i) => <Star3D key={i} className={`pop w-12 ${i < stars ? '' : 'opacity-20 grayscale'}`} style={{ animationDelay: `${0.15 + i * 0.15}s` }} />)}
      </div>
      <h2 className="mt-4 text-3xl font-extrabold">{msg}</h2>
      <p className="mt-2 text-ink/55">Нәтиже: <b className="text-ink">{outcome.score} / {outcome.max}</b> · {pct}%</p>
      <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-3">
        <div className="rounded-2xl bg-sun/25 p-4">
          <p className="text-2xl font-extrabold">+{outcome.reward?.xp ?? 0}</p>
          <p className="text-xs font-bold text-ink/55">XP алдың</p>
        </div>
        <div className="rounded-2xl bg-haze p-4">
          <p className="text-2xl font-extrabold">{Math.round((outcome.reward?.best ?? outcome.score / outcome.max) * 100)}%</p>
          <p className="text-xs font-bold text-ink/55">Рекорд</p>
        </div>
      </div>
      {outcome.reward && outcome.reward.xp === 0 && (
        <p className="mx-auto mt-4 max-w-md text-sm text-ink/50">XP тек рекордты жақсартқанда беріледі (ең көбі {xpMax} XP). Алдыңғы нәтижеңнен асып көр!</p>
      )}
      {!!outcome.reward?.achievements.length && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {outcome.reward.achievements.map((a) => <span key={a.code} className="chip pop bg-emerald-50 !px-4 !py-2 text-sm text-emerald-700">{a.icon} {a.title}</span>)}
        </div>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button className="btn btn-soft" onClick={onReplay}><IRefresh className="h-4 w-4" /> Қайта ойнау</button>
        {next && <button className="btn btn-primary" onClick={() => navigate(`/app/games/${next.id}`)}>Келесі ойын: {next.title.length > 26 ? next.title.slice(0, 26) + '…' : next.title}</button>}
        <Link to="/app/games" className="btn btn-ghost">Барлық ойындар</Link>
      </div>
    </div>
  );
}

function Confetti() {
  const bits = useMemo(() => Array.from({ length: 36 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 1.2, dur: 2.4 + Math.random() * 1.6,
    color: ['#17404E', '#2A6B7F', '#7FB3C2', '#8FCAD8', '#46A2C1', '#9BCDDE'][i % 6], size: 6 + Math.random() * 6, round: i % 3 === 0,
  })), []);
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden>
      {bits.map((b, i) => (
        <span key={i} className="absolute top-0 block" style={{
          left: `${b.left}%`, width: b.size, height: b.size * (b.round ? 1 : 1.6), background: b.color,
          borderRadius: b.round ? '50%' : 3, animation: `confetti ${b.dur}s ${b.delay}s cubic-bezier(.3,.6,.5,1) forwards`, transform: 'translateY(-10vh)',
        }} />
      ))}
    </div>
  );
}
