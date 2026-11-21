import { useState } from 'react';

/** Single-series vertical bar chart with hover tooltip (one hue, recessive grid). */
export function ColumnChart({ data, height = 200, unit = '' }: { data: { label: string; value: number; tip?: string }[]; height?: number; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = niceMax(max);
  const ticks = [0, 0.5, 1].map((t) => Math.round(nice * t));
  return (
    <div className="relative" style={{ height: height + 28 }}>
      <div className="absolute inset-x-0 top-0 ml-8" style={{ height }}>
        {ticks.map((t) => (
          <div key={t} className="absolute inset-x-0 border-t border-dashed border-haze" style={{ bottom: `${(t / nice) * 100}%` }}>
            <span className="absolute -left-8 -top-2 w-6 text-right text-[10px] font-semibold text-ink/40">{t}</span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end gap-[2px] sm:gap-1.5">
          {data.map((d, i) => (
            <div key={i} className="relative flex h-full flex-1 items-end justify-center" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <div
                className="w-full max-w-7 rounded-t-[4px] transition-[height,opacity] duration-700"
                style={{ height: `${(d.value / nice) * 100}%`, minHeight: d.value ? 3 : 0, background: 'var(--color-brand)', opacity: hover === null || hover === i ? 1 : 0.45 }}
              />
              {hover === i && (
                <div className="pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-xl bg-night px-3 py-1.5 text-xs font-bold text-white shadow-lg" style={{ bottom: `${(d.value / nice) * 100}%` }}>
                  {d.tip ?? d.label}: {d.value}{unit}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 ml-8 flex gap-[2px] sm:gap-1.5">
        {data.map((d, i) => (
          <span key={i} className={`flex-1 truncate text-center text-[10px] font-semibold ${hover === i ? 'text-ink' : 'text-ink/40'}`}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

/** Horizontal ranked bars with direct value labels. */
export function BarList({ data, unit = '', empty = 'Дерек жоқ' }: { data: { label: string; value: number; sub?: string }[]; unit?: string; empty?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="py-6 text-center text-sm text-ink/40">{empty}</p>;
  return (
    <ul className="space-y-3">
      {data.map((d, i) => (
        <li key={i} className="group" title={`${d.label}: ${d.value}${unit}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-semibold">{d.label}</span>
            <span className="shrink-0 font-extrabold">{d.value}{unit} {d.sub && <span className="font-semibold text-ink/40">· {d.sub}</span>}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-haze">
            <div className="h-full rounded-full bg-brand transition-[width] duration-700 group-hover:bg-violet" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function niceMax(v: number) {
  if (v <= 5) return 5;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
