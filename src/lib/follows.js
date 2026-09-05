import { supabase } from "./supabaseClient";

export async function listFollowed(userId) {
  const { data, error } = await supabase.from("follows").select("followee_username").eq("follower_id", userId);
  if (error) return [];
  return data.map((r) => r.followee_username);
}

export async function followChannel(userId, username) {
  await supabase.from("follows").insert({ follower_id: userId, followee_username: username });
}

export async function unfollowChannel(userId, username) {
  await supabase.from("follows").delete().eq("follower_id", userId).eq("followee_username", username);
}

/** Real, public follower count for a channel — anyone can see it. */
export async function getFollowerCount(username) {
  const { count, error } = await supabase
    .from("follows")
    .select("follower_id", { count: "exact", head: true })
    .eq("followee_username", username);
  if (error) return 0;
  return count ?? 0;
}

/**
 * Calls onNewFollow(followerUsername) the instant someone follows
 * this channel — used to show a live "X just followed!" notice in
 * Creator Studio while broadcasting.
 */
export function subscribeToFollowers(username, onNewFollow) {
  const channel = supabase
    .channel(`followers_${username}_${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "follows", filter: `followee_username=eq.${username}` },
      onNewFollow
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}
