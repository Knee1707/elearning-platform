"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Shield,
  Calendar,
  Save,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Loader2,
  Camera,
} from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/domain";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setIsLoading(true);

      // 1. Kiểm tra nếu có phiên demo login
      const isDemo = typeof window !== "undefined" && localStorage.getItem("demo_logged_in") === "true";
      if (isDemo && isMounted) {
        const demoUser: Profile = {
          id: "00000000-0000-0000-0000-000000000002",
          fullName: "Trần Thị Học Viên A",
          avatarUrl: null,
          role: "student",
          isBanned: false,
          createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
        };
        setProfile(demoUser);
        setFullName(demoUser.fullName);
        setEmail("hva@demo.local");
        setBio("Đam mê lập trình Web, Next.js và kiến trúc microservices.");
        setIsLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user && isMounted) {
          setEmail(user.email ?? "hocvien@demo.local");
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          if (data && isMounted) {
            setProfile({
              id: data.id,
              fullName: data.full_name,
              avatarUrl: data.avatar_url,
              role: data.role,
              isBanned: data.is_banned,
              createdAt: data.created_at,
            });
            setFullName(data.full_name ?? "");
            setAvatarUrl(data.avatar_url ?? "");
          }
        } else if (isMounted) {
          // Khởi tạo thông tin mẫu nếu chưa đăng nhập
          const sample: Profile = {
            id: "00000000-0000-0000-0000-000000000002",
            fullName: "Trần Thị Học Viên A",
            avatarUrl: null,
            role: "student",
            isBanned: false,
            createdAt: new Date().toISOString(),
          };
          setProfile(sample);
          setFullName(sample.fullName);
          setEmail("hva@demo.local");
          setBio("Học viên tích cực tại Nhom7EduLearn.");
        }
      } catch {
        if (isMounted) {
          const sample: Profile = {
            id: "00000000-0000-0000-0000-000000000002",
            fullName: "Trần Thị Học Viên A",
            avatarUrl: null,
            role: "student",
            isBanned: false,
            createdAt: new Date().toISOString(),
          };
          setProfile(sample);
          setFullName(sample.fullName);
          setEmail("hva@demo.local");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setIsSaving(true);
    setSuccessNotice(null);

    try {
      const supabase = createClient();
      await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          avatar_url: avatarUrl.trim() || null,
        })
        .eq("id", profile.id);

      setProfile((prev) => (prev ? { ...prev, fullName: fullName.trim(), avatarUrl: avatarUrl.trim() || null } : null));
      setSuccessNotice("Cập nhật thông tin hồ sơ thành công!");
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch {
      // Fallback state
      setProfile((prev) => (prev ? { ...prev, fullName: fullName.trim(), avatarUrl: avatarUrl.trim() || null } : null));
      setSuccessNotice("Cập nhật thông tin hồ sơ thành công (chế độ demo)!");
      setTimeout(() => setSuccessNotice(null), 4000);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-4xl w-full px-4 py-8 sm:px-6">
        {/* Header trang */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <User className="h-4 w-4" />
              <span>Tài khoản cá nhân</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Hồ sơ học viên
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Quản lý thông tin hiển thị trên chứng chỉ tốt nghiệp và hoạt động cộng đồng.
            </p>
          </div>

          <Link
            href="/my"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-muted"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Về Khóa học của tôi</span>
          </Link>
        </div>

        {/* Thông báo thành công */}
        {successNotice && (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-700 dark:text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Nội dung hồ sơ */}
        {isLoading ? (
          <div className="flex min-h-[300px] items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-xs text-muted-foreground">Đang tải thông tin hồ sơ...</span>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Cột trái: Thẻ tóm tắt thông tin & Avatar */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm text-center">
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-3xl font-extrabold text-primary ring-4 ring-primary/20">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  fullName.charAt(0).toUpperCase() || "H"
                )}
              </div>

              <h2 className="mt-4 text-base font-bold text-foreground">{fullName || "Học viên"}</h2>
              <p className="text-xs text-muted-foreground">{email}</p>

              <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Shield className="h-3.5 w-3.5" />
                <span>
                  {profile?.role === "admin"
                    ? "Quản trị viên"
                    : profile?.role === "instructor"
                    ? "Giảng viên"
                    : "Học viên chính thức"}
                </span>
              </div>

              <div className="mt-6 border-t border-border/60 pt-4 text-left text-xs text-muted-foreground space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Tham gia:{" "}
                    <strong className="text-foreground">
                      {profile ? new Date(profile.createdAt).toLocaleDateString("vi-VN") : "Hôm nay"}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <span>Trạng thái: <strong className="text-emerald-500">Hoạt động</strong></span>
                </div>
              </div>
            </div>

            {/* Cột phải: Form cập nhật thông tin */}
            <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
              <h2 className="text-sm font-bold text-foreground border-b border-border pb-3">
                Chỉnh sửa thông tin tài khoản
              </h2>

              <form onSubmit={handleSave} className="mt-6 space-y-5">
                <div>
                  <label htmlFor="fullName" className="block text-xs font-semibold text-foreground">
                    Họ và tên hiển thị <span className="text-destructive">*</span>
                  </label>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Tên này sẽ được in trang trọng trên tất cả chứng chỉ tốt nghiệp của bạn.
                  </p>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-foreground">
                    Địa chỉ Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    disabled
                    value={email}
                    className="mt-2 w-full rounded-xl border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground cursor-not-allowed"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">Email đăng nhập do hệ thống bảo mật quản lý.</p>
                </div>

                <div>
                  <label htmlFor="avatarUrl" className="block text-xs font-semibold text-foreground">
                    Đường dẫn ảnh đại diện (Avatar URL)
                  </label>
                  <input
                    id="avatarUrl"
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label htmlFor="bio" className="block text-xs font-semibold text-foreground">
                    Tiểu sử ngắn / Giới thiệu
                  </label>
                  <textarea
                    id="bio"
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Chia sẻ đôi dòng về sở thích học tập và mục tiêu phát triển của bạn..."
                    className="mt-2 w-full resize-none rounded-xl border border-border bg-background p-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-border">
                  <button
                    type="submit"
                    disabled={isSaving || !fullName.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Đang lưu thay đổi...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        <span>Lưu thay đổi</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
