import { SkeletonPulse } from "./SkeletonPulse";

export function PatientTableRowSkeleton({ cols = 4 }: { cols?: 4 | 5 }) {
  return (
    <tr className="border-b border-gray-700/50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-4">
          <SkeletonPulse className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="space-y-2">
            <SkeletonPulse className="h-4 w-32 rounded-lg" />
            <SkeletonPulse className="h-3 w-48 rounded" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4 space-y-2">
        <SkeletonPulse className="h-4 w-20 rounded-lg" />
        <SkeletonPulse className="h-3 w-12 rounded" />
      </td>
      <td className="px-6 py-4">
        <SkeletonPulse className="h-4 w-28 rounded-lg" />
      </td>
      {cols === 5 && (
        <td className="px-6 py-4">
          <SkeletonPulse className="h-6 w-20 rounded-full" />
        </td>
      )}
      <td className="px-6 py-4 text-right">
        <div className="flex justify-end gap-2">
          <SkeletonPulse className="h-7 w-16 rounded-lg" />
          <SkeletonPulse className="h-7 w-20 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}
