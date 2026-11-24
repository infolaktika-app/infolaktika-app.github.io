import { createContext, useContext, useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from 'react';

/** A tiny History-API router (keeps the bundle small; no extra dependency). */
type Loc = { path: string; search: URLSearchParams };
const RouterCtx = createContext<Loc>({ path: '/', search: new URLSearchParams() });

/** Set VITE_HASH_ROUTER=1 for static hosts without SPA rewrites (URLs become /#/app/...). */
const HASH = (import.meta.env.VITE_HASH_ROUTER as string | undefined) === '1';

const read = (): Loc => {
  const raw = HASH ? window.location.hash.replace(/^#/, '') || '/' : window.location.pathname + window.location.search;
  const [p, q = ''] = raw.split('?');
  return { path: p.replace(/\/+$/, '') || '/', search: new URLSearchParams(q) };
};

export const hrefFor = (to: string) => (HASH ? '#' + to : to);
/** Full URL of an in-app path, for sharing (e.g. https://site/#/t/abc). */
export const absoluteUrl = (to: string) => (HASH ? window.location.origin + window.location.pathname + '#' + to : window.location.origin + to);

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (opts.replace) window.history.replaceState(null, '', hrefFor(to));
  else window.history.pushState(null, '', hrefFor(to));
  window.dispatchEvent(new Event('app:navigate'));
  if (!opts.replace) window.scrollTo({ top: 0 });
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [loc, setLoc] = useState<Loc>(read);
  useEffect(() => {
    const on = () => setLoc(read());
    window.addEventListener('popstate', on);
    window.addEventListener('hashchange', on);
    window.addEventListener('app:navigate', on);
    return () => {
      window.removeEventListener('popstate', on);
      window.removeEventListener('hashchange', on);
      window.removeEventListener('app:navigate', on);
    };
  }, []);
  return <RouterCtx.Provider value={loc}>{children}</RouterCtx.Provider>;
}

export const useLocation = () => useContext(RouterCtx);

/** Match "/app/comics/:id" against a path. Returns params or null. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const s = path.split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

export function Link({ to, children, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  return (
    <a
      href={hrefFor(to)}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

export function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, { replace: true }), [to]);
  return null;
}
