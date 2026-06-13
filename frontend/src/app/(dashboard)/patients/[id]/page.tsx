"use client";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveVitals } from "@/hooks/useLiveVitals";
import VitalsChart from "@/components/VitalsChart";
import { PatientDetailSkeleton } from "@/components/skeletons/PatientDetailSkeleton";
import { Patient, Alert } from "@/types";
import { cachedFetch, invalidateCache } from "@/lib/fetchCache";
import { toast } from "sonner";
import {
  Activity,
  Heart,
  Thermometer,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  AlertTriangle,
  Archive,
  Trash2,
  Edit
} from "lucide-react";

export default function PatientDetailPage() {
  const { id } = useParams();
  const patientId = id as string;
  const router = useRouter();

  const { latest, stream } = useLiveVitals(patientId);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolvingAll, setResolvingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Patient>>({});

  const fetchAlerts = useCallback(() => {
    setLoadingAlerts(true);
    cachedFetch(`/api/alerts?patientId=${patientId}`)
      .then(result => {
        if (result.data && Array.isArray(result.data)) {
          setAlerts(result.data);
        } else if (Array.isArray(result)) {
          setAlerts(result);
        }
      })
      .catch(err => console.error("Error fetching alerts:", err))
      .finally(() => setLoadingAlerts(false));
  }, [patientId]);

  const fetchPatientData = useCallback(() => {
    cachedFetch(`/api/patients/${patientId}`)
      .then(data => {
        if (data && !data.error) {
          setPatient(data);
          setEditForm(data);
          setError(null);
        } else {
          throw new Error(data?.error || "Failed to load patient profile data");
        }
      })
      .catch(err => {
        console.error("Error fetching patient details:", err);
        setError(err.message || "Failed to connect to Central Telemetry Server");
        setPatient(null);
      });
  }, [patientId]);

  useEffect(() => {
    fetchPatientData();
    // Lazy load alerts after vitals/charts render for better perceived performance
    const alertTimer = setTimeout(() => fetchAlerts(), 500);
    return () => clearTimeout(alertTimer);
  }, [fetchPatientData, fetchAlerts]);

  const vitalsDisplay = useMemo(() => [
    { label: "Heart Rate", val: latest?.heartRate, unit: "bpm", icon: Heart, color: "text-red-500" },
    { label: "SpO2", val: latest?.spo2, unit: "%", icon: Activity, color: "text-blue-500" },
    { label: "Blood Pressure", val: latest ? `${latest.systolic}/${latest.diastolic}` : "--", unit: "mmHg", icon: Activity, color: "text-orange-500" },
    { label: "Temperature", val: latest?.temperature, unit: "°F", icon: Thermometer, color: "text-pink-500" },
  ], [latest]);

  const handleDischarge = async () => {
    if (!confirm("Are you sure you want to discharge this patient?")) return;
    try {
      const res = await fetch(`/api/patients/${patientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "discharged", isSimulated: false }),
      });
      if (res.ok) {
        toast.success("Patient discharged.");
        invalidateCache(/\/api\/patients/);
        router.push("/patients");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this record?")) return;
    try {
      const res = await fetch(`/api/patients/${patientId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Patient deleted.");
        invalidateCache(/\/api\/patients/);
        router.push("/patients");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/patients/${patientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        toast.success("Profile updated successfully.");
        setIsEditing(false);
        invalidateCache(/\/api\/patients/);
        fetchPatientData();
      } else {
        throw new Error("Update failed");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleResolveSingle = async (alertId: string, patientId: string) => {
    try {
      setResolvingId(alertId);
      const res = await fetch("/api/alerts/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, patientId }),
      });
      if (res.ok) {
        invalidateCache(/\/api\/alerts/);
        await fetchAlerts();
      }
    } catch (err) {
      console.error("Error resolving alert:", err);
    } finally {
      setResolvingId(null);
    }
  };

  const handleResolveAll = async () => {
    if (!confirm("Resolve all alerts for this patient?")) return;
    try {
      setResolvingAll(true);
      const res = await fetch("/api/alerts/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true, patientId }),
      });
      if (res.ok) {
        invalidateCache(/\/api\/alerts/);
        await fetchAlerts();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResolvingAll(false);
    }
  };

  if (error) return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <div className="text-center space-y-5 max-w-md p-8 bg-red-950/20 border border-red-900/40 rounded-3xl backdrop-blur-xl shadow-2xl">
        <div className="h-16 w-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20">
          <AlertTriangle className="animate-pulse" size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-red-400 uppercase tracking-widest font-mono">Patient Link Failure</h2>
          <p className="text-gray-400 text-xs font-mono bg-black/30 p-3 rounded-lg border border-red-950 break-all">{error}</p>
        </div>
        <button
          onClick={fetchPatientData}
          className="w-full py-3 bg-gradient-to-r from-red-600/20 to-red-800/20 hover:from-red-600/30 hover:to-red-800/30 text-red-200 border border-red-500/30 rounded-xl text-xs font-bold tracking-widest uppercase transition-all"
        >
          Re-establish Connection
        </button>
      </div>
    </div>
  );

  if (!patient && !error) return <PatientDetailSkeleton />;

  if (!patient) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-800 pb-6 gap-4">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-4">
            {patient.name}
            {patient.status === "discharged" && (
              <span className="text-xs bg-gray-800 border border-gray-700 text-gray-400 px-3 py-1 rounded-full uppercase tracking-widest font-bold">Discharged</span>
            )}
          </h1>
          <p className="text-gray-400 mt-2">
            ID: {patientId} | Ward: {patient.ward} | Bed: {patient.bedNumber} | Attending: {patient.assignedDoctor}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex gap-2">
            <button onClick={() => setIsEditing(!isEditing)} className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-gray-700">
              <Edit size={14} /> Edit
            </button>
            {patient.status !== "discharged" && (
              <button onClick={handleDischarge} className="flex items-center gap-1 bg-yellow-900/40 hover:bg-yellow-600/40 border border-yellow-500/30 text-yellow-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
                <Archive size={14} /> Discharge
              </button>
            )}
            <button onClick={handleDelete} className="flex items-center gap-1 bg-red-900/40 hover:bg-red-600/40 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
          <h3 className="text-lg font-bold mb-4">Edit Profile</h3>
          <form onSubmit={handleUpdate} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 uppercase font-bold">Name</label>
              <input className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 uppercase font-bold">Age</label>
              <input type="number" className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm" value={editForm.age} onChange={e => setEditForm({ ...editForm, age: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 uppercase font-bold">Ward</label>
              <input className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm" value={editForm.ward} onChange={e => setEditForm({ ...editForm, ward: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 uppercase font-bold">Bed</label>
              <input className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm" value={editForm.bedNumber} onChange={e => setEditForm({ ...editForm, bedNumber: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 uppercase font-bold">Contact Number</label>
              <input className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm" value={editForm.contactNumber || ""} onChange={e => setEditForm({ ...editForm, contactNumber: e.target.value })} />
            </div>
            <div className="col-span-3 space-y-1">
              <label className="text-[10px] text-gray-500 uppercase font-bold">Address</label>
              <input className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm" value={editForm.address || ""} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
            </div>
            <div className="col-span-4 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 bg-gray-700 rounded-lg text-xs font-bold">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Save Changes</button>
            </div>
          </form>
        </div>
      )}

      {/* Patient Extended Details */}
      <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Extended Profile</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Blood Group</p>
            <p className="text-red-400 font-bold">{patient.bloodGroup || "N/A"}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Allergies</p>
            <p className="text-white">{patient.allergies || "None"}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Contact Number</p>
            <p className="text-white">{patient.contactNumber || "N/A"}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Emergency Contact</p>
            <p className="text-orange-400">{patient.emergencyContact || "N/A"}</p>
          </div>
          <div className="md:col-span-4 border-t border-gray-800/50 mt-2 pt-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Address</p>
            <p className="text-white">{patient.address || "N/A"}</p>
          </div>
        </div>
      </div>

      {/* Current Vitals Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {vitalsDisplay.map((item, idx) => (
          <div key={idx} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <item.icon className={item.color} size={24} />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{item.label}</span>
            </div>
            <div className="text-3xl font-mono font-bold">
              {item.val ?? "--"} <span className="text-sm font-normal text-gray-500">{item.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Activity className="text-blue-400" /> Live Telemetry (30 Min Rolling)
        </h2>
        <VitalsChart data={stream} />
      </div>

      {/* Alerts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShieldAlert className="text-red-400" /> Patient Alerts
          </h2>
          {alerts.some(a => !a.isResolved) && (
            <button
              onClick={handleResolveAll}
              disabled={resolvingAll}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg border border-red-700 transition-all font-semibold text-xs disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle size={14} className={resolvingAll ? "animate-pulse" : ""} />
              {resolvingAll ? "Resolving..." : "Resolve All"}
            </button>
          )}
        </div>

        {loadingAlerts ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-800/50 rounded-2xl border border-gray-700 animate-pulse" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-10 bg-gray-900/20 rounded-2xl border border-dashed border-gray-800">
            <p className="text-gray-500 text-sm">No alerts recorded for this patient.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const isExpanded = expandedAlertId === alert.alertId;
              const severityClass = alert.isResolved
                ? "bg-gray-800/60 border-gray-700 text-gray-400"
                : alert.severity === "critical"
                  ? "bg-red-500/10 border-red-500/30 text-red-400"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-400";
              return (
                <div key={alert.alertId} className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isExpanded ? "border-gray-700 bg-gray-950/60 shadow-xl" : "border-gray-800 hover:border-gray-700 bg-gray-950/30"}`}>
                  <div onClick={() => setExpandedAlertId(isExpanded ? null : alert.alertId)} className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-900/10 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={`px-3 py-1 rounded-xl font-bold font-mono text-xs uppercase flex-shrink-0 border ${severityClass}`}>{alert.severity}</span>
                      <p className="text-gray-300 font-medium text-sm truncate">{alert.message}</p>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="flex items-center gap-1 text-xs text-gray-500 font-mono">
                        <Clock size={12} />
                        {new Date(alert.triggeredAt).toLocaleTimeString()}
                      </span>
                      {alert.isResolved ? (
                        <span className="text-green-500 flex items-center gap-1 text-xs bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-lg">
                          <CheckCircle size={12} /> Resolved
                        </span>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleResolveSingle(alert.alertId, alert.patientId); }}
                          disabled={resolvingId === alert.alertId}
                          className="px-2.5 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          {resolvingId === alert.alertId ? "..." : "Resolve"}
                        </button>
                      )}
                      {isExpanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                    </div>
                  </div>
                  {isExpanded && alert.aiExplanation && (
                    <div className="px-4 pb-4 pt-2 border-t border-gray-900 bg-gray-950/40">
                      <p className="text-xs text-gray-400 leading-relaxed italic bg-gray-900/30 p-3 rounded-lg border border-gray-950">
                        "{alert.aiExplanation}"
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
