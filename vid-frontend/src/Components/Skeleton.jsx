/**
 * Reusable skeleton/shimmer components for loading states.
 */

export function SkeletonLine({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded h-4 ${className}`} />;
}

export function SkeletonCircle({ size = "w-10 h-10" }) {
  return <div className={`animate-pulse bg-gray-200 rounded-full ${size}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
      <div className="animate-pulse bg-gray-200 rounded-lg h-40 w-full" />
      <SkeletonLine className="w-3/4" />
      <SkeletonLine className="w-1/2" />
      <div className="flex gap-2 mt-4">
        <SkeletonLine className="w-16 h-6 rounded-full" />
        <SkeletonLine className="w-16 h-6 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-4">
        <SkeletonCircle size="w-16 h-16" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="w-1/3" />
          <SkeletonLine className="w-1/4 h-3" />
        </div>
      </div>
      <SkeletonLine className="w-full" />
      <SkeletonLine className="w-5/6" />
      <SkeletonLine className="w-2/3" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b">
        <SkeletonLine className="w-1/4 h-6" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b last:border-0">
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonLine key={j} className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-6 space-y-3">
            <SkeletonLine className="w-1/2 h-3" />
            <SkeletonLine className="w-2/3 h-8" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonGigGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
