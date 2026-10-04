"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  Compass,
  LayoutDashboard,
  Users,
  Star,
  LogOut,
  GraduationCap,
  ChevronDown,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Menu riêng của khu Giảng viên (tách khỏi luồng Học viên).
const NAV = [
  { href: "/studio", label: "Khóa học", icon: LayoutDashboard },
  { href: "/studio/students", label: "Học viên", icon: Users },
  { href: "/studio/certificates", label: "Chứng nhận", icon: Award },
  { href: "/studio/reviews", label: "Đánh giá", icon: Star },
];

export function InstructorNav({ fullName }: { fullName: string }) {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Tự động đóng dropdown khi chuyển trang
  useEffect(() => {
    setDropdownOpen(false);
  }, [pathname]);

  // Khớp theo tiền tố DÀI NHẤT để /studio/students không làm /studio cùng sáng.
  const activeHref = NAV.reduce<string | null>((best, it) => {
    const match = pathname === it.href || pathname.startsWith(`${it.href}/`);
    return match && it.href.length > (best?.length ?? 0) ? it.href : best;
  }, null);
  const isActive = (href: string) => href === activeHref;

  async function signOut() {
    try {
      await createClient().auth.signOut();
    } catch {}
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/studio" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-black tracking-tight text-slate-900 sm:text-lg">
                Nhom7<span className="text-emerald-600">Edu</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Giảng viên</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                    active ? "bg-emerald-50 text-emerald-700 shadow-xs" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/courses"
            className="hidden items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 sm:flex"
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Khám phá khóa học</span>
          </Link>

          {/* User Profile Dropdown Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-3 transition-all hover:border-emerald-300 hover:shadow-sm cursor-pointer"
              aria-expanded={dropdownOpen}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 text-xs font-bold text-white shadow-sm">
                {fullName ? fullName.charAt(0).toUpperCase() : "G"}
              </div>
              <span className="hidden max-w-[140px] truncate text-xs font-bold text-slate-800 sm:inline-block">
                {fullName || "Giảng viên"}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                  dropdownOpen ? "rotate-180 text-emerald-600" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 text-slate-800 shadow-xl ring-1 ring-black/5 animate-in fade-in-80 zoom-in-95 z-50">
                <div className="border-b border-slate-100 px-3 py-2.5">
                  <p className="text-sm font-bold text-slate-900 truncate">{fullName || "Giảng viên"}</p>
                  <p className="text-[11px] font-medium text-emerald-600">
                    Vai trò: Giảng viên
                  </p>
                </div>

                <div className="py-1.5 space-y-0.5">
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <User className="h-4 w-4 text-emerald-600" />
                    <span>Xem &amp; chỉnh sửa thông tin</span>
                  </Link>

                  <Link
                    href="/studio"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <LayoutDashboard className="h-4 w-4 text-emerald-600" />
                    <span>Quản lý khóa học (Studio)</span>
                  </Link>

                  <Link
                    href="/courses"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 sm:hidden"
                  >
                    <Compass className="h-4 w-4 text-slate-400" />
                    <span>Khám phá khóa học</span>
                  </Link>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    type="button"
                    onClick={signOut}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nav cuộn ngang trên mobile */}
      <nav className="flex items-center gap-1 overflow-x-auto px-3 pb-2 md:hidden">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                active ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
