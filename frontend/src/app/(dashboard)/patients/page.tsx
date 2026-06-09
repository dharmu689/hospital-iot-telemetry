"use client";
import { useEffect, useState } from "react";
import { Patient } from "@/types";
import { Search, Activity, User, ChevronRight, Edit, Archive } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function PatientsDirectoryPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  const fetchPatients = () => {
    setLoading(true);
    fetch("/api/patients")
      .then(res => res.json())
      .then(data => {
        // Only show active patients
        const active = Array.isArray(data) ? data.filter(p => p.status === 'active') : [];
        setPatients(active);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleDischarge = async (patientId: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to profile
    if (!confirm("Are you sure you want to discharge this patient? They will be moved to the archive.")) return;
    try {
      const res = await fetch(`/api/patients/${patientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: 'discharged', isSimulated: false }) // Stop simulating when discharged
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
        <p className="text-gray-400 font-mono text-sm tracking-widest uppercase">Loading Patient Records...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">Patient Directory</h1>
          <p className="text-gray-400 mt-1">Complete registry of all admitted patients.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Search by name, ID, ward, or doctor..."
            className="bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 w-full md:w-80 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-gray-800 rounded-3xl border border-gray-700 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-gray-900/50 text-xs uppercase font-bold text-gray-500 border-b border-gray-700 tracking-wider">
              <tr>
                <th className="px-6 py-5">Patient Info</th>
                <th className="px-6 py-5">Location</th>
                <th className="px-6 py-5">Assigned Doctor</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {filteredPatients.map(patient => (
                <tr key={patient.patientId} className="hover:bg-gray-750 transition-colors group">
                  <td className="px-6 py-5 cursor-pointer" onClick={() => router.push(`/patients/${patient.patientId}`)}>
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                        <User size={24} />
                      </div>
                      <div>
                        <div className="text-white font-bold text-lg group-hover:text-blue-400 transition-colors">{patient.name}</div>
                        <div className="text-xs tracking-wider mt-1">ID: <span className="font-mono text-gray-300">{patient.patientId}</span> • {patient.age} yrs • {patient.gender}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 cursor-pointer" onClick={() => router.push(`/patients/${patient.patientId}`)}>
                    <div className="font-bold text-white text-base">{patient.ward}</div>
                    <div className="text-xs uppercase tracking-widest mt-1">Bed <span className="text-gray-300">{patient.bedNumber}</span></div>    
                  </td>
                  <td className="px-6 py-5 font-bold text-gray-300 text-base cursor-pointer" onClick={() => router.push(`/patients/${patient.patientId}`)}>
                    {patient.assignedDoctor}
                  </td>
                  <td className="px-6 py-5 cursor-pointer" onClick={() => router.push(`/patients/${patient.patientId}`)}>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-green-500/10 text-green-500 border border-green-500/20">
                      Admitted
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2">
                        {/* We use a simple link to profile for editing or we can add an Edit page, but for now we have profile */}
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
          {filteredPatients.length === 0 && (
            <div className="text-center py-16 bg-gray-900/20">
              <p className="text-gray-500 font-medium text-lg">No active patients found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
