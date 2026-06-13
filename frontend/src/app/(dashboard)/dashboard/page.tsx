"use client";
import { useCallback, useEffect, useState } from "react";
import { Patient } from "@/types";
import PatientCard from "@/components/PatientCard";
import { PatientCardSkeleton } from "@/components/skeletons/PatientCardSkeleton";
import { cachedFetch } from "@/lib/fetchCache";
import { Search, AlertTriangle, ChevronLeft, ChevronRight, Users } from "lucide-react";

export default function DashboardPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(8);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, page: 1 });

  const fetchPatients = useCallback(() => {
    setLoading(true);
    cachedFetch(`/api/patients?page=${page}&limit=${limit}&search=${encodeURIComponent(searchTerm)}&status=active`)
      .then(result => {
        if (result.data) {
          setPatients(result.data);
          setMeta(result.meta);
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
  }, [page, limit, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPatients();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [page, limit, searchTerm]);

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

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white uppercase italic">Central Monitor</h1>
          <p className="text-gray-400 mt-1 flex items-center gap-2 text-xs font-bold tracking-widest">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Total Active Nodes: {meta.total}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search server-side..."
              className="bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 w-64 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            className="bg-gray-800 border border-gray-700 rounded-xl py-2.5 px-3 text-sm text-gray-300 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value={4}>4 per page</option>
            <option value={8}>8 per page</option>
            <option value={12}>12 per page</option>
          </select>
        </div>
      </div>

      {loading && patients.length === 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {[...Array(8)].map((_, i) => <PatientCardSkeleton key={i} />)}
        </div>
      ) : (
        <>
          <div className={`grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-h-[50vh] content-start transition-opacity duration-300 ${loading ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
            {patients.map(patient => (
              <PatientCard key={patient.patientId} patient={patient} />
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

          {meta.totalPages > 0 && (
            <div className="flex items-center justify-between border-t border-gray-800 pt-6">
              <span className="text-sm text-gray-500">
                Showing page <span className="font-bold text-white">{meta.page}</span> of <span className="font-bold text-white">{meta.totalPages}</span>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 bg-gray-800 rounded-lg text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                  disabled={page === meta.totalPages}
                  className="p-2 bg-gray-800 rounded-lg text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
