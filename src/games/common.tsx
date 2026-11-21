import type { ReactNode } from 'react';
import { ProgressBar } from '../components/ui';

export interface GameProps<T = any> {
  data: T;
  onFinish: (score: number, max: number) => void;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function GameBar({ step, total, score, extra }: { step: number; total: number; score: ReactNode; extra?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <span className="chip bg-haze text-brand">{step} / {total}</span>
      <div className="min-w-[120px] flex-1"><ProgressBar value={(step / total) * 100} className="!h-2" /></div>
      {extra}
      <span className="chip bg-sun/35 text-ink">⭐ {score}</span>
    </div>
  );
}

export function Feedback({ ok, title, text }: { ok: boolean; title?: string; text?: ReactNode }) {
  return (
    <div className={`pop mt-4 flex gap-3 rounded-2xl px-4 py-3 ${ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
      <span className="text-xl">{ok ? '🎉' : '💡'}</span>
      <div className="text-sm">
        <p className="font-extrabold">{title ?? (ok ? 'Дұрыс!' : 'Қате')}</p>
        {text && <p className="mt-0.5 opacity-90">{text}</p>}
      </div>
    </div>
  );
}

export const LANG_LABEL: Record<string, string> = { python: 'Python', html: 'HTML', css: 'CSS', text: 'Алгоритм', js: 'JavaScript' };
