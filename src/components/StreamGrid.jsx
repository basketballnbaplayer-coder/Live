import { VideoOff } from "lucide-react";
import { SkeletonCard } from "./Skeletons";

export function Thumb({ hue, live, size = "normal" }) {
  const h = size === "large" ? "h-full" : "h-40";
  return (
    <div
      className={`relative ${h} w-full rounded-lg overflow-hidden`}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 22%), hsl(${hue + 40} 60% 12%))` }}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{ backgroundImage: `radial-gradient(circle at 30% 30%, hsl(${hue} 90% 60%) 0%, transparent 45%)` }}
      />
      {live && (
        <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
          Live
        </span>
      )}
    </div>
  );
}

// s: a row from the `live_streams` table — { username, title, category, hue }
function StreamCard({ s, onSelect, t }) {
  return (
    <div className="group cursor-pointer" onClick={() => onSelect(s.username)}>
      <div className="relative">
        <Thumb hue={s.hue} live />
      </div>
      <div className="flex gap-2 mt-2">
        <div className="w-9 h-9 rounded-full flex-shrink-0" style={{ background: `hsl(${s.hue} 70% 45%)` }} />
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold truncate group-hover:text-[#9147FF] transition-colors">{s.title || `${s.username}'s stream`}</p>
          <p className={`text-[13px] truncate ${t.sub}`}>{s.username}</p>
          <p className={`text-[13px] truncate ${t.sub2}`}>{s.category}</p>
        </div>
      </div>
    </div>
  );
}

export default function StreamGrid({ t, streamers, onSelect, loading, activeCategory, onGoLive }) {
  return (
    <div className="px-5 pb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">{activeCategory ? `${activeCategory} — live now` : "Live right now"}</h2>
        <span className={`text-sm ${t.sub2}`}>{streamers.length} live</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} t={t} />
          ))}
        </div>
      ) : streamers.length === 0 ? (
        <div className={`text-center py-14 rounded-lg border ${t.border} border-dashed`}>
          <VideoOff size={26} className={`mx-auto mb-2 ${t.sub2}`} />
          <p className={`text-sm ${t.sub}`}>Nobody is live right now.</p>
          <p className={`text-xs ${t.sub2} mt-1`}>Real streams only — this list comes straight from Supabase.</p>
          {onGoLive && (
            <button onClick={onGoLive} className="mt-3 text-sm text-white font-semibold px-4 py-2 rounded-md" style={{ backgroundColor: "#9147FF" }}>
              Be the first — Go Live
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
          {streamers.map((s) => (
            <StreamCard key={s.username} s={s} onSelect={onSelect} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
