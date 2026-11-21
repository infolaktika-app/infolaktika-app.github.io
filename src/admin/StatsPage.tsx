import { IBook, IComic, IGame, IUsers, IZap } from '../components/Icons';
import { PageLoader, StatCard } from '../components/ui';
import { useSession } from '../lib/auth';
import { formatDate, LEVELS } from '../lib/constants';
import { useAsync } from '../lib/useAsync';
import { AdminHeader } from './AdminHeader';
import { BarList, ColumnChart } from './Charts';

export default function StatsPage() {
  const { api } = useSession();
  const { data: s, loading } = useAsync(() => api.adminStats(), []);
  if (loading || !s) return <PageLoader />;
  const totalEvents = s.activity.reduce((a, b) => a + b.events, 0);

  return (
    <div className="space-y-6">
      <AdminHeader title="Статистика" sub="Платформаның жалпы көрсеткіштері" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={<IUsers />} label="Барлық оқушы" value={s.students} sub={`Бүгін: ${s.active_today}`} />
        <StatCard icon={<IComic />} label="Комикстер" value={s.comics} tone="#63B1CB" />
        <StatCard icon={<IBook />} label="Кітаптар" value={s.books} tone="#2FA1C8" />
        <StatCard icon={<IGame />} label="Аяқталған ойын" value={s.games_completed} tone="#2683A3" />
        <StatCard icon={<IZap />} label="Жиналған XP" value={s.xp_total.toLocaleString('ru-RU')} tone="#4E97A9" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-extrabold">Белсенді оқушылар саны</h2>
          <p className="mb-4 text-sm text-ink/50">Соңғы 14 күн, күніне</p>
          <ColumnChart data={s.activity.map((a) => ({ label: a.day.slice(8), value: a.users, tip: formatDate(a.day) }))} unit=" оқушы" />
        </div>
        <div className="card p-6">
          <h2 className="font-extrabold">Оқу әрекеттері</h2>
          <p className="mb-4 text-sm text-ink/50">XP әкелген әрекеттер · 14 күнде {totalEvents}</p>
          <ColumnChart data={s.activity.map((a) => ({ label: a.day.slice(8), value: a.events, tip: formatDate(a.day) }))} unit=" әрекет" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-6">
          <h2 className="mb-4 font-extrabold">Ең танымал комикстер</h2>
          <BarList data={s.popular_comics.map((c) => ({ label: c.title, value: c.readers, sub: `${c.finished} оқып бітті` }))} unit=" оқырман" />
        </div>
        <div className="card p-6">
          <h2 className="mb-4 font-extrabold">Ең көп ойналған ойындар</h2>
          <BarList data={s.popular_games.map((g) => ({ label: g.title, value: g.plays, sub: g.avg_pct !== null ? `орт. ${g.avg_pct}%` : undefined }))} unit=" рет" />
        </div>
        <div className="card p-6">
          <h2 className="mb-4 font-extrabold">Деңгейлер бойынша оқушылар</h2>
          <BarList data={s.levels.map((l) => ({ label: `${l.level} · ${LEVELS[l.level - 1]?.name}`, value: l.count }))} unit=" оқушы" />
        </div>
      </div>
      <div className="card p-6">
        <h2 className="mb-4 font-extrabold">Ең көп оқылған кітаптар</h2>
        <BarList data={s.popular_books.map((b) => ({ label: b.title, value: b.readers }))} unit=" оқырман" />
      </div>
    </div>
  );
}
