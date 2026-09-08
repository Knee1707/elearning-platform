"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  Compass,
  BookOpen,
  ShoppingCart,
  Bell,
  User,
  LogOut,
  Award,
  LayoutDashboard,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/domain";

// Chủ: M3 · Thanh điều hướng dùng chung (cả nhóm dùng).
export function Navbar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cartCount, setCartCount] = useState<number>(0);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lắng nghe và tải thông tin đăng nhập, giỏ hàng, thông báo
  useEffect(() => {
    let isMounted = true;

    async function loadUserData() {
      // 1. Kiểm tra nếu đang ở chế độ Demo Login
      const isDemo = typeof window !== "undefined" && localStorage.getItem("demo_logged_in") === "true";
      if (isDemo && isMounted) {
        if (typeof document !== "undefined" && !document.cookie.includes("demo_logged_in=true")) {
          document.cookie = "demo_logged_in=true; path=/; max-age=86400; SameSite=Lax";
        }
        setProfile({
          id: "00000000-0000-0000-0000-000000000002",
          fullName: "Trần Thị Học Viên A",
          avatarUrl: null,
          role: "student",
          isBanned: false,
          createdAt: new Date().toISOString(),
        });
        setCartCount(1);
        setUnreadNotifsCount(2);
        return;
      }

      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user || !isMounted) {
          if (isMounted) {
            setProfile(null);
            setCartCount(0);
            setUnreadNotifsCount(0);
          }
          return;
        }

        // Tải hồ sơ người dùng
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileData && isMounted) {
          setProfile({
            id: profileData.id,
            fullName: profileData.full_name,
            avatarUrl: profileData.avatar_url,
            role: profileData.role,
            isBanned: profileData.is_banned,
            createdAt: profileData.created_at,
          });
        }

        // Tải số lượng giỏ hàng
        const { count: cartTotal } = await supabase
          .from("cart_item")
          .select("id", { count: "exact", head: true })
          .eq("user_id", session.user.id);

        if (isMounted) {
          setCartCount(cartTotal ?? 0);
        }

        // Tải số thông báo chưa đọc
        const { count: notifTotal } = await supabase
          .from("notification")
          .select("id", { count: "exact", head: true })
          .eq("is_read", false);

        if (isMounted) {
          setUnreadNotifsCount(notifTotal ?? 0);
        }
      } catch {
        // Dự phòng an toàn nếu Supabase chưa kết nối
      }
    }

    loadUserData();

    // Lắng nghe sự kiện cập nhật giỏ hàng từ các trang khác
    function handleCartUpdate() {
      loadUserData();
    }
    window.addEventListener("cart-updated", handleCartUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("cart-updated", handleCartUpdate);
    };
  }, [pathname]);

  // Đăng nhập thử nghiệm cho môi trường dev/test
  async function handleDemoLogin() {
    try {
      const supabase = createClient();
      await supabase.auth.signInWithPassword({
        email: "hva@demo.local",
        password: "Password123!",
      });
    } catch {
      // Bỏ qua lỗi nếu chưa có server Supabase thật
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("demo_logged_in", "true");
      document.cookie = "demo_logged_in=true; path=/; max-age=86400; SameSite=Lax";
    }

    setProfile({
      id: "00000000-0000-0000-0000-000000000002",
      fullName: "Trần Thị Học Viên A",
      avatarUrl: null,
      role: "student",
      isBanned: false,
      createdAt: new Date().toISOString(),
    });
    setCartCount(1);
    setUnreadNotifsCount(2);
    window.dispatchEvent(new Event("cart-updated"));
  }

  async function handleSignOut() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("demo_logged_in");
      document.cookie = "demo_logged_in=; path=/; max-age=0";
    }
    setProfile(null);
    setCartCount(0);
    setUnreadNotifsCount(0);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Bỏ qua lỗi
    }
    window.location.href = "/";
  }

  const isActive = (path: string) =>
    pathname === path || (path !== "/" && pathname.startsWith(path));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* LOGO & BRAND */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                Nhom7EduLearn
              </span>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                LMS Đào tạo
              </span>
            </div>
          </Link>

          {/* DESKTOP NAVIGATION LINKS */}
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/courses"
              className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive("/courses")
                  ? "bg-muted text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <Compass className="h-4 w-4" />
              <span>Khám phá</span>
            </Link>

            <Link
              href="/my"
              className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive("/my")
                  ? "bg-muted text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Học của tôi</span>
            </Link>
          </nav>
        </div>

        {/* RIGHT ACTIONS */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* GIỎ HÀNG */}
          <Link
            href="/cart"
            aria-label="Giỏ hàng"
            className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ShoppingCart className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground animate-in zoom-in-50">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </Link>

          {/* QUẢ CHUÔNG THÔNG BÁO */}
          <Link
            href="/notifications"
            aria-label="Thông báo"
            className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
            )}
          </Link>

          {/* KHU VỰC TÀI KHOẢN (USER DROPDOWN HOẶC LOGIN/REGISTER) */}
          {profile ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-full border border-border/60 p-1 pr-2.5 transition-colors hover:bg-muted"
                aria-expanded={profileDropdownOpen}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : "U"}
                </div>
                <span className="hidden max-w-[120px] truncate text-xs font-medium text-foreground sm:inline-block">
                  {profile.fullName || "Tài khoản"}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>

              {/* DROPDOWN MENU */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-lg animate-in fade-in-80 zoom-in-95">
                  <div className="border-b border-border/60 px-2.5 py-2">
                    <p className="text-sm font-semibold truncate">{profile.fullName}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">
                      Vai trò: {profile.role === "admin" ? "Quản trị viên" : profile.role === "instructor" ? "Giảng viên" : "Học viên"}
                    </p>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/my"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Khóa học của tôi</span>
                    </Link>

                    <Link
                      href="/certificates"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                    >
                      <Award className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Chứng chỉ đã đạt</span>
                    </Link>

                    <Link
                      href="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                    >
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Hồ sơ cá nhân</span>
                    </Link>

                    {profile.role === "instructor" && (
                      <Link
                        href="/studio"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                      >
                        <LayoutDashboard className="h-3.5 w-3.5" />
                        <span>Khu vực Giảng viên (Studio)</span>
                      </Link>
                    )}

                    {profile.role === "admin" && (
                      <Link
                        href="/admin"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                      >
                        <LayoutDashboard className="h-3.5 w-3.5" />
                        <span>Trang Quản trị (Admin)</span>
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-border/60 pt-1">
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={handleDemoLogin}
                className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 transition-colors hover:bg-amber-500/20"
                title="Bật phiên đăng nhập thử nghiệm Học Viên A (phục vụ test trước khi xong M4)"
              >
                ⚡ Test Login (HV)
              </button>
              <Link
                href="/login"
                className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Đăng ký
              </Link>
            </div>
          )}

          {/* MOBILE MENU TOGGLE BUTTON */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border/60 text-muted-foreground md:hidden hover:bg-muted"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* MOBILE EXPANDED MENU */}
      {mobileMenuOpen && (
        <div className="border-b border-border bg-background px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-2">
            <Link
              href="/courses"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <Compass className="h-4 w-4 text-primary" />
              <span>Khám phá khóa học</span>
            </Link>

            <Link
              href="/my"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <BookOpen className="h-4 w-4 text-primary" />
              <span>Học của tôi</span>
            </Link>

            {!profile && (
              <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => {
                    handleDemoLogin();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full rounded-md border border-amber-500/40 bg-amber-500/10 py-2 text-center text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                >
                  ⚡ Test Login (HV)
                </button>
                <div className="flex gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 rounded-md border border-border py-2 text-center text-xs font-medium hover:bg-muted"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 rounded-md bg-primary py-2 text-center text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Đăng ký
                  </Link>
                </div>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
