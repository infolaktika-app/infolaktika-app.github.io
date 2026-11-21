import { useId } from 'react';
import { staticUrl } from '../lib/api';

/* Hand-built, gradient-shaded SVG "3D" illustrations used across INFOLAKTIKA. */

type P = { className?: string; style?: React.CSSProperties };
const uid = () => useId().replace(/:/g, '');

export function Robot({ className, style, wave = true }: P & { wave?: boolean }) {
  const id = uid();
  return (
    <svg viewBox="0 0 220 240" className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#D9ECF2" /></linearGradient>
        <linearGradient id={`${id}v`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2A667A" /><stop offset="1" stopColor="#132D36" /></linearGradient>
        <linearGradient id={`${id}p`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3D8699" /><stop offset="1" stopColor="#17404E" /></linearGradient>
        <radialGradient id={`${id}y`} cx=".35" cy=".35" r=".7"><stop offset="0" stopColor="#D3E9F0" /><stop offset="1" stopColor="#6DB5CE" /></radialGradient>
        <radialGradient id={`${id}e`} cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#E0F0F5" /><stop offset="1" stopColor="#86C2D7" /></radialGradient>
      </defs>
      <ellipse cx="110" cy="226" rx="62" ry="9" fill="#17404E" opacity=".14" />
      <line x1="110" y1="34" x2="110" y2="14" stroke="#7FB3C2" strokeWidth="6" strokeLinecap="round" />
      <circle cx="110" cy="12" r="10" fill={`url(#${id}y)`} />
      {/* head */}
      <rect x="44" y="32" width="132" height="100" rx="38" fill={`url(#${id}b)`} />
      <rect x="44" y="32" width="132" height="100" rx="38" fill="none" stroke="#fff" strokeWidth="2" opacity=".8" />
      <rect x="32" y="66" width="16" height="34" rx="8" fill={`url(#${id}p)`} />
      <rect x="172" y="66" width="16" height="34" rx="8" fill={`url(#${id}p)`} />
      <rect x="60" y="50" width="100" height="64" rx="26" fill={`url(#${id}v)`} />
      <ellipse cx="88" cy="80" rx="10" ry="12" fill={`url(#${id}e)`} />
      <ellipse cx="132" cy="80" rx="10" ry="12" fill={`url(#${id}e)`} />
      <path d="M96 98 q14 10 28 0" stroke="#86C2D7" strokeWidth="5" fill="none" strokeLinecap="round" />
      <ellipse cx="78" cy="58" rx="16" ry="5" fill="#fff" opacity=".18" />
      {/* body */}
      <rect x="66" y="138" width="88" height="70" rx="28" fill={`url(#${id}b)`} />
      <rect x="88" y="156" width="44" height="28" rx="10" fill={`url(#${id}p)`} />
      <circle cx="100" cy="170" r="4" fill="#8FCAD8" />
      <circle cx="120" cy="170" r="4" fill="#86C2D7" />
      {/* arms */}
      <rect x="40" y="146" width="24" height="46" rx="12" fill={`url(#${id}p)`} />
      <g className={wave ? 'origin-[168px_150px]' : ''} style={wave ? { animation: 'float-r 3.4s ease-in-out infinite', transformOrigin: '168px 150px' } : undefined}>
        <rect x="156" y="112" width="24" height="46" rx="12" fill={`url(#${id}p)`} transform="rotate(-24 168 150)" />
        <circle cx="182" cy="112" r="13" fill={`url(#${id}b)`} />
      </g>
    </svg>
  );
}

export function Laptop({ className, style }: P) {
  const id = uid();
  return (
    <svg viewBox="0 0 260 190" className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#214956" /><stop offset="1" stopColor="#0F262E" /></linearGradient>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#D6EAF1" /></linearGradient>
        <linearGradient id={`${id}k`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#EEF6F9" /><stop offset="1" stopColor="#BEDFEA" /></linearGradient>
      </defs>
      <ellipse cx="130" cy="178" rx="110" ry="9" fill="#17404E" opacity=".14" />
      <rect x="42" y="10" width="176" height="122" rx="16" fill={`url(#${id}f)`} />
      <rect x="52" y="20" width="156" height="102" rx="10" fill={`url(#${id}s)`} />
      <g strokeLinecap="round" strokeWidth="6">
        <line x1="66" y1="40" x2="104" y2="40" stroke="#9BCDDE" />
        <line x1="112" y1="40" x2="150" y2="40" stroke="#7FB3C2" />
        <line x1="78" y1="58" x2="140" y2="58" stroke="#86C2D7" />
        <line x1="78" y1="76" x2="118" y2="76" stroke="#8FCAD8" />
        <line x1="126" y1="76" x2="176" y2="76" stroke="#2A6B7F" />
        <line x1="66" y1="94" x2="98" y2="94" stroke="#7FB3C2" />
      </g>
      <rect x="182" y="88" width="16" height="22" rx="4" fill="#2A6B7F" opacity=".9" />
      <path d="M18 138 h224 l-14 26 a10 10 0 0 1 -9 6 H41 a10 10 0 0 1 -9 -6 z" fill={`url(#${id}k)`} />
      <rect x="18" y="132" width="224" height="10" rx="5" fill="#fff" />
      <rect x="106" y="146" width="48" height="8" rx="4" fill="#A8D3E2" opacity=".6" />
    </svg>
  );
}

export function Books({ className, style }: P) {
  const id = uid();
  return (
    <svg viewBox="0 0 220 200" className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#6CB5CE" /><stop offset="1" stopColor="#17404E" /></linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#B5DCE6" /><stop offset="1" stopColor="#6BB5CE" /></linearGradient>
        <linearGradient id={`${id}c`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#D1E8F0" /><stop offset="1" stopColor="#A5D2E1" /></linearGradient>
      </defs>
      <ellipse cx="110" cy="188" rx="86" ry="8" fill="#17404E" opacity=".14" />
      <rect x="30" y="140" width="160" height="40" rx="10" fill={`url(#${id}a)`} />
      <rect x="40" y="148" width="146" height="24" rx="5" fill="#fff" opacity=".95" />
      <rect x="40" y="152" width="146" height="3" fill="#E9F4F8" /><rect x="40" y="160" width="146" height="3" fill="#E9F4F8" />
      <rect x="44" y="102" width="140" height="38" rx="10" fill={`url(#${id}b)`} transform="rotate(-4 114 121)" />
      <rect x="54" y="110" width="126" height="22" rx="5" fill="#fff" transform="rotate(-4 114 121)" />
      <rect x="38" y="64" width="150" height="38" rx="10" fill={`url(#${id}c)`} transform="rotate(3 113 83)" />
      <rect x="48" y="72" width="134" height="22" rx="5" fill="#fff" transform="rotate(3 113 83)" />
      <rect x="60" y="68" width="10" height="30" rx="3" fill="#17404E" transform="rotate(3 113 83)" />
      <path d="M112 14 l9 18 20 3 -14 14 3 20 -18 -9 -18 9 3 -20 -14 -14 20 -3z" fill={`url(#${id}b)`} stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

export function Gamepad({ className, style }: P) {
  const id = uid();
  return (
    <svg viewBox="0 0 240 160" className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9CCDDE" /><stop offset="1" stopColor="#17404E" /></linearGradient>
        <linearGradient id={`${id}h`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".5" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
      </defs>
      <ellipse cx="120" cy="150" rx="88" ry="8" fill="#17404E" opacity=".15" />
      <path d="M62 26 h116 c30 0 46 24 52 60 c6 36 -6 56 -26 56 c-16 0 -24 -14 -36 -28 h-60 c-12 14 -20 28 -36 28 c-20 0 -32 -20 -26 -56 c6 -36 22 -60 52 -60z" fill={`url(#${id}g)`} />
      <path d="M62 30 h116 c20 0 34 10 42 28 h-200 c8 -18 22 -28 42 -28z" fill={`url(#${id}h)`} />
      <rect x="54" y="66" width="44" height="14" rx="5" fill="#fff" />
      <rect x="69" y="51" width="14" height="44" rx="5" fill="#fff" />
      <circle cx="170" cy="58" r="9" fill="#8FCAD8" /><circle cx="190" cy="76" r="9" fill="#86C2D7" />
      <circle cx="150" cy="76" r="9" fill="#9BCDDE" /><circle cx="170" cy="94" r="9" fill="#fff" />
      <rect x="108" y="60" width="24" height="8" rx="4" fill="#fff" opacity=".55" />
    </svg>
  );
}

export function Star3D({ className, style, color = '#8CC071' }: P & { color?: string }) {
  const id = uid();
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} aria-hidden>
      <defs>
        <radialGradient id={`${id}s`} cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#E0F0F5" /><stop offset=".5" stopColor={color} /><stop offset="1" stopColor="#44A1C1" /></radialGradient>
      </defs>
      <path d="M50 6 l12 26 28 4 -20 20 5 28 -25 -13 -25 13 5 -28 -20 -20 28 -4z" fill={`url(#${id}s)`} stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

export function Planet({ className, style }: P) {
  const id = uid();
  return (
    <svg viewBox="0 0 160 120" className={className} style={style} aria-hidden>
      <defs>
        <radialGradient id={`${id}p`} cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#E5F2F6" /><stop offset=".55" stopColor="#3D8699" /><stop offset="1" stopColor="#2B94B8" /></radialGradient>
      </defs>
      <ellipse cx="80" cy="62" rx="72" ry="17" fill="none" stroke="#4E97A9" strokeWidth="7" transform="rotate(-14 80 62)" />
      <circle cx="80" cy="60" r="40" fill={`url(#${id}p)`} />
      <path d="M8 62 a72 17 0 0 0 144 0" fill="none" stroke="#8FCAD8" strokeWidth="7" strokeLinecap="round" transform="rotate(-14 80 62)" />
      <circle cx="66" cy="44" r="7" fill="#fff" opacity=".35" />
    </svg>
  );
}

export function CodeBadge({ className, style }: P) {
  const id = uid();
  return (
    <svg viewBox="0 0 120 100" className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id={`${id}c`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#E1F0F5" /></linearGradient>
      </defs>
      <rect x="8" y="10" width="104" height="72" rx="22" fill={`url(#${id}c)`} />
      <path d="M40 66 l-8 12 18 -10z" fill="#E1F0F5" />
      <path d="M44 32 l-14 14 14 14 M76 32 l14 14 -14 14 M66 26 l-12 40" stroke="#17404E" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Rocket({ className, style }: P) {
  const id = uid();
  return (
    <svg viewBox="0 0 120 160" className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#D6EAF1" /></linearGradient>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8FCAD8" /><stop offset="1" stopColor="#73B9D0" /></linearGradient>
      </defs>
      <path d="M48 120 q12 34 12 34 q0 0 12 -34z" fill={`url(#${id}f)`} />
      <path d="M60 6 c26 20 34 56 26 104 h-52 c-8 -48 0 -84 26 -104z" fill={`url(#${id}r)`} />
      <path d="M34 80 l-18 30 h20z M86 80 l18 30 h-20z" fill="#2A6B7F" />
      <circle cx="60" cy="58" r="14" fill="#17404E" /><circle cx="60" cy="58" r="8" fill="#86C2D7" />
      <path d="M60 6 c10 8 17 18 22 30 h-44 c5 -12 12 -22 22 -30z" fill="#2A6B7F" />
    </svg>
  );
}

export function Trophy({ className, style }: P) {
  const id = uid();
  return (
    <svg viewBox="0 0 140 150" className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id={`${id}t`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#C6E2EC" /><stop offset=".5" stopColor="#8FCAD8" /><stop offset="1" stopColor="#4E97A9" /></linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2A6B7F" /><stop offset="1" stopColor="#17404E" /></linearGradient>
      </defs>
      <ellipse cx="70" cy="142" rx="44" ry="6" fill="#17404E" opacity=".15" />
      <path d="M30 22 h-18 c0 26 10 38 26 40 M110 22 h18 c0 26 -10 38 -26 40" stroke="#4E97A9" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M30 12 h80 v28 c0 26 -18 44 -40 44 s-40 -18 -40 -44z" fill={`url(#${id}t)`} />
      <rect x="62" y="82" width="16" height="22" fill="#4E97A9" />
      <rect x="38" y="104" width="64" height="30" rx="8" fill={`url(#${id}b)`} />
      <path d="M70 26 l5 10 11 2 -8 8 2 11 -10 -5 -10 5 2 -11 -8 -8 11 -2z" fill="#fff" opacity=".85" />
    </svg>
  );
}

export function Cube({ className, style, hue = 'violet' }: P & { hue?: 'violet' | 'sun' | 'mint' }) {
  const c = hue === 'sun' ? ['#DDF0D2', '#8CC071', '#5E9A45'] : hue === 'mint' ? ['#D9ECF2', '#80BFD5', '#2683A3'] : ['#E5F2F6', '#9CCDDE', '#17404E'];
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} aria-hidden>
      <path d="M50 8 l38 20 -38 20 -38 -20z" fill={c[0]} />
      <path d="M12 28 l38 20 v44 l-38 -20z" fill={c[1]} />
      <path d="M88 28 l-38 20 v44 l38 -20z" fill={c[2]} />
    </svg>
  );
}

export function Sphere({ className, style, color = '#2A6B7F' }: P & { color?: string }) {
  const id = uid();
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} aria-hidden>
      <defs><radialGradient id={`${id}s`} cx=".32" cy=".3" r=".75"><stop offset="0" stopColor="#fff" /><stop offset=".35" stopColor={color} stopOpacity=".85" /><stop offset="1" stopColor={color} /></radialGradient></defs>
      <circle cx="50" cy="50" r="44" fill={`url(#${id}s)`} />
    </svg>
  );
}

/** Glowing data crystal — decorative motif. tone="green" uses the #8CC071 accent. */
export function Crystal({ className, style, tone = 'cyan' }: P & { tone?: 'cyan' | 'green' }) {
  const id = uid();
  const c = tone === 'green' ? ['#EFFBE6', '#B5E09B', '#8CC071', '#4F7F3A', '#A9DE8B'] : ['#E2F7FB', '#7FD8E6', '#5FD0E0', '#2A6B7F', '#5FD0E0'];
  return (
    <svg viewBox="0 0 60 100" className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c[0]} /><stop offset=".5" stopColor={c[1]} /><stop offset="1" stopColor={c[3]} /></linearGradient>
        <filter id={`${id}g`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>
      <path d="M30 4 L56 50 L30 96 L4 50 Z" fill={c[4]} opacity=".55" filter={`url(#${id}g)`} />
      <path d="M30 4 L56 50 L30 96 L4 50 Z" fill={`url(#${id}a)`} stroke={c[0]} strokeWidth="2" strokeLinejoin="round" />
      <path d="M30 4 L30 96 M4 50 L56 50 M30 4 L18 50 L30 96 M30 4 L42 50 L30 96" stroke="#fff" strokeWidth="1.2" opacity=".55" fill="none" />
    </svg>
  );
}

/** INFOLAKTIKA wordmark. The logo file is white-on-transparent and is used as a mask, so it takes the text colour. */
export function Logo({ light = false, className = '' }: { compact?: boolean; light?: boolean; className?: string }) {
  const url = `url("${staticUrl('brand/infolaktika-logo.png')}")`;
  return (
    <span
      role="img"
      aria-label="INFOLAKTIKA"
      className={`inline-block h-9 shrink-0 align-middle ${light ? 'text-white' : 'text-brand dark:text-ink'} ${className}`}
      style={{ aspectRatio: '2205 / 583', backgroundColor: 'currentColor', WebkitMask: `${url} center / contain no-repeat`, mask: `${url} center / contain no-repeat` }}
    />
  );
}
