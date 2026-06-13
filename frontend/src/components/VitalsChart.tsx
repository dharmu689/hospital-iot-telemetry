"use client";
import { memo, useMemo } from "react";
import { VitalReading } from "@/types";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

const VITAL_CONFIGS = [
  {
    id: "hr",
    title: "Heart Rate",
    domain: [40, 160],
    lines: [{ key: "heartRate", label: "Heart Rate", color: "#ef4444" }]
  },
  {
    id: "spo2",
    title: "SpO2",
    domain: [80, 100],
    lines: [{ key: "spo2", label: "SpO2", color: "#3b82f6" }]
  },
  {
    id: "bp",
    title: "Blood Pressure",
    domain: [40, 200],
    lines: [
      { key: "systolic", label: "Systolic", color: "#f59e0b" },
      { key: "diastolic", label: "Diastolic", color: "#10b981" }
    ]
  },
  {
    id: "temp",
    title: "Temp (°F)",
    domain: [94, 106],
    lines: [{ key: "temperature", label: "Temperature", color: "#ec4899" }]
  },
];

function VitalsChartInner({ data }: { data: VitalReading[] }) {
  const formattedData = useMemo(
    () => data.map((d) => ({ ...d, time: format(new Date(d.timestamp), "HH:mm:ss") })),
    [data]
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {VITAL_CONFIGS.map((config) => (
        <div key={config.id} className="rounded-xl bg-gray-800 p-4 border border-gray-700">
          <h4 className="mb-2 text-sm font-medium text-gray-400">{config.title}</h4>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="#9ca3af"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={config.domain}
                  stroke="#9ca3af"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", fontSize: "12px" }}
                  itemStyle={{ color: "#fff" }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "10px", color: "#9ca3af" }}
                  iconType="circle"
                  iconSize={6}
                />
                {config.lines.map((line) => (
                  <Line
                    key={line.key}
                    name={line.label}
                    type="monotone"
                    dataKey={line.key}
                    stroke={line.color}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}

const VitalsChart = memo(VitalsChartInner);
export default VitalsChart;
