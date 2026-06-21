"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LogOut, LayoutDashboard, Users, Bell, Activity, UserPlus, Archive, Clock } from "lucide-react";
import { AlertNotifier } from "@/components/AlertNotifier";
import { PatientListSidebar } from "@/components/PatientListSidebar";
import NavigationProgress from "@/components/NavigationProgress";
import { Toaster } from "sonner";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/registration", label: "Register Patient", icon: UserPlus },
  { href: "/alerts", label: "Alert Center", icon: Bell },
  { href: "/discharged", label: "Discharged", icon: Archive },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSimulatorRunning, setIsSimulatorRunning] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

  // Fetch sync time
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/system/status");
        const data = await res.json();
        setIsSimulatorRunning(data.simulator);
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

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white font-mono tracking-widest uppercase text-xs">
      <div className="flex flex-col items-center gap-4">
        <Activity className="text-blue-500 animate-pulse" size={32} />
        <span>Loading Security Context...</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white font-sans">
      <NavigationProgress />
      <Toaster position="bottom-right" theme="dark" richColors />
      <AlertNotifier />

      {/* Top Navbar */}
      <nav className="h-[60px] border-b border-gray-800 bg-gray-950 flex items-center px-6 fixed top-0 right-0 left-0 z-50">
        <div className="flex items-center gap-3 mr-10">
          <Activity className="text-blue-500" size={24} />
          <span className="text-lg font-bold tracking-tight">Hospital IoT</span>
        </div>

        <div className="flex items-center gap-2 flex-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium border ${
                  isActive
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white border-transparent"
                }`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Last Sync Time */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border mx-4 transition-colors ${
          isSimulatorRunning
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          <Clock size={14} className={isSimulatorRunning ? "animate-pulse" : ""} />
          <span className="text-[11px] font-mono font-bold tracking-wider whitespace-nowrap">
            {lastSyncTime ? lastSyncTime.toLocaleTimeString() : "--:--:--"}
          </span>
        </div>

        <button
          onClick={() => signOut(auth)}
          className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-all text-sm font-bold ml-auto"
        >
          <LogOut size={18} /> <span>Sign Out</span>
        </button>
      </nav>

      {/* Patient List Sidebar + Main Content */}
      <div className="flex flex-1 pt-[60px]">
        <PatientListSidebar />

        {/* Main Content Area */}
        <main className="flex-1 ml-56 p-10 bg-gray-900/50 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
