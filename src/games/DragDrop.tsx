import { useMemo, useRef, useState } from 'react';
import { GameBar, shuffle, type GameProps } from './common';

interface Data { buckets: string[]; items: { text: string; bucket: number }[] }

const COLORS = ['#2A6B7F', '#63B1CB', '#2FA1C8', '#2683A3', '#30A6CE'];

/** Pointer-based drag & drop (works with mouse, touch and pen) plus tap-to-place. */
export default function DragDrop({ data, onFinish }: GameProps<Data>) {
  const items = useMemo(() => shuffle((data.items ?? []).map((x, id) => ({ ...x, id }))), [data]);
  const [placed, setPlaced] = useState<Record<number, number>>({});
  const [missed, setMissed] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);
  const [bad, setBad] = useState<{ item: number; bucket: number } | null>(null);
  const [drag, setDrag] = useState<{ id: number; x: number; y: number; w: number } | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const start = useRef<{ x: number; y: number; id: number; moved: boolean; w: number } | null>(null);
  const missedRef = useRef(new Set<number>());

  const left = items.filter((x) => placed[x.id] === undefined);

  const drop = (id: number, bucket: number) => {
    const it = items.find((x) => x.id === id)!;
    if (it.bucket === bucket) {
      const next = { ...placed, [id]: bucket };
      setPlaced(next);
      setSelected(null);
      if (Object.keys(next).length === items.length) {
        const score = items.length - missedRef.current.size;
        setTimeout(() => onFinish(score, items.length), 700);
      }
    } else {
      missedRef.current.add(id);
      setMissed(new Set(missedRef.current));
      setBad({ item: id, bucket });
      setTimeout(() => setBad(null), 600);
    }
  };

  const bucketAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest('[data-bucket]') as HTMLElement | null;
    return el ? Number(el.dataset.bucket) : null;
  };

  const onDown = (e: React.PointerEvent<HTMLButtonElement>, id: number) => {
    const r = e.currentTarget.getBoundingClientRect();
    start.current = { x: e.clientX, y: e.clientY, id, moved: false, w: r.width };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    if (!s.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) < 6) return;
    s.moved = true;
    setDrag({ id: s.id, x: e.clientX, y: e.clientY, w: s.w });
    setOver(bucketAt(e.clientX, e.clientY));
  };
  const onUp = (e: React.PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    if (s.moved) {
      const b = bucketAt(e.clientX, e.clientY);
      if (b !== null) drop(s.id, b);
    } else {
      setSelected((cur) => (cur === s.id ? null : s.id));
    }
    setDrag(null);
    setOver(null);
  };

  const dragged = drag ? items.find((x) => x.id === drag.id) : null;

  return (
    <div className="select-none">
      <GameBar step={Object.keys(placed).length} total={items.length} score={`${missed.size} қате`} />
      <p className="mb-4 text-sm font-semibold text-ink/55">Элементті тиісті топқа сүйреп апар — немесе алдымен элементті, сосын топты бас.</p>

      <div className="mb-6 flex min-h-16 flex-wrap gap-2.5 rounded-2xl border-2 border-dashed border-haze bg-card/60 p-3">
        {left.length === 0 && <p className="w-full py-3 text-center font-bold text-emerald-600">Барлығы орналастырылды! 🎉</p>}
        {left.map((it) => (
          <button
            key={it.id}
            onPointerDown={(e) => onDown(e, it.id)}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={() => { start.current = null; setDrag(null); }}
            className={`touch-none rounded-2xl bg-card px-4 py-2.5 font-bold shadow-[0_4px_0_var(--edge)] transition ${
              drag?.id === it.id ? 'opacity-30' : ''
            } ${selected === it.id ? '-translate-y-1 ring-2 ring-violet shadow-[0_6px_0_var(--edge-2)]' : 'hover:-translate-y-0.5'} ${bad?.item === it.id ? 'shake ring-2 ring-rose-400' : ''}`}
            style={{ cursor: 'grab' }}
          >
            {it.text}
          </button>
        ))}
      </div>

      <div className={`grid gap-4 ${data.buckets.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        {data.buckets.map((b, bi) => {
          const color = COLORS[bi % COLORS.length];
          const inside = items.filter((x) => placed[x.id] === bi);
          const hot = over === bi || (selected !== null && !drag);
          return (
            <div
              key={bi}
              data-bucket={bi}
              onClick={() => selected !== null && drop(selected, bi)}
              className={`min-h-44 rounded-[24px] border-2 p-4 transition-all ${bad?.bucket === bi ? 'shake border-rose-300 bg-rose-50' : over === bi ? 'scale-[1.02] border-solid' : 'border-dashed'} ${hot ? 'cursor-pointer' : ''}`}
              style={{ borderColor: over === bi ? color : color + '55', background: over === bi ? color + '1A' : color + '0A' }}
            >
              <p className="tone-text mb-3 flex items-center gap-2 font-extrabold" style={{ color }}>
                <span className="h-3 w-3 rounded-full" style={{ background: color }} /> {b}
                <span className="ml-auto text-xs opacity-60">{inside.length}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {inside.map((it) => (
                  <span key={it.id} className="pop rounded-xl bg-card px-3 py-1.5 text-sm font-bold shadow-sm">
                    {it.text} {missed.has(it.id) ? '' : '✓'}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {drag && dragged && (
        <div
          className="pointer-events-none fixed z-[95] -translate-x-1/2 -translate-y-1/2 rotate-3 rounded-2xl bg-card px-4 py-2.5 font-bold shadow-[0_20px_40px_-10px_rgba(var(--shade),.5)] ring-2 ring-violet"
          style={{ left: drag.x, top: drag.y, minWidth: Math.min(drag.w, 240) }}
        >
          {dragged.text}
        </div>
      )}
    </div>
  );
}
