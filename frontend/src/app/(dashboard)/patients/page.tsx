"use client";
import { useEffect, useState } from "react";
import { Patient } from "@/types";
import { Search, Activity, User, ChevronRight, Edit, Archive, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function PatientsDirectoryPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const fetchPatients = () => {
    setLoading(true);
    fetch(`/api/patients?page=${page}&limit=${limit}&search=${encodeURIComponent(searchTerm)}&status=active`)
      .then(res => res.json())
      .then(result => {
        if (result.data) {
          setPatients(result.data);
          setMeta(result.meta);
        } else {
          // fallback if api hasn't updated yet
          setPatients(Array.isArray(result) ? result.filter((p: any) => p.status === 'active') : []);
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

  const handleDischarge = async (patientId: string, e: React.MouseEvent) => {
    e.preventDefault(); 
    if (!confirm("Are you sure you want to discharge this patient? They will be moved to the archive.")) return;
    try {
      const res = await fetch(`/api/patients/${patientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: 'discharged', isSimulated: false }) 
      });
      if (res.ok) {
        toast.success("Patient discharged successfully.");
        fetchPatients();
      } else {
        throw new Error("Failed to update status");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">Patient Directory</h1>
          <p className="text-gray-400 mt-1">Complete registry of all admitted patients. ({meta.total} total)</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search directory..."
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

      <div className="bg-gray-800 rounded-3xl border border-gray-700 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
            <div className="flex h-full min-h-[400px] items-center justify-center">
               <Activity className="animate-spin text-blue-500" size={32} />
            </div>
          ) : (
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="bg-gray-900/50 text-xs uppercase font-bold text-gray-500 border-b border-gray-700 tracking-wider">
                <tr>
                  <th className="px-6 py-5">Patient Info</th>
                  <th className="px-6 py-5">Location</th>
                  <th className="px-6 py-5">Assigned Doctor</th>
                  <th className="px-6 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {patients.map(patient => (
                  <tr key={patient.patientId} className="hover:bg-gray-750 transition-colors group">
                    <td className="px-6 py-4 cursor-pointer" onClick={() => router.push(`/patients/${patient.patientId}`)}>
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                          <User size={20} />
                        </div>
                        <div>
                          <div className="text-white font-bold text-base group-hover:text-blue-400 transition-colors">{patient.name}</div>
                          <div className="text-[10px] tracking-wider mt-0.5">ID: <span className="font-mono text-gray-300">{patient.patientId}</span> • {patient.age} yrs • {patient.gender}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 cursor-pointer" onClick={() => router.push(`/patients/${patient.patientId}`)}>
                      <div className="font-bold text-white text-sm">{patient.ward}</div>
                      <div className="text-[10px] uppercase tracking-widest mt-0.5">Bed <span className="text-gray-300">{patient.bedNumber}</span></div>    
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-300 text-sm cursor-pointer" onClick={() => router.push(`/patients/${patient.patientId}`)}>
                      {patient.assignedDoctor}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                          <Link href={`/patients/${patient.patientId}`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-900 text-blue-400 hover:text-white hover:bg-blue-600 font-bold text-[10px] uppercase tracking-widest transition-all border border-gray-700 hover:border-transparent shadow-sm">
                              <Edit size={14} /> Profile
                          </Link>
                          <button 
                              onClick={(e) => handleDischarge(patient.patientId, e)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-600 hover:text-white font-bold text-[10px] uppercase tracking-widest transition-all border border-red-500/20 shadow-sm"
                          >
                              <Archive size={14} /> Discharge
                          </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && patients.length === 0 && (
            <div className="text-center py-16 bg-gray-900/20">
              <p className="text-gray-500 font-medium text-lg">No active patients found.</p>
            </div>
          )}
        </div>
        
        {/* Pagination Controls */}
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
