import { useMemo, useRef, useState, type FormEvent } from 'react';
import { IDownload, IFile, IPlus, ISearch, ITrash, IUpload } from '../components/Icons';
import { Confirm, Empty, Modal, PageLoader, Spinner } from '../components/ui';
import { friendlyError } from '../lib/api';
import { useSession } from '../lib/auth';
import { fileIcon, fileSize, formatDate, MATERIAL_ACCEPT, MATERIAL_MAX } from '../lib/constants';
import { useToast } from '../lib/toast';
import type { Material } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { useLocation } from '../lib/router';

function UploadModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { api } = useSession();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MATERIAL_MAX) return toast.error('Файл тым үлкен (ең көбі 20 МБ)');
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 120));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error('Файлды таңдаңыз');
    if (!title.trim()) return toast.error('Атауын жазыңыз');
    setBusy(true);
    try {
      await api.saveMaterial({ title, description: desc, file });
      toast.success('Материал жарияланды', 'Енді оны тіркелген барлық оқушы көреді');
      setTitle(''); setDesc(''); setFile(null);
      onDone();
      onClose();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const fi = file ? fileIcon(file.type, file.name) : null;
  return (
    <Modal open={open} onClose={onClose} title="Материал жүктеу">
      <form onSubmit={submit} className="space-y-4">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}
          className="flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-lavender/70 bg-mist px-4 py-7 text-center transition hover:border-brand"
        >
          {fi ? (
            <>
              <span className="text-4xl">{fi.icon}</span>
              <span className="max-w-full truncate font-extrabold">{file!.name}</span>
              <span className="text-xs text-ink/50">{fi.label} · {fileSize(file!.size)} · ауыстыру үшін басыңыз</span>
            </>
          ) : (
            <>
              <IUpload className="h-8 w-8 text-brand" />
              <span className="font-extrabold">Файлды таңдаңыз</span>
              <span className="text-xs text-ink/50">PDF, Word, PowerPoint, Excel немесе сурет · ең көбі 20 МБ</span>
            </>
          )}
        </button>
        <input ref={ref} type="file" accept={MATERIAL_ACCEPT} className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
        <label className="block"><span className="label">Атауы</span><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="мысалы: Python чек-листі" /></label>
        <label className="block"><span className="label">Сипаттама (міндетті емес)</span><textarea className="input min-h-24" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={1000} placeholder="Қысқаша не туралы екенін жазыңыз" /></label>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Бас тарту</button>
          <button className="btn btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4 border-white/40 border-t-white" />} Жариялау</button>
        </div>
      </form>
    </Modal>
  );
}

export default function MaterialsPage() {
  const { api, profile } = useSession();
  const toast = useToast();
  const { data, loading, reload } = useAsync(() => api.listMaterials(), []);
  const [q, setQ] = useState('');
  const { search } = useLocation();
  const [upload, setUpload] = useState(search.get('new') === '1');
  const [del, setDel] = useState<Material | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const isAdmin = profile.role === 'admin';
  const canUpload = isAdmin;

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (data ?? [])
      .filter((m) => !n || `${m.title} ${m.description}`.toLowerCase().includes(n));
  }, [data, q]);

  if (loading && !data) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Материалдар</h1>
          <p className="mt-1 text-ink/55">{isAdmin ? 'Жүктелген материалдарды тіркелген барлық оқушы көреді' : 'Чек-листтер мен пайдалы файлдар'}</p>
        </div>
        {canUpload && <button className="btn btn-primary" onClick={() => setUpload(true)}><IPlus className="h-5 w-5" /> Материал жүктеу</button>}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <ISearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/35" />
          <input className="input !pl-12" placeholder="Материалды іздеу…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {rows.length === 0 ? (
        <Empty title="Материал жоқ" text={canUpload ? 'Бірінші чек-листті жүктеңіз — оны барлық оқушы көреді.' : 'Жаңа материал жүктелгенде осында шығады.'} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((m) => {
            const fi = fileIcon(m.mime, m.file_name);
            const canDelete = isAdmin;
            return (
              <article key={m.id} className="card card-hover flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-haze text-2xl">{fi.icon}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold leading-snug [overflow-wrap:anywhere]">{m.title}</h3>
                    <p className="mt-0.5 text-xs font-semibold text-ink/45">{fi.label} · {fileSize(m.size)} · {formatDate(m.created_at)}</p>
                  </div>
                </div>
                {m.description && <p className="mt-3 line-clamp-3 text-sm text-ink/60">{m.description}</p>}
                <div className="mt-auto flex items-center gap-2 pt-4">
                  {m.url ? (
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="btn btn-soft btn-sm flex-1">
                      <IDownload className="h-4 w-4" /> Ашу
                    </a>
                  ) : <span className="btn btn-soft btn-sm flex-1 opacity-50"><IFile className="h-4 w-4" /> Файл жоқ</span>}
                  {canDelete && (
                    <button className="icon-btn !h-10 !w-10 hover:!text-rose-500" onClick={() => setDel(m)} aria-label="Жою" title="Жою">
                      <ITrash className="h-[18px] w-[18px]" />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {canUpload && <UploadModal open={upload} onClose={() => setUpload(false)} onDone={reload} />}
      <Confirm
        open={!!del}
        onClose={() => setDel(null)}
        busy={delBusy}
        title="Материал жойылсын ба?"
        text={`«${del?.title}» платформадан біржола жойылады.`}
        onConfirm={async () => {
          setDelBusy(true);
          try { await api.deleteMaterial(del!); toast.success('Материал жойылды'); setDel(null); reload(); }
          catch (e) { toast.error(friendlyError(e)); }
          finally { setDelBusy(false); }
        }}
      />
    </div>
  );
}
