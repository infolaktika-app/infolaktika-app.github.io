import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { MobileHeader } from '../components/MobileHeader';
import { ThemeToggle } from '../components/ThemeToggle';
import { Books, CodeBadge, Crystal, Laptop, Logo, Robot } from '../components/Art';
import { IShield } from '../components/Icons';
import { Spinner } from '../components/ui';
import { friendlyError, IS_DEMO } from '../lib/api';
import { useAuth } from '../lib/auth';
import { STREAM_RE, USERNAME_RE } from '../lib/constants';
import { Link, navigate, useLocation } from '../lib/router';
import { MadeBy } from '../components/MadeBy';

function Shell({ children, side, admin = false }: { children: ReactNode; side: ReactNode; admin?: boolean }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="-mx-5 -mt-6 sm:hidden">
          <MobileHeader
            className="!static !border-transparent !bg-transparent !backdrop-blur-none"
            home="/"
            left={<Link to="/" className="icon-btn" aria-label="Басты бетке"><svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg></Link>}
            right={<ThemeToggle />}
          />
        </div>
        <div className="hidden items-center justify-between sm:flex">
          <Link to="/"><Logo /></Link>
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10 fade-up">{children}</div>
        {IS_DEMO && (
          <p className="mx-auto max-w-md rounded-2xl bg-sun/25 px-4 py-2.5 text-center text-xs font-semibold text-ink/70">
            Демо режим: деректер тек осы браузерде сақталады. Supabase қосу үшін README-ні қараңыз.
          </p>
        )}
        <MadeBy className="mt-5" />
      </div>
      <div className={`relative hidden overflow-hidden lg:block ${admin ? 'bg-night' : 'bg-gradient-to-br from-[#2A6B7F] via-[#17404E] to-[#0B1D24]'}`}>
        <div className="dot-grid absolute inset-0 opacity-25" />
        {side}
      </div>
    </div>
  );
}

function Field({ label, children, hint, error }: { label: string; children: ReactNode; hint?: string; error?: string | null }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs font-semibold text-rose-600">{error}</span> : hint ? <span className="mt-1 block text-xs text-ink/45">{hint}</span> : null}
    </label>
  );
}

function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? 'text' : 'password'} className="input pr-20" />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-brand hover:bg-haze">
        {show ? 'Жасыру' : 'Көрсету'}
      </button>
    </div>
  );
}

const StudentSide = (
  <div className="relative flex h-full flex-col items-center justify-center p-12 text-white">
    <Crystal className="float absolute left-[14%] top-[14%] w-11 drop-shadow-[0_0_14px_rgba(95,208,224,.7)]" />
    <Crystal className="float-slow absolute bottom-[18%] right-[12%] w-8 drop-shadow-[0_0_14px_rgba(95,208,224,.7)]" style={{ animationDelay: '1s' }} />
    <Books className="float-r absolute right-[10%] top-[10%] w-40" />
    <CodeBadge className="float absolute bottom-[12%] left-[10%] w-28" />
    <div className="relative">
      <div className="absolute inset-0 rounded-full bg-white/20 blur-3xl" />
      <Robot className="float relative w-72" />
    </div>
    <h2 className="relative mt-8 max-w-md text-center text-3xl font-extrabold leading-tight">Білім — ең қызықты ойын!</h2>
    <p className="relative mt-3 max-w-sm text-center text-white/75">Комикс оқы, ойын ойна, кристалл жина және «Информатика аңызы» деңгейіне жет.</p>
  </div>
);

export function Login() {
  const { api } = useAuth();
  const { search } = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('infolaktika-blocked')) {
      sessionStorage.removeItem('infolaktika-blocked');
      setErr('Аккаунт бұғатталған. Мұғалімге хабарлас.');
    }
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!api) return;
    setErr(null);
    setBusy(true);
    try {
      await api.signIn(username, password);
      const p = await api.currentProfile();
      if (p?.role === 'admin') navigate('/admin', { replace: true });
      else navigate(search.get('next') || '/app', { replace: true });
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell side={StudentSide}>
      <h1 className="text-3xl font-extrabold tracking-tight">Қош келдің! 👋</h1>
      <p className="mt-2 text-ink/55">Оқуды жалғастыру үшін аккаунтыңа кір.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Логин">
          <input className="input" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="мысалы: aruzhan_7" required autoCapitalize="none" />
        </Field>
        <Field label="Құпиясөз">
          <PasswordInput autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
        </Field>
        {err && <p className="shake rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{err}</p>}
        <button className="btn btn-primary w-full py-3.5" disabled={busy || !api}>{busy && <Spinner className="h-4 w-4 border-white/40 border-t-white" />} Кіру</button>
      </form>
      <p className="mt-6 text-center text-sm text-ink/55">
        Аккаунтың жоқ па? <Link to="/register" className="font-bold text-brand hover:underline">Тіркел</Link>
      </p>
    </Shell>
  );
}

export function Register() {
  const { api } = useAuth();
  const [f, setF] = useState({ first_name: '', last_name: '', username: '', password: '', confirm: '', stream: '' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [taken, setTaken] = useState<boolean | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((x) => ({
      ...x,
      [k]: k === 'username' ? e.target.value.toLowerCase().replace(/\s/g, '')
        : k === 'stream' ? e.target.value.replace(/[^0-9A-Za-z-]/g, '').slice(0, 8)
        : e.target.value,
    }));


  const userOk = USERNAME_RE.test(f.username);
  useEffect(() => {
    setTaken(null);
    if (!api || !userOk) return;
    const t = setTimeout(() => api.usernameAvailable(f.username).then((ok) => setTaken(!ok)).catch(() => {}), 400);
    return () => clearTimeout(t);
  }, [f.username, api, userOk]);

  const pwShort = f.password.length > 0 && f.password.length < 6;
  const mismatch = f.confirm.length > 0 && f.confirm !== f.password;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!api) return;
    setErr(null);
    if (!f.first_name.trim() || !f.last_name.trim()) return setErr('Аты-жөніңді толық жаз.');
    if (!userOk) return setErr('Логин 3–24 таңба болуы керек: латын әріптері, сандар, "_" немесе ".".');
    if (f.password.length < 6) return setErr('Құпиясөз кемінде 6 таңба болуы керек.');
    if (f.password !== f.confirm) return setErr('Құпиясөздер сәйкес келмейді.');
    if (!STREAM_RE.test(f.stream)) return setErr('Поток нөмірін жаз (мысалы: 01, 11, 21).');
    setBusy(true);
    try {
      await api.signUp({ first_name: f.first_name, last_name: f.last_name, username: f.username, password: f.password, stream: f.stream });
      navigate('/app', { replace: true });
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell side={StudentSide}>
      <h1 className="text-3xl font-extrabold tracking-tight">Тіркелу ✨</h1>
      <p className="mt-2 text-ink/55">Бір минутта аккаунт аш та, саяхатты баста.</p>
      <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Аты"><input className="input" value={f.first_name} onChange={set('first_name')} placeholder="Аружан" autoComplete="given-name" required /></Field>
          <Field label="Тегі"><input className="input" value={f.last_name} onChange={set('last_name')} placeholder="Серікқызы" autoComplete="family-name" required /></Field>
        </div>
        <Field
          label="Логин"
          hint="Латын әріптері, сандар, «_» немесе «.» (3–24 таңба)"
          error={f.username && !userOk ? 'Логин форматы дұрыс емес' : taken ? 'Бұл логин бос емес' : null}
        >
          <div className="relative">
            <input className="input pr-10" value={f.username} onChange={set('username')} placeholder="aruzhan_7" autoComplete="username" autoCapitalize="none" required />
            {userOk && taken === false && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500">✓</span>}
          </div>
        </Field>
        <Field label="Поток" hint="Қай потокта оқисың? Мысалы: 01, 11, 21">
          <input className="input" value={f.stream} onChange={set('stream')} placeholder="мысалы: 11" inputMode="numeric" required />
        </Field>
        <Field label="Құпиясөз" error={pwShort ? 'Кемінде 6 таңба' : null}>
          <PasswordInput value={f.password} onChange={set('password')} autoComplete="new-password" placeholder="Кемінде 6 таңба" required />
        </Field>
        <Field label="Құпиясөзді растау" error={mismatch ? 'Құпиясөздер сәйкес емес' : null}>
          <PasswordInput value={f.confirm} onChange={set('confirm')} autoComplete="new-password" placeholder="Қайта жаз" required />
        </Field>
        {err && <p className="shake rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{err}</p>}
        <button className="btn btn-primary w-full py-3.5" disabled={busy || !api || taken === true}>{busy && <Spinner className="h-4 w-4 border-white/40 border-t-white" />} Аккаунт ашу</button>
      </form>
      <p className="mt-6 text-center text-sm text-ink/55">
        Аккаунтың бар ма? <Link to="/login" className="font-bold text-brand hover:underline">Кіру</Link>
      </p>
    </Shell>
  );
}

export function AdminLogin() {
  const { api, profile, signOut } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!api) return;
    setErr(null);
    setBusy(true);
    try {
      await api.signIn(username, password);
      const p = await api.currentProfile();
      if (p?.role !== 'admin') {
        await signOut();
        setErr('Бұл аккаунтта әкімші құқығы жоқ.');
        return;
      }
      navigate('/admin', { replace: true });
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const side = (
    <div className="relative flex h-full flex-col items-center justify-center p-12 text-white">
      <Laptop className="float w-80" />
      <h2 className="mt-8 text-3xl font-extrabold">Басқару панелі</h2>
      <p className="mt-2 max-w-sm text-center text-white/65">Комикстерді, кітаптарды, ойындарды және оқушылардың прогресін бір жерден басқарыңыз.</p>
    </div>
  );

  return (
    <Shell side={side} admin>
      <span className="chip mb-4 self-start bg-night text-white"><IShield className="h-3.5 w-3.5" /> Әкімші</span>
      <h1 className="text-3xl font-extrabold tracking-tight">Әкімші кіруі</h1>
      <p className="mt-2 text-ink/55">Бұл бет тек платформа әкімшісіне арналған.</p>
      {profile && profile.role !== 'admin' && (
        <p className="mt-4 rounded-2xl bg-haze px-4 py-3 text-sm font-semibold text-brand">
          Сіз оқушы ретінде кірдіңіз. Әкімші аккаунтымен кіру үшін алдымен шығыңыз.
          <button className="ml-2 underline" onClick={() => signOut()}>Шығу</button>
        </p>
      )}
      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Әкімші логині"><input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required /></Field>
        <Field label="Құпиясөз"><PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></Field>
        {err && <p className="shake rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{err}</p>}
        <button className="btn btn-primary w-full py-3.5" disabled={busy || !api}>{busy && <Spinner className="h-4 w-4 border-white/40 border-t-white" />} Панельге кіру</button>
      </form>
      {IS_DEMO && <p className="mt-4 rounded-2xl bg-haze px-4 py-3 text-sm text-ink/70">Демо әкімші: <b>admin</b> / <b>admin123</b> (тек демо режимде бар).</p>}
      <p className="mt-6 text-center text-sm text-ink/55"><Link to="/login" className="font-bold text-brand hover:underline">← Оқушы ретінде кіру</Link></p>
    </Shell>
  );
}

