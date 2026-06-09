"use client";
import { useState, useEffect } from "react";
import { Clock, Wifi } from "lucide-react";

export default function TopBar() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center justify-end gap-4 mb-6 pb-4 border-b border-gray-800">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
        <Wifi size={14} className="animate-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Network Sync: OK</span>
      </div>
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-gray-300">
        <Clock size={14} />
        <span className="text-[11px] font-mono font-bold tracking-wider">
          {time.toLocaleDateString()} {time.toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
