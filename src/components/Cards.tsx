import type { Api } from '../lib/api';
import { categoryOf, DIFFICULTY, GAME_TYPES } from '../lib/constants';
import { navigate } from '../lib/router';
import type { Book, Comic, Game, ReadingProgress } from '../lib/types';
import { Books, CodeBadge, Cube, Gamepad, Laptop, Planet, Robot, Star3D, Trophy } from './Art';
import { CategoryChip, Cover, PressCard, ProgressBar } from './ui';

export function ContentCard({ item, kind, api, progress }: { item: Comic | Book; kind: 'comic' | 'book'; api: Api; progress?: ReadingProgress }) {
  const pct = progress ? Math.round((progress.last_page / Math.max(progress.total_pages, 1)) * 100) : 0;
  const isNew = Date.now() - new Date(item.created_at).getTime() < 7 * 86400000;
  return (
    <PressCard label={`${item.title} — оқу`} onClick={() => navigate(`/app/${kind === 'comic' ? 'comics' : 'books'}/${item.id}`)}>
      <div className="flex h-full flex-col p-3">
        <div className="relative overflow-hidden rounded-[18px] bg-haze">
          <Cover src={api.coverSrc(item.cover_url)} title={item.title} category={item.category} className="aspect-[3/4] w-full" />
          <div className="absolute left-2.5 top-2.5 flex gap-1.5">
            {isNew && <span className="chip bg-sun text-ink shadow">Жаңа</span>}
            {progress?.completed && <span className="chip bg-emerald-500 text-white shadow">✓ Оқылды</span>}
          </div>
          {!!item.pages && <span className="chip absolute bottom-2.5 right-2.5 bg-night/70 text-white backdrop-blur">{item.pages} бет</span>}
        </div>
        <div className="flex flex-1 flex-col px-1.5 pb-1 pt-3">
          <CategoryChip slug={item.category} small />
          <h3 className="mt-2 line-clamp-2 font-extrabold leading-snug">{item.title}</h3>
          {'author' in item && item.author && <p className="mt-0.5 truncate text-xs font-semibold text-ink/45">{item.author}</p>}
          <p className="mt-1 line-clamp-2 text-sm text-ink/55">{item.description}</p>
          <div className="mt-auto pt-3">
            {progress && !progress.completed && (
              <div className="mb-3">
                <div className="mb-1 flex justify-between text-[11px] font-bold text-ink/45"><span>{progress.last_page}/{progress.total_pages} бет</span><span>{pct}%</span></div>
                <ProgressBar value={pct} className="!h-1.5" />
              </div>
            )}
            <span className="btn btn-primary btn-sm w-full">{progress && !progress.completed ? 'Жалғастыру' : 'Оқу'}</span>
          </div>
        </div>
      </div>
    </PressCard>
  );
}

const TYPE_ART: Record<string, (c: string) => React.ReactNode> = {
  quiz: () => <Trophy className="h-24" />,
  pairs: () => <Books className="h-24" />,
  code_puzzle: () => <CodeBadge className="h-20" />,
  find_mistake: () => <Laptop className="h-20" />,
  true_false: () => <Star3D className="h-20" />,
  drag_drop: () => <Cube className="h-20" hue="sun" />,
  computer_parts: () => <Planet className="h-20" />,
  maze: () => <Robot className="h-24" wave={false} />,
};

export function GameCard({ game, best }: { game: Game; best?: number }) {
  const cat = categoryOf(game.category);
  const t = GAME_TYPES[game.type];
  const d = DIFFICULTY[game.difficulty] ?? DIFFICULTY.easy;
  return (
    <PressCard label={`${game.title} — ойнау`} onClick={() => navigate(`/app/games/${game.id}`)}>
      <div className="flex h-full flex-col p-3">
        <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-[18px]" style={{ background: `linear-gradient(140deg, ${cat.color}22, ${cat.color}55)` }}>
          <div className="dot-grid absolute inset-0 opacity-40" />
          <div className="relative float-slow">{(TYPE_ART[game.type] ?? (() => <Gamepad className="h-20" />))(cat.color)}</div>
          <span className="chip absolute left-2.5 top-2.5 bg-card/90 text-ink shadow-sm">{t.icon} {t.label}</span>
          {best !== undefined && <span className="chip absolute right-2.5 top-2.5 bg-emerald-500 text-white">★ {Math.round(best * 100)}%</span>}
        </div>
        <div className="flex flex-1 flex-col px-1.5 pb-1 pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryChip slug={game.category} small />
            <span className={`chip !px-2 !py-0.5 !text-[11px] ${d.cls}`}>{d.label}</span>
          </div>
          <h3 className="mt-2 line-clamp-2 font-extrabold leading-snug">{game.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-ink/55">{game.description}</p>
          <div className="mt-auto flex items-center justify-between gap-2 pt-3">
            <span className="chip bg-sun/30 text-ink">💎 {game.xp_reward}</span>
            <span className="btn btn-primary btn-sm">Ойнау</span>
          </div>
        </div>
      </div>
    </PressCard>
  );
}
