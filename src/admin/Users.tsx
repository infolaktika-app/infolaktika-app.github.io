import { useMemo, useState } from 'react';
import { ISearch } from '../components/Icons';
import { Confirm, Empty, PageLoader } from '../components/ui';
import { friendlyError } from '../lib/api';
import { useSession } from '../lib/auth';
import { formatDate, LEVELS } from '../lib/constants';
import { Link } from '../lib/router';
import { useToast } from '../lib/toast';
import type { AdminUserRow } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { AdminHeader } from './AdminHeader';

type SortKey = 'created_at' | 'xp' | 'points' | 'name';

export default function UsersPage() {
  const { api } = useSession();
  const toast = useToast();
  const { data, loading, reload } = useAsync(() => api.adminUsers(), []);
  const [q, setQ] = useState('');
  const [stream, setStream] = useState('');
  const [sort, setSort] = useState<SortKey>('created_at');
  const [del, setDel] = useState<AdminUserRow | null>(null);
  const [busy, setBusy] = useState(false);

  const all = data ?? [];
  const streams = useMemo(() => [...new Set(all.map((s) => s.stream).filter(Boolean) as string[])].sort(), [data]);
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    const cmp: Record<SortKey, (a: AdminUserRow, b: AdminUserRow) => number> = {
      created_at: (a, b) => b.created_at.localeCompare(a.created_at),
      xp: (a, b) => b.xp - a.xp,
      points: (a, b) => b.test_points - a.test_points,
      name: (a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'kk'),
    };
    return all
      .filter((u) => !stream || u.stream === stream)
      .filter((u) => !n || `${u.first_name} ${u.last_name} ${u.username}`.toLowerCase().includes(n))
      .sort(cmp[sort]);
  }, [data, q, stream, sort]);

  const block = async (u: AdminUserRow) => {
    try { await api.adminSetBlocked(u.id, !u.is_blocked); toast.success(u.is_blocked ? 'Аккаунт ашылды' : 'Аккаунт бұғатталды'); reload(); }
    catch (e) { toast.error(friendlyError(e)); }
  };

  if (loading && !data) return <PageLoader />;

  const Actions = ({ u }: { u: AdminUserRow }) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <Link to={`/admin/students/${u.id}`} className="btn btn-soft btn-sm">Прогресс</Link>
      <button className="btn btn-ghost btn-sm" onClick={() => block(u)}>{u.is_blocked ? 'Ашу' : 'Бұғаттау'}</button>
      <button className="btn btn-ghost btn-sm text-rose-600" onClick={() => setDel(u)}>Жою</button>
    </div>
  );

  return (
    <div>
      <AdminHeader title="Оқушылар" sub={`${all.length} тіркелген оқушы${streams.length ? ` · ${streams.length} поток` : ''}`} />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <ISearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/35" />
          <input className="input !pl-12" placeholder="Аты-жөні немесе логин…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className="input sm:w-44" value={stream} onChange={(e) => setStream(e.target.value)} aria-label="Поток">
          <option value="">Барлық поток</option>
          {streams.map((s) => <option key={s} value={s}>{s} поток</option>)}
        </select>
        <select className="input sm:w-52" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Сұрыптау">
          <option value="created_at">Жаңа тіркелгендер</option>
          <option value="xp">Кристалл бойынша</option>
          <option value="points">Сауалнама ұпайы бойынша</option>
          <option value="name">Тегі бойынша (А–Я)</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <Empty title="Оқушы табылмады" text={all.length ? undefined : 'Оқушылар /register бетінде өздері тіркеледі.'} />
      ) : (
        <>
          {/* phones & tablets: cards */}
          <div className="grid gap-3 md:grid-cols-2 lg:hidden">
            {rows.map((u) => (
              <div key={u.id} className={`card p-4 ${u.is_blocked ? 'opacity-70' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-extrabold [overflow-wrap:anywhere]">{u.first_name} {u.last_name}</p>
                    <p className="text-xs font-semibold text-ink/45">@{u.username} · {formatDate(u.created_at)}</p>
                  </div>
                  <span className="chip shrink-0 bg-sun/30 text-ink">💎 {u.xp}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  <span className="chip bg-haze text-brand">{u.stream ? `${u.stream} поток` : 'Поток жоқ'}</span>
                  <span className="chip bg-mist text-ink/60">📝 {u.test_points} ұпай · {u.tests_done} сауалнама</span>
                  {u.is_blocked && <span className="chip bg-rose-50 text-rose-600">Бұғатталған</span>}
                </div>
                <div className="mt-3 border-t border-haze pt-3"><Actions u={u} /></div>
              </div>
            ))}
          </div>

          {/* desktop: table */}
          <div className="card hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-haze text-xs font-bold uppercase tracking-wide text-ink/40">
                <tr>
                  <th className="px-5 py-3">Аты-жөні</th><th className="px-3 py-3">Поток</th><th className="px-3 py-3">💎 Кристалл</th>
                  <th className="px-3 py-3">Деңгей</th><th className="px-3 py-3">Сауалнама</th><th className="px-3 py-3">Соңғы кіру</th><th className="px-5 py-3 text-right">Әрекет</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className={`border-b border-haze last:border-0 hover:bg-mist/70 ${u.is_blocked ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3">
                      <Link to={`/admin/students/${u.id}`} className="font-extrabold hover:text-brand">{u.first_name} {u.last_name}</Link>
                      <p className="text-xs text-ink/45">@{u.username} · {formatDate(u.created_at)}{u.is_blocked ? ' · бұғатталған' : ''}</p>
                    </td>
                    <td className="px-3 py-3">{u.stream ? <span className="chip bg-haze text-brand">{u.stream}</span> : <span className="text-ink/35">—</span>}</td>
                    <td className="px-3 py-3 font-extrabold">💎 {u.xp}</td>
                    <td className="px-3 py-3"><span className="chip bg-haze text-brand">{u.level} · {LEVELS[u.level - 1]?.name}</span></td>
                    <td className="px-3 py-3 text-ink/70">{u.test_points} ұпай · {u.tests_done}</td>
                    <td className="px-3 py-3 text-ink/60">{u.last_active ? formatDate(u.last_active) : '—'}</td>
                    <td className="px-5 py-3"><div className="flex justify-end"><Actions u={u} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Confirm open={!!del} onClose={() => setDel(null)} busy={busy}
        title={`${del?.first_name} ${del?.last_name} жойылсын ба?`}
        text="Аккаунт пен оқушының барлық прогресі біржола жойылады."
        onConfirm={async () => {
          setBusy(true);
          try { await api.adminDeleteStudent(del!.id); toast.success('Оқушы жойылды'); setDel(null); reload(); }
          catch (e) { toast.error(friendlyError(e)); } finally { setBusy(false); }
        }} />
    </div>
  );
}
