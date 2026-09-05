/**
 * StreamHub bot example — logs in as a regular StreamHub account and
 * uses the resulting access_token to act on the site programmatically
 * (here: post a chat message). This is NOT a special "bot API" —
 * it's the exact same Supabase auth every real user goes through;
 * a bot is just an account whose password only the bot script knows.
 *
 * Setup:
 *   1. npm install
 *   2. Create a normal account for the bot (Sign Up on the site, or
 *      run scripts/create-bot-account.js below), e.g.
 *      username: streamhub_bot, email: bot@yourdomain.com
 *   3. Copy .env.example to .env and fill in the values
 *   4. node login.js
 */
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function main() {
  // 1) Log in — this IS the "access token" request. session.access_token
  //    is a normal JWT, valid ~1 hour; session.refresh_token can be
  //    stored to silently get a new one without re-entering the password.
  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env.BOT_EMAIL,
    password: process.env.BOT_PASSWORD,
  });

  if (error) {
    console.error("Bot login failed:", error.message);
    process.exit(1);
  }

  console.log("Logged in as:", data.user.email);
  console.log("access_token (valid ~1h):", data.session.access_token.slice(0, 24) + "...");
  console.log("refresh_token (store this to stay logged in):", data.session.refresh_token.slice(0, 24) + "...");

  // 2) Look up the bot's own profile (needed to post as itself)
  const { data: profile } = await supabase.from("profiles").select("username, hue").eq("id", data.user.id).single();

  // 3) Example authenticated action: post a chat message.
  //    Row Level Security still applies — this only works because
  //    auth.uid() now resolves to the bot's own user id.
  const channel = process.argv[2] || profile.username;
  const text = process.argv[3] || "🤖 beep boop, the bot is online!";

  const { error: postError } = await supabase.from("chat_messages").insert({
    channel,
    user_id: data.user.id,
    username: profile.username,
    color: `hsl(${profile.hue} 70% 60%)`,
    text,
  });

  if (postError) console.error("Couldn't post message:", postError.message);
  else console.log(`Posted to #${channel}: "${text}"`);

  // supabase-js keeps the session in memory and auto-refreshes it for
  // as long as this process runs. For a long-running bot, just reuse
  // this same `supabase` client instead of logging in again per call.
}

main();
