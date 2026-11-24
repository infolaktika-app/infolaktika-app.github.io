-- =====================================================================
-- INFOLAKTIKA — Supabase schema
-- Run this whole file once in Supabase → SQL Editor, then run seed.sql.
-- Re-running is safe: objects are created with "if not exists" / "or replace".
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  first_name   text not null default '',
  last_name    text not null default '',
  username     text not null unique check (username ~ '^[a-z0-9_.]{3,24}$'),
  role         text not null default 'student' check (role in ('student','admin')),
  avatar       text not null default 'robot-1',
  xp           integer not null default 0,
  streak       integer not null default 0,
  best_streak  integer not null default 0,
  last_active  date,
  is_blocked   boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.settings (
  id                   integer primary key default 1 check (id = 1),
  motivational_message text not null default 'Әр күн — жаңа білім!',
  xp_comic             integer not null default 50,
  xp_book              integer not null default 100,
  xp_daily             integer not null default 30,
  xp_missions          integer not null default 25,
  updated_at           timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict do nothing;

create table if not exists public.comics (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null default '',
  category    text not null default 'information',
  cover_url   text,
  pdf_path    text not null,
  pages       integer,
  published   boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.books (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  author      text not null default '',
  description text not null default '',
  category    text not null default 'information',
  cover_url   text,
  pdf_path    text not null,
  pages       integer,
  published   boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.games (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  description text not null default '',
  type        text not null check (type in ('quiz','pairs','code_puzzle','find_mistake','true_false','drag_drop','computer_parts','maze')),
  category    text not null,
  difficulty  text not null default 'easy' check (difficulty in ('easy','medium','hard')),
  xp_reward   integer not null default 50 check (xp_reward between 0 and 1000),
  data        jsonb not null default '{}'::jsonb,
  published   boolean not null default true,
  sort        integer not null default 100,
  created_at  timestamptz not null default now()
);

create table if not exists public.game_results (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  game_id      uuid not null references public.games(id) on delete cascade,
  score        integer not null,
  max_score    integer not null,
  xp_earned    integer not null default 0,
  duration_sec integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists game_results_user_idx on public.game_results(user_id);
create index if not exists game_results_game_idx on public.game_results(game_id);

create table if not exists public.reading_progress (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  item_type    text not null check (item_type in ('comic','book')),
  item_id      uuid not null,
  last_page    integer not null default 1,
  total_pages  integer not null default 1,
  completed    boolean not null default false,
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (user_id, item_type, item_id)
);
create index if not exists reading_progress_item_idx on public.reading_progress(item_type, item_id);

create table if not exists public.xp_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  amount     integer not null,
  reason     text not null,           -- game | comic | book | daily | missions | admin
  ref        text,
  created_at timestamptz not null default now()
);
create index if not exists xp_events_user_idx on public.xp_events(user_id, created_at);

create table if not exists public.achievements (
  code        text primary key,
  title       text not null,
  description text not null,
  icon        text not null default '⭐',
  sort        integer not null default 100
);

create table if not exists public.user_achievements (
  user_id   uuid not null references public.profiles(id) on delete cascade,
  code      text not null references public.achievements(code) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, code)
);

create table if not exists public.daily_challenges (
  id          serial primary key,
  question    text not null,
  options     jsonb not null,
  answer      integer not null,
  explanation text not null default ''
);

create table if not exists public.daily_completions (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  day          date not null,
  challenge_id integer not null references public.daily_challenges(id) on delete cascade,
  correct      boolean not null,
  created_at   timestamptz not null default now(),
  primary key (user_id, day)
);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  body       text not null default '',
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 1b. v3 additions: student stream (поток), photo avatars, surveys/tests
--     and materials published by the admin. Safe to re-run on an existing
--     database (also cleans up the short-lived "curator" version).
-- ---------------------------------------------------------------------

alter table public.profiles add column if not exists stream text;
alter table public.profiles drop constraint if exists profiles_stream_check;
alter table public.profiles add constraint profiles_stream_check check (stream is null or stream ~ '^[0-9A-Za-z-]{1,8}$');

-- Remove the curator role (v2) if it was ever installed: former curators become students.
drop trigger if exists profiles_guard on public.profiles;
drop function if exists public._profiles_guard();
alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'student' where role not in ('student','admin');
alter table public.profiles add constraint profiles_role_check check (role in ('student','admin'));
alter table public.profiles drop column if exists curator_id;
alter table public.profiles drop column if exists created_by;
alter table public.profiles drop column if exists curator_status;
alter table public.profiles drop column if exists must_change;
alter table public.profiles drop column if exists phone;

-- avatar is either a built-in avatar id or a photo in the user's own folder of the public "avatars" bucket
alter table public.profiles drop constraint if exists profiles_avatar_check;
alter table public.profiles add constraint profiles_avatar_check check (
  avatar ~ '^[a-z0-9-]{1,20}$'
  or avatar ~ ('^https://[A-Za-z0-9.:-]+/storage/v1/object/public/avatars/' || id::text || '/[A-Za-z0-9._-]+$'));

-- Surveys / tests: 4 options per question, one or several correct (see section 9). Students read them only through RPCs (answers stay hidden).
create table if not exists public.tests (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid references public.profiles(id) on delete set null,
  title       text not null check (length(trim(title)) between 1 and 200),
  description text not null default '',
  questions   jsonb not null default '[]'::jsonb,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'tests' and column_name = 'curator_id') then
    drop policy if exists tests_select on public.tests;
    drop policy if exists tests_insert on public.tests;
    drop policy if exists tests_update on public.tests;
    drop policy if exists tests_delete on public.tests;
    drop policy if exists test_attempts_select on public.test_attempts;
    alter table public.tests rename column curator_id to author_id;
    alter table public.tests alter column author_id drop not null;
    alter table public.tests drop constraint if exists tests_curator_id_fkey;
    alter table public.tests add constraint tests_author_id_fkey foreign key (author_id) references public.profiles(id) on delete set null;
  end if;
end $$;
drop index if exists public.tests_curator_idx;

create table if not exists public.test_attempts (
  test_id    uuid not null references public.tests(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  score      integer not null,
  max_score  integer not null,
  answers    jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  primary key (test_id, user_id)
);
create index if not exists test_attempts_user_idx on public.test_attempts(user_id);

-- Materials (checklists etc.) uploaded by the admin, visible to every signed-in user.
create table if not exists public.materials (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid references public.profiles(id) on delete set null,
  author_name text not null default '',
  title       text not null check (length(trim(title)) between 1 and 200),
  description text not null default '',
  file_path   text not null,
  file_name   text not null default '',
  mime        text not null default '',
  size        integer not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.materials alter column author_id drop not null;
alter table public.materials drop constraint if exists materials_author_id_fkey;
alter table public.materials add constraint materials_author_id_fkey foreign key (author_id) references public.profiles(id) on delete set null;
create index if not exists materials_created_idx on public.materials(created_at desc);

-- ---------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------

-- "Today" is counted in Kazakhstan time so streaks roll over at local midnight.
create or replace function public._today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Almaty')::date $$;

create or replace function public.level_for(p_xp integer) returns integer
language sql immutable as $$
  select case when p_xp >= 2200 then 5 when p_xp >= 1200 then 4
              when p_xp >= 600 then 3 when p_xp >= 200 then 2 else 1 end
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and not is_blocked)
$$;

drop function if exists public.is_curator() cascade;

create or replace function public._require_student() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from profiles where id = uid and is_blocked) then
    raise exception 'account blocked';
  end if;
  return uid;
end $$;

create or replace function public._award(p_uid uuid, p_amount integer, p_reason text, p_ref text)
returns void language plpgsql security definer set search_path = public as $$
declare old_level int; new_level int; new_xp int;
begin
  if p_amount = 0 then return; end if;
  select level_for(xp) into old_level from profiles where id = p_uid;
  update profiles set xp = greatest(0, xp + p_amount) where id = p_uid returning xp into new_xp;
  insert into xp_events(user_id, amount, reason, ref) values (p_uid, p_amount, p_reason, p_ref);
  new_level := level_for(new_xp);
  if new_level > old_level then
    insert into notifications(user_id, title, body, link)
    values (p_uid, 'Жаңа деңгей! 🎉', 'Құттықтаймыз! Сен ' || new_level || '-деңгейге көтерілдің.', '/app/achievements');
  end if;
end $$;

create or replace function public._touch(p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare p profiles; t date := _today();
begin
  select * into p from profiles where id = p_uid;
  if p.last_active = t then return; end if;
  update profiles set
    streak = case when p.last_active = t - 1 then p.streak + 1 else 1 end,
    best_streak = greatest(p.best_streak, case when p.last_active = t - 1 then p.streak + 1 else 1 end),
    last_active = t
  where id = p_uid;
end $$;

create or replace function public._grant(p_uid uuid, p_code text, inout acc jsonb)
language plpgsql security definer set search_path = public as $$
declare a achievements;
begin
  insert into user_achievements(user_id, code) values (p_uid, p_code) on conflict do nothing;
  if found then
    select * into a from achievements where code = p_code;
    if a.code is not null then
      insert into notifications(user_id, title, body, link)
      values (p_uid, 'Жаңа жетістік: ' || a.title || ' ' || a.icon, a.description, '/app/achievements');
      acc := acc || jsonb_build_array(jsonb_build_object('code', a.code, 'title', a.title, 'icon', a.icon));
    end if;
  end if;
end $$;

create or replace function public._check_achievements(p_uid uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare acc jsonb := '[]'::jsonb; games_done int; comics_done int; books_done int; dailies int; perfect bool; p profiles;
begin
  select * into p from profiles where id = p_uid;
  select count(distinct game_id) into games_done from game_results where user_id = p_uid;
  select exists(select 1 from game_results where user_id = p_uid and score >= max_score) into perfect;
  select count(*) into comics_done from reading_progress where user_id = p_uid and item_type = 'comic' and completed;
  select count(*) into books_done from reading_progress where user_id = p_uid and item_type = 'book' and completed;
  select count(*) into dailies from daily_completions where user_id = p_uid and correct;

  if games_done >= 1  then acc := _grant(p_uid, 'first_game', acc); end if;
  if games_done >= 5  then acc := _grant(p_uid, 'games_5', acc); end if;
  if games_done >= 10 then acc := _grant(p_uid, 'games_10', acc); end if;
  if perfect          then acc := _grant(p_uid, 'perfect', acc); end if;
  if comics_done >= 1 then acc := _grant(p_uid, 'comic_1', acc); end if;
  if comics_done >= 3 then acc := _grant(p_uid, 'comic_3', acc); end if;
  if books_done >= 1  then acc := _grant(p_uid, 'book_1', acc); end if;
  if p.streak >= 3    then acc := _grant(p_uid, 'streak_3', acc); end if;
  if p.streak >= 7    then acc := _grant(p_uid, 'streak_7', acc); end if;
  if dailies >= 5     then acc := _grant(p_uid, 'daily_5', acc); end if;
  if p.xp >= 500      then acc := _grant(p_uid, 'xp_500', acc); end if;
  if level_for(p.xp) >= 4 then acc := _grant(p_uid, 'level_4', acc); end if;
  return acc;
end $$;

-- Daily missions: play a game, read something, solve the daily challenge.
create or replace function public._missions(p_uid uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'game',  exists(select 1 from game_results where user_id = p_uid and (created_at at time zone 'Asia/Almaty')::date = _today()),
    'read',  exists(select 1 from reading_progress where user_id = p_uid and (updated_at at time zone 'Asia/Almaty')::date = _today()),
    'daily', exists(select 1 from daily_completions where user_id = p_uid and day = _today()),
    'bonus', exists(select 1 from xp_events where user_id = p_uid and reason = 'missions' and ref = _today()::text)
  )
$$;

create or replace function public._check_missions(p_uid uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare m jsonb := _missions(p_uid); bonus int;
begin
  if (m->>'game')::bool and (m->>'read')::bool and (m->>'daily')::bool and not (m->>'bonus')::bool then
    select xp_missions into bonus from settings where id = 1;
    perform _award(p_uid, bonus, 'missions', _today()::text);
    return bonus;
  end if;
  return 0;
end $$;

-- ---------------------------------------------------------------------
-- 3. New-user trigger (role is ALWAYS student here; admins are promoted
--    with the service key by scripts/create-admin.mjs or in the dashboard)
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, first_name, last_name, username, stream)
  values (
    new.id,
    coalesce(m->>'first_name', ''),
    coalesce(m->>'last_name', ''),
    lower(coalesce(m->>'username', split_part(new.email, '@', 1))),
    nullif(trim(coalesce(m->>'stream', '')), '')
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Notify every student when new content is published.
create or replace function public._notify_new_content()
returns trigger language plpgsql security definer set search_path = public as $$
declare kind text := case when tg_table_name = 'comics' then 'comic' else 'book' end;
begin
  if new.published and (tg_op = 'INSERT' or not old.published) then
    insert into notifications(user_id, title, body, link)
    select id,
           case when kind = 'comic' then 'Жаңа комикс! 🦸' else 'Жаңа кітап! 📚' end,
           new.title,
           case when kind = 'comic' then '/app/comics/' else '/app/books/' end || new.id
    from profiles where role = 'student';
  end if;
  return new;
end $$;

drop trigger if exists comics_notify on public.comics;
create trigger comics_notify after insert or update of published on public.comics
  for each row execute function public._notify_new_content();
drop trigger if exists books_notify on public.books;
create trigger books_notify after insert or update of published on public.books
  for each row execute function public._notify_new_content();

-- Clean up reading progress when content is deleted.
create or replace function public._cleanup_progress()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from reading_progress
  where item_id = old.id and item_type = case when tg_table_name = 'comics' then 'comic' else 'book' end;
  return old;
end $$;
drop trigger if exists comics_cleanup on public.comics;
create trigger comics_cleanup after delete on public.comics for each row execute function public._cleanup_progress();
drop trigger if exists books_cleanup on public.books;
create trigger books_cleanup after delete on public.books for each row execute function public._cleanup_progress();

-- ---------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------

alter table public.profiles          enable row level security;
alter table public.settings          enable row level security;
alter table public.comics            enable row level security;
alter table public.books             enable row level security;
alter table public.games             enable row level security;
alter table public.game_results      enable row level security;
alter table public.reading_progress  enable row level security;
alter table public.xp_events         enable row level security;
alter table public.achievements      enable row level security;
alter table public.user_achievements enable row level security;
alter table public.daily_challenges  enable row level security;
alter table public.daily_completions enable row level security;
alter table public.notifications     enable row level security;
alter table public.tests             enable row level security;
alter table public.test_attempts     enable row level security;
alter table public.materials         enable row level security;

-- profiles: read own (admins read all); students may only edit name + avatar
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated, anon;
grant update (first_name, last_name, avatar, stream) on public.profiles to authenticated;
revoke insert, delete on public.profiles from authenticated, anon;

-- settings: everyone signed in reads, admin writes
drop policy if exists settings_select on public.settings;
create policy settings_select on public.settings for select to authenticated using (true);
drop policy if exists settings_admin on public.settings;
create policy settings_admin on public.settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- content: published visible to students; only admins write
do $$
declare t text;
begin
  foreach t in array array['comics','books','games'] loop
    execute format('drop policy if exists %1$s_select on public.%1$s', t);
    execute format('create policy %1$s_select on public.%1$s for select to authenticated using (published or public.is_admin())', t);
    execute format('drop policy if exists %1$s_admin_insert on public.%1$s', t);
    execute format('create policy %1$s_admin_insert on public.%1$s for insert to authenticated with check (public.is_admin())', t);
    execute format('drop policy if exists %1$s_admin_update on public.%1$s', t);
    execute format('create policy %1$s_admin_update on public.%1$s for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('drop policy if exists %1$s_admin_delete on public.%1$s', t);
    execute format('create policy %1$s_admin_delete on public.%1$s for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;

-- personal data: owner reads, admin reads all; writes only through RPCs below
do $$
declare t text;
begin
  foreach t in array array['game_results','reading_progress','xp_events','user_achievements','daily_completions'] loop
    execute format('drop policy if exists %1$s_select on public.%1$s', t);
    execute format('create policy %1$s_select on public.%1$s for select to authenticated using (user_id = auth.uid() or public.is_admin())', t);
  end loop;
end $$;

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.notifications from authenticated;
grant update (read) on public.notifications to authenticated;

drop policy if exists achievements_select on public.achievements;
create policy achievements_select on public.achievements for select to authenticated using (true);

-- daily_challenges: answers are hidden; students get the question via get_daily_challenge()
drop policy if exists daily_challenges_admin on public.daily_challenges;
create policy daily_challenges_admin on public.daily_challenges for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 5. Storage: public covers, private PDFs (signed-in users read, admins write)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public) values ('covers', 'covers', true)  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('pdfs',   'pdfs',   false) on conflict (id) do nothing;

drop policy if exists "infolaktika read" on storage.objects;
create policy "infolaktika read" on storage.objects for select to authenticated
  using (bucket_id in ('covers','pdfs'));
drop policy if exists "infolaktika admin insert" on storage.objects;
create policy "infolaktika admin insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('covers','pdfs') and public.is_admin());
drop policy if exists "infolaktika admin update" on storage.objects;
create policy "infolaktika admin update" on storage.objects for update to authenticated
  using (bucket_id in ('covers','pdfs') and public.is_admin());
drop policy if exists "infolaktika admin delete" on storage.objects;
create policy "infolaktika admin delete" on storage.objects for delete to authenticated
  using (bucket_id in ('covers','pdfs') and public.is_admin());

-- ---------------------------------------------------------------------
-- 6. RPCs used by the app
-- ---------------------------------------------------------------------

create or replace function public.username_available(p_username text)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from profiles where username = lower(p_username))
$$;

create or replace function public.ping()
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := _require_student();
begin
  perform _touch(uid);
  perform _check_achievements(uid);
end $$;

create or replace function public.complete_game(p_game uuid, p_score integer, p_max integer, p_duration integer default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := _require_student(); g games; ratio numeric; prev_best numeric; earned int; ach jsonb; bonus int;
begin
  select * into g from games where id = p_game and published;
  if not found then raise exception 'game not found'; end if;
  if p_max is null or p_max <= 0 or p_max > 1000 then raise exception 'invalid max score'; end if;
  p_score := greatest(0, least(coalesce(p_score, 0), p_max));
  ratio := p_score::numeric / p_max;

  -- XP is only paid for improving on your personal best → no farming by replaying.
  select coalesce(max(score::numeric / nullif(max_score, 0)), 0) into prev_best
  from game_results where user_id = uid and game_id = p_game;
  earned := greatest(0, round(g.xp_reward * (ratio - prev_best)))::int;

  insert into game_results(user_id, game_id, score, max_score, xp_earned, duration_sec)
  values (uid, p_game, p_score, p_max, earned, greatest(0, coalesce(p_duration, 0)));

  perform _award(uid, earned, 'game', g.title);
  perform _touch(uid);
  bonus := _check_missions(uid);
  ach := _check_achievements(uid);
  return jsonb_build_object('xp', earned, 'bonus', bonus, 'total_xp', (select xp from profiles where id = uid),
                            'best', greatest(ratio, prev_best), 'achievements', ach);
end $$;

create or replace function public.save_progress(p_type text, p_item uuid, p_page integer, p_total integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := _require_student(); item_title text; was_done bool; now_done bool; reward int := 0; ach jsonb; bonus int; s settings;
begin
  if p_type = 'comic' then select title into item_title from comics where id = p_item and published;
  elsif p_type = 'book' then select title into item_title from books where id = p_item and published;
  else raise exception 'invalid type'; end if;
  if item_title is null then raise exception 'item not found'; end if;

  p_total := greatest(coalesce(p_total, 1), 1);
  p_page  := greatest(1, least(coalesce(p_page, 1), p_total));
  select completed into was_done from reading_progress where user_id = uid and item_type = p_type and item_id = p_item;
  was_done := coalesce(was_done, false);
  now_done := p_page >= p_total;

  insert into reading_progress(user_id, item_type, item_id, last_page, total_pages, completed, completed_at, updated_at)
  values (uid, p_type, p_item, p_page, p_total, now_done, case when now_done then now() end, now())
  on conflict (user_id, item_type, item_id) do update set
    last_page = excluded.last_page, total_pages = excluded.total_pages,
    completed = reading_progress.completed or excluded.completed,
    completed_at = coalesce(reading_progress.completed_at, excluded.completed_at),
    updated_at = now();

  if now_done and not was_done then
    select * into s from settings where id = 1;
    reward := case when p_type = 'comic' then s.xp_comic else s.xp_book end;
    perform _award(uid, reward, p_type, item_title);
  end if;
  perform _touch(uid);
  bonus := _check_missions(uid);
  ach := _check_achievements(uid);
  return jsonb_build_object('completed_now', now_done and not was_done, 'xp', reward, 'bonus', bonus, 'achievements', ach);
end $$;

create or replace function public.get_daily_challenge()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); n int; c daily_challenges; done daily_completions; s settings;
begin
  select count(*) into n from daily_challenges;
  if n = 0 then return null; end if;
  select * into c from daily_challenges order by id offset ((_today() - date '2024-01-01') % n) limit 1;
  select * into done from daily_completions where user_id = uid and day = _today();
  select * into s from settings where id = 1;
  return jsonb_build_object(
    'id', c.id, 'question', c.question, 'options', c.options, 'xp', s.xp_daily,
    'done', done.user_id is not null, 'correct', done.correct,
    'answer', case when done.user_id is not null then c.answer end,
    'explanation', case when done.user_id is not null then c.explanation end);
end $$;

create or replace function public.submit_daily(p_answer integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := _require_student(); n int; c daily_challenges; ok bool; s settings; earned int := 0; ach jsonb; bonus int;
begin
  if exists (select 1 from daily_completions where user_id = uid and day = _today()) then
    raise exception 'already answered today';
  end if;
  select count(*) into n from daily_challenges;
  select * into c from daily_challenges order by id offset ((_today() - date '2024-01-01') % n) limit 1;
  ok := p_answer = c.answer;
  insert into daily_completions(user_id, day, challenge_id, correct) values (uid, _today(), c.id, ok);
  select * into s from settings where id = 1;
  if ok then earned := s.xp_daily; perform _award(uid, earned, 'daily', _today()::text); end if;
  perform _touch(uid);
  bonus := _check_missions(uid);
  ach := _check_achievements(uid);
  return jsonb_build_object('correct', ok, 'answer', c.answer, 'explanation', c.explanation, 'xp', earned, 'bonus', bonus, 'achievements', ach);
end $$;

create or replace function public.get_my_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); p profiles; r int;
begin
  select * into p from profiles where id = uid;
  select count(*) + 1 into r from profiles where role = 'student' and not is_blocked and xp > p.xp;
  return jsonb_build_object(
    'xp', p.xp, 'level', level_for(p.xp), 'streak', p.streak, 'best_streak', p.best_streak, 'rank', r,
    'games_completed', (select count(distinct game_id) from game_results where user_id = uid),
    'games_total', (select count(*) from games where published),
    'comics_read', (select count(*) from reading_progress where user_id = uid and item_type = 'comic' and completed),
    'comics_total', (select count(*) from comics where published),
    'books_read', (select count(*) from reading_progress where user_id = uid and item_type = 'book' and completed),
    'books_total', (select count(*) from books where published),
    'missions', _missions(uid),
    'week', (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'xp', coalesce(x.s, 0)) order by d), '[]'::jsonb)
             from generate_series(_today() - 6, _today(), interval '1 day') d
             left join (select (created_at at time zone 'Asia/Almaty')::date as dday, sum(amount) s
                        from xp_events where user_id = uid group by 1) x on x.dday = d::date));
end $$;

create or replace function public.get_leaderboard(p_limit integer default 50)
returns table(rank bigint, id uuid, first_name text, last_name text, username text, avatar text, xp integer, level integer, streak integer)
language sql stable security definer set search_path = public as $$
  select rank() over (order by p.xp desc), p.id, p.first_name, p.last_name, p.username, p.avatar, p.xp, level_for(p.xp), p.streak
  from profiles p where p.role = 'student' and not p.is_blocked
  order by p.xp desc, p.created_at asc limit least(p_limit, 200)
$$;

-- ---------- admin RPCs ----------

create or replace function public.admin_students()
returns table(id uuid, first_name text, last_name text, username text, created_at timestamptz, xp integer, level integer,
              streak integer, last_active date, is_blocked boolean, games_completed bigint, comics_read bigint, books_read bigint, pages_read bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return query
  select p.id, p.first_name, p.last_name, p.username, p.created_at, p.xp, level_for(p.xp), p.streak, p.last_active, p.is_blocked,
         (select count(distinct g.game_id) from game_results g where g.user_id = p.id),
         (select count(*) from reading_progress r where r.user_id = p.id and r.item_type = 'comic' and r.completed),
         (select count(*) from reading_progress r where r.user_id = p.id and r.item_type = 'book' and r.completed),
         (select coalesce(sum(r.last_page), 0) from reading_progress r where r.user_id = p.id)
  from profiles p where p.role = 'student' order by p.created_at desc;
end $$;

create or replace function public.admin_student_detail(p_uid uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'profile', (select to_jsonb(p) || jsonb_build_object('level', level_for(p.xp)) from profiles p where p.id = p_uid),
    'results', (select coalesce(jsonb_agg(jsonb_build_object('title', g.title, 'type', g.type, 'score', r.score, 'max_score', r.max_score,
                       'xp_earned', r.xp_earned, 'created_at', r.created_at) order by r.created_at desc), '[]'::jsonb)
                from game_results r join games g on g.id = r.game_id where r.user_id = p_uid),
    'reading', (select coalesce(jsonb_agg(jsonb_build_object('item_type', r.item_type, 'title', coalesce(c.title, b.title),
                       'last_page', r.last_page, 'total_pages', r.total_pages, 'completed', r.completed, 'updated_at', r.updated_at)
                       order by r.updated_at desc), '[]'::jsonb)
                from reading_progress r left join comics c on r.item_type = 'comic' and c.id = r.item_id
                left join books b on r.item_type = 'book' and b.id = r.item_id where r.user_id = p_uid),
    'achievements', (select coalesce(jsonb_agg(jsonb_build_object('code', a.code, 'title', a.title, 'icon', a.icon, 'earned_at', u.earned_at)), '[]'::jsonb)
                     from user_achievements u join achievements a on a.code = u.code where u.user_id = p_uid));
end $$;

create or replace function public.admin_set_blocked(p_uid uuid, p_blocked boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update profiles set is_blocked = p_blocked where id = p_uid and role = 'student';
end $$;

create or replace function public.admin_adjust_xp(p_uid uuid, p_amount integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  perform _award(p_uid, p_amount, 'admin', 'Әкімші түзетуі');
end $$;

create or replace function public.admin_delete_student(p_uid uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if exists (select 1 from profiles where id = p_uid and role = 'admin') then raise exception 'cannot delete admin'; end if;
  delete from auth.users where id = p_uid;
end $$;

create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'students', (select count(*) from profiles where role = 'student'),
    'active_today', (select count(*) from profiles where role = 'student' and last_active = _today()),
    'comics', (select count(*) from comics),
    'books', (select count(*) from books),
    'games', (select count(*) from games),
    'games_completed', (select count(*) from game_results),
    'xp_total', (select coalesce(sum(xp), 0) from profiles where role = 'student'),
    'popular_comics', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select c.title, count(r.user_id) readers, count(*) filter (where r.completed) finished
        from comics c left join reading_progress r on r.item_type = 'comic' and r.item_id = c.id
        group by c.id order by readers desc, c.created_at desc limit 5) x),
    'popular_books', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select b.title, count(r.user_id) readers from books b
        left join reading_progress r on r.item_type = 'book' and r.item_id = b.id
        group by b.id order by readers desc, b.created_at desc limit 5) x),
    'popular_games', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select g.title, count(r.id) plays, round(avg(r.score::numeric / nullif(r.max_score, 0)) * 100) avg_pct
        from games g left join game_results r on r.game_id = g.id
        group by g.id order by plays desc, g.sort limit 6) x),
    'activity', (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'users', coalesce(a.u, 0), 'events', coalesce(a.e, 0)) order by d), '[]'::jsonb)
        from generate_series(_today() - 13, _today(), interval '1 day') d
        left join (select (created_at at time zone 'Asia/Almaty')::date as dday, count(distinct user_id) u, count(*) e
                   from xp_events group by 1) a on a.dday = d::date),
    'levels', (select coalesce(jsonb_agg(jsonb_build_object('level', l, 'count',
        (select count(*) from profiles where role = 'student' and level_for(xp) = l)) order by l), '[]'::jsonb)
        from generate_series(1, 5) l));
end $$;

-- =====================================================================
-- 7. v3: surveys/tests and materials published by the admin, photo avatars
-- =====================================================================

-- Functions of the removed curator role (v2).
drop function if exists public.list_curators();
drop function if exists public.finish_setup(text);
drop function if exists public.group_rating();
drop function if exists public.curator_students();
drop function if exists public.curator_remove_student(uuid);
drop function if exists public.curator_test_results(uuid);
drop function if exists public.curator_overview();
drop function if exists public.admin_set_curator_status(uuid, text);
drop function if exists public.admin_users();

-- ---------- tests ----------
-- Question shape: {q, options[4], type: 'single'|'multi' (default single),
--   single -> answer: 0..3 ; multi -> answers: [distinct 0..3, at least one] ; explain: optional text (shown after the attempt)}
create or replace function public._q_correct(q jsonb)
returns jsonb language sql immutable set search_path = public as $$
  select case when q->>'type' = 'multi'
    then coalesce((select jsonb_agg(v::int order by v::int) from (select distinct jsonb_array_elements_text(q->'answers') v) x), '[]'::jsonb)
    else q->'answer' end
$$;

-- Normalises one submitted answer for a question: number for single, sorted distinct array for multi, else null.
create or replace function public._q_clean(q jsonb, a jsonb)
returns jsonb language sql immutable set search_path = public as $$
  select case
    when q->>'type' = 'multi' then
      case when jsonb_typeof(a) = 'array' and jsonb_array_length(a) > 0
                and not exists (select 1 from jsonb_array_elements(a) e where jsonb_typeof(e) <> 'number' or (e #>> '{}')::numeric not in (0, 1, 2, 3))
           then (select jsonb_agg(v order by v) from (select distinct (e #>> '{}')::int v from jsonb_array_elements(a) e) x)
           else 'null'::jsonb end
    else
      case when jsonb_typeof(a) = 'number' and (a #>> '{}')::numeric in (0, 1, 2, 3) then a else 'null'::jsonb end
  end
$$;

create or replace function public._tests_validate()
returns trigger language plpgsql set search_path = public as $$
declare q jsonb; n int; i int; oq jsonb;
begin
  if jsonb_typeof(new.questions) <> 'array' then raise exception 'invalid questions'; end if;
  n := jsonb_array_length(new.questions);
  if n < 1 or n > 50 then raise exception 'test must have 1-50 questions'; end if;
  for i in 0 .. n - 1 loop
    q := new.questions->i;
    if jsonb_typeof(q->'q') <> 'string' or length(trim(q->>'q')) = 0
       or jsonb_typeof(q->'options') <> 'array' or jsonb_array_length(q->'options') <> 4
       or exists (select 1 from jsonb_array_elements(q->'options') o where jsonb_typeof(o) <> 'string' or length(trim(o #>> '{}')) = 0)
       or coalesce(q->>'type', 'single') not in ('single', 'multi')
       or (q ? 'explain' and jsonb_typeof(q->'explain') not in ('string', 'null'))
       or length(coalesce(q->>'explain', '')) > 2000 then
      raise exception 'invalid question: each question needs text, 4 options and one correct answer';
    end if;
    if q->>'type' = 'multi' then
      if jsonb_typeof(q->'answers') <> 'array' or jsonb_array_length(q->'answers') < 1
         or exists (select 1 from jsonb_array_elements(q->'answers') e where jsonb_typeof(e) <> 'number' or (e #>> '{}')::numeric not in (0, 1, 2, 3)) then
        raise exception 'invalid question: multi-answer question needs at least one correct option';
      end if;
    elsif jsonb_typeof(q->'answer') <> 'number' or (q->>'answer')::numeric not in (0, 1, 2, 3) then
      raise exception 'invalid question: each question needs text, 4 options and one correct answer';
    end if;
    -- An explanation written for the old wording is wrong for the new one: when the question,
    -- options or correct answer change but the explanation does not, drop it (it is re-generated on demand).
    if tg_op = 'UPDATE' and coalesce(q->>'explain', '') <> '' then
      oq := old.questions->i;
      if oq is not null and (oq->>'q' <> q->>'q' or oq->'options' <> q->'options' or coalesce(oq->>'type', 'single') <> coalesce(q->>'type', 'single')
         or _q_correct(oq) <> _q_correct(q)) then
        if coalesce(oq->>'explain', '') = q->>'explain' then
          new.questions := jsonb_set(new.questions, array[i::text], q - 'explain');
        end if;
      end if;
    end if;
  end loop;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists tests_validate on public.tests;
create trigger tests_validate before insert or update on public.tests for each row execute function public._tests_validate();

create or replace function public._tests_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.published and (tg_op = 'INSERT' or not old.published) then
    insert into notifications(user_id, title, body, link)
    select id, 'Жаңа сауалнама! 📝', new.title, '/app/tests/' || new.id from profiles where role = 'student';
  end if;
  return new;
end $$;
drop trigger if exists tests_notify on public.tests;
create trigger tests_notify after insert or update of published on public.tests for each row execute function public._tests_notify();

-- Only the admin reads/writes the tests table directly (students would see the answers).
drop policy if exists tests_select on public.tests;
create policy tests_select on public.tests for select to authenticated using (public.is_admin());
drop policy if exists tests_insert on public.tests;
create policy tests_insert on public.tests for insert to authenticated with check (public.is_admin());
drop policy if exists tests_update on public.tests;
create policy tests_update on public.tests for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists tests_delete on public.tests;
create policy tests_delete on public.tests for delete to authenticated using (public.is_admin());

drop policy if exists test_attempts_select on public.test_attempts;
create policy test_attempts_select on public.test_attempts for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- ---------- materials ----------
create or replace function public._materials_author()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select trim(first_name || ' ' || last_name) into new.author_name from profiles where id = new.author_id;
  new.author_name := coalesce(nullif(new.author_name, ''), 'INFOLAKTIKA');
  new.created_at := now();
  return new;
end $$;
drop trigger if exists materials_author on public.materials;
create trigger materials_author before insert on public.materials for each row execute function public._materials_author();

create or replace function public._materials_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into notifications(user_id, title, body, link)
  select id, 'Жаңа материал 📎', new.title, '/app/materials' from profiles where role = 'student';
  return new;
end $$;
drop trigger if exists materials_notify on public.materials;
create trigger materials_notify after insert on public.materials for each row execute function public._materials_notify();

drop policy if exists materials_select on public.materials;
create policy materials_select on public.materials for select to authenticated using (true);
drop policy if exists materials_insert on public.materials;
create policy materials_insert on public.materials for insert to authenticated with check (author_id = auth.uid() and public.is_admin());
drop policy if exists materials_delete on public.materials;
create policy materials_delete on public.materials for delete to authenticated using (public.is_admin());

-- ---------- storage: avatars (public, own folder) + materials (private, admin uploads) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit)
values ('materials', 'materials', false, 20971520)
on conflict (id) do nothing;

drop policy if exists "infolaktika avatars read" on storage.objects;
create policy "infolaktika avatars read" on storage.objects for select to authenticated using (bucket_id = 'avatars');
drop policy if exists "infolaktika avatars insert" on storage.objects;
create policy "infolaktika avatars insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "infolaktika avatars update" on storage.objects;
create policy "infolaktika avatars update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "infolaktika avatars delete" on storage.objects;
create policy "infolaktika avatars delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "infolaktika materials read" on storage.objects;
create policy "infolaktika materials read" on storage.objects for select to authenticated using (bucket_id = 'materials');
drop policy if exists "infolaktika materials insert" on storage.objects;
create policy "infolaktika materials insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'materials' and public.is_admin());
drop policy if exists "infolaktika materials delete" on storage.objects;
create policy "infolaktika materials delete" on storage.objects for delete to authenticated
  using (bucket_id = 'materials' and public.is_admin());

-- ---------- RPCs: students ----------

-- Published tests (plus any the student already took), with the student's own result.
create or replace function public.my_tests()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', t.id, 'title', t.title, 'description', t.description, 'question_count', jsonb_array_length(t.questions),
      'created_at', t.created_at, 'score', a.score, 'max_score', a.max_score, 'done_at', a.created_at) order by t.created_at desc)
    from tests t left join test_attempts a on a.test_id = t.id and a.user_id = uid
    where t.published or a.user_id is not null), '[]'::jsonb);
end $$;

create or replace function public.get_test(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); t tests; a test_attempts;
begin
  select * into t from tests where id = p_id;
  if t.id is null then raise exception 'test not found'; end if;
  select * into a from test_attempts where test_id = p_id and user_id = uid;
  if a.user_id is null and not t.published and not is_admin() then raise exception 'test not found'; end if;
  return jsonb_build_object(
    'id', t.id, 'title', t.title, 'description', t.description,
    'questions', (select jsonb_agg(jsonb_build_object('q', q->'q', 'options', q->'options', 'type', coalesce(q->>'type', 'single')) order by i)
                  from jsonb_array_elements(t.questions) with ordinality x(q, i)),
    'attempt', case when a.user_id is null then null else jsonb_build_object(
      'score', a.score, 'max_score', a.max_score, 'answers', a.answers, 'created_at', a.created_at,
      'correct', (select jsonb_agg(_q_correct(q) order by i) from jsonb_array_elements(t.questions) with ordinality x(q, i)),
      'explain', (select jsonb_agg(nullif(q->>'explain', '') order by i) from jsonb_array_elements(t.questions) with ordinality x(q, i))) end);
end $$;

create or replace function public.submit_test(p_id uuid, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := _require_student(); t tests; n int; s int := 0; i int; earned int; ach jsonb; clean jsonb := '[]'::jsonb; c jsonb;
begin
  if (select role from profiles where id = uid) <> 'student' then raise exception 'forbidden'; end if;
  select * into t from tests where id = p_id and published;
  if t.id is null then raise exception 'test not found'; end if;
  if exists (select 1 from test_attempts where test_id = p_id and user_id = uid) then raise exception 'test already answered'; end if;
  if jsonb_typeof(p_answers) <> 'array' then raise exception 'invalid answers'; end if;
  n := jsonb_array_length(t.questions);
  for i in 0 .. n - 1 loop
    c := _q_clean(t.questions->i, p_answers->i);
    clean := clean || jsonb_build_array(c);
    if c <> 'null'::jsonb and c = _q_correct(t.questions->i) then s := s + 1; end if;
  end loop;
  insert into test_attempts(test_id, user_id, score, max_score, answers) values (p_id, uid, s, n, clean);
  earned := s * 10;
  perform _award(uid, earned, 'test', t.title);
  perform _touch(uid);
  ach := _check_achievements(uid);
  return jsonb_build_object('score', s, 'max_score', n, 'xp', earned, 'bonus', 0, 'achievements', ach,
    'correct', (select jsonb_agg(_q_correct(q) order by k) from jsonb_array_elements(t.questions) with ordinality x(q, k)),
    'explain', (select jsonb_agg(nullif(q->>'explain', '') order by k) from jsonb_array_elements(t.questions) with ordinality x(q, k)));
end $$;

-- Rating by survey/test points among all students.
create or replace function public.test_rating()
returns table(rank bigint, id uuid, first_name text, last_name text, avatar text, stream text, points bigint, tests_done bigint)
language sql stable security definer set search_path = public as $$
  select rank() over (order by coalesce(x.pts, 0) desc), p.id, p.first_name, p.last_name, p.avatar, p.stream,
         coalesce(x.pts, 0)::bigint, coalesce(x.cnt, 0)::bigint
  from profiles p
  left join (select user_id, sum(score) pts, count(*) cnt from test_attempts group by user_id) x on x.user_id = p.id
  where p.role = 'student' and not p.is_blocked
  order by coalesce(x.pts, 0) desc, p.last_name, p.first_name
  limit 200
$$;

-- ---------- RPCs: admin ----------

create or replace function public.admin_test_results(p_test uuid)
returns table(user_id uuid, first_name text, last_name text, avatar text, stream text, score integer, max_score integer, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return query
  select a.user_id, p.first_name, p.last_name, p.avatar, p.stream, a.score, a.max_score, a.created_at
  from test_attempts a join profiles p on p.id = a.user_id where a.test_id = p_test
  order by a.score desc, a.created_at;
end $$;

create or replace function public.admin_users()
returns table(id uuid, first_name text, last_name text, username text, stream text, created_at timestamptz,
              xp integer, level integer, last_active date, is_blocked boolean, tests_done bigint, test_points bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return query
  select p.id, p.first_name, p.last_name, p.username, p.stream, p.created_at, p.xp, level_for(p.xp), p.last_active, p.is_blocked,
         (select count(*) from test_attempts a where a.user_id = p.id),
         (select coalesce(sum(a.score), 0) from test_attempts a where a.user_id = p.id)::bigint
  from profiles p where p.role = 'student' order by p.created_at desc;
end $$;

-- Block / unblock students (never admins).
create or replace function public.admin_set_blocked(p_uid uuid, p_blocked boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update profiles set is_blocked = p_blocked where id = p_uid and role <> 'admin';
end $$;

-- =====================================================================
-- 8. v4: comic ratings (1–5 crystals + comment) and student suggestions
-- =====================================================================

create table if not exists public.comic_reviews (
  comic_id   uuid not null references public.comics(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  comment    text not null default '' check (length(comment) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (comic_id, user_id)
);
create index if not exists comic_reviews_comic_idx on public.comic_reviews(comic_id, updated_at desc);
alter table public.comic_reviews enable row level security;

drop policy if exists comic_reviews_select on public.comic_reviews;
create policy comic_reviews_select on public.comic_reviews for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists comic_reviews_delete on public.comic_reviews;
create policy comic_reviews_delete on public.comic_reviews for delete to authenticated using (public.is_admin());

create table if not exists public.suggestions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete set null,
  author_name  text not null default '',
  stream       text,
  topic        text not null check (topic in ('comic','material','platform')),
  target_id    uuid,
  target_title text not null default '',
  body         text not null check (length(trim(body)) between 3 and 2000),
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists suggestions_created_idx on public.suggestions(created_at desc);
alter table public.suggestions enable row level security;

drop policy if exists suggestions_select on public.suggestions;
create policy suggestions_select on public.suggestions for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists suggestions_update on public.suggestions;
create policy suggestions_update on public.suggestions for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists suggestions_delete on public.suggestions;
create policy suggestions_delete on public.suggestions for delete to authenticated using (public.is_admin());

-- A student rates a comic they have finished reading (one review per comic, can be changed).
create or replace function public.rate_comic(p_comic uuid, p_rating int, p_comment text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := _require_student(); c text := left(trim(coalesce(p_comment, '')), 1000);
begin
  if (select role from profiles where id = uid) <> 'student' then raise exception 'forbidden'; end if;
  if p_rating is null or p_rating not between 1 and 5 then raise exception 'invalid rating'; end if;
  if not exists (select 1 from comics where id = p_comic and published) then raise exception 'comic not found'; end if;
  if not exists (select 1 from reading_progress where user_id = uid and item_type = 'comic' and item_id = p_comic and completed) then
    raise exception 'finish the comic first';
  end if;
  insert into comic_reviews(comic_id, user_id, rating, comment)
  values (p_comic, uid, p_rating, c)
  on conflict (comic_id, user_id) do update set rating = excluded.rating, comment = excluded.comment, updated_at = now();
  perform _touch(uid);
  return jsonb_build_object('rating', p_rating, 'comment', c);
end $$;

create or replace function public.send_suggestion(p_topic text, p_target uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := _require_student(); me profiles; tt text := ''; b text := trim(coalesce(p_body, ''));
begin
  if p_topic not in ('comic','material','platform') then raise exception 'invalid topic'; end if;
  if length(b) < 3 then raise exception 'suggestion too short'; end if;
  if (select count(*) from suggestions where user_id = uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'too many suggestions';
  end if;
  select * into me from profiles where id = uid;
  if p_topic = 'comic' and p_target is not null then select title into tt from comics where id = p_target;
  elsif p_topic = 'material' and p_target is not null then select title into tt from materials where id = p_target;
  end if;
  insert into suggestions(user_id, author_name, stream, topic, target_id, target_title, body)
  values (uid, trim(me.first_name || ' ' || me.last_name), me.stream, p_topic,
          case when p_topic = 'platform' then null else p_target end, coalesce(tt, ''), left(b, 2000));
end $$;

-- Average rating per comic (admin).
create or replace function public.admin_comic_ratings()
returns table(comic_id uuid, avg_rating numeric, reviews bigint, comments bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return query
  select r.comic_id, round(avg(r.rating)::numeric, 2), count(*), count(*) filter (where r.comment <> '')
  from comic_reviews r group by r.comic_id;
end $$;

create or replace function public.admin_comic_reviews(p_comic uuid)
returns table(user_id uuid, first_name text, last_name text, avatar text, stream text, rating smallint, comment text, updated_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return query
  select r.user_id, p.first_name, p.last_name, p.avatar, p.stream, r.rating, r.comment, r.updated_at
  from comic_reviews r join profiles p on p.id = r.user_id
  where r.comic_id = p_comic order by r.updated_at desc;
end $$;

-- v2.1: "XP" is called "кристалл" in the UI.
update public.achievements set title = '500 кристалл', description = '500 кристалл жина', icon = '💎' where code = 'xp_500';

-- Internal helpers must not be callable from the API.
revoke execute on function public._award(uuid, integer, text, text) from public, anon, authenticated;
revoke execute on function public._touch(uuid) from public, anon, authenticated;
revoke execute on function public._grant(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public._check_achievements(uuid) from public, anon, authenticated;
revoke execute on function public._check_missions(uuid) from public, anon, authenticated;
revoke execute on function public._missions(uuid) from public, anon, authenticated;
revoke execute on function public._require_student() from public, anon, authenticated;
grant execute on function public.username_available(text) to anon, authenticated;

-- =====================================================================
-- 9. v5: multi-answer questions + AI explanations for wrong answers
--    (the "ai-explain" Edge Function writes a cached explanation per question)
-- =====================================================================

-- Old single-answer tests keep working: a missing "type" means 'single'.
-- Stores one explanation without touching the rest of the test. Called only by the
-- Edge Function with the service-role key, never from the browser.
create or replace function public._set_explain(p_test uuid, p_index int, p_text text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update tests set questions = jsonb_set(questions, array[p_index::text, 'explain'], to_jsonb(left(trim(p_text), 2000)))
  where id = p_test and p_index >= 0 and p_index < jsonb_array_length(questions)
    and coalesce(questions->p_index->>'explain', '') = '';
end $$;
revoke all on function public._set_explain(uuid, int, text) from public, anon, authenticated;

-- =====================================================================
-- 10. v6: share a survey by link — anyone types their name and takes it
--     without an account. Guest results are seen only by the admin and do
--     not affect crystals or the rating.
-- =====================================================================
alter table public.tests add column if not exists public_link boolean not null default false;
alter table public.tests add column if not exists share_code text;
update public.tests set share_code = substr(replace(gen_random_uuid()::text, '-', ''), 1, 10) where share_code is null;
alter table public.tests alter column share_code set default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
alter table public.tests alter column share_code set not null;
create unique index if not exists tests_share_code_idx on public.tests(share_code);

create table if not exists public.guest_attempts (
  id         uuid primary key default gen_random_uuid(),
  test_id    uuid not null references public.tests(id) on delete cascade,
  name       text not null check (length(trim(name)) between 2 and 80),
  score      integer not null,
  max_score  integer not null,
  answers    jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists guest_attempts_test_idx on public.guest_attempts(test_id, created_at desc);
alter table public.guest_attempts enable row level security;
drop policy if exists guest_attempts_admin on public.guest_attempts;
create policy guest_attempts_admin on public.guest_attempts for select to authenticated using (public.is_admin());
drop policy if exists guest_attempts_delete on public.guest_attempts;
create policy guest_attempts_delete on public.guest_attempts for delete to authenticated using (public.is_admin());

-- The shared survey without answers (null when the link is off or wrong).
create or replace function public.public_test(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', t.id, 'title', t.title, 'description', t.description,
    'questions', (select jsonb_agg(jsonb_build_object('q', q->'q', 'options', q->'options', 'type', coalesce(q->>'type', 'single')) order by i)
                  from jsonb_array_elements(t.questions) with ordinality x(q, i)))
  from tests t where t.share_code = p_code and t.public_link and t.published
$$;

create or replace function public.submit_public_test(p_code text, p_name text, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t tests; n int; s int := 0; i int; clean jsonb := '[]'::jsonb; c jsonb; aid uuid; nm text := left(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'), 80);
begin
  select * into t from tests where share_code = p_code and public_link and published;
  if t.id is null then raise exception 'test not found'; end if;
  if length(nm) < 2 then raise exception 'guest name required'; end if;
  if jsonb_typeof(p_answers) <> 'array' then raise exception 'invalid answers'; end if;
  -- simple flood guard for an open link
  if (select count(*) from guest_attempts where test_id = t.id and created_at > now() - interval '1 hour') >= 300 then
    raise exception 'too many attempts';
  end if;
  n := jsonb_array_length(t.questions);
  for i in 0 .. n - 1 loop
    c := _q_clean(t.questions->i, p_answers->i);
    clean := clean || jsonb_build_array(c);
    if c <> 'null'::jsonb and c = _q_correct(t.questions->i) then s := s + 1; end if;
  end loop;
  insert into guest_attempts(test_id, name, score, max_score, answers) values (t.id, nm, s, n, clean) returning id into aid;
  return jsonb_build_object('attempt_id', aid, 'score', s, 'max_score', n, 'answers', clean,
    'correct', (select jsonb_agg(_q_correct(q) order by k) from jsonb_array_elements(t.questions) with ordinality x(q, k)),
    'explain', (select jsonb_agg(nullif(q->>'explain', '') order by k) from jsonb_array_elements(t.questions) with ordinality x(q, k)));
end $$;

-- A guest re-opening the link later sees their result again (they keep the attempt id).
create or replace function public.public_test_result(p_code text, p_attempt uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('attempt_id', g.id, 'name', g.name, 'score', g.score, 'max_score', g.max_score, 'answers', g.answers, 'created_at', g.created_at,
    'correct', (select jsonb_agg(_q_correct(q) order by k) from jsonb_array_elements(t.questions) with ordinality x(q, k)),
    'explain', (select jsonb_agg(nullif(q->>'explain', '') order by k) from jsonb_array_elements(t.questions) with ordinality x(q, k)))
  from guest_attempts g join tests t on t.id = g.test_id
  where g.id = p_attempt and t.share_code = p_code
$$;

-- Admin: give the survey a new link (the old one stops working).
create or replace function public.admin_new_share_code(p_test uuid)
returns text language plpgsql security definer set search_path = public as $$
declare c text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update tests set share_code = c where id = p_test;
  return c;
end $$;

-- =====================================================================
-- 11. v7: one results view per survey — registered students and link guests
--     together, the average score and the most-missed questions.
-- =====================================================================
create or replace function public.admin_test_overview(p_test uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t tests;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select * into t from tests where id = p_test;
  if t.id is null then raise exception 'test not found'; end if;
  return jsonb_build_object(
    'rows', coalesce((select jsonb_agg(r order by (r->>'score')::int desc, r->>'created_at') from (
        select jsonb_build_object('kind', 'student', 'id', a.user_id, 'name', trim(p.first_name || ' ' || p.last_name), 'avatar', p.avatar,
                                  'stream', p.stream, 'score', a.score, 'max_score', a.max_score, 'created_at', a.created_at) r
        from test_attempts a join profiles p on p.id = a.user_id where a.test_id = p_test
        union all
        select jsonb_build_object('kind', 'guest', 'id', g.id, 'name', g.name, 'avatar', null, 'stream', null,
                                  'score', g.score, 'max_score', g.max_score, 'created_at', g.created_at)
        from guest_attempts g where g.test_id = p_test) x), '[]'::jsonb),
    'questions', coalesce((select jsonb_agg(jsonb_build_object(
        'index', i - 1, 'q', q->>'q', 'type', coalesce(q->>'type', 'single'), 'options', q->'options', 'correct', _q_correct(q),
        'total', st.total, 'right', st.right_n,
        'picks', (select jsonb_agg((select count(*) from (
                     select answers from test_attempts where test_id = p_test union all select answers from guest_attempts where test_id = p_test) z
                   where z.answers->(i::int - 1) = to_jsonb(j) or (jsonb_typeof(z.answers->(i::int - 1)) = 'array' and z.answers->(i::int - 1) @> to_jsonb(array[j])))
                  order by j) from generate_series(0, 3) j)
      ) order by i)
      from jsonb_array_elements(t.questions) with ordinality x(q, i)
      cross join lateral (
        select count(*) as total,
               count(*) filter (where _q_clean(q, z.answers->(i::int - 1)) = _q_correct(q)) as right_n
        from (select answers from test_attempts where test_id = p_test union all select answers from guest_attempts where test_id = p_test) z
      ) st), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------
-- INFOLAKTIKA: Data API рұқсаттары.
-- Жаңа Supabase жобаларында public кестелері anon/authenticated рөлдеріне
-- автоматты түрде ашылмайды ("permission denied for table ..." қатесі).
-- Бұл файл қажетті рұқсаттарды нақты береді. Қатарларды бәрібір RLS қорғайды.
-- Қайта іске қосуға болады.

grant usage on schema public to anon, authenticated;

-- Оқу: әр кестеде RLS саясаты кім нені көретінін шектейді.
grant select on all tables in schema public to authenticated;

-- Әкімші контенті (RLS тек is_admin() үшін рұқсат береді).
grant insert, update, delete on public.comics, public.books, public.games, public.daily_challenges, public.tests to authenticated;
grant insert, delete on public.materials to authenticated;
revoke update on public.materials from authenticated;
grant delete on public.comic_reviews to authenticated;
revoke insert, update on public.comic_reviews from authenticated;
revoke insert on public.suggestions from authenticated;
revoke update on public.suggestions from authenticated;
grant update (is_read) on public.suggestions to authenticated;
grant delete on public.suggestions to authenticated;
grant update on public.settings to authenticated;

-- Профиль мен хабарландыруда тек белгілі бағандар өзгертіледі.
revoke update on public.profiles from authenticated, anon;
grant update (first_name, last_name, avatar, stream) on public.profiles to authenticated;
revoke update on public.notifications from authenticated;
grant update (read) on public.notifications to authenticated;

grant usage on all sequences in schema public to authenticated;

-- RPC функциялары.
grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.level_for(integer) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.ping() to authenticated;
grant execute on function public.complete_game to authenticated;
grant execute on function public.save_progress to authenticated;
grant execute on function public.get_daily_challenge to authenticated;
grant execute on function public.submit_daily to authenticated;
grant execute on function public.get_my_stats to authenticated;
grant execute on function public.get_leaderboard to authenticated;
grant execute on function public.admin_students to authenticated;
grant execute on function public.admin_student_detail to authenticated;
grant execute on function public.admin_set_blocked to authenticated;
grant execute on function public.admin_adjust_xp to authenticated;
grant execute on function public.admin_delete_student to authenticated;
grant execute on function public.admin_stats to authenticated;
grant execute on function public.my_tests() to authenticated;
grant execute on function public.get_test(uuid) to authenticated;
grant execute on function public.submit_test(uuid, jsonb) to authenticated;
grant execute on function public.test_rating() to authenticated;
grant execute on function public.admin_test_results(uuid) to authenticated;
grant execute on function public.admin_users() to authenticated;
grant execute on function public.rate_comic(uuid, int, text) to authenticated;
grant execute on function public.send_suggestion(text, uuid, text) to authenticated;
grant execute on function public.admin_comic_ratings() to authenticated;
grant execute on function public.admin_comic_reviews(uuid) to authenticated;

-- Edge Function "ai-explain" (service role): reads tests/attempts, stores explanations.
grant usage on schema public to service_role;
grant select on public.tests, public.test_attempts, public.profiles to service_role;
grant execute on function public._set_explain(uuid, int, text) to service_role;
grant select on public.guest_attempts to service_role;

-- v6: survey by link (guests, no account)
grant delete on public.guest_attempts to authenticated;
grant execute on function public.public_test(text) to anon, authenticated;
grant execute on function public.submit_public_test(text, text, jsonb) to anon, authenticated;
grant execute on function public.public_test_result(text, uuid) to anon, authenticated;
grant execute on function public.admin_new_share_code(uuid) to authenticated;
grant execute on function public.admin_test_overview(uuid) to authenticated;

notify pgrst, 'reload schema';
