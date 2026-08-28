interface SkeletonProps {
  className?: string;
}

// Zakladni obdelnikovy "shimmer" placeholder - skladat do slozitejsich tvaru
// pomoci className (vyska/sirka/zaobleni).
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton ${className}`} />;
}

export function ProjectCardSkeleton() {
  return (
    <div className="bg-panel border border-border rounded-xl p-5 flex items-center gap-4">
      <Skeleton className="w-16 h-16 rounded-full shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-panel border border-border rounded-xl p-4">
            <Skeleton className="h-3 w-24 mb-3" />
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-4/5 mb-2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
      <Skeleton className="h-3 w-32 mb-3" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function ProjectPageSkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex flex-col gap-2 w-2/3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-3 w-full" />
        </div>
        <Skeleton className="w-[72px] h-[72px] rounded-full shrink-0" />
      </div>
      <Skeleton className="h-3 w-28 mb-3" />
      <div className="flex gap-4 mb-10">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="w-40 h-24 shrink-0" />
        ))}
      </div>
      <Skeleton className="h-3 w-20 mb-3" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-panel border border-border rounded-xl p-3 flex flex-col gap-2">
            <Skeleton className="h-3 w-1/2 mb-1" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div className="max-w-xl animate-fade-in">
      <div className="bg-panel border border-border rounded-2xl p-6 card-shadow">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-border">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <Skeleton className="h-5 w-8" />
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ListRowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 bg-panel border border-border rounded-xl p-3">
          <Skeleton className="w-9 h-9 rounded-full shrink-0" />
          <Skeleton className="h-3 flex-1" />
        </div>
      ))}
    </div>
  );
}
