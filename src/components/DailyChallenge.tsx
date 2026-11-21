import { useState } from 'react';
import { friendlyError } from '../lib/api';
import { useSession } from '../lib/auth';
import { useToast } from '../lib/toast';
import { useAsync } from '../lib/useAsync';
import { Star3D } from './Art';
import { Spinner } from './ui';

export function DailyChallengeCard({ onDone }: { onDone?: () => void }) {
  const { api, refresh } = useSession();
  const toast = useToast();
  const { data: c, loading, setData } = useAsync(() => api.daily(), []);
  const [pick, setPick] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (pick === null || !c) return;
    setBusy(true);
    try {
      const r = await api.submitDaily(pick);
      setData({ ...c, done: true, correct: r.correct, answer: r.answer, explanation: r.explanation });
      if (r.correct) toast.reward(r, 'Күнделікті тапсырма орындалды!');
      else toast.info('Бұл жолы қате 🙈', 'Ертең жаңа сұрақ күтіп тұр!');
      if (r.bonus) toast.reward({ xp: 0, bonus: r.bonus, achievements: [] });
      refresh();
      onDone?.();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card relative h-full overflow-hidden p-6">
      <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-sun/30 blur-2xl" />
      <Star3D className="twinkle absolute right-5 top-5 w-10" />
      <span className="chip bg-sun/35 text-ink">🎯 Күнделікті тапсырма · +{c?.xp ?? 30} 💎</span>
      {loading ? (
        <div className="mt-6 space-y-3"><div className="skeleton h-6 w-3/4" /><div className="skeleton h-11" /><div className="skeleton h-11" /></div>
      ) : !c ? (
        <p className="mt-6 text-ink/50">Бүгін тапсырма жоқ.</p>
      ) : (
        <>
          <h3 className="relative mt-4 pr-10 text-lg font-extrabold leading-snug">{c.question}</h3>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {c.options.map((o, i) => {
              const isAns = c.done && c.answer === i;
              const isWrongPick = c.done && pick === i && !c.correct;
              return (
                <button
                  key={i}
                  disabled={c.done || busy}
                  onClick={() => setPick(i)}
                  className={`rounded-2xl border-2 px-4 py-2.5 text-left text-sm font-bold transition ${
                    isAns ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                      : isWrongPick ? 'border-rose-300 bg-rose-50 text-rose-700'
                      : pick === i ? 'border-violet bg-haze text-brand'
                      : 'border-haze bg-card hover:border-lavender'
                  }`}
                >
                  <span className="mr-2 text-ink/35">{String.fromCharCode(65 + i)}</span>{o}
                </button>
              );
            })}
          </div>
          {c.done ? (
            <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${c.correct ? 'bg-emerald-50 text-emerald-800' : 'bg-haze text-brand'}`}>
              <b>{c.correct ? 'Дұрыс! 🎉 ' : 'Келесі жолы міндетті түрде! '}</b>{c.explanation}
              <p className="mt-1 text-xs opacity-70">Жаңа тапсырма ертең шығады.</p>
            </div>
          ) : (
            <button className="btn btn-sun mt-4 w-full" disabled={pick === null || busy} onClick={submit}>
              {busy && <Spinner className="h-4 w-4" />} Жауапты тексеру
            </button>
          )}
        </>
      )}
    </div>
  );
}
