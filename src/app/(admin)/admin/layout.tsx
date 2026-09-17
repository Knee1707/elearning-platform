import Link from "next/link";
import { requireRole } from "@/lib/queries/auth";
import { LayoutDashboard, BookCheck, Users, Tag, Flag } from "lucide-react";
import { AdminThemeProvider } from "@/features/admin/theme/AdminThemeProvider";
import { ThemeToggleButton } from "@/features/admin/theme/ThemeToggleButton";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, accent: "text-primary" },
  { href: "/admin/courses", label: "Duyệt khóa học", icon: BookCheck, accent: "text-emerald-500" },
  { href: "/admin/users", label: "Người dùng", icon: Users, accent: "text-blue-500" },
  { href: "/admin/coupons", label: "Mã giảm giá", icon: Tag, accent: "text-amber-500" },
  { href: "/admin/reports", label: "Báo cáo", icon: Flag, accent: "text-red-500" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["admin"]);

  return (
    <AdminThemeProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-muted/20 p-4 md:flex">
          <p className="mb-4 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quản trị
          </p>
          <nav className="flex-1 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground transition-colors hover:bg-primary/10"
                >
                  <Icon className={`h-4 w-4 ${item.accent}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-border pt-3">
            <ThemeToggleButton />
          </div>
        </aside>

        <div className="flex-1">{children}</div>
      </div>
    </AdminThemeProvider>
  );
}