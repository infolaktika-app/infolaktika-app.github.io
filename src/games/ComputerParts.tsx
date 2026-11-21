import { useMemo, useState } from 'react';
import { Feedback, GameBar, shuffle, type GameProps } from './common';

interface Part { id: string; name: string; hint: string }
interface Data { parts: Part[] }

// label anchor for each hotspot in the SVG
const ANCHOR: Record<string, [number, number]> = {
  cpu: [215, 82], ram: [322, 72], gpu: [230, 222], psu: [145, 352], ssd: [485, 292], motherboard: [100, 62], fan: [485, 58],
};

export default function ComputerParts({ data, onFinish }: GameProps<Data>) {
  const parts = useMemo(() => shuffle(data.parts ?? []), [data]);
  const [i, setI] = useState(0);
  const [found, setFound] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [reveal, setReveal] = useState(false);
  const target = parts[i];
  const done = i >= parts.length;

  const advance = (pts: number) => {
    const total = score + pts;
    setScore(total);
    setFound((f) => [...f, target.id]);
    setTimeout(() => {
      setAttempts(0);
      setReveal(false);
      if (i + 1 >= parts.length) onFinish(total, parts.length * 2);
      setI((x) => x + 1);
    }, 1100);
  };

  const click = (id: string) => {
    if (done || reveal || found.includes(target.id)) return;
    if (found.includes(id) && id !== target.id) return;
    if (id === target.id) advance(attempts === 0 ? 2 : attempts === 1 ? 1 : 0);
    else {
      setWrong(id);
      setTimeout(() => setWrong(null), 500);
      const a = attempts + 1;
      setAttempts(a);
      if (a >= 3) { setReveal(true); advance(0); }
    }
  };

  const st = (id: string) => {
    const isFound = found.includes(id);
    return {
      className: `part cursor-pointer transition-all duration-300 ${wrong === id ? 'part-wrong' : ''} ${isFound ? 'part-found' : ''} ${reveal && target?.id === id ? 'part-reveal' : ''}`,
      onClick: (e: React.MouseEvent) => { e.stopPropagation(); click(id); },
      role: 'button' as const,
      'aria-label': parts.find((p) => p.id === id)?.name ?? id,
    };
  };

  return (
    <div>
      <style>{`
        .part:hover { filter: drop-shadow(0 0 10px #7FB3C2) brightness(1.12); }
        .part-wrong { animation: shake .35s; filter: drop-shadow(0 0 10px #67B2CC) !important; }
        .part-found { filter: drop-shadow(0 0 10px #46A2C1) !important; }
        .part-reveal { filter: drop-shadow(0 0 14px #8FCAD8) !important; }
      `}</style>
      <GameBar step={Math.min(i + 1, parts.length)} total={parts.length} score={`${score} ұпай`} />
      {!done && target && (
        <div key={i} className="fade-up mb-4 flex flex-col gap-2 rounded-2xl bg-haze/70 p-4 sm:flex-row sm:items-center">
          <p className="text-lg font-extrabold">Тап: <span className="text-brand">{target.name}</span></p>
          {attempts > 0 && <p className="text-sm text-ink/60 sm:ml-auto">💡 {target.hint}</p>}
        </div>
      )}

      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#123642] to-[#091A20] p-3 shadow-[0_24px_50px_-24px_rgba(var(--shade),.8)] sm:p-5">
        <svg viewBox="0 0 600 440" className="mx-auto w-full max-w-3xl">
          <defs>
            <linearGradient id="cp-board" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#328AA8" /><stop offset="1" stopColor="#1E5D73" /></linearGradient>
            <linearGradient id="cp-gpu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#354950" /><stop offset="1" stopColor="#1B292E" /></linearGradient>
            <linearGradient id="cp-ram" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8FCAD8" /><stop offset="1" stopColor="#4E97A9" /></linearGradient>
            <radialGradient id="cp-fan" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#86C2D7" /><stop offset="1" stopColor="#2A728A" /></radialGradient>
          </defs>
          {/* case */}
          <rect x="18" y="18" width="564" height="404" rx="26" fill="#152B33" stroke="#355A66" strokeWidth="4" />
          <rect x="410" y="34" width="156" height="372" rx="16" fill="#1C3842" />

          {/* motherboard */}
          <g {...st('motherboard')}>
            <rect x="48" y="44" width="346" height="300" rx="14" fill="url(#cp-board)" />
            <g stroke="#85C2D6" strokeWidth="2" opacity=".5" fill="none">
              <path d="M70 120 h60 v60 h40 M70 200 h90 M300 300 v-40 h60 M140 320 h120 v-20 M370 120 v80 h-20" />
              <circle cx="70" cy="120" r="4" /><circle cx="70" cy="200" r="4" /><circle cx="360" cy="300" r="4" />
            </g>
            <rect x="66" y="270" width="40" height="40" rx="6" fill="#123642" />
          </g>

          {/* CPU + cooler */}
          <g {...st('cpu')}>
            <rect x="165" y="92" width="100" height="100" rx="14" fill="#C9D4D8" />
            <rect x="172" y="99" width="86" height="86" rx="10" fill="#9EAFB5" />
            <circle cx="215" cy="142" r="38" fill="#263940" />
            <g className="origin-[215px_142px]" style={{ animation: 'spin-slow 3s linear infinite', transformOrigin: '215px 142px' }}>
              {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="215" cy="122" rx="9" ry="18" fill="#2A6B7F" transform={`rotate(${a} 215 142)`} />)}
            </g>
            <circle cx="215" cy="142" r="8" fill="#8FCAD8" />
          </g>

          {/* RAM */}
          <g {...st('ram')}>
            <rect x="286" y="80" width="78" height="128" fill="transparent" />
            {[0, 1, 2, 3].map((k) => (
              <g key={k}>
                <rect x={290 + k * 19} y="84" width="12" height="120" rx="3" fill="url(#cp-ram)" />
                {[0, 1, 2, 3, 4].map((r) => <rect key={r} x={292 + k * 19} y={94 + r * 21} width="8" height="12" rx="1.5" fill="#1B292E" opacity=".7" />)}
              </g>
            ))}
          </g>

          {/* GPU */}
          <g {...st('gpu')}>
            <rect x="80" y="230" width="300" height="70" rx="12" fill="url(#cp-gpu)" />
            <rect x="80" y="296" width="300" height="8" rx="3" fill="#8FCAD8" opacity=".8" />
            {[150, 270].map((cx) => (
              <g key={cx}>
                <circle cx={cx} cy="265" r="28" fill="#091A20" />
                <circle cx={cx} cy="265" r="23" fill="url(#cp-fan)" opacity=".7" />
                <circle cx={cx} cy="265" r="6" fill="#fff" />
              </g>
            ))}
            <text x="336" y="270" fill="#7FB3C2" fontSize="13" fontWeight="800" fontFamily="JUZ40, sans-serif">GPU</text>
          </g>

          {/* PSU */}
          <g {...st('psu')}>
            <rect x="48" y="356" width="200" height="52" rx="10" fill="#354950" />
            <g stroke="#1B292E" strokeWidth="3">{[0, 1, 2, 3, 4, 5, 6].map((k) => <line key={k} x1={66 + k * 12} y1="366" x2={66 + k * 12} y2="398" />)}</g>
            <text x="160" y="388" fill="#8FCAD8" fontSize="16" fontWeight="800" fontFamily="JUZ40, sans-serif">⚡</text>
          </g>

          {/* SSD */}
          <g {...st('ssd')}>
            <rect x="428" y="300" width="114" height="54" rx="10" fill="#EAF4F8" />
            <rect x="440" y="314" width="58" height="26" rx="5" fill="#17404E" />
            <text x="506" y="333" fill="#17404E" fontSize="12" fontWeight="800" fontFamily="JUZ40, sans-serif">SSD</text>
          </g>

          {/* case fan */}
          <g {...st('fan')}>
            <rect x="428" y="64" width="114" height="114" rx="18" fill="#263940" />
            <circle cx="485" cy="121" r="48" fill="#091A20" />
            <g style={{ animation: 'spin-slow 2.4s linear infinite', transformOrigin: '485px 121px' }}>
              {[0, 60, 120, 180, 240, 300].map((a) => <ellipse key={a} cx="485" cy="93" rx="11" ry="24" fill="#86C2D7" opacity=".75" transform={`rotate(${a} 485 121)`} />)}
            </g>
            <circle cx="485" cy="121" r="10" fill="#7FB3C2" />
          </g>

          {/* cables (decorative) */}
          <path d="M248 382 C300 382 320 360 330 320" stroke="#9BCDDE" strokeWidth="5" fill="none" opacity=".6" pointerEvents="none" />
          <path d="M248 392 C350 400 400 360 428 330" stroke="#86C2D7" strokeWidth="5" fill="none" opacity=".5" pointerEvents="none" />

          {/* labels for found parts */}
          {found.map((id) => {
            const p = parts.find((x) => x.id === id);
            const [x, y] = ANCHOR[id] ?? [300, 220];
            const w = (p?.name.length ?? 6) * 7.4 + 22;
            return (
              <g key={id} className="pop" pointerEvents="none">
                <rect x={x - w / 2} y={y - 15} width={w} height="26" rx="13" fill="#2683A3" />
                <text x={x} y={y + 3} textAnchor="middle" fill="#fff" fontSize="12.5" fontWeight="800" fontFamily="JUZ40, sans-serif">✓ {p?.name}</text>
              </g>
            );
          })}
        </svg>
      </div>
      {reveal && <Feedback ok={false} title="Мұнда екен!" text={target?.hint} />}
    </div>
  );
}
