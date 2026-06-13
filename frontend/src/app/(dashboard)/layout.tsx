"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LogOut, LayoutDashboard, Users, Bell, Activity, UserPlus, Archive } from "lucide-react";
import { AlertNotifier } from "@/components/AlertNotifier";
import SystemControls from "@/components/SystemControls";
import TopBar from "@/components/TopBar";
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

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white font-mono tracking-widest uppercase text-xs">
      <div className="flex flex-col items-center gap-4">
        <Activity className="text-blue-500 animate-pulse" size={32} />
        <span>Loading Security Context...</span>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-900 text-white font-sans">
      <NavigationProgress />
      <Toaster position="top-center" theme="dark" richColors />
      <AlertNotifier />

      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 bg-gray-950 p-6 flex flex-col fixed h-full overflow-y-auto z-50">
        <div className="mb-10 flex items-center gap-3 px-2">
          <Activity className="text-blue-500" size={28} />
          <span className="text-xl font-bold tracking-tight">Hospital IoT</span>
        </div>

        <nav className="space-y-1 flex-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center space-x-3 rounded-xl p-3 transition-all text-sm font-medium border ${
                  isActive
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white border-transparent"
                }`}
              >
                <Icon size={20} />
                <span>{label}</span>
              </Link>
            );
          })}

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
          <TopBar />
          {children}
        </div>
      </main>
    </div>
  );
}
