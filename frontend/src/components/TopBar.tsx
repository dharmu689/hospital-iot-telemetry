"use client";
import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export default function TopBar() {
  const [isSimulatorRunning, setIsSimulatorRunning] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/system/status");
        const data = await res.json();
        
        setIsSimulatorRunning(data.simulator);
        
        // Only update the last sync time if the simulator is actively running
        if (data.simulator) {
          setLastSyncTime(new Date());
        }
      } catch (e) {
        setIsSimulatorRunning(false);
      }
    };

    fetchStatus();
    const timer = setInterval(fetchStatus, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center justify-end mb-6 pb-4 border-b border-gray-800">
      <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition-colors ${
          isSimulatorRunning 
            ? 'bg-green-500/10 border-green-500/20 text-green-400' 
            : 'bg-red-500/10 border-red-500/20 text-red-400'
      }`}>
        <Clock size={14} className={isSimulatorRunning ? "animate-pulse" : ""} />
        <span className="text-[11px] font-mono font-bold tracking-wider">
          Last Sync: {lastSyncTime ? lastSyncTime.toLocaleTimeString() : "--:--:--"}
        </span>
      </div>
    </div>
  );
}
