import { useEffect, useState, type ReactNode } from 'react';
import { avatarOf, categoryOf, levelProgress } from '../lib/constants';
import { IX } from './Icons';
import { Crystal, Robot } from './Art';

export function Avatar({ id, size = 44, ring = false }: { id: string; size?: number; ring?: boolean }) {
  const a = avatarOf(id);
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-2xl ${ring ? 'ring-4 ring-white' : ''}`}
      style={{ width: size, height: size, background: a.bg, fontSize: size * 0.5, boxShadow: 'inset 0 -4px 0 rgba(0,0,0,.12)' }}
      aria-hidden
    >
      {a.emoji}
    </span>
  );
}

export function ProgressBar({ value, className = '', tone = 'brand' }: { value: number; className?: string; tone?: 'brand' | 'sun' | 'mint' }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setW(Math.max(0, Math.min(100, value))));
    return () => cancelAnimationFrame(t);
  }, [value]);
  const bg = tone === 'sun' ? 'linear-gradient(90deg,#B4DCA0,#8CC071)' : tone === 'mint' ? 'linear-gradient(90deg,#80BFD5,#2683A3)' : undefined;
  return (
    <div className={`progress-track ${className}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-fill" style={{ width: `${w}%`, background: bg }} />
    </div>
  );
}

export function LevelBar({ xp, compact = false }: { xp: number; compact?: boolean }) {
  const p = levelProgress(xp);
  return (
    <div>
      <div className={`flex items-center justify-between ${compact ? 'text-xs' : 'text-sm'} font-semibold`}>
        <span className="text-brand">{p.cur.level}-деңгей · {p.cur.name}</span>
        <span className="text-ink/45">{p.next ? `${p.toNext} XP қалды` : 'Максимум!'}</span>
      </div>
      <ProgressBar value={p.pct} className={compact ? 'mt-1.5 h-2' : 'mt-2'} />
    </div>
  );
}

export function CategoryChip({ slug, small = false }: { slug: string; small?: boolean }) {
  const c = categoryOf(slug);
  return (
    <span className={`chip tone-text ${small ? '!px-2 !py-0.5 !text-[11px]' : ''}`} style={{ background: c.color + '14', color: c.color }}>
      <span>{c.icon}</span>
      <span className="truncate">{c.label}</span>
    </span>
  );
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center fade-up">
      <div className="relative mb-4">
        <div className="absolute inset-0 -z-0 rounded-full bg-lavender/25 blur-2xl" />
        <Robot className="relative h-36 w-36 float" />
        <Crystal className="float-slow absolute -right-3 top-2 w-7 drop-shadow-[0_0_14px_rgba(95,208,224,.7)]" />
      </div>
      <h3 className="text-xl font-extrabold">{title}</h3>
      {text && <p className="mt-1.5 max-w-sm text-ink/55">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ className = 'h-6 w-6' }: { className?: string }) {
  return <span className={`inline-block animate-spin rounded-full border-[3px] border-lavender/40 border-t-brand ${className}`} aria-label="Жүктелуде" />;
}

export function PageLoader() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <div className="flex flex-col items-center gap-3 text-ink/50">
        <Robot className="h-24 w-24 float" wave={false} />
        <Spinner />
      </div>
    </div>
  );
}

export function SkeletonGrid({ n = 6, h = 'h-72' }: { n?: number; h?: string }) {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: n }).map((_, i) => <div key={i} className={`skeleton ${h} rounded-[26px]`} />)}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', k);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-night/40 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`pop max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-card p-6 shadow-2xl sm:rounded-[28px] ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xl font-extrabold">{title}</h2>
          <button className="icon-btn !h-9 !w-9" onClick={onClose} aria-label="Жабу"><IX /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Confirm({ open, title, text, confirmLabel = 'Жою', onConfirm, onClose, busy }: {
  open: boolean; title: string; text: string; confirmLabel?: string; onConfirm: () => void; onClose: () => void; busy?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-ink/65">{text}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button className="btn btn-ghost" onClick={onClose}>Бас тарту</button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : null}{confirmLabel}</button>
      </div>
    </Modal>
  );
}

export function StatCard({ icon, label, value, sub, tone = '#17404E' }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode; tone?: string }) {
  return (
    <div className="card card-hover flex items-center gap-4 p-5">
      <span className="tone-text grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl" style={{ background: tone + '18', color: tone }}>{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink/50">{label}</p>
        <p className="text-2xl font-extrabold leading-tight">{value}</p>
        {sub && <p className="text-xs text-ink/45">{sub}</p>}
      </div>
    </div>
  );
}

export function SectionHead({ title, action, sub }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h2>
        {sub && <p className="text-sm text-ink/50">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/** Cover image with a branded gradient fallback. */
export function Cover({ src, title, category, className = '' }: { src: string | null; title: string; category: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const c = categoryOf(category);
  if (!src || failed) {
    return (
      <div className={`relative grid place-items-center overflow-hidden ${className}`} style={{ background: `linear-gradient(145deg, ${c.color}, #0F2A33)` }}>
        <div className="dot-grid absolute inset-0 opacity-30" />
        <div className="relative px-4 text-center">
          <div className="text-5xl drop-shadow">{c.icon}</div>
          <p className="mt-3 line-clamp-3 text-sm font-extrabold text-white">{title}</p>
        </div>
      </div>
    );
  }
  return <img src={src} alt={title} loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}

/** Wraps children in the tilt-and-press 3D card used for comics & books. */
export function PressCard({ children, onClick, label }: { children: ReactNode; onClick: () => void; label: string }) {
  const move = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--ry', `${(x - 0.5) * 7}deg`);
    el.style.setProperty('--rx', `${(0.5 - y) * 6}deg`);
    el.style.setProperty('--gx', `${x * 100}%`);
    el.style.setProperty('--gy', `${y * 100}%`);
  };
  const leave = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.style.setProperty('--rx', '0deg');
    e.currentTarget.style.setProperty('--ry', '0deg');
  };
  return (
    <div className="press-wrap h-full">
      <button type="button" aria-label={label} className="press-card h-full w-full text-left" onPointerMove={move} onPointerLeave={leave} onClick={onClick}>
        {children}
        <span className="glare" />
      </button>
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string }[] }) {
  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
      {items.map((i) => (
        <button
          key={i.value}
          onClick={() => onChange(i.value)}
          className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-bold transition ${
            value === i.value ? 'bg-brand text-white shadow-[0_4px_0_#0E2B35]' : 'bg-card text-ink/60 shadow-[0_3px_0_var(--edge)] hover:text-brand'
          }`}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}
