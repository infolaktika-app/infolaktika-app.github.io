import { useId, useRef, useState } from 'react';

/**
 * The home-page robot:
 *  - idle: it gently floats, blinks and its chest light pulses;
 *  - when the cursor touches it (or it is tapped on a phone) it raises its arm and waves,
 *    smiles with "^ ^" eyes and its antenna lights up green.
 */
export function RobotBuddy({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  const id = useId().replace(/:/g, '');
  const [hover, setHover] = useState(false);
  const tapTimer = useRef<number | undefined>(undefined);

  return (
    <div
      className={`robot-buddy ${/\b(absolute|fixed)\b/.test(className) ? '' : 'relative'} ${hover ? 'is-waving' : ''} ${className}`}
      style={style}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(false)}
      onClick={() => { setHover(true); clearTimeout(tapTimer.current); tapTimer.current = window.setTimeout(() => setHover(false), 2200); }}
      role="img"
      aria-label="Робот: курсорды апарсаң, қол бұлғайды"
    >
      <svg viewBox="0 0 220 240" className="block h-full w-full overflow-visible" aria-hidden>
        <defs>
          <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#D9ECF2" /></linearGradient>
          <linearGradient id={`${id}v`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2A667A" /><stop offset="1" stopColor="#132D36" /></linearGradient>
          <linearGradient id={`${id}p`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3D8699" /><stop offset="1" stopColor="#17404E" /></linearGradient>
          <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#B4DCA0" /><stop offset="1" stopColor="#5E9A45" /></linearGradient>
          <radialGradient id={`${id}e`} cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#F1FAEC" /><stop offset="1" stopColor="#8CC071" /></radialGradient>
        </defs>
        <ellipse cx="110" cy="226" rx="62" ry="9" fill="#17404E" opacity=".16" className="robot-shadow" />
        <g className="robot-body">
          {/* antenna */}
          <line x1="110" y1="34" x2="110" y2="14" stroke="#7FB3C2" strokeWidth="6" strokeLinecap="round" />
          <circle cx="110" cy="12" r="10" fill={`url(#${id}g)`} className="robot-antenna" />
          {/* head */}
          <rect x="44" y="32" width="132" height="100" rx="38" fill={`url(#${id}b)`} />
          <rect x="32" y="66" width="16" height="34" rx="8" fill={`url(#${id}p)`} />
          <rect x="172" y="66" width="16" height="34" rx="8" fill={`url(#${id}p)`} />
          <rect x="60" y="50" width="100" height="64" rx="26" fill={`url(#${id}v)`} />
          <ellipse cx="78" cy="58" rx="16" ry="5" fill="#fff" opacity=".18" />
          <g className="robot-eyes">
            <g className="robot-eyes-open">
              <ellipse cx="88" cy="80" rx="10" ry="12" fill={`url(#${id}e)`} />
              <ellipse cx="132" cy="80" rx="10" ry="12" fill={`url(#${id}e)`} />
              <circle cx="91" cy="76" r="3" fill="#fff" opacity=".9" />
              <circle cx="135" cy="76" r="3" fill="#fff" opacity=".9" />
            </g>
            <g className="robot-eyes-happy" stroke="#8CC071" strokeWidth="6" strokeLinecap="round" fill="none">
              <path d="M78 84 q10 -14 20 0" />
              <path d="M122 84 q10 -14 20 0" />
            </g>
          </g>
          <path className="robot-mouth" d="M96 98 q14 10 28 0" stroke="#8CC071" strokeWidth="5" fill="none" strokeLinecap="round" />
          <ellipse className="robot-cheek" cx="72" cy="100" rx="8" ry="5" fill="#8CC071" />
          <ellipse className="robot-cheek" cx="148" cy="100" rx="8" ry="5" fill="#8CC071" />
          {/* body */}
          <rect x="66" y="138" width="88" height="70" rx="28" fill={`url(#${id}b)`} />
          <rect x="88" y="156" width="44" height="28" rx="10" fill={`url(#${id}p)`} />
          <circle cx="100" cy="170" r="4" fill="#8CC071" className="robot-led" />
          <circle cx="120" cy="170" r="4" fill="#5FD0E0" />
          {/* left arm */}
          <rect x="40" y="146" width="24" height="46" rx="12" fill={`url(#${id}p)`} />
          {/* right arm — pivots at the shoulder (160,150) */}
          <g className="robot-arm">
            <rect x="156" y="146" width="24" height="46" rx="12" fill={`url(#${id}p)`} />
            <circle cx="168" cy="196" r="13" fill={`url(#${id}b)`} />
          </g>
        </g>
      </svg>
    </div>
  );
}
