import { supabase } from "./supabaseClient";

/** Broadcaster only — returns real OBS-ready { url, streamKey }. */
export async function getIngressCredentials() {
  const { data, error } = await supabase.functions.invoke("livekit-ingress");
  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, error: data.error };
  return { ok: true, url: data.url, streamKey: data.streamKey };
}

/** Broadcaster (or admin, with targetChannel) — tears down an RTMP ingress. */
export async function endIngress(targetChannel = null) {
  const { data, error } = await supabase.functions.invoke("livekit-end-stream", { body: { targetChannel } });
  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, error: data.error };
  return { ok: true };
}

/** Anyone watching — returns a subscribe-only token + the LiveKit ws URL. */
export async function getViewerToken(room, identity) {
  const { data, error } = await supabase.functions.invoke("livekit-token", { body: { room, identity } });
  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, error: data.error };
  return { ok: true, token: data.token, url: data.url };
}

/**
 * The REAL viewer count — asks LiveKit who is actually connected to
 * the room, instead of trusting a client-reported presence ping
 * (which any script could fake without limit). Returns 0 on error
 * so the UI can fail quietly instead of showing garbage.
 */
export async function getRealViewerCount(room) {
  const { data, error } = await supabase.functions.invoke("livekit-viewers", { body: { room } });
  if (error || data?.error) return 0;
  return data.viewers ?? 0;
}
