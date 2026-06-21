"use client";
import { useCallback, useEffect, useState } from "react";
import { Patient } from "@/types";
import PatientCard from "@/components/PatientCard";
import { PatientCardSkeleton } from "@/components/skeletons/PatientCardSkeleton";
import { cachedFetch } from "@/lib/fetchCache";
import { Search, AlertTriangle, Users, Grid2X2, Grid3X3, Columns3 } from "lucide-react";
import { ref, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase";

type LayoutMode = "large" | "medium" | "small";

export default function DashboardPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [alertStatus, setAlertStatus] = useState<{ [key: string]: string | null }>({});
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("large");

  const fetchPatients = useCallback(() => {
    setLoading(true);
    cachedFetch(`/api/patients?limit=1000&search=${encodeURIComponent(searchTerm)}&status=active`)
      .then(result => {
        if (result.data) {
          setPatients(result.data);
          setError(null);
        } else {
          throw new Error("Invalid telemetry data format received");
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching patients:", err);
        setError(err.message || "Failed to connect to Central Telemetry Server");
        setLoading(false);
      });
  }, [searchTerm]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPatients();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, fetchPatients]);

  // Listen to all alerts and track severity
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

  // Sort patients by severity: critical > warning > normal
  const getSeverityScore = (patientId: string) => {
    const severity = alertStatus[patientId];
    if (severity === "critical") return 0;
    if (severity === "warning") return 1;
    return 2;
  };

  const sortedPatients = [...patients].sort((a, b) => {
    return getSeverityScore(a.patientId) - getSeverityScore(b.patientId);
  });

  if (error) return (
    <div className="flex h-[80vh] items-center justify-center p-4">
      <div className="text-center space-y-5 max-w-md p-8 bg-red-950/20 border border-red-900/40 rounded-3xl backdrop-blur-xl shadow-2xl animate-in zoom-in duration-300">
        <div className="h-16 w-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20">
          <AlertTriangle className="animate-pulse" size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-red-400 uppercase tracking-widest font-mono">Telemetry Link Failure</h2>
          <p className="text-gray-400 text-xs font-mono bg-black/30 p-3 rounded-lg border border-red-950 break-all select-all">{error}</p>
        </div>
        <button
          onClick={() => { setError(null); fetchPatients(); }}
          className="w-full py-3 bg-gradient-to-r from-red-600/20 to-red-800/20 hover:from-red-600/30 hover:to-red-800/30 text-red-200 border border-red-500/30 rounded-xl text-xs font-bold tracking-widest uppercase transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg"
        >
          Re-establish Connection
        </button>
      </div>
    </div>
  );

  const getGridClass = () => {
    if (layoutMode === "small") return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3";
    if (layoutMode === "medium") return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4";
    return "grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white uppercase italic">Central Monitor</h1>
          <p className="text-gray-400 mt-1 flex items-center gap-2 text-xs font-bold tracking-widest">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Total Active Nodes: {patients.length}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search patients..."
              className="bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 w-64 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Layout Toggle Buttons */}
          <div className="flex gap-2 bg-gray-800 border border-gray-700 rounded-lg p-1">
            <button
              onClick={() => setLayoutMode("large")}
              className={`p-2 rounded transition-all ${layoutMode === "large" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
              title="Large cards with chart"
            >
              <Grid2X2 size={18} />
            </button>
            <button
              onClick={() => setLayoutMode("medium")}
              className={`p-2 rounded transition-all ${layoutMode === "medium" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
              title="Medium cards"
            >
              <Grid3X3 size={18} />
            </button>
            <button
              onClick={() => setLayoutMode("small")}
              className={`p-2 rounded transition-all ${layoutMode === "small" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
              title="Small cards"
            >
              <Columns3 size={18} />
            </button>
          </div>
        </div>
      </div>

      {loading && patients.length === 0 ? (
        <div className={`grid ${getGridClass()} min-h-[50vh] content-start`}>
          {[...Array(8)].map((_, i) => <PatientCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className={`grid ${getGridClass()} min-h-[50vh] content-start transition-opacity duration-300 ${loading ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
          {sortedPatients.map(patient => (
            <PatientCard key={patient.patientId} patient={patient} layoutMode={layoutMode} />
          ))}
          {patients.length === 0 && !loading && (
            <div className="col-span-full text-center py-20 bg-gray-800/20 rounded-3xl border border-dashed border-gray-700 flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gray-700/30 border border-gray-700 flex items-center justify-center">
                <Users className="text-gray-600" size={28} />
              </div>
              <div>
                <p className="text-gray-400 font-bold text-lg">No patients found</p>
                <p className="text-gray-600 text-sm mt-1">Try adjusting your search or check back later</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
