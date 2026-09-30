import Link from "next/link";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES } from "@/lib/utils";
import { GraduationCap, Home } from "lucide-react";
import { AdminThemeProvider } from "@/features/admin/theme/AdminThemeProvider";
import { ThemeToggleButton } from "@/features/admin/theme/ThemeToggleButton";
import { AdminNavLinks } from "@/features/admin/AdminNavLinks";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(ADMIN_ROLES);

  return (
    <AdminThemeProvider>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        {/* --- Thanh ngang, cấu trúc + nav pill giống hệt Navbar.tsx (M3) --- */}
        <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 shadow-sm backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-8">
              <Link href="/admin" className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-black leading-tight tracking-tight text-slate-900 dark:text-slate-100 sm:text-lg">
                    Nhom7<span className="text-blue-600 dark:text-blue-400">Edu</span>
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Quản trị
                  </span>
                </div>
              </Link>

              <AdminNavLinks />
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/"
                className="hidden items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 sm:flex"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Về trang chủ</span>
              </Link>

              <ThemeToggleButton variant="icon" />

              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-sm">
                  {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : "A"}
                </div>
                <span className="hidden max-w-[120px] truncate text-xs font-bold text-slate-800 dark:text-slate-200 sm:inline-block">
                  {profile.fullName || "Quản trị viên"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* --- Không còn sidebar — nội dung full width, giống trang chủ học viên --- */}
        <div className="flex-1">{children}</div>
      </div>
    </AdminThemeProvider>
  );
}