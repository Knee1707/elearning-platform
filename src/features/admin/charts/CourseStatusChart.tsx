"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CourseStatusPoint } from "../analytics";

const COLORS: Record<string, string> = {
  draft: "#94a3b8",
  pending: "#f59e0b",
  published: "#10b981",
  rejected: "#ef4444",
  hidden: "#64748b",
};

export function CourseStatusChart({ data }: { data: CourseStatusPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.status} fill={COLORS[entry.status] ?? "#94a3b8"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}