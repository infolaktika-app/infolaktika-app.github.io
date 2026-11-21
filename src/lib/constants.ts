import type { GameType } from './types';

export const APP_NAME = 'INFOLAKTIKA';

export const CATEGORIES: { slug: string; label: string; icon: string; color: string }[] = [
  { slug: 'computer_literacy', label: 'Компьютерлік сауаттылық', icon: '💻', color: '#2A6B7F' },
  { slug: 'algorithms', label: 'Алгоритмдер', icon: '🧭', color: '#17404E' },
  { slug: 'programming', label: 'Бағдарламалау', icon: '🧩', color: '#5EAEC9' },
  { slug: 'python', label: 'Python', icon: '🐍', color: '#2F829E' },
  { slug: 'html_css', label: 'HTML және CSS', icon: '🎨', color: '#63B1CB' },
  { slug: 'information', label: 'Ақпарат және ақпараттық процестер', icon: '📡', color: '#65B2CC' },
  { slug: 'architecture', label: 'Компьютер архитектурасы', icon: '🖥️', color: '#2FA1C8' },
  { slug: 'networks', label: 'Желілер және интернет', icon: '🌐', color: '#2785A5' },
  { slug: 'databases', label: 'Деректер қоры', icon: '🗄️', color: '#2A91B5' },
  { slug: 'cybersecurity', label: 'Киберқауіпсіздік', icon: '🛡️', color: '#30A6CE' },
];

export const categoryLabel = (slug: string) => CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
export const categoryOf = (slug: string) => CATEGORIES.find((c) => c.slug === slug) ?? CATEGORIES[0];

export const GAME_TYPES: Record<GameType, { label: string; icon: string; short: string }> = {
  quiz: { label: 'Quiz Battle', icon: '⚔️', short: 'Таймерлі тест' },
  pairs: { label: 'Сәйкестендір', icon: '🔗', short: 'Термин + анықтама' },
  code_puzzle: { label: 'Код пазл', icon: '🧩', short: 'Командаларды ретте' },
  find_mistake: { label: 'Қатені тап', icon: '🔍', short: 'Кодтағы қате' },
  true_false: { label: 'Ақиқат / Жалған', icon: '⚖️', short: 'Тез шешім' },
  drag_drop: { label: 'Сүйреп апар', icon: '🖐️', short: 'Топтарға бөл' },
  computer_parts: { label: 'Компьютер бөліктері', icon: '🔧', short: 'Бөлікті тап' },
  maze: { label: 'Алгоритм лабиринт', icon: '🤖', short: 'Роботты басқар' },
};

export const DIFFICULTY: Record<string, { label: string; cls: string }> = {
  easy: { label: 'Оңай', cls: 'bg-haze text-violet' },
  medium: { label: 'Орташа', cls: 'bg-lavender/30 text-brand' },
  hard: { label: 'Қиын', cls: 'bg-brand text-white' },
};

export const LEVELS = [
  { level: 1, name: 'Beginner', kk: 'Бастаушы', min: 0 },
  { level: 2, name: 'Explorer', kk: 'Зерттеуші', min: 200 },
  { level: 3, name: 'Programmer', kk: 'Бағдарламашы', min: 600 },
  { level: 4, name: 'IT Master', kk: 'IT шебер', min: 1200 },
  { level: 5, name: 'Informatics Legend', kk: 'Информатика аңызы', min: 2200 },
];

export function levelFor(xp: number) {
  let l = LEVELS[0];
  for (const x of LEVELS) if (xp >= x.min) l = x;
  return l;
}

export function levelProgress(xp: number) {
  const cur = levelFor(xp);
  const next = LEVELS.find((l) => l.level === cur.level + 1);
  if (!next) return { cur, next: null, pct: 100, toNext: 0 };
  const pct = Math.round(((xp - cur.min) / (next.min - cur.min)) * 100);
  return { cur, next, pct, toNext: next.min - xp };
}

export const AVATARS = [
  { id: 'robot-1', bg: 'linear-gradient(135deg,#2A6B7F,#17404E)', emoji: '🤖' },
  { id: 'robot-2', bg: 'linear-gradient(135deg,#B4DCA0,#5E9A45)', emoji: '👾' },
  { id: 'astro', bg: 'linear-gradient(135deg,#84C1D6,#61AFCA)', emoji: '🧑‍🚀' },
  { id: 'fox', bg: 'linear-gradient(135deg,#95CADC,#4CA5C3)', emoji: '🦊' },
  { id: 'owl', bg: 'linear-gradient(135deg,#7FB3C2,#5EAEC9)', emoji: '🦉' },
  { id: 'cat', bg: 'linear-gradient(135deg,#B9DCE8,#42A0C0)', emoji: '🐱' },
  { id: 'panda', bg: 'linear-gradient(135deg,#B4D9E6,#1D657E)', emoji: '🐼' },
  { id: 'rocket', bg: 'linear-gradient(135deg,#C6E2EC,#17404E)', emoji: '🚀' },
  { id: 'unicorn', bg: 'linear-gradient(135deg,#D8EBF2,#A4D1E1)', emoji: '🦄' },
  { id: 'dragon', bg: 'linear-gradient(135deg,#98CBDD,#237996)', emoji: '🐲' },
];
export const avatarOf = (id: string) => AVATARS.find((a) => a.id === id) ?? AVATARS[0];

export const USERNAME_RE = /^[a-z0-9_.]{3,24}$/;

const MONTHS = ['қаң.', 'ақп.', 'нау.', 'сәу.', 'мам.', 'мау.', 'шіл.', 'там.', 'қыр.', 'қаз.', 'қар.', 'жел.'];

export function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  if (isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'жаңа ғана';
  if (s < 3600) return `${Math.floor(s / 60)} мин бұрын`;
  if (s < 86400) return `${Math.floor(s / 3600)} сағ бұрын`;
  return `${Math.floor(s / 86400)} күн бұрын`;
}

export function todayKZ() {
  // YYYY-MM-DD in Asia/Almaty (matches the backend's _today()).
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty' }).format(new Date());
}
