import { useMemo, useState } from 'react';
import { Books, Crystal, Robot } from '../components/Art';
import { ContentCard } from '../components/Cards';
import { ISearch, IX } from '../components/Icons';
import { Empty, SkeletonGrid, Tabs } from '../components/ui';
import { useSession } from '../lib/auth';
import { CATEGORIES } from '../lib/constants';
import type { Book, Comic, ReadingProgress } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { navigate } from '../lib/router';

type Sort = 'new' | 'old' | 'az' | 'pages';
type Status = 'all' | 'progress' | 'done' | 'unread';

export default function Library({ kind }: { kind: 'comic' | 'book' }) {
  const { api } = useSession();
  const isComic = kind === 'comic';
  const { data, loading, error, reload } = useAsync(async () => {
    const [items, progress] = await Promise.all([isComic ? api.listComics() : api.listBooks(), api.listProgress()]);
    return { items: items as (Comic | Book)[], progress };
  }, [kind]);

  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [sort, setSort] = useState<Sort>('new');
  const [status, setStatus] = useState<Status>('all');

  const prog = useMemo(() => {
    const m = new Map<string, ReadingProgress>();
    data?.progress.filter((p) => p.item_type === kind).forEach((p) => m.set(p.item_id, p));
    return m;
  }, [data, kind]);

  const cats = useMemo(() => {
    const used = new Set(data?.items.map((i) => i.category));
    return CATEGORIES.filter((c) => used.has(c.slug));
  }, [data]);

  const list = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    let r = data.items.filter((i) =>
      (cat === 'all' || i.category === cat) &&
      (!needle || i.title.toLowerCase().includes(needle) || i.description.toLowerCase().includes(needle) || ('author' in i && i.author.toLowerCase().includes(needle))));
    r = r.filter((i) => {
      const p = prog.get(i.id);
      if (status === 'progress') return p && !p.completed;
      if (status === 'done') return p?.completed;
      if (status === 'unread') return !p;
      return true;
    });
    const cmp: Record<Sort, (a: Comic, b: Comic) => number> = {
      new: (a, b) => b.created_at.localeCompare(a.created_at),
      old: (a, b) => a.created_at.localeCompare(b.created_at),
      az: (a, b) => a.title.localeCompare(b.title, 'kk'),
      pages: (a, b) => (a.pages ?? 0) - (b.pages ?? 0),
    };
    return [...r].sort(cmp[sort]);
  }, [data, q, cat, sort, status, prog]);

  const recent = useMemo(() => (data ? [...data.items].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3) : []), [data]);
  const filtering = q || cat !== 'all' || status !== 'all';

  return (
    <div className="space-y-7">
      <header className="relative overflow-hidden rounded-[32px] bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <div className="dot-grid absolute inset-y-0 right-0 w-1/2 opacity-50 [mask-image:linear-gradient(to_left,black,transparent)]" />
        <div className="relative flex items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{isComic ? 'Комикстер' : 'Кітапхана'}</h1>
            <p className="mt-2 max-w-lg text-ink/55">
              {isComic ? 'Суретті оқиғалар арқылы информатиканың қызық әлемін аш. Әр оқылған комикс үшін XP аласың!' : 'Оқулықтар мен анықтамалықтар — тікелей сайтта оқы, прогресің сақталады.'}
            </p>
            {data && <p className="mt-3 text-sm font-bold text-brand">{data.items.length} {isComic ? 'комикс' : 'кітап'} · {[...prog.values()].filter((p) => p.completed).length} оқылды</p>}
          </div>
          <div className="relative hidden h-32 w-44 shrink-0 sm:block">
            {isComic ? <Robot className="float absolute right-0 h-32" /> : <Books className="float absolute right-0 h-32" />}
            <Crystal className="float-slow absolute left-4 top-0 w-8 drop-shadow-[0_0_14px_rgba(95,208,224,.7)]" />
          </div>
        </div>
      </header>

      {!isComic && !filtering && recent.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-extrabold">Жаңадан қосылғандар</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {recent.map((b) => (
              <button key={b.id} onClick={() => navigate(`/app/books/${b.id}`)} className="card card-hover flex items-center gap-4 p-3 text-left">
                <img src={api.coverSrc(b.cover_url) ?? ''} alt="" className="h-20 w-16 shrink-0 rounded-xl bg-haze object-cover" />
                <span className="min-w-0">
                  <span className="line-clamp-2 font-bold leading-snug">{b.title}</span>
                  <span className="block truncate text-xs text-ink/45">{'author' in b ? b.author : ''}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="relative flex-1">
            <ISearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/35" />
            <input className="input !pl-12" placeholder={isComic ? 'Комикс атауы бойынша іздеу…' : 'Кітап атауы немесе автор бойынша іздеу…'} value={q} onChange={(e) => setQ(e.target.value)} />
            {q && <button className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-ink/40 hover:text-ink" onClick={() => setQ('')} aria-label="Тазалау"><IX className="h-4 w-4" /></button>}
          </label>
          <select className="input md:w-56" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Сұрыптау">
            <option value="new">Алдымен жаңалары</option>
            <option value="old">Алдымен ескілері</option>
            <option value="az">Атауы бойынша (А–Я)</option>
            <option value="pages">Бет саны бойынша</option>
          </select>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={cat} onChange={setCat} items={[{ value: 'all', label: 'Барлығы' }, ...cats.map((c) => ({ value: c.slug, label: `${c.icon} ${c.label}` }))]} />
          <Tabs<Status> value={status} onChange={setStatus} items={[
            { value: 'all', label: 'Бәрі' }, { value: 'progress', label: 'Оқып жүрмін' }, { value: 'done', label: 'Оқылды' }, { value: 'unread', label: 'Оқылмаған' },
          ]} />
        </div>
      </section>

      {loading ? (
        <SkeletonGrid n={8} h="h-96" />
      ) : error ? (
        <Empty title="Жүктеу мүмкін болмады" text="Интернет байланысын тексеріп, қайталап көр." action={<button className="btn btn-primary" onClick={reload}>Қайталау</button>} />
      ) : list.length === 0 ? (
        data!.items.length === 0
          ? <Empty title={isComic ? 'Комикстер әлі жоқ' : 'Кітаптар әлі жоқ'} text="Мұғалім жүктеген материалдар осында автоматты түрде пайда болады." />
          : <Empty title="Ештеңе табылмады" text="Іздеу сөзін немесе сүзгіні өзгертіп көр." action={<button className="btn btn-soft" onClick={() => { setQ(''); setCat('all'); setStatus('all'); }}>Сүзгіні тазалау</button>} />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 stagger">
          {list.map((i) => <ContentCard key={i.id} item={i} kind={kind} api={api} progress={prog.get(i.id)} />)}
        </div>
      )}
    </div>
  );
}
