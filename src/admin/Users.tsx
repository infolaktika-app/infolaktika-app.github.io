import { useMemo, useState } from 'react';
import { IPhone, ISearch } from '../components/Icons';
import { Confirm, Empty, PageLoader, Tabs } from '../components/ui';
import { friendlyError } from '../lib/api';
import { useSession } from '../lib/auth';
import { formatDate, formatPhone, LEVELS } from '../lib/constants';
import { Link } from '../lib/router';
import { useToast } from '../lib/toast';
import type { AdminUserRow } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { AdminHeader } from './AdminHeader';

type Tab = 'student' | 'curator';

export default function UsersPage() {
  const { api } = useSession();
  const toast = useToast();
  const { data, loading, reload } = useAsync(() => api.adminUsers(), []);
  const [tab, setTab] = useState<Tab>('student');
  const [q, setQ] = useState('');
  const [stream, setStream] = useState('');
  const [status, setStatus] = useState<'' | 'pending' | 'approved'>('');
  const [del, setDel] = useState<AdminUserRow | null>(null);
  const [busy, setBusy] = useState(false);

  const all = data ?? [];
  const students = all.filter((u) => u.role === 'student');
  const curators = all.filter((u) => u.role === 'curator');
  const pending = curators.filter((c) => c.curator_status === 'pending').length;
  const streams = useMemo(() => [...new Set(students.map((s) => s.stream).filter(Boolean) as string[])].sort(), [data]);

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return all.filter((u) => u.role === tab)
      .filter((u) => tab !== 'student' || !stream || u.stream === stream)
      .filter((u) => tab !== 'curator' || !status || u.curator_status === status)
      .filter((u) => !n || `${u.first_name} ${u.last_name} ${u.username} ${u.phone ?? ''} ${u.curator_name ?? ''}`.toLowerCase().includes(n))
      .sort((a, b) => (tab === 'curator' ? Number(b.curator_status === 'pending') - Number(a.curator_status === 'pending') : 0) || b.created_at.localeCompare(a.created_at));
  }, [data, tab, q, stream, status]);

  const act = async (fn: () => Promise<void>, ok: string) => {
    try { await fn(); toast.success(ok); reload(); } catch (e) { toast.error(friendlyError(e)); }
  };
  const block = (u: AdminUserRow) => act(() => api.adminSetBlocked(u.id, !u.is_blocked), u.is_blocked ? 'Аккаунт ашылды' : 'Аккаунт бұғатталды');
  const approve = (u: AdminUserRow, s: 'pending' | 'approved') => act(() => api.adminSetCuratorStatus(u.id, s), s === 'approved' ? 'Куратор расталды' : 'Растау алынды');

  if (loading && !data) return <PageLoader />;

  const Actions = ({ u }: { u: AdminUserRow }) => (
    <div className="flex flex-wrap items-center gap-1.5">
      {u.role === 'student' ? (
        <Link to={`/admin/students/${u.id}`} className="btn btn-soft btn-sm">Прогресс</Link>
      ) : u.curator_status === 'pending' ? (
        <button className="btn btn-sun btn-sm" onClick={() => approve(u, 'approved')}>✓ Растау</button>
      ) : (
        <button className="btn btn-ghost btn-sm" onClick={() => approve(u, 'pending')}>Растауды алу</button>
      )}
      <button className="btn btn-ghost btn-sm" onClick={() => block(u)}>{u.is_blocked ? 'Ашу' : 'Бұғаттау'}</button>
      <button className="btn btn-ghost btn-sm text-rose-600" onClick={() => setDel(u)}>Жою</button>
    </div>
  );

  const Badges = ({ u }: { u: AdminUserRow }) => (
    <>
      {u.role === 'curator' && (u.curator_status === 'pending'
        ? <span className="chip bg-sun/40 text-ink">⏳ Растауды күтуде</span>
        : <span className="chip bg-haze text-brand">✓ Расталған</span>)}
      {u.is_blocked && <span className="chip bg-rose-50 text-rose-600">Бұғатталған</span>}
    </>
  );

  return (
    <div>
      <AdminHeader title="Пайдаланушылар" sub={`${students.length} оқушы · ${curators.length} куратор`} />
      <div className="mb-4">
        <Tabs value={tab} onChange={(v) => { setTab(v); setQ(''); }} items={[
          { value: 'student', label: `🎓 Оқушылар (${students.length})` },
          { value: 'curator', label: `🧑‍🏫 Кураторлар (${curators.length})${pending ? ` ⏳${pending}` : ''}` },
        ]} />
      </div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <ISearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/35" />
          <input className="input !pl-12" placeholder={tab === 'student' ? 'Аты-жөні, логин немесе куратор…' : 'Аты-жөні, логин немесе телефон…'} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {tab === 'student' ? (
          <select className="input sm:w-48" value={stream} onChange={(e) => setStream(e.target.value)} aria-label="Поток">
            <option value="">Барлық поток</option>
            {streams.map((s) => <option key={s} value={s}>{s} поток</option>)}
          </select>
        ) : (
          <select className="input sm:w-56" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Күйі">
            <option value="">Барлығы</option>
            <option value="pending">Растауды күтетіндер</option>
            <option value="approved">Расталғандар</option>
          </select>
        )}
      </div>

      {rows.length === 0 ? (
        <Empty title={tab === 'student' ? 'Оқушы табылмады' : 'Куратор табылмады'} text={tab === 'curator' && !curators.length ? 'Кураторлар /register бетінде «Куратор» рөлін таңдап тіркеледі.' : undefined} />
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
                  {u.role === 'student' && <span className="chip shrink-0 bg-sun/30 text-ink">⭐ {u.xp}</span>}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  <Badges u={u} />
                  {u.role === 'student' ? (
                    <>
                      <span className="chip bg-haze text-brand">{u.stream ? `${u.stream} поток` : 'Поток жоқ'}</span>
                      <span className="chip bg-mist text-ink/60">{u.curator_name ? `Куратор: ${u.curator_name}` : 'Кураторсыз'}</span>
                    </>
                  ) : (
                    <>
                      {u.phone && <a href={`tel:${u.phone}`} className="chip bg-mist text-brand"><IPhone className="h-3.5 w-3.5" /> {formatPhone(u.phone)}</a>}
                      <span className="chip bg-mist text-ink/60">{u.students} оқушы</span>
                    </>
                  )}
                </div>
                <div className="mt-3 border-t border-haze pt-3"><Actions u={u} /></div>
              </div>
            ))}
          </div>

          {/* desktop: table */}
          <div className="card hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-haze text-xs font-bold uppercase tracking-wide text-ink/40">
                {tab === 'student' ? (
                  <tr><th className="px-5 py-3">Аты-жөні</th><th className="px-3 py-3">Поток</th><th className="px-3 py-3">Куратор</th><th className="px-3 py-3">XP</th><th className="px-3 py-3">Деңгей</th><th className="px-3 py-3">Соңғы кіру</th><th className="px-5 py-3 text-right">Әрекет</th></tr>
                ) : (
                  <tr><th className="px-5 py-3">Аты-жөні</th><th className="px-3 py-3">Телефон</th><th className="px-3 py-3">Күйі</th><th className="px-3 py-3">Оқушылар</th><th className="px-3 py-3">Тіркелген</th><th className="px-5 py-3 text-right">Әрекет</th></tr>
                )}
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className={`border-b border-haze last:border-0 hover:bg-mist/70 ${u.is_blocked ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3">
                      <p className="font-extrabold">{u.first_name} {u.last_name}</p>
                      <p className="text-xs text-ink/45">@{u.username}{u.is_blocked ? ' · бұғатталған' : ''}</p>
                    </td>
                    {tab === 'student' ? (
                      <>
                        <td className="px-3 py-3">{u.stream ? <span className="chip bg-haze text-brand">{u.stream}</span> : <span className="text-ink/35">—</span>}</td>
                        <td className="px-3 py-3 text-ink/70">{u.curator_name ?? <span className="text-ink/35">—</span>}</td>
                        <td className="px-3 py-3 font-extrabold">⭐ {u.xp}</td>
                        <td className="px-3 py-3"><span className="chip bg-haze text-brand">{u.level} · {LEVELS[u.level - 1]?.name}</span></td>
                        <td className="px-3 py-3 text-ink/60">{u.last_active ? formatDate(u.last_active) : '—'}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-3">{u.phone ? <a href={`tel:${u.phone}`} className="font-semibold text-brand hover:underline">{formatPhone(u.phone)}</a> : '—'}</td>
                        <td className="px-3 py-3"><div className="flex flex-wrap gap-1"><Badges u={u} /></div></td>
                        <td className="px-3 py-3 font-bold">{u.students}</td>
                        <td className="px-3 py-3 text-ink/60">{formatDate(u.created_at)}</td>
                      </>
                    )}
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
        text={del?.role === 'curator'
          ? 'Куратор аккаунты, оның тесттері мен материалдары біржола жойылады. Оқушылары сақталады, бірақ кураторсыз қалады.'
          : 'Аккаунт пен оқушының барлық прогресі біржола жойылады.'}
        onConfirm={async () => {
          setBusy(true);
          try { await api.adminDeleteStudent(del!.id); toast.success('Жойылды'); setDel(null); reload(); }
          catch (e) { toast.error(friendlyError(e)); } finally { setBusy(false); }
        }} />
    </div>
  );
}
