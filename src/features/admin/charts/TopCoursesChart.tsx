"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TopCoursePoint } from "../analytics";

export function TopCoursesChart({ data }: { data: TopCoursePoint[] }) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Chưa có dữ liệu ghi danh.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
        <YAxis type="category" dataKey="title" width={140} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="enrollments" fill="#2563eb" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}