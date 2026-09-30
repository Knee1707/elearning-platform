"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, Crown, GraduationCap, Home, Menu, X } from "lucide-react";
import { ThemeToggleButton } from "@/features/admin/theme/ThemeToggleButton";
import { AREA_HOME, NAV_GROUPS, SIDEBAR_COOKIE, type AdminArea } from "./navItems";

// Màu nhấn riêng từng khu để admin/super admin nhận ra ngay mình đang ở đâu.
const THEME: Record<AdminArea, { logo: string; active: string; subtitle: string; badge: string }> = {
  admin: {
    logo: "from-blue-600 to-indigo-600 shadow-blue-500/20",
    active: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    subtitle: "Quản trị",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  super_admin: {
    logo: "from-violet-600 to-fuchsia-600 shadow-violet-500/20",
    active: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
    subtitle: "Super Admin",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  },
};

const DESKTOP_QUERY = "(min-width: 1024px)";

// Khu còn lại mà super admin có thể chuyển sang.
const SWITCH_TARGET: Record<AdminArea, { href: string; label: string }> = {
  admin: { href: AREA_HOME.super_admin, label: "Sang khu Super Admin" },
  super_admin: { href: AREA_HOME.admin, label: "Sang khu Admin" },
};

interface AdminShellProps {
  area: AdminArea;
  userName: string;
  roleLabel: string;
  canSwitchArea: boolean;
  initialCollapsed: boolean;
  children: React.ReactNode;
}

export function AdminShell({ area, userName, roleLabel, canSwitchArea, initialCollapsed, children }: AdminShellProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed); // desktop: thu gọn còn icon
  const [isMobileOpen, setIsMobileOpen] = useState(false); // mobile: ngăn kéo trượt
  const [isDesktop, setIsDesktop] = useState(true); // khớp breakpoint lg của Tailwind
  const theme = THEME[area];

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const sync = () => {
      setIsDesktop(media.matches);
      if (media.matches) setIsMobileOpen(false);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // Đổi trang hoặc bấm Esc → đóng ngăn kéo mobile.
  useEffect(() => setIsMobileOpen(false), [pathname]);
  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKey = (e: KeyboardEvent) => e.key === "Escape" && setIsMobileOpen(false);
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isMobileOpen]);

  function handleToggle() {
    if (isDesktop) {
      const next = !isCollapsed;
      setIsCollapsed(next);
      document.cookie = `${SIDEBAR_COOKIE}=${next ? 1 : 0}; path=/; max-age=31536000; samesite=lax`;
    } else {
      setIsMobileOpen((open) => !open);
    }
  }

  const isActive = (href: string) =>
    href === AREA_HOME[area] ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  function renderNav(compact: boolean) {
    return (
      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
        {NAV_GROUPS[area].map((group) => (
          <div key={group.title}>
            {compact ? (
              <div className="mx-auto mb-2 h-px w-6 bg-border" aria-hidden />
            ) : (
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">{group.title}</p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={compact ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                        compact ? "justify-center px-0" : "px-3"
                      } ${
                        active
                          ? theme.active
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className={compact ? "sr-only" : "truncate"}>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    );
  }

  function renderSwitch(compact: boolean) {
    if (!canSwitchArea) return null;
    const target = SWITCH_TARGET[area];
    return (
      <div className="border-t border-border p-3">
        <Link
          href={target.href}
          title={target.label}
          className={`flex items-center gap-3 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 ${
            compact ? "justify-center px-0" : "px-3"
          }`}
        >
          <ArrowLeftRight className="h-4 w-4 shrink-0" />
          <span className={compact ? "sr-only" : "truncate"}>{target.label}</span>
        </Link>
      </div>
    );
  }

  const isMenuOpen = isDesktop ? !isCollapsed : isMobileOpen;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 shadow-sm backdrop-blur-md">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggle}
              aria-label={isMenuOpen ? "Đóng menu chức năng" : "Mở menu chức năng"}
              aria-expanded={isMenuOpen}
              aria-controls="admin-sidebar"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link href={AREA_HOME[area]} className="flex items-center gap-2.5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr text-white shadow-md ${theme.logo}`}>
                {area === "super_admin" ? <Crown className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
              </div>
              <div className="hidden flex-col sm:flex">
                <span className="text-base font-black leading-tight tracking-tight text-slate-900 dark:text-slate-100 sm:text-lg">
                  Nhom7<span className="text-blue-600 dark:text-blue-400">Edu</span>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{theme.subtitle}</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 md:flex"
            >
              <Home className="h-3.5 w-3.5" />
              <span>Về trang chủ</span>
            </Link>

            <ThemeToggleButton variant="icon" />

            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-3 dark:border-slate-700 dark:bg-slate-900">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr text-xs font-bold text-white shadow-sm ${theme.logo}`}>
                {userName ? userName.charAt(0).toUpperCase() : "A"}
              </div>
              <div className="hidden flex-col sm:flex">
                <span className="max-w-[140px] truncate text-xs font-bold leading-tight text-slate-800 dark:text-slate-200">
                  {userName || roleLabel}
                </span>
                <span className={`mt-0.5 w-fit rounded-full px-1.5 text-[10px] font-semibold ${theme.badge}`}>{roleLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop: sidebar cố định, thu gọn còn icon */}
        <aside
          id="admin-sidebar"
          className={`sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col border-r border-border bg-background transition-[width] duration-200 lg:flex ${
            isCollapsed ? "w-[72px]" : "w-64"
          }`}
        >
          {renderNav(isCollapsed)}
          {renderSwitch(isCollapsed)}
        </aside>

        {/* Mobile: ngăn kéo trượt từ trái + lớp phủ */}
        <div className={`fixed inset-0 z-50 lg:hidden ${isMobileOpen ? "" : "pointer-events-none"}`} aria-hidden={!isMobileOpen}>
          <div
            onClick={() => setIsMobileOpen(false)}
            className={`absolute inset-0 bg-slate-900/40 transition-opacity ${isMobileOpen ? "opacity-100" : "opacity-0"}`}
          />
          <aside
            className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border bg-background shadow-xl transition-transform duration-200 ${
              isMobileOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Menu {theme.subtitle}</span>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                aria-label="Đóng menu"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderNav(false)}
            {renderSwitch(false)}
          </aside>
        </div>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
