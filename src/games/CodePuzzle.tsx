import { useMemo, useState } from 'react';
import { IRefresh } from '../components/Icons';
import { Feedback, GameBar, LANG_LABEL, shuffle, type GameProps } from './common';

interface Level { task: string; lang: string; lines: string[] }
interface Data { levels: Level[] }

/** Students tap commands from the pool to build the program in the right order. */
export default function CodePuzzle({ data, onFinish }: GameProps<Data>) {
  const levels = data.levels ?? [];
  const [li, setLi] = useState(0);
  const [score, setScore] = useState(0);
  const lv = levels[li];
  const pool0 = useMemo(() => {
    let s = shuffle(lv.lines.map((text, id) => ({ id, text })));
    if (s.every((x, k) => x.id === k) && s.length > 1) s = [...s.slice(1), s[0]]; // never start solved
    return s;
  }, [li, data]);
  const [pool, setPool] = useState(pool0);
  const [built, setBuilt] = useState<{ id: number; text: string }[]>([]);
  const [tries, setTries] = useState(0);
  const [result, setResult] = useState<null | boolean>(null);
  const [marks, setMarks] = useState<boolean[]>([]);

  // reset when level changes
  const [seenLevel, setSeenLevel] = useState(li);
  if (seenLevel !== li) {
    setSeenLevel(li);
    setPool(pool0);
    setBuilt([]);
    setTries(0);
    setResult(null);
    setMarks([]);
  }

  const add = (k: number) => {
    if (result) return;
    setBuilt((b) => [...b, pool[k]]);
    setPool((p) => p.filter((_, i) => i !== k));
    setMarks([]);
    setResult(null);
  };
  const remove = (k: number) => {
    if (result) return;
    setPool((p) => [...p, built[k]]);
    setBuilt((b) => b.filter((_, i) => i !== k));
    setMarks([]);
    setResult(null);
  };
  const move = (k: number, dir: -1 | 1) => {
    const j = k + dir;
    if (j < 0 || j >= built.length || result) return;
    const b = [...built];
    [b[k], b[j]] = [b[j], b[k]];
    setBuilt(b);
    setMarks([]);
  };

  const check = () => {
    const m = built.map((x, k) => x.id === k);
    setMarks(m);
    const ok = m.every(Boolean) && built.length === lv.lines.length;
    setTries((t) => t + 1);
    if (ok) {
      const pts = tries === 0 ? 2 : 1;
      setScore((s) => s + pts);
      setResult(true);
    } else setResult(false);
  };

  const next = () => {
    if (li + 1 >= levels.length) onFinish(score, levels.length * 2);
    else setLi(li + 1);
  };
  const giveUp = () => {
    setBuilt(lv.lines.map((text, id) => ({ id, text })));
    setPool([]);
    setMarks(lv.lines.map(() => true));
    setResult(true);
    setTries(99);
  };

  const isCode = lv.lang !== 'text';
  return (
    <div>
      <GameBar step={li + 1} total={levels.length} score={`${score} ұпай`} />
      <div className="mb-5 rounded-2xl bg-haze/70 p-4">
        <span className="chip mb-2 bg-card text-brand">{LANG_LABEL[lv.lang] ?? lv.lang}</span>
        <p className="text-lg font-extrabold">{lv.task}</p>
        <p className="text-sm text-ink/55">Командаларды басып, дұрыс ретпен жина. Ретін ↑ ↓ батырмаларымен өзгертуге болады.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-bold text-ink/50">Командалар</p>
          <div className="min-h-24 space-y-2 rounded-2xl border-2 border-dashed border-haze p-3">
            {pool.length === 0 && <p className="py-6 text-center text-sm text-ink/35">Барлық командалар қолданылды</p>}
            {pool.map((l, k) => (
              <button key={l.id} onClick={() => add(k)} className="pop block w-full rounded-xl bg-card px-4 py-2.5 text-left shadow-[0_3px_0_var(--edge)] transition hover:-translate-y-0.5 hover:shadow-[0_5px_0_var(--edge-2)] active:translate-y-0.5">
                <span className={isCode ? 'code whitespace-pre text-[13px]' : 'text-sm font-semibold'}>{isCode ? l.text : l.text}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-bold text-ink/50">{isCode ? 'Сенің бағдарламаң' : 'Сенің алгоритмің'}</p>
          <div className={`min-h-24 space-y-1.5 rounded-2xl p-3 ${isCode ? 'bg-[#0C2129] ring-1 ring-white/10' : 'bg-card shadow-[var(--shadow-soft)]'}`}>
            {built.length === 0 && <p className={`py-6 text-center text-sm ${isCode ? 'text-white/35' : 'text-ink/35'}`}>Мұнда командаларды қос</p>}
            {built.map((l, k) => {
              const mark = marks[k];
              return (
                <div key={l.id} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${mark === true ? 'bg-emerald-500/20' : mark === false ? 'bg-rose-500/20' : isCode ? 'hover:bg-white/5' : 'hover:bg-mist'}`}>
                  <span className={`w-6 text-right text-xs ${isCode ? 'text-white/30 code' : 'text-ink/30 font-bold'}`}>{k + 1}</span>
                  <button onClick={() => remove(k)} className={`flex-1 text-left ${isCode ? 'code whitespace-pre text-[13px] text-[#EAF4F8]' : 'text-sm font-semibold'}`} title="Алып тастау">
                    {highlight(l.text, isCode)}
                  </button>
                  {!result && (
                    <span className="flex gap-1">
                      <button onClick={() => move(k, -1)} className={`rounded-lg px-1.5 text-xs ${isCode ? 'text-white/50 hover:bg-white/10' : 'text-ink/40 hover:bg-haze'}`} aria-label="Жоғары">↑</button>
                      <button onClick={() => move(k, 1)} className={`rounded-lg px-1.5 text-xs ${isCode ? 'text-white/50 hover:bg-white/10' : 'text-ink/40 hover:bg-haze'}`} aria-label="Төмен">↓</button>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {result === false && <Feedback ok={false} title="Әлі дұрыс емес" text="Қызыл жолдар орнында емес. Ретін өзгертіп, қайта тексер." />}
      {result === true && <Feedback ok title={tries >= 99 ? 'Дұрыс жауап осындай' : tries === 1 ? 'Керемет! Бірден таптың! +2' : 'Дұрыс! +1'} />}

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        {!result && (
          <>
            <button className="btn btn-ghost" onClick={() => { setPool(pool0); setBuilt([]); setMarks([]); setResult(null); }}><IRefresh className="h-4 w-4" /> Қайта бастау</button>
            {tries >= 2 && <button className="btn btn-soft" onClick={giveUp}>Жауапты көрсету</button>}
            <button className="btn btn-primary" disabled={built.length !== lv.lines.length} onClick={check}>Тексеру</button>
          </>
        )}
        {result && <button className="btn btn-primary" onClick={next}>{li + 1 >= levels.length ? 'Нәтижені көру' : 'Келесі деңгей →'}</button>}
      </div>
    </div>
  );
}

/** Tiny syntax colouring for Python-like lines. */
function highlight(text: string, code: boolean) {
  if (!code) return text;
  const parts = text.split(/("[^"]*"|\b(?:for|in|if|else|elif|while|def|return|print|input|int|range|len)\b|\d+)/g);
  return parts.map((p, i) =>
    /^".*"$/.test(p) ? <span key={i} className="text-[#8FCAD8]">{p}</span>
      : /^(for|in|if|else|elif|while|def|return)$/.test(p) ? <span key={i} className="text-[#9BCDDE]">{p}</span>
      : /^(print|input|int|range|len)$/.test(p) ? <span key={i} className="text-[#86C2D7]">{p}</span>
      : /^\d+$/.test(p) ? <span key={i} className="text-[#7FB3C2]">{p}</span>
      : p);
}
