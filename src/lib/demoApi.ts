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
  Notification, Profile, ReadingProgress, RewardResult, Settings,
} from './types';

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
}

const KEY = 'infolaktika-demo-v3';
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
async function makeUser(first: string, last: string, username: string, pw: string, role: 'student' | 'admin', extra: Partial<Profile> = {}): Promise<DemoUser> {
  const salt = uuid();
  return {
    id: uuid(), first_name: first, last_name: last, username, role, avatar: 'robot-1', xp: 0, streak: 0, best_streak: 0,
    last_active: null, is_blocked: false, created_at: now(), salt, hash: await hashPw(pw, salt), ...extra,
  };
}

async function freshDb(): Promise<DB> {
  const t = todayKZ();
  const created = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString();
  const games: Game[] = (seed.games as any[]).map((g) => ({ ...g, id: uuid(), published: true, created_at: created(30) }));
  const db: DB = {
    v: 1, session: null, users: [],
    comics: seed.comics.map((c, i) => ({ ...c, published: true, created_at: created(seed.comics.length - 1 - i) })),
    books: seed.books.map((b, i) => ({ ...b, published: true, created_at: created(10 - i) })),
    games, results: [], progress: [], xp: [], earned: [], daily: [], notifications: [],
    settings: { ...seed.settings },
  };
  db.users.push(await makeUser('Әкімші', '', 'admin', 'admin123', 'admin'));
  // A few classmates so the leaderboard and admin tables are not empty.
  const mates: [string, string, string, number, string, number][] = [
    ['Айгерім', 'Нұрланқызы', 'aigerim', 1340, 'owl', 6],
    ['Нұрсұлтан', 'Ержанұлы', 'nursultan', 980, 'rocket', 4],
    ['Мадина', 'Асқарқызы', 'madina', 720, 'cat', 3],
    ['Арман', 'Болатұлы', 'arman', 455, 'fox', 2],
    ['Дана', 'Серікқызы', 'dana', 260, 'unicorn', 1],
    ['Ерасыл', 'Қайратұлы', 'erasyl', 120, 'panda', 1],
  ];
  for (const [f, l, u, xp, av, streak] of mates) {
    const user = await makeUser(f, l, u, uuid(), 'student', { xp, avatar: av, streak, best_streak: streak, last_active: t, created_at: created(20) });
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
  return db;
}

export async function createDemoApi(): Promise<Api> {
  let db: DB;
  try {
    const raw = localStorage.getItem(KEY);
    db = raw ? JSON.parse(raw) : await freshDb();
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
  const strip = ({ salt, hash, ...p }: DemoUser): Profile => p;
  const notify = (user_id: string, title: string, body: string, link: string | null) =>
    db.notifications.push({ id: uuid(), user_id, title, body, link, read: false, created_at: now() });

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
      const u = await makeUser(i.first_name.trim(), i.last_name.trim(), username, i.password, 'student');
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
      save();
      emit();
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
      const u = db.users.find((x) => x.id === id && x.role === 'student');
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
      db.users = db.users.filter((x) => x.id !== id);
      for (const k of ['results', 'progress', 'xp', 'earned', 'daily', 'notifications'] as const)
        (db as any)[k] = (db as any)[k].filter((x: any) => x.user_id !== id);
      save();
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
