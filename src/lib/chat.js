import { supabase } from "./supabaseClient";

export async function fetchMessages(channel, limit = 50) {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("channel", channel)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) return [];
  return data;
}

export async function sendMessage(channel, { userId, username, color, text, role = null }) {
  const { error } = await supabase.from("chat_messages").insert({ channel, user_id: userId, username, color, text, role });
  return { ok: !error, error: error?.message };
}

export async function clearChannel(channel) {
  await supabase.from("chat_messages").delete().eq("channel", channel);
}

/** Calls onMessage(newRow) the instant anyone posts in this channel. */
export function subscribeToChat(channel, onMessage) {
  const sub = supabase
    .channel(`chat:${channel}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel=eq.${channel}` },
      (payload) => onMessage(payload.new)
    )
    .subscribe();
  return () => supabase.removeChannel(sub);
}
