"use client";
import { useEffect, useState } from "react";
import { Play, Square, Settings, Activity, Brain, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Patient } from "@/types";

export default function SystemControls() {
  const [systemStatus, setSystemStatus] = useState({ simulator: false, agent: false });
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([]);
  const [triggering, setTriggering] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/system/status");
      const data = await res.json();
      setSystemStatus(data);
    } catch (e) {}
  };

  const fetchPatients = async () => {
    try {
      const res = await fetch("/api/patients?limit=50&status=active");
      const result = await res.json();
      const data = result.data ? result.data : (Array.isArray(result) ? result : []);
      setPatients(data);
    } catch(e) {}
  };

  useEffect(() => {
    fetchStatus();
    fetchPatients();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleSystem = async (target: "simulator" | "agent", action: "start" | "stop") => {
    const res = await fetch("/api/system/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, action }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(data.message);
      fetchStatus();
    } else {
      toast.error("Control error: " + data.error);
    }
  };

  const handleTogglePatient = (id: string) => {
      setSelectedPatientIds(prev => 
          prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
      );
  };
  
  const selectAll = () => setSelectedPatientIds(patients.map(p => p.patientId));
  const deselectAll = () => setSelectedPatientIds([]);

  const handleForceEmergency = async () => {
    if (selectedPatientIds.length === 0) return;
    if (!confirm(`Are you sure you want to force an emergency for ${selectedPatientIds.length} patient(s)?`)) return;

    setTriggering(true);
    try {
      const res = await fetch("/api/patients/trigger-emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: selectedPatientIds, vitalType: "random", severity: "critical" })
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        setSelectedPatientIds([]); 
      } else {
        toast.error("Failed to trigger emergency: " + data.error);
      }
    } catch (err) {
      toast.error("An error occurred while triggering the emergency.");
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="mt-10 space-y-6 pt-6 border-t border-gray-800">
      <div className="flex items-center gap-2 px-2">
        <Settings size={14} className="text-gray-500" />
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">System Engine</span>
      </div>

      <div className="space-y-3">
        {/* Simulator Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] text-gray-400 font-medium">Simulator</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${systemStatus.simulator ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
              {systemStatus.simulator ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
          <button 
            onClick={() => toggleSystem("simulator", systemStatus.simulator ? "stop" : "start")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
              systemStatus.simulator 
              ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20" 
              : "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20"
            }`}
          >
            {systemStatus.simulator ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
            {systemStatus.simulator ? "Stop Simulator" : "Start Simulator"}
          </button>
        </div>

        {/* Agent Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] text-gray-400 font-medium">AI Agent</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${systemStatus.agent ? 'bg-blue-500/10 text-blue-500' : 'bg-gray-500/10 text-gray-500'}`}>
              {systemStatus.agent ? "ACTIVE" : "IDLE"}
            </span>
          </div>
          <button 
            onClick={() => toggleSystem("agent", systemStatus.agent ? "stop" : "start")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
              systemStatus.agent 
              ? "bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/20" 
              : "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20"
            }`}
          >
            {systemStatus.agent ? <Square size={14} fill="currentColor" /> : <Brain size={14} />}
            {systemStatus.agent ? "Stop AI Agent" : "Start AI Agent"}
          </button>
        </div>
      </div>

      {/* Force Emergency Control */}
      <div className="space-y-2 border-t border-gray-800 pt-4">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Trigger Emergency</span>
          <div className="flex gap-2">
              <button onClick={selectAll} className="text-[8px] text-blue-400 hover:text-blue-300 uppercase font-bold transition-colors cursor-pointer bg-transparent border-0">All</button>
              <button onClick={deselectAll} className="text-[8px] text-gray-500 hover:text-gray-300 uppercase font-bold transition-colors cursor-pointer bg-transparent border-0">None</button>
          </div>
        </div>
        
        <div className="max-h-36 overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg p-1.5 space-y-0.5 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {patients.map(p => (
            <label key={p.patientId} className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-gray-800 rounded-md cursor-pointer transition-colors">
              <input 
                type="checkbox" 
                checked={selectedPatientIds.includes(p.patientId)}
                onChange={() => handleTogglePatient(p.patientId)}
                className="rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500 focus:ring-offset-gray-900 w-3 h-3 cursor-pointer"
              />
              <span className="text-xs text-gray-300 truncate font-medium">{p.name} <span className="text-[10px] text-gray-500">({p.patientId})</span></span>
            </label>
          ))}
          {patients.length === 0 && <div className="text-xs text-gray-500 p-2 text-center">No patients</div>}
        </div>

        <button 
          onClick={handleForceEmergency}
          disabled={triggering || selectedPatientIds.length === 0}
          className="w-full flex justify-center items-center gap-2 bg-red-900/40 hover:bg-red-600/40 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          <AlertTriangle size={12} />
          {triggering ? "Triggering..." : `Force Alert (${selectedPatientIds.length})`}
        </button>
      </div>

      {/* Live Indicator Footer */}
      {(systemStatus.simulator || systemStatus.agent) && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-900/50 rounded-lg border border-gray-800 mt-4">
            <Activity size={12} className="text-green-500 animate-pulse" />
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">Processing Live Telemetry</span>
        </div>
      )}
    </div>
  );
}
