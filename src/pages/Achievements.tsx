import { Trophy } from '../components/Art';
import { IFlame, ILock } from '../components/Icons';
import { LevelBar, PageLoader, SectionHead, StatCard } from '../components/ui';
import { useSession } from '../lib/auth';
import { formatDate, LEVELS, levelFor, timeAgo } from '../lib/constants';
import { useAsync } from '../lib/useAsync';

const REASON: Record<string, string> = { game: '🎮 Ойын', comic: '🦸 Комикс', book: '📚 Кітап', daily: '🎯 Күнделікті тапсырма', missions: '✅ Миссиялар бонусы', admin: '🛠️ Мұғалім' };

export default function Achievements() {
  const { api, profile } = useSession();
  const { data, loading } = useAsync(async () => {
    const [ach, stats, history] = await Promise.all([api.achievements(), api.myStats(), api.xpHistory()]);
    return { ach, stats, history };
  }, [profile.xp]);
  if (loading || !data) return <PageLoader />;
  const { ach, stats, history } = data;
  const earnedCount = Object.keys(ach.earned).length;
  const cur = levelFor(profile.xp);

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#BEDEE9] via-sun to-[#6FB0C1] p-6 sm:p-8">
        <div className="dot-grid absolute inset-0 opacity-30" />
        <div className="relative flex items-center justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Менің жетістіктерім</h1>
            <p className="mt-2 text-ink/70">{earnedCount} / {ach.all.length} белгі ашылды · {stats.rank}-орын рейтингте</p>
            <div className="mt-5 max-w-md rounded-2xl bg-card/70 p-4 backdrop-blur"><LevelBar xp={profile.xp} /></div>
          </div>
          <Trophy className="float hidden h-40 shrink-0 sm:block" />
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="💎" label="Жалпы кристалл" value={profile.xp} tone="#4E97A9" />
        <StatCard icon={<IFlame />} label="Күнделікті серия" value={`${stats.streak} күн`} sub={`Ең ұзақ: ${stats.best_streak} күн`} tone="#4CA5C3" />
        <StatCard icon="🎮" label="Аяқталған ойын" value={stats.games_completed} sub={`${stats.games_total} ойынның ішінен`} tone="#2A6B7F" />
        <StatCard icon="📖" label="Оқылған материал" value={stats.comics_read + stats.books_read} sub={`${stats.comics_read} комикс · ${stats.books_read} кітап`} tone="#2FA1C8" />
      </section>

      <section>
        <SectionHead title="Деңгейлер жолы" />
        <div className="card overflow-x-auto p-6">
          <div className="flex min-w-[640px] items-start justify-between gap-2">
            {LEVELS.map((l, i) => {
              const reached = profile.xp >= l.min;
              const isCur = cur.level === l.level;
              return (
                <div key={l.level} className="relative flex flex-1 flex-col items-center text-center">
                  {i > 0 && <div className={`absolute right-1/2 top-7 h-1.5 w-full -translate-y-1/2 rounded-full ${reached ? 'bg-gradient-to-r from-violet to-brand' : 'bg-haze'}`} />}
                  <div className={`relative z-10 grid h-14 w-14 place-items-center rounded-2xl text-xl font-extrabold ${reached ? 'bg-gradient-to-br from-violet to-brand text-white shadow-[0_5px_0_#0E2B35]' : 'bg-haze text-ink/35'} ${isCur ? 'ring-4 ring-sun' : ''}`}>
                    {l.level}
                  </div>
                  <p className={`mt-3 text-sm font-extrabold ${reached ? '' : 'text-ink/40'}`}>{l.name}</p>
                  <p className="text-xs text-ink/45">{l.kk} · {l.min} 💎</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section>
        <SectionHead title="Белгілер" sub="Белсенді болып, барлық белгіні жина!" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 stagger">
          {ach.all.map((a) => {
            const at = ach.earned[a.code];
            return (
              <div key={a.code} className={`card card-hover relative flex flex-col items-center p-5 text-center ${at ? '' : 'bg-card/60'}`}>
                <div className={`grid h-20 w-20 place-items-center rounded-[26px] text-4xl ${at ? 'bg-gradient-to-br from-[#D1E8F0] to-sun shadow-[0_6px_0_#4E97A9]' : 'bg-haze grayscale'}`}>
                  <span className={at ? '' : 'opacity-30'}>{a.icon}</span>
                </div>
                {!at && <span className="absolute right-4 top-4 text-ink/25"><ILock className="h-4 w-4" /></span>}
                <p className={`mt-4 font-extrabold ${at ? '' : 'text-ink/50'}`}>{a.title}</p>
                <p className="mt-1 text-xs text-ink/50">{a.description}</p>
                {at && <p className="mt-2 text-[11px] font-bold text-emerald-600">✓ {formatDate(at)}</p>}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <SectionHead title="Кристалл тарихы" />
        <div className="card divide-y divide-haze">
          {history.length === 0 && <p className="p-8 text-center text-ink/45">Әзірге кристалл жоқ. Бірінші ойынды ойна! 🎮</p>}
          {history.map((h, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <span className="text-sm font-bold">{REASON[h.reason] ?? h.reason}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-ink/55">{h.reason === 'daily' || h.reason === 'missions' ? '' : h.ref}</span>
              <span className="text-xs text-ink/40">{timeAgo(h.created_at)}</span>
              <span className={`w-16 text-right font-extrabold ${h.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{h.amount >= 0 ? '+' : ''}{h.amount}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
