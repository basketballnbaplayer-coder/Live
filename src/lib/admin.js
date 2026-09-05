import { supabase } from "./supabaseClient";
import { endIngress } from "./livekit";
import { endLive } from "./live";
import { banUser } from "./moderation";

/** All registered users — RLS only lets this return real data if the caller is_admin. */
export async function listAllUsers() {
  const { data, error } = await supabase.from("profiles").select("id, username, hue, is_admin, created_at").order("created_at", { ascending: false });
  if (error) return [];
  return data;
}

export async function setUserAdmin(userId, isAdmin) {
  const { error } = await supabase.from("profiles").update({ is_admin: isAdmin }).eq("id", userId);
  return { ok: !error, error: error?.message };
}

/** Force-ends someone else's stream: deletes the DB row AND the real LiveKit ingress. */
export async function forceEndStream(username) {
  await endIngress(username);
  await endLive(username);
}

/** Site-wide ban — an admin banning someone from a channel that isn't their own. */
export async function adminBanFromChannel(channel, username, adminUserId, reason) {
  return banUser(channel, username, adminUserId, reason);
}

export async function fileReport({ reporterId, targetType, targetChannel, targetMessageId = null, reason }) {
  const { error } = await supabase.from("reports").insert({
    reporter_id: reporterId,
    target_type: targetType,
    target_channel: targetChannel,
    target_message_id: targetMessageId,
    reason,
  });
  return { ok: !error, error: error?.message };
}

export async function listReports(status = "open") {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data;
}

export async function resolveReport(id) {
  await supabase.from("reports").update({ status: "resolved" }).eq("id", id);
}

export async function submitSupportTicket({ userId, name, email, subject, message }) {
  const { error } = await supabase.from("support_tickets").insert({ user_id: userId, name, email, subject, message });
  return { ok: !error, error: error?.message };
}

export async function listSupportTickets(status = "open") {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data;
}

export async function resolveSupportTicket(id) {
  await supabase.from("support_tickets").update({ status: "resolved" }).eq("id", id);
}
