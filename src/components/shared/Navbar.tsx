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
  ReceiptText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/domain";
import { isAdminRole, ROLE_LABELS } from "@/lib/utils";

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
    const supabase = createClient();

    async function loadUserData() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          // Xóa cờ demo_logged_in nếu người dùng đang có phiên thật
          if (typeof window !== "undefined" && localStorage.getItem("demo_logged_in")) {
            localStorage.removeItem("demo_logged_in");
            document.cookie = "demo_logged_in=; path=/; max-age=0";
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
          } else if (isMounted) {
            setProfile({
              id: session.user.id,
              fullName:
                session.user.user_metadata?.full_name ||
                session.user.email?.split("@")[0] ||
                "Học viên",
              avatarUrl: session.user.user_metadata?.avatar_url || null,
              role: session.user.user_metadata?.role || "student",
              isBanned: false,
              createdAt: session.user.created_at,
            });
          }

          // Tải số lượng giỏ hàng thật
          const { count: cartTotal } = await supabase
            .from("cart_item")
            .select("id", { count: "exact", head: true })
            .eq("user_id", session.user.id);

          if (isMounted) {
            setCartCount(cartTotal ?? 0);
          }

          // Tải số thông báo chưa đọc thật của chính học viên này
          const { count: notifTotal } = await supabase
            .from("notification")
            .select("id", { count: "exact", head: true })
            .eq("user_id", session.user.id)
            .eq("is_read", false);

          if (isMounted) {
            setUnreadNotifsCount(notifTotal ?? 0);
          }

          return;
        }

        // 2. Nếu không có session Supabase, kiểm tra chế độ Demo Login
        const isDemo =
          typeof window !== "undefined" &&
          localStorage.getItem("demo_logged_in") === "true";

        if (isDemo && isMounted) {
          if (
            typeof document !== "undefined" &&
            !document.cookie.includes("demo_logged_in=true")
          ) {
            document.cookie =
              "demo_logged_in=true; path=/; max-age=86400; SameSite=Lax";
          }
          setProfile({
            id: "00000000-0000-0000-0000-000000000002",
            fullName: "Trần Thị Học Viên A",
            avatarUrl: null,
            role: "student",
            isBanned: false,
            createdAt: new Date().toISOString(),
          });

          try {
            const demoCart = JSON.parse(
              localStorage.getItem("demo_cart_items") || "[]"
            );
            setCartCount(demoCart.length);
          } catch {
            setCartCount(0);
          }

          setUnreadNotifsCount(0);
          return;
        }

        // 3. Khách vãng lai (chưa đăng nhập)
        if (isMounted) {
          setProfile(null);
          setCartCount(0);
          setUnreadNotifsCount(0);
        }
      } catch {
        // Dự phòng an toàn nếu Supabase chưa kết nối
        if (isMounted) {
          const isDemo =
            typeof window !== "undefined" &&
            localStorage.getItem("demo_logged_in") === "true";
          if (!isDemo) {
            setProfile(null);
            setCartCount(0);
            setUnreadNotifsCount(0);
          }
        }
      }
    }

    loadUserData();

    // Lắng nghe sự kiện cập nhật giỏ hàng từ các trang khác
    function handleCartUpdate() {
      loadUserData();
    }
    window.addEventListener("cart-updated", handleCartUpdate);

    // Lắng nghe thay đổi trạng thái phiên Auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUserData();
    });

    return () => {
      isMounted = false;
      window.removeEventListener("cart-updated", handleCartUpdate);
      subscription?.unsubscribe();
    };
  }, [pathname]);

  // Đăng nhập thử nghiệm cho môi trường dev/test
  async function handleDemoLogin() {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: "hva@demo.local",
        password: "Password123!",
      });
      if (!error) {
        window.dispatchEvent(new Event("cart-updated"));
        return;
      }
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
    try {
      const demoCart = JSON.parse(localStorage.getItem("demo_cart_items") || "[]");
      setCartCount(demoCart.length);
    } catch {
      setCartCount(0);
    }
    setUnreadNotifsCount(0);
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
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md transition-all shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* LOGO & BRAND */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 transition-transform hover:scale-102">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-slate-900 sm:text-lg leading-tight">
                Nhom7<span className="text-blue-600">Edu</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                E-Learning Platform
              </span>
            </div>
          </Link>

          {/* DESKTOP NAVIGATION LINKS (PrepEdu Pill Style) */}
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/courses"
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                isActive("/courses")
                  ? "bg-blue-50 text-blue-600 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Khám phá khóa học</span>
            </Link>

            {profile?.role === "instructor" ? (
              <Link
                href="/studio"
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                  isActive("/studio")
                    ? "bg-emerald-50 text-emerald-700 shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Khu giảng viên</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/my"
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                    isActive("/my")
                      ? "bg-blue-50 text-blue-600 shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Góc học tập</span>
                </Link>

                <Link
                  href="/certificates"
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                    isActive("/certificates")
                      ? "bg-blue-50 text-blue-600 shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Award className="h-3.5 w-3.5" />
                  <span>Chứng chỉ</span>
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* RIGHT ACTIONS */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* GIỎ HÀNG */}
          <Link
            href="/cart"
            aria-label="Giỏ hàng"
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-all hover:bg-blue-50 hover:text-blue-600 active:scale-95"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-black text-white shadow-sm animate-in zoom-in-50">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </Link>

          {/* QUẢ CHUÔNG THÔNG BÁO */}
          <Link
            href="/notifications"
            aria-label="Thông báo"
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-all hover:bg-blue-50 hover:text-blue-600 active:scale-95"
          >
            <Bell className="h-5 w-5" />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </Link>

          {/* KHU VỰC TÀI KHOẢN (USER DROPDOWN HOẶC LOGIN/REGISTER) */}
          {profile ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-3 transition-all hover:border-blue-300 hover:shadow-sm"
                aria-expanded={profileDropdownOpen}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-sm">
                  {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : "U"}
                </div>
                <span className="hidden max-w-[120px] truncate text-xs font-bold text-slate-800 sm:inline-block">
                  {profile.fullName || "Tài khoản"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {/* DROPDOWN MENU */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 text-slate-800 shadow-xl animate-in fade-in-80 zoom-in-95">
                  <div className="border-b border-slate-100 px-3 py-2.5">
                    <p className="text-sm font-bold text-slate-900 truncate">{profile.fullName}</p>
                    <p className="text-[11px] font-medium text-slate-500 capitalize">
                      Vai trò: {ROLE_LABELS[profile.role] ?? ROLE_LABELS.student}
                    </p>
                  </div>

                  <div className="py-1.5 space-y-0.5">
                    <Link
                      href="/my"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-600"
                    >
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      <span>Khóa học của tôi</span>
                    </Link>

                    <Link
                      href="/certificates"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Award className="h-4 w-4 text-amber-500" />
                      <span>Chứng chỉ đã đạt</span>
                    </Link>

                    <Link
                      href="/my/purchases"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-600"
                    >
                      <ReceiptText className="h-4 w-4 text-slate-400" />
                      <span>Lịch sử mua &amp; hoàn tiền</span>
                    </Link>

                    <Link
                      href="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-600"
                    >
                      <User className="h-4 w-4 text-slate-400" />
                      <span>Hồ sơ cá nhân</span>
                    </Link>

                    {profile.role === "instructor" && (
                      <Link
                        href="/studio"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-50"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Khu vực Giảng viên (Studio)</span>
                      </Link>
                    )}

                    {isAdminRole(profile.role) && (
                      <Link
                        href="/admin"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Trang Quản trị (Admin)</span>
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
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
                className="rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-700 transition-all hover:bg-amber-100 shadow-xs"
                title="Bật phiên đăng nhập thử nghiệm Học Viên A"
              >
                ⚡ Test Login (HV)
              </button>
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-lg active:scale-95"
              >
                Đăng ký ngay
              </Link>
            </div>
          )}

          {/* MOBILE MENU TOGGLE BUTTON */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 md:hidden hover:bg-slate-100"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE EXPANDED MENU */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-white px-4 py-4 md:hidden animate-in slide-in-from-top-2">
          <nav className="flex flex-col gap-2">
            <Link
              href="/courses"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-blue-50 hover:text-blue-600"
            >
              <Compass className="h-4 w-4 text-blue-600" />
              <span>Khám phá khóa học</span>
            </Link>

            <Link
              href="/my"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-blue-50 hover:text-blue-600"
            >
              <BookOpen className="h-4 w-4 text-blue-600" />
              <span>Góc học tập của tôi</span>
            </Link>

            <Link
              href="/certificates"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-blue-50 hover:text-blue-600"
            >
              <Award className="h-4 w-4 text-amber-500" />
              <span>Chứng chỉ đã đạt</span>
            </Link>

            {!profile && (
              <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    handleDemoLogin();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full rounded-full border border-amber-300 bg-amber-50 py-2.5 text-center text-xs font-bold text-amber-700 hover:bg-amber-100"
                >
                  ⚡ Test Login (HV)
                </button>
                <div className="flex gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 rounded-full border border-slate-200 py-2.5 text-center text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 rounded-full bg-blue-600 py-2.5 text-center text-xs font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-500/20"
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
