import {
  MessageSquare, Gamepad2, Music, Palette, Trophy, Radio,
} from "lucide-react";

// Only category metadata for filtering — no fake viewer counts,
// no scripted streamers. Everything "live" comes from Supabase now
// (see src/lib/live.js) — this file intentionally holds no content.
export const CATEGORIES = [
  { name: "Just Chatting", icon: MessageSquare, color: "#FF6B9D" },
  { name: "League of Legends", icon: Gamepad2, color: "#00C2B8" },
  { name: "Music", icon: Music, color: "#FFB800" },
  { name: "Art", icon: Palette, color: "#7C5CFF" },
  { name: "Valorant", icon: Trophy, color: "#FF4655" },
  { name: "IRL", icon: Radio, color: "#4CD964" },
];

export const ACCENT = "#9147FF";

export const THEME = {
  dark: {
    bg: "bg-[#0e0e10]", text: "text-zinc-100", sub: "text-zinc-400", sub2: "text-zinc-500",
    border: "border-zinc-800", panel: "bg-zinc-900", hover: "hover:bg-zinc-800/60",
    input: "bg-zinc-800 placeholder-zinc-500",
  },
  light: {
    bg: "bg-zinc-50", text: "text-zinc-900", sub: "text-zinc-600", sub2: "text-zinc-500",
    border: "border-zinc-200", panel: "bg-white", hover: "hover:bg-zinc-100",
    input: "bg-zinc-100 placeholder-zinc-400",
  },
};

export const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "K" : String(n));
