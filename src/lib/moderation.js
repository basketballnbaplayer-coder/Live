import { supabase } from "./supabaseClient";

export async function banUser(channel, username, bannedByUserId, reason = null) {
  const { error } = await supabase.from("banned_users").insert({ channel, username, banned_by: bannedByUserId, reason });
  return { ok: !error, error: error?.message };
}

export async function unbanUser(channel, username) {
  const { error } = await supabase.from("banned_users").delete().eq("channel", channel).eq("username", username);
  return { ok: !error, error: error?.message };
}

export async function listBanned(channel) {
  const { data, error } = await supabase.from("banned_users").select("username, reason, created_at").eq("channel", channel);
  if (error) return [];
  return data;
}

export async function isBanned(channel, username) {
  const { data } = await supabase.from("banned_users").select("username").eq("channel", channel).eq("username", username).maybeSingle();
  return !!data;
}
