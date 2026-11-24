import type {
  Achievement, AdminStats, Book, Comic, ContentInput, DailyChallenge, Game, GameResult, ItemType,
  LeaderRow, MyStats, Notification, Profile, ReadingProgress, RewardResult, Settings, SignUpInput,
  StudentDetail, StudentRow, ProfilePatch, MyTestRow, TestForStudent, TestSubmitResult, GroupRatingRow,
  Test, TestResultRow, TestAnswer, TestQuestion, PublicTest, GuestResult, GuestResultRow, Material, MaterialInput, AdminUserRow, ComicReview, ComicRatingRow, ComicReviewRow,
  Suggestion, SuggestionInput,
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
  updateProfile(patch: ProfilePatch): Promise<void>;
  /** Upload a (already downscaled) photo and return the value to store in profile.avatar. */
  uploadAvatar(photo: Blob): Promise<string>;
  ping(): Promise<void>;

  // surveys / tests (students)
  myTests(): Promise<MyTestRow[]>;
  getTest(id: string): Promise<TestForStudent>;
  submitTest(id: string, answers: TestAnswer[]): Promise<TestSubmitResult>;
  /** AI explanation of one question (after the student has submitted). Cached on the server. */
  explainQuestion(testId: string, index: number): Promise<string>;
  testRating(): Promise<GroupRatingRow[]>;

  // comic ratings (students rate a comic they finished)
  myComicReview(comicId: string): Promise<ComicReview | null>;
  rateComic(comicId: string, rating: number, comment: string): Promise<void>;

  // suggestions (students → admin)
  sendSuggestion(input: SuggestionInput): Promise<void>;

  // materials (everyone reads; admin uploads)
  listMaterials(): Promise<Material[]>;
  saveMaterial(input: MaterialInput): Promise<void>;
  deleteMaterial(m: Material): Promise<void>;

  // surveys / tests (admin)
  adminTests(): Promise<Test[]>;
  saveTest(t: Partial<Test> & Pick<Test, 'title' | 'description' | 'questions' | 'published'>): Promise<void>;
  deleteTest(id: string): Promise<void>;
  testResults(id: string): Promise<TestResultRow[]>;
  /** Admin: draft an AI explanation for a question in the editor (not saved). */
  draftExplain(q: TestQuestion): Promise<string>;
  /** Admin: replace the share link (the old one stops working). Returns the new code. */
  adminNewShareCode(testId: string): Promise<string>;
  guestResults(testId: string): Promise<GuestResultRow[]>;
  deleteGuestResult(id: string): Promise<void>;

  // surveys shared by link — work without an account
  publicTest(code: string): Promise<PublicTest | null>;
  submitPublicTest(code: string, name: string, answers: TestAnswer[]): Promise<GuestResult>;
  publicTestResult(code: string, attemptId: string): Promise<GuestResult | null>;
  explainGuest(code: string, attemptId: string, index: number): Promise<string>;

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
  adminUsers(): Promise<AdminUserRow[]>;
  adminComicRatings(): Promise<ComicRatingRow[]>;
  adminComicReviews(comicId: string): Promise<ComicReviewRow[]>;
  adminDeleteComicReview(comicId: string, userId: string): Promise<void>;
  adminSuggestions(): Promise<Suggestion[]>;
  adminMarkSuggestion(id: string, read: boolean): Promise<void>;
  adminDeleteSuggestion(id: string): Promise<void>;
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
  if (/test already answered/i.test(msg)) return 'Бұл сауалнама бұрын тапсырылған.';
  if (/test not found/i.test(msg)) return 'Сауалнама табылмады.';
  if (/guest name required/i.test(msg)) return 'Аты-жөніңді жаз (кемінде 2 әріп).';
  if (/too many attempts/i.test(msg)) return 'Бұл сілтеме арқылы тым көп тапсырылды. Сәл кейінірек қайталаңыз.';
  if (/ai not configured/i.test(msg)) return 'ИИ әлі қосылмаған: Supabase-та AI кілтін орнату керек.';
  if (/Gemini 429|quota/i.test(msg)) return 'ИИ лимиті уақытша бітті. 1–2 минуттан кейін қайталаңыз.';
  if (/Gemini 503|high demand|overloaded/i.test(msg)) return 'ИИ қазір бос емес. Бірнеше секундтан кейін қайталаңыз.';
  if (/ai error|Failed to send a request to the Edge Function|Edge Function returned/i.test(msg)) return 'ИИ түсіндірмесін алу мүмкін болмады. Кейінірек қайталаңыз.';
  if (/multi-answer/i.test(msg)) return 'Бірнеше жауапты сұрақта кемінде бір дұрыс жауап белгіленуі керек.';
  if (/invalid question|questions/i.test(msg)) return 'Әр сұрақта мәтін, 4 жауап нұсқасы және дұрыс жауап болуы керек.';
  if (/finish the comic first/i.test(msg)) return 'Бағалау үшін комиксті соңына дейін оқы.';
  if (/invalid rating/i.test(msg)) return 'Бағаны 1-ден 5-ке дейін таңда.';
  if (/suggestion too short/i.test(msg)) return 'Ұсынысты толығырақ жаз (кемінде 3 таңба).';
  if (/too many suggestions/i.test(msg)) return 'Бүгінге ұсыныс лимиті бітті (10). Ертең қайта жаз.';
  if (/rate limit|too many/i.test(msg)) return 'Тым көп әрекет. Бірнеше минуттан кейін қайталаңыз.';
  if (/exceeded the maximum allowed size|Payload too large|too large/i.test(msg)) return 'Файл тым үлкен (ең көбі 20 МБ).';
  if (/mime type|not supported/i.test(msg)) return 'Бұл файл түріне рұқсат жоқ.';
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
