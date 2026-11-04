-- Run this in the Supabase SQL editor for the project used by NEXT_PUBLIC_SUPABASE_URL.
-- Also turn off "Allow public access to channels" in Supabase Realtime settings.
-- The application signs a short-lived HS256 JWT per workspace. Its workspace_id claim is set
-- only after Better Auth session and local workspace membership have been checked server-side.

drop policy if exists "helfer workspace channel read" on realtime.messages;
create policy "helfer workspace channel read"
on realtime.messages
for select
to authenticated
using (
  extension in ('broadcast', 'presence')
  and realtime.topic() = 'doc:' || (select auth.jwt() ->> 'workspace_id')
);

drop policy if exists "helfer workspace channel write" on realtime.messages;
create policy "helfer workspace channel write"
on realtime.messages
for insert
to authenticated
with check (
  extension in ('broadcast', 'presence')
  and realtime.topic() = 'doc:' || (select auth.jwt() ->> 'workspace_id')
);
