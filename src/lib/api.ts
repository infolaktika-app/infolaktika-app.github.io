import type {
  Achievement, AdminStats, Book, Comic, ContentInput, DailyChallenge, Game, GameResult, ItemType,
  LeaderRow, MyStats, Notification, Profile, ReadingProgress, RewardResult, Settings, SignUpInput,
  StudentDetail, StudentRow,
} from './types';

export interface DailyResult extends RewardResult {
  correct: boolean;
  answer: number;
  explanation: string;
}

export interface XpEvent { amount: number; reason: string; ref: string | null; created_at: string }

/** Everything the UI needs from a backend. Implemented by Supabase and by the in-browser demo. */
export interface Api {
  mode: 'supabase' | 'demo';

  currentProfile(): Promise<Profile | null>;
  onAuthChange(cb: () => void): () => void;
  signUp(input: SignUpInput): Promise<void>;
  signIn(username: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  changePassword(password: string): Promise<void>;
  usernameAvailable(username: string): Promise<boolean>;
  updateProfile(patch: Partial<Pick<Profile, 'first_name' | 'last_name' | 'avatar'>>): Promise<void>;
  ping(): Promise<void>;

  listComics(): Promise<Comic[]>;
  getComic(id: string): Promise<Comic | null>;
  listBooks(): Promise<Book[]>;
  getBook(id: string): Promise<Book | null>;
  listGames(): Promise<Game[]>;
  getGame(id: string): Promise<Game | null>;
  loadPdf(path: string): Promise<ArrayBuffer>;
  coverSrc(cover: string | null): string | null;

  listProgress(): Promise<ReadingProgress[]>;
  saveProgress(type: ItemType, id: string, page: number, total: number): Promise<RewardResult>;
  completeGame(gameId: string, score: number, max: number, durationSec: number): Promise<RewardResult>;
  myResults(): Promise<GameResult[]>;
  daily(): Promise<DailyChallenge | null>;
  submitDaily(answer: number): Promise<DailyResult>;
  myStats(): Promise<MyStats>;
  leaderboard(): Promise<LeaderRow[]>;
  achievements(): Promise<{ all: Achievement[]; earned: Record<string, string> }>;
  xpHistory(): Promise<XpEvent[]>;
  notifications(): Promise<Notification[]>;
  markNotificationsRead(): Promise<void>;
  settings(): Promise<Settings>;

  // admin only (enforced by RLS / RPC checks on the server)
  saveComic(input: ContentInput): Promise<void>;
  deleteComic(comic: Comic): Promise<void>;
  saveBook(input: ContentInput): Promise<void>;
  deleteBook(book: Book): Promise<void>;
  saveGame(game: Partial<Game>): Promise<void>;
  deleteGame(id: string): Promise<void>;
  adminStudents(): Promise<StudentRow[]>;
  adminStudentDetail(id: string): Promise<StudentDetail>;
  adminSetBlocked(id: string, blocked: boolean): Promise<void>;
  adminAdjustXp(id: string, amount: number): Promise<void>;
  adminDeleteStudent(id: string): Promise<void>;
  adminStats(): Promise<AdminStats>;
  saveSettings(s: Settings): Promise<void>;
}

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';
export const EMAIL_DOMAIN = (import.meta.env.VITE_LOGIN_EMAIL_DOMAIN as string | undefined)?.trim() || 'infolaktika.app';
export const IS_DEMO = !SUPABASE_URL || !SUPABASE_ANON_KEY;

/** Static sample files ship in /public/sample and are referenced as "sample/...". */
export function staticUrl(path: string) {
  // A self-contained preview build can embed the sample files as data URLs.
  const embedded = (globalThis as any).__INFOLAKTIKA_STATIC__?.[path.replace(/^\//, '')];
  if (embedded) return embedded as string;
  const base = (import.meta.env.BASE_URL as string | undefined) ?? '/';
  return base.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
}

/** Translate backend errors into friendly Kazakh messages. */
export function friendlyError(e: unknown): string {
  const msg = (e as any)?.message ?? String(e);
  if (/invalid login|invalid credentials|Неверн/i.test(msg)) return 'Логин немесе құпиясөз қате.';
  if (/already registered|already exists|duplicate key.*username/i.test(msg)) return 'Бұл логин бос емес. Басқасын таңда.';
  if (/password.*(short|at least|weak)/i.test(msg)) return 'Құпиясөз тым қысқа (кемінде 6 таңба).';
  if (/blocked/i.test(msg)) return 'Аккаунт бұғатталған. Мұғалімге хабарлас.';
  if (/forbidden|row-level security|permission/i.test(msg)) return 'Бұл әрекетке рұқсат жоқ.';
  if (/already answered/i.test(msg)) return 'Бүгінгі тапсырма орындалған.';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Серверге қосылу мүмкін болмады. Интернетті тексер.';
  return msg;
}

let instance: Promise<Api> | null = null;

export function getApi(): Promise<Api> {
  if (!instance) {
    instance = IS_DEMO
      ? import('./demoApi').then((m) => m.createDemoApi())
      : import('./supabaseApi').then((m) => m.createSupabaseApi(SUPABASE_URL, SUPABASE_ANON_KEY, EMAIL_DOMAIN));
  }
  return instance;
}
