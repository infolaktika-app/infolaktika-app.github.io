import { useMemo, useState } from 'react';
import { Gamepad, Star3D, Trophy } from '../components/Art';
import { GameCard } from '../components/Cards';
import { ISearch } from '../components/Icons';
import { Empty, SkeletonGrid, Tabs } from '../components/ui';
import { useSession } from '../lib/auth';
import { CATEGORIES, GAME_TYPES } from '../lib/constants';
import type { GameType } from '../lib/types';
import { useAsync } from '../lib/useAsync';

export default function Games() {
  const { api } = useSession();
  const { data, loading } = useAsync(async () => {
    const [games, results] = await Promise.all([api.listGames(), api.myResults()]);
    return { games, results };
  }, []);
  const [cat, setCat] = useState('all');
  const [type, setType] = useState<'all' | GameType>('all');
  const [q, setQ] = useState('');

  const best = useMemo(() => {
    const m: Record<string, number> = {};
    data?.results.forEach((r) => (m[r.game_id] = Math.max(m[r.game_id] ?? 0, r.score / r.max_score)));
    return m;
  }, [data]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    data?.games.forEach((g) => (m[g.category] = (m[g.category] ?? 0) + 1));
    return m;
  }, [data]);

  const list = (data?.games ?? []).filter((g) =>
    (cat === 'all' || g.category === cat) && (type === 'all' || g.type === type) &&
    (!q.trim() || g.title.toLowerCase().includes(q.trim().toLowerCase())));
  const played = Object.keys(best).length;

  return (
    <div className="space-y-7">
      <header className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#123642] to-night p-6 text-white sm:p-8">
        <div className="dot-grid absolute inset-0 opacity-15" />
        <div className="relative flex items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ойындар</h1>
            <p className="mt-2 max-w-lg text-white/70">Информатика тақырыптарын ойын арқылы меңгер. Әр жаңа рекорд үшін кристалл аласың!</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip bg-white/10 text-white">🎮 {data?.games.length ?? 0} ойын</span>
              <span className="chip bg-white/10 text-white">✅ {played} ойнадың</span>
              <span className="chip bg-sun text-ink">💎 {data?.games.reduce((s, g) => s + g.xp_reward, 0) ?? 0} кристалл жинауға болады</span>
            </div>
          </div>
          <div className="relative hidden h-36 w-56 shrink-0 sm:block">
            <Gamepad className="float absolute bottom-0 left-0 w-40" />
            <Trophy className="float-slow absolute right-0 top-0 w-20" />
            <Star3D className="twinkle absolute right-24 top-2 w-8" />
          </div>
        </div>
      </header>

      {/* category tiles */}
      <section className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5">
        {CATEGORIES.map((c) => (
          <button
            key={c.slug}
            onClick={() => setCat(cat === c.slug ? 'all' : c.slug)}
            className={`card card-hover flex w-56 shrink-0 items-center gap-3 p-3.5 text-left sm:w-auto ${cat === c.slug ? 'ring-2 ring-violet' : ''}`}
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl" style={{ background: c.color + '1A' }}>{c.icon}</span>
            <span className="min-w-0">
              <span className="line-clamp-2 text-sm font-bold leading-tight">{c.label}</span>
              <span className="text-xs text-ink/45">{counts[c.slug] ?? 0} ойын</span>
            </span>
          </button>
        ))}
      </section>

      <section className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative lg:w-80">
          <ISearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/35" />
          <input className="input !pl-12" placeholder="Ойын іздеу…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="min-w-0 flex-1">
          <Tabs value={type} onChange={setType} items={[
            { value: 'all', label: 'Барлық түрлері' },
            ...(Object.keys(GAME_TYPES) as GameType[]).map((t) => ({ value: t, label: `${GAME_TYPES[t].icon} ${GAME_TYPES[t].label}` })),
          ]} />
        </div>
      </section>

      {loading ? <SkeletonGrid n={8} h="h-80" /> : list.length === 0 ? (
        <Empty title="Ойын табылмады" text="Басқа санатты немесе ойын түрін таңдап көр." action={<button className="btn btn-soft" onClick={() => { setCat('all'); setType('all'); setQ(''); }}>Сүзгіні тазалау</button>} />
      ) : (
        <div className="grid grid-cols-1 gap-x-5 gap-y-8 min-[480px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 stagger">
          {list.map((g) => <GameCard key={g.id} game={g} best={best[g.id]} />)}
        </div>
      )}
    </div>
  );
}
