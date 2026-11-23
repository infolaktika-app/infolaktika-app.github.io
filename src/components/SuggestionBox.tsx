import { useState, type FormEvent } from 'react';
import { Modal, Spinner } from './ui';
import { friendlyError } from '../lib/api';
import { useSession } from '../lib/auth';
import { useToast } from '../lib/toast';
import type { SuggestionTopic } from '../lib/types';
import { useAsync } from '../lib/useAsync';

export const TOPICS: { value: SuggestionTopic; label: string; hint: string }[] = [
  { value: 'comic', label: 'Комикс', hint: 'Сюжет, кейіпкер, жаңа тақырып' },
  { value: 'material', label: 'Материал', hint: 'Чек-лист, файл, қосымша тақырып' },
  { value: 'platform', label: 'Платформа', hint: 'Сайт, ойындар, дизайн' },
];

function SuggestionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { api } = useSession();
  const toast = useToast();
  const [topic, setTopic] = useState<SuggestionTopic>('comic');
  const [target, setTarget] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const comics = useAsync(() => (open ? api.listComics() : Promise.resolve([])), [open]);
  const materials = useAsync(() => (open ? api.listMaterials() : Promise.resolve([])), [open]);
  const options = topic === 'comic' ? (comics.data ?? []).filter((c) => c.published) : topic === 'material' ? materials.data ?? [] : [];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (body.trim().length < 3) return toast.error('Ұсынысыңды жаз');
    setBusy(true);
    try {
      await api.sendSuggestion({ topic, target_id: target || null, body });
      toast.success('Ұсынысың жіберілді!', 'Рахмет — әкімші міндетті түрде оқиды');
      setBody(''); setTarget('');
      onClose();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Ұсыныс жазу">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <span className="label">Ұсыныс неге қатысты?</span>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Тақырып">
            {TOPICS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={topic === t.value}
                onClick={() => { setTopic(t.value); setTarget(''); }}
                className={`rounded-2xl px-3 py-3 text-center text-sm font-extrabold ring-2 transition ${topic === t.value ? 'bg-haze text-brand ring-brand' : 'bg-mist text-ink/70 ring-transparent hover:ring-lavender/60'}`}
              >{t.label}</button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-ink/45">{TOPICS.find((t) => t.value === topic)!.hint}</p>
        </div>
        {topic !== 'platform' && (
          <label className="block">
            <span className="label">{topic === 'comic' ? 'Қай комикс?' : 'Қай материал?'} (міндетті емес)</span>
            <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">{topic === 'comic' ? 'Жалпы комикстер туралы' : 'Жалпы материалдар туралы'}</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </label>
        )}
        <label className="block">
          <span className="label">Ұсынысың</span>
          <textarea className="input min-h-32" value={body} onChange={(e) => setBody(e.target.value.slice(0, 2000))} placeholder="Мысалы: роботтар туралы комикс қосыңыздаршы…" maxLength={2000} />
          <span className="mt-1 block text-right text-xs text-ink/40">{body.length} / 2000</span>
        </label>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Бас тарту</button>
          <button className="btn btn-primary" disabled={busy || body.trim().length < 3}>{busy && <Spinner className="h-4 w-4 border-white/40 border-t-white" />} Жіберу</button>
        </div>
      </form>
    </Modal>
  );
}

/** Card on the student home page that opens the suggestion form. */
export function SuggestionBox() {
  const [open, setOpen] = useState(false);
  return (
    <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6" aria-label="Ұсыныстар">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sun/30" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand">
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /><path d="M8.5 11h7M8.5 14.5h4" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-extrabold">Ұсынысың бар ма?</h2>
        <p className="text-sm text-ink/55">Комикстер, материалдар немесе платформа туралы ойыңды авторға жаз.</p>
      </div>
      <button className="btn btn-primary self-start sm:self-auto" onClick={() => setOpen(true)}>Ұсыныс жазу</button>
      <SuggestionModal open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
