import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent } from "livekit-client";
import { getViewerToken } from "./livekit";

/**
 * Connects to a LiveKit room as a subscribe-only viewer and attaches
 * the first published video track to the returned videoRef. Used by
 * both the real viewer page and the Studio "what viewers see"
 * preview — same real video, not a placeholder.
 */
export function useLiveKitViewer(room, identity, enabled) {
  const videoRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !room) return;
    let cancelled = false;
    let lkRoom;

    const connect = async () => {
      const result = await getViewerToken(room, identity);
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      lkRoom = new Room();

      lkRoom.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === "video" && videoRef.current) {
          track.attach(videoRef.current);
          setHasVideo(true);
        }
      });
      lkRoom.on(RoomEvent.TrackUnsubscribed, () => setHasVideo(false));
      lkRoom.on(RoomEvent.Disconnected, () => {
        setConnected(false);
        setHasVideo(false);
      });

      try {
        await lkRoom.connect(result.url, result.token);
        if (cancelled) {
          lkRoom.disconnect();
          return;
        }
        setConnected(true);
        setError(null);
      } catch (err) {
        setError(String(err));
      }
    };
    connect();

    return () => {
      cancelled = true;
      lkRoom?.disconnect();
      setConnected(false);
      setHasVideo(false);
    };
  }, [room, identity, enabled]);

  return { videoRef, connected, hasVideo, error };
}
