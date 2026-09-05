// supabase/functions/livekit-ingress/index.ts
//
// Called by the logged-in broadcaster from Creator Studio. Verifies
// who they are via their Supabase session, then asks LiveKit for a
// real RTMP ingest URL + stream key scoped to a room named after
// their username. Paste this straight into OBS's Stream settings.

import { createClient } from "npm:@supabase/supabase-js@2";
import { IngressClient, IngressInput } from "npm:livekit-server-sdk@2";

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) return json({ error: "Not authenticated" }, 401);

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();
    if (profileErr || !profile) return json({ error: "No profile found for this account" }, 400);

    const host = Deno.env.get("LIVEKIT_URL")!.replace("wss://", "https://");
    const ingressClient = new IngressClient(
      host,
      Deno.env.get("LIVEKIT_API_KEY")!,
      Deno.env.get("LIVEKIT_API_SECRET")!
    );

    // Remove any ingress this user already has so OBS always gets a
    // fresh, valid key instead of erroring on a duplicate room.
    const existing = await ingressClient.listIngress({ roomName: profile.username });
    for (const ing of existing) {
      if (ing.ingressId) await ingressClient.deleteIngress(ing.ingressId);
    }

    const ingress = await ingressClient.createIngress(IngressInput.RTMP_INPUT, {
      name: `${profile.username}-stream`,
      roomName: profile.username,
      participantIdentity: profile.username,
      participantName: profile.username,
    });

    return json({ url: ingress.url, streamKey: ingress.streamKey });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
