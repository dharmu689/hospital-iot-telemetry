"use client";
import { useEffect, useState } from "react";
import { Play, Square, Settings, Activity, Brain, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Patient } from "@/types";

export default function SystemControls() {
  const [systemStatus, setSystemStatus] = useState({ simulator: false, agent: false });
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
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
      const res = await fetch("/api/patients");
      const data = await res.json();
      if (Array.isArray(data)) {
        setPatients(data);
        if (data.length > 0 && !selectedPatientId) {
          setSelectedPatientId(data[0].patientId);
        }
      }
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

  const handleForceEmergency = async () => {
    if (!selectedPatientId) return;
    const patient = patients.find(p => p.patientId === selectedPatientId);
    if (!confirm(`Are you sure you want to force an emergency for ${patient?.name || selectedPatientId}?`)) return;

    setTriggering(true);
    try {
      const res = await fetch("/api/patients/trigger-emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: selectedPatientId, vitalType: "random", severity: "critical" })
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Emergency sequence initiated for ${patient?.name || selectedPatientId}`);
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
        <div className="flex items-center px-2 mb-2">
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Trigger Emergency</span>
        </div>
        <select 
          value={selectedPatientId}
          onChange={(e) => setSelectedPatientId(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-red-500 transition-colors"
        >
          {patients.map(p => (
            <option key={p.patientId} value={p.patientId}>{p.name} ({p.patientId})</option>
          ))}
        </select>
        <button 
          onClick={handleForceEmergency}
          disabled={triggering || !selectedPatientId}
          className="w-full flex justify-center items-center gap-2 bg-red-900/40 hover:bg-red-600/40 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
        >
          <AlertTriangle size={12} />
          {triggering ? "Triggering..." : "Force Alert"}
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
