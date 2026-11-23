import { useEffect, useState } from 'react';
import { CrystalRating, RATING_LABELS } from '../components/ComicReview';
import { ITrash } from '../components/Icons';
import { Avatar, Modal, Spinner } from '../components/ui';
import { friendlyError } from '../lib/api';
import { useSession } from '../lib/auth';
import { formatDate } from '../lib/constants';
import { useToast } from '../lib/toast';
import type { Comic, ComicReviewRow } from '../lib/types';

/** Admin: every rating and comment students left on one comic. */
export function ComicReviewsModal({ comic, onClose, onChanged }: { comic: Comic | null; onClose: () => void; onChanged: () => void }) {
  const { api } = useSession();
  const toast = useToast();
  const [rows, setRows] = useState<ComicReviewRow[] | null>(null);
  const [onlyComments, setOnlyComments] = useState(false);

  useEffect(() => {
    setRows(null);
    if (comic) api.adminComicReviews(comic.id).then(setRows).catch((e) => { toast.error(friendlyError(e)); setRows([]); });
  }, [comic?.id]);

  const remove = async (r: ComicReviewRow) => {
    try {
      await api.adminDeleteComicReview(comic!.id, r.user_id);
      setRows((x) => (x ?? []).filter((y) => y.user_id !== r.user_id));
      onChanged();
      toast.success('Пікір жойылды');
    } catch (e) { toast.error(friendlyError(e)); }
  };

  const list = (rows ?? []).filter((r) => !onlyComments || r.comment);
  const avg = rows?.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : 0;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: (rows ?? []).filter((r) => r.rating === n).length }));

  return (
    <Modal open={!!comic} onClose={onClose} title={`«${comic?.title ?? ''}» — бағалар`} wide>
      {!rows ? (
        <div className="grid place-items-center py-16"><Spinner className="h-7 w-7" /></div>
      ) : rows.length === 0 ? (
        <p className="py-12 text-center text-ink/50">Бұл комиксті әлі ешкім бағаламаған.</p>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 rounded-3xl bg-mist p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8">
            <div>
              <p className="text-4xl font-extrabold">{avg.toFixed(1)}<span className="text-lg text-ink/40"> / 5</span></p>
              <CrystalRating value={avg} size={24} />
              <p className="mt-1 text-sm text-ink/50">{rows.length} баға</p>
            </div>
            <div className="space-y-1.5">
              {dist.map((d) => (
                <div key={d.n} className="flex items-center gap-2 text-sm">
                  <span className="w-4 font-bold">{d.n}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-card">
                    <div className="h-full rounded-full bg-[#5FD0E0]" style={{ width: `${(d.c / rows.length) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right text-ink/50">{d.c}</span>
                </div>
              ))}
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <input type="checkbox" className="h-4 w-4 accent-[#17404E]" checked={onlyComments} onChange={(e) => setOnlyComments(e.target.checked)} />
            Тек пікір жазғандар
          </label>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto overscroll-contain pr-1">
            {list.map((r) => (
              <div key={r.user_id} className="flex gap-3 rounded-2xl border border-haze p-3.5">
                <Avatar id={r.avatar} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="font-extrabold">{r.first_name} {r.last_name}</p>
                    {r.stream && <span className="chip bg-haze !py-0.5 text-[11px] text-brand">{r.stream} поток</span>}
                    <span className="text-xs text-ink/40">{formatDate(r.updated_at)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2"><CrystalRating value={r.rating} size={18} /><span className="text-sm font-bold text-ink/60">{RATING_LABELS[r.rating]}</span></div>
                  {r.comment && <p className="mt-1.5 text-sm text-ink/75 [overflow-wrap:anywhere]">{r.comment}</p>}
                </div>
                <button className="icon-btn !h-9 !w-9 shrink-0 hover:!text-rose-500" onClick={() => remove(r)} aria-label="Пікірді жою" title="Пікірді жою"><ITrash className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
