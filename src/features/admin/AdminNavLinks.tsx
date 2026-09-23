"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookCheck, Users, Tag, Flag } from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/courses", label: "Duyệt khóa học", icon: BookCheck },
  { href: "/admin/users", label: "Người dùng", icon: Users },
  { href: "/admin/coupons", label: "Mã giảm giá", icon: Tag },
  { href: "/admin/reports", label: "Báo cáo", icon: Flag },
];

export function AdminNavLinks() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path || (path !== "/admin" && pathname.startsWith(path));

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              active
                ? "bg-blue-50 text-blue-600 shadow-xs dark:bg-blue-950 dark:text-blue-300"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}