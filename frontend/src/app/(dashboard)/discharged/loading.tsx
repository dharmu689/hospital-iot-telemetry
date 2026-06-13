import { PatientTableRowSkeleton } from "@/components/skeletons/PatientTableRowSkeleton";
import { SkeletonPulse } from "@/components/skeletons/SkeletonPulse";

export default function DischargedLoading() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <SkeletonPulse className="h-10 w-60 rounded-xl" />
          <SkeletonPulse className="h-4 w-44 rounded" />
        </div>
        <div className="flex gap-3">
          <SkeletonPulse className="h-10 w-64 rounded-xl" />
          <SkeletonPulse className="h-10 w-32 rounded-xl" />
        </div>
      </div>
      <div className="bg-gray-800/50 rounded-3xl border border-gray-700 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-900/80 border-b border-gray-700">
              <tr>
                {["Patient Info", "Last Location", "Attending", "Status", "Actions"].map(h => (
                  <th key={h} className="px-6 py-5 text-xs uppercase font-bold text-gray-500 tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {[...Array(10)].map((_, i) => <PatientTableRowSkeleton key={i} cols={5} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
