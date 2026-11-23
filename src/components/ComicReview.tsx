import { useEffect, useState } from 'react';
import { Crystal } from './Art';
import { Spinner } from './ui';
import { friendlyError } from '../lib/api';
import { useSession } from '../lib/auth';
import { useToast } from '../lib/toast';
import type { ComicReview } from '../lib/types';

export const RATING_LABELS = ['', 'Ұнамады', 'Орташа', 'Жақсы', 'Өте жақсы', 'Керемет!'];

/** Five crystals; read-only when onChange is not given. */
export function CrystalRating({ value, onChange, size = 34 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const items = [1, 2, 3, 4, 5];
  if (!onChange) {
    return (
      <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} / 5 кристалл`}>
        {items.map((i) => (
          <Crystal key={i} tone="cyan" className="shrink-0 transition" style={{ width: size * 0.6, height: size, opacity: i <= Math.round(value) ? 1 : 0.22, filter: i <= Math.round(value) ? 'none' : 'grayscale(1)' }} />
        ))}
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Кристалмен бағала" onMouseLeave={() => setHover(0)}>
      {items.map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} кристалл — ${RATING_LABELS[i]}`}
          onMouseEnter={() => setHover(i)}
          onFocus={() => setHover(i)}
          onBlur={() => setHover(0)}
          onClick={() => onChange(i)}
          className={`grid place-items-center rounded-2xl p-1.5 transition active:scale-90 ${i <= shown ? 'scale-105' : 'hover:scale-105'}`}
          style={{ minWidth: 44, minHeight: 52 }}
        >
          <Crystal tone="cyan" className="transition" style={{ width: size * 0.6, height: size, opacity: i <= shown ? 1 : 0.25, filter: i <= shown ? 'drop-shadow(0 4px 10px rgba(95,208,224,.55))' : 'grayscale(1)' }} />
        </button>
      ))}
    </div>
  );
}

/** Shown under a finished comic: rate it 1–5 crystals and leave a comment for the admin. */
export function ComicReviewBox({ comicId }: { comicId: string }) {
  const { api } = useSession();
  const toast = useToast();
  const [mine, setMine] = useState<ComicReview | null | undefined>(undefined);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api.myComicReview(comicId).then((r) => {
      if (!alive) return;
      setMine(r);
      if (r) { setRating(r.rating); setComment(r.comment); setEditing(false); }
    }).catch(() => alive && setMine(null));
    return () => { alive = false; };
  }, [comicId]);

  if (mine === undefined) return null;

  const submit = async () => {
    if (!rating) return toast.error('Алдымен кристалмен бағала');
    setBusy(true);
    try {
      await api.rateComic(comicId, rating, comment);
      setMine({ rating, comment: comment.trim(), updated_at: new Date().toISOString() });
      setEditing(false);
      toast.success(mine ? 'Бағаң жаңартылды' : 'Рахмет! Бағаң жіберілді', 'Пікіріңді әкімші көреді');
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  if (!editing && mine) {
    return (
      <section className="mt-5 flex flex-col gap-3 rounded-[28px] bg-card p-5 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center sm:p-6" aria-label="Сенің бағаң">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink/50">Сенің бағаң</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <CrystalRating value={mine.rating} size={26} />
            <span className="font-extrabold">{RATING_LABELS[mine.rating]}</span>
          </div>
          {mine.comment && <p className="mt-2 text-sm text-ink/65 [overflow-wrap:anywhere]">«{mine.comment}»</p>}
        </div>
        <button className="btn btn-soft btn-sm self-start sm:self-auto" onClick={() => setEditing(true)}>Өзгерту</button>
      </section>
    );
  }

  return (
    <section className="pop mt-5 rounded-[28px] bg-card p-5 shadow-[var(--shadow-soft)] sm:p-7" aria-label="Комиксті бағала">
      <h2 className="text-lg font-extrabold sm:text-xl">Комикс ұнады ма? Кристалмен бағала</h2>
      <p className="mt-1 text-sm text-ink/55">Бағаң мен пікіріңді әкімші көреді — келесі комикстер одан да қызық болады.</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <CrystalRating value={rating} onChange={setRating} />
        <span className="min-w-24 font-extrabold text-brand">{rating ? `${rating} / 5 · ${RATING_LABELS[rating]}` : ''}</span>
      </div>
      <label className="mt-4 block">
        <span className="label">Пікірің (міндетті емес)</span>
        <textarea className="input min-h-24" value={comment} onChange={(e) => setComment(e.target.value.slice(0, 1000))} placeholder="Не ұнады? Не жетпеді?" maxLength={1000} />
      </label>
      <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        {mine && <button className="btn btn-ghost" onClick={() => { setRating(mine.rating); setComment(mine.comment); setEditing(false); }}>Бас тарту</button>}
        <button className="btn btn-primary" onClick={submit} disabled={busy || !rating}>{busy && <Spinner className="h-4 w-4 border-white/40 border-t-white" />} Бағаны жіберу</button>
      </div>
    </section>
  );
}
