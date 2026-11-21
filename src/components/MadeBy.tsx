import { staticUrl } from '../lib/api';

/** "made by" credit with the author's logo, shown at the bottom of every page. */
export function MadeBy({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-sm font-semibold text-ink/50 ${className}`}>
      <span>made by</span>
      <img src={staticUrl('brand/sagiqx-logo.png')} alt="sagiqx" className="h-10 w-auto select-none transition dark:brightness-0 dark:invert dark:opacity-85" draggable={false} />
    </div>
  );
}
