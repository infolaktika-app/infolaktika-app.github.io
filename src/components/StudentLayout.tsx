import { useEffect, useState, type ReactNode } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { useAuth, useSession } from '../lib/auth';
import { levelFor, timeAgo } from '../lib/constants';
import { Link, navigate, useLocation } from '../lib/router';
import type { Notification } from '../lib/types';
import { Logo } from './Art';
import { IAward, IBell, IBook, IComic, IGame, IHome, ILogout, IMenu, ITrophy, IUser, IX } from './Icons';
import { Avatar } from './ui';
import { MadeBy } from './MadeBy';

const NAV = [
  { to: '/app', label: 'Басты бет', icon: IHome },
  { to: '/app/comics', label: 'Комикстер', icon: IComic },
  { to: '/app/games', label: 'Ойындар', icon: IGame },
  { to: '/app/books', label: 'Кітапхана', icon: IBook },
  { to: '/app/achievements', label: 'Менің жетістіктерім', icon: IAward },
  { to: '/app/leaderboard', label: 'Рейтинг', icon: ITrophy },
  { to: '/app/profile', label: 'Профиль', icon: IUser },
];

function useNotifications() {
  const { api } = useSession();
  const { path } = useLocation();
  const [items, setItems] = useState<Notification[]>([]);
  const load = () => api.notifications().then(setItems).catch(() => {});
  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [path]);
  const markRead = async () => {
    if (!items.some((n) => !n.read)) return;
    await api.markNotificationsRead();
    setItems((x) => x.map((n) => ({ ...n, read: true })));
  };
  return { items, unread: items.filter((n) => !n.read).length, markRead };
}

function NotificationsPanel({ items, onClose }: { items: Notification[]; onClose: () => void }) {
  return (
    <div className="pop absolute bottom-full left-0 z-50 mb-3 w-[min(22rem,calc(100vw-2rem))] origin-bottom-left rounded-3xl bg-card p-3 shadow-[0_24px_60px_-20px_rgba(var(--shade),.45)] lg:bottom-0 lg:left-full lg:mb-0 lg:ml-4">
      <div className="flex items-center justify-between px-2 py-1">
        <p className="font-extrabold">Хабарламалар</p>
        <button className="icon-btn !h-8 !w-8 !shadow-none" onClick={onClose} aria-label="Жабу"><IX className="h-4 w-4" /></button>
      </div>
      <div className="mt-1 max-h-80 space-y-1 overflow-y-auto">
        {items.length === 0 && <p className="px-3 py-8 text-center text-sm text-ink/45">Әзірге хабарлама жоқ 🌙</p>}
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => { if (n.link) navigate(n.link); onClose(); }}
            className={`flex w-full gap-3 rounded-2xl p-3 text-left transition hover:bg-mist ${n.read ? '' : 'bg-haze/60'}`}
          >
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-brand'}`} />
            <span className="min-w-0">
              <span className="block text-sm font-bold">{n.title}</span>
              {n.body && <span className="block truncate text-sm text-ink/55">{n.body}</span>}
              <span className="text-xs text-ink/35">{timeAgo(n.created_at)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { profile } = useSession();
  const { signOut } = useAuth();
  const { path } = useLocation();
  const notes = useNotifications();
  const [showNotes, setShowNotes] = useState(false);
  const lvl = levelFor(profile.xp);
  const active = (to: string) => (to === '/app' ? path === '/app' : path.startsWith(to));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 pl-3 pt-1">
        <Link to="/app" onClick={onNavigate}><Logo /></Link>
      </div>
      <nav className="mt-8 flex-1 space-y-1.5" aria-label="Негізгі мәзір">
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} onClick={onNavigate} className={`nav-item ${active(to) ? 'active' : ''}`} aria-current={active(to) ? 'page' : undefined}>
            <Icon className="h-[21px] w-[21px]" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="relative mt-6 rounded-3xl bg-card p-3.5 shadow-[0_4px_0_var(--edge),0_16px_30px_-18px_rgba(var(--shade),.4)]">
        <div className="flex items-center gap-3">
          <Link to="/app/profile" onClick={onNavigate}><Avatar id={profile.avatar} size={46} /></Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-extrabold leading-tight">{profile.first_name} {profile.last_name}</p>
            <p className="truncate text-xs font-semibold text-ink/50">{lvl.level}-деңгей · {lvl.name}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="chip min-w-0 flex-1 justify-center whitespace-nowrap bg-sun/30 !px-2 !py-2 text-[13px] text-ink">⭐ {profile.xp} XP</span>
          <div className="relative">
            <button className="icon-btn relative !h-9 !w-9" onClick={() => { setShowNotes((s) => !s); notes.markRead(); }} aria-label="Хабарламалар">
              <IBell className="h-[18px] w-[18px]" />
              {notes.unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{notes.unread}</span>}
            </button>
            {showNotes && <NotificationsPanel items={notes.items} onClose={() => setShowNotes(false)} />}
          </div>
          <button className="icon-btn !h-9 !w-9 hover:!text-rose-500" onClick={async () => { await signOut(); navigate('/login'); }} aria-label="Шығу" title="Шығу">
            <ILogout className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function StudentLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { path } = useLocation();
  useEffect(() => setOpen(false), [path]);

  return (
    <div className="min-h-screen">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] p-5 lg:block">
        <div className="h-full rounded-[32px] bg-gradient-to-b from-card/70 to-haze/70 p-4 ring-1 ring-inset ring-card/80 backdrop-blur">
          <SidebarContent />
        </div>
      </aside>

      {/* mobile header */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-mist/85 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/app"><Logo /></Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Мәзірді ашу"><IMenu /></button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-night/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="toast-in absolute inset-y-0 left-0 w-[290px] max-w-[85vw] bg-mist p-4">
            <button className="icon-btn absolute right-4 top-4 !h-9 !w-9" onClick={() => setOpen(false)} aria-label="Жабу"><IX /></button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="mx-auto hidden max-w-[1400px] justify-end px-8 pt-5 lg:ml-[272px] lg:flex"><ThemeToggle /></div>
      <main key={path} className="fade-up mx-auto max-w-[1400px] px-4 pb-16 pt-4 sm:px-6 lg:ml-[272px] lg:px-8 lg:pt-2">
        {children}
        <footer className="mt-16 border-t border-haze pt-8"><MadeBy /></footer>
      </main>
    </div>
  );
}
