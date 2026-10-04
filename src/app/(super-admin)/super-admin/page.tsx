import Link from "next/link";
import { Crown, Percent, ShieldCheck, Users, Wallet } from "lucide-react";
import { getAdminDashboard } from "@/lib/queries/admin";
import { getActivityLog, getSuperAdminOverview } from "@/features/super-admin/queries";
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
import { PageHeader, dateTime, describeActivity, money } from "@/features/admin/ui";

export default async function SuperAdminDashboardPage() {
  const [overview, dashboard, recent, courseStatus, userRoles, revenue, topCourses] = await Promise.all([
    getSuperAdminOverview(),
    getAdminDashboard().catch(() => null),
    getActivityLog({ pageSize: 8 }),
    getCourseStatusBreakdown().catch(() => []),
    getUserRoleBreakdown().catch(() => []),
    getMonthlyRevenue(6).catch(() => []),
    getTopCoursesByEnrollment(5).catch(() => []),
  ]);

  const cards: {
    label: string;
    value: string | number;
    icon: typeof Crown;
    href: string;
    warn?: boolean;
  }[] = [
    { label: "Super admin", value: overview.superAdminCount, icon: Crown, href: "/super-admin/admins" },
    { label: "Admin", value: overview.adminCount, icon: ShieldCheck, href: "/super-admin/admins" },
    { label: "Tổng người dùng", value: dashboard?.totalUsers ?? "—", icon: Users, href: "/admin/users" },
    { label: "Tổng doanh thu", value: dashboard ? money.format(dashboard.totalRevenue) : "—", icon: Wallet, href: "/admin/payments" },
    {
      label: "Phí nền tảng",
      value: overview.platformFeePercent === null ? "Chưa đặt" : `${overview.platformFeePercent}%`,
      icon: Percent,
      href: "/super-admin/settings",
    },
  ];

  return (
    <main className="mx-auto max-w-6xl p-8">
      <PageHeader title="Dashboard hệ thống" description="Tổng quan đội quản trị, tài chính và các thay đổi gần đây." />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className={`rounded-lg border p-5 transition-colors hover:bg-muted/40 ${
                card.warn ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30" : "border-border"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${card.warn ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`} />
                <p className="text-sm text-muted-foreground">{card.label}</p>
              </div>
              <p className="mt-2 text-2xl font-bold">{card.value}</p>
            </Link>
          );
        })}
      </div>

      {/* --- Biểu đồ minh họa --- */}
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Doanh thu 6 tháng gần nhất" className="lg:col-span-2">
          <RevenueTrendChart data={revenue} />
        </ChartCard>
        <ChartCard title="Trạng thái khóa học">
          <CourseStatusChart data={courseStatus} />
        </ChartCard>
        <ChartCard title="Tỷ lệ vai trò người dùng">
          <UserRoleChart data={userRoles} />
        </ChartCard>
        <ChartCard title="Top 5 khóa học nhiều học viên nhất" className="lg:col-span-2">
          <TopCoursesChart data={topCourses} />
        </ChartCard>
      </div>

      <section className="mt-8 rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-semibold">Hoạt động gần đây</h2>
          <Link href="/super-admin/audit-log" className="text-sm text-violet-700 underline-offset-4 hover:underline dark:text-violet-300">
            Xem tất cả
          </Link>
        </div>
        {recent.entries.length ? (
          <ul className="divide-y divide-border">
            {recent.entries.map((entry) => {
              const { label, detail } = describeActivity(entry);
              return (
                <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3 text-sm">
                  <span>
                    <span className="font-medium">{entry.actorName ?? "Hệ thống"}</span>
                    <span className="text-muted-foreground"> · {label}</span>
                    {detail && <span className="text-muted-foreground"> · {detail}</span>}
                  </span>
                  <time className="text-xs text-muted-foreground">{dateTime.format(new Date(entry.createdAt))}</time>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-5 py-4 text-sm text-muted-foreground">Chưa có hoạt động nào.</p>
        )}
      </section>
    </main>
  );
}

function ChartCard({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-lg border border-border p-5 ${className ?? ""}`}>
      <h2 className="mb-4 font-semibold">{title}</h2>
      {children}
    </section>
  );
}
