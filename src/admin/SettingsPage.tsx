import { useEffect, useState, type FormEvent } from 'react';
import { PageLoader, Spinner } from '../components/ui';
import { friendlyError, IS_DEMO } from '../lib/api';
import { useSession } from '../lib/auth';
import { useToast } from '../lib/toast';
import { navigate } from '../lib/router';
import type { Settings } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { AdminHeader } from './AdminHeader';

export default function SettingsPage() {
  const { api } = useSession();
  const toast = useToast();
  const { data, loading } = useAsync(() => api.settings(), []);
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState({ a: '', b: '' });
  useEffect(() => { if (data) setS(data); }, [data]);

  if (loading || !s) return <PageLoader />;
  const num = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Math.max(0, Math.min(1000, Number(e.target.value) || 0)) });

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try { await api.saveSettings(s); toast.success('Баптаулар сақталды'); } catch (x) { toast.error(friendlyError(x)); } finally { setBusy(false); }
  };
  const changePw = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.a.length < 8) return toast.error('Әкімші құпиясөзі кемінде 8 таңба болуы керек');
    if (pw.a !== pw.b) return toast.error('Құпиясөздер сәйкес емес');
    try { await api.changePassword(pw.a); setPw({ a: '', b: '' }); toast.success('Құпиясөз өзгертілді'); } catch (x) { toast.error(friendlyError(x)); }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <AdminHeader title="Settings" sub="Платформа баптаулары және кристалл жүйесі" />
      <form onSubmit={save} className="card space-y-5 p-6">
        <h2 className="font-extrabold">Оқушыларға арналған хабар</h2>
        <label className="block"><span className="label">Басты беттегі мотивациялық сөз</span>
          <textarea className="input min-h-20" value={s.motivational_message} onChange={(e) => setS({ ...s, motivational_message: e.target.value })} maxLength={200} />
        </label>
        <h2 className="pt-2 font-extrabold">Кристалл марапаттары</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="label">Комиксті оқып бітіргені үшін</span><input type="number" className="input" value={s.xp_comic} onChange={num('xp_comic')} /></label>
          <label><span className="label">Кітапты оқып бітіргені үшін</span><input type="number" className="input" value={s.xp_book} onChange={num('xp_book')} /></label>
          <label><span className="label">Күнделікті тапсырма</span><input type="number" className="input" value={s.xp_daily} onChange={num('xp_daily')} /></label>
          <label><span className="label">Барлық күнделікті миссия бонусы</span><input type="number" className="input" value={s.xp_missions} onChange={num('xp_missions')} /></label>
        </div>
        <p className="text-sm text-ink/50">Ойындар үшін кристалл әр ойынның өз баптауында беріледі («Ойындарды басқару»). Деңгейлер: 0 · 200 · 600 · 1200 · 2200 кристалл.</p>
        <div className="flex justify-end"><button className="btn btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4 border-white/40 border-t-white" />} Сақтау</button></div>
      </form>

      <form onSubmit={changePw} className="card space-y-4 p-6">
        <h2 className="font-extrabold">Әкімші құпиясөзі</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <input type="password" className="input" placeholder="Жаңа құпиясөз" value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} autoComplete="new-password" />
          <input type="password" className="input" placeholder="Қайталау" value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} autoComplete="new-password" />
        </div>
        <div className="flex justify-end"><button className="btn btn-soft" disabled={!pw.a}>Өзгерту</button></div>
      </form>

      {IS_DEMO && (
        <div className="card space-y-3 border-2 border-dashed border-lavender/50 p-6">
          <h2 className="font-extrabold">Демо режим</h2>
          <p className="text-sm text-ink/60">Қазір платформа Supabase-сіз, тек осы браузерде жұмыс істеп тұр. Нақты серверге қосу үшін <code>.env</code> файлына <code>VITE_SUPABASE_URL</code> және <code>VITE_SUPABASE_ANON_KEY</code> жазыңыз (README).</p>
          <button className="btn btn-danger btn-sm" onClick={async () => { const m = await import('../lib/demoApi'); m.resetDemo(); navigate('/', { replace: true }); location.reload(); }}>Демо деректерді тазалау</button>
        </div>
      )}
    </div>
  );
}
