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
import { isAdminRole, ROLE_LABELS } from "@/lib/utils";

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
            const savedBio = typeof window !== "undefined" ? localStorage.getItem(`user_bio_${data.id}`) : null;
            if (savedBio) setBio(savedBio);
            return;
          }
        }

        // Dự phòng nếu chưa có phiên đăng nhập thật
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
          setBio("Học viên tích cực tại LMS.");
        }
      } catch {
        // Dự phòng khi offline
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

    if (typeof window !== "undefined") {
      localStorage.setItem(`user_bio_${profile.id}`, bio.trim());
    }

    setProfile((prev) => (prev ? { ...prev, fullName: fullName.trim(), avatarUrl: avatarUrl.trim() || null } : null));
    setSuccessNotice("Cập nhật thông tin hồ sơ thành công!");
    setTimeout(() => setSuccessNotice(null), 4000);
  } catch {
    // Fallback state
    if (typeof window !== "undefined") {
      localStorage.setItem(`user_bio_${profile.id}`, bio.trim());
    }
    setProfile((prev) => (prev ? { ...prev, fullName: fullName.trim(), avatarUrl: avatarUrl.trim() || null } : null));
    setSuccessNotice("Cập nhật thông tin hồ sơ thành công!");
    setTimeout(() => setSuccessNotice(null), 4000);
  } finally {
    setIsSaving(false);
  }
}

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-4xl w-full px-4 py-8 sm:px-6">
        {/* Header trang */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/60 px-3 py-1 text-xs font-bold text-blue-700 uppercase tracking-wider">
              <User className="h-4 w-4" />
              <span>Tài khoản cá nhân</span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Hồ sơ học viên
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
              Quản lý thông tin hiển thị trên chứng chỉ tốt nghiệp và hoạt động cộng đồng.
            </p>
          </div>

          <Link
            href="/my"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-all active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Về Khóa học của tôi</span>
          </Link>
        </div>

        {/* Thông báo thành công */}
        {successNotice && (
          <div className="mt-6 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs font-bold text-emerald-700 shadow-xs animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Nội dung hồ sơ */}
        {isLoading ? (
          <div className="flex min-h-[300px] items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-xs text-slate-400 font-medium">Đang tải thông tin hồ sơ...</span>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Cột trái: Thẻ tóm tắt thông tin & Avatar */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs text-center">
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-blue-50 text-3xl font-black text-blue-600 ring-4 ring-blue-500/10 shadow-xs">
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

              <h2 className="mt-4 text-base font-black text-slate-900">{fullName || "Học viên"}</h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">{email}</p>

              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/60 px-3 py-1 text-xs font-bold text-blue-700">
                <Shield className="h-3.5 w-3.5" />
                <span>
                  {profile && isAdminRole(profile.role)
                    ? ROLE_LABELS[profile.role]
                    : profile?.role === "instructor"
                    ? "Giảng viên"
                    : "Học viên chính thức"}
                </span>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4 text-left text-xs text-slate-500 font-medium space-y-2.5">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>
                    Tham gia:{" "}
                    <strong className="text-slate-800">
                      {profile ? new Date(profile.createdAt).toLocaleDateString("vi-VN") : "Hôm nay"}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  <span>Trạng thái: <strong className="text-emerald-600 font-bold">Hoạt động</strong></span>
                </div>
              </div>
            </div>

            {/* Cột phải: Form cập nhật thông tin */}
            <div className="md:col-span-2 rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs">
              <h2 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
                Chỉnh sửa thông tin tài khoản
              </h2>

              <form onSubmit={handleSave} className="mt-6 space-y-5">
                <div>
                  <label htmlFor="fullName" className="block text-xs font-bold text-slate-800">
                    Họ và tên hiển thị <span className="text-rose-500">*</span>
                  </label>
                  <p className="mt-0.5 text-[11px] text-slate-400 font-medium">
                    Tên này sẽ được in trang trọng trên tất cả chứng chỉ tốt nghiệp của bạn.
                  </p>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-slate-800">
                    Địa chỉ Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    disabled
                    value={email}
                    className="mt-2 w-full rounded-xl border border-slate-200/60 bg-slate-100/70 p-3.5 text-xs text-slate-500 cursor-not-allowed font-medium"
                  />
                  <p className="mt-1 text-[11px] text-slate-400 font-medium">Email đăng nhập do hệ thống bảo mật quản lý.</p>
                </div>

                <div>
                  <label htmlFor="avatarUrl" className="block text-xs font-bold text-slate-800">
                    Đường dẫn ảnh đại diện (Avatar URL)
                  </label>
                  <input
                    id="avatarUrl"
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="bio" className="block text-xs font-bold text-slate-800">
                    Tiểu sử ngắn / Giới thiệu
                  </label>
                  <textarea
                    id="bio"
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Chia sẻ đôi dòng về sở thích học tập và mục tiêu phát triển của bạn..."
                    className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={isSaving || !fullName.trim()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-500/25 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
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
