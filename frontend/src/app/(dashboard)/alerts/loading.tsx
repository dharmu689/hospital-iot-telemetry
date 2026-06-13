import { AlertRowSkeleton } from "@/components/skeletons/AlertRowSkeleton";
import { SkeletonPulse } from "@/components/skeletons/SkeletonPulse";

export default function AlertsLoading() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div className="space-y-2">
          <SkeletonPulse className="h-10 w-48 rounded-xl" />
          <SkeletonPulse className="h-4 w-32 rounded" />
        </div>
        <div className="flex gap-3">
          <SkeletonPulse className="h-10 w-28 rounded-xl" />
          <SkeletonPulse className="h-10 w-24 rounded-xl" />
        </div>
      </div>
      <SkeletonPulse className="h-16 w-full rounded-2xl" />
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => <AlertRowSkeleton key={i} />)}
      </div>
    </div>
  );
}
