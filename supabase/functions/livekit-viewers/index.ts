// supabase/functions/livekit-viewers/index.ts
//
// The authoritative viewer count. Earlier versions counted browser
// "presence" pings, which any script can fake infinitely just by
// opening channels without ever actually connecting to the video.
// This instead asks LiveKit directly who is really connected to the
// room — you can't inflate this without actually establishing a
// real LiveKit connection for each fake viewer, which is a much
// higher bar (and rate-limited separately in livekit-token).

import { RoomServiceClient } from "npm:livekit-server-sdk@2";

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
    const { room } = await req.json();
    if (!room) return json({ error: "room is required" }, 400);

    const host = Deno.env.get("LIVEKIT_URL")!.replace("wss://", "https://");
    const svc = new RoomServiceClient(host, Deno.env.get("LIVEKIT_API_KEY")!, Deno.env.get("LIVEKIT_API_SECRET")!);

    let participants: Array<{ identity: string }> = [];
    try {
      participants = await svc.listParticipants(room);
    } catch {
      // room doesn't exist yet (nobody connected) — that's 0 viewers, not an error
      participants = [];
    }

    // don't count the broadcaster (identity === room name) or the
    // Studio "what viewers see" self-preview as real viewers
    const viewers = participants.filter(
      (p) => p.identity !== room && !p.identity.endsWith("__studio_preview")
    ).length;

    return json({ viewers });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
