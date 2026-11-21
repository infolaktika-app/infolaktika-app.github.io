import { useMemo, useState } from 'react';
import { IChevL, ISearch } from '../components/Icons';
import { Avatar, Confirm, Empty, LevelBar, PageLoader, ProgressBar, StatCard } from '../components/ui';
import { friendlyError } from '../lib/api';
import { useSession } from '../lib/auth';
import { formatDate, GAME_TYPES, LEVELS, timeAgo } from '../lib/constants';
import { Link, navigate } from '../lib/router';
import { useToast } from '../lib/toast';
import type { StudentRow } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { AdminHeader } from './AdminHeader';

type SortKey = 'created_at' | 'xp' | 'name' | 'games_completed';

export function StudentsPage() {
  const { api } = useSession();
  const toast = useToast();
  const { data, loading, reload } = useAsync(() => api.adminStudents(), []);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('created_at');
  const [del, setDel] = useState<StudentRow | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const r = (data ?? []).filter((s) => !needle || `${s.first_name} ${s.last_name} ${s.username}`.toLowerCase().includes(needle));
    const cmp: Record<SortKey, (a: StudentRow, b: StudentRow) => number> = {
      created_at: (a, b) => b.created_at.localeCompare(a.created_at),
      xp: (a, b) => b.xp - a.xp,
      games_completed: (a, b) => b.games_completed - a.games_completed,
      name: (a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'kk'),
    };
    return [...r].sort(cmp[sort]);
  }, [data, q, sort]);

  const block = async (s: StudentRow) => {
    try { await api.adminSetBlocked(s.id, !s.is_blocked); toast.success(s.is_blocked ? 'Аккаунт ашылды' : 'Аккаунт бұғатталды'); reload(); }
    catch (e) { toast.error(friendlyError(e)); }
  };

  if (loading) return <PageLoader />;
  return (
    <div>
      <AdminHeader title="Оқушылар" sub={`${data?.length ?? 0} тіркелген оқушы`} />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <ISearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/35" />
          <input className="input !pl-12" placeholder="Аты-жөні немесе логин бойынша іздеу…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className="input sm:w-60" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="created_at">Жаңа тіркелгендер</option>
          <option value="xp">Кристалл бойынша</option>
          <option value="games_completed">Ойындар бойынша</option>
          <option value="name">Тегі бойынша (А–Я)</option>
        </select>
      </div>
      {rows.length === 0 ? <Empty title="Оқушы табылмады" text="Оқушылар /register бетінде өздері тіркеледі." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-haze text-xs font-bold uppercase tracking-wide text-ink/40">
              <tr>
                <th className="px-5 py-3">Аты-жөні</th><th className="px-3 py-3">Логин</th><th className="px-3 py-3">Тіркелген</th>
                <th className="px-3 py-3">💎 Кристалл</th><th className="px-3 py-3">Деңгей</th><th className="px-3 py-3">Ойындар</th>
                <th className="px-3 py-3">Оқу белсенділігі</th><th className="px-3 py-3">Соңғы кіру</th><th className="px-5 py-3 text-right">Әрекет</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className={`border-b border-haze last:border-0 hover:bg-mist/70 ${s.is_blocked ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-3">
                    <Link to={`/admin/students/${s.id}`} className="font-extrabold hover:text-brand">{s.first_name} {s.last_name}</Link>
                    {s.is_blocked && <span className="chip ml-2 bg-rose-50 text-rose-600">Бұғатталған</span>}
                  </td>
                  <td className="px-3 py-3 text-ink/60">@{s.username}</td>
                  <td className="px-3 py-3 text-ink/60">{formatDate(s.created_at)}</td>
                  <td className="px-3 py-3 font-extrabold">💎 {s.xp}</td>
                  <td className="px-3 py-3"><span className="chip bg-haze text-brand">{s.level} · {LEVELS[s.level - 1]?.name}</span></td>
                  <td className="px-3 py-3 font-bold">{s.games_completed}</td>
                  <td className="px-3 py-3 text-ink/70">🦸 {s.comics_read} · 📚 {s.books_read} · {s.pages_read} бет</td>
                  <td className="px-3 py-3 text-ink/60">{s.last_active ? formatDate(s.last_active) : '—'}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-right">
                    <Link to={`/admin/students/${s.id}`} className="btn btn-soft btn-sm">Прогресс</Link>
                    <button className="btn btn-ghost btn-sm" onClick={() => block(s)}>{s.is_blocked ? 'Ашу' : 'Бұғаттау'}</button>
                    <button className="btn btn-ghost btn-sm text-rose-600" onClick={() => setDel(s)}>Жою</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Confirm open={!!del} onClose={() => setDel(null)} title={`${del?.first_name} ${del?.last_name} жойылсын ба?`}
        text="Аккаунт пен оқушының барлық прогресі біржола жойылады."
        onConfirm={async () => { try { await api.adminDeleteStudent(del!.id); toast.success('Оқушы жойылды'); setDel(null); reload(); } catch (e) { toast.error(friendlyError(e)); } }} />
    </div>
  );
}

export function StudentDetailPage({ id }: { id: string }) {
  const { api } = useSession();
  const toast = useToast();
  const { data: d, loading, reload } = useAsync(() => api.adminStudentDetail(id), [id]);
  const [xp, setXp] = useState('');
  if (loading) return <PageLoader />;
  if (!d?.profile) return <Empty title="Оқушы табылмады" action={<Link to="/admin/students" className="btn btn-primary">Тізімге</Link>} />;
  const p = d.profile;

  const adjust = async () => {
    const n = parseInt(xp, 10);
    if (!n) return;
    try { await api.adminAdjustXp(id, n); toast.success(`💎 ${n > 0 ? '+' : ''}${n} кристалл`); setXp(''); reload(); } catch (e) { toast.error(friendlyError(e)); }
  };

  return (
    <div className="space-y-6">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/students')}><IChevL className="h-4 w-4" /> Оқушылар</button>
      <div className="card flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <Avatar id={p.avatar} size={80} />
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold">{p.first_name} {p.last_name} {p.is_blocked && <span className="chip bg-rose-50 text-rose-600">Бұғатталған</span>}</h1>
          <p className="text-sm text-ink/50">@{p.username} · тіркелген {formatDate(p.created_at)} · соңғы кіру {p.last_active ? formatDate(p.last_active) : '—'}</p>
          <div className="mt-3 max-w-md"><LevelBar xp={p.xp} compact /></div>
        </div>
        <div className="flex items-center gap-2">
          <input className="input !w-28 !py-2" placeholder="± 💎" value={xp} onChange={(e) => setXp(e.target.value.replace(/[^\d-]/g, ''))} />
          <button className="btn btn-soft btn-sm" onClick={adjust}>Кристалл түзету</button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="💎" label="Кристалл" value={p.xp} tone="#4E97A9" />
        <StatCard icon="🔥" label="Серия" value={`${p.streak} күн`} sub={`Ең ұзақ: ${p.best_streak}`} tone="#4CA5C3" />
        <StatCard icon="🎮" label="Ойын нәтижелері" value={d.results.length} tone="#2A6B7F" />
        <StatCard icon="🏅" label="Жетістіктер" value={d.achievements.length} tone="#2683A3" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 font-extrabold">Оқу прогресі</h2>
          {d.reading.length === 0 && <p className="py-4 text-sm text-ink/45">Әлі ештеңе ашпаған</p>}
          <ul className="space-y-4">
            {d.reading.map((r, i) => (
              <li key={i}>
                <div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate font-bold">{r.item_type === 'comic' ? '🦸' : '📚'} {r.title}</span><span className="shrink-0 text-ink/50">{r.last_page}/{r.total_pages} {r.completed && '✓'}</span></div>
                <ProgressBar value={(r.last_page / r.total_pages) * 100} tone={r.completed ? 'mint' : 'brand'} className="!h-2" />
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-6">
          <h2 className="mb-4 font-extrabold">Ойын тарихы</h2>
          {d.results.length === 0 && <p className="py-4 text-sm text-ink/45">Әлі ойнамаған</p>}
          <ul className="divide-y divide-haze">
            {d.results.slice(0, 15).map((r, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
                <span>{GAME_TYPES[r.type]?.icon}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{r.title}</span>
                <span className="font-bold">{Math.round((r.score / r.max_score) * 100)}%</span>
                <span className="w-14 text-right text-emerald-600">+{r.xp_earned}</span>
                <span className="w-24 text-right text-xs text-ink/40">{timeAgo(r.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="card p-6">
        <h2 className="mb-3 font-extrabold">Жетістіктер</h2>
        <div className="flex flex-wrap gap-2">
          {d.achievements.length === 0 && <p className="text-sm text-ink/45">Әзірге жоқ</p>}
          {d.achievements.map((a) => <span key={a.code} className="chip bg-sun/25 !px-3 !py-1.5 text-sm text-ink">{a.icon} {a.title}</span>)}
        </div>
      </div>
    </div>
  );
}
