-- pgTAP checks for learning_events isolation.
-- Execute in a Supabase test database with pgTAP enabled.

begin;
select plan(4);

select has_table('public', 'learning_events', 'learning_events table exists');
select policies_are('public', 'learning_events', 2, 'learning_events has select and insert policies');
select policy_cmd_is('public', 'learning_events', 'learning_events_select_own', 'SELECT', 'select policy exists');
select policy_cmd_is('public', 'learning_events', 'learning_events_insert_own', 'INSERT', 'insert policy exists');

select * from finish();
rollback;
