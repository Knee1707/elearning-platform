"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, CheckCircle2, Loader2, Phone, Save, Shield, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS, isAdminRole } from "@/lib/utils";
import type { UserRole } from "@/types/domain";

type InstructorProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  bio: string;
  role: UserRole;
  createdAt: string;
};

export default function InstructorProfilePage() {
  const [profile, setProfile] = useState<InstructorProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      try {
        const supabase = createClient();
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user || !mounted) return;

        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, phone, avatar_url, role, created_at")
          .eq("id", auth.user.id)
          .single();
        if (error) throw error;

        const next: InstructorProfile = {
          id: String(data.id),
          fullName: String(data.full_name ?? ""),
          email: auth.user.email ?? "",
          phone: String(data.phone ?? ""),
          avatarUrl: String(data.avatar_url ?? ""),
          bio: window.localStorage.getItem(`user_bio_${data.id}`) ?? "",
          role: data.role as UserRole,
          createdAt: String(data.created_at),
        };
        setProfile(next);
        setFullName(next.fullName);
        setPhone(next.phone);
        setAvatarUrl(next.avatarUrl);
        setBio(next.bio);
      } catch (error) {
        if (mounted) setNotice(error instanceof Error ? error.message : "Không thể tải hồ sơ giảng viên.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    void loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !fullName.trim()) return;
    setIsSaving(true);
    setNotice(null);
    try {
      const { error } = await createClient()
        .from("profiles")
        .update({ full_name: fullName.trim(), phone: phone.trim() || null, avatar_url: avatarUrl.trim() || null })
        .eq("id", profile.id);
      if (error) throw error;
      window.localStorage.setItem(`user_bio_${profile.id}`, bio.trim());
      setProfile((current) => (current ? { ...current, fullName: fullName.trim(), phone, avatarUrl, bio } : current));
      setNotice("Cập nhật thông tin giảng viên thành công.");
    } catch (error) {
      setNotice(error instanceof Error ? `Không thể cập nhật hồ sơ: ${error.message}` : "Không thể cập nhật hồ sơ.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700">
              <User className="h-4 w-4" /> Hồ sơ giảng viên
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Thông tin giảng viên</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">Quản lý thông tin hiển thị trên hồ sơ và chứng chỉ.</p>
          </div>
          <Link href="/studio" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50">
            <ArrowLeft className="h-3.5 w-3.5" /> Về bảng điều khiển
          </Link>
        </div>

        {notice && <div className="mt-6 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" />{notice}</div>}

        {isLoading ? (
          <div className="flex min-h-[300px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-emerald-600" /></div>
        ) : profile ? (
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-emerald-50 text-3xl font-black text-emerald-700 ring-4 ring-emerald-500/10">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
                ) : fullName.charAt(0).toUpperCase() || "G"}
              </div>
              <h2 className="mt-4 text-base font-black">{fullName || "Giảng viên"}</h2>
              <p className="mt-1 text-xs text-slate-400">{profile.email}</p>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"><Shield className="h-3.5 w-3.5" />{isAdminRole(profile.role) ? ROLE_LABELS[profile.role] : "Giảng viên"}</div>
              <div className="mt-6 space-y-2 border-t border-slate-100 pt-4 text-left text-xs text-slate-500"><div className="flex items-center gap-2"><Calendar className="h-4 w-4" />Tham gia: <strong className="text-slate-800">{new Date(profile.createdAt).toLocaleDateString("vi-VN")}</strong></div><div className="flex items-center gap-2"><Phone className="h-4 w-4" />{phone || "Chưa cập nhật số điện thoại"}</div></div>
            </div>

            <form onSubmit={handleSave} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 md:col-span-2">
              <h2 className="border-b border-slate-100 pb-3 text-sm font-black">Chỉnh sửa thông tin tài khoản</h2>
              <label className="block text-xs font-bold">Họ và tên hiển thị<input required value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs font-medium outline-none focus:border-emerald-500 focus:bg-white" /></label>
              <label className="block text-xs font-bold">Địa chỉ Email<input disabled value={profile.email} className="mt-2 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 p-3.5 text-xs text-slate-500" /></label>
              <label className="block text-xs font-bold">Số điện thoại<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="0912345678" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs outline-none focus:border-emerald-500 focus:bg-white" /></label>
              <label className="block text-xs font-bold">Đường dẫn ảnh đại diện<input type="url" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://example.com/avatar.jpg" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs outline-none focus:border-emerald-500 focus:bg-white" /></label>
              <label className="block text-xs font-bold">Tiểu sử / Giới thiệu<textarea rows={3} value={bio} onChange={(event) => setBio(event.target.value)} className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs outline-none focus:border-emerald-500 focus:bg-white" /></label>
              <div className="flex justify-end border-t border-slate-100 pt-4"><button type="submit" disabled={isSaving || !fullName.trim()} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50">{isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Lưu thay đổi</button></div>
            </form>
          </div>
        ) : null}
      </div>
    </main>
  );
}
