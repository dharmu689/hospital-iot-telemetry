"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Activity, FileText } from "lucide-react";
import { toast } from "sonner";

export default function RegistrationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    patientId: "",
    name: "",
    age: "",
    gender: "Male",
    ward: "Ward A",
    bedNumber: "",
    assignedDoctor: "",
    contactNumber: "",
    emergencyContact: "",
    address: "",
    bloodGroup: "O+",
    allergies: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const generatedId = formData.patientId || "P" + Math.floor(Math.random() * 900 + 100);

      const payload = {
        ...formData,
        patientId: generatedId,
        age: Number(formData.age),
      };

      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to register patient");
      }

      toast.success("Patient " + payload.name + " (" + payload.patientId + ") registered successfully!");
      router.push("/patients");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <UserPlus className="text-blue-500" size={36} />
          Patient Registration
        </h1>
        <p className="text-gray-400">Admit a new patient to the telemetry monitoring system.</p>
      </div>

      <div className="bg-gray-800 rounded-3xl border border-gray-700 shadow-2xl overflow-hidden p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section: Basic Info */}
          <h3 className="text-lg font-bold text-white border-b border-gray-700 pb-2">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Full Name</label>    
              <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="e.g. Ramesh Kumar" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Patient ID (Optional)</label>
              <input type="text" name="patientId" value={formData.patientId} onChange={handleChange} placeholder="e.g. P011 (Auto-generated if blank)" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Age</label>
              <input type="number" name="age" required min="0" max="120" value={formData.age} onChange={handleChange} placeholder="e.g. 45" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Gender</label>       
              <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Section: Medical Info */}
          <h3 className="text-lg font-bold text-white border-b border-gray-700 pb-2 pt-4">Medical Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Blood Group</label>
              <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none">
                <option value="A+">A+</option><option value="A-">A-</option>
                <option value="B+">B+</option><option value="B-">B-</option>
                <option value="AB+">AB+</option><option value="AB-">AB-</option>
                <option value="O+">O+</option><option value="O-">O-</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Allergies / Other Details</label>
              <input type="text" name="allergies" value={formData.allergies} onChange={handleChange} placeholder="e.g. Penicillin, Peanuts (or None)" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Ward</label>
              <select name="ward" value={formData.ward} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none">
                <option value="ICU">ICU</option><option value="Ward A">Ward A</option>
                <option value="Ward B">Ward B</option><option value="Ward C">Ward C</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Bed Number</label>   
              <input type="text" name="bedNumber" required value={formData.bedNumber} onChange={handleChange} placeholder="e.g. A1" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Assigned Doctor</label>
              <input type="text" name="assignedDoctor" required value={formData.assignedDoctor} onChange={handleChange} placeholder="e.g. Dr. Sharma" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" />
            </div>
          </div>

          {/* Section: Contact Info */}
          <h3 className="text-lg font-bold text-white border-b border-gray-700 pb-2 pt-4">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Contact Number</label>
              <input type="text" name="contactNumber" value={formData.contactNumber} onChange={handleChange} placeholder="e.g. +91 9876543210" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Emergency Contact</label>
              <input type="text" name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} placeholder="Name & Number" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Home Address</label>
              <textarea name="address" rows={2} value={formData.address} onChange={handleChange} placeholder="Full residential address" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"></textarea>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-gray-700 flex justify-end gap-4">
            <button type="button" onClick={() => router.push("/patients")} className="px-6 py-3 rounded-xl font-bold text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-all">Cancel</button>
            <button type="submit" disabled={loading} className="px-8 py-3 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50">
              {loading ? <Activity className="animate-spin" size={18} /> : <FileText size={18} />}
              {loading ? "Registering..." : "Register Patient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
