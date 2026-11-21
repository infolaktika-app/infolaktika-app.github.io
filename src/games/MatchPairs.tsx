import { useMemo, useRef, useState } from 'react';
import { GameBar, shuffle, type GameProps } from './common';

interface Data { pairs: { term: string; definition: string }[] }

export default function MatchPairs({ data, onFinish }: GameProps<Data>) {
  const pairs = data.pairs ?? [];
  const terms = useMemo(() => shuffle(pairs.map((p, i) => ({ i, text: p.term }))), [data]);
  const defs = useMemo(() => shuffle(pairs.map((p, i) => ({ i, text: p.definition }))), [data]);
  const [selT, setSelT] = useState<number | null>(null);
  const [selD, setSelD] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<[number, number] | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const mRef = useRef(0);

  const tryMatch = (t: number | null, d: number | null) => {
    if (t === null || d === null) return;
    if (t === d) {
      const next = new Set(matched).add(t);
      setMatched(next);
      setSelT(null);
      setSelD(null);
      if (next.size === pairs.length) {
        const max = pairs.length * 2;
        setTimeout(() => onFinish(Math.max(0, max - mRef.current), max), 700);
      }
    } else {
      mRef.current += 1;
      setMistakes(mRef.current);
      setWrong([t, d]);
      setTimeout(() => { setWrong(null); setSelT(null); setSelD(null); }, 650);
    }
  };

  const cls = (kind: 't' | 'd', idx: number) => {
    const sel = kind === 't' ? selT === idx : selD === idx;
    const isWrong = wrong && (kind === 't' ? wrong[0] === idx : wrong[1] === idx);
    if (matched.has(idx)) return 'border-emerald-300 bg-emerald-50 text-emerald-800 opacity-70 pointer-events-none';
    if (isWrong) return 'shake border-rose-300 bg-rose-50 text-rose-700';
    if (sel) return 'border-violet bg-haze text-brand -translate-y-0.5 shadow-[0_6px_0_var(--edge-2)]';
    return 'border-haze bg-card shadow-[0_4px_0_var(--edge)] hover:border-lavender';
  };

  return (
    <div>
      <GameBar step={matched.size} total={pairs.length} score={`${mistakes} қате`} />
      <p className="mb-4 text-sm font-semibold text-ink/55">Сол жақтан терминді, оң жақтан оның анықтамасын таңда.</p>
      <div className="grid gap-4 md:grid-cols-[1fr_1.6fr]">
        <div className="space-y-3">
          {terms.map((t) => (
            <button key={t.i} disabled={wrong !== null} onClick={() => { setSelT(t.i); tryMatch(t.i, selD); }} className={`w-full rounded-2xl border-2 px-4 py-3.5 text-left font-extrabold transition-all ${cls('t', t.i)}`}>
              {matched.has(t.i) && '✓ '}{t.text}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {defs.map((d) => (
            <button key={d.i} disabled={wrong !== null} onClick={() => { setSelD(d.i); tryMatch(selT, d.i); }} className={`w-full rounded-2xl border-2 px-4 py-3.5 text-left text-sm font-semibold transition-all ${cls('d', d.i)}`}>
              {d.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
