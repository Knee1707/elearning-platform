// src/app/(admin)/layout.tsx
import Link from "next/link";
import { requireRole } from "@/lib/queries/auth";
import { GraduationCap, LayoutDashboard, BookCheck, Users, Tag, Flag } from "lucide-react";
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
          {/* --- Logo, sao chép chính xác từ Navbar.tsx (M3) --- */}
          <Link href="/admin" className="mb-6 flex items-center gap-2.5 px-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight leading-tight text-slate-900 dark:text-slate-100">
                Nhom7<span className="text-blue-600 dark:text-blue-400">Edu</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Quản trị
              </span>
            </div>
          </Link>

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