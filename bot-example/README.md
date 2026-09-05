# StreamHub bot example

A "bot access token" here is nothing special — it's just a normal
Supabase login. Create a regular account for the bot (Sign Up on the
site works fine), then this script logs in as that account and gets
a real `access_token` (JWT), exactly like the website does in your
browser. From there it can do anything that account is allowed to do
under Row Level Security — post chat messages, check who's live, etc.

## Setup
```
cd bot-example
npm install
cp .env.example .env
```
Fill in `.env`:
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — already filled in, same as the main site
- `BOT_EMAIL` / `BOT_PASSWORD` — the login for the bot's account (create it via Sign Up first)

## Run
```
node login.js <channel> "message to post"
# example:
node login.js streamhub_bot "hello from the bot!"
```

## Notes
- `access_token` expires after about an hour. If you're writing a
  long-running bot (e.g. a Discord bridge), keep reusing the same
  `supabase` client instance — `@supabase/supabase-js` refreshes the
  session automatically in the background using the `refresh_token`.
- The bot is bound by the exact same database rules (RLS) as any
  other user — e.g. it can't post in a channel it's banned from, and
  it can't send messages faster than the server-side chat rate limit.
- If you want the bot to have admin powers (e.g. force-ending
  streams), make it an admin the same way you'd make yourself one:
  ```sql
  update public.profiles set is_admin = true where username = 'streamhub_bot';
  ```
