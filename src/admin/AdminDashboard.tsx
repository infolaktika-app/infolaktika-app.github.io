import { Laptop, Robot } from '../components/Art';
import { IBook, IComic, IGame, IPlus, IUsers } from '../components/Icons';
import { Avatar, PageLoader, StatCard } from '../components/ui';
import { useSession } from '../lib/auth';
import { formatDate, timeAgo } from '../lib/constants';
import { Link } from '../lib/router';
import { useAsync } from '../lib/useAsync';
import { BarList, ColumnChart } from './Charts';

export default function AdminDashboard() {
  const { api, profile } = useSession();
  const { data, loading } = useAsync(async () => {
    const [stats, students, comics, books] = await Promise.all([api.adminStats(), api.adminStudents(), api.listComics(), api.listBooks()]);
    return { stats, students, comics, books };
  }, []);
  if (loading || !data) return <PageLoader />;
  const { stats: s, students, comics, books } = data;
  const recent = [...comics.map((c) => ({ ...c, kind: 'Комикс' })), ...books.map((b) => ({ ...b, kind: 'Кітап' }))]
    .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#123642] to-night p-6 text-white sm:p-9">
        <div className="dot-grid absolute inset-0 opacity-15" />
        <div className="relative flex items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Сәлем, {profile.first_name || 'әкімші'}! 👋</h1>
            <p className="mt-2 max-w-lg text-white/70">Бүгін {s.active_today} оқушы белсенді болды. Жаңа материал жүктеп, оқушыларды қуантыңыз.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/admin/comics?new=1" className="btn btn-sun"><IPlus /> Комикс жүктеу</Link>
              <Link to="/admin/books?new=1" className="btn bg-white/10 text-white hover:bg-white/20"><IPlus /> Кітап жүктеу</Link>
              <Link to="/admin/tests/new" className="btn bg-white/10 text-white hover:bg-white/20"><IPlus /> Сауалнама</Link>
              <Link to="/admin/materials?new=1" className="btn bg-white/10 text-white hover:bg-white/20"><IPlus /> Материал</Link>
            </div>
          </div>
          <div className="relative hidden h-40 w-64 shrink-0 md:block">
            <Laptop className="float-slow absolute bottom-0 left-0 w-48" />
            <Robot className="float absolute bottom-2 right-0 w-24" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<IUsers />} label="Оқушылар" value={s.students} sub={`Бүгін белсенді: ${s.active_today}`} />
        <StatCard icon={<IComic />} label="Комикстер" value={s.comics} tone="#63B1CB" />
        <StatCard icon={<IBook />} label="Кітаптар" value={s.books} tone="#2FA1C8" />
        <StatCard icon={<IGame />} label="Аяқталған ойындар" value={s.games_completed} sub={`${s.games} ойын бар`} tone="#2683A3" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-extrabold">Оқушылар белсенділігі · 14 күн</h2>
            <Link to="/admin/stats" className="text-sm font-bold text-brand hover:underline">Толығырақ →</Link>
          </div>
          <ColumnChart data={s.activity.map((a) => ({ label: a.day.slice(8), value: a.users, tip: formatDate(a.day) }))} unit=" оқушы" />
        </div>
        <div className="card p-6">
          <h2 className="mb-4 font-extrabold">Ең көп ойналған ойындар</h2>
          <BarList data={s.popular_games.filter((g) => g.plays > 0).slice(0, 5).map((g) => ({ label: g.title, value: g.plays, sub: g.avg_pct !== null ? `${g.avg_pct}%` : undefined }))} empty="Әлі ешкім ойнамады" />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <div className="card p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-extrabold">Жаңа оқушылар</h2>
            <Link to="/admin/users" className="text-sm font-bold text-brand hover:underline">Барлығы →</Link>
          </div>
          {students.length === 0 && <p className="py-6 text-center text-sm text-ink/45">Әлі тіркелген оқушы жоқ</p>}
          <ul className="divide-y divide-haze">
            {students.slice(0, 5).map((st) => (
              <li key={st.id}>
                <Link to={`/admin/students/${st.id}`} className="flex items-center gap-3 py-3 hover:text-brand">
                  <Avatar id="robot-1" size={36} />
                  <span className="min-w-0 flex-1"><span className="block truncate font-bold">{st.first_name} {st.last_name}</span><span className="text-xs text-ink/45">@{st.username} · {timeAgo(st.created_at)}</span></span>
                  <span className="chip bg-sun/30 text-ink">💎 {st.xp}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-6">
          <h2 className="mb-3 font-extrabold">Соңғы жүктелген материалдар</h2>
          <ul className="divide-y divide-haze">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-3">
                <img src={api.coverSrc(r.cover_url) ?? ''} alt="" className="h-12 w-9 rounded-lg bg-haze object-cover" />
                <span className="min-w-0 flex-1"><span className="block truncate font-bold">{r.title}</span><span className="text-xs text-ink/45">{r.kind} · {formatDate(r.created_at)}</span></span>
                <span className={`chip ${r.published ? 'bg-emerald-50 text-emerald-700' : 'bg-haze text-ink/50'}`}>{r.published ? 'Жарияланды' : 'Жоба'}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
