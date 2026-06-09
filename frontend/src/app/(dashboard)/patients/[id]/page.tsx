"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLiveVitals } from "@/hooks/useLiveVitals";
import VitalsChart from "@/components/VitalsChart";
import { Patient, Alert } from "@/types";
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

  const fetchAlerts = () => {
    setLoadingAlerts(true);
    fetch(`/api/alerts?patientId=${patientId}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAlerts(data);
        }
      })
      .catch(err => console.error("Error fetching alerts:", err))
      .finally(() => setLoadingAlerts(false));
  };

  const fetchPatientData = () => {
    fetch(`/api/patients/${patientId}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        return res.json();
      })
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
  };

  useEffect(() => {
    fetchPatientData();
    fetchAlerts();
  }, [patientId]);

  const handleDischarge = async () => {
    if (!confirm("Are you sure you want to discharge this patient?")) return;
    try {
      const res = await fetch(`/api/patients/${patientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: 'discharged', isSimulated: false })
      });
      if (res.ok) {
        toast.success("Patient discharged.");
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
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        toast.success("Profile updated successfully.");
        setIsEditing(false);
        fetchPatientData();
      } else {
        throw new Error("Update failed");
      }
    } catch (err: any) {
      toast.error(err.message);
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

  if (!patient) return <div className="flex min-h-[50vh] items-center justify-center text-gray-400 font-mono animate-pulse">Loading patient profile...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-800 pb-6 gap-4">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-4">
            {patient.name}
            {patient.status === 'discharged' && (
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
            {patient.status !== 'discharged' && (
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
                    <input className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Age</label>
                    <input type="number" className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm" value={editForm.age} onChange={e => setEditForm({...editForm, age: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Ward</label>
                    <input className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm" value={editForm.ward} onChange={e => setEditForm({...editForm, ward: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Bed</label>
                    <input className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm" value={editForm.bedNumber} onChange={e => setEditForm({...editForm, bedNumber: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Contact Number</label>
                    <input className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm" value={editForm.contactNumber || ''} onChange={e => setEditForm({...editForm, contactNumber: e.target.value})} />
                </div>
                <div className="col-span-3 space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Address</label>
                    <input className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm" value={editForm.address || ''} onChange={e => setEditForm({...editForm, address: e.target.value})} />
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
        {[
          { label: "Heart Rate", val: latest?.heartRate, unit: "bpm", icon: Heart, color: "text-red-500" },  
          { label: "SpO2", val: latest?.spo2, unit: "%", icon: Activity, color: "text-blue-500" },
          { label: "Blood Pressure", val: latest ? `${latest.systolic}/${latest.diastolic}` : "--", unit: "mmHg", icon: Activity, color: "text-orange-500" },
          { label: "Temperature", val: latest?.temperature, unit: "°F", icon: Thermometer, color: "text-pink-500" },
        ].map((item, idx) => (
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
    </div>
  );
}
