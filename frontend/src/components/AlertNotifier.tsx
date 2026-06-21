"use client";
import { useCallback, useEffect, useRef } from "react";
import { ref, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { toast } from "sonner";

export function AlertNotifier() {
  const knownAlerts = useRef<Set<string>>(new Set());

  const handleResolveFromToast = useCallback(async (alertId: string, patientId: string) => {
    toast.dismiss(alertId);
    const loadingToastId = toast.loading("Resolving alert...");
    try {
      const res = await fetch("/api/alerts/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, patientId }),
      });
      if (res.ok) {
        toast.success("Alert resolved successfully!", { id: loadingToastId });
      } else {
        toast.error("Failed to resolve alert", { id: loadingToastId });
      }
    } catch {
      toast.error("Error resolving alert", { id: loadingToastId });
    }
  }, []);

  useEffect(() => {
    const alertsRef = ref(rtdb, "alerts");
    const unsub = onValue(alertsRef, (snap) => {
      if (!snap.exists()) {
        knownAlerts.current.clear();
        return;
      }
      const raw = snap.val();

      // Prune resolved keys to prevent unbounded Set growth
      knownAlerts.current.forEach((key) => {
        const patientId = key.split("_")[0];
        if (!raw[patientId]?.active) {
          knownAlerts.current.delete(key);
        }
      });

      for (const patientId of Object.keys(raw)) {
        const active = raw[patientId]?.active;
        if (!active) continue;
        const key = `${patientId}_${active.alertId}`;
        if (!knownAlerts.current.has(key)) {
          knownAlerts.current.add(key);

          const { message: alertMessage, alertId, severity, recommendations = [] } = active;

          // Ensure recommendations are strings
          const recList = Array.isArray(recommendations)
            ? recommendations.filter(r => typeof r === 'string' || (typeof r === 'object' && r?.text))
            : [];

          const toastContent = (
            <div className="flex flex-col gap-3 w-full text-left max-w-sm">
              <span className="font-bold text-xs uppercase tracking-wider">
                {severity === "critical" ? "🚨 CRITICAL ALERT" : "⚠️ WARNING ALERT"}
              </span>
              <span className="text-xs text-gray-300 font-semibold">
                Patient ID: {patientId}
              </span>
              <span className="text-xs text-gray-400 leading-relaxed">
                {alertMessage}
              </span>
              {recList.length > 0 && (
                <div className="bg-gray-900/50 p-2.5 rounded-lg border border-gray-800/50">
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">Recommendations:</p>
                  <ul className="space-y-1">
                    {recList.slice(0, 3).map((rec: any, i: number) => (
                      <li key={i} className="text-[10px] text-gray-300 leading-relaxed">
                        • {typeof rec === 'string' ? rec : rec?.text || ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex justify-end mt-1 pt-2 border-t border-gray-800">
                <button
                  onClick={() => handleResolveFromToast(alertId, patientId)}
                  className="px-2.5 py-1 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-lg text-[10px] font-extrabold uppercase transition-all cursor-pointer border-0"
                >
                  Resolve
                </button>
              </div>
            </div>
          );

          toast.error(toastContent, { duration: 2000, id: alertId });
        }
      }
    });
    return () => unsub();
  }, [handleResolveFromToast]);

  return null;
}
