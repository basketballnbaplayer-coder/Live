-- =========================================================
-- StreamHub v3.0 — Security & moderation foundation
-- Paste into Supabase → SQL Editor → Run.
-- Safe to re-run.
-- =========================================================

-- 1) Username format is now enforced on the SERVER, not just in
--    the signup form — a malicious client could otherwise send any
--    string, and usernames double as LiveKit room names / URL
--    segments, so garbage here is a real attack surface.
do $$
begin
  alter table public.profiles
    add constraint profiles_username_format
    check (username ~ '^[a-zA-Z0-9_]{3,20}$') not valid;
exception
  when duplicate_object then null;
end $$;
-- NOT VALID: protects every future insert/update immediately, but
-- doesn't retroactively fail on any pre-existing row that doesn't
-- match — otherwise this single statement could silently abort the
-- rest of this script on an older test account.


-- 2) BANNED USERS — a channel owner can ban a username from their
--    own chat. Enforced by RLS below, so it can't be bypassed by
--    calling the API directly instead of clicking a UI button.
create table if not exists public.banned_users (
  channel text not null references public.profiles (username) on delete cascade,
  username text not null,
  banned_by uuid not null references auth.users (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  primary key (channel, username)
);

alter table public.banned_users enable row level security;

drop policy if exists "ban list is publicly readable" on public.banned_users;
create policy "ban list is publicly readable"
  on public.banned_users for select
  using (true);

drop policy if exists "only the channel owner manages bans" on public.banned_users;
create policy "only the channel owner manages bans"
  on public.banned_users for all
  using (
    exists (select 1 from public.profiles where profiles.username = banned_users.channel and profiles.id = auth.uid())
  )
  with check (
    exists (select 1 from public.profiles where profiles.username = banned_users.channel and profiles.id = auth.uid())
  );


-- 3) Chat insert policy now also blocks banned users — this runs
--    on the database itself, so it can't be skipped by editing
--    frontend JS.
drop policy if exists "logged in users can post chat" on public.chat_messages;
create policy "logged in users can post chat"
  on public.chat_messages for insert
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.banned_users
      where banned_users.channel = chat_messages.channel
      and banned_users.username = chat_messages.username
    )
  );


-- 4) SERVER-SIDE chat rate limit. The "slow mode" toggle in the UI
--    was only a frontend cooldown — anyone calling the API directly
--    could ignore it completely. This trigger enforces a hard floor
--    of 1 message per 1.5s per user per channel, no matter how the
--    insert is made.
create or replace function public.enforce_chat_rate_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  last_msg timestamptz;
begin
  select created_at into last_msg
  from public.chat_messages
  where user_id = new.user_id and channel = new.channel
  order by created_at desc
  limit 1;

  if last_msg is not null and now() - last_msg < interval '1.5 seconds' then
    raise exception 'Sending messages too fast — please slow down.';
  end if;

  return new;
end;
$$;

drop trigger if exists chat_rate_limit_trigger on public.chat_messages;
create trigger chat_rate_limit_trigger
  before insert on public.chat_messages
  for each row execute function public.enforce_chat_rate_limit();


-- 5) Token-request bookkeeping for the livekit-token Edge Function,
--    so it can reject an identity requesting an unreasonable number
--    of viewer tokens in a short window (a cheap but real deterrent
--    against trivially scripted "infinite viewers").
create table if not exists public.token_requests (
  id bigint generated always as identity primary key,
  identity text not null,
  requested_at timestamptz not null default now()
);

create index if not exists token_requests_identity_time_idx
  on public.token_requests (identity, requested_at desc);

alter table public.token_requests enable row level security;
-- Intentionally no public policies: only the Edge Function (using
-- the secret/service key, which bypasses RLS) reads or writes here.

-- Housekeeping: old rows aren't needed after a few minutes.
-- Optional, requires the pg_cron extension (Database → Extensions):
-- select cron.schedule('sweep-token-requests', '*/5 * * * *',
--   $$ delete from public.token_requests where requested_at < now() - interval '10 minutes' $$);
