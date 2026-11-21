import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { getApi, type Api } from './api';
import type { Profile } from './types';

interface AuthState {
  api: Api | null;
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState>({ api: null, profile: null, loading: true, refresh: async () => {}, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [api, setApi] = useState<Api | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const pinged = useRef<string | null>(null);

  const load = useCallback(async (a: Api) => {
    try {
      const p = await a.currentProfile();
      if (p?.is_blocked) {
        await a.signOut();
        setProfile(null);
        sessionStorage.setItem('infolaktika-blocked', '1');
      } else {
        setProfile(p);
        // Count today's visit once per session (streaks + achievements).
        if (p && p.role === 'student' && pinged.current !== p.id) {
          pinged.current = p.id;
          a.ping().then(() => a.currentProfile().then((x) => x && setProfile(x))).catch(() => {});
        }
      }
    } catch (e) {
      console.error(e);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let off = () => {};
    getApi().then((a) => {
      setApi(a);
      load(a);
      off = a.onAuthChange(() => load(a));
    });
    return () => off();
  }, [load]);

  const refresh = useCallback(async () => {
    if (api) await load(api);
  }, [api, load]);

  const signOut = useCallback(async () => {
    if (!api) return;
    await api.signOut();
    pinged.current = null;
    setProfile(null);
  }, [api]);

  return <Ctx.Provider value={{ api, profile, loading, refresh, signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

/** Non-null api + profile inside protected routes. */
export function useSession() {
  const { api, profile, refresh } = useAuth();
  if (!api || !profile) throw new Error('useSession outside a protected route');
  return { api, profile, refresh };
}
