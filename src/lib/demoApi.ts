/**
 * DEMO MODE backend — used only when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set.
 * Mirrors the Supabase RPC logic in supabase/schema.sql, but keeps data in this browser
 * (localStorage + IndexedDB for PDFs). Lets you click through every feature without a server.
 * Demo admin: admin / admin123 — exists ONLY in demo mode. Real deployments create the admin
 * with scripts/create-admin.mjs from environment variables.
 */
import seed from '../data/seed.json';
import type { Api, DailyResult, XpEvent } from './api';
import { staticUrl } from './api';
import { levelFor, todayKZ } from './constants';
import type {
  Achievement, Book, Comic, ContentInput, EarnedAchievement, Game, GameResult, ItemType,
  Material, Notification, Profile, ReadingProgress, RewardResult, Role, Settings, Suggestion, Test, TestAnswer, TestQuestion,
} from './types';
import { cleanAnswer, correctOf, demoExplain, sameAnswer } from './testLogic';

interface DemoUser extends Profile { salt: string; hash: string }
interface DB {
  v: number;
  session: string | null;
  users: DemoUser[];
  comics: Comic[];
  books: Book[];
  games: Game[];
  results: (GameResult & { user_id: string; duration_sec: number })[];
  progress: (ReadingProgress & { user_id: string; completed_at: string | null })[];
  xp: (XpEvent & { user_id: string })[];
  earned: { user_id: string; code: string; earned_at: string }[];
  daily: { user_id: string; day: string; challenge_id: number; correct: boolean }[];
  notifications: (Notification & { user_id: string })[];
  settings: Settings;
  tests: Test[];
  attempts: { test_id: string; user_id: string; score: number; max_score: number; answers: TestAnswer[]; created_at: string }[];
  materials: Omit<Material, 'url'>[];
  reviews: { comic_id: string; user_id: string; rating: number; comment: string; updated_at: string }[];
  suggestions: Suggestion[];
}

const KEY = 'infolaktika-demo-v6';
const listeners = new Set<() => void>();
const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const dayOf = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty' }).format(new Date(iso));
const addDays = (d: string, n: number) => {
  const x = new Date(d + 'T12:00:00Z');
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

async function hashPw(pw: string, salt: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pw));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------- IndexedDB for uploaded PDFs ----------
function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open('infolaktika-demo', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbPut(key: string, val: Blob) {
  const d = await idb();
  await new Promise<void>((res, rej) => {
    const t = d.transaction('files', 'readwrite');
    t.objectStore('files').put(val, key);
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
}
async function idbGet(key: string): Promise<Blob | undefined> {
  const d = await idb();
  return new Promise((res, rej) => {
    const r = d.transaction('files').objectStore('files').get(key);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbDel(key: string) {
  const d = await idb();
  d.transaction('files', 'readwrite').objectStore('files').delete(key);
}
function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });
}

// ---------- seed ----------
async function makeUser(first: string, last: string, username: string, pw: string, role: Role, extra: Partial<Profile> = {}): Promise<DemoUser> {
  const salt = uuid();
  return {
    id: uuid(), first_name: first, last_name: last, username, role, avatar: 'robot-1', xp: 0, streak: 0, best_streak: 0,
    last_active: null, is_blocked: false, created_at: now(), stream: null, salt, hash: await hashPw(pw, salt), ...extra,
  };
}

const SAMPLE_TEST: TestQuestion[] = [
  { q: 'Python-да экранға мәтін шығаратын функция қайсы?', options: ['input()', 'print()', 'len()', 'str()'], answer: 1,
    explain: 'print() берілген мәнді экранға шығарады. input() керісінше пайдаланушыдан мәлімет сұрайды, len() ұзындықты санайды, ал str() мәнді мәтінге айналдырады, бірақ ештеңе көрсетпейді.' },
  { q: '1 байт неше биттен тұрады?', options: ['4', '16', '8', '2'], answer: 2,
    explain: 'Байт — 8 биттен тұратын ақпарат бірлігі, сондықтан бір байтпен 256 түрлі мән жазуға болады. 4 бит — жарты байт, ал 16 бит екі байтқа тең.' },
  { q: 'HTML-де ең үлкен тақырып тегі қайсы?', options: ['<h6>', '<head>', '<title>', '<h1>'], answer: 3,
    explain: '<h1> ең маңызды әрі ең үлкен тақырып, саны өскен сайын (<h2>…<h6>) тақырып кішірейеді. <head> бет туралы қызметтік мәліметті сақтайды, ал <title> браузер қойындысындағы атауды береді.' },
  { q: 'Алгоритм дегеніміз не?', options: ['Нақты әрекеттер тізбегі', 'Компьютер бөлігі', 'Бағдарлама тілі', 'Файл түрі'], answer: 0 },
  { q: 'Қай құпиясөз ең сенімді?', options: ['123456', 'qwerty', 'K7#m!pQ2z', 'aruzhan'], answer: 2 },
  { q: 'Қайсылары бағдарламалау тілі? (бірнеше жауап)', options: ['Python', 'Microsoft Word', 'JavaScript', 'PNG'], type: 'multi', answer: 0, answers: [0, 2],
    explain: 'Python мен JavaScript — компьютерге нұсқау жазатын бағдарламалау тілдері. Microsoft Word — мәтін теретін бағдарлама, ал PNG — сурет файлының пішімі, олармен бағдарлама жазылмайды.' },
];

async function freshDb(): Promise<DB> {
  const t = todayKZ();
  const created = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString();
  const games: Game[] = (seed.games as any[]).map((g) => ({ ...g, id: uuid(), published: true, created_at: created(30) }));
  const db: DB = {
    v: 1, session: null, users: [],
    comics: seed.comics.map((c, i) => ({ ...c, published: true, created_at: created(seed.comics.length - 1 - i) })),
    books: seed.books.map((b, i) => ({ ...b, published: true, created_at: created(10 - i) })),
    games, results: [], progress: [], xp: [], earned: [], daily: [], notifications: [],
    settings: { ...seed.settings }, tests: [], attempts: [], materials: [], reviews: [], suggestions: [],
  };
  const adminUser = await makeUser('Әкімші', '', 'admin', 'admin123', 'admin');
  db.users.push(adminUser);
  // A few classmates so the leaderboard and admin tables are not empty.
  const mates: [string, string, string, number, string, number][] = [
    ['Айгерім', 'Нұрланқызы', 'aigerim', 1340, 'owl', 6],
    ['Нұрсұлтан', 'Ержанұлы', 'nursultan', 980, 'rocket', 4],
    ['Мадина', 'Асқарқызы', 'madina', 720, 'cat', 3],
    ['Арман', 'Болатұлы', 'arman', 455, 'fox', 2],
    ['Дана', 'Серікқызы', 'dana', 260, 'unicorn', 1],
    ['Ерасыл', 'Қайратұлы', 'erasyl', 120, 'panda', 1],
  ];
  const streams = ['01', '11', '21', '01', '11', '21'];
  for (const [k, [f, l, u, xp, av, streak]] of mates.entries()) {
    const user = await makeUser(f, l, u, uuid(), 'student', {
      xp, avatar: av, streak, best_streak: streak, last_active: t, created_at: created(20),
      stream: streams[k] });
    db.users.push(user);
    const n = Math.min(games.length, Math.round(xp / 120));
    for (let i = 0; i < n; i++) {
      const g = games[i];
      const daysAgo = i % 10;
      db.results.push({ id: uuid(), user_id: user.id, game_id: g.id, score: 7, max_score: 8, xp_earned: Math.round(g.xp_reward * 0.875), duration_sec: 90, created_at: created(daysAgo) });
      db.xp.push({ user_id: user.id, amount: Math.round(g.xp_reward * 0.875), reason: 'game', ref: g.title, created_at: created(daysAgo) });
    }
    db.comics.slice(0, 1 + (xp > 700 ? 2 : 0)).forEach((c) =>
      db.progress.push({ user_id: user.id, item_type: 'comic', item_id: c.id, last_page: c.pages ?? 1, total_pages: c.pages ?? 1, completed: true, completed_at: created(2), updated_at: created(2) }));
  }
  const test: Test = {
    id: uuid(), author_id: adminUser.id, title: 'Информатика негіздері: апталық тест', description: 'Python, HTML, байт және алгоритм бойынша 5 сұрақ.',
    questions: SAMPLE_TEST, published: true, created_at: created(3), updated_at: created(3),
  };
  db.tests.push(test);
  db.users.filter((u) => u.role === 'student').slice(0, 3).forEach((u, i) => {
    const answers: TestAnswer[] = SAMPLE_TEST.map((q, j) => {
      const c = correctOf(q);
      if (j < 4 - i) return c;
      return Array.isArray(c) ? [c[0]] : (c + 1) % 4;
    });
    const score = answers.filter((a, j) => sameAnswer(a, correctOf(SAMPLE_TEST[j]))).length;
    db.attempts.push({ test_id: test.id, user_id: u.id, score, max_score: SAMPLE_TEST.length, answers, created_at: created(2 - i * 0.3) });
  });
  db.materials.push({
    id: uuid(), author_id: adminUser.id, author_name: 'Әкімші', title: 'Python: алғашқы бағдарлама чек-листі',
    description: 'Тақырыпты өткен соң әр пунктті белгілеп шық.', file_path: 'sample/checklist-python.pdf',
    file_name: 'checklist-python.pdf', mime: 'application/pdf', size: 57550, created_at: created(1),
  });
  const students = db.users.filter((u) => u.role === 'student');
  const firstComic = db.comics.find((c) => c.published);
  if (firstComic) {
    [[5, 'Өте қызық! Келесі бөлімін күтемін.'], [4, ''], [5, 'Суреттері керемет']].forEach(([rating, comment], i) => {
      const u = students[i];
      if (!u) return;
      if (!db.progress.some((p) => p.user_id === u.id && p.item_id === firstComic.id)) {
        db.progress.push({ user_id: u.id, item_type: 'comic', item_id: firstComic.id, last_page: firstComic.pages ?? 1, total_pages: firstComic.pages ?? 1, completed: true, completed_at: created(2), updated_at: created(2) });
      }
      db.reviews.push({ comic_id: firstComic.id, user_id: u.id, rating: rating as number, comment: comment as string, updated_at: created(1.5 - i * 0.2) });
    });
  }
  if (students[1]) {
    db.suggestions.push({ id: uuid(), user_id: students[1].id, author_name: `${students[1].first_name} ${students[1].last_name}`, stream: students[1].stream,
      topic: 'platform', target_id: null, target_title: '', body: 'Ойындарға таймерсіз режим қосса жақсы болар еді.', is_read: false, created_at: created(0.5) });
  }
  return db;
}

export async function createDemoApi(): Promise<Api> {
  let db: DB;
  try {
    const raw = localStorage.getItem(KEY);
    db = raw ? JSON.parse(raw) : await freshDb();
    db.reviews ??= [];
    db.suggestions ??= [];
  } catch {
    db = await freshDb();
  }
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.warn('demo save failed', e); }
  };
  save();
  const emit = () => listeners.forEach((l) => setTimeout(l, 0));
  const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 60));

  const me = (): DemoUser => {
    const u = db.users.find((x) => x.id === db.session);
    if (!u) throw new Error('not authenticated');
    if (u.is_blocked) throw new Error('account blocked');
    return u;
  };
  const admin = () => {
    const u = me();
    if (u.role !== 'admin') throw new Error('forbidden');
    return u;
  };
  const fullName = (u: { first_name: string; last_name: string }) => `${u.first_name} ${u.last_name}`.trim();
  const strip = ({ salt, hash, ...p }: DemoUser): Profile => p;
  function removeUser(id: string) {
    db.users = db.users.filter((x) => x.id !== id);
    for (const k of ['results', 'progress', 'xp', 'earned', 'daily', 'notifications', 'attempts'] as const)
      (db as any)[k] = (db as any)[k].filter((x: any) => x.user_id !== id);
    db.tests.forEach((t) => { if (t.author_id === id) t.author_id = null; });
    db.reviews = db.reviews.filter((r) => r.user_id !== id);
    db.suggestions.forEach((x) => { if (x.user_id === id) x.user_id = null; });
  }
  const notify = (user_id: string, title: string, body: string, link: string | null) =>
    db.notifications.push({ id: uuid(), user_id, title, body, link, read: false, created_at: now() });

  function notifyTest(t: Test) {
    for (const s of db.users.filter((x) => x.role === 'student'))
      notify(s.id, 'Жаңа сауалнама! 📝', t.title, `/app/tests/${t.id}`);
  }
  function award(u: DemoUser, amount: number, reason: string, ref: string | null) {
    if (!amount) return;
    const before = levelFor(u.xp).level;
    u.xp = Math.max(0, u.xp + amount);
    db.xp.push({ user_id: u.id, amount, reason, ref, created_at: now() });
    const after = levelFor(u.xp).level;
    if (after > before) notify(u.id, 'Жаңа деңгей! 🎉', `Құттықтаймыз! Сен ${after}-деңгейге көтерілдің.`, '/app/achievements');
  }
  function touch(u: DemoUser) {
    const t = todayKZ();
    if (u.last_active === t) return;
    u.streak = u.last_active === addDays(t, -1) ? u.streak + 1 : 1;
    u.best_streak = Math.max(u.best_streak, u.streak);
    u.last_active = t;
  }
  function checkAchievements(u: DemoUser): EarnedAchievement[] {
    const got: EarnedAchievement[] = [];
    const mine = db.results.filter((r) => r.user_id === u.id);
    const gamesDone = new Set(mine.map((r) => r.game_id)).size;
    const perfect = mine.some((r) => r.score >= r.max_score);
    const comics = db.progress.filter((p) => p.user_id === u.id && p.item_type === 'comic' && p.completed).length;
    const books = db.progress.filter((p) => p.user_id === u.id && p.item_type === 'book' && p.completed).length;
    const dailies = db.daily.filter((d) => d.user_id === u.id && d.correct).length;
    const rules: [string, boolean][] = [
      ['first_game', gamesDone >= 1], ['games_5', gamesDone >= 5], ['games_10', gamesDone >= 10], ['perfect', perfect],
      ['comic_1', comics >= 1], ['comic_3', comics >= 3], ['book_1', books >= 1], ['streak_3', u.streak >= 3],
      ['streak_7', u.streak >= 7], ['daily_5', dailies >= 5], ['xp_500', u.xp >= 500], ['level_4', levelFor(u.xp).level >= 4],
    ];
    for (const [code, ok] of rules) {
      if (!ok || db.earned.some((e) => e.user_id === u.id && e.code === code)) continue;
      const a = seed.achievements.find((x) => x.code === code)!;
      db.earned.push({ user_id: u.id, code, earned_at: now() });
      notify(u.id, `Жаңа жетістік: ${a.title} ${a.icon}`, a.description, '/app/achievements');
      got.push({ code, title: a.title, icon: a.icon });
    }
    return got;
  }
  function missions(u: DemoUser) {
    const t = todayKZ();
    return {
      game: db.results.some((r) => r.user_id === u.id && dayOf(r.created_at) === t),
      read: db.progress.some((p) => p.user_id === u.id && dayOf(p.updated_at) === t),
      daily: db.daily.some((d) => d.user_id === u.id && d.day === t),
      bonus: db.xp.some((x) => x.user_id === u.id && x.reason === 'missions' && x.ref === t),
    };
  }
  function checkMissions(u: DemoUser) {
    const m = missions(u);
    if (m.game && m.read && m.daily && !m.bonus) {
      award(u, db.settings.xp_missions, 'missions', todayKZ());
      return db.settings.xp_missions;
    }
    return 0;
  }
  function todaysChallenge() {
    const pool = seed.daily_challenges;
    const days = Math.floor((Date.parse(todayKZ()) - Date.parse('2024-01-01')) / 86400000);
    const idx = ((days % pool.length) + pool.length) % pool.length;
    return { id: idx + 1, ...pool[idx] };
  }
  const isAdmin = () => db.users.find((x) => x.id === db.session)?.role === 'admin';
  const visible = <T extends { published: boolean }>(rows: T[]) => (isAdmin() ? rows : rows.filter((r) => r.published));

  async function saveContent(kind: 'comics' | 'books', input: ContentInput) {
    const u = admin();
    const list = db[kind] as (Comic | Book)[];
    const existing = input.id ? list.find((x) => x.id === input.id) : undefined;
    if (!existing && !input.pdfFile) throw new Error('PDF файлын таңдаңыз.');
    const id = existing?.id ?? uuid();
    let pdf_path = existing?.pdf_path ?? '';
    let cover_url = existing?.cover_url ?? null;
    if (input.pdfFile) {
      if (pdf_path.startsWith('idb:')) await idbDel(pdf_path);
      pdf_path = `idb:${kind}/${id}-${Date.now()}`;
      await idbPut(pdf_path, input.pdfFile);
    }
    if (input.coverFile) cover_url = await blobToDataUrl(input.coverFile);
    const row: any = {
      ...(existing ?? { id, created_at: now() }),
      title: input.title.trim(), description: input.description.trim(), category: input.category,
      published: input.published, pages: input.pages, pdf_path, cover_url,
    };
    if (kind === 'books') row.author = (input.author ?? '').trim();
    if (existing) Object.assign(existing, row);
    else list.unshift(row);
    if (row.published && (!existing || !existing.published)) {
      for (const s of db.users.filter((x) => x.role === 'student'))
        notify(s.id, kind === 'comics' ? 'Жаңа комикс! 🦸' : 'Жаңа кітап! 📚', row.title, `/app/${kind}/${id}`);
    }
    void u;
    save();
  }

  const api: Api = {
    mode: 'demo',

    async currentProfile() {
      const u = db.users.find((x) => x.id === db.session);
      return delay(u ? strip(u) : null);
    },
    onAuthChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async signUp(i) {
      const username = i.username.trim().toLowerCase();
      if (db.users.some((u) => u.username === username)) throw new Error('already exists');
      if (i.password.length < 6) throw new Error('password too short');
      const u = await makeUser(i.first_name.trim(), i.last_name.trim(), username, i.password, 'student', { stream: i.stream.trim() || null });
      db.users.push(u);
      db.session = u.id;
      save();
      emit();
    },
    async signIn(username, password) {
      const u = db.users.find((x) => x.username === username.trim().toLowerCase());
      if (!u || (await hashPw(password, u.salt)) !== u.hash) throw new Error('Invalid login credentials');
      db.session = u.id;
      save();
      emit();
    },
    async signOut() {
      db.session = null;
      save();
      emit();
    },
    async changePassword(password) {
      const u = me();
      if (password.length < 6) throw new Error('password too short');
      u.salt = uuid();
      u.hash = await hashPw(password, u.salt);
      save();
    },
    async usernameAvailable(username) {
      return delay(!db.users.some((u) => u.username === username.trim().toLowerCase()));
    },
    async updateProfile(patch) {
      const u = me();
      if (patch.first_name !== undefined) u.first_name = patch.first_name;
      if (patch.last_name !== undefined) u.last_name = patch.last_name;
      if (patch.avatar !== undefined) u.avatar = patch.avatar;
      if (patch.stream !== undefined) u.stream = patch.stream || null;
      save();
      emit();
    },
    async uploadAvatar(photo) {
      me();
      return blobToDataUrl(photo);
    },
    async myTests() {
      const u = me();
      const rows = db.tests.filter((t) => t.published || db.attempts.some((a) => a.test_id === t.id && a.user_id === u.id));
      return delay(rows.sort((a, b) => b.created_at.localeCompare(a.created_at)).map((t) => {
        const a = db.attempts.find((x) => x.test_id === t.id && x.user_id === u.id);
        return { id: t.id, title: t.title, description: t.description, question_count: t.questions.length, created_at: t.created_at,
          score: a?.score ?? null, max_score: a?.max_score ?? null, done_at: a?.created_at ?? null };
      }));
    },
    async getTest(id) {
      const u = me();
      const t = db.tests.find((x) => x.id === id);
      const a = db.attempts.find((x) => x.test_id === id && x.user_id === u.id);
      if (!t || (!a && !t.published && u.role !== 'admin')) throw new Error('test not found');
      return delay({
        id: t.id, title: t.title, description: t.description,
        questions: t.questions.map((q) => ({ q: q.q, options: q.options, type: q.type ?? 'single' })),
        attempt: a ? { score: a.score, max_score: a.max_score, answers: a.answers, created_at: a.created_at,
          correct: t.questions.map(correctOf), explain: t.questions.map((q) => q.explain || null) } : null,
      });
    },
    async submitTest(id, answers) {
      const u = me();
      if (u.role !== 'student') throw new Error('forbidden');
      const t = db.tests.find((x) => x.id === id && x.published);
      if (!t) throw new Error('test not found');
      if (db.attempts.some((a) => a.test_id === id && a.user_id === u.id)) throw new Error('test already answered');
      const clean = t.questions.map((q, i) => cleanAnswer(q, answers[i]));
      const score = clean.filter((a, i) => sameAnswer(a, correctOf(t.questions[i]))).length;
      db.attempts.push({ test_id: id, user_id: u.id, score, max_score: t.questions.length, answers: clean, created_at: now() });
      const xp = score * 10;
      award(u, xp, 'test', t.title);
      touch(u);
      const achievements = checkAchievements(u);
      save();
      return { score, max_score: t.questions.length, xp, bonus: 0, achievements,
        correct: t.questions.map(correctOf), explain: t.questions.map((q) => q.explain || null) };
    },
    async explainQuestion(testId, index) {
      const u = me();
      const t = db.tests.find((x) => x.id === testId);
      const q = t?.questions[index];
      if (!t || !q) throw new Error('test not found');
      if (u.role !== 'admin' && !db.attempts.some((a) => a.test_id === testId && a.user_id === u.id)) throw new Error('forbidden');
      if (!q.explain) { q.explain = demoExplain(q); save(); }
      await new Promise((r) => setTimeout(r, 900));
      return q.explain;
    },
    async testRating() {
      me();
      const rows = db.users.filter((x) => x.role === 'student' && !x.is_blocked).map((x) => {
        const mine = db.attempts.filter((a) => a.user_id === x.id);
        return { id: x.id, first_name: x.first_name, last_name: x.last_name, avatar: x.avatar, stream: x.stream,
          points: mine.reduce((s, a) => s + a.score, 0), tests_done: mine.length };
      }).sort((a, b) => b.points - a.points || a.last_name.localeCompare(b.last_name, 'kk'));
      return delay(rows.map((r) => ({ ...r, rank: rows.filter((y) => y.points > r.points).length + 1 })));
    },

    async myComicReview(comicId) {
      const u = me();
      const r = db.reviews.find((x) => x.comic_id === comicId && x.user_id === u.id);
      return delay(r ? { rating: r.rating, comment: r.comment, updated_at: r.updated_at } : null);
    },
    async rateComic(comicId, rating, comment) {
      const u = me();
      if (u.role !== 'student') throw new Error('forbidden');
      if (!(rating >= 1 && rating <= 5)) throw new Error('invalid rating');
      if (!db.comics.some((c) => c.id === comicId && c.published)) throw new Error('comic not found');
      if (!db.progress.some((p) => p.user_id === u.id && p.item_type === 'comic' && p.item_id === comicId && p.completed)) throw new Error('finish the comic first');
      const c = comment.trim().slice(0, 1000);
      const r = db.reviews.find((x) => x.comic_id === comicId && x.user_id === u.id);
      if (r) Object.assign(r, { rating, comment: c, updated_at: now() });
      else db.reviews.push({ comic_id: comicId, user_id: u.id, rating, comment: c, updated_at: now() });
      save();
    },
    async sendSuggestion(i) {
      const u = me();
      if (u.role !== 'student') throw new Error('forbidden');
      const body = i.body.trim();
      if (body.length < 3) throw new Error('suggestion too short');
      if (db.suggestions.filter((x) => x.user_id === u.id && Date.now() - Date.parse(x.created_at) < 864e5).length >= 10) throw new Error('too many suggestions');
      const target = i.topic === 'platform' ? null : i.target_id;
      const title = !target ? '' : i.topic === 'comic' ? db.comics.find((c) => c.id === target)?.title ?? '' : db.materials.find((m) => m.id === target)?.title ?? '';
      db.suggestions.unshift({ id: uuid(), user_id: u.id, author_name: fullName(u), stream: u.stream, topic: i.topic, target_id: target,
        target_title: title, body: body.slice(0, 2000), is_read: false, created_at: now() });
      save();
    },

    async listMaterials() {
      me();
      const rows = [...db.materials].sort((a, b) => b.created_at.localeCompare(a.created_at));
      return Promise.all(rows.map(async (m) => {
        let url: string | null = null;
        if (m.file_path.startsWith('idb:')) {
          const b = await idbGet(m.file_path);
          url = b ? URL.createObjectURL(b) : null;
        } else url = staticUrl(m.file_path);
        return { ...m, url };
      }));
    },
    async saveMaterial(input) {
      const u = admin();
      const id = uuid();
      const file_path = `idb:materials/${id}`;
      await idbPut(file_path, input.file);
      const m = { id, author_id: u.id, author_name: fullName(u) || 'INFOLAKTIKA', title: input.title.trim(), description: input.description.trim(),
        file_path, file_name: input.file.name, mime: input.file.type, size: input.file.size, created_at: now() };
      db.materials.unshift(m);
      for (const s of db.users.filter((x) => x.role === 'student')) notify(s.id, 'Жаңа материал 📎', m.title, '/app/materials');
      save();
    },
    async deleteMaterial(m) {
      admin();
      db.materials = db.materials.filter((x) => x.id !== m.id);
      if (m.file_path.startsWith('idb:')) await idbDel(m.file_path);
      save();
    },

    async adminTests() {
      admin();
      return delay([...db.tests].sort((a, b) => b.created_at.localeCompare(a.created_at)));
    },
    async saveTest(t) {
      const u = admin();
      const qs = t.questions;
      if (!qs.length || qs.length > 50 || qs.some((q) => !q.q.trim() || q.options.length !== 4 || q.options.some((o) => !o.trim())
        || (q.type === 'multi' ? !(q.answers?.length && q.answers.every((a) => a >= 0 && a <= 3)) : !(q.answer >= 0 && q.answer <= 3))))
        throw new Error('invalid question');
      const row = { title: t.title.trim(), description: t.description.trim(), questions: qs, published: t.published, updated_at: now() };
      const existing = t.id ? db.tests.find((x) => x.id === t.id) : undefined;
      if (t.id && !existing) throw new Error('test not found');
      if (existing) {
        // same rule as the database: an unchanged explanation of a changed question is dropped
        row.questions = qs.map((q, i) => {
          const o = existing.questions[i];
          const changed = o && (o.q !== q.q || JSON.stringify(o.options) !== JSON.stringify(q.options) || (o.type ?? 'single') !== (q.type ?? 'single')
            || JSON.stringify(correctOf(o)) !== JSON.stringify(correctOf(q)));
          return changed && q.explain && q.explain === o.explain ? { ...q, explain: null } : q;
        });
        const wasPublished = existing.published;
        Object.assign(existing, row);
        if (row.published && !wasPublished) notifyTest(existing);
      } else {
        const nt: Test = { ...row, id: uuid(), author_id: u.id, created_at: now() };
        db.tests.unshift(nt);
        if (nt.published) notifyTest(nt);
      }
      save();
    },
    async draftExplain(q) {
      admin();
      await new Promise((r) => setTimeout(r, 900));
      return demoExplain(q);
    },
    async deleteTest(id) {
      admin();
      db.tests = db.tests.filter((x) => x.id !== id);
      db.attempts = db.attempts.filter((a) => a.test_id !== id);
      save();
    },
    async testResults(id) {
      admin();
      return delay(db.attempts.filter((a) => a.test_id === id).sort((a, b) => b.score - a.score || a.created_at.localeCompare(b.created_at)).map((a) => {
        const s = db.users.find((x) => x.id === a.user_id);
        return { user_id: a.user_id, first_name: s?.first_name ?? '—', last_name: s?.last_name ?? '', avatar: s?.avatar ?? 'robot-1',
          stream: s?.stream ?? null, score: a.score, max_score: a.max_score, created_at: a.created_at };
      }));
    },
    async ping() {
      const u = me();
      touch(u);
      checkAchievements(u);
      save();
    },

    async listComics() {
      return delay([...visible(db.comics)].sort((a, b) => b.created_at.localeCompare(a.created_at)));
    },
    async getComic(id) {
      return delay(visible(db.comics).find((c) => c.id === id) ?? null);
    },
    async listBooks() {
      return delay([...visible(db.books)].sort((a, b) => b.created_at.localeCompare(a.created_at)));
    },
    async getBook(id) {
      return delay(visible(db.books).find((c) => c.id === id) ?? null);
    },
    async listGames() {
      return delay([...visible(db.games)].sort((a, b) => a.sort - b.sort));
    },
    async getGame(id) {
      return delay(visible(db.games).find((g) => g.id === id || g.slug === id) ?? null);
    },
    async loadPdf(path) {
      if (path.startsWith('idb:')) {
        const b = await idbGet(path);
        if (!b) throw new Error('PDF табылмады');
        return b.arrayBuffer();
      }
      const r = await fetch(staticUrl(path));
      if (!r.ok) throw new Error('PDF табылмады');
      return r.arrayBuffer();
    },
    coverSrc(cover) {
      if (!cover) return null;
      if (/^(https?:|data:|blob:)/.test(cover)) return cover;
      return staticUrl(cover);
    },

    async listProgress() {
      const u = me();
      return delay(db.progress.filter((p) => p.user_id === u.id));
    },
    async saveProgress(type: ItemType, id, page, total): Promise<RewardResult> {
      const u = me();
      const item = (type === 'comic' ? db.comics : db.books).find((x) => x.id === id && x.published);
      if (!item) throw new Error('item not found');
      total = Math.max(total || 1, 1);
      page = Math.max(1, Math.min(page || 1, total));
      let p = db.progress.find((x) => x.user_id === u.id && x.item_type === type && x.item_id === id);
      const wasDone = !!p?.completed;
      const nowDone = page >= total;
      if (!p) {
        p = { user_id: u.id, item_type: type, item_id: id, last_page: page, total_pages: total, completed: false, completed_at: null, updated_at: now() };
        db.progress.push(p);
      }
      Object.assign(p, { last_page: page, total_pages: total, updated_at: now(), completed: p.completed || nowDone, completed_at: p.completed_at ?? (nowDone ? now() : null) });
      let xp = 0;
      if (nowDone && !wasDone) {
        xp = type === 'comic' ? db.settings.xp_comic : db.settings.xp_book;
        award(u, xp, type, item.title);
      }
      touch(u);
      const bonus = checkMissions(u);
      const achievements = checkAchievements(u);
      save();
      return { xp, bonus, achievements, completed_now: nowDone && !wasDone };
    },
    async completeGame(gameId, score, max, durationSec) {
      const u = me();
      const g = db.games.find((x) => x.id === gameId && x.published);
      if (!g) throw new Error('game not found');
      if (max <= 0) throw new Error('invalid max score');
      score = Math.max(0, Math.min(score, max));
      const ratio = score / max;
      const prev = db.results.filter((r) => r.user_id === u.id && r.game_id === gameId).reduce((m, r) => Math.max(m, r.score / r.max_score), 0);
      const xp = Math.max(0, Math.round(g.xp_reward * (ratio - prev)));
      db.results.push({ id: uuid(), user_id: u.id, game_id: gameId, score, max_score: max, xp_earned: xp, duration_sec: durationSec, created_at: now() });
      award(u, xp, 'game', g.title);
      touch(u);
      const bonus = checkMissions(u);
      const achievements = checkAchievements(u);
      save();
      return { xp, bonus, achievements, best: Math.max(prev, ratio) };
    },
    async myResults() {
      const u = me();
      return delay(db.results.filter((r) => r.user_id === u.id).sort((a, b) => b.created_at.localeCompare(a.created_at)));
    },
    async daily() {
      const u = me();
      const c = todaysChallenge();
      const done = db.daily.find((d) => d.user_id === u.id && d.day === todayKZ());
      return delay({
        id: c.id, question: c.question, options: c.options, xp: db.settings.xp_daily, done: !!done, correct: done?.correct ?? null,
        answer: done ? c.answer : null, explanation: done ? c.explanation : null,
      });
    },
    async submitDaily(answer): Promise<DailyResult> {
      const u = me();
      if (db.daily.some((d) => d.user_id === u.id && d.day === todayKZ())) throw new Error('already answered today');
      const c = todaysChallenge();
      const correct = answer === c.answer;
      db.daily.push({ user_id: u.id, day: todayKZ(), challenge_id: c.id, correct });
      let xp = 0;
      if (correct) { xp = db.settings.xp_daily; award(u, xp, 'daily', todayKZ()); }
      touch(u);
      const bonus = checkMissions(u);
      const achievements = checkAchievements(u);
      save();
      return { correct, answer: c.answer, explanation: c.explanation, xp, bonus, achievements };
    },
    async myStats() {
      const u = me();
      const t = todayKZ();
      const week = Array.from({ length: 7 }, (_, i) => {
        const day = addDays(t, i - 6);
        return { day, xp: db.xp.filter((x) => x.user_id === u.id && dayOf(x.created_at) === day).reduce((s, x) => s + x.amount, 0) };
      });
      const students = db.users.filter((x) => x.role === 'student' && !x.is_blocked);
      return delay({
        xp: u.xp, level: levelFor(u.xp).level, streak: u.streak, best_streak: u.best_streak,
        rank: students.filter((s) => s.xp > u.xp).length + 1,
        games_completed: new Set(db.results.filter((r) => r.user_id === u.id).map((r) => r.game_id)).size,
        games_total: db.games.filter((g) => g.published).length,
        comics_read: db.progress.filter((p) => p.user_id === u.id && p.item_type === 'comic' && p.completed).length,
        comics_total: db.comics.filter((c) => c.published).length,
        books_read: db.progress.filter((p) => p.user_id === u.id && p.item_type === 'book' && p.completed).length,
        books_total: db.books.filter((c) => c.published).length,
        missions: missions(u), week,
      });
    },
    async leaderboard() {
      const s = db.users.filter((x) => x.role === 'student' && !x.is_blocked).sort((a, b) => b.xp - a.xp || a.created_at.localeCompare(b.created_at));
      return delay(s.map((x) => ({
        rank: s.filter((y) => y.xp > x.xp).length + 1, id: x.id, first_name: x.first_name, last_name: x.last_name,
        username: x.username, avatar: x.avatar, xp: x.xp, level: levelFor(x.xp).level, streak: x.streak,
      })));
    },
    async achievements() {
      const u = me();
      return delay({
        all: seed.achievements as Achievement[],
        earned: Object.fromEntries(db.earned.filter((e) => e.user_id === u.id).map((e) => [e.code, e.earned_at])),
      });
    },
    async xpHistory() {
      const u = me();
      return delay(db.xp.filter((x) => x.user_id === u.id).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 30));
    },
    async notifications() {
      const u = me();
      return delay(db.notifications.filter((n) => n.user_id === u.id).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 30));
    },
    async markNotificationsRead() {
      const u = me();
      db.notifications.forEach((n) => { if (n.user_id === u.id) n.read = true; });
      save();
    },
    async settings() {
      return delay({ ...db.settings });
    },

    saveComic: (i) => saveContent('comics', i),
    async deleteComic(c) {
      admin();
      db.comics = db.comics.filter((x) => x.id !== c.id);
      db.reviews = db.reviews.filter((r) => r.comic_id !== c.id);
      db.progress = db.progress.filter((p) => !(p.item_type === 'comic' && p.item_id === c.id));
      if (c.pdf_path.startsWith('idb:')) await idbDel(c.pdf_path);
      save();
    },
    saveBook: (i) => saveContent('books', i),
    async deleteBook(b) {
      admin();
      db.books = db.books.filter((x) => x.id !== b.id);
      db.progress = db.progress.filter((p) => !(p.item_type === 'book' && p.item_id === b.id));
      if (b.pdf_path.startsWith('idb:')) await idbDel(b.pdf_path);
      save();
    },
    async saveGame(g) {
      admin();
      const existing = g.id ? db.games.find((x) => x.id === g.id) : undefined;
      if (existing) Object.assign(existing, g);
      else {
        if (db.games.some((x) => x.slug === g.slug)) throw new Error('Бұл slug бос емес.');
        db.games.push({ ...(g as Game), id: uuid(), created_at: now() });
      }
      save();
    },
    async deleteGame(id) {
      admin();
      db.games = db.games.filter((g) => g.id !== id);
      db.results = db.results.filter((r) => r.game_id !== id);
      save();
    },
    async adminStudents() {
      admin();
      return delay(db.users.filter((u) => u.role === 'student').sort((a, b) => b.created_at.localeCompare(a.created_at)).map((u) => {
        const pr = db.progress.filter((p) => p.user_id === u.id);
        return {
          id: u.id, first_name: u.first_name, last_name: u.last_name, username: u.username, created_at: u.created_at,
          xp: u.xp, level: levelFor(u.xp).level, streak: u.streak, last_active: u.last_active, is_blocked: u.is_blocked,
          games_completed: new Set(db.results.filter((r) => r.user_id === u.id).map((r) => r.game_id)).size,
          comics_read: pr.filter((p) => p.item_type === 'comic' && p.completed).length,
          books_read: pr.filter((p) => p.item_type === 'book' && p.completed).length,
          pages_read: pr.reduce((s, p) => s + p.last_page, 0),
        };
      }));
    },
    async adminStudentDetail(id) {
      admin();
      const u = db.users.find((x) => x.id === id);
      if (!u) throw new Error('not found');
      return delay({
        profile: { ...strip(u), level: levelFor(u.xp).level },
        results: db.results.filter((r) => r.user_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at)).map((r) => {
          const g = db.games.find((x) => x.id === r.game_id);
          return { title: g?.title ?? '—', type: g?.type ?? 'quiz', score: r.score, max_score: r.max_score, xp_earned: r.xp_earned, created_at: r.created_at };
        }),
        reading: db.progress.filter((p) => p.user_id === id).map((p) => ({
          item_type: p.item_type,
          title: (p.item_type === 'comic' ? db.comics : db.books).find((x) => x.id === p.item_id)?.title ?? '—',
          last_page: p.last_page, total_pages: p.total_pages, completed: p.completed, updated_at: p.updated_at,
        })),
        achievements: db.earned.filter((e) => e.user_id === id).map((e) => {
          const a = seed.achievements.find((x) => x.code === e.code)!;
          return { code: e.code, title: a.title, icon: a.icon, earned_at: e.earned_at };
        }),
      });
    },
    async adminSetBlocked(id, blocked) {
      admin();
      const u = db.users.find((x) => x.id === id && x.role !== 'admin');
      if (u) u.is_blocked = blocked;
      save();
    },
    async adminAdjustXp(id, amount) {
      admin();
      const u = db.users.find((x) => x.id === id);
      if (u) award(u, amount, 'admin', 'Әкімші түзетуі');
      save();
    },
    async adminDeleteStudent(id) {
      admin();
      const u = db.users.find((x) => x.id === id);
      if (u?.role === 'admin') throw new Error('cannot delete admin');
      removeUser(id);
      save();
    },
    async adminComicRatings() {
      admin();
      const by = new Map<string, { sum: number; n: number; c: number }>();
      for (const r of db.reviews) {
        const x = by.get(r.comic_id) ?? { sum: 0, n: 0, c: 0 };
        x.sum += r.rating; x.n += 1; if (r.comment) x.c += 1;
        by.set(r.comic_id, x);
      }
      return delay([...by].map(([comic_id, x]) => ({ comic_id, avg_rating: Math.round((x.sum / x.n) * 100) / 100, reviews: x.n, comments: x.c })));
    },
    async adminComicReviews(comicId) {
      admin();
      return delay(db.reviews.filter((r) => r.comic_id === comicId).sort((a, b) => b.updated_at.localeCompare(a.updated_at)).map((r) => {
        const u = db.users.find((x) => x.id === r.user_id);
        return { user_id: r.user_id, first_name: u?.first_name ?? '—', last_name: u?.last_name ?? '', avatar: u?.avatar ?? 'robot-1',
          stream: u?.stream ?? null, rating: r.rating, comment: r.comment, updated_at: r.updated_at };
      }));
    },
    async adminDeleteComicReview(comicId, userId) {
      admin();
      db.reviews = db.reviews.filter((r) => !(r.comic_id === comicId && r.user_id === userId));
      save();
    },
    async adminSuggestions() {
      admin();
      return delay([...db.suggestions].sort((a, b) => b.created_at.localeCompare(a.created_at)));
    },
    async adminMarkSuggestion(id, read) {
      admin();
      const x = db.suggestions.find((s) => s.id === id);
      if (x) x.is_read = read;
      save();
    },
    async adminDeleteSuggestion(id) {
      admin();
      db.suggestions = db.suggestions.filter((s) => s.id !== id);
      save();
    },
    async adminUsers() {
      admin();
      return delay(db.users.filter((u) => u.role === 'student').sort((a, b) => b.created_at.localeCompare(a.created_at)).map((u) => {
        const mine = db.attempts.filter((a) => a.user_id === u.id);
        return {
          id: u.id, first_name: u.first_name, last_name: u.last_name, username: u.username, stream: u.stream, created_at: u.created_at,
          xp: u.xp, level: levelFor(u.xp).level, last_active: u.last_active, is_blocked: u.is_blocked,
          tests_done: mine.length, test_points: mine.reduce((x, a) => x + a.score, 0),
        };
      }));
    },
    async adminStats() {
      admin();
      const t = todayKZ();
      const students = db.users.filter((u) => u.role === 'student');
      return delay({
        students: students.length,
        active_today: students.filter((s) => s.last_active === t).length,
        comics: db.comics.length, books: db.books.length, games: db.games.length,
        games_completed: db.results.length,
        xp_total: students.reduce((s, u) => s + u.xp, 0),
        popular_comics: db.comics.map((c) => {
          const pr = db.progress.filter((p) => p.item_type === 'comic' && p.item_id === c.id);
          return { title: c.title, readers: pr.length, finished: pr.filter((p) => p.completed).length };
        }).sort((a, b) => b.readers - a.readers).slice(0, 5),
        popular_books: db.books.map((c) => ({ title: c.title, readers: db.progress.filter((p) => p.item_type === 'book' && p.item_id === c.id).length }))
          .sort((a, b) => b.readers - a.readers).slice(0, 5),
        popular_games: db.games.map((g) => {
          const rs = db.results.filter((r) => r.game_id === g.id);
          return { title: g.title, plays: rs.length, avg_pct: rs.length ? Math.round((rs.reduce((s, r) => s + r.score / r.max_score, 0) / rs.length) * 100) : null };
        }).sort((a, b) => b.plays - a.plays).slice(0, 6),
        activity: Array.from({ length: 14 }, (_, i) => {
          const day = addDays(t, i - 13);
          const ev = db.xp.filter((x) => dayOf(x.created_at) === day);
          return { day, users: new Set(ev.map((e) => e.user_id)).size, events: ev.length };
        }),
        levels: [1, 2, 3, 4, 5].map((level) => ({ level, count: students.filter((s) => levelFor(s.xp).level === level).length })),
      });
    },
    async saveSettings(s) {
      admin();
      db.settings = { ...s };
      save();
    },
  };
  return api;
}

/** Wipes the demo database (used from admin Settings in demo mode). */
export function resetDemo() {
  localStorage.removeItem(KEY);
  indexedDB.deleteDatabase('infolaktika-demo');
}
