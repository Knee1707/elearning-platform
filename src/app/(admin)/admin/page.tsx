import Link from "next/link";
import { getAdminDashboard } from "@/lib/queries/admin";
import {
  getCourseStatusBreakdown,
  getUserRoleBreakdown,
  getMonthlyRevenue,
  getTopCoursesByEnrollment,
} from "@/features/admin/analytics";
import { CourseStatusChart } from "@/features/admin/charts/CourseStatusChart";
import { UserRoleChart } from "@/features/admin/charts/UserRoleChart";
import { RevenueTrendChart } from "@/features/admin/charts/RevenueTrendChart";
import { TopCoursesChart } from "@/features/admin/charts/TopCoursesChart";
import { Users, GraduationCap, BookOpen, Clock, Activity, Wallet, BookCheck, Flag, MessageSquareWarning, Undo2 } from "lucide-react";
import { getAdminTodo } from "@/features/admin/queries";

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

export default async function AdminPage() {
  let dashboard = null;
  try {
    dashboard = await getAdminDashboard();
  } catch {
    dashboard = null;
  }

  const [todo, courseStatus, userRoles, revenue, topCourses] = await Promise.all([
    getAdminTodo(),
    getCourseStatusBreakdown(),
    getUserRoleBreakdown(),
    getMonthlyRevenue(6),
    getTopCoursesByEnrollment(5),
  ]);

  const hasPending = (dashboard?.pendingCourses ?? 0) > 0;
  const todoItems = [
    { label: "Khóa học chờ duyệt", count: todo.pendingCourses, href: "/admin/courses?status=pending", icon: BookCheck },
    { label: "Báo cáo vi phạm đang mở", count: todo.openReports, href: "/admin/reports", icon: Flag },
    { label: "Review chờ kiểm duyệt", count: todo.pendingReviews, href: "/admin/reports?review=pending", icon: MessageSquareWarning },
    { label: "Yêu cầu hoàn tiền chờ", count: todo.pendingRefunds, href: "/admin/payments", icon: Undo2 },
  ];

  const statCards = dashboard
    ? [
        { label: "Tổng người dùng", value: dashboard.totalUsers, icon: Users, tone: "default" as const },
        { label: "Giảng viên", value: dashboard.totalInstructors, icon: GraduationCap, tone: "default" as const },
        { label: "Khóa đã xuất bản", value: dashboard.publishedCourses, icon: BookOpen, tone: "success" as const },
        {
          label: "Khóa chờ duyệt",
          value: dashboard.pendingCourses,
          icon: Clock,
          tone: hasPending ? ("warning" as const) : ("default" as const),
        },
        { label: "Ghi danh hoạt động", value: dashboard.activeEnrollments, icon: Activity, tone: "default" as const },
        { label: "Tổng doanh thu", value: money.format(dashboard.totalRevenue), icon: Wallet, tone: "default" as const },
      ]
    : [];

  const TONE_CLASSES: Record<string, string> = {
    default: "border-border",
    success: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20",
    warning: "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30",
  };
  const ICON_TONE_CLASSES: Record<string, string> = {
    default: "text-muted-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
  };

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-bold">Quản trị · Dashboard</h1>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Việc cần xử lý</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {todoItems.map((item) => {
            const Icon = item.icon;
            const urgent = item.count > 0;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/40 ${
                  urgent ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30" : "border-border"
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${urgent ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-2xl font-bold leading-none">{item.count}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {dashboard ? (
        <>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <section key={card.label} className={`rounded-lg border p-5 ${TONE_CLASSES[card.tone]}`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${ICON_TONE_CLASSES[card.tone]}`} />
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                  </div>
                  <p className="mt-2 text-2xl font-bold">{card.value}</p>
                </section>
              );
            })}
          </div>

          {/* --- Biểu đồ --- */}
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-border p-5">
              <p className="text-sm font-medium">Trạng thái khóa học</p>
              <CourseStatusChart data={courseStatus} />
            </section>

            <section className="rounded-lg border border-border p-5">
              <p className="text-sm font-medium">Tỷ lệ vai trò người dùng</p>
              <UserRoleChart data={userRoles} />
            </section>

            <section className="rounded-lg border border-border p-5">
              <p className="text-sm font-medium">Doanh thu 6 tháng gần nhất</p>
              <RevenueTrendChart data={revenue} />
            </section>

            <section className="rounded-lg border border-border p-5">
              <p className="text-sm font-medium">Top 5 khóa học nhiều học viên nhất</p>
              <TopCoursesChart data={topCourses} />
            </section>
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Chưa có dữ liệu. Hãy đăng nhập bằng tài khoản quản trị và kiểm tra migrations.
        </p>
      )}

    </main>
  );
}