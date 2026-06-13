import { SkeletonPulse } from "./SkeletonPulse";

export function PatientCardSkeleton() {
  return (
    <div className="rounded-2xl bg-gray-800 p-5 border border-gray-700 flex flex-col h-full">
      <div className="mb-4 flex items-start justify-between">
        <div className="space-y-2">
          <SkeletonPulse className="h-5 w-36 rounded-lg" />
          <SkeletonPulse className="h-3 w-24 rounded" />
        </div>
        <SkeletonPulse className="h-6 w-16 rounded-full" />
      </div>

      <SkeletonPulse className="h-16 w-full mb-6 rounded-lg" />

      <div className="grid grid-cols-2 gap-3 mt-auto">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-900/50 p-3 rounded-xl border border-gray-700/50 space-y-2">
            <SkeletonPulse className="h-3 w-16 rounded" />
            <SkeletonPulse className="h-7 w-20 rounded-lg" />
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700/50 flex justify-between">
        <SkeletonPulse className="h-3 w-16 rounded" />
        <SkeletonPulse className="h-3 w-24 rounded" />
      </div>
    </div>
  );
}
