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

notify pgrst, 'reload schema';
