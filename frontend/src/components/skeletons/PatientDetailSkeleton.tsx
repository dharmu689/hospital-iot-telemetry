import { SkeletonPulse } from "./SkeletonPulse";

export function PatientDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-800 pb-6 gap-4">
        <div className="space-y-3">
          <SkeletonPulse className="h-9 w-64 rounded-xl" />
          <SkeletonPulse className="h-4 w-96 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <SkeletonPulse className="h-8 w-16 rounded-lg" />
          <SkeletonPulse className="h-8 w-22 rounded-lg" />
          <SkeletonPulse className="h-8 w-16 rounded-lg" />
        </div>
      </div>

      {/* Extended Profile Box */}
      <SkeletonPulse className="h-32 w-full rounded-2xl" />

      {/* Vitals 4-card row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
            <div className="flex justify-between items-start">
              <SkeletonPulse className="h-6 w-6 rounded" />
              <SkeletonPulse className="h-3 w-20 rounded" />
            </div>
            <SkeletonPulse className="h-9 w-28 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Charts section header */}
      <SkeletonPulse className="h-7 w-56 rounded-lg" />

      {/* Charts 2x2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <SkeletonPulse key={i} className="h-64 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
