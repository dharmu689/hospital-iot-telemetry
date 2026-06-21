"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ref, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { cachedFetch } from "@/lib/fetchCache";
import { Patient } from "@/types";
import { Loader } from "lucide-react";

export function PatientListSidebar() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [alertStatus, setAlertStatus] = useState<{ [key: string]: string | null }>({});
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  // Fetch patients
  useEffect(() => {
    setLoading(true);
    cachedFetch("/api/patients?status=active&limit=50")
      .then(result => {
        if (result.data) {
          setPatients(result.data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching patients:", err);
        setLoading(false);
      });
  }, []);

  // Listen to alert status
  useEffect(() => {
    const alertsRef = ref(rtdb, "alerts");
    const unsub = onValue(alertsRef, (snap) => {
      if (snap.exists()) {
        const alerts = snap.val();
        const status: { [key: string]: string | null } = {};
        for (const patientId of Object.keys(alerts)) {
          const active = alerts[patientId]?.active;
          status[patientId] = active?.severity || null;
        }
        setAlertStatus(status);
      } else {
        setAlertStatus({});
      }
    });
    return () => unsub();
  }, []);

  const getStatusColor = (patientId: string) => {
    const severity = alertStatus[patientId];
    if (severity === "critical") return "bg-red-500";
    if (severity === "warning") return "bg-amber-500";
    return "bg-green-500";
  };

  const getStatusTextColor = (patientId: string) => {
    const severity = alertStatus[patientId];
    if (severity === "critical") return "text-red-400";
    if (severity === "warning") return "text-amber-400";
    return "text-green-400";
  };

  // Sort patients by criticality: critical > warning > normal
  const getSeverityScore = (patientId: string) => {
    const severity = alertStatus[patientId];
    if (severity === "critical") return 0;
    if (severity === "warning") return 1;
    return 2;
  };

  const sortedPatients = [...patients].sort((a, b) => {
    return getSeverityScore(a.patientId) - getSeverityScore(b.patientId);
  });

  return (
    <aside className="w-56 border-r border-gray-800 bg-gray-950 p-4 flex flex-col fixed h-[calc(100vh-60px)] top-[60px] overflow-y-auto z-40">
      <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 px-3">Active Patients</h2>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="animate-spin text-blue-500" size={20} />
        </div>
      ) : patients.length === 0 ? (
        <p className="text-xs text-gray-600 px-3 py-4">No active patients</p>
      ) : (
        <div className="space-y-1">
          {sortedPatients.map((patient) => {
            const isActive = pathname === `/patients/${patient.patientId}`;
            const statusColor = getStatusColor(patient.patientId);
            const statusTextColor = getStatusTextColor(patient.patientId);

            return (
              <Link key={patient.patientId} href={`/patients/${patient.patientId}`}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm border ${
                    isActive
                      ? "bg-blue-500/10 border-blue-500/30"
                      : "border-transparent hover:bg-gray-800"
                  }`}
                >
                  <div className={`h-2.5 w-2.5 rounded-full ${statusColor} flex-shrink-0 shadow-lg`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate text-xs">{patient.name}</p>
                    <p className={`text-[10px] ${statusTextColor} font-semibold uppercase tracking-tight truncate`}>
                      {alertStatus[patient.patientId] || "Normal"}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </aside>
  );
}
