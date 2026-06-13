import { SkeletonPulse } from "./SkeletonPulse";

export function AlertRowSkeleton() {
  return (
    <div className="bg-gray-950/30 rounded-2xl border border-gray-800 p-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <SkeletonPulse className="h-7 w-20 rounded-xl flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <SkeletonPulse className="h-4 w-40 rounded-lg" />
            <SkeletonPulse className="h-3 w-72 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <SkeletonPulse className="h-3 w-20 rounded" />
          <SkeletonPulse className="h-7 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
