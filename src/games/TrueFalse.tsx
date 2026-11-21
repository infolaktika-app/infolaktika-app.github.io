import { useEffect, useMemo, useState } from 'react';
import { Feedback, GameBar, shuffle, type GameProps } from './common';

interface Data { statements: { text: string; answer: boolean; explain?: string }[] }

export default function TrueFalse({ data, onFinish }: GameProps<Data>) {
  const list = useMemo(() => shuffle(data.statements ?? []), [data]);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const s = list[i];
  const done = pick !== null;

  const choose = (v: boolean) => {
    if (done) return;
    setPick(v);
    if (v === s.answer) { setScore((x) => x + 1); setStreak((x) => x + 1); } else setStreak(0);
  };
  const next = () => {
    if (i + 1 >= list.length) onFinish(score, list.length);
    else { setI(i + 1); setPick(null); }
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!done && (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a')) choose(true);
      if (!done && (e.key === 'ArrowRight' || e.key.toLowerCase() === 'l')) choose(false);
      if (done && e.key === 'Enter') next();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  if (!s) return <p>Тұжырым жоқ.</p>;
  const ok = pick === s.answer;
  return (
    <div>
      <GameBar step={i + 1} total={list.length} score={`${score} дұрыс`} extra={streak >= 2 ? <span className="chip pop bg-haze text-brand">🔥 {streak} қатарынан</span> : null} />
      <div key={i} className={`fade-up relative mx-auto max-w-2xl rounded-[28px] p-8 text-center sm:p-12 ${done ? (ok ? 'bg-emerald-50' : 'bg-rose-50') : 'bg-gradient-to-br from-white to-haze'} shadow-[0_8px_0_var(--edge),0_24px_40px_-20px_rgba(var(--shade),.4)]`}>
        <span className="text-4xl">{done ? (ok ? '🎉' : '🤔') : '❓'}</span>
        <p className="mt-4 text-xl font-extrabold leading-snug sm:text-2xl">{s.text}</p>
      </div>
      {!done ? (
        <div className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-4">
          <button className="btn py-5 text-lg text-white" style={{ background: 'linear-gradient(180deg,#46A2C1,#2683A3)', boxShadow: '0 6px 0 #185164' }} onClick={() => choose(true)}>✓ Ақиқат</button>
          <button className="btn py-5 text-lg text-white" style={{ background: 'linear-gradient(180deg,#91C8DA,#30A6CE)', boxShadow: '0 6px 0 #22738F' }} onClick={() => choose(false)}>✕ Жалған</button>
        </div>
      ) : (
        <div className="mx-auto max-w-2xl">
          <Feedback ok={ok} title={ok ? 'Дұрыс!' : `Жауап: ${s.answer ? 'Ақиқат' : 'Жалған'}`} text={s.explain} />
          <div className="mt-5 flex justify-end"><button className="btn btn-primary" onClick={next}>{i + 1 >= list.length ? 'Нәтижені көру' : 'Келесі →'}</button></div>
        </div>
      )}
    </div>
  );
}
