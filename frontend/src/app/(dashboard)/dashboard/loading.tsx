import { PatientCardSkeleton } from "@/components/skeletons/PatientCardSkeleton";
import { SkeletonPulse } from "@/components/skeletons/SkeletonPulse";

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <SkeletonPulse className="h-10 w-56 rounded-xl" />
          <SkeletonPulse className="h-4 w-36 rounded" />
        </div>
        <div className="flex gap-3">
          <SkeletonPulse className="h-10 w-64 rounded-xl" />
          <SkeletonPulse className="h-10 w-32 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {[...Array(8)].map((_, i) => <PatientCardSkeleton key={i} />)}
      </div>
    </div>
  );
}
