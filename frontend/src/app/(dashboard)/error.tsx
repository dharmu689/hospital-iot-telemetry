"use client";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error Boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <div className="text-center space-y-5 max-w-md w-full p-8 bg-red-950/20 border border-red-900/40 rounded-3xl backdrop-blur-xl shadow-2xl animate-in zoom-in duration-300">
        <div className="h-16 w-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20">
          <AlertTriangle size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-red-400 uppercase tracking-widest font-mono">System Error</h2>
          <p className="text-gray-400 text-xs font-mono bg-black/30 p-3 rounded-lg border border-red-950 break-all">
            {error.message || "An unexpected error occurred"}
          </p>
          {error.digest && (
            <p className="text-gray-600 text-[10px] font-mono">Ref: {error.digest}</p>
          )}
        </div>
        <button
          onClick={reset}
          className="w-full py-3 flex items-center justify-center gap-2 bg-gradient-to-r from-red-600/20 to-red-800/20 hover:from-red-600/30 hover:to-red-800/30 text-red-200 border border-red-500/30 rounded-xl text-xs font-bold tracking-widest uppercase transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    </div>
  );
}
