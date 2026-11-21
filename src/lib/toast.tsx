import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { RewardResult } from './types';

type Kind = 'success' | 'error' | 'info' | 'xp';
interface Toast { id: number; kind: Kind; title: string; body?: string }

const Ctx = createContext<{ push: (t: Omit<Toast, 'id'>) => void }>({ push: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { ...t, id }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), t.kind === 'error' ? 6000 : 4200);
  }, []);
  const icon: Record<Kind, string> = { success: '✅', error: '⚠️', info: '💡', xp: '⭐' };
  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:right-6 sm:left-auto">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-card/95 px-4 py-3 shadow-[0_18px_40px_-12px_rgba(var(--shade),.35)] backdrop-blur ${
              t.kind === 'error' ? 'border-rose-200' : t.kind === 'xp' ? 'border-lavender/50' : 'border-lavender/40'
            }`}
          >
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg ${t.kind === 'xp' ? 'bg-sun/30' : 'bg-lavender/20'}`}>{icon[t.kind]}</span>
            <div className="min-w-0">
              <p className="font-bold text-ink">{t.title}</p>
              {t.body && <p className="text-sm text-ink/60">{t.body}</p>}
            </div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const { push } = useContext(Ctx);
  return {
    push,
    success: (title: string, body?: string) => push({ kind: 'success', title, body }),
    error: (title: string, body?: string) => push({ kind: 'error', title, body }),
    info: (title: string, body?: string) => push({ kind: 'info', title, body }),
    /** Show XP / bonus / achievement toasts from a backend reward result. */
    reward: (r: RewardResult | null | undefined, title = 'Жарайсың!') => {
      if (!r) return;
      if (r.xp > 0) push({ kind: 'xp', title, body: `+${r.xp} XP` });
      if (r.bonus > 0) push({ kind: 'xp', title: 'Күнделікті миссиялар орындалды! 🎯', body: `Бонус +${r.bonus} XP` });
      for (const a of r.achievements ?? []) push({ kind: 'success', title: `Жаңа жетістік ${a.icon}`, body: a.title });
    },
  };
}
