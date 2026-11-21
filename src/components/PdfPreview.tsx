import { useEffect, useRef, useState } from 'react';
import { closePdf, openPdf, renderPage, type PDFDoc } from '../lib/pdf';
import { IChevL, IChevR } from './Icons';
import { Spinner } from './ui';

/** Compact PDF viewer used in the admin panel to preview uploads. */
export function PdfPreview({ load }: { load: () => Promise<ArrayBuffer> }) {
  const [doc, setDoc] = useState<PDFDoc | null>(null);
  const [page, setPage] = useState(1);
  const [err, setErr] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    let d: PDFDoc | null = null;
    load().then(openPdf).then((x) => { d = x; if (alive) setDoc(x); else closePdf(x); }).catch((e) => alive && setErr(String(e?.message ?? e)));
    return () => { alive = false; closePdf(d); };
  }, []);

  useEffect(() => {
    if (!doc || !canvas.current || !box.current) return;
    const w = Math.min(box.current.clientWidth - 16, 640);
    let t: { cancel: () => void } | null = null;
    renderPage(doc, page, canvas.current, w).then((x) => (t = x));
    return () => t?.cancel();
  }, [doc, page]);

  if (err) return <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">PDF ашылмады: {err}</p>;
  return (
    <div ref={box} className="rounded-2xl bg-haze/60 p-2">
      {!doc ? <div className="grid h-80 place-items-center"><Spinner /></div> : (
        <>
          <canvas ref={canvas} className="mx-auto block rounded-xl bg-card shadow" />
          <div className="mt-2 flex items-center justify-center gap-3">
            <button className="icon-btn !h-9 !w-9" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Алдыңғы"><IChevL /></button>
            <span className="text-sm font-bold">{page} / {doc.numPages}</span>
            <button className="icon-btn !h-9 !w-9" onClick={() => setPage((p) => Math.min(doc.numPages, p + 1))} disabled={page >= doc.numPages} aria-label="Келесі"><IChevR /></button>
          </div>
        </>
      )}
    </div>
  );
}
