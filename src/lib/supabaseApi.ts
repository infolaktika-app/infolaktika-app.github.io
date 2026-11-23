import { createClient } from '@supabase/supabase-js';
import type { Api } from './api';
import { staticUrl } from './api';
import type { Achievement, Book, Comic, ContentInput, Game, Material, Profile, Test } from './types';

export function createSupabaseApi(url: string, anonKey: string, emailDomain: string): Api {
  const sb = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'infolaktika-auth' },
  });

  const emailFor = (username: string) => `${username.trim().toLowerCase()}@${emailDomain}`;

  async function uid() {
    const { data } = await sb.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new Error('not authenticated');
    return id;
  }

  function check<T>(res: { data: T; error: any }): T {
    if (res.error) throw res.error;
    return res.data;
  }

  async function rpc<T = any>(fn: string, args?: Record<string, unknown>): Promise<T> {
    const { data, error } = await sb.rpc(fn, args);
    if (error) throw error;
    return data as T;
  }

  const isStatic = (p: string | null | undefined) => !!p && p.startsWith('sample/');

  async function uploadFiles(kind: 'comics' | 'books', id: string, input: ContentInput) {
    const out: { pdf_path?: string; cover_url?: string } = {};
    const stamp = Date.now().toString(36);
    if (input.pdfFile) {
      const path = `${kind}/${id}-${stamp}.pdf`;
      check(await sb.storage.from('pdfs').upload(path, input.pdfFile, { contentType: 'application/pdf', upsert: true }));
      out.pdf_path = path;
    }
    if (input.coverFile) {
      const ext = input.coverFile.type === 'image/png' ? 'png' : input.coverFile.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${kind}/${id}-${stamp}.${ext}`;
      check(await sb.storage.from('covers').upload(path, input.coverFile, { contentType: input.coverFile.type || 'image/jpeg', upsert: true }));
      out.cover_url = path;
    }
    return out;
  }

  async function removeFiles(pdf: string | null | undefined, cover: string | null | undefined) {
    if (pdf && !isStatic(pdf)) await sb.storage.from('pdfs').remove([pdf]);
    if (cover && !isStatic(cover) && !/^https?:/.test(cover)) await sb.storage.from('covers').remove([cover]);
  }

  async function saveContent(table: 'comics' | 'books', input: ContentInput) {
    const id = input.id ?? crypto.randomUUID();
    let previous: { pdf_path: string; cover_url: string | null } | null = null;
    if (input.id) {
      previous = check(await sb.from(table).select('pdf_path, cover_url').eq('id', input.id).single());
    } else if (!input.pdfFile) {
      throw new Error('PDF файлын таңдаңыз.');
    }
    const files = await uploadFiles(table, id, input);
    const row: Record<string, unknown> = {
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      published: input.published,
      pages: input.pages,
      ...files,
    };
    if (table === 'books') row.author = (input.author ?? '').trim();
    if (input.id) {
      check(await sb.from(table).update(row).eq('id', id));
      // Remove replaced files only after the row points at the new ones.
      await removeFiles(files.pdf_path ? previous?.pdf_path : null, files.cover_url ? previous?.cover_url : null);
    } else {
      row.id = id;
      row.created_by = await uid();
      check(await sb.from(table).insert(row));
    }
  }

  const api: Api = {
    mode: 'supabase',

    async currentProfile() {
      const { data } = await sb.auth.getSession();
      if (!data.session) return null;
      const res = await sb.from('profiles').select('*').eq('id', data.session.user.id).maybeSingle();
      if (res.error) throw res.error;
      return (res.data as Profile) ?? null;
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') setTimeout(cb, 0);
      });
      return () => data.subscription.unsubscribe();
    },
    async signUp(i) {
      const username = i.username.trim().toLowerCase();
      if (!(await api.usernameAvailable(username))) throw new Error('already exists');
      const meta = { first_name: i.first_name.trim(), last_name: i.last_name.trim(), username, stream: i.stream.trim() };
      const { data, error } = await sb.auth.signUp({ email: emailFor(username), password: i.password, options: { data: meta } });
      if (error) throw error;
      if (!data.session) {
        throw new Error('Тіркелу сәтті, бірақ Supabase email растауды талап етеді. Әкімші Authentication → Providers → Email → "Confirm email" параметрін өшіруі керек.');
      }
    },
    async signIn(username, password) {
      const { error } = await sb.auth.signInWithPassword({ email: emailFor(username), password });
      if (error) throw error;
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async changePassword(password) {
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw error;
    },
    async usernameAvailable(username) {
      return rpc<boolean>('username_available', { p_username: username.trim().toLowerCase() });
    },
    async updateProfile(patch) {
      check(await sb.from('profiles').update(patch).eq('id', await uid()));
    },
    async uploadAvatar(photo) {
      const me = await uid();
      const path = `${me}/${Date.now().toString(36)}.jpg`;
      check(await sb.storage.from('avatars').upload(path, photo, { contentType: 'image/jpeg', upsert: true }));
      // Tidy up older photos of this user (best effort).
      const { data: old } = await sb.storage.from('avatars').list(me);
      const stale = (old ?? []).map((f) => `${me}/${f.name}`).filter((p) => p !== path);
      if (stale.length) await sb.storage.from('avatars').remove(stale);
      return sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    },
    async ping() {
      await rpc('ping');
    },

    myTests: () => rpc('my_tests'),
    getTest: (id) => rpc('get_test', { p_id: id }),
    submitTest: (id, answers) => rpc('submit_test', { p_id: id, p_answers: answers }),
    testRating: () => rpc('test_rating'),

    async myComicReview(comicId) {
      const { data, error } = await sb.from('comic_reviews').select('rating, comment, updated_at').eq('comic_id', comicId).eq('user_id', await uid()).maybeSingle();
      if (error) throw error;
      return data;
    },
    async rateComic(comicId, rating, comment) {
      await rpc('rate_comic', { p_comic: comicId, p_rating: rating, p_comment: comment });
    },
    async sendSuggestion(i) {
      await rpc('send_suggestion', { p_topic: i.topic, p_target: i.topic === 'platform' ? null : i.target_id, p_body: i.body });
    },

    async listMaterials() {
      const rows = check(await sb.from('materials').select('*').order('created_at', { ascending: false })) as Material[];
      if (rows.length) {
        const { data } = await sb.storage.from('materials').createSignedUrls(rows.map((r) => r.file_path), 60 * 60 * 6);
        const byPath = new Map<string, string>((data ?? []).map((d: any) => [d.path, d.signedUrl]));
        rows.forEach((r) => (r.url = byPath.get(r.file_path) ?? null));
      }
      return rows;
    },
    async saveMaterial(input) {
      const me = await uid();
      const ext = (input.file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6) || 'bin';
      const path = `${me}/${crypto.randomUUID()}.${ext}`;
      check(await sb.storage.from('materials').upload(path, input.file, { contentType: input.file.type || 'application/octet-stream' }));
      const res = await sb.from('materials').insert({
        author_id: me, title: input.title.trim(), description: input.description.trim(), file_path: path,
        file_name: input.file.name.slice(0, 200), mime: input.file.type || '', size: input.file.size,
      });
      if (res.error) {
        await sb.storage.from('materials').remove([path]);
        throw res.error;
      }
    },
    async deleteMaterial(m) {
      check(await sb.from('materials').delete().eq('id', m.id));
      await sb.storage.from('materials').remove([m.file_path]);
    },

    async adminTests() {
      return check(await sb.from('tests').select('*').order('created_at', { ascending: false })) as Test[];
    },
    async saveTest(t) {
      const row = { title: t.title.trim(), description: t.description.trim(), questions: t.questions, published: t.published };
      if (t.id) check(await sb.from('tests').update(row).eq('id', t.id));
      else check(await sb.from('tests').insert({ ...row, author_id: await uid() }));
    },
    async deleteTest(id) {
      check(await sb.from('tests').delete().eq('id', id));
    },
    testResults: (id) => rpc('admin_test_results', { p_test: id }),

    async listComics() {
      return check(await sb.from('comics').select('*').order('created_at', { ascending: false })) as Comic[];
    },
    async getComic(id) {
      return (check(await sb.from('comics').select('*').eq('id', id).maybeSingle()) as Comic) ?? null;
    },
    async listBooks() {
      return check(await sb.from('books').select('*').order('created_at', { ascending: false })) as Book[];
    },
    async getBook(id) {
      return (check(await sb.from('books').select('*').eq('id', id).maybeSingle()) as Book) ?? null;
    },
    async listGames() {
      return check(await sb.from('games').select('*').order('sort').order('created_at')) as Game[];
    },
    async getGame(id) {
      const col = /^[0-9a-f-]{36}$/.test(id) ? 'id' : 'slug';
      return (check(await sb.from('games').select('*').eq(col, id).maybeSingle()) as Game) ?? null;
    },
    async loadPdf(path) {
      if (isStatic(path)) {
        const r = await fetch(staticUrl(path));
        if (!r.ok) throw new Error('PDF табылмады');
        return r.arrayBuffer();
      }
      const blob = check(await sb.storage.from('pdfs').download(path)) as Blob;
      return blob.arrayBuffer();
    },
    coverSrc(cover) {
      if (!cover) return null;
      if (/^(https?:|data:|blob:)/.test(cover)) return cover;
      if (isStatic(cover)) return staticUrl(cover);
      return sb.storage.from('covers').getPublicUrl(cover).data.publicUrl;
    },

    async listProgress() {
      return check(await sb.from('reading_progress').select('*').eq('user_id', await uid()));
    },
    async saveProgress(type, id, page, total) {
      return rpc('save_progress', { p_type: type, p_item: id, p_page: page, p_total: total });
    },
    async completeGame(gameId, score, max, durationSec) {
      return rpc('complete_game', { p_game: gameId, p_score: score, p_max: max, p_duration: durationSec });
    },
    async myResults() {
      return check(await sb.from('game_results').select('*').eq('user_id', await uid()).order('created_at', { ascending: false }));
    },
    async daily() {
      return rpc('get_daily_challenge');
    },
    async submitDaily(answer) {
      return rpc('submit_daily', { p_answer: answer });
    },
    async myStats() {
      return rpc('get_my_stats');
    },
    async leaderboard() {
      return rpc('get_leaderboard', { p_limit: 100 });
    },
    async achievements() {
      const all = check(await sb.from('achievements').select('*').order('sort')) as Achievement[];
      const mine = check(await sb.from('user_achievements').select('code, earned_at').eq('user_id', await uid())) as { code: string; earned_at: string }[];
      return { all, earned: Object.fromEntries(mine.map((m) => [m.code, m.earned_at])) };
    },
    async xpHistory() {
      return check(await sb.from('xp_events').select('amount, reason, ref, created_at').eq('user_id', await uid()).order('created_at', { ascending: false }).limit(30));
    },
    async notifications() {
      return check(await sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(30));
    },
    async markNotificationsRead() {
      check(await sb.from('notifications').update({ read: true }).eq('user_id', await uid()).eq('read', false));
    },
    async settings() {
      return check(await sb.from('settings').select('*').eq('id', 1).single());
    },

    saveComic: (input) => saveContent('comics', input),
    async deleteComic(c) {
      check(await sb.from('comics').delete().eq('id', c.id));
      await removeFiles(c.pdf_path, c.cover_url);
    },
    saveBook: (input) => saveContent('books', input),
    async deleteBook(b) {
      check(await sb.from('books').delete().eq('id', b.id));
      await removeFiles(b.pdf_path, b.cover_url);
    },
    async saveGame(g) {
      const row = {
        title: g.title, description: g.description, category: g.category, difficulty: g.difficulty,
        xp_reward: g.xp_reward, data: g.data, published: g.published, sort: g.sort, type: g.type, slug: g.slug,
      };
      if (g.id) check(await sb.from('games').update(row).eq('id', g.id));
      else check(await sb.from('games').insert(row));
    },
    async deleteGame(id) {
      check(await sb.from('games').delete().eq('id', id));
    },
    adminStudents: () => rpc('admin_students'),
    adminStudentDetail: (id) => rpc('admin_student_detail', { p_uid: id }),
    adminSetBlocked: (id, blocked) => rpc('admin_set_blocked', { p_uid: id, p_blocked: blocked }),
    adminAdjustXp: (id, amount) => rpc('admin_adjust_xp', { p_uid: id, p_amount: amount }),
    adminDeleteStudent: (id) => rpc('admin_delete_student', { p_uid: id }),
    adminStats: () => rpc('admin_stats'),
    adminUsers: () => rpc('admin_users'),
    async adminComicRatings() {
      const rows = (await rpc('admin_comic_ratings')) as any[];
      return rows.map((r) => ({ ...r, avg_rating: Number(r.avg_rating), reviews: Number(r.reviews), comments: Number(r.comments) }));
    },
    adminComicReviews: (comicId) => rpc('admin_comic_reviews', { p_comic: comicId }),
    async adminDeleteComicReview(comicId, userId) {
      check(await sb.from('comic_reviews').delete().eq('comic_id', comicId).eq('user_id', userId));
    },
    async adminSuggestions() {
      return check(await sb.from('suggestions').select('*').order('created_at', { ascending: false }).limit(500));
    },
    async adminMarkSuggestion(id, read) {
      check(await sb.from('suggestions').update({ is_read: read }).eq('id', id));
    },
    async adminDeleteSuggestion(id) {
      check(await sb.from('suggestions').delete().eq('id', id));
    },
    async saveSettings(s) {
      check(await sb.from('settings').update({ ...s, updated_at: new Date().toISOString() }).eq('id', 1));
    },
  };
  return api;
}
