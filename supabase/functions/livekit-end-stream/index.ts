// supabase/functions/livekit-end-stream/index.ts
//
// Called when the broadcaster clicks "End Stream" — deletes their
// LiveKit ingress so OBS's RTMP connection is actually torn down.
// Also usable by an admin to force-end someone ELSE's stream: pass
// { targetChannel } in the body; only honored if the caller's own
// profile has is_admin = true (checked server-side, not trusted
// from the client).

import { createClient } from "npm:@supabase/supabase-js@2";
import { IngressClient } from "npm:livekit-server-sdk@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) return json({ error: "Not authenticated" }, 401);

    const { data: profile } = await supabase.from("profiles").select("username, is_admin").eq("id", user.id).single();
    if (!profile) return json({ error: "No profile found" }, 400);

    let { targetChannel } = await req.json().catch(() => ({ targetChannel: null }));
    if (targetChannel && targetChannel !== profile.username && !profile.is_admin) {
      return json({ error: "Only admins can end someone else's stream." }, 403);
    }
    const channelToEnd = targetChannel || profile.username;

    const host = Deno.env.get("LIVEKIT_URL")!.replace("wss://", "https://");
    const ingressClient = new IngressClient(
      host,
      Deno.env.get("LIVEKIT_API_KEY")!,
      Deno.env.get("LIVEKIT_API_SECRET")!
    );

    const existing = await ingressClient.listIngress({ roomName: channelToEnd });
    for (const ing of existing) {
      if (ing.ingressId) await ingressClient.deleteIngress(ing.ingressId);
    }

    return json({ ok: true });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
