import { useState } from 'react';
import { Trophy } from '../components/Art';
import { ISearch } from '../components/Icons';
import { Avatar, Empty, PageLoader } from '../components/ui';
import { useSession } from '../lib/auth';
import { LEVELS } from '../lib/constants';
import { useAsync } from '../lib/useAsync';

export default function Leaderboard() {
  const { api, profile } = useSession();
  const { data, loading } = useAsync(() => api.leaderboard(), []);
  const [q, setQ] = useState('');
  if (loading) return <PageLoader />;
  const rows = data ?? [];
  if (!rows.length) return <Empty title="Рейтинг бос" text="Бірінші болып кристалл жина!" />;
  const top = rows.slice(0, 3);
  const me = rows.find((r) => r.id === profile.id);
  const filtered = rows.filter((r) => !q.trim() || `${r.first_name} ${r.last_name} ${r.username}`.toLowerCase().includes(q.trim().toLowerCase()));
  const podium = [top[1], top[0], top[2]].filter(Boolean);
  const medal = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#2A6B7F] to-[#17404E] px-6 pb-0 pt-8 text-white sm:px-10">
        <div className="dot-grid absolute inset-0 opacity-20" />
        <div className="relative text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Рейтинг</h1>
          <p className="mt-2 text-white/75">Ең белсенді оқушылар · {me ? `Сенің орның: ${me.rank}` : ''}</p>
        </div>
        <div className="relative mx-auto mt-8 flex max-w-2xl items-end justify-center gap-3 sm:gap-6">
          {podium.map((r) => {
            const place = r.rank;
            const h = place === 1 ? 'h-40' : place === 2 ? 'h-28' : 'h-20';
            return (
              <div key={r.id} className="flex flex-1 flex-col items-center">
                {place === 1 && <Trophy className="float -mb-2 h-16" />}
                <div className="relative">
                  <Avatar id={r.avatar} size={place === 1 ? 76 : 60} ring />
                  <span className="absolute -bottom-2 -right-2 text-2xl">{medal[place - 1]}</span>
                </div>
                <p className="mt-3 max-w-full truncate text-center font-extrabold">{r.first_name}</p>
                <p className="text-sm font-bold text-sun">💎 {r.xp}</p>
                <div className={`mt-3 w-full rounded-t-3xl bg-white/15 backdrop-blur ${h} grid place-items-start justify-center pt-3 text-3xl font-extrabold text-white/80`}>{place}</div>
              </div>
            );
          })}
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative sm:w-80">
          <ISearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/35" />
          <input className="input !pl-12" placeholder="Оқушыны іздеу…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <p className="text-sm font-semibold text-ink/45">{rows.length} оқушы</p>
      </div>

      <div className="card overflow-hidden">
        {filtered.map((r) => {
          const mine = r.id === profile.id;
          return (
            <div key={r.id} className={`flex items-center gap-3 border-b border-haze px-4 py-3 last:border-0 sm:gap-4 sm:px-6 ${mine ? 'bg-haze/70' : ''}`}>
              <span className={`w-8 text-center text-lg font-extrabold ${r.rank <= 3 ? '' : 'text-ink/35'}`}>{r.rank <= 3 ? medal[r.rank - 1] : r.rank}</span>
              <Avatar id={r.avatar} size={42} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold">{r.first_name} {r.last_name} {mine && <span className="chip ml-1 bg-brand text-white">Сен</span>}</p>
                <p className="truncate text-xs font-semibold text-ink/45">@{r.username} · {LEVELS[r.level - 1]?.name}</p>
              </div>
              {r.streak > 1 && <span className="hidden text-sm font-bold text-violet sm:inline">🔥 {r.streak}</span>}
              <span className="chip bg-sun/30 !px-3 !py-1.5 text-sm text-ink">💎 {r.xp}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
