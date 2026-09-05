-- =========================================================
-- StreamHub v5.0 — Admin Panel, Reports, Support
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- =========================================================

-- 1) ADMIN FLAG -----------------------------------------------
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- IMPORTANT: after running this once, make yourself admin with:
--   update public.profiles set is_admin = true where username = 'YOUR_USERNAME';

-- SECURITY: the existing "users can update their own profile" policy
-- lets someone update their OWN row — which, without this trigger,
-- would let them just set is_admin = true on themselves directly.
-- This trigger silently keeps is_admin unchanged unless the person
-- making the change is already an admin (only admins can promote
-- other users via setUserAdmin()).
create or replace function public.protect_is_admin()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin then
    if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
      new.is_admin := old.is_admin;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_is_admin_trigger on public.profiles;
create trigger protect_is_admin_trigger
  before update on public.profiles
  for each row execute function public.protect_is_admin();


-- 2) Admins can moderate ANY channel, not just their own --------
drop policy if exists "admins can end any live stream" on public.live_streams;
create policy "admins can end any live stream"
  on public.live_streams for delete
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin));

drop policy if exists "admins can ban from any channel" on public.banned_users;
create policy "admins can ban from any channel"
  on public.banned_users for all
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin));

drop policy if exists "admins can delete any chat message" on public.chat_messages;
create policy "admins can delete any chat message"
  on public.chat_messages for delete
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin));


-- 3) REPORTS ----------------------------------------------------
-- "Report" button on a channel or a specific chat message.
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid references auth.users (id) on delete set null,
  target_type text not null check (target_type in ('channel', 'message')),
  target_channel text not null,
  target_message_id bigint references public.chat_messages (id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 500),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

drop policy if exists "logged in users can file a report" on public.reports;
create policy "logged in users can file a report"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

drop policy if exists "admins can view all reports" on public.reports;
create policy "admins can view all reports"
  on public.reports for select
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin));

drop policy if exists "reporters can view their own reports" on public.reports;
create policy "reporters can view their own reports"
  on public.reports for select
  using (auth.uid() = reporter_id);

drop policy if exists "admins can update report status" on public.reports;
create policy "admins can update report status"
  on public.reports for update
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin));


-- 4) SUPPORT TICKETS ----------------------------------------------
-- A basic "Contact us" form — open to anyone, even logged out.
create table if not exists public.support_tickets (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 200),
  subject text not null check (char_length(subject) between 1 and 200),
  message text not null check (char_length(message) between 1 and 2000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;

drop policy if exists "anyone can open a support ticket" on public.support_tickets;
create policy "anyone can open a support ticket"
  on public.support_tickets for insert
  with check (true);

drop policy if exists "admins can view support tickets" on public.support_tickets;
create policy "admins can view support tickets"
  on public.support_tickets for select
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin));

drop policy if exists "admins can update support tickets" on public.support_tickets;
create policy "admins can update support tickets"
  on public.support_tickets for update
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin));
