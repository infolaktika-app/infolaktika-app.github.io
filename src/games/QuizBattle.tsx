import { useEffect, useMemo, useRef, useState } from 'react';
import { IClock } from '../components/Icons';
import { Feedback, GameBar, shuffle, type GameProps } from './common';

interface Q { q: string; options: string[]; answer: number; explain?: string }
interface Data { time_per_question?: number; questions: Q[] }

export default function QuizBattle({ data, onFinish }: GameProps<Data>) {
  const questions = useMemo(() => shuffle(data.questions ?? []), [data]);
  const limit = data.time_per_question ?? 20;
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(limit);
  const scoreRef = useRef(0);
  const q = questions[i];
  const answered = picked !== null || timedOut;

  useEffect(() => {
    if (answered) return;
    setLeft(limit);
    const start = Date.now();
    const t = setInterval(() => {
      const l = Math.max(0, limit - (Date.now() - start) / 1000);
      setLeft(l);
      if (l <= 0) { clearInterval(t); setTimedOut(true); }
    }, 100);
    return () => clearInterval(t);
  }, [i, limit, answered]);

  const choose = (k: number) => {
    if (answered) return;
    setPicked(k);
    if (k === q.answer) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }
  };

  const next = () => {
    if (i + 1 >= questions.length) return onFinish(scoreRef.current, questions.length);
    setI(i + 1);
    setPicked(null);
    setTimedOut(false);
  };

  // stop the clock visually once answered
  const shown = answered ? undefined : left;
  const pct = ((shown ?? 0) / limit) * 100;
  const danger = (shown ?? limit) < 5;

  if (!q) return <p>Сұрақтар жоқ.</p>;
  return (
    <div>
      <GameBar step={i + 1} total={questions.length} score={`${score} дұрыс`} extra={
        <span className={`chip ${danger && !answered ? 'bg-rose-100 text-rose-700' : 'bg-card text-ink/70 shadow-[0_2px_0_var(--edge)]'}`}>
          <IClock className="h-3.5 w-3.5" /> {answered ? '—' : Math.ceil(left)} с
        </span>
      } />
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-haze">
        <div className={`h-full rounded-full transition-[width] duration-100 ease-linear ${danger ? 'bg-rose-400' : 'bg-sun'}`} style={{ width: `${answered ? 0 : pct}%` }} />
      </div>

      <h2 key={i} className="fade-up text-xl font-extrabold leading-snug sm:text-2xl">{q.q}</h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {q.options.map((o, k) => {
          const correct = answered && k === q.answer;
          const wrong = answered && k === picked && k !== q.answer;
          return (
            <button
              key={k}
              onClick={() => choose(k)}
              disabled={answered}
              className={`group flex items-center gap-3 rounded-2xl border-2 p-4 text-left font-bold transition-all ${
                correct ? 'pop border-emerald-400 bg-emerald-50 text-emerald-800'
                  : wrong ? 'shake border-rose-300 bg-rose-50 text-rose-700'
                  : answered ? 'border-haze bg-card opacity-60'
                  : 'border-haze bg-card shadow-[0_4px_0_var(--edge)] hover:-translate-y-0.5 hover:border-lavender active:translate-y-1 active:shadow-none'
              }`}
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm ${correct ? 'bg-emerald-500 text-white' : wrong ? 'bg-rose-500 text-white' : 'bg-haze text-brand'}`}>
                {correct ? '✓' : wrong ? '✕' : String.fromCharCode(65 + k)}
              </span>
              {o}
            </button>
          );
        })}
      </div>
      {answered && (
        <>
          <Feedback ok={picked === q.answer} title={timedOut && picked === null ? 'Уақыт бітті! ⏰' : undefined} text={q.explain} />
          <div className="mt-5 flex justify-end">
            <button className="btn btn-primary" onClick={next} autoFocus>{i + 1 >= questions.length ? 'Нәтижені көру' : 'Келесі сұрақ →'}</button>
          </div>
        </>
      )}
    </div>
  );
}
