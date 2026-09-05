export function SkeletonCard({ t }) {
  return (
    <div>
      <div className={`h-40 w-full rounded-lg animate-pulse ${t.panel} border ${t.border}`} />
      <div className="flex gap-2 mt-2">
        <div className={`w-9 h-9 rounded-full flex-shrink-0 animate-pulse ${t.panel} border ${t.border}`} />
        <div className="flex-1 space-y-2 pt-1">
          <div className={`h-3 rounded animate-pulse ${t.panel} border ${t.border} w-4/5`} />
          <div className={`h-3 rounded animate-pulse ${t.panel} border ${t.border} w-2/5`} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonPlayer({ t }) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className={`flex-1 animate-pulse ${t.panel} border ${t.border}`} />
      <div className="p-4 flex gap-3">
        <div className={`w-11 h-11 rounded-full animate-pulse ${t.panel} border ${t.border}`} />
        <div className="flex-1 space-y-2 pt-1">
          <div className={`h-3 rounded animate-pulse ${t.panel} border ${t.border} w-3/5`} />
          <div className={`h-3 rounded animate-pulse ${t.panel} border ${t.border} w-1/4`} />
        </div>
      </div>
    </div>
  );
}
