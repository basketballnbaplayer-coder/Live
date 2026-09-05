import { supabase } from "./supabaseClient";

const STALE_MS = 20000;

export async function goLive(userId, username, { title, category, hue }) {
  const { error } = await supabase
    .from("live_streams")
    .upsert({ username, user_id: userId, title, category, hue, started_at: new Date().toISOString(), last_ping: new Date().toISOString() });
  return { ok: !error, error: error?.message };
}

export async function pingLive(username, patch = {}) {
  await supabase.from("live_streams").update({ ...patch, last_ping: new Date().toISOString() }).eq("username", username);
}

export async function endLive(username) {
  await supabase.from("live_streams").delete().eq("username", username);
}

export async function getLive(username) {
  const { data, error } = await supabase.from("live_streams").select("*").eq("username", username).maybeSingle();
  if (error || !data) return null;
  if (Date.now() - new Date(data.last_ping).getTime() > STALE_MS) return null;
  return data;
}

export async function listLiveChannels() {
  const { data, error } = await supabase.from("live_streams").select("*").order("started_at", { ascending: false });
  if (error) return [];
  const now = Date.now();
  return data.filter((row) => now - new Date(row.last_ping).getTime() <= STALE_MS);
}

/** Live updates whenever any row in live_streams changes. */
export function subscribeLiveChannels(onChange) {
  // unique name per call — reusing one name across multiple components
  // (App.jsx and StreamPlayer.jsx both call this) makes the Supabase
  // client return the same already-subscribed channel and throw.
  const channel = supabase
    .channel(`live_streams_changes_${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "live_streams" }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
