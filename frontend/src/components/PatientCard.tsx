"use client";
import { memo, useState, useEffect } from "react";
import { useLiveVitals } from "@/hooks/useLiveVitals";
import { Patient } from "@/types";
import { Heart, Thermometer, Droplets, Activity } from "lucide-react";
import Link from "next/link";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { ref, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase";

type LayoutMode = "large" | "medium" | "small";

function PatientCardInner({ patient, layoutMode = "large" }: { patient: Patient; layoutMode?: LayoutMode }) {
  const { latest, stream } = useLiveVitals(patient.patientId);
  const [alertSeverity, setAlertSeverity] = useState<string | null>(null);

  useEffect(() => {
    const alertRef = ref(rtdb, `alerts/${patient.patientId}/active`);
    const unsub = onValue(alertRef, (snap) => {
      if (snap.exists()) {
        const alert = snap.val();
        setAlertSeverity(alert.severity || null);
      } else {
        setAlertSeverity(null);
      }
    });
    return () => unsub();
  }, [patient.patientId]);

  const borderColor = alertSeverity === "critical" ? "border-red-500" : alertSeverity === "warning" ? "border-amber-500" : "border-gray-700";
  const shadowColor = alertSeverity === "critical" ? "shadow-[inset_0_0_20px_rgba(239,68,68,0.3)]" : alertSeverity === "warning" ? "shadow-[inset_0_0_20px_rgba(245,158,11,0.3)]" : "";
  const hoverShadow = alertSeverity === "critical" ? "hover:shadow-[inset_0_0_30px_rgba(239,68,68,0.4),0_0_20px_rgba(239,68,68,0.2)]" : alertSeverity === "warning" ? "hover:shadow-[inset_0_0_30px_rgba(245,158,11,0.4),0_0_20px_rgba(245,158,11,0.2)]" : "hover:shadow-2xl";

  return (
    <Link href={`/patients/${patient.patientId}`}>
      <div className={`group relative overflow-hidden rounded-2xl bg-gray-800 p-5 transition-all ${hoverShadow} ${borderColor} ${shadowColor} hover:border-blue-500/50 flex flex-col h-full`}>
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">{patient.name}</h3>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">{patient.ward} • Bed {patient.bedNumber}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-gray-900/50 border border-gray-700">
              <div className={`h-2 w-2 rounded-full ${latest ? "bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-gray-600"}`} />
              <span className="text-[10px] font-bold text-gray-400">LIVE</span>
            </div>
          </div>
        </div>

        {/* Mini Sparkline Chart - Only show for large and medium */}
        {(layoutMode === "large" || layoutMode === "medium") && (
          <div className="h-16 w-full mb-6 bg-gray-900/30 rounded-lg p-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stream}>
                <YAxis domain={["dataMin - 5", "dataMax + 5"]} hide />
                <Line
                  type="monotone"
                  dataKey="heartRate"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="text-[9px] text-center text-gray-600 font-bold uppercase tracking-tighter mt-1">Real-time Heart Rate Trend</div>
          </div>
        )}

        {/* Vitals Grid */}
        <div className={`grid gap-3 mt-auto ${layoutMode === "small" ? "grid-cols-2 gap-2" : "grid-cols-2 gap-3"}`}>
          <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-700/50">
            <div className="flex items-center gap-2 mb-1">
              <Heart size={14} className="text-red-500" />
              <span className="text-[10px] uppercase text-gray-500 font-bold">HR</span>
            </div>
            <p className="font-mono text-xl font-bold text-white">{latest?.heartRate ?? "--"} <span className="text-[10px] font-normal text-gray-500">bpm</span></p>
          </div>

          <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-700/50">
            <div className="flex items-center gap-2 mb-1">
              <Activity size={14} className="text-blue-500" />
              <span className="text-[10px] uppercase text-gray-500 font-bold">SpO2</span>
            </div>
            <p className="font-mono text-xl font-bold text-white">{latest?.spo2 ?? "--"} <span className="text-[10px] font-normal text-gray-500">%</span></p>
          </div>

          <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-700/50">
            <div className="flex items-center gap-2 mb-1">
              <Thermometer size={14} className="text-orange-500" />
              <span className="text-[10px] uppercase text-gray-500 font-bold">Temp</span>
            </div>
            <p className="font-mono text-xl font-bold text-white">{latest?.temperature ?? "--"} <span className="text-[10px] font-normal text-gray-500">°F</span></p>
          </div>

          <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-700/50">
            <div className="flex items-center gap-2 mb-1">
              <Droplets size={14} className="text-purple-500" />
              <span className="text-[10px] uppercase text-gray-500 font-bold">RR</span>
            </div>
            <p className="font-mono text-xl font-bold text-white">{latest?.respiratoryRate ?? "--"}</p>
          </div>
        </div>

        {/* Doctor Info */}
        <div className="mt-4 pt-4 border-t border-gray-700/50 flex justify-between items-center">
          <span className="text-[10px] text-gray-500 font-bold uppercase">Attending</span>
          <span className="text-[10px] text-gray-400 font-semibold">{patient.assignedDoctor}</span>
        </div>
      </div>
    </Link>
  );
}

const PatientCard = memo(PatientCardInner, (prev, next) =>
  prev.patient.patientId === next.patient.patientId &&
  prev.patient.name === next.patient.name &&
  prev.patient.ward === next.patient.ward &&
  prev.patient.bedNumber === next.patient.bedNumber &&
  prev.patient.assignedDoctor === next.patient.assignedDoctor &&
  prev.layoutMode === next.layoutMode
);

export default PatientCard;
