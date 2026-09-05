import { useState, useEffect, useRef } from "react";
import {
  Radio, Video, VideoOff, Mic, MicOff, CameraOff, Users, Key, Lock, Copy,
  Eye, EyeOff, Link2, Loader2, RefreshCw, CheckCircle2, Heart, UserPlus,
  Shield, X as XIcon,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { ACCENT, CATEGORIES, fmt } from "../data/mockData";
import { goLive, endLive, pingLive } from "../lib/live";
import { getRealViewerCount, endIngress, getIngressCredentials } from "../lib/livekit";
import { getFollowerCount, subscribeToFollowers } from "../lib/follows";
import { getProfile } from "../lib/auth";
import { listBanned, unbanUser } from "../lib/moderation";
import { useLiveKitViewer } from "../lib/useLiveKitViewer";
import Chat from "./Chat";

const PING_MS = 5000;

export default function StudioPage({ t, navigate }) {
  const user = useAppStore((s) => s.user);

  const [isLive, setIsLive] = useState(false);
  const [title, setTitle] = useState("my first stream on StreamHub!");
  const [category, setCategory] = useState("Just Chatting");
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [viewers, setViewers] = useState(0);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState("");
  const videoRef = useRef(null);

  const [obsCreds, setObsCreds] = useState(null); // { url, streamKey }
  const [obsLoading, setObsLoading] = useState(false);
  const [obsError, setObsError] = useState(null);

  const [followerCount, setFollowerCount] = useState(0);
  const [followToasts, setFollowToasts] = useState([]); // [{id, username}]
  const [bannedList, setBannedList] = useState([]);
  const [showBanned, setShowBanned] = useState(false);

  // confirms real video is actually reaching LiveKit (from OBS or
  // a browser publisher) — same hook the viewer page uses.
  // Important: this must use a DIFFERENT identity than the OBS
  // publisher (which connects as `user.username`) — LiveKit kicks
  // the older connection when two clients share an identity, which
  // caused an infinite connect/disconnect loop fighting with OBS.
  const previewIdentity = user ? `${user.username}__studio_preview` : undefined;
  const { videoRef: liveVideoRef, hasVideo: liveHasVideo } = useLiveKitViewer(user?.username, previewIdentity, isLive);

  useEffect(() => {
    if (cameraStream && videoRef.current) videoRef.current.srcObject = cameraStream;
  }, [cameraStream]);

  // real follower count, refreshed whenever someone (un)follows
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const n = await getFollowerCount(user.username);
      if (!cancelled) setFollowerCount(n);
    };
    load();
    const unsubscribe = subscribeToFollowers(user.username, async (payload) => {
      load();
      const followerProfile = await getProfile(payload.new.follower_id);
      const id = Date.now();
      setFollowToasts((t) => [...t, { id, username: followerProfile?.username || "Someone" }]);
      setTimeout(() => setFollowToasts((t) => t.filter((x) => x.id !== id)), 4000);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (!isLive || !user) return;
    const id = setInterval(() => pingLive(user.username, { title, category }), PING_MS);
    return () => clearInterval(id);
  }, [isLive, user, title, category]);

  useEffect(() => {
    if (!isLive || !user) {
      setViewers(0);
      return;
    }
    let cancelled = false;
    const poll = async () => {
      const n = await getRealViewerCount(user.username);
      if (!cancelled) setViewers(n);
    };
    poll();
    const id = setInterval(poll, PING_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isLive, user]);

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [cameraStream]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraStream(stream);
      setCameraError(null);
      setMicOn(true);
      setCamOn(true);
      return stream;
    } catch {
      setCameraError("Camera/mic access was denied or unavailable — that's fine if you're only using OBS.");
      return null;
    }
  };

  const toggleLive = async () => {
    if (!user) return;
    if (!isLive) {
      setObsError(null);
      setObsLoading(true);
      const creds = await getIngressCredentials();
      setObsLoading(false);
      if (!creds.ok) {
        setObsError(creds.error);
        return;
      }
      setObsCreds(creds);
      await startCamera(); // optional local webcam preview only

      const result = await goLive(user.id, user.username, { title, category, hue: user.hue });
      if (!result.ok) {
        setObsError(result.error || "Couldn't mark the channel live.");
        return;
      }
      setIsLive(true);
    } else {
      // actually tears down the RTMP ingress on LiveKit's side, not
      // just our own "live" row — otherwise OBS could keep publishing
      // to a stream nobody's tracking as live anymore.
      await endIngress();
      await endLive(user.username);
      cameraStream?.getTracks().forEach((tr) => tr.stop());
      setCameraStream(null);
      setIsLive(false);
      setObsCreds(null);
    }
  };

  const toggleMic = () => {
    setMicOn((v) => {
      const next = !v;
      cameraStream?.getAudioTracks().forEach((tr) => (tr.enabled = next));
      return next;
    });
  };
  const toggleCam = () => {
    setCamOn((v) => {
      const next = !v;
      cameraStream?.getVideoTracks().forEach((tr) => (tr.enabled = next));
      return next;
    });
  };

  useEffect(() => {
    if (!showBanned || !user) return;
    let cancelled = false;
    listBanned(user.username).then((list) => {
      if (!cancelled) setBannedList(list);
    });
    return () => {
      cancelled = true;
    };
  }, [showBanned, user]);

  const handleUnban = async (username) => {
    await unbanUser(user.username, username);
    setBannedList((prev) => prev.filter((b) => b.username !== username));
  };

  const copy = async (label, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      /* ignore */
    }
  };

  if (!user) return null;

  return (
    <div className={`h-screen w-full ${t.bg} ${t.text} flex flex-col`}>
      <div className={`h-12 flex items-center px-4 border-b ${t.border} flex-shrink-0 gap-4`}>
        <button onClick={() => navigate("")} className={`flex items-center gap-1 ${t.sub} text-sm`}>← Back</button>
        <span className="font-bold text-lg" style={{ color: ACCENT }}>Creator Studio</span>
        <div className="flex-1" />
        <button onClick={() => copy("link", `${window.location.origin}/#/channel/${user.username}`)} className={`hidden sm:flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border ${t.border} ${t.sub}`}>
          <Link2 size={14} /> {copied === "link" ? "Copied!" : "Copy channel link"}
        </button>
        <button onClick={toggleLive} disabled={obsLoading} className="flex items-center gap-1.5 text-white text-sm font-semibold px-4 py-1.5 rounded-md disabled:opacity-60" style={{ backgroundColor: isLive ? "#e91916" : ACCENT }}>
          {obsLoading ? <Loader2 size={14} className="animate-spin" /> : <Radio size={14} />} {isLive ? "End Stream" : "Go Live"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className={`relative rounded-lg overflow-hidden border ${t.border} aspect-video bg-black flex items-center justify-center`}>
            <video ref={liveVideoRef} autoPlay playsInline className={`w-full h-full object-contain ${liveHasVideo ? "" : "hidden"}`} />
            {!liveHasVideo && cameraStream ? (
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            ) : !liveHasVideo && cameraError ? (
              <div className="flex flex-col items-center gap-2 text-red-400 px-6 text-center">
                <CameraOff size={28} />
                <p className="text-sm">{cameraError}</p>
              </div>
            ) : !liveHasVideo ? (
              <div className="flex flex-col items-center gap-2 text-zinc-500 px-6 text-center">
                <Video size={28} />
                <p className="text-sm">Press Go Live, then start streaming in OBS with the key on the right</p>
              </div>
            ) : null}

            {liveHasVideo && (
              <span className="absolute top-2 left-2 bg-[#9147FF] text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide flex items-center gap-1">
                <CheckCircle2 size={11} /> Real video confirmed
              </span>
            )}
            {isLive && (
              <>
                <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[11px] px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Users size={12} /> {fmt(viewers)} watching
                </span>
                {cameraStream && !liveHasVideo && (
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    <button onClick={toggleMic} className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: micOn ? "rgba(0,0,0,0.55)" : "#e91916" }}>
                      {micOn ? <Mic size={15} /> : <MicOff size={15} />}
                    </button>
                    <button onClick={toggleCam} className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: camOn ? "rgba(0,0,0,0.55)" : "#e91916" }}>
                      {camOn ? <Video size={15} /> : <VideoOff size={15} />}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className={`rounded-lg border ${t.border} p-4 space-y-3`}>
            <div>
              <label className={`text-xs font-semibold ${t.sub2}`}>Stream title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={`mt-1 w-full text-sm rounded px-3 py-2 outline-none focus:ring-1 focus:ring-[#9147FF] ${t.input}`} />
            </div>
            <div>
              <label className={`text-xs font-semibold ${t.sub2}`}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={`mt-1 w-full text-sm rounded px-3 py-2 outline-none focus:ring-1 focus:ring-[#9147FF] ${t.input}`}>
                {CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Followers", value: followerCount },
              { label: "Viewers now", value: isLive ? viewers : 0 },
              { label: "Status", value: isLive ? "LIVE" : "Offline" },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg border ${t.border} p-3`}>
                <p className="text-lg font-bold">{typeof s.value === "number" ? fmt(s.value) : s.value}</p>
                <p className={`text-[12px] ${t.sub2}`}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 flex flex-col min-h-0">
          <div className={`rounded-lg border ${t.border} p-4 space-y-3`}>
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <Key size={15} /> Stream to OBS
            </p>
            {!isLive ? (
              <p className={`text-xs ${t.sub2}`}>Press Go Live to generate a real, one-time RTMP server + key for OBS.</p>
            ) : obsError ? (
              <p className="text-xs text-red-400">{obsError}</p>
            ) : obsCreds ? (
              <>
                <div>
                  <label className={`text-[11px] font-semibold ${t.sub2}`}>Server</label>
                  <div className={`flex items-center gap-2 rounded px-3 py-2 mt-1 ${t.input}`}>
                    <span className="text-sm font-mono truncate flex-1">{obsCreds.url}</span>
                    <button onClick={() => copy("server", obsCreds.url)} className={t.sub2}>
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className={`text-[11px] font-semibold ${t.sub2}`}>Stream Key</label>
                  <div className={`flex items-center gap-2 rounded px-3 py-2 mt-1 ${t.input}`}>
                    <Lock size={13} className={`${t.sub2} flex-shrink-0`} />
                    <span className="text-sm font-mono truncate flex-1">{showKey ? obsCreds.streamKey : "•".repeat(24)}</span>
                    <button onClick={() => setShowKey((v) => !v)} className={t.sub2}>
                      {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button onClick={() => copy("key", obsCreds.streamKey)} className={t.sub2}>
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
                {(copied === "server" || copied === "key") && <p className="text-[11px]" style={{ color: ACCENT }}>Copied!</p>}
                <p className={`text-[11px] ${t.sub2}`}>In OBS: Settings → Stream → Service "Custom" → paste Server + Stream Key above.</p>
              </>
            ) : null}
          </div>

          <div className={`rounded-lg border ${t.border} p-3`}>
            <button onClick={() => setShowBanned((v) => !v)} className={`w-full flex items-center justify-between text-sm font-semibold ${t.text}`}>
              <span className="flex items-center gap-1.5">
                <Shield size={14} /> Banned users {bannedList.length > 0 && showBanned ? `(${bannedList.length})` : ""}
              </span>
              <span className={t.sub2}>{showBanned ? "▲" : "▼"}</span>
            </button>
            {showBanned && (
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {bannedList.length === 0 ? (
                  <p className={`text-xs ${t.sub2}`}>Nobody is banned from your chat.</p>
                ) : (
                  bannedList.map((b) => (
                    <div key={b.username} className={`flex items-center justify-between text-xs rounded px-2 py-1.5 ${t.input}`}>
                      <span>{b.username}</span>
                      <button onClick={() => handleUnban(b.username)} className="text-red-400 hover:text-red-300 flex items-center gap-1">
                        <XIcon size={11} /> Unban
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className={`rounded-lg border ${t.border} flex-1 min-h-[280px] flex flex-col`}>
            <Chat t={t} channel={user.username} isOwner />
          </div>
        </div>
      </div>

      {/* live "someone just followed" notices */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none">
        {followToasts.map((ft) => (
          <div
            key={ft.id}
            className="pointer-events-auto flex items-center gap-2 bg-zinc-900 text-white border border-zinc-700 shadow-xl rounded-lg px-3.5 py-2.5 text-sm"
            style={{ animation: "followToastIn 0.25s ease-out" }}
          >
            <UserPlus size={16} style={{ color: ACCENT }} className="flex-shrink-0" />
            <span>
              <span className="font-semibold">{ft.username}</span> just followed! <Heart size={12} className="inline text-red-400" fill="currentColor" />
            </span>
          </div>
        ))}
        <style>{`@keyframes followToastIn { from { opacity:0; transform: translateY(8px) scale(.97);} to {opacity:1; transform:translateY(0) scale(1);} }`}</style>
      </div>
    </div>
  );
}
