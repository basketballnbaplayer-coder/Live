import { useAppStore } from "../store/useAppStore";

export default function Sidebar({ t, onSelect }) {
  const followed = useAppStore((s) => s.followed);

  return (
    <div className={`w-56 flex-shrink-0 border-r ${t.border} overflow-y-auto py-3 hidden md:block`}>
      <p className={`px-4 text-xs font-bold uppercase tracking-wide mb-2 ${t.sub2}`}>Following</p>
      {followed.length === 0 && <p className={`px-4 text-[13px] ${t.sub2}`}>No channels followed yet.</p>}
      {followed.map((name) => (
        <div key={name} className={`flex items-center gap-2.5 px-4 py-1.5 ${t.hover} cursor-pointer`} onClick={() => onSelect(name)}>
          <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: `hsl(${(name.charCodeAt(0) * 37) % 360} 70% 45%)` }} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium truncate">{name}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
