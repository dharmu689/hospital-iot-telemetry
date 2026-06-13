"use client";
import { useEffect, useState } from "react";
import { Patient } from "@/types";
import { PatientTableRowSkeleton } from "@/components/skeletons/PatientTableRowSkeleton";
import { cachedFetch, invalidateCache } from "@/lib/fetchCache";
import { Search, User, ArchiveRestore, Trash2, ChevronLeft, ChevronRight, Archive } from "lucide-react";
import { toast } from "sonner";

export default function DischargedPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, page: 1 });

  const fetchPatients = () => {
    setLoading(true);
    cachedFetch(`/api/patients?page=${page}&limit=${limit}&search=${encodeURIComponent(searchTerm)}&status=discharged`)
      .then(result => {
        if (result.data) {
          setPatients(result.data);
          setMeta(result.meta);
        } else {
          setPatients(Array.isArray(result) ? result.filter((p: any) => p.status === "discharged") : []);
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    setPage(1);
  }, [searchTerm, limit]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPatients();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [page, limit, searchTerm]);

  const handleReadmit = async (patientId: string) => {
    if (!confirm("Are you sure you want to re-admit this patient?")) return;
    try {
      const res = await fetch(`/api/patients/${patientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active", isSimulated: true }),
      });
      if (res.ok) {
        toast.success("Patient re-admitted successfully.");
        invalidateCache(/\/api\/patients/);
        fetchPatients();
      } else {
        throw new Error("Failed to update status");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (patientId: string) => {
    if (!confirm("Are you sure you want to permanently delete this patient record? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/patients/${patientId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Patient deleted permanently.");
        invalidateCache(/\/api\/patients/);
        fetchPatients();
      } else {
        throw new Error("Failed to delete patient");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-500">Discharged Archive</h1>
          <p className="text-gray-400 mt-1">Records of former patients. ({meta.total} total)</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search archive..."
              className="bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 w-full md:w-64 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-xl py-2.5 px-3 text-sm text-gray-300 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
          </select>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-3xl border border-gray-700 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          {loading && patients.length === 0 ? (
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="bg-gray-900/80 text-xs uppercase font-bold text-gray-500 border-b border-gray-700 tracking-wider">
                <tr>
                  <th className="px-6 py-5">Patient Info</th>
                  <th className="px-6 py-5">Last Location</th>
                  <th className="px-6 py-5">Attending</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {[...Array(limit)].map((_, i) => <PatientTableRowSkeleton key={i} cols={5} />)}
              </tbody>
            </table>
          ) : (
            <div className={`transition-opacity duration-300 ${loading ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
              <table className="w-full text-left text-sm text-gray-400">
                <thead className="bg-gray-900/80 text-xs uppercase font-bold text-gray-500 border-b border-gray-700 tracking-wider">
                  <tr>
                    <th className="px-6 py-5">Patient Info</th>
                    <th className="px-6 py-5">Last Location</th>
                    <th className="px-6 py-5">Attending</th>
                    <th className="px-6 py-5">Status</th>
                    <th className="px-6 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {patients.map(patient => (
                    <tr key={patient.patientId} className="hover:bg-gray-800 transition-colors group opacity-75 hover:opacity-100">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 border border-gray-600">
                            <User size={20} />
                          </div>
                          <div>
                            <div className="text-gray-300 font-bold text-base">{patient.name}</div>
                            <div className="text-[10px] tracking-wider mt-0.5">ID: <span className="font-mono text-gray-500">{patient.patientId}</span></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-400 text-sm">{patient.ward}</div>
                        <div className="text-[10px] uppercase tracking-widest mt-0.5">Bed <span className="text-gray-500">{patient.bedNumber}</span></div>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-400 text-sm">
                        {patient.assignedDoctor}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-gray-700 text-gray-300 border border-gray-600">
                          Discharged
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleReadmit(patient.patientId)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-900/30 text-blue-400 hover:bg-blue-600 hover:text-white font-bold text-[10px] uppercase tracking-widest transition-all border border-blue-500/20"
                          >
                            <ArchiveRestore size={14} /> Re-admit
                          </button>
                          <button
                            onClick={() => handleDelete(patient.patientId)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-600 hover:text-white font-bold text-[10px] uppercase tracking-widest transition-all border border-red-500/20"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && patients.length === 0 && (
                <div className="text-center py-16 bg-gray-900/20 flex flex-col items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center">
                    <Archive className="text-gray-600" size={24} />
                  </div>
                  <div>
                    <p className="text-gray-400 font-bold">No discharged patients</p>
                    <p className="text-gray-600 text-sm mt-1">The archive is empty</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {!loading && meta.totalPages > 0 && (
          <div className="bg-gray-900/80 border-t border-gray-700 px-6 py-4 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Showing <span className="font-bold text-white">{patients.length}</span> records (Page {meta.page} of {meta.totalPages})
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-gray-800 rounded-lg text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="p-2 bg-gray-800 rounded-lg text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
