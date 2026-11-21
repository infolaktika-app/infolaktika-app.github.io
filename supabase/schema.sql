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
--    with the service key by scripts/create-admin.mjs)
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, first_name, last_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)))
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

-- profiles: read own (admins read all); students may only edit name + avatar
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated, anon;
grant update (first_name, last_name, avatar) on public.profiles to authenticated;
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

-- Internal helpers must not be callable from the API.
revoke execute on function public._award(uuid, integer, text, text) from public, anon, authenticated;
revoke execute on function public._touch(uuid) from public, anon, authenticated;
revoke execute on function public._grant(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public._check_achievements(uuid) from public, anon, authenticated;
revoke execute on function public._check_missions(uuid) from public, anon, authenticated;
revoke execute on function public._missions(uuid) from public, anon, authenticated;
revoke execute on function public._require_student() from public, anon, authenticated;
grant execute on function public.username_available(text) to anon, authenticated;
