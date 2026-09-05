import { useState, useEffect } from "react";
import { Loader2, VideoOff, Users, Heart, Flag } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { ACCENT, fmt } from "../data/mockData";
import { getLive, subscribeLiveChannels } from "../lib/live";
import { getRealViewerCount } from "../lib/livekit";
import { getFollowerCount, subscribeToFollowers } from "../lib/follows";
import { fileReport } from "../lib/admin";
import { useLiveKitViewer } from "../lib/useLiveKitViewer";
import { Thumb } from "./StreamGrid";
import Chat from "./Chat";

const GUEST_ID = `guest_${Math.random().toString(36).slice(2, 8)}`;
const VIEWER_POLL_MS = 6000;

// username: string — we look up everything else (title/category/live
// status) from Supabase, we never trust stale data passed in from the
// grid, since the broadcaster could have gone offline in the meantime.
export default function StreamPlayer({ t, username, onBack }) {
  const user = useAppStore((s) => s.user);
  const isFollowing = useAppStore((s) => s.isFollowing(username));
  const toggleFollow = useAppStore((s) => s.toggleFollow);
  const [liveData, setLiveData] = useState(undefined); // undefined = loading, null = offline
  const [viewers, setViewers] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const n = await getFollowerCount(username);
      if (!cancelled) setFollowerCount(n);
    };
    load();
    const unsubscribe = subscribeToFollowers(username, load);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [username]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const data = await getLive(username);
      if (!cancelled) setLiveData(data);
    };
    load();
    const unsubscribe = subscribeLiveChannels(load);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [username]);

  const isLive = !!liveData;

  // real, LiveKit-verified count — not a client-reported ping that
  // could be scripted infinitely.
  useEffect(() => {
    if (!isLive) {
      setViewers(0);
      return;
    }
    let cancelled = false;
    const poll = async () => {
      const n = await getRealViewerCount(username);
      if (!cancelled) setViewers(n);
    };
    poll();
    const id = setInterval(poll, VIEWER_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isLive, username]);

  const isOwnChannel = user && user.username === username;

  // never reuse the broadcaster's own identity here — if they're
  // watching their own channel while OBS is publishing as
  // `username`, an identical viewer identity would kick the OBS
  // connection (LiveKit disconnects the older client on collision).
  const viewerIdentity = user ? `${user.username}__viewer` : GUEST_ID;
  const { videoRef, hasVideo, error: videoError } = useLiveKitViewer(username, viewerIdentity, isLive);

  const handleReport = async () => {
    if (!user) {
      alert("Log in to report a channel.");
      return;
    }
    const reason = prompt(`Why are you reporting ${username}?`);
    if (!reason || !reason.trim()) return;
    const result = await fileReport({ reporterId: user.id, targetType: "channel", targetChannel: username, reason: reason.trim() });
    alert(result.ok ? "Report sent — thanks for flagging this." : "Couldn't send the report, try again.");
  };

  return (
    <div className={`h-screen w-full ${t.bg} ${t.text} flex flex-col`}>
      <div className={`h-12 flex items-center px-4 border-b ${t.border} flex-shrink-0 gap-4`}>
        <button onClick={onBack} className={`flex items-center gap-1 ${t.sub} text-sm`}>← Back</button>
        <span className="font-bold text-lg" style={{ color: ACCENT }}>StreamHub</span>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="relative w-full flex-1 min-h-0 bg-black flex items-center justify-center">
            {liveData === undefined ? (
              <Loader2 size={28} className="animate-spin text-zinc-600" />
            ) : !isLive ? (
              <div className="flex flex-col items-center gap-2 text-zinc-400 px-6 text-center">
                <VideoOff size={32} />
                <p className="text-sm">{username} is currently offline.</p>
              </div>
            ) : (
              <>
                {/* real video attaches here the instant OBS starts publishing */}
                <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-contain ${hasVideo ? "" : "hidden"}`} />
                {!hasVideo && (
                  <div className="absolute inset-0">
                    <Thumb hue={liveData.hue} live size="large" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-white/70 text-xs text-center px-6">
                      {videoError ? "Couldn't connect to the video." : "Waiting for the broadcaster's video…"}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 to-transparent px-4 pt-8 pb-2.5 flex items-center gap-3 text-white">
                  <span className="text-xs bg-red-600 px-1.5 py-0.5 rounded font-bold">LIVE</span>
                  <span className="text-xs text-zinc-300 flex items-center gap-1">
                    <Users size={12} /> {fmt(viewers)} watching
                  </span>
                </div>
              </>
            )}
          </div>

          <div className={`p-4 border-t ${t.border}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full flex-shrink-0" style={{ background: `hsl(${(liveData?.hue ?? 200)} 70% 45%)` }} />
                <div className="min-w-0">
                  <p className="font-semibold truncate">{liveData?.title || `${username}'s channel`}</p>
                  <p className={`text-sm truncate ${t.sub}`}>{username}</p>
                  <p className={`text-sm truncate ${t.sub2} flex items-center gap-2`}>
                    <span>{liveData?.category || "—"}</span>
                    <span className={t.sub2}>· {fmt(followerCount)} followers</span>
                  </p>
                </div>
              </div>
              {!isOwnChannel && user && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleFollow(username)}
                    className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-md transition-colors"
                    style={isFollowing ? { backgroundColor: "transparent", border: `1px solid ${ACCENT}`, color: ACCENT } : { backgroundColor: ACCENT, color: "white" }}
                  >
                    <Heart size={16} fill={isFollowing ? ACCENT : "none"} />
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                  <button onClick={handleReport} title="Report this channel" className={`p-2 rounded-md border ${t.border} ${t.sub2} hover:text-red-400`}>
                    <Flag size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`w-full sm:w-80 flex-shrink-0 sm:border-l ${t.border} min-h-0 flex`}>
          <Chat t={t} channel={username} isOwner={isOwnChannel} />
        </div>
      </div>
    </div>
  );
}
