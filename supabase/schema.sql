-- =========================================================
-- StreamHub — Supabase schema
-- Paste this whole file into Supabase → SQL Editor → Run.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE everywhere.
-- =========================================================

-- 1) PROFILES ------------------------------------------------
-- One row per registered user. Created automatically on signup
-- by the trigger at the bottom (reads the "username" you pass
-- in supabase.auth.signUp({ options: { data: { username } } })).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  hue int not null default floor(random() * 360),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles are publicly readable" on public.profiles;
create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- auto-create a profile row whenever someone signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2) LIVE STREAMS ---------------------------------------------
-- One row per user, only while they're broadcasting. The app
-- pings "last_ping" every few seconds; rows older than ~20s are
-- treated as offline by the client (or you can add a cron job
-- to delete stale rows — see note at the bottom).
create table if not exists public.live_streams (
  username text primary key references public.profiles (username) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  category text not null default 'Just Chatting',
  hue int not null default 0,
  started_at timestamptz not null default now(),
  last_ping timestamptz not null default now()
);

alter table public.live_streams enable row level security;

drop policy if exists "live streams are publicly readable" on public.live_streams;
create policy "live streams are publicly readable"
  on public.live_streams for select
  using (true);

drop policy if exists "users manage only their own live row" on public.live_streams;
create policy "users manage only their own live row"
  on public.live_streams for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- 3) CHAT MESSAGES ----------------------------------------------
create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  channel text not null,               -- the broadcaster's username
  user_id uuid references auth.users (id) on delete set null,
  username text not null,
  color text not null default '#9147FF',
  role text,                           -- 'mod' | 'vip' | 'sub' | null
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_channel_idx
  on public.chat_messages (channel, created_at desc);

alter table public.chat_messages enable row level security;

drop policy if exists "chat is publicly readable" on public.chat_messages;
create policy "chat is publicly readable"
  on public.chat_messages for select
  using (true);

drop policy if exists "logged in users can post chat" on public.chat_messages;
create policy "logged in users can post chat"
  on public.chat_messages for insert
  with check (auth.uid() = user_id);

-- only the channel owner can clear their own chat
drop policy if exists "channel owner can delete their chat" on public.chat_messages;
create policy "channel owner can delete their chat"
  on public.chat_messages for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.username = chat_messages.channel
      and profiles.id = auth.uid()
    )
  );


-- 4) FOLLOWS ------------------------------------------------------
create table if not exists public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  followee_username text not null references public.profiles (username) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_username)
);

alter table public.follows enable row level security;

drop policy if exists "follow rows are publicly readable" on public.follows;
create policy "follow rows are publicly readable"
  on public.follows for select
  using (true);

drop policy if exists "users manage only their own follows" on public.follows;
create policy "users manage only their own follows"
  on public.follows for all
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);


-- 5) REALTIME -------------------------------------------------------
-- Turn on Realtime for the tables the app subscribes to.
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.live_streams;

-- =========================================================
-- OPTIONAL: run this once if you want stale "live" rows swept
-- automatically instead of just filtered client-side. Supabase
-- doesn't run cron by default — enable the pg_cron extension
-- first (Database → Extensions → pg_cron), then:
--
-- select cron.schedule(
--   'sweep-stale-live-streams',
--   '*/1 * * * *', -- every minute
--   $$ delete from public.live_streams where last_ping < now() - interval '30 seconds' $$
-- );
-- =========================================================
