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
import { Users, GraduationCap, BookOpen, Clock, Activity, Wallet, BookCheck, Tag, Flag } from "lucide-react";

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

const NAV_LINKS = [
  {
    href: "/admin/courses",
    label: "Duyệt khóa học",
    desc: "Xét duyệt/ẩn khóa học chờ hoặc đã publish",
    icon: BookCheck,
    bg: "bg-emerald-100 dark:bg-emerald-950",
    fg: "text-emerald-600 dark:text-emerald-400",
  },
  {
    href: "/admin/users",
    label: "Quản lý người dùng",
    desc: "Phân quyền, khóa/mở tài khoản",
    icon: Users,
    bg: "bg-blue-100 dark:bg-blue-950",
    fg: "text-blue-600 dark:text-blue-400",
  },
  {
    href: "/admin/coupons",
    label: "Mã giảm giá",
    desc: "Tạo và quản lý coupon",
    icon: Tag,
    bg: "bg-amber-100 dark:bg-amber-950",
    fg: "text-amber-600 dark:text-amber-400",
  },
  {
    href: "/admin/reports",
    label: "Báo cáo vi phạm",
    desc: "Xử lý report từ học viên",
    icon: Flag,
    bg: "bg-red-100 dark:bg-red-950",
    fg: "text-red-600 dark:text-red-400",
  },
];

export default async function AdminPage() {
  let dashboard = null;
  try {
    dashboard = await getAdminDashboard();
  } catch {
    dashboard = null;
  }

  const [courseStatus, userRoles, revenue, topCourses] = await Promise.all([
    getCourseStatusBreakdown(),
    getUserRoleBreakdown(),
    getMonthlyRevenue(6),
    getTopCoursesByEnrollment(5),
  ]);

  const hasPending = (dashboard?.pendingCourses ?? 0) > 0;

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

      {dashboard ? (
        <>
          {hasPending && (
            <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              Có {dashboard.pendingCourses} khóa học đang chờ duyệt.{" "}
              <Link href="/admin/courses" className="underline">
                Xem ngay
              </Link>
            </p>
          )}

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

      <h2 className="mt-10 text-lg font-semibold">Quản lý</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {NAV_LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-start gap-3 rounded-lg border p-5 transition-colors hover:bg-muted/40"
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${item.bg}`}>
                <Icon className={`h-4 w-4 ${item.fg}`} />
              </span>
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}