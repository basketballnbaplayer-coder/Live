// supabase/functions/livekit-token/index.ts
//
// Called by anyone watching a channel (logged in or not). Hands back
// a short-lived, subscribe-only LiveKit token so the viewer's
// browser can connect and render the broadcaster's real video.
//
// Rate-limited per identity using the token_requests table (see
// supabase/sql/v3_security.sql) so a script can't spin up an
// unbounded number of "viewers" by hammering this endpoint — each
// fake viewer now costs a real LiveKit connection AND is capped
// here before it even gets that far.

import { createClient } from "npm:@supabase/supabase-js@2";
import { AccessToken } from "npm:livekit-server-sdk@2";

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

const MAX_REQUESTS_PER_WINDOW = 20;
const WINDOW_SECONDS = 60;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { room, identity } = await req.json();
    if (!room) return json({ error: "room is required" }, 400);

    const viewerIdentity = identity || `guest_${crypto.randomUUID().slice(0, 8)}`;

    // service-role client: bypasses RLS on purpose, only used
    // server-side, for the rate-limit bookkeeping table only.
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const since = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();
    const { count } = await admin
      .from("token_requests")
      .select("id", { count: "exact", head: true })
      .eq("identity", viewerIdentity)
      .gte("requested_at", since);

    if ((count ?? 0) >= MAX_REQUESTS_PER_WINDOW) {
      return json({ error: "Too many requests — please slow down." }, 429);
    }

    await admin.from("token_requests").insert({ identity: viewerIdentity });

    const at = new AccessToken(Deno.env.get("LIVEKIT_API_KEY")!, Deno.env.get("LIVEKIT_API_SECRET")!, {
      identity: viewerIdentity,
    });
    at.addGrant({ roomJoin: true, room, canPublish: false, canSubscribe: true });

    const token = await at.toJwt();
    return json({ token, url: Deno.env.get("LIVEKIT_URL") });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
