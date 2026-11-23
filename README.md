# INFOLAKTIKA

An interactive platform for learning Informatics through illustrated comics, educational games, a PDF library, and XP and achievements. The interface is in Kazakh.

**Stack:** React 19 + TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage, RLS) · PDF.js · Vite.

---

## Quick start (demo mode, no server)

```bash
npm install
npm run dev
```

If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not set, the app runs in **demo mode**. Everything works, but data lives only in that browser (localStorage + IndexedDB). In demo mode only, there is a demo admin, `admin` / `admin123`, at `/admin/login`. A real deployment has no hardcoded admin.

## Production setup with Supabase

1. **Create a project** at [supabase.com](https://supabase.com).
2. **Turn off email confirmation.** Students sign in with a username, not an email. Go to *Authentication → Providers → Email* and disable **Confirm email**. (Each username is mapped internally to `<username>@infolaktika.app`. You can change the domain with `VITE_LOGIN_EMAIL_DOMAIN`.)
3. **Create the database.** In *SQL Editor*, run `supabase/schema.sql` first, then `supabase/seed.sql`. This sets up:
   - the tables `profiles`, `comics`, `books`, `games`, `game_results`, `reading_progress`, `xp_events`, `achievements`, `user_achievements`, `daily_challenges`, `daily_completions`, `notifications`, `settings`;
   - Row Level Security on every table;
   - Storage buckets: `covers` (public) and `pdfs` (private: signed-in users can read, only admins can write);
   - server-side RPC functions that award XP, levels, streaks, achievements and daily missions. A student cannot raise their own XP directly.
   - sample content: 14 games across all 8 types, 3 comics, 3 books, 12 achievements and 14 daily challenges.
4. **Create `.env`** from `.env.example` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (*Project Settings → API*).
5. **Create the administrator.** The credentials come only from environment variables:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=... ADMIN_USERNAME=admin ADMIN_PASSWORD='strong-password' npm run create-admin
   ```
   The service role key is used only by this script and never ends up in the browser bundle. Running the script again resets the password.
6. Run `npm run dev`, or build with `npm run build` and deploy `dist/`. To publish on **GitHub Pages**, see the section below. SPA rewrites are already included for Vercel (`vercel.json`) and Netlify (`public/_redirects`). For a host without rewrites, set `VITE_HASH_ROUTER=1`.

## Publishing on GitHub Pages (github.io)

The repository includes `.github/workflows/deploy-pages.yml`:
1. Push the project to GitHub (branch `main`).
2. Go to repository **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. Open the **Actions** tab and wait for "Deploy to GitHub Pages" to turn green. The site appears at `https://<username>.github.io/<repo>/`.
4. Optional: to use a real database, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Settings → Secrets and variables → Actions → New repository secret**, then re-run the workflow. Without them the site runs in demo mode.

On Pages, links look like `.../infolaktika/#/app/comics`, because GitHub Pages cannot serve app routes otherwise.

## Updating an existing database

`supabase/schema.sql` is safe to run again. On a project that already ran an earlier version, open *SQL Editor*, paste the **whole new `schema.sql`** and click **Run**. It adds the stream column, the survey/test and material tables, the `avatars` and `materials` buckets, policies and functions without touching existing data (it also removes the short-lived curator role if it was installed). `seed.sql` does not need to run again.

## Roles and security

| | Student | Admin |
|---|---|---|
| Sign up | `/register`: name, login, **stream (поток)**, password. The DB trigger always creates a `student`. | Only via `scripts/create-admin.mjs` (or the Supabase dashboard) |
| Sign in | `/login` | `/admin/login` |
| Content | Comics, books, games, **surveys** (Сауалнамалар) and **materials** | Everything; publishes surveys (4-option questions, results per survey) and materials (PDF/Word/images ≤ 20 MB) that every signed-in student sees |
| Profile | Name, built-in avatar or own photo (`avatars` bucket, own folder only), stream (column-level GRANT) | Students: block, delete, adjust crystals |
| Crystals (XP) / progress | Only through RPCs (`complete_game`, `save_progress`, `submit_daily`, `submit_test`) | `admin_*` RPCs |

**Comic ratings & suggestions.** After finishing a comic a student rates it 1–5 crystals with an optional comment (`rate_comic`; one review per comic, editable). The admin sees the average per comic, the overall average and every comment in *Комикстерді басқару* (`admin_comic_ratings`, `admin_comic_reviews`). On the home page students send suggestions about a comic, a material or the platform (`send_suggestion`, max 10 a day); the admin reads, marks and deletes them in *Ұсыныстар*.

Sign-up can never create an admin. Survey answers are never sent to students before they submit (`get_test` strips them).

`/admin/*` routes are also blocked in the UI, but the real protection is RLS and the `is_admin()` check inside the database.

## Features

- **Student dashboard:** greeting ("Қайырлы күн, Name! 🌟"), continue learning, new comics, games, progress (games, comics, books, XP, level), weekly activity, daily challenge and 3 daily missions with bonus XP.
- **Comics and Library:** 3D "pressed button" hover cards (pressed down + scale + tilt + shadow change), search, category filters, sorting, reading-status filters, recently added.
- **PDF reader:** PDF.js canvas, page navigation (buttons, keyboard, swipe, page number entry), zoom from 50% to 300%, fullscreen, remembers the last page, saves progress to the database, and awards XP when the last page is reached.
- **8 games:** Quiz Battle (timer), Match the Pairs, Code Puzzle, Find the Mistake, True/False, Drag & Drop (mouse and touch), Computer Parts (interactive PC build), Algorithm Maze (command sequence ×N). XP is paid only when a student beats their personal best, so replaying cannot farm XP.
- **Gamification:** 5 levels (Beginner → Informatics Legend: 0/200/600/1200/2200 XP), 12 achievement badges, streaks, leaderboard, notifications.
- **Admin panel:** Dashboard, comic management, book management (PDF upload with automatic page count and cover generated from page 1, cover image, category, publish or draft, preview, edit, delete), game management (content as JSON with structure validation), students (table, progress detail, block, delete, XP adjustment), statistics (charts), Settings (XP amounts, motivational message).

## Design and themes

- Every colour is a shade of `#17404E`. The theme variables live at the top of `src/index.css` (`:root` for light, `[data-theme=dark]` for dark).
- The sun/moon button at the top switches between light and dark. The choice is saved in `localStorage`; on a first visit, the system setting is used.
- Exception: in games, right and wrong answers keep green and red so they stay easy to tell apart.
- The footer of every page shows "made by" with the logo in `public/brand/sagiqx-logo.png`. In dark mode the logo turns white automatically.

## Green accent, cursor effects and the waving robot

- **Accent colour:** `#8CC071` (green) is used alongside `#17404E`: secondary buttons, the progress bar, XP chips, crystals, stars and cursor effects. The tokens are `--leaf` / `--sun` in `src/index.css`.
- **Cursor effects** (`src/components/CursorFX.tsx`, mouse only; off when the system has reduced motion turned on):
  - a follower ring that grows over clickable things;
  - a green light spot on cards that follows the cursor;
  - "magnetic" main buttons;
  - crystal sparkles over the hero sections, and a crystal burst on every click.
- **Waving robot** (`src/components/RobotBuddy.tsx`, on the landing page and the student home page): while idle it gently floats, blinks and its chest light pulses. When the cursor touches it (or it is tapped on a phone), it raises its arm and waves, smiles with "^ ^" eyes and lights up its antenna.
- **Font:** the whole site uses **JUZ40** (Regular / Medium / Bold), loaded from `public/fonts/` (`.woff` + the original `.otf`). Code snippets in the games stay in a monospace font so indentation stays aligned. The sample PDFs were regenerated with JUZ40 too.

## Logo and crystals

- The site logo is `public/brand/infolaktika-logo.png`, a white-on-transparent wordmark. It is used as a CSS mask, so it takes the theme colour automatically. The favicon (`public/favicon.png`) is the "Ф" letter from that logo.
- Glowing data crystals (`Crystal` in `src/components/Art.tsx`) are used as decoration on the main pages.

## Editing content

- Game, achievement and daily challenge text lives in `src/data/seed.json`. After editing, run `npm run seed:sql` to regenerate `supabase/seed.sql`. Games can also be edited directly in the admin panel.
- Sample PDFs are in `public/sample/` and are referenced as `sample/...`. The admin can delete them and upload real material instead.

## Project structure

```
supabase/schema.sql      tables, RLS, storage, RPCs
supabase/seed.sql        sample content (generated)
scripts/create-admin.mjs creates the admin from env
src/lib/                 api (Supabase + demo), auth, router, pdf, constants
src/pages/               student pages
src/games/               8 game engines
src/admin/               admin panel
src/components/          UI, SVG illustrations, cards
```

## Note

Game results are calculated in the browser, and the server clamps scores to the allowed range (`0…max`). That is the usual compromise for client-side educational games.
