// The "legacy" build ships polyfills for the brand-new JS APIs the modern build relies on
// (Map.prototype.getOrInsert, Promise.try, Math.sumPrecise...). Without them PDFs never finish
// loading on phones (iOS Safari, older Android Chrome) — only fresh desktop browsers worked.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export type PDFDoc = pdfjs.PDFDocumentProxy;

/** Free a document (pdf.js ≤5 has doc.destroy(); v6 moved it to the loading task). */
export function closePdf(doc: PDFDoc | null | undefined) {
  if (!doc) return;
  const d = doc as any;
  try {
    if (typeof d.destroy === 'function') d.destroy();
    else d.loadingTask?.destroy?.();
  } catch { /* ignore */ }
}

export function openPdf(data: ArrayBuffer): Promise<PDFDoc> {
  const task = pdfjs.getDocument({ data: new Uint8Array(data) });
  // Never leave the reader spinning forever: give up with a clear message after 60 s.
  let timer: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => { task.destroy().catch(() => {}); reject(new Error('PDF ашылмады. Бетті жаңартып, қайта көріңіз.')); }, 60000);
  });
  return Promise.race([task.promise, timeout]).finally(() => clearTimeout(timer));
}

/** Render one page into a canvas at the given CSS width (crisp on retina). */
export async function renderPage(doc: PDFDoc, pageNo: number, canvas: HTMLCanvasElement, cssWidth: number) {
  const page = await doc.getPage(pageNo);
  const base = page.getViewport({ scale: 1 });
  const scale = cssWidth / base.width;
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const viewport = page.getViewport({ scale: scale * dpr });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
  canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
  const ctx = canvas.getContext('2d')!;
  const task = page.render({ canvas, canvasContext: ctx, viewport } as any);
  return task;
}

/** Inspect an uploaded PDF: page count + a JPEG cover generated from page 1. */
export async function inspectPdf(file: File): Promise<{ pages: number; cover: Blob | null }> {
  const doc = await openPdf(await file.arrayBuffer());
  let cover: Blob | null = null;
  try {
    const canvas = document.createElement('canvas');
    const task = await renderPage(doc, 1, canvas, 600 / Math.min(window.devicePixelRatio || 1, 2.5));
    await task.promise;
    cover = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.86));
  } catch (e) {
    console.warn('cover render failed', e);
  }
  const pages = doc.numPages;
  closePdf(doc);
  return { pages, cover };
}

/** Downscale an uploaded cover image so covers stay light (max 900px wide). */
export async function shrinkImage(file: Blob, maxW = 900): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  if (bmp.width <= maxW) return file;
  const c = document.createElement('canvas');
  c.width = maxW;
  c.height = Math.round((bmp.height / bmp.width) * maxW);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob((b) => r(b ?? file), 'image/jpeg', 0.86));
}
