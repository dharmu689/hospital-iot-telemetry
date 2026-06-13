"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Alert } from "@/types";
import { AlertRowSkeleton } from "@/components/skeletons/AlertRowSkeleton";
import { cachedFetch, invalidateCache } from "@/lib/fetchCache";
import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  User,
  Heart,
  ShieldAlert,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";

interface ExtendedAlert extends Alert {
  patientName?: string;
}

export default function AlertCenterPage() {
  const [alerts, setAlerts] = useState<ExtendedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, page: 1 });

  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolvingAll, setResolvingAll] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
      });
      const result = await cachedFetch(`/api/alerts?${params}`);
      if (result?.data) {
        setAlerts(result.data);
        setMeta(result.meta);
      } else {
        setAlerts(Array.isArray(result) ? result : []);
      }
    } catch (err) {
      console.error("Error fetching alerts:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, limit]);

  useEffect(() => {
    const timer = setTimeout(() => fetchAlerts(), 300);
    return () => clearTimeout(timer);
  }, [page, limit, searchTerm]);

  const toggleExpand = (id: string) => {
    setExpandedAlertId(expandedAlertId === id ? null : id);
  };

  const handleResolveSingle = async (alertId: string, patientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setResolvingId(alertId);
      const res = await fetch("/api/alerts/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, patientId }),
      });
      if (res.ok) {
        toast.success("Alert resolved.");
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
    if (!confirm("Are you sure you want to resolve all active alerts?")) return;
    try {
      setResolvingAll(true);
      const res = await fetch("/api/alerts/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        toast.success("All alerts resolved.");
        invalidateCache(/\/api\/alerts/);
        await fetchAlerts();
      }
    } catch (err) {
      console.error("Error resolving all alerts:", err);
    } finally {
      setResolvingAll(false);
    }
  };

  const hasActiveAlerts = alerts.some(alert => !alert.isResolved);

  const getSeverityStyle = (severity: string, isResolved: boolean) => {
    if (isResolved) return "bg-gray-800/60 border border-gray-700 text-gray-400";
    return severity === "critical"
      ? "bg-red-500/10 border border-red-500/30 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
      : "bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white uppercase italic flex items-center gap-3">
            <ShieldAlert className="text-red-500" size={36} />
            Alert Center
          </h1>
          <p className="text-gray-400 mt-1 flex items-center gap-2 text-xs font-bold tracking-widest uppercase">
            Logs: {meta.total} records found
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {hasActiveAlerts && (
            <button
              onClick={handleResolveAll}
              disabled={resolvingAll || loading}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-4 py-2.5 rounded-xl border border-red-700 transition-all font-semibold text-sm disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle size={16} className={resolvingAll ? "animate-pulse" : ""} />
              {resolvingAll ? "Resolving..." : "Resolve All"}
            </button>
          )}
          <button
            onClick={() => fetchAlerts()}
            disabled={loading}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-750 text-white px-4 py-2.5 rounded-xl border border-gray-700 transition-all font-medium text-sm disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-gray-950/40 p-4 rounded-2xl border border-gray-800/80 flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Search alerts by patient, message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl py-2.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 w-full transition-all focus:ring-1 focus:ring-blue-500/20"
          />
        </div>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="bg-gray-900 border border-gray-800 rounded-xl py-2.5 px-3 text-sm text-gray-300 focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value={5}>5 per page</option>
          <option value={10}>10 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
        </select>
      </div>

      {/* Alerts List */}
      {loading && alerts.length === 0 ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <AlertRowSkeleton key={i} />)}
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-20 bg-gray-950/20 rounded-3xl border border-dashed border-gray-800 flex flex-col items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <CheckCircle className="text-green-500" size={24} />
          </div>
          <div>
            <p className="text-green-400 font-bold text-lg">All clear</p>
            <p className="text-gray-500 text-sm mt-1">No alerts match your current filters</p>
          </div>
        </div>
      ) : (
        <div className={`space-y-4 transition-opacity duration-300 ${loading ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
          {alerts.map((alert) => {
            const isExpanded = expandedAlertId === alert.alertId;
            return (
              <div
                key={alert.alertId}
                className={`bg-gray-950/30 rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isExpanded ? "border-gray-700 bg-gray-950/60 shadow-xl" : "border-gray-800 hover:border-gray-700"
                }`}
              >
                <div
                  onClick={() => toggleExpand(alert.alertId)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-900/10 transition-colors"
                >
                  <div className="flex items-start md:items-center gap-4 flex-1">
                    <div className={`px-3 py-1.5 rounded-xl font-bold font-mono text-xs uppercase ${getSeverityStyle(alert.severity, alert.isResolved)}`}>
                      {alert.severity}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Link
                          href={`/patients/${alert.patientId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-white hover:text-blue-400 transition-colors flex items-center gap-1.5 text-base"
                        >
                          <User size={16} className="text-gray-400" />
                          {alert.patientName}
                        </Link>
                        <span className="text-gray-600 text-sm">•</span>
                        <span className="text-xs text-gray-500 font-mono">ID: {alert.patientId}</span>
                      </div>
                      <p className="text-gray-300 font-medium text-sm">{alert.message}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-gray-900">
                    <div className="flex items-center gap-4 text-xs font-semibold text-gray-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {new Date(alert.triggeredAt).toLocaleTimeString()}
                      </span>
                      {alert.isResolved ? (
                        <span className="text-green-500 flex items-center gap-1 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-lg">
                          <CheckCircle size={12} /> Resolved
                        </span>
                      ) : (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleResolveSingle(alert.alertId, alert.patientId, e)}
                            disabled={resolvingId === alert.alertId}
                            className="px-2.5 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer border-0"
                          >
                            {resolvingId === alert.alertId ? "Resolving..." : "Resolve"}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="text-gray-500">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-6 pt-2 border-t border-gray-900 bg-gray-950/40 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                          <Heart size={12} className="text-red-500" />
                          Vitals Snapshot at Trigger
                        </h4>
                        <div className="grid grid-cols-4 gap-3">
                          {alert.vitalsAtTrigger ? (
                            [
                              { label: "HR", val: alert.vitalsAtTrigger.heartRate, unit: "bpm" },
                              { label: "SpO2", val: alert.vitalsAtTrigger.spo2, unit: "%" },
                              { label: "BP", val: `${alert.vitalsAtTrigger.systolic}/${alert.vitalsAtTrigger.diastolic}`, unit: "mmHg" },
                              { label: "Temp", val: alert.vitalsAtTrigger.temperature, unit: "°F" }
                            ].map((v, i) => (
                              <div key={i} className="bg-gray-900/80 border border-gray-800 rounded-xl p-3 text-center">
                                <span className="block text-[8px] font-bold text-gray-500 uppercase tracking-tighter mb-1">{v.label}</span>
                                <span className="block font-mono text-sm font-bold text-white">{v.val}</span>
                                <span className="block text-[9px] text-gray-600">{v.unit}</span>
                              </div>
                            ))
                          ) : (
                            <div className="col-span-4 py-2 text-gray-600 italic text-xs">Snapshot unavailable</div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                          <AlertTriangle size={12} className="text-blue-500" />
                          AI Recommendations
                        </h4>
                        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 space-y-2.5">
                          {alert.recommendations && alert.recommendations.length > 0 ? (
                            alert.recommendations.map((rec, i) => (
                              <p key={i} className="text-xs text-gray-300 leading-relaxed">• {rec}</p>
                            ))
                          ) : (
                            <p className="text-xs text-gray-600 italic">No recommendations</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {alert.aiExplanation && (
                      <div className="border-t border-gray-900 pt-4 space-y-2">
                        <h4 className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">
                          AI Clinical Explanation
                        </h4>
                        <p className="text-xs text-gray-400 leading-relaxed italic bg-gray-900/30 p-3 rounded-lg border border-gray-950">
                          "{alert.aiExplanation}"
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && meta.totalPages > 0 && (
        <div className="bg-gray-950/60 border border-gray-800 rounded-2xl px-6 py-4 flex items-center justify-between">
          <span className="text-xs text-gray-400 font-mono">
            Displaying <span className="text-white font-bold">{alerts.length}</span> entries (Page {meta.page} of {meta.totalPages})
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 bg-gray-900 border border-gray-800 rounded-xl text-white disabled:opacity-30 hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
              disabled={page === meta.totalPages}
              className="p-2 bg-gray-900 border border-gray-800 rounded-xl text-white disabled:opacity-30 hover:bg-gray-800 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
