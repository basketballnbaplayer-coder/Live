import { supabase } from "./supabaseClient";

/**
 * Sign up a new user. Supabase sends a real confirmation email
 * automatically (Authentication → Email Templates in the dashboard
 * to customize it). The account can't log in until the link in
 * that email is clicked — this replaces the fake 6-digit-code
 * flow from the standalone demo with an actual email provider.
 */
export async function signUp(username, email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, session: data.session, user: data.user };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, session: data.session, user: data.user };
}

export async function signOut() {
  await supabase.auth.signOut();
}

/**
 * Redirects to Google's consent screen; Supabase handles the OAuth
 * dance and comes back with a session automatically (the auth
 * client has detectSessionInUrl on by default). Requires the
 * Google provider to be turned on in Supabase Dashboard →
 * Authentication → Providers, with a Google Cloud OAuth Client
 * ID/Secret pasted in there.
 */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function checkUsernameAvailable(username) {
  const { data, error } = await supabase.from("profiles").select("username").eq("username", username).maybeSingle();
  if (error) return null; // couldn't check — don't block on an unrelated error
  return !data;
}

function sanitizeUsername(raw, fallbackSeed) {
  const cleaned = (raw || "").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
  return cleaned.length >= 3 ? cleaned : `user_${fallbackSeed.slice(0, 8)}`;
}

export async function getProfile(userId) {
  // maybeSingle (not single!) — single() throws a 406 the moment
  // zero rows come back, which is exactly what happens if a
  // profile row is somehow missing, and that 406 was leaving
  // logged-in users stuck looking "logged out" in the UI.
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) return null;
  if (data) return data;

  // self-heal: an authenticated user with no profile row (e.g. a
  // Google sign-in whose metadata didn't carry a clean username)
  // gets one created on the spot instead of being stuck forever.
  // Retries with a random suffix if the base name is already taken.
  const { data: authData } = await supabase.auth.getUser();
  const email = authData?.user?.email || "";
  const meta = authData?.user?.user_metadata || {};
  const base = sanitizeUsername(meta.username || meta.full_name || meta.name || email.split("@")[0], userId);

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base.slice(0, 15)}_${Math.random().toString(36).slice(2, 6)}`;
    const { data: created, error: createErr } = await supabase
      .from("profiles")
      .insert({ id: userId, username: candidate })
      .select()
      .single();
    if (!createErr) return created;
    // 23505 = unique_violation (username taken) — try another; any
    // other error means give up instead of looping forever.
    if (createErr.code !== "23505") return null;
  }
  return null;
}

/** Call once on app start, and keep the callback in sync afterwards. */
export function onAuthChange(callback) {
  supabase.auth.getSession().then(({ data }) => callback(data.session));
  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => sub.subscription.unsubscribe();
}
