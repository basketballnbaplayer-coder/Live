import { useState, useEffect, useRef } from "react";
import { Send, ShieldOff, Flag } from "lucide-react";
import { ACCENT } from "../data/mockData";
import { parseEmotes } from "../utils/emotes";
import { useAppStore } from "../store/useAppStore";
import { fetchMessages, sendMessage, subscribeToChat } from "../lib/chat";
import { banUser } from "../lib/moderation";
import { fileReport } from "../lib/admin";

function Message({ m, t, canModerate, onBan, canReport, onReport }) {
  const pieces = parseEmotes(m.text);
  return (
    <p className="leading-snug group flex items-start gap-1.5">
      <span className="flex-1 min-w-0">
        <span style={{ color: m.color }} className="font-semibold">
          {m.username}
        </span>
        <span className={t.sub}>: </span>
        {pieces.map((p, i) =>
          p.type === "emote" ? (
            <span key={i} title={p.key} className="text-[15px] align-text-bottom">
              {p.value}
            </span>
          ) : (
            <span key={i}>{p.value}</span>
          )
        )}
      </span>
      <span className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 flex-shrink-0 transition-opacity">
        {canReport && (
          <button onClick={() => onReport(m)} title="Report this message" className={t.sub2}>
            <Flag size={11} />
          </button>
        )}
        {canModerate && (
          <button onClick={() => onBan(m.username)} title={`Ban ${m.username}`} className="text-red-400">
            <ShieldOff size={12} />
          </button>
        )}
      </span>
    </p>
  );
}

// channel: the broadcaster's username — messages are shared, real,
// and delivered instantly to everyone via Supabase Realtime.
// isOwner: pass true when the logged-in user owns this channel, to
// show moderation controls (ban) — also enforced server-side by RLS
// regardless of what the UI shows.
export default function Chat({ t, channel, isOwner }) {
  const user = useAppStore((s) => s.user);
  const [chatMsg, setChatMsg] = useState("");
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetchMessages(channel).then((msgs) => {
      if (!cancelled) setMessages(msgs);
    });
    const unsubscribe = subscribeToChat(channel, (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [channel]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMsg = async () => {
    if (!chatMsg.trim()) return;
    if (!user) return;
    const text = chatMsg;
    setChatMsg("");
    const result = await sendMessage(channel, {
      userId: user.id,
      username: user.username,
      color: `hsl(${(user.hue ?? 260)} 70% 60%)`,
      text,
    });
    // server-side rate limit / ban check can reject the insert —
    // surface that instead of silently dropping the message
    if (!result.ok) setChatMsg(text);
  };

  const handleBan = async (username) => {
    if (!confirm(`Ban ${username} from this chat?`)) return;
    await banUser(channel, username, user.id);
    setMessages((prev) => prev.filter((m) => m.username !== username));
  };

  const handleReportMessage = async (msg) => {
    if (!user) {
      alert("Log in to report a message.");
      return;
    }
    const reason = prompt(`Why are you reporting this message from ${msg.username}?`, msg.text.slice(0, 60));
    if (!reason || !reason.trim()) return;
    const result = await fileReport({ reporterId: user.id, targetType: "message", targetChannel: channel, targetMessageId: msg.id, reason: reason.trim() });
    alert(result.ok ? "Report sent — thanks for flagging this." : "Couldn't send the report, try again.");
  };

  return (
    <div className="flex flex-col min-h-0 h-full w-full">
      <div className={`h-11 flex items-center px-3 border-b ${t.border} font-semibold text-sm flex-shrink-0`}>
        Stream Chat
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 text-[13px]">
        {messages.length === 0 && <p className={`text-xs ${t.sub2}`}>No messages yet — say hi 👋</p>}
        {messages.map((m) => (
          <Message key={m.id} m={m} t={t} canModerate={isOwner} onBan={handleBan} canReport={!!user} onReport={handleReportMessage} />
        ))}
        <div ref={bottomRef} />
      </div>
      <div className={`p-2 border-t ${t.border} flex gap-2 flex-shrink-0`}>
        <input
          value={chatMsg}
          onChange={(e) => setChatMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMsg()}
          placeholder={user ? "Send a message (try: poggers, lmao, gg)" : "Log in to chat"}
          disabled={!user}
          className={`flex-1 text-sm rounded px-3 py-1.5 outline-none focus:ring-1 focus:ring-[#9147FF] disabled:opacity-50 ${t.input}`}
        />
        <button
          onClick={sendMsg}
          disabled={!user}
          className="text-white rounded px-2.5 flex items-center justify-center flex-shrink-0 disabled:opacity-50"
          style={{ backgroundColor: ACCENT }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
