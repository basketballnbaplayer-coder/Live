-- =========================================================
-- StreamHub v4.0 — Google OAuth support
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- =========================================================

-- The original handle_new_user() trusted raw_user_meta_data->>'username'
-- or the email prefix as-is. Google sign-ins don't provide a
-- 'username' field at all (they give full_name/name/email instead),
-- and email-derived names can contain dots/pluses that violate the
-- profiles_username_format constraint — which would make the whole
-- signup transaction fail. This version sanitizes the name and
-- resolves collisions (e.g. two Google accounts sharing an email
-- prefix) instead of erroring out.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
  final_username text;
begin
  base_username := lower(regexp_replace(
    coalesce(
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    '[^a-zA-Z0-9_]', '', 'g'
  ));

  if base_username is null or length(base_username) < 3 then
    base_username := 'user' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  base_username := substr(base_username, 1, 20);
  final_username := base_username;

  -- resolve collisions by appending a short random suffix
  while exists (select 1 from public.profiles where username = final_username) loop
    final_username := substr(base_username, 1, 15) || '_' || substr(md5(random()::text), 1, 4);
  end loop;

  insert into public.profiles (id, username)
  values (new.id, final_username);
  return new;
end;
$$;
-- trigger itself is unchanged (still points at this function), no
-- need to recreate it.
