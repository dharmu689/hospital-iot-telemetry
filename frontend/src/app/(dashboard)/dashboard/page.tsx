"use client";
import { useEffect, useState } from "react";
import { Patient } from "@/types";
import PatientCard from "@/components/PatientCard";
import { Search, Filter, Activity, AlertTriangle } from "lucide-react";

export default function DashboardPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = () => {
    fetch("/api/patients")
      .then(res => {
        if (!res.ok) {
          return res.json().then(errData => {
            throw new Error(errData.error || `HTTP error! Status: ${res.status}`);
          }).catch(() => {
            throw new Error(`HTTP error! Status: ${res.status}`);
          });
        }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setPatients(data);
          setError(null);
        } else {
          console.error("Invalid response format, expected array:", data);
          throw new Error("Invalid telemetry data format received");
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching patients:", err);
        setError(err.message || "Failed to connect to Central Telemetry Server");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const filteredPatients = Array.isArray(patients) 
    ? patients.filter(p => 
        (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.patientId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.ward || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="text-center space-y-4">
        <Activity className="animate-spin text-blue-500 mx-auto" size={48} />
        <p className="text-gray-400 font-mono text-sm tracking-widest uppercase animate-pulse">Initializing Telemetry Station...</p>
      </div>
    </div>
  );

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
          onClick={() => {
            setLoading(true);
            setError(null);
            fetchPatients();
          }}
          className="w-full py-3 bg-gradient-to-r from-red-600/20 to-red-800/20 hover:from-red-600/30 hover:to-red-800/30 text-red-200 border border-red-500/30 rounded-xl text-xs font-bold tracking-widest uppercase transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg hover:shadow-red-950/50"
        >
          Re-establish Connection
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white uppercase italic">Central Monitor</h1>
          <p className="text-gray-400 mt-1 flex items-center gap-2 text-xs font-bold tracking-widest">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Connected Nodes: {patients.length}
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
            <button className="bg-gray-800 p-2.5 rounded-xl border border-gray-700 hover:bg-gray-700 transition-colors text-gray-400">
                <Filter size={18} />
            </button>
        </div>
      </div>

      {/* Grid of Patient Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filteredPatients.map(patient => (
          <PatientCard key={patient.patientId} patient={patient} />
        ))}
      </div>

      {filteredPatients.length === 0 && (
          <div className="text-center py-20 bg-gray-800/20 rounded-3xl border border-dashed border-gray-700">
              <p className="text-gray-500 font-medium text-lg">No patients found matching your search.</p>
          </div>
      )}
    </div>
  );
}
