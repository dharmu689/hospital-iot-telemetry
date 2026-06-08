"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, LayoutDashboard, Users, Bell, Activity, UserPlus } from "lucide-react";
import { AlertNotifier } from "@/components/AlertNotifier";
import SystemControls from "@/components/SystemControls";
import { Toaster } from "sonner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white font-mono tracking-widest uppercase text-xs">Loading Security Context...</div>;

  return (
    <div className="flex min-h-screen bg-gray-900 text-white font-sans">
      <Toaster position="top-center" theme="dark" richColors />
      <AlertNotifier />

      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 bg-gray-950 p-6 flex flex-col fixed h-full overflow-y-auto z-50">
        <div className="mb-10 flex items-center gap-3 px-2">
          <Activity className="text-blue-500" size={28} />
          <span className="text-xl font-bold tracking-tight">Hospital IoT</span>
        </div>

        <nav className="space-y-2 flex-1">
          <Link href="/dashboard" className="flex items-center space-x-3 rounded-xl p-3 hover:bg-gray-800 transition-all text-sm font-medium text-gray-400 hover:text-white">
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </Link>
          <Link href="/patients" className="flex items-center space-x-3 rounded-xl p-3 hover:bg-gray-800 transition-all text-sm font-medium text-gray-400 hover:text-white">
            <Users size={20} /> <span>Patients</span>
          </Link>
          <Link href="/registration" className="flex items-center space-x-3 rounded-xl p-3 hover:bg-gray-800 transition-all text-sm font-medium text-gray-400 hover:text-white">
            <UserPlus size={20} /> <span>Register Patient</span>
          </Link>
          <Link href="/alerts" className="flex items-center space-x-3 rounded-xl p-3 hover:bg-gray-800 transition-all text-sm font-medium text-gray-400 hover:text-white">
            <Bell size={20} /> <span>Alert Center</span>
          </Link>

          {/* System Control Section moved here */}
          <SystemControls />
        </nav>

        <div className="mt-10 pt-6 border-t border-gray-800">
            <button
                onClick={() => signOut(auth)}
                className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-all text-sm font-bold"
            >
                <LogOut size={20} /> <span>Sign Out</span>
            </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 p-10 bg-gray-900/50 min-h-screen">
        <div className="max-w-7xl mx-auto">
            {children}
        </div>
      </main>
    </div>
  );
}
