import { useMemo, useState } from 'react';
import { ITrash } from '../components/Icons';
import { Empty, PageLoader, Tabs } from '../components/ui';
import { TOPICS } from '../components/SuggestionBox';
import { friendlyError } from '../lib/api';
import { useSession } from '../lib/auth';
import { timeAgo, formatDate } from '../lib/constants';
import { useToast } from '../lib/toast';
import type { Suggestion, SuggestionTopic } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { AdminHeader } from './AdminHeader';

const TOPIC_STYLE: Record<SuggestionTopic, string> = {
  comic: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200',
  material: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200',
  platform: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
};

export default function SuggestionsPage() {
  const { api } = useSession();
  const toast = useToast();
  const { data, loading, setData } = useAsync(() => api.adminSuggestions(), []);
  const [topic, setTopic] = useState<'all' | SuggestionTopic>('all');
  const [onlyNew, setOnlyNew] = useState(false);

  const all = data ?? [];
  const unread = all.filter((s) => !s.is_read).length;
  const rows = useMemo(() => all.filter((s) => (topic === 'all' || s.topic === topic) && (!onlyNew || !s.is_read)), [data, topic, onlyNew]);

  const patch = (id: string, f: (s: Suggestion) => Suggestion | null) =>
    setData((all ?? []).map((s) => (s.id === id ? f(s) : s)).filter(Boolean) as Suggestion[]);

  const mark = async (s: Suggestion, read: boolean) => {
    try { await api.adminMarkSuggestion(s.id, read); patch(s.id, (x) => ({ ...x, is_read: read })); }
    catch (e) { toast.error(friendlyError(e)); }
  };
  const remove = async (s: Suggestion) => {
    try { await api.adminDeleteSuggestion(s.id); patch(s.id, () => null); toast.success('Ұсыныс жойылды'); }
    catch (e) { toast.error(friendlyError(e)); }
  };

  if (loading && !data) return <PageLoader />;

  return (
    <div>
      <AdminHeader title="Ұсыныстар" sub={`${all.length} ұсыныс · ${unread} жаңа · оқушылар басты беттен жібереді`} />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={topic} onChange={setTopic} items={[
          { value: 'all', label: `Барлығы (${all.length})` },
          ...TOPICS.map((t) => ({ value: t.value, label: `${t.label} (${all.filter((s) => s.topic === t.value).length})` })),
        ]} />
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="h-4 w-4 accent-[#17404E]" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} />
          Тек жаңалары
        </label>
      </div>

      {rows.length === 0 ? (
        <Empty title="Ұсыныс жоқ" text={all.length ? 'Сүзгіге сай ұсыныс табылмады.' : 'Оқушылар басты беттегі «Ұсыныс жазу» батырмасы арқылы жібереді.'} />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {rows.map((s) => (
            <article key={s.id} className={`card flex flex-col gap-3 p-5 ${s.is_read ? '' : 'ring-2 ring-sun'}`}>
              <div className="flex flex-wrap items-center gap-2">
                {!s.is_read && <span className="chip bg-sun/40 text-ink">Жаңа</span>}
                <span className={`chip ${TOPIC_STYLE[s.topic]}`}>{TOPICS.find((t) => t.value === s.topic)?.label}</span>
                {s.target_title && <span className="chip min-w-0 max-w-full truncate bg-mist text-ink/70">«{s.target_title}»</span>}
                <span className="ml-auto text-xs text-ink/40" title={formatDate(s.created_at)}>{timeAgo(s.created_at)}</span>
              </div>
              <p className="whitespace-pre-line text-[15px] leading-relaxed [overflow-wrap:anywhere]">{s.body}</p>
              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-haze pt-3">
                <p className="min-w-0 flex-1 truncate text-sm font-bold">{s.author_name || 'Оқушы'}{s.stream ? <span className="font-semibold text-ink/45"> · {s.stream} поток</span> : null}</p>
                <button className="btn btn-ghost btn-sm" onClick={() => mark(s, !s.is_read)}>{s.is_read ? 'Жаңа деп белгілеу' : '✓ Оқылды'}</button>
                <button className="icon-btn !h-9 !w-9 hover:!text-rose-500" onClick={() => remove(s)} aria-label="Ұсынысты жою" title="Жою"><ITrash className="h-4 w-4" /></button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
