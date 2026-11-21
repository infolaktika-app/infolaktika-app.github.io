import { lazy, Suspense, type ReactNode } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { match, Redirect, RouterProvider, useLocation } from './lib/router';
import { ToastProvider } from './lib/toast';
import { StudentLayout } from './components/StudentLayout';
import { PageLoader } from './components/ui';
import { CursorFX } from './components/CursorFX';
import Landing from './pages/Landing';
import { AdminLogin, Login, Register } from './pages/Auth';
import type { Profile } from './lib/types';
import NotFound from './pages/NotFound';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Library = lazy(() => import('./pages/Library'));
const Reader = lazy(() => import('./pages/Reader'));
const Games = lazy(() => import('./pages/Games'));
const GamePlay = lazy(() => import('./pages/GamePlay'));
const Achievements = lazy(() => import('./pages/Achievements'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const AdminApp = lazy(() => import('./admin/AdminApp'));
const TestsPage = lazy(() => import('./pages/Tests'));
const TestTake = lazy(() => import('./pages/Tests').then((m) => ({ default: m.TestTake })));
const Materials = lazy(() => import('./pages/Materials'));

type Route = { path: string; render: (p: Record<string, string>) => ReactNode };

const STUDENT: Route[] = [
  { path: '/app', render: () => <Dashboard /> },
  { path: '/app/comics', render: () => <Library kind="comic" /> },
  { path: '/app/comics/:id', render: (p) => <Reader kind="comic" id={p.id} /> },
  { path: '/app/books', render: () => <Library kind="book" /> },
  { path: '/app/books/:id', render: (p) => <Reader kind="book" id={p.id} /> },
  { path: '/app/games', render: () => <Games /> },
  { path: '/app/games/:id', render: (p) => <GamePlay id={p.id} /> },
  { path: '/app/achievements', render: () => <Achievements /> },
  { path: '/app/leaderboard', render: () => <Leaderboard /> },
  { path: '/app/profile', render: () => <ProfilePage /> },
  { path: '/app/tests', render: () => <TestsPage /> },
  { path: '/app/tests/:id', render: (p) => <TestTake id={p.id} /> },
  { path: '/app/materials', render: () => <Materials /> },
];

/** Where a signed-in user belongs. */
function homeFor(p: Profile) {
  return p.role === 'admin' ? '/admin' : '/app';
}

function renderIn(routes: Route[], path: string) {
  for (const r of routes) {
    const m = match(r.path, path);
    if (m) {
      return (
        <StudentLayout>
          <Suspense fallback={<PageLoader />}>{r.render(m)}</Suspense>
        </StudentLayout>
      );
    }
  }
  return <StudentLayout><NotFound inApp /></StudentLayout>;
}

function Routes() {
  const { path } = useLocation();
  const { profile, loading } = useAuth();

  if (loading) return <PageLoader />;

  // ---- public ----
  if (path === '/') return profile ? <Redirect to={homeFor(profile)} /> : <Landing />;
  if (path === '/login') return profile ? <Redirect to={homeFor(profile)} /> : <Login />;
  if (path === '/register') return profile ? <Redirect to={homeFor(profile)} /> : <Register />;
  if (path === '/admin/login') return profile?.role === 'admin' ? <Redirect to="/admin" /> : <AdminLogin />;

  // ---- admin (role checked here AND enforced by RLS on the server) ----
  if (path === '/admin' || path.startsWith('/admin/')) {
    if (!profile) return <Redirect to="/admin/login" />;
    if (profile.role !== 'admin') return <Redirect to={homeFor(profile)} />;
    return <Suspense fallback={<PageLoader />}><AdminApp /></Suspense>;
  }

  // ---- student ----
  if (path === '/app' || path.startsWith('/app/')) {
    if (!profile) return <Redirect to={`/login?next=${encodeURIComponent(path)}`} />;
    if (profile.role !== 'student') return <Redirect to={homeFor(profile)} />;
    return renderIn(STUDENT, path);
  }

  return <NotFound />;
}

export default function App() {
  return (
    <RouterProvider>
      <ToastProvider>
        <AuthProvider>
          <CursorFX />
          <Routes />
        </AuthProvider>
      </ToastProvider>
    </RouterProvider>
  );
}
