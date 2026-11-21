import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ICopy, ISearch, ITrash, IUserPlus } from '../components/Icons';
import { Avatar, Confirm, Empty, Modal, PageLoader, Spinner } from '../components/ui';
import { friendlyError } from '../lib/api';
import { useSession } from '../lib/auth';
import { formatDate, STREAM_RE } from '../lib/constants';
import { useLocation } from '../lib/router';
import { useToast } from '../lib/toast';
import type { CuratorStudentRow, NewStudentCredentials } from '../lib/types';
import { useAsync } from '../lib/useAsync';

function copy(text: string) {
  return navigator.clipboard?.writeText(text).then(() => true, () => false) ?? Promise.resolve(false);
}

function AddStudentModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { api } = useSession();
  const toast = useToast();
  const [f, setF] = useState({ first_name: '', last_name: '', stream: '' });
  const [busy, setBusy] = useState(false);
  const [cred, setCred] = useState<(NewStudentCredentials & { name: string }) | null>(null);

  const close = () => { setCred(null); setF({ first_name: '', last_name: '', stream: f.stream }); onClose(); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.first_name.trim() || !f.last_name.trim()) return toast.error('Аты мен тегін жазыңыз');
    if (!STREAM_RE.test(f.stream)) return toast.error('Поток нөмірін жазыңыз (мысалы: 01, 11, 21)');
    setBusy(true);
    try {
      const c = await api.curatorCreateStudent(f);
      setCred({ ...c, name: `${f.first_name.trim()} ${f.last_name.trim()}` });
      onDone();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const shareText = cred ? `INFOLAKTIKA\n${cred.name}\nЛогин: ${cred.username}\nУақытша құпиясөз: ${cred.password}\nБірінші кіргенде өз логиніңді және құпиясөзіңді жасайсың.\n${location.origin}${location.pathname}` : '';

  return (
    <Modal open={open} onClose={close} title={cred ? 'Оқушы қосылды ✅' : 'Оқушы қосу'}>
      {cred ? (
        <div className="space-y-4">
          <p className="text-ink/65"><b className="text-ink">{cred.name}</b> үшін бір реттік кіру деректері. Оны оқушыға беріңіз — бірінші кіргенде ол өз логині мен құпиясөзін жасайды.</p>
          <div className="space-y-2 rounded-3xl bg-haze/70 p-4">
            {([['Логин', cred.username], ['Құпиясөз', cred.password]] as const).map(([k, v]) => (
              <div key={k} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3">
                <span className="w-20 shrink-0 text-sm font-semibold text-ink/50">{k}</span>
                <code className="min-w-0 flex-1 truncate text-lg font-extrabold tracking-wide">{v}</code>
                <button className="icon-btn !h-9 !w-9" onClick={async () => ((await copy(v)) ? toast.success('Көшірілді') : toast.error('Көшіру мүмкін болмады'))} aria-label={`${k} көшіру`}><ICopy className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <p className="text-xs font-semibold text-rose-600">Бұл құпиясөз қайта көрсетілмейді — қазір көшіріп алыңыз.</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button className="btn btn-soft" onClick={async () => ((await copy(shareText)) ? toast.success('Барлығы көшірілді') : toast.error('Көшіру мүмкін болмады'))}><ICopy className="h-4 w-4" /> Барлығын көшіру</button>
            <button className="btn btn-ghost" onClick={() => setCred(null)}>Тағы қосу</button>
            <button className="btn btn-primary" onClick={close}>Дайын</button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className="label">Аты</span><input className="input" value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} placeholder="Аружан" /></label>
            <label><span className="label">Тегі</span><input className="input" value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} placeholder="Серікқызы" /></label>
          </div>
          <label className="block"><span className="label">Поток</span>
            <input className="input" inputMode="numeric" value={f.stream} onChange={(e) => setF({ ...f, stream: e.target.value.replace(/[^0-9A-Za-z-]/g, '').slice(0, 8) })} placeholder="мысалы: 11" />
          </label>
          <p className="rounded-2xl bg-haze/70 px-4 py-2.5 text-xs font-semibold text-ink/60">Жүйе уақытша логин мен құпиясөз жасайды. Оқушы оны бір рет қолданып, кейін өзінікін құрастырады.</p>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-ghost" onClick={close}>Бас тарту</button>
            <button className="btn btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4 border-white/40 border-t-white" />} Қосу</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default function CuratorStudents() {
  const { api } = useSession();
  const toast = useToast();
  const { search } = useLocation();
  const { data, loading, reload } = useAsync(() => api.curatorStudents(), []);
  const [q, setQ] = useState('');
  const [stream, setStream] = useState('');
  const [add, setAdd] = useState(search.get('add') === '1');
  const [del, setDel] = useState<CuratorStudentRow | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  useEffect(() => { if (search.get('add') === '1') setAdd(true); }, [search]);

  const streams = useMemo(() => [...new Set((data ?? []).map((s) => s.stream).filter(Boolean) as string[])].sort(), [data]);
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (data ?? []).filter((s) => (!stream || s.stream === stream) && (!n || `${s.first_name} ${s.last_name} ${s.username}`.toLowerCase().includes(n)));
  }, [data, q, stream]);

  if (loading && !data) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Оқушыларым</h1>
          <p className="mt-1 text-ink/55">{data?.length ?? 0} оқушы · өздері таңдаған немесе сіз қосқан</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAdd(true)}><IUserPlus className="h-5 w-5" /> Оқушы қосу</button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <ISearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/35" />
          <input className="input !pl-12" placeholder="Аты-жөні немесе логин…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className="input sm:w-48" value={stream} onChange={(e) => setStream(e.target.value)} aria-label="Поток">
          <option value="">Барлық поток</option>
          {streams.map((s) => <option key={s} value={s}>{s} поток</option>)}
        </select>
      </div>

      {rows.length === 0 ? (
        <Empty title={data?.length ? 'Ешкім табылмады' : 'Әзірге оқушы жоқ'} text={data?.length ? undefined : 'Оқушыны өзіңіз қосыңыз немесе оқушылар профилінде сізді куратор етіп таңдайды.'}
          action={!data?.length && <button className="btn btn-primary" onClick={() => setAdd(true)}><IUserPlus className="h-5 w-5" /> Оқушы қосу</button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {rows.map((s) => (
            <div key={s.id} className="card flex items-center gap-3 p-4">
              <Avatar id={s.avatar} size={48} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold">{s.first_name} {s.last_name}</p>
                <p className="truncate text-xs font-semibold text-ink/45">@{s.username} · {formatDate(s.created_at)}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {s.stream && <span className="chip bg-haze !py-0.5 text-[11px] text-brand">{s.stream} поток</span>}
                  <span className="chip bg-sun/30 !py-0.5 text-[11px] text-ink">🎯 {s.points} ұпай</span>
                  <span className="chip bg-mist !py-0.5 text-[11px] text-ink/60">💎 {s.xp}</span>
                  {s.must_change && <span className="chip bg-rose-50 !py-0.5 text-[11px] text-rose-600">Әлі кірмеген</span>}
                </div>
              </div>
              <button className="icon-btn !h-10 !w-10 shrink-0 hover:!text-rose-500" onClick={() => setDel(s)} aria-label="Өшіру" title="Өшіру">
                <ITrash className="h-[18px] w-[18px]" />
              </button>
            </div>
          ))}
        </div>
      )}

      <AddStudentModal open={add} onClose={() => setAdd(false)} onDone={reload} />
      <Confirm
        open={!!del}
        onClose={() => setDel(null)}
        busy={delBusy}
        confirmLabel={del?.created_by_me ? 'Жою' : 'Тізімнен шығару'}
        title={`${del?.first_name} ${del?.last_name}`}
        text={del?.created_by_me
          ? 'Бұл аккаунтты сіз жасағансыз — ол барлық прогресімен біржола жойылады.'
          : 'Оқушы өзі тіркелген, сондықтан аккаунты сақталады — тек сіздің тізіміңізден шығарылады.'}
        onConfirm={async () => {
          setDelBusy(true);
          try {
            const r = await api.curatorRemoveStudent(del!.id);
            toast.success(r === 'deleted' ? 'Оқушы жойылды' : 'Тізімнен шығарылды');
            setDel(null);
            reload();
          } catch (e) { toast.error(friendlyError(e)); } finally { setDelBusy(false); }
        }}
      />
    </div>
  );
}
