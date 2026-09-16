import { createClient } from "@/lib/supabase/server";

const STATUS_ORDER = ["draft", "pending", "published", "rejected", "hidden"] as const;
const STATUS_LABEL: Record<string, string> = {
  draft: "Nháp",
  pending: "Chờ duyệt",
  published: "Đã publish",
  rejected: "Bị từ chối",
  hidden: "Đã ẩn",
};

export interface CourseStatusPoint {
  status: string;
  label: string;
  count: number;
}

// Đọc trực tiếp bảng courses group theo status — admin.ts (L) chỉ có
// published/pending tổng hợp sẵn, chưa có breakdown đủ 5 trạng thái.
export async function getCourseStatusBreakdown(): Promise<CourseStatusPoint[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("courses").select("status");
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const status = String(row.status);
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }

  return STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABEL[status],
    count: counts.get(status) ?? 0,
  }));
}

export interface RolePoint {
  role: string;
  label: string;
  count: number;
}

const ROLE_LABEL: Record<string, string> = {
  student: "Học viên",
  instructor: "Giảng viên",
  admin: "Quản trị",
};

export async function getUserRoleBreakdown(): Promise<RolePoint[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("profiles").select("role");
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const role = String(row.role);
    counts.set(role, (counts.get(role) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([role, count]) => ({
    role,
    label: ROLE_LABEL[role] ?? role,
    count,
  }));
}

export interface RevenuePoint {
  month: string; // "2026-08"
  label: string; // "T8/2026"
  amount: number;
}

export async function getMonthlyRevenue(monthsBack = 6): Promise<RevenuePoint[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("amount, created_at")
    .eq("status", "paid");
  if (error) throw error;

  const now = new Date();
  const buckets = new Map<string, number>();
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, 0);
  }

  for (const row of data ?? []) {
    const d = new Date(String(row.created_at));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + Number(row.amount));
    }
  }

  return Array.from(buckets.entries()).map(([month, amount]) => {
    const [, m] = month.split("-");
    return { month, label: `T${Number(m)}`, amount };
  });
}

export interface TopCoursePoint {
  title: string;
  enrollments: number;
}

export async function getTopCoursesByEnrollment(limit = 5): Promise<TopCoursePoint[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("enrollments")
    .select("course_id, status, courses(title)")
    .eq("status", "active");
  if (error) throw error;

  const counts = new Map<string, { title: string; count: number }>();
  for (const row of data ?? []) {
    const courseId = String(row.course_id);
    const title = (row.courses as any)?.title ? String((row.courses as any).title) : "Không rõ";
    const existing = counts.get(courseId);
    counts.set(courseId, { title, count: (existing?.count ?? 0) + 1 });
  }

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((c) => ({ title: c.title, enrollments: c.count }));
}