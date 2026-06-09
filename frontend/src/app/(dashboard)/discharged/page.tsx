"use client";
import { useEffect, useState } from "react";
import { Patient } from "@/types";
import { Search, Activity, User, ArchiveRestore, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function DischargedPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchPatients = () => {
    setLoading(true);
    fetch("/api/patients")
      .then(res => res.json())
      .then(data => {
        // Filter ONLY discharged patients
        const discharged = Array.isArray(data) ? data.filter(p => p.status === 'discharged') : [];
        setPatients(discharged);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleReadmit = async (patientId: string) => {
    if (!confirm("Are you sure you want to re-admit this patient?")) return;
    try {
      const res = await fetch(`/api/patients/${patientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: 'active', isSimulated: true })
      });
      if (res.ok) {
        toast.success("Patient re-admitted successfully.");
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
      const res = await fetch(`/api/patients/${patientId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Patient deleted permanently.");
        fetchPatients();
      } else {
        throw new Error("Failed to delete patient");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.ward.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.assignedDoctor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="text-center space-y-4">
        <Activity className="animate-spin text-blue-500 mx-auto" size={48} />
        <p className="text-gray-400 font-mono text-sm tracking-widest uppercase">Loading Archives...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-500">Discharged Archive</h1>
          <p className="text-gray-400 mt-1">Records of former patients. Telemetry is offline.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search archive..."
            className="bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 w-full md:w-80 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-3xl border border-gray-700 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
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
              {filteredPatients.map(patient => (
                <tr key={patient.patientId} className="hover:bg-gray-800 transition-colors group opacity-75 hover:opacity-100">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 border border-gray-600">
                        <User size={24} />
                      </div>
                      <div>
                        <div className="text-gray-300 font-bold text-lg">{patient.name}</div>
                        <div className="text-xs tracking-wider mt-1">ID: <span className="font-mono text-gray-500">{patient.patientId}</span></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="font-bold text-gray-400 text-base">{patient.ward}</div>
                    <div className="text-xs uppercase tracking-widest mt-1">Bed <span className="text-gray-500">{patient.bedNumber}</span></div>
                  </td>
                  <td className="px-6 py-5 font-bold text-gray-400 text-base">
                    {patient.assignedDoctor}
                  </td>
                  <td className="px-6 py-5">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-gray-700 text-gray-300 border border-gray-600">
                      Discharged
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
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
          {filteredPatients.length === 0 && (
            <div className="text-center py-16 bg-gray-900/20">
              <p className="text-gray-500 font-medium text-lg">No discharged patients found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
