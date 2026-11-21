import { useEffect, useState } from 'react';
import { ThemeToggle } from '../components/ThemeToggle';
import { Logo } from '../components/Art';
import { IBook, IChart, IClipboard, IComic, IFile, IGame, IGrid, ILogout, IMenu, ISettings, IUsers, IX } from '../components/Icons';
import { Avatar } from '../components/ui';
import { IS_DEMO } from '../lib/api';
import { useAuth, useSession } from '../lib/auth';
import { Link, match, navigate, useLocation } from '../lib/router';
import NotFound from '../pages/NotFound';
import AdminDashboard from './AdminDashboard';
import ContentManager from './ContentManager';
import GamesManager from './GamesManager';
import SettingsPage from './SettingsPage';
import StatsPage from './StatsPage';
import { StudentDetailPage } from './Students';
import UsersPage from './Users';
import MaterialsPage from '../pages/Materials';
import TestsManager, { TestEditor, TestResults } from './TestsManager';
import { MadeBy } from '../components/MadeBy';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: IGrid },
  { to: '/admin/comics', label: 'Комикстерді басқару', icon: IComic },
  { to: '/admin/books', label: 'Кітаптарды басқару', icon: IBook },
  { to: '/admin/games', label: 'Ойындарды басқару', icon: IGame },
  { to: '/admin/users', label: 'Оқушылар', icon: IUsers },
  { to: '/admin/tests', label: 'Сауалнамалар', icon: IClipboard },
  { to: '/admin/materials', label: 'Материалдар', icon: IFile },
  { to: '/admin/stats', label: 'Статистика', icon: IChart },
  { to: '/admin/settings', label: 'Settings', icon: ISettings },
];

function Side({ onNav }: { onNav?: () => void }) {
  const { profile } = useSession();
  const { signOut } = useAuth();
  const { path } = useLocation();
  const active = (to: string) => (to === '/admin' ? path === '/admin' : path.startsWith(to) || (to === '/admin/users' && path.startsWith('/admin/students')));
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 pl-3">
        <Link to="/admin" onClick={onNav}><Logo /></Link>
      </div>
      <span className="chip mx-3 mt-3 self-start bg-night text-white">🛡️ Әкімші панелі</span>
      <nav className="scrollbar-none mt-6 flex-1 space-y-1 overflow-y-auto">
        {NAV.map(({ to, label, icon: I }) => (
          <Link key={to} to={to} onClick={onNav} className={`nav-item ${active(to) ? 'active' : ''}`}><I className="h-[21px] w-[21px]" />{label}</Link>
        ))}
      </nav>
      <div className="mt-6 flex items-center gap-3 rounded-3xl bg-card p-3.5 shadow-[0_4px_0_var(--edge)]">
        <Avatar id={profile.avatar} size={42} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold">{profile.first_name || 'Әкімші'}</p>
          <p className="truncate text-xs text-ink/45">@{profile.username}{IS_DEMO ? ' · демо' : ''}</p>
        </div>
        <button className="icon-btn !h-9 !w-9 hover:!text-rose-500" title="Шығу" aria-label="Шығу" onClick={async () => { await signOut(); navigate('/admin/login'); }}><ILogout className="h-[18px] w-[18px]" /></button>
      </div>
    </div>
  );
}

export default function AdminApp() {
  const { path } = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  let page: React.ReactNode = <NotFound inApp />;
  let m: Record<string, string> | null;
  if (path === '/admin') page = <AdminDashboard />;
  else if (path === '/admin/comics') page = <ContentManager kind="comic" />;
  else if (path === '/admin/books') page = <ContentManager kind="book" />;
  else if (path === '/admin/games') page = <GamesManager />;
  else if (path === '/admin/users' || path === '/admin/students') page = <UsersPage />;
  else if (path === '/admin/materials') page = <MaterialsPage />;
  else if (path === '/admin/tests') page = <TestsManager />;
  else if (path === '/admin/tests/new') page = <TestEditor />;
  else if ((m = match('/admin/tests/:id/edit', path))) page = <TestEditor id={m.id} />;
  else if ((m = match('/admin/tests/:id', path))) page = <TestResults id={m.id} />;
  else if ((m = match('/admin/students/:id', path))) page = <StudentDetailPage id={m.id} />;
  else if (path === '/admin/stats') page = <StatsPage />;
  else if (path === '/admin/settings') page = <SettingsPage />;

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[284px] p-5 lg:block">
        <div className="h-full rounded-[32px] bg-gradient-to-b from-card/70 to-haze/70 p-4 ring-1 ring-inset ring-card/80"><Side /></div>
      </aside>
      <header className="sticky top-0 z-30 flex items-center justify-between bg-mist/85 px-4 py-2.5 backdrop-blur lg:hidden">
        <Link to="/admin"><Logo /></Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Мәзір"><IMenu /></button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-night/40" onClick={() => setOpen(false)} />
          <aside className="toast-in absolute inset-y-0 left-0 w-[290px] max-w-[85vw] bg-mist p-4">
            <button className="icon-btn absolute right-4 top-4 !h-9 !w-9" onClick={() => setOpen(false)} aria-label="Жабу"><IX /></button>
            <Side onNav={() => setOpen(false)} />
          </aside>
        </div>
      )}
      <div className="mx-auto hidden max-w-[1400px] justify-end px-8 pt-5 lg:ml-[284px] lg:flex"><ThemeToggle /></div>
      <main key={path} className="fade-up mx-auto max-w-[1400px] px-4 pb-16 pt-4 sm:px-6 lg:ml-[284px] lg:px-8 lg:pt-2">{page}<footer className="mt-16 border-t border-haze pt-8"><MadeBy /></footer></main>
    </div>
  );
}
