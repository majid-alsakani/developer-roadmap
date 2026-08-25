begin;
select plan(12);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.com');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select lives_ok($$insert into public.progress(user_id, roadmap_slug, node_id, status)
  values ('11111111-1111-1111-1111-111111111111', 'frontend', 'http', 'done')$$,
  'owner can insert own progress');
select results_eq($$select status from public.progress where user_id = '11111111-1111-1111-1111-111111111111'$$,
  array['done'::text], 'owner can read own progress');
select lives_ok($$insert into public.quiz_results(user_id, roadmap_slug, node_id, best_score, attempts, passed)
  values ('11111111-1111-1111-1111-111111111111', 'frontend', 'http', 80, 1, true)$$,
  'owner can insert own quiz result');
select results_eq($$select best_score from public.quiz_results where user_id = '11111111-1111-1111-1111-111111111111'$$,
  array[80], 'owner can read own quiz result');

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is_empty($$select * from public.progress$$, 'other user cannot read owner progress');
select is_empty($$select * from public.quiz_results$$, 'other user cannot read owner quiz result');
select is_empty($$update public.progress set status = 'learning' returning user_id$$,
  'other user cannot update owner progress');
select is_empty($$delete from public.quiz_results returning user_id$$,
  'other user cannot delete owner quiz result');
select throws_ok($$insert into public.progress(user_id, roadmap_slug, node_id, status)
  values ('11111111-1111-1111-1111-111111111111', 'backend', 'http', 'learning')$$,
  '42501', null, 'other user cannot insert for owner');

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq($$select status from public.progress where user_id = '11111111-1111-1111-1111-111111111111'$$,
  array['done'::text], 'done progress remains intact');
select results_eq($$update public.progress set status = 'learning'
  where user_id = '11111111-1111-1111-1111-111111111111' returning status$$,
  array['done'::text], 'monotonic trigger protects done');
select results_eq($$select passed from public.quiz_results where user_id = '11111111-1111-1111-1111-111111111111'$$,
  array[true], 'passed result remains intact');

select * from finish();
rollback;
