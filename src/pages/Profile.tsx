import { useRef, useState, type FormEvent } from 'react';
import { Avatar, isPhotoAvatar, LevelBar, Spinner } from '../components/ui';
import { ICamera, ITrash } from '../components/Icons';
import { friendlyError } from '../lib/api';
import { useAuth, useSession } from '../lib/auth';
import { AVATARS, formatDate, formatPhone, normalizePhone, STREAM_RE } from '../lib/constants';
import { navigate } from '../lib/router';
import { useToast } from '../lib/toast';
import { useAsync } from '../lib/useAsync';

/** Center-crop to a square and downscale, so avatars stay small (≈20–40 KB). */
async function squarePhoto(file: File, size = 320): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const c = document.createElement('canvas');
  c.width = c.height = Math.min(size, side);
  c.getContext('2d')!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, c.width, c.height);
  bmp.close?.();
  return new Promise((r, j) => c.toBlob((b) => (b ? r(b) : j(new Error('Суретті өңдеу мүмкін болмады'))), 'image/jpeg', 0.85));
}

export default function ProfilePage() {
  const { api, profile, refresh } = useSession();
  const { signOut } = useAuth();
  const toast = useToast();
  const curator = profile.role === 'curator';
  const [first, setFirst] = useState(profile.first_name);
  const [last, setLast] = useState(profile.last_name);
  const [stream, setStream] = useState(profile.stream ?? '');
  const [phone, setPhone] = useState(profile.phone ? formatPhone(profile.phone) : '');
  const [avatar, setAvatar] = useState(profile.avatar);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [pw, setPw] = useState({ a: '', b: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [curatorId, setCuratorId] = useState(profile.curator_id ?? '');
  const [curBusy, setCurBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: stats } = useAsync(() => (curator ? Promise.resolve(null) : api.myStats()), []);
  const { data: curators } = useAsync(() => (curator ? Promise.resolve([]) : api.listCurators()), []);
  const myCurator = curators?.find((c) => c.id === profile.curator_id);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!first.trim() || !last.trim()) return toast.error('Аты мен тегін толтыр');
    if (!curator && !STREAM_RE.test(stream)) return toast.error('Поток нөмірін жаз (мысалы: 01, 11, 21)');
    const ph = normalizePhone(phone);
    if (curator && !ph) return toast.error('Телефон нөмірін дұрыс жазыңыз');
    setBusy(true);
    try {
      await api.updateProfile({
        first_name: first.trim(), last_name: last.trim(), avatar,
        ...(curator ? { phone: ph! } : { stream: stream.trim() }),
      });
      await refresh();
      toast.success('Профиль сақталды');
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Сурет файлын таңдаңыз (JPG, PNG)');
    if (file.size > 15 * 1024 * 1024) return toast.error('Сурет тым үлкен (ең көбі 15 МБ)');
    setPhotoBusy(true);
    try {
      const blob = await squarePhoto(file);
      const url = await api.uploadAvatar(blob);
      await api.updateProfile({ avatar: url });
      setAvatar(url);
      await refresh();
      toast.success('Фото жаңартылды');
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    try {
      await api.updateProfile({ avatar: 'robot-1' });
      setAvatar('robot-1');
      await refresh();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setPhotoBusy(false);
    }
  };

  const saveCurator = async () => {
    setCurBusy(true);
    try {
      await api.updateProfile({ curator_id: curatorId || null });
      await refresh();
      toast.success(curatorId ? 'Куратор таңдалды' : 'Куратор алынып тасталды');
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setCurBusy(false);
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

  const hasPhoto = isPhotoAvatar(avatar);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="card relative overflow-hidden p-5 sm:p-8">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-[#2A6B7F] to-[#17404E]" />
        <div className="dot-grid absolute inset-x-0 top-0 h-28 opacity-20" />
        <div className="relative flex flex-col items-start gap-4 pt-10 sm:flex-row sm:items-end sm:gap-5">
          <div className="relative">
            <Avatar id={avatar} size={104} ring />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={photoBusy}
              className="absolute -bottom-2 -right-2 grid h-10 w-10 place-items-center rounded-full bg-sun text-[#0F2A33] shadow-[0_3px_0_#5E9A45] transition hover:scale-105"
              aria-label="Фото жүктеу"
              title="Фото жүктеу"
            >
              {photoBusy ? <Spinner className="h-4 w-4 border-[#0F2A33]/30 border-t-[#0F2A33]" /> : <ICamera className="h-5 w-5" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold">{profile.first_name} {profile.last_name}</h1>
            <p className="text-sm font-semibold text-ink/50">
              @{profile.username} · {curator ? 'Куратор' : `${profile.stream ? `${profile.stream} поток · ` : ''}Тіркелген: ${formatDate(profile.created_at)}`}
            </p>
          </div>
          {!curator && (
            <div className="flex flex-wrap gap-2">
              <span className="chip bg-sun/35 !px-3 !py-2 text-sm text-ink">💎 {profile.xp}</span>
              <span className="chip bg-haze !px-3 !py-2 text-sm text-brand">🔥 {profile.streak} күн</span>
              {stats && <span className="chip bg-haze !px-3 !py-2 text-sm text-brand">#{stats.rank}</span>}
            </div>
          )}
        </div>
        {!curator && <div className="relative mt-6"><LevelBar xp={profile.xp} /></div>}
      </div>

      {!curator && (
        <div className="card space-y-4 p-5 sm:p-8">
          <div>
            <h2 className="text-lg font-extrabold">Менің кураторым</h2>
            <p className="text-sm text-ink/50">Кураторыңды таңда — оның тесттері мен рейтингі саған ашылады.</p>
          </div>
          {myCurator && (
            <div className="flex items-center gap-3 rounded-2xl bg-haze/60 p-3">
              <Avatar id={myCurator.avatar} size={44} />
              <div className="min-w-0">
                <p className="truncate font-extrabold">{myCurator.first_name} {myCurator.last_name}</p>
                <p className="text-xs text-ink/50">{myCurator.students} оқушы</p>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <select className="input flex-1" value={curatorId} onChange={(e) => setCuratorId(e.target.value)} aria-label="Куратор">
              <option value="">— Куратор таңдалмаған —</option>
              {(curators ?? []).map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.students} оқушы)</option>)}
            </select>
            <button className="btn btn-primary" onClick={saveCurator} disabled={curBusy || curatorId === (profile.curator_id ?? '')}>
              {curBusy && <Spinner className="h-4 w-4 border-white/40 border-t-white" />} Сақтау
            </button>
          </div>
          {curators && curators.length === 0 && <p className="text-sm text-ink/45">Әзірге расталған куратор жоқ.</p>}
        </div>
      )}

      <form onSubmit={save} className="card space-y-5 p-5 sm:p-8">
        <h2 className="text-lg font-extrabold">Жеке мәліметтер</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="label">Аты</span><input className="input" value={first} onChange={(e) => setFirst(e.target.value)} /></label>
          <label><span className="label">Тегі</span><input className="input" value={last} onChange={(e) => setLast(e.target.value)} /></label>
          {curator ? (
            <label><span className="label">Телефон нөмірі</span><input className="input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 701 234 56 78" /></label>
          ) : (
            <label><span className="label">Поток</span><input className="input" inputMode="numeric" value={stream} onChange={(e) => setStream(e.target.value.replace(/[^0-9A-Za-z-]/g, '').slice(0, 8))} placeholder="мысалы: 11" /></label>
          )}
        </div>
        <div>
          <span className="label">Аватар</span>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-soft btn-sm" disabled={photoBusy}>
              <ICamera className="h-4 w-4" /> {hasPhoto ? 'Фотоны ауыстыру' : 'Өз фотомды қою'}
            </button>
            {hasPhoto && (
              <button type="button" onClick={removePhoto} className="btn btn-ghost btn-sm text-rose-600" disabled={photoBusy}>
                <ITrash className="h-4 w-4" /> Фотоны алып тастау
              </button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2.5 sm:gap-3">
            {AVATARS.map((a) => (
              <button type="button" key={a.id} onClick={() => setAvatar(a.id)} className={`rounded-[20px] p-1 transition ${avatar === a.id ? 'scale-110 ring-4 ring-violet' : 'hover:scale-105'}`} aria-label={`Аватар ${a.emoji}`}>
                <Avatar id={a.id} size={48} />
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <button className="btn btn-primary w-full sm:w-auto" disabled={busy}>{busy && <Spinner className="h-4 w-4 border-white/40 border-t-white" />} Сақтау</button>
        </div>
      </form>

      <form onSubmit={changePw} className="card space-y-5 p-5 sm:p-8">
        <h2 className="text-lg font-extrabold">Құпиясөзді өзгерту</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="label">Жаңа құпиясөз</span><input type="password" className="input" value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} autoComplete="new-password" /></label>
          <label><span className="label">Қайталау</span><input type="password" className="input" value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} autoComplete="new-password" /></label>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button type="button" className="btn btn-ghost text-rose-600" onClick={async () => { await signOut(); navigate('/login'); }}>Аккаунттан шығу</button>
          <button className="btn btn-soft" disabled={pwBusy || !pw.a}>{pwBusy && <Spinner className="h-4 w-4" />} Құпиясөзді жаңарту</button>
        </div>
      </form>
    </div>
  );
}
