import { CATEGORIES, ACCENT } from "../data/mockData";

export default function CategoryRail({ t, activeCategory, setActiveCategory, liveList }) {
  return (
    <div className="px-5 pt-5">
      <h2 className="text-lg font-bold mb-3">Categories</h2>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const active = activeCategory === c.name;
          const count = liveList.filter((l) => l.category === c.name).length;
          return (
            <div
              key={c.name}
              onClick={() => setActiveCategory(active ? null : c.name)}
              className="flex-shrink-0 w-32 cursor-pointer group"
            >
              <div
                className="h-20 rounded-lg flex items-center justify-center transition-all"
                style={{
                  background: `linear-gradient(135deg, ${c.color}33, ${c.color}11)`,
                  outline: active ? `2px solid ${c.color}` : "none",
                  outlineOffset: "2px",
                }}
              >
                <Icon size={26} style={{ color: c.color }} />
              </div>
              <p className="text-[13px] font-semibold mt-1.5 truncate" style={{ color: active ? ACCENT : undefined }}>
                {c.name}
              </p>
              <p className={`text-[12px] ${t.sub2}`}>{count} live now</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
