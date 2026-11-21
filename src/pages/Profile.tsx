import { useState, type FormEvent } from 'react';
import { Avatar, LevelBar, Spinner } from '../components/ui';
import { friendlyError } from '../lib/api';
import { useAuth, useSession } from '../lib/auth';
import { AVATARS, formatDate } from '../lib/constants';
import { navigate } from '../lib/router';
import { useToast } from '../lib/toast';
import { useAsync } from '../lib/useAsync';

export default function ProfilePage() {
  const { api, profile, refresh } = useSession();
  const { signOut } = useAuth();
  const toast = useToast();
  const [first, setFirst] = useState(profile.first_name);
  const [last, setLast] = useState(profile.last_name);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState({ a: '', b: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const { data: stats } = useAsync(() => api.myStats(), []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!first.trim() || !last.trim()) return toast.error('Аты мен тегін толтыр');
    setBusy(true);
    try {
      await api.updateProfile({ first_name: first.trim(), last_name: last.trim(), avatar });
      await refresh();
      toast.success('Профиль сақталды');
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const changePw = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.a.length < 6) return toast.error('Құпиясөз кемінде 6 таңба');
    if (pw.a !== pw.b) return toast.error('Құпиясөздер сәйкес емес');
    setPwBusy(true);
    try {
      await api.changePassword(pw.a);
      setPw({ a: '', b: '' });
      toast.success('Құпиясөз өзгертілді');
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="card relative overflow-hidden p-6 sm:p-8">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-[#2A6B7F] to-[#17404E]" />
        <div className="dot-grid absolute inset-x-0 top-0 h-28 opacity-20" />
        <div className="relative flex flex-col items-start gap-5 pt-10 sm:flex-row sm:items-end">
          <Avatar id={avatar} size={104} ring />
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold">{profile.first_name} {profile.last_name}</h1>
            <p className="text-sm font-semibold text-ink/50">@{profile.username} · Тіркелген күні: {formatDate(profile.created_at)}</p>
          </div>
          <div className="flex gap-2">
            <span className="chip bg-sun/35 !px-3 !py-2 text-sm text-ink">⭐ {profile.xp} XP</span>
            <span className="chip bg-haze !px-3 !py-2 text-sm text-brand">🔥 {profile.streak} күн</span>
            {stats && <span className="chip bg-haze !px-3 !py-2 text-sm text-brand">#{stats.rank}</span>}
          </div>
        </div>
        <div className="relative mt-6"><LevelBar xp={profile.xp} /></div>
      </div>

      <form onSubmit={save} className="card space-y-5 p-6 sm:p-8">
        <h2 className="text-lg font-extrabold">Жеке мәліметтер</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="label">Аты</span><input className="input" value={first} onChange={(e) => setFirst(e.target.value)} /></label>
          <label><span className="label">Тегі</span><input className="input" value={last} onChange={(e) => setLast(e.target.value)} /></label>
        </div>
        <div>
          <span className="label">Аватар</span>
          <div className="flex flex-wrap gap-3">
            {AVATARS.map((a) => (
              <button type="button" key={a.id} onClick={() => setAvatar(a.id)} className={`rounded-[20px] p-1 transition ${avatar === a.id ? 'scale-110 ring-4 ring-violet' : 'hover:scale-105'}`} aria-label={`Аватар ${a.emoji}`}>
                <Avatar id={a.id} size={52} />
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <button className="btn btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4 border-white/40 border-t-white" />} Сақтау</button>
        </div>
      </form>

      <form onSubmit={changePw} className="card space-y-5 p-6 sm:p-8">
        <h2 className="text-lg font-extrabold">Құпиясөзді өзгерту</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="label">Жаңа құпиясөз</span><input type="password" className="input" value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} autoComplete="new-password" /></label>
          <label><span className="label">Қайталау</span><input type="password" className="input" value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} autoComplete="new-password" /></label>
        </div>
        <div className="flex flex-wrap justify-between gap-3">
          <button type="button" className="btn btn-ghost text-rose-600" onClick={async () => { await signOut(); navigate('/login'); }}>Аккаунттан шығу</button>
          <button className="btn btn-soft" disabled={pwBusy || !pw.a}>{pwBusy && <Spinner className="h-4 w-4" />} Құпиясөзді жаңарту</button>
        </div>
      </form>
    </div>
  );
}
