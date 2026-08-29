import { createClient } from "@/lib/supabase/server";
import type { AdminDashboard, CourseStatus, ReviewStatus, ReportStatus, UserRole } from "@/types/domain";

// Chủ: L. Dashboard + kiểm duyệt + quản lý user + payout.

export async function getAdminDashboard(): Promise<AdminDashboard | null> {
  const supabase = createClient();
  const { data } = await supabase.from("view_admin_dashboard").select("*").single();
  if (!data) return null;
  return {
    totalUsers: data.total_users,
    totalInstructors: data.total_instructors,
    publishedCourses: data.published_courses,
    pendingCourses: data.pending_courses,
    activeEnrollments: data.active_enrollments,
    totalRevenue: data.total_revenue,
  };
}

export async function moderateCourse(courseId: string, status: CourseStatus) {
  const supabase = createClient();
  const { error } = await supabase.rpc("fn_moderate_course", { p_course: courseId, p_status: status });
  if (error) throw error;
}

export async function moderateReview(reviewId: string, status: ReviewStatus) {
  const supabase = createClient();
  const { error } = await supabase.rpc("fn_moderate_review", { p_review: reviewId, p_status: status });
  if (error) throw error;
}

export async function resolveReport(reportId: string, status: ReportStatus) {
  const supabase = createClient();
  const { error } = await supabase.rpc("fn_resolve_report", { p_report: reportId, p_status: status });
  if (error) throw error;
}

export async function setRole(userId: string, role: UserRole) {
  const supabase = createClient();
  const { error } = await supabase.rpc("fn_set_role", { p_user: userId, p_role: role });
  if (error) throw error;
}

export async function toggleBan(userId: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_toggle_ban", { p_user: userId });
  if (error) throw error;
  return Boolean(data);
}

export async function approveRefund(refundId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("fn_approve_refund", { p_refund: refundId });
  if (error) throw error;
}

export async function generatePayout(period: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("fn_generate_payout", { p_period: period });
  if (error) throw error;
}
