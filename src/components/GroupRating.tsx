import { Avatar, Empty } from './ui';
import type { GroupRatingRow } from '../lib/types';

const MEDAL = ['🥇', '🥈', '🥉'];

/** Survey-points rating across all students. */
export function GroupRating({ rows, meId, emptyText }: { rows: GroupRatingRow[]; meId?: string; emptyText?: string }) {
  if (!rows.length) return <Empty title="Рейтинг әзірге бос" text={emptyText ?? 'Сауалнама тапсырылған сайын ұпайлар осында шығады.'} />;
  return (
    <div className="card overflow-hidden">
      {rows.map((r) => {
        const mine = r.id === meId;
        return (
          <div key={r.id} className={`flex items-center gap-3 border-b border-haze px-4 py-3 last:border-0 sm:gap-4 sm:px-6 ${mine ? 'bg-haze/70' : ''}`}>
            <span className={`w-8 shrink-0 text-center text-lg font-extrabold ${r.rank <= 3 && r.points > 0 ? '' : 'text-ink/35'}`}>
              {r.rank <= 3 && r.points > 0 ? MEDAL[r.rank - 1] : r.rank}
            </span>
            <Avatar id={r.avatar} size={42} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-extrabold">{r.first_name} {r.last_name} {mine && <span className="chip ml-1 bg-brand text-white">Сен</span>}</p>
              <p className="truncate text-xs font-semibold text-ink/45">{r.stream ? `${r.stream} поток · ` : ''}{r.tests_done} сауалнама тапсырды</p>
            </div>
            <span className="chip shrink-0 bg-sun/30 !px-3 !py-1.5 text-sm text-ink">🎯 {r.points}</span>
          </div>
        );
      })}
    </div>
  );
}
