import { useEffect, useRef, useState } from 'react';
import { Robot, Star3D } from '../components/Art';
import { IPlay, IRefresh, ITrash } from '../components/Icons';
import { Feedback, GameBar, type GameProps } from './common';

interface Level { grid: string[]; max_commands: number }
interface Data { levels: Level[] }
type Dir = 'U' | 'D' | 'L' | 'R';
interface Cmd { dir: Dir; n: number; key: number }

const DIRS: Record<Dir, { dx: number; dy: number; label: string; arrow: string }> = {
  U: { dx: 0, dy: -1, label: 'Жоғары', arrow: '↑' },
  D: { dx: 0, dy: 1, label: 'Төмен', arrow: '↓' },
  L: { dx: -1, dy: 0, label: 'Солға', arrow: '←' },
  R: { dx: 1, dy: 0, label: 'Оңға', arrow: '→' },
};

function find(grid: string[], ch: string) {
  for (let y = 0; y < grid.length; y++) {
    const x = grid[y].indexOf(ch);
    if (x >= 0) return { x, y };
  }
  return { x: 0, y: 0 };
}

export default function AlgorithmMaze({ data, onFinish }: GameProps<Data>) {
  const levels = data.levels ?? [];
  const [li, setLi] = useState(0);
  const lv = levels[li];
  const start = find(lv.grid, 'S');
  const goal = find(lv.grid, 'G');
  const [prog, setProg] = useState<Cmd[]>([]);
  const [pos, setPos] = useState(start);
  const [trail, setTrail] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<null | 'win' | 'crash' | 'short'>(null);
  const [runs, setRuns] = useState(0);
  const [score, setScore] = useState(0);
  const [activeCmd, setActiveCmd] = useState<number | null>(null);
  const alive = useRef(true);
  const keyRef = useRef(0);
  useEffect(() => () => { alive.current = false; }, []);

  useEffect(() => {
    setProg([]); setPos(find(lv.grid, 'S')); setTrail([]); setStatus(null); setRuns(0); setActiveCmd(null);
  }, [li]);

  const H = lv.grid.length;
  const W = lv.grid[0].length;
  const wall = (x: number, y: number) => x < 0 || y < 0 || x >= W || y >= H || lv.grid[y][x] === '#';

  const addCmd = (dir: Dir) => {
    if (running || prog.length >= lv.max_commands) return;
    const last = prog[prog.length - 1];
    if (last && last.dir === dir && last.n < 9) setProg(prog.map((c, i) => (i === prog.length - 1 ? { ...c, n: c.n + 1 } : c)));
    else setProg([...prog, { dir, n: 1, key: keyRef.current++ }]);
    reset();
  };
  const bump = (i: number, d: number) => !running && setProg(prog.map((c, k) => (k === i ? { ...c, n: Math.max(1, Math.min(9, c.n + d)) } : c)));
  const del = (i: number) => !running && setProg(prog.filter((_, k) => k !== i));
  const reset = () => { setPos(start); setTrail([]); setStatus(null); setActiveCmd(null); };

  const run = async () => {
    if (!prog.length || running) return;
    setRunning(true);
    setStatus(null);
    let p = { ...start };
    setPos(p);
    const tr: string[] = [`${p.x},${p.y}`];
    setTrail([...tr]);
    const attempt = runs + 1;
    setRuns(attempt);
    await wait(250);
    for (let ci = 0; ci < prog.length; ci++) {
      setActiveCmd(ci);
      const c = prog[ci];
      for (let s = 0; s < c.n; s++) {
        const nx = p.x + DIRS[c.dir].dx;
        const ny = p.y + DIRS[c.dir].dy;
        if (wall(nx, ny)) {
          if (!alive.current) return;
          setStatus('crash');
          setRunning(false);
          return;
        }
        p = { x: nx, y: ny };
        tr.push(`${nx},${ny}`);
        setPos(p);
        setTrail([...tr]);
        await wait(260);
        if (!alive.current) return;
        if (p.x === goal.x && p.y === goal.y) {
          const pts = attempt === 1 ? 3 : attempt === 2 ? 2 : 1;
          setScore((x) => x + pts);
          setStatus('win');
          setRunning(false);
          setActiveCmd(null);
          return;
        }
      }
    }
    setActiveCmd(null);
    setStatus('short');
    setRunning(false);
  };

  const next = () => {
    if (li + 1 >= levels.length) onFinish(score, levels.length * 3);
    else setLi(li + 1);
  };
  const skip = () => {
    if (li + 1 >= levels.length) onFinish(score, levels.length * 3);
    else setLi(li + 1);
  };

  const cell = Math.min(64, Math.floor(Math.min(560, (typeof window !== 'undefined' ? window.innerWidth : 800) - 80) / W));
  return (
    <div>
      <GameBar step={li + 1} total={levels.length} score={`${score} ұпай`} extra={<span className="chip bg-card text-ink/60 shadow-[0_2px_0_var(--edge)]">Команда: {prog.length}/{lv.max_commands}</span>} />
      <p className="mb-4 text-sm font-semibold text-ink/55">Роботты ⭐ жұлдызға жеткізетін командалар тізбегін құр. Қабырғаға соқтығыспа!</p>
      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        {/* board */}
        <div className="mx-auto w-fit rounded-[24px] bg-[#0C2129] ring-1 ring-white/10 p-3 shadow-[0_24px_40px_-20px_rgba(var(--shade),.7)]">
          <div className="relative grid" style={{ gridTemplateColumns: `repeat(${W}, ${cell}px)`, gridTemplateRows: `repeat(${H}, ${cell}px)` }}>
            {lv.grid.flatMap((row, y) => row.split('').map((ch, x) => {
              const visited = trail.includes(`${x},${y}`);
              return (
                <div key={`${x}-${y}`} className="p-[3px]">
                  <div className={`h-full w-full rounded-xl ${ch === '#' ? 'bg-gradient-to-b from-[#468FA8] to-[#2A667A] shadow-[inset_0_-5px_0_rgba(0,0,0,.25)]' : visited ? 'bg-lavender/35' : 'bg-white/[.07]'}`} />
                </div>
              );
            }))}
            <div className="pointer-events-none absolute grid place-items-center" style={{ left: goal.x * cell, top: goal.y * cell, width: cell, height: cell }}>
              <Star3D className="twinkle" style={{ width: cell * 0.7 }} />
            </div>
            <div
              className={`pointer-events-none absolute grid place-items-center transition-all duration-200 ease-out ${status === 'crash' ? 'shake' : ''}`}
              style={{ left: pos.x * cell, top: pos.y * cell, width: cell, height: cell }}
            >
              <Robot wave={false} style={{ width: cell * 0.85 }} />
            </div>
          </div>
        </div>

        {/* program */}
        <div>
          <p className="mb-2 text-sm font-bold text-ink/50">Командалар</p>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(DIRS) as Dir[]).map((d) => (
              <button key={d} onClick={() => addCmd(d)} disabled={running || prog.length >= lv.max_commands} className="btn btn-soft flex-col !gap-0 !px-2 !py-2.5">
                <span className="text-2xl leading-none">{DIRS[d].arrow}</span>
                <span className="text-[11px]">{DIRS[d].label}</span>
              </button>
            ))}
          </div>
          <p className="mb-2 mt-5 text-sm font-bold text-ink/50">Бағдарлама</p>
          <div className="min-h-28 space-y-2 rounded-2xl bg-card p-3 shadow-[var(--shadow-soft)]">
            {prog.length === 0 && <p className="py-6 text-center text-sm text-ink/35">Жоғарыдағы батырмалармен команда қос</p>}
            {prog.map((c, i) => (
              <div key={c.key} className={`pop flex items-center gap-2 rounded-xl px-3 py-2 transition ${activeCmd === i ? 'bg-sun/40 ring-2 ring-sun' : 'bg-mist'}`}>
                <span className="w-5 text-xs font-bold text-ink/35">{i + 1}</span>
                <span className="code font-bold text-brand">{DIRS[c.dir].arrow} {DIRS[c.dir].label}</span>
                <span className="ml-auto flex items-center gap-1">
                  <button className="h-7 w-7 rounded-lg bg-card font-bold shadow-sm disabled:opacity-40" onClick={() => bump(i, -1)} disabled={running || c.n <= 1} aria-label="Азайту">−</button>
                  <span className="code w-8 text-center font-bold">×{c.n}</span>
                  <button className="h-7 w-7 rounded-lg bg-card font-bold shadow-sm disabled:opacity-40" onClick={() => bump(i, 1)} disabled={running || c.n >= 9} aria-label="Көбейту">+</button>
                  <button className="ml-1 grid h-7 w-7 place-items-center rounded-lg text-ink/35 hover:bg-rose-50 hover:text-rose-500" onClick={() => del(i)} disabled={running} aria-label="Жою"><ITrash className="h-4 w-4" /></button>
                </span>
              </div>
            ))}
          </div>

          {status === 'crash' && <Feedback ok={false} title="Бам! Робот қабырғаға соқтығысты 💥" text="Бағдарламаны түзетіп, қайта іске қос." />}
          {status === 'short' && <Feedback ok={false} title="Робот жұлдызға жетпеді" text="Тағы команда қосу керек сияқты." />}
          {status === 'win' && <Feedback ok title={`Деңгей өтілді! +${runs === 1 ? 3 : runs === 2 ? 2 : 1} ұпай`} text={runs === 1 ? 'Бірінші әрекеттен — нағыз алгоритм шебері!' : undefined} />}

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {status !== 'win' ? (
              <>
                {runs >= 3 && <button className="btn btn-ghost" onClick={skip}>Өткізіп жіберу</button>}
                <button className="btn btn-ghost" onClick={() => { setProg([]); reset(); }} disabled={running}><IRefresh className="h-4 w-4" /> Тазалау</button>
                <button className="btn btn-primary" onClick={run} disabled={running || !prog.length}><IPlay className="h-4 w-4" /> Іске қосу</button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={next}>{li + 1 >= levels.length ? 'Нәтижені көру' : 'Келесі деңгей →'}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
