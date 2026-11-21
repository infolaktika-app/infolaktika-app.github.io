import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
const KEY = 'infolaktika-theme';

function current(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function applyTheme(t: Theme) {
  const root = document.documentElement;
  root.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#07171C' : '#17404E');
  try { localStorage.setItem(KEY, t); } catch { /* storage may be unavailable */ }
  window.dispatchEvent(new CustomEvent('app:theme', { detail: t }));
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(current);
  useEffect(() => {
    const on = () => setTheme(current());
    window.addEventListener('app:theme', on);
    return () => window.removeEventListener('app:theme', on);
  }, []);
  return { theme, toggle: () => applyTheme(theme === 'dark' ? 'light' : 'dark') };
}

/** Sun / moon switch shown at the top of every layout. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      className={`icon-btn relative overflow-hidden ${className}`}
      aria-label={dark ? 'Жарық тақырыпқа ауысу' : 'Қараңғы тақырыпқа ауысу'}
      title={dark ? 'Жарық тақырып' : 'Қараңғы тақырып'}
    >
      {/* sun */}
      <svg viewBox="0 0 24 24" className={`absolute h-5 w-5 transition-all duration-500 ${dark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      {/* moon */}
      <svg viewBox="0 0 24 24" className={`absolute h-5 w-5 transition-all duration-500 ${dark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    </button>
  );
}
