"use client";
import { useState, useEffect } from "react";
import { Clock, Wifi, WifiOff } from "lucide-react";

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

    // Initial fetch
    fetchStatus();
    
    // Check status every 2 seconds to keep sync accurate
    const timer = setInterval(fetchStatus, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center justify-end gap-4 mb-6 pb-4 border-b border-gray-800">
      
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${
          isSimulatorRunning 
            ? 'bg-green-500/10 border-green-500/20 text-green-400' 
            : 'bg-red-500/10 border-red-500/20 text-red-400'
      }`}>
        {isSimulatorRunning ? <Wifi size={14} className="animate-pulse" /> : <WifiOff size={14} />}
        <span className="text-[10px] font-bold uppercase tracking-widest">
          {isSimulatorRunning ? 'Network Sync: ACTIVE' : 'Network Sync: OFFLINE'}
        </span>
      </div>

      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-gray-300">
        <Clock size={14} />
        <span className="text-[11px] font-mono font-bold tracking-wider">
          Last Sync: {lastSyncTime ? lastSyncTime.toLocaleTimeString() : "--:--:--"}
        </span>
      </div>
      
    </div>
  );
}
