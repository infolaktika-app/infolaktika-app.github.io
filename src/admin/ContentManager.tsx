import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { IEdit, IEye, IPlus, ISearch, ITrash, IUpload } from '../components/Icons';
import { PdfPreview } from '../components/PdfPreview';
import { CategoryChip, Confirm, Cover, Empty, Modal, PageLoader, Spinner } from '../components/ui';
import { friendlyError } from '../lib/api';
import { useSession } from '../lib/auth';
import { CATEGORIES, formatDate } from '../lib/constants';
import { inspectPdf, shrinkImage } from '../lib/pdf';
import { navigate, useLocation } from '../lib/router';
import { useToast } from '../lib/toast';
import type { Book, Comic } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { AdminHeader } from './AdminHeader';

type Item = Comic & { author?: string };

export default function ContentManager({ kind }: { kind: 'comic' | 'book' }) {
  const { api } = useSession();
  const toast = useToast();
  const { search, path } = useLocation();
  const isComic = kind === 'comic';
  const { data, loading, reload } = useAsync(async () => {
    const [items, stats] = await Promise.all([isComic ? api.listComics() : api.listBooks(), api.adminStats()]);
    return { items: items as Item[], stats };
  }, [kind]);
  const [editing, setEditing] = useState<Item | 'new' | null>(null);
  const [preview, setPreview] = useState<Item | null>(null);
  const [del, setDel] = useState<Item | null>(null);
  const [busyDel, setBusyDel] = useState(false);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');

  useEffect(() => {
    if (search.get('new')) { setEditing('new'); navigate(path, { replace: true }); }
  }, [search]);

  const readers = useMemo(() => {
    const m: Record<string, number> = {};
    data?.stats.popular_comics.forEach((c) => (m[c.title] = c.readers));
    data?.stats.popular_books.forEach((c) => (m[c.title] = c.readers));
    return m;
  }, [data]);

  const list = (data?.items ?? []).filter((i) => (cat === 'all' || i.category === cat) && (!q || i.title.toLowerCase().includes(q.toLowerCase())));

  const togglePublish = async (it: Item) => {
    try {
      await (isComic ? api.saveComic : api.saveBook)({ id: it.id, title: it.title, description: it.description, category: it.category, author: it.author, pages: it.pages, published: !it.published });
      toast.success(it.published ? 'Жариялаудан алынды' : 'Жарияланды! Оқушылар енді көреді');
      reload();
    } catch (e) { toast.error(friendlyError(e)); }
  };

  const doDelete = async () => {
    if (!del) return;
    setBusyDel(true);
    try {
      await (isComic ? api.deleteComic(del) : api.deleteBook(del as Book));
      toast.success('Жойылды');
      setDel(null);
      reload();
    } catch (e) { toast.error(friendlyError(e)); } finally { setBusyDel(false); }
  };

  if (loading) return <PageLoader />;
  return (
    <div>
      <AdminHeader
        title={isComic ? 'Комикстерді басқару' : 'Кітаптарды басқару'}
        sub={`${data?.items.length ?? 0} ${isComic ? 'комикс' : 'кітап'} · жарияланғандары оқушыларға бірден көрінеді`}
        action={<button className="btn btn-primary" onClick={() => setEditing('new')}><IPlus /> {isComic ? 'Жаңа комикс' : 'Жаңа кітап'}</button>}
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <ISearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/35" />
          <input className="input !pl-12" placeholder="Атауы бойынша іздеу…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className="input sm:w-72" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">Барлық санаттар</option>
          {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.icon} {c.label}</option>)}
        </select>
      </div>

      {list.length === 0 ? (
        <Empty title={data?.items.length ? 'Ештеңе табылмады' : `Әлі ${isComic ? 'комикс' : 'кітап'} жоқ`} text="PDF файлын жүктеп, бірінші материалды жариялаңыз." action={<button className="btn btn-primary" onClick={() => setEditing('new')}><IUpload /> PDF жүктеу</button>} />
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[64px_1fr_190px_80px_90px_120px_150px] items-center gap-4 border-b border-haze px-5 py-3 text-xs font-bold uppercase tracking-wide text-ink/40 lg:grid">
            <span /><span>Атауы</span><span>Санат</span><span>Бет</span><span>Оқырман</span><span>Күйі</span><span className="text-right">Әрекеттер</span>
          </div>
          {list.map((it) => (
            <div key={it.id} className="grid grid-cols-[56px_1fr_auto] items-center gap-4 border-b border-haze px-4 py-3 last:border-0 lg:grid-cols-[64px_1fr_190px_80px_90px_120px_150px] lg:px-5">
              <Cover src={api.coverSrc(it.cover_url)} title={it.title} category={it.category} className="aspect-[3/4] w-14 rounded-xl lg:w-16" />
              <div className="min-w-0">
                <p className="truncate font-extrabold">{it.title}</p>
                <p className="truncate text-sm text-ink/50">{it.author ? `${it.author} · ` : ''}{formatDate(it.created_at)}</p>
                <div className="mt-1 lg:hidden"><CategoryChip slug={it.category} small /></div>
              </div>
              <span className="hidden lg:block"><CategoryChip slug={it.category} small /></span>
              <span className="hidden text-sm font-bold lg:block">{it.pages ?? '—'}</span>
              <span className="hidden text-sm font-bold lg:block">{readers[it.title] ?? 0}</span>
              <button onClick={() => togglePublish(it)} className={`hidden justify-self-start rounded-full px-3 py-1 text-xs font-bold transition lg:block ${it.published ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-haze text-ink/55 hover:bg-lavender/30'}`} title="Күйін ауыстыру">
                {it.published ? '● Жарияланды' : '○ Жоба'}
              </button>
              <div className="flex justify-end gap-1.5">
                <button className="icon-btn !h-9 !w-9" title="Алдын ала қарау" aria-label="Алдын ала қарау" onClick={() => setPreview(it)}><IEye className="h-4 w-4" /></button>
                <button className="icon-btn !h-9 !w-9" title="Өңдеу" aria-label="Өңдеу" onClick={() => setEditing(it)}><IEdit className="h-4 w-4" /></button>
                <button className="icon-btn !h-9 !w-9 hover:!text-rose-500" title="Жою" aria-label="Жою" onClick={() => setDel(it)}><ITrash className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <ContentForm kind={kind} item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.title ?? ''} wide>
        {preview && <PdfPreview load={() => api.loadPdf(preview.pdf_path)} />}
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={doDelete} busy={busyDel}
        title={`«${del?.title}» жойылсын ба?`} text="PDF файлы мен оқушылардың оқу прогресі де жойылады. Бұл әрекетті қайтару мүмкін емес." />
    </div>
  );
}

function ContentForm({ kind, item, onClose, onSaved }: { kind: 'comic' | 'book'; item: Item | null; onClose: () => void; onSaved: () => void }) {
  const { api } = useSession();
  const toast = useToast();
  const isComic = kind === 'comic';
  const [f, setF] = useState({
    title: item?.title ?? '', description: item?.description ?? '', category: item?.category ?? CATEGORIES[0].slug,
    author: item?.author ?? '', published: item?.published ?? true,
  });
  const [pdf, setPdf] = useState<File | null>(null);
  const [pages, setPages] = useState<number | null>(item?.pages ?? null);
  const [autoCover, setAutoCover] = useState<Blob | null>(null);
  const [cover, setCover] = useState<Blob | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const pdfInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const coverUrl = useMemo(() => {
    const b = cover ?? autoCover;
    return b ? URL.createObjectURL(b) : api.coverSrc(item?.cover_url ?? null);
  }, [cover, autoCover]);
  useEffect(() => () => { if (coverUrl?.startsWith('blob:')) URL.revokeObjectURL(coverUrl); }, [coverUrl]);

  const pickPdf = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return toast.error('Тек PDF файлын жүктеуге болады');
    if (file.size > 50 * 1024 * 1024) return toast.error('Файл тым үлкен (50 МБ-тан аспауы керек)');
    setPdf(file);
    setInspecting(true);
    try {
      const info = await inspectPdf(file);
      setPages(info.pages);
      setAutoCover(info.cover);
      if (!f.title) setF((x) => ({ ...x, title: file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ') }));
    } catch (e) {
      toast.error('PDF оқылмады', friendlyError(e));
      setPdf(null);
    } finally { setInspecting(false); }
  };

  const pickCover = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Мұқаба сурет болуы керек (PNG, JPG, WEBP)');
    setCover(await shrinkImage(file));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.title.trim()) return toast.error('Атауын жазыңыз');
    if (!item && !pdf) return toast.error('PDF файлын таңдаңыз');
    setBusy(true);
    try {
      const input = {
        id: item?.id, title: f.title, description: f.description, category: f.category, author: f.author, published: f.published,
        pages, pdfFile: pdf, coverFile: cover ?? (pdf || !item?.cover_url ? autoCover : null),
      };
      await (isComic ? api.saveComic(input) : api.saveBook(input));
      toast.success(item ? 'Өзгерістер сақталды' : f.published ? 'Жарияланды! 🎉' : 'Жоба ретінде сақталды', f.published ? 'Оқушылар бөлімінде бірден көрінеді.' : undefined);
      onSaved();
    } catch (e) {
      toast.error('Сақталмады', friendlyError(e));
    } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={busy ? () => {} : onClose} title={item ? 'Өңдеу' : isComic ? 'Жаңа комикс жүктеу' : 'Жаңа кітап жүктеу'} wide>
      <form onSubmit={submit} className="grid gap-6 md:grid-cols-[200px_1fr]">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl bg-haze">
            <Cover src={coverUrl} title={f.title || 'Мұқаба'} category={f.category} className="aspect-[3/4] w-full" />
          </div>
          <button type="button" className="btn btn-soft btn-sm w-full" onClick={() => coverInput.current?.click()}><IUpload className="h-4 w-4" /> Мұқаба жүктеу</button>
          <input ref={coverInput} type="file" accept="image/*" hidden onChange={(e) => pickCover(e.target.files?.[0])} />
          <p className="text-center text-xs text-ink/45">{cover ? 'Өз мұқабаңыз' : autoCover ? 'PDF-тің 1-бетінен автоматты' : 'Міндетті емес'}</p>
        </div>

        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); pickPdf(e.dataTransfer.files[0]); }}
            onClick={() => pdfInput.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition ${drag ? 'border-violet bg-haze' : 'border-lavender/60 hover:border-violet hover:bg-mist'}`}
          >
            <input ref={pdfInput} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => pickPdf(e.target.files?.[0])} />
            {inspecting ? <p className="flex items-center justify-center gap-2 font-semibold"><Spinner className="h-5 w-5" /> PDF талдануда…</p> : pdf ? (
              <p className="font-bold text-brand">📄 {pdf.name} <span className="font-semibold text-ink/50">· {(pdf.size / 1048576).toFixed(1)} МБ · {pages} бет</span></p>
            ) : (
              <>
                <IUpload className="mx-auto h-7 w-7 text-violet" />
                <p className="mt-2 font-bold">{item ? 'Жаңа PDF жүктеу (міндетті емес)' : 'PDF файлын осында сүйреңіз немесе басыңыз'}</p>
                <p className="text-xs text-ink/45">Бет саны мен мұқаба автоматты анықталады · 50 МБ-қа дейін</p>
              </>
            )}
          </div>
          {(pdf || item) && (
            <button type="button" className="text-sm font-bold text-brand hover:underline" onClick={() => setShowPreview((s) => !s)}>{showPreview ? 'Алдын ала қарауды жабу' : '👁 PDF-ті алдын ала қарау'}</button>
          )}
          {showPreview && <PdfPreview key={pdf?.name ?? item?.pdf_path} load={() => (pdf ? pdf.arrayBuffer() : api.loadPdf(item!.pdf_path))} />}

          <label className="block"><span className="label">Атауы *</span><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required maxLength={140} /></label>
          {!isComic && <label className="block"><span className="label">Автор</span><input className="input" value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} maxLength={100} /></label>}
          <label className="block"><span className="label">Қысқаша сипаттама</span><textarea className="input min-h-24" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={500} /></label>
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <label className="block"><span className="label">Санат / тақырып</span>
              <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.icon} {c.label}</option>)}
              </select>
            </label>
            <label className="block"><span className="label">Бет саны</span><input className="input" type="number" min={1} value={pages ?? ''} onChange={(e) => setPages(e.target.value ? Number(e.target.value) : null)} /></label>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-mist p-3">
            <input type="checkbox" className="h-5 w-5 accent-[#17404E]" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} />
            <span><span className="block font-bold">Оқушыларға жариялау</span><span className="text-xs text-ink/50">Өшірулі болса — жоба ретінде сақталады, оқушылар көрмейді</span></span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Бас тарту</button>
            <button className="btn btn-primary" disabled={busy || inspecting}>{busy && <Spinner className="h-4 w-4 border-white/40 border-t-white" />} {busy ? 'Жүктелуде…' : item ? 'Сақтау' : f.published ? 'Publish — Жариялау' : 'Сақтау'}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
