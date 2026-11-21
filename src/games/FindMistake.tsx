import { useMemo, useState } from 'react';
import { Feedback, GameBar, LANG_LABEL, shuffle, type GameProps } from './common';

interface Item { lang: string; task?: string; code: string[]; wrong_line: number; explain: string; fix?: string }
interface Data { items: Item[] }

export default function FindMistake({ data, onFinish }: GameProps<Data>) {
  const items = useMemo(() => shuffle(data.items ?? []), [data]);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const it = items[i];
  const done = pick !== null;
  const ok = pick === it?.wrong_line;

  const choose = (k: number) => {
    if (done) return;
    setPick(k);
    if (k === it.wrong_line) setScore((s) => s + 1);
  };
  const next = () => {
    if (i + 1 >= items.length) onFinish(score, items.length);
    else { setI(i + 1); setPick(null); }
  };

  if (!it) return <p>Тапсырма жоқ.</p>;
  return (
    <div>
      <GameBar step={i + 1} total={items.length} score={`${score} дұрыс`} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="chip bg-haze text-brand">{LANG_LABEL[it.lang] ?? it.lang}</span>
        {it.task && <p className="font-extrabold">{it.task}</p>}
      </div>
      <p className="mb-3 text-sm text-ink/55">Қате бар жолды шертіп белгіле 🔍</p>
      <div key={i} className="fade-up overflow-hidden rounded-2xl bg-[#0C2129] ring-1 ring-white/10 p-2 shadow-[0_20px_40px_-20px_rgba(var(--shade),.6)]">
        <div className="flex gap-1.5 px-3 py-2"><i className="h-3 w-3 rounded-full bg-[#81C0D5]" /><i className="h-3 w-3 rounded-full bg-[#62B0CB]" /><i className="h-3 w-3 rounded-full bg-[#2E9DC2]" /></div>
        {it.code.map((line, k) => {
          const isWrong = done && k === it.wrong_line;
          const isPickBad = done && k === pick && !ok;
          return (
            <button
              key={k}
              onClick={() => choose(k)}
              disabled={done}
              className={`flex w-full items-center gap-4 rounded-xl px-3 py-2 text-left transition ${
                isWrong ? 'bg-emerald-500/25 ring-2 ring-emerald-400' : isPickBad ? 'shake bg-rose-500/25 ring-2 ring-rose-400' : 'hover:bg-white/10'
              }`}
            >
              <span className="code w-5 text-right text-xs text-white/30">{k + 1}</span>
              <span className="code flex-1 whitespace-pre text-[13.5px] text-[#EAF4F8] sm:text-sm">{line}</span>
              {isWrong && <span className="text-xs font-bold text-emerald-300">қате осында</span>}
            </button>
          );
        })}
      </div>
      {done && (
        <>
          <Feedback ok={ok} title={ok ? 'Дұрыс таптың!' : 'Қате басқа жолда'} text={
            <>
              {it.explain}
              {it.fix && <span className="code mt-2 block whitespace-pre rounded-lg bg-card/70 px-3 py-2 text-[13px] text-ink">✔ {it.fix.trim()}</span>}
            </>
          } />
          <div className="mt-5 flex justify-end"><button className="btn btn-primary" onClick={next}>{i + 1 >= items.length ? 'Нәтижені көру' : 'Келесі →'}</button></div>
        </>
      )}
    </div>
  );
}
