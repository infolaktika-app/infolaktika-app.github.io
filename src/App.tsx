import { lazy, Suspense, type ReactNode } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { match, Redirect, RouterProvider, useLocation } from './lib/router';
import { ToastProvider } from './lib/toast';
import { StudentLayout } from './components/StudentLayout';
import { PageLoader } from './components/ui';
import { CursorFX } from './components/CursorFX';
import Landing from './pages/Landing';
import { AdminLogin, Login, Register, Setup } from './pages/Auth';
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
const CuratorHome = lazy(() => import('./curator/CuratorHome'));
const CuratorPending = lazy(() => import('./curator/CuratorHome').then((m) => ({ default: m.CuratorPending })));
const CuratorStudents = lazy(() => import('./curator/CuratorStudents'));
const CuratorTests = lazy(() => import('./curator/CuratorTests'));
const TestEditor = lazy(() => import('./curator/CuratorTests').then((m) => ({ default: m.TestEditor })));
const TestResults = lazy(() => import('./curator/CuratorTests').then((m) => ({ default: m.TestResults })));
const CuratorRating = lazy(() => import('./curator/CuratorTests').then((m) => ({ default: m.CuratorRating })));

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

const CURATOR: Route[] = [
  { path: '/curator', render: () => <CuratorHome /> },
  { path: '/curator/students', render: () => <CuratorStudents /> },
  { path: '/curator/tests', render: () => <CuratorTests /> },
  { path: '/curator/tests/new', render: () => <TestEditor /> },
  { path: '/curator/tests/:id', render: (p) => <TestResults id={p.id} /> },
  { path: '/curator/tests/:id/edit', render: (p) => <TestEditor id={p.id} /> },
  { path: '/curator/materials', render: () => <Materials /> },
  { path: '/curator/rating', render: () => <CuratorRating /> },
  { path: '/curator/profile', render: () => <ProfilePage /> },
];

/** Where a signed-in user belongs. */
function homeFor(p: Profile) {
  if (p.role === 'admin') return '/admin';
  if (p.role === 'curator') return '/curator';
  if (p.must_change) return '/setup';
  return '/app';
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
  if (path === '/setup') {
    if (!profile) return <Redirect to="/login" />;
    if (profile.role !== 'student' || !profile.must_change) return <Redirect to={homeFor(profile)} />;
    return <Setup />;
  }
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
    if (profile.role !== 'student' || profile.must_change) return <Redirect to={homeFor(profile)} />;
    return renderIn(STUDENT, path);
  }

  // ---- curator (approved curators only; enforced again by RLS / RPC checks) ----
  if (path === '/curator' || path.startsWith('/curator/')) {
    if (!profile) return <Redirect to={`/login?next=${encodeURIComponent(path)}`} />;
    if (profile.role !== 'curator') return <Redirect to={homeFor(profile)} />;
    if (profile.curator_status !== 'approved') return <Suspense fallback={<PageLoader />}><CuratorPending /></Suspense>;
    return renderIn(CURATOR, path);
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
