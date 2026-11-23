import type { ReactNode } from 'react';
import { Logo } from './Art';
import { Link } from '../lib/router';

/** Phone header: the logo sits in the middle, actions balance it on both sides. */
export function MobileHeader({ home, left, right, className = '' }: { home: string; left?: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <header
      className={`sticky top-0 z-30 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-haze/70 bg-mist/85 px-4 pb-2.5 backdrop-blur-md ${className}`}
      style={{ paddingTop: 'max(10px, env(safe-area-inset-top))' }}
    >
      <div className="flex min-w-0 items-center gap-2 justify-self-start">{left}</div>
      <Link to={home} aria-label="ИНФОЛАКТИКА — басты бет" className="justify-self-center rounded-xl px-1 py-1 transition active:scale-95">
        <Logo className="!h-[30px]" />
      </Link>
      <div className="flex min-w-0 items-center gap-2 justify-self-end">{right}</div>
    </header>
  );
}
