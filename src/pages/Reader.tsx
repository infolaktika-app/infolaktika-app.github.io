import { useCallback, useEffect, useRef, useState } from 'react';
import { Robot } from '../components/Art';
import { IChevL, IChevR, IExpand, IShrink, IZoomIn, IZoomOut } from '../components/Icons';
import { CategoryChip, Empty, ProgressBar, Spinner } from '../components/ui';
import { ComicReviewBox } from '../components/ComicReview';
import { friendlyError } from '../lib/api';
import { useSession } from '../lib/auth';
import { closePdf, openPdf, renderPage, type PDFDoc } from '../lib/pdf';
import { Link, navigate } from '../lib/router';
import { useToast } from '../lib/toast';
import type { Book, Comic } from '../lib/types';

const ZOOMS = [0.5, 0.67, 0.8, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2, 2.5, 3];

export default function Reader({ kind, id }: { kind: 'comic' | 'book'; id: string }) {
  const { api, refresh } = useSession();
  const toast = useToast();
  const [item, setItem] = useState<Comic | Book | null>(null);
  const [doc, setDoc] = useState<PDFDoc | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rendering, setRendering] = useState(false);
  const [fs, setFs] = useState(false);
  const [done, setDone] = useState(false);
  const [width, setWidth] = useState(800);
  const [pageInput, setPageInput] = useState('1');

  const stage = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const task = useRef<{ cancel: () => void } | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const lsKey = `infolaktika-page:${kind}:${id}`;

  // ---- load item, progress and the PDF itself ----
  useEffect(() => {
    let alive = true;
    let loaded: PDFDoc | null = null;
    (async () => {
      try {
        const [it, progress] = await Promise.all([kind === 'comic' ? api.getComic(id) : api.getBook(id), api.listProgress()]);
        if (!alive) return;
        if (!it) { setErr('notfound'); return; }
        setItem(it);
        const p = progress.find((x) => x.item_type === kind && x.item_id === id);
        setDone(!!p?.completed);
        const d = await openPdf(await api.loadPdf(it.pdf_path));
        if (!alive) { closePdf(d); return; }
        loaded = d;
        const local = Number(localStorage.getItem(lsKey) || 0);
        const start = Math.min(d.numPages, Math.max(1, p?.last_page ?? local ?? 1));
        setDoc(d);
        setPage(p?.completed && start >= d.numPages ? 1 : start);
      } catch (e) {
        console.error(e);
        if (alive) setErr(friendlyError(e));
      }
    })();
    return () => { alive = false; closePdf(loaded); };
  }, [kind, id]);

  // ---- track available width ----
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [doc]);

  // ---- render current page ----
  useEffect(() => {
    if (!doc || !canvas.current) return;
    let cancelled = false;
    setRendering(true);
    task.current?.cancel();
    (async () => {
      const pg = await doc.getPage(page);
      const vp = pg.getViewport({ scale: 1 });
      // Fit the page into the stage (width, and height in fullscreen), then apply zoom.
      const availW = Math.max(240, width - 16);
      const availH = fs ? window.innerHeight - 120 : Math.max(520, window.innerHeight - 190);
      const fit = Math.min(availW / vp.width, availH / vp.height);
      const cssW = Math.floor(vp.width * fit * zoom);
      if (cancelled) return;
      const t = await renderPage(doc, page, canvas.current!, cssW);
      task.current = t;
      await t.promise.catch(() => {});
      if (!cancelled) setRendering(false);
    })();
    setPageInput(String(page));
    return () => { cancelled = true; };
  }, [doc, page, zoom, width, fs]);

  // ---- save progress (debounced) ----
  const persist = useCallback((p: number, total: number) => {
    localStorage.setItem(lsKey, String(p));
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        const r = await api.saveProgress(kind, id, p, total);
        if (r.completed_now) {
          setDone(true);
          toast.reward(r, kind === 'comic' ? 'Комикс оқылды! 🦸' : 'Кітап оқылды! 📚');
          refresh();
        } else if (r.bonus || r.achievements.length) {
          toast.reward(r);
          refresh();
        }
      } catch (e) {
        console.warn('progress save failed', e);
      }
    }, p >= total ? 200 : 700);
  }, [api, kind, id]);

  useEffect(() => {
    if (doc) persist(page, doc.numPages);
  }, [page, doc]);
  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  const total = doc?.numPages ?? item?.pages ?? 1;
  const go = useCallback((p: number) => setPage((cur) => Math.min(total, Math.max(1, Number.isFinite(p) ? p : cur))), [total]);
  const zoomBy = (dir: 1 | -1) => setZoom((z) => {
    const i = ZOOMS.findIndex((x) => x >= z - 0.001);
    return ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, i + dir))];
  });

  // ---- fullscreen ----
  const toggleFs = async () => {
    try {
      if (!document.fullscreenElement) await shell.current?.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      setFs((x) => !x); // iOS Safari: fall back to a CSS "fullscreen"
    }
  };
  useEffect(() => {
    const on = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  // ---- keyboard + swipe ----
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); go(page + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(page - 1); }
      if (e.key === '+' || e.key === '=') zoomBy(1);
      if (e.key === '-') zoomBy(-1);
      if (e.key === 'f') toggleFs();
      if (e.key === 'Escape' && fs && !document.fullscreenElement) setFs(false);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [page, go, fs]);

  const touch = useRef<{ x: number; y: number } | null>(null);

  if (err === 'notfound') return <Empty title="Материал табылмады" text="Ол жойылған немесе әлі жарияланбаған болуы мүмкін." action={<Link to={kind === 'comic' ? '/app/comics' : '/app/books'} className="btn btn-primary">Тізімге қайту</Link>} />;
  if (err) return <Empty title="PDF ашылмады" text={err} action={<button className="btn btn-primary" onClick={() => location.reload()}>Қайталау</button>} />;

  const pct = Math.round((page / total) * 100);

  return (
    <div
      ref={shell}
      className={`flex flex-col ${fs ? 'fixed inset-0 z-[80] bg-[#0B1D24]' : 'min-h-[calc(100vh-6rem)]'}`}
    >
      {/* toolbar */}
      <div className={`sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-[24px] p-2.5 sm:gap-3 ${fs ? 'm-3 bg-white/10 text-white backdrop-blur' : 'mb-4 bg-card shadow-[var(--shadow-soft)] lg:top-4'}`}>
        <button className={`icon-btn ${fs ? '!bg-white/10 !text-white !shadow-none' : ''}`} onClick={() => (fs ? toggleFs() : navigate(kind === 'comic' ? '/app/comics' : '/app/books'))} aria-label="Артқа">
          <IChevL />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold leading-tight">{item?.title ?? 'Жүктелуде…'}</p>
          <div className="flex items-center gap-2">
            {item && !fs && <span className="hidden sm:inline"><CategoryChip slug={item.category} small /></span>}
            {done && <span className={`text-xs font-bold ${fs ? 'text-emerald-300' : 'text-emerald-600'}`}>✓ Оқылды</span>}
          </div>
        </div>

        <div className="order-last flex w-full items-center justify-center gap-1.5 sm:order-none sm:w-auto">
          <button className={`icon-btn !h-10 !w-10 ${fs ? '!bg-white/10 !text-white !shadow-none' : ''}`} onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Алдыңғы бет"><IChevL /></button>
          <form onSubmit={(e) => { e.preventDefault(); go(parseInt(pageInput, 10)); }} className="flex items-center gap-1.5 text-sm font-bold">
            <input
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ''))}
              onBlur={() => go(parseInt(pageInput, 10))}
              className={`h-10 w-12 rounded-xl text-center outline-none ${fs ? 'bg-white/10' : 'bg-mist focus:ring-2 focus:ring-lavender'}`}
              aria-label="Бет нөмірі"
              inputMode="numeric"
            />
            <span className="opacity-60">/ {total}</span>
          </form>
          <button className={`icon-btn !h-10 !w-10 ${fs ? '!bg-white/10 !text-white !shadow-none' : ''}`} onClick={() => go(page + 1)} disabled={page >= total} aria-label="Келесі бет"><IChevR /></button>
        </div>

        <div className="flex items-center gap-1.5">
          <button className={`icon-btn !h-10 !w-10 ${fs ? '!bg-white/10 !text-white !shadow-none' : ''}`} onClick={() => zoomBy(-1)} disabled={zoom <= ZOOMS[0]} aria-label="Кішірейту"><IZoomOut /></button>
          <button className="hidden w-14 text-center text-sm font-bold sm:block" onClick={() => setZoom(1)} title="Бетке сыйдыру">{Math.round(zoom * 100)}%</button>
          <button className={`icon-btn !h-10 !w-10 ${fs ? '!bg-white/10 !text-white !shadow-none' : ''}`} onClick={() => zoomBy(1)} disabled={zoom >= ZOOMS[ZOOMS.length - 1]} aria-label="Үлкейту"><IZoomIn /></button>
          <button className={`icon-btn !h-10 !w-10 ${fs ? '!bg-white/10 !text-white !shadow-none' : ''}`} onClick={toggleFs} aria-label={fs ? 'Толық экраннан шығу' : 'Толық экран'}>{fs ? <IShrink /> : <IExpand />}</button>
        </div>
      </div>

      {/* reading progress */}
      <div className={fs ? 'mx-3' : 'mb-4'}>
        <ProgressBar value={pct} className={`!h-1.5 ${fs ? '!bg-white/10' : ''}`} />
      </div>

      {/* page stage */}
      <div
        ref={stage}
        className={`relative flex flex-1 items-start overflow-auto rounded-[28px] p-2 sm:p-4 ${fs ? '' : 'bg-gradient-to-b from-haze/70 to-mist'} ${zoom > 1 ? 'justify-start' : 'justify-center'}`}
        onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        onTouchEnd={(e) => {
          if (!touch.current || zoom > 1) return;
          const dx = e.changedTouches[0].clientX - touch.current.x;
          const dy = e.changedTouches[0].clientY - touch.current.y;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(page + (dx < 0 ? 1 : -1));
          touch.current = null;
        }}
      >
        {!doc && (
          <div className="grid w-full place-items-center py-24 text-ink/50">
            <Robot className="h-28 w-28 float" wave={false} />
            <p className="mt-3 flex items-center gap-2 font-semibold"><Spinner className="h-5 w-5" /> PDF ашылуда…</p>
          </div>
        )}
        <div className={`relative mx-auto ${doc ? '' : 'hidden'}`}>
          <canvas
            ref={canvas}
            key={page}
            className="fade-up block rounded-2xl bg-card shadow-[0_24px_50px_-20px_rgba(var(--shade),.45)]"
            style={{ animationDuration: '.35s' }}
          />
          {rendering && <div className="absolute right-3 top-3"><Spinner className="h-5 w-5" /></div>}
          {/* click zones for quick paging */}
          {zoom <= 1 && (
            <>
              <button className="absolute inset-y-0 left-0 w-1/5 cursor-w-resize" onClick={() => go(page - 1)} aria-label="Алдыңғы бет" tabIndex={-1} />
              <button className="absolute inset-y-0 right-0 w-1/5 cursor-e-resize" onClick={() => go(page + 1)} aria-label="Келесі бет" tabIndex={-1} />
            </>
          )}
        </div>
      </div>

      {doc && page === total && !fs && (
        <div className="pop mt-5 flex flex-col items-center gap-3 rounded-[28px] bg-card p-6 text-center shadow-[var(--shadow-soft)] sm:flex-row sm:text-left">
          <span className="text-4xl">🎉</span>
          <div className="flex-1">
            <p className="text-lg font-extrabold">Соңына дейін оқыдың!</p>
            <p className="text-sm text-ink/55">Прогресің профиліңе сақталды. Енді білімді ойында тексеріп көр.</p>
          </div>
          <Link to="/app/games" className="btn btn-primary">Ойынға өту</Link>
        </div>
      )}
      {kind === 'comic' && done && !fs && doc && <ComicReviewBox comicId={id} />}
    </div>
  );
}
