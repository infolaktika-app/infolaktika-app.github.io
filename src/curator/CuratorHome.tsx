import { Crystal } from '../components/Art';
import { GroupRating } from '../components/GroupRating';
import { IArrowR, IClipboard, IFile, IUserPlus } from '../components/Icons';
import { RobotBuddy } from '../components/RobotBuddy';
import { PageLoader, SectionHead, StatCard } from '../components/ui';
import { useAuth, useSession } from '../lib/auth';
import { formatDate } from '../lib/constants';
import { Link, navigate } from '../lib/router';
import { useAsync } from '../lib/useAsync';
import { ThemeToggle } from '../components/ThemeToggle';
import { Logo } from '../components/Art';
import { MadeBy } from '../components/MadeBy';

export default function CuratorHome() {
  const { api, profile } = useSession();
  const { data: o, loading } = useAsync(() => api.curatorOverview(), []);
  const { data: tests } = useAsync(() => api.curatorTests(), []);
  const { data: rating } = useAsync(() => api.groupRating(), []);
  if (loading) return <PageLoader />;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#2A6B7F] via-[#17404E] to-[#0B1D24] p-6 text-white sm:p-9">
        <div className="dot-grid absolute inset-0 opacity-20" />
        <Crystal className="float-slow absolute right-[38%] top-6 hidden w-7 drop-shadow-[0_0_14px_rgba(95,208,224,.7)] sm:block" />
        <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <span className="chip bg-white/15 text-white">🧑‍🏫 Куратор кабинеті</span>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">Сәлем, {profile.first_name}!</h1>
            <p className="mt-2 max-w-lg text-white/75">Оқушыларыңды қос, тест құрастыр және нәтижелерін бақыла.</p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link to="/curator/students?add=1" className="btn btn-sun btn-sm"><IUserPlus className="h-4 w-4" /> Оқушы қосу</Link>
              <Link to="/curator/tests/new" className="btn btn-sm bg-white/15 text-white hover:bg-white/25"><IClipboard className="h-4 w-4" /> Тест құрастыру</Link>
              <Link to="/curator/materials" className="btn btn-sm bg-white/15 text-white hover:bg-white/25"><IFile className="h-4 w-4" /> Материал жүктеу</Link>
            </div>
          </div>
          <div className="hidden md:block"><RobotBuddy className="w-44" /></div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon="🎓" label="Оқушылар" value={o?.students ?? 0} />
        <StatCard icon="📝" label="Тесттер" value={o?.tests ?? 0} tone="#2A6B7F" />
        <StatCard icon="✅" label="Тапсырылды" value={o?.attempts ?? 0} tone="#5E9A45" />
        <StatCard icon="🎯" label="Орташа нәтиже" value={o?.avg_pct == null ? '—' : `${o.avg_pct}%`} tone="#2683A3" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionHead title="Соңғы тесттер" action={<Link to="/curator/tests" className="text-sm font-bold text-brand">Барлығы →</Link>} />
          {(tests ?? []).length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-ink/55">Әзірге тест жоқ.</p>
              <button className="btn btn-primary btn-sm mt-3" onClick={() => navigate('/curator/tests/new')}>Алғашқы тестті құрастыру</button>
            </div>
          ) : (
            <div className="card divide-y divide-haze">
              {(tests ?? []).slice(0, 5).map((t) => (
                <Link key={t.id} to={`/curator/tests/${t.id}`} className="flex items-center gap-3 p-4 transition hover:bg-mist/60">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-haze text-lg">📝</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{t.title}</p>
                    <p className="text-xs text-ink/45">{t.questions.length} сұрақ · {formatDate(t.created_at)} {!t.published && '· жасырын'}</p>
                  </div>
                  <IArrowR className="h-4 w-4 shrink-0 text-ink/30" />
                </Link>
              ))}
            </div>
          )}
        </section>
        <section>
          <SectionHead title="Топ рейтингі" action={<Link to="/curator/rating" className="text-sm font-bold text-brand">Толығырақ →</Link>} />
          <GroupRating rows={(rating ?? []).slice(0, 5)} emptyText="Оқушылар тест тапсырғанда рейтинг осында шығады." />
        </section>
      </div>
    </div>
  );
}

/** Shown to a curator until an admin approves the account. */
export function CuratorPending() {
  const { profile, signOut, refresh } = useAuth();
  return (
    <div className="flex min-h-screen flex-col px-5 py-6 sm:px-10">
      <div className="flex items-center justify-between"><Logo /><ThemeToggle /></div>
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center py-10 text-center fade-up">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-sun/30 blur-3xl" />
          <RobotBuddy className="relative w-48" />
        </div>
        <span className="chip mt-6 bg-sun/35 text-ink">⏳ Растауды күтуде</span>
        <h1 className="mt-3 text-2xl font-extrabold">Рахмет, {profile?.first_name}!</h1>
        <p className="mt-2 text-ink/60">
          Куратор аккаунтыңыз жасалды. Әкімші сіздің мәліметтеріңізді тексеріп, растағаннан кейін оқушылар, тесттер және материалдар бөлімдері ашылады.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button className="btn btn-primary" onClick={() => refresh()}>Қайта тексеру</button>
          <button className="btn btn-ghost" onClick={async () => { await signOut(); navigate('/login'); }}>Шығу</button>
        </div>
      </div>
      <MadeBy />
    </div>
  );
}
