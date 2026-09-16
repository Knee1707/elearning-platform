"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { RolePoint } from "../analytics";

const COLORS: Record<string, string> = {
  student: "#3b82f6",
  instructor: "#8b5cf6",
  admin: "#f59e0b",
};

export function UserRoleChart({ data }: { data: RolePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((entry) => (
            <Cell key={entry.role} fill={COLORS[entry.role] ?? "#94a3b8"} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}