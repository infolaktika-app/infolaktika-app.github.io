import { useMemo } from 'react';
import { Books, CodeBadge, Crystal, Laptop } from '../components/Art';
import { RobotBuddy } from '../components/RobotBuddy';
import { ContentCard, GameCard } from '../components/Cards';
import { DailyChallengeCard } from '../components/DailyChallenge';
import { IArrowR, IBook, IComic, IFlame, IGame, ITarget, IZap } from '../components/Icons';
import { Cover, Empty, ProgressBar, SectionHead } from '../components/ui';
import { useSession } from '../lib/auth';
import { categoryLabel, levelProgress } from '../lib/constants';
import { Link, navigate } from '../lib/router';
import type { Book, Comic, Game, ReadingProgress } from '../lib/types';
import { useAsync } from '../lib/useAsync';

export default function Dashboard() {
  const { api, profile } = useSession();
  const { data, loading, reload } = useAsync(async () => {
    const [comics, books, games, progress, stats, settings, results] = await Promise.all([
      api.listComics(), api.listBooks(), api.listGames(), api.listProgress(), api.myStats(), api.settings(), api.myResults(),
    ]);
    return { comics, books, games, progress, stats, settings, results };
  }, [profile.xp]);

  const prog = useMemo(() => {
    const m = new Map<string, ReadingProgress>();
    data?.progress.forEach((p) => m.set(`${p.item_type}:${p.item_id}`, p));
    return m;
  }, [data]);

  // "Continue learning": most recently opened unfinished item, otherwise the newest unread comic/book.
  const cont = useMemo(() => {
    if (!data) return null;
    const find = (t: 'comic' | 'book', id: string) => (t === 'comic' ? data.comics : data.books).find((x) => x.id === id);
    const open = data.progress.filter((p) => !p.completed && find(p.item_type, p.item_id)).sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
    if (open) return { kind: open.item_type, item: find(open.item_type, open.item_id)!, p: open };
    const all = [
      ...data.comics.map((c) => ({ kind: 'comic' as const, item: c as Comic | Book })),
      ...data.books.map((b) => ({ kind: 'book' as const, item: b as Comic | Book })),
    ].sort((a, b) => b.item.created_at.localeCompare(a.item.created_at));
    const next = all.find((x) => !prog.get(`${x.kind}:${x.item.id}`)?.completed);
    return next ? { ...next, p: undefined } : null;
  }, [data, prog]);

  const best = useMemo(() => {
    const m: Record<string, number> = {};
    data?.results.forEach((r) => (m[r.game_id] = Math.max(m[r.game_id] ?? 0, r.score / r.max_score)));
    return m;
  }, [data]);

  const s = data?.stats;
  const learning = s ? Math.round(((s.games_completed + s.comics_read + s.books_read) / Math.max(1, s.games_total + s.comics_total + s.books_total)) * 100) : 0;
  const lp = levelProgress(profile.xp);

  return (
    <div className="space-y-8">
      {/* 1. Hero */}
      <section data-sparkle className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#2A6B7F] via-[#17404E] to-[#0B1D24] p-6 text-white shadow-[0_30px_60px_-30px_rgba(var(--shade),.8)] sm:p-9">
        <div className="dot-grid absolute inset-0 opacity-20" />
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-lavender/40 blur-3xl" />
        <div className="relative grid items-center gap-6 md:grid-cols-[1.25fr_1fr]">
          <div>
            <p className="chip bg-white/15 text-white backdrop-blur"><IFlame className="h-3.5 w-3.5" /> {profile.streak || 1} күн қатарынан</p>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-[42px]">Қайырлы күн, {profile.first_name}! 🌟</h1>
            <p className="mt-3 max-w-lg text-white/80 sm:text-lg">{data?.settings.motivational_message ?? 'Әр күн — жаңа білім.'}</p>
            <div className="mt-6 max-w-md rounded-2xl bg-white/12 p-4 backdrop-blur">
              <div className="flex items-center justify-between text-sm font-bold">
                <span>{lp.cur.level}-деңгей · {lp.cur.name}</span>
                <span className="text-sun">⭐ {profile.xp} XP</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-gradient-to-r from-sun to-[#6AB4CD] transition-[width] duration-1000" style={{ width: `${lp.pct}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-white/70">{lp.next ? `«${lp.next.name}» деңгейіне ${lp.toNext} XP қалды` : 'Сен ең жоғары деңгейдесің!'}</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/app/games" className="btn btn-sun"><IGame /> Ойын ойнау</Link>
              <Link to="/app/comics" className="btn bg-white/15 text-white backdrop-blur hover:bg-white/25"><IComic /> Комикс оқу</Link>
            </div>
          </div>
          <div className="relative mx-auto hidden h-64 w-full max-w-sm sm:block">
            <Laptop className="float-slow pointer-events-none absolute bottom-2 left-0 w-[68%]" />
            <RobotBuddy className="absolute bottom-4 right-0 aspect-[220/240] w-[46%]" />
            <Books className="float-r pointer-events-none absolute -top-2 left-4 w-[32%]" />
            <CodeBadge className="float pointer-events-none absolute right-6 top-0 w-[24%]" style={{ animationDelay: '1.2s' }} />
            <Crystal className="float pointer-events-none absolute left-[46%] top-1 w-8 drop-shadow-[0_0_14px_rgba(95,208,224,.7)]" />
            <Crystal tone="green" className="float-slow pointer-events-none absolute bottom-0 left-[40%] w-6 drop-shadow-[0_0_14px_rgba(140,192,113,.75)]" style={{ animationDelay: '.9s' }} />
          </div>
        </div>
      </section>

      {/* 2. Continue + 6. Daily challenge */}
      <section className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="card p-6">
          <SectionHead title="Оқуды жалғастыр" sub="Соңғы оқып жүрген материалың" />
          {loading ? (
            <div className="flex gap-5"><div className="skeleton h-44 w-32" /><div className="flex-1 space-y-3"><div className="skeleton h-6" /><div className="skeleton h-4 w-2/3" /></div></div>
          ) : cont ? (
            <div className="flex flex-col gap-5 sm:flex-row">
              <button onClick={() => navigate(`/app/${cont.kind === 'comic' ? 'comics' : 'books'}/${cont.item.id}`)} className="press-card w-32 shrink-0 self-start overflow-hidden !rounded-2xl p-1.5 sm:w-36">
                <Cover src={api.coverSrc(cont.item.cover_url)} title={cont.item.title} category={cont.item.category} className="aspect-[3/4] w-full rounded-xl" />
              </button>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="chip self-start bg-haze text-brand">{cont.kind === 'comic' ? '🦸 Комикс' : '📚 Кітап'} · {categoryLabel(cont.item.category)}</span>
                <h3 className="mt-2 text-xl font-extrabold leading-snug">{cont.item.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-ink/55">{cont.item.description}</p>
                <div className="mt-auto pt-4">
                  {cont.p ? (
                    <>
                      <div className="mb-1.5 flex justify-between text-xs font-bold text-ink/50">
                        <span>{cont.p.last_page} / {cont.p.total_pages} бет</span>
                        <span>{Math.round((cont.p.last_page / cont.p.total_pages) * 100)}%</span>
                      </div>
                      <ProgressBar value={(cont.p.last_page / cont.p.total_pages) * 100} />
                    </>
                  ) : (
                    <p className="text-sm font-semibold text-ink/45">Әлі басталмаған · {cont.item.pages ?? '?'} бет</p>
                  )}
                  <button onClick={() => navigate(`/app/${cont.kind === 'comic' ? 'comics' : 'books'}/${cont.item.id}`)} className="btn btn-primary mt-4">
                    Жалғастыру <IArrowR />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="rounded-2xl bg-mist p-6 text-center text-ink/55">Барлық материал оқылды! 🎉 Жаңа комикстерді күт.</p>
          )}
        </div>
        <DailyChallengeCard onDone={reload} />
      </section>

      {/* 5. Progress */}
      <section>
        <SectionHead title="Менің прогресім" action={<Link to="/app/achievements" className="text-sm font-bold text-brand hover:underline">Барлығы →</Link>} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ProgressTile icon={<IGame />} tone="#2A6B7F" label="Аяқталған ойындар" value={s ? `${s.games_completed}/${s.games_total}` : '—'} pct={s ? (s.games_completed / Math.max(1, s.games_total)) * 100 : 0} />
          <ProgressTile icon={<IComic />} tone="#63B1CB" label="Оқылған комикстер" value={s ? `${s.comics_read}/${s.comics_total}` : '—'} pct={s ? (s.comics_read / Math.max(1, s.comics_total)) * 100 : 0} />
          <ProgressTile icon={<IBook />} tone="#2FA1C8" label="Оқылған кітаптар" value={s ? `${s.books_read}/${s.books_total}` : '—'} pct={s ? (s.books_read / Math.max(1, s.books_total)) * 100 : 0} />
          <ProgressTile icon={<IZap />} tone="#4E97A9" label="Жалпы XP" value={profile.xp} pct={lp.pct} sub={`${lp.cur.level}-деңгей · ${lp.cur.name}`} />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold">Апталық белсенділік</h3>
              <span className="chip bg-haze text-brand">Оқу прогресі: {learning}%</span>
            </div>
            <WeekChart week={s?.week ?? []} />
          </div>
          <div className="card p-6">
            <h3 className="flex items-center gap-2 font-extrabold"><ITarget className="h-5 w-5 text-brand" /> Бүгінгі миссиялар</h3>
            <p className="text-sm text-ink/50">Үшеуін орында — бонус +{data?.settings.xp_missions ?? 25} XP</p>
            <ul className="mt-4 space-y-2.5">
              {[
                { ok: s?.missions.game, t: 'Кез келген ойынды аяқта', to: '/app/games' },
                { ok: s?.missions.read, t: 'Комикс немесе кітап оқы', to: '/app/comics' },
                { ok: s?.missions.daily, t: 'Күнделікті тапсырманы шеш', to: '/app' },
              ].map((m) => (
                <li key={m.t}>
                  <Link to={m.to} className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-sm font-bold transition ${m.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-haze hover:border-lavender'}`}>
                    <span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${m.ok ? 'bg-emerald-500 text-white' : 'bg-haze text-ink/40'}`}>{m.ok ? '✓' : ''}</span>
                    {m.t}
                  </Link>
                </li>
              ))}
            </ul>
            {s?.missions.bonus && <p className="mt-3 text-center text-sm font-bold text-emerald-600">🎉 Бонус алынды!</p>}
          </div>
        </div>
      </section>

      {/* 3. Featured comics */}
      <section>
        <SectionHead title="Жаңа комикстер" sub="Мұғалім жақында жүктеген" action={<Link to="/app/comics" className="text-sm font-bold text-brand hover:underline">Барлығы →</Link>} />
        {loading ? (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-80" />)}</div>
        ) : data!.comics.length === 0 ? (
          <Empty title="Комикстер әлі жоқ" text="Мұғалім жаңа комикс жүктегенде, ол осында бірден пайда болады." />
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 xl:grid-cols-4 stagger">
            {data!.comics.slice(0, 4).map((c) => <ContentCard key={c.id} item={c} kind="comic" api={api} progress={prog.get(`comic:${c.id}`)} />)}
          </div>
        )}
      </section>

      {/* 4. Games */}
      <section>
        <SectionHead title="Ойындарды зертте" sub="Ойнап үйрен, XP жина" action={<Link to="/app/games" className="text-sm font-bold text-brand hover:underline">Барлығы →</Link>} />
        {loading ? (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-72" />)}</div>
        ) : (
          <div className="grid grid-cols-1 gap-x-5 gap-y-8 min-[480px]:grid-cols-2 xl:grid-cols-4 stagger">
            {pickGames(data!.games, best).map((g) => <GameCard key={g.id} game={g} best={best[g.id]} />)}
          </div>
        )}
      </section>
    </div>
  );
}

/** Prefer games the student hasn't played yet, with variety of types. */
function pickGames(games: Game[], best: Record<string, number>) {
  const seen = new Set<string>();
  const unplayed = games.filter((g) => best[g.id] === undefined);
  const out: Game[] = [];
  for (const g of [...unplayed, ...games]) {
    if (out.length >= 4) break;
    if (seen.has(g.type) || out.includes(g)) continue;
    seen.add(g.type);
    out.push(g);
  }
  return out;
}

function ProgressTile({ icon, label, value, pct, tone, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; pct: number; tone: string; sub?: string }) {
  return (
    <div className="card card-hover p-5">
      <div className="flex items-center gap-3">
        <span className="tone-text grid h-11 w-11 place-items-center rounded-2xl" style={{ background: tone + '1A', color: tone }}>{icon}</span>
        <div>
          <p className="text-sm font-semibold text-ink/50">{label}</p>
          <p className="text-2xl font-extrabold leading-tight">{value}</p>
        </div>
      </div>
      <ProgressBar value={pct} className="mt-4 !h-2" />
      {sub && <p className="mt-2 text-xs font-semibold text-ink/45">{sub}</p>}
    </div>
  );
}

function WeekChart({ week }: { week: { day: string; xp: number }[] }) {
  const max = Math.max(50, ...week.map((w) => w.xp));
  const names = ['Жс', 'Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб'];
  return (
    <div className="mt-5 flex h-40 items-end gap-2 sm:gap-3">
      {week.map((w, i) => {
        const h = Math.max(6, (w.xp / max) * 100);
        const today = i === week.length - 1;
        return (
          <div key={w.day} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
            <span className="text-[11px] font-bold text-ink/45 opacity-0 transition group-hover:opacity-100">{w.xp}</span>
            <div
              className="w-full max-w-11 rounded-xl transition-[height] duration-700"
              style={{ height: `${h}%`, background: today ? 'linear-gradient(180deg,#B5DCE6,#6FB0C1)' : w.xp ? 'linear-gradient(180deg,var(--lavender),var(--brand))' : 'var(--haze)' }}
              title={`${w.day}: ${w.xp} XP`}
            />
            <span className={`text-xs font-bold ${today ? 'text-brand' : 'text-ink/40'}`}>{names[new Date(w.day + 'T12:00:00').getDay()]}</span>
          </div>
        );
      })}
    </div>
  );
}

