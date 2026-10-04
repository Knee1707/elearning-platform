"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { APP_MODE } from "@/lib/appMode";
import { loginSchema, type LoginInput } from "../schemas";
import { Eye, EyeOff } from "lucide-react";
import { isAdminRole } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BANNED_MESSAGE = "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.";

function mapAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "Email hoặc mật khẩu không đúng.";
  }
  if (message.toLowerCase().includes("banned")) {
    return BANNED_MESSAGE;
  }
  if (message.includes("Email not confirmed")) {
    return "Email chưa được xác nhận. Vui lòng kiểm tra hộp thư.";
  }
  return "Đăng nhập thất bại. Vui lòng thử lại.";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicitNext = searchParams.get("next");

  // Middleware chuyển về /login?banned=1 khi phiên của tài khoản bị khóa bị đăng xuất.
  const [serverError, setServerError] = useState<string | null>(
    searchParams.get("banned") === "1" ? BANNED_MESSAGE : null,
  );
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  function fillDemo(email: string) {
    setValue("email", email);
    setValue("password", "Password123!");
  }

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    const supabase = createClient();

    const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (signInError) {
      setServerError(mapAuthError(signInError.message));
      return;
    }

    // Lấy vai trò để phân luồng theo cổng (admin vs user).
    let role: string | null = null;
    if (signInData.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_banned")
        .eq("id", signInData.user.id)
        .maybeSingle();
      role = (profile?.role as string | undefined) ?? null;
      // Phòng khi Auth chưa đồng bộ banned_until: vẫn không cho tài khoản bị khóa vào.
      if (profile?.is_banned) {
        await supabase.auth.signOut();
        setServerError(BANNED_MESSAGE);
        return;
      }
    }

    // Gác cổng: cổng admin CHỈ cho admin; cổng user KHÔNG cho admin.
    if (APP_MODE === "admin" && !isAdminRole(role)) {
      await supabase.auth.signOut();
      setServerError("Cổng quản trị chỉ dành cho tài khoản admin.");
      return;
    }
    if (APP_MODE === "user" && isAdminRole(role)) {
      await supabase.auth.signOut();
      setServerError("Tài khoản admin vui lòng đăng nhập ở cổng quản trị riêng.");
      return;
    }

    // Điểm đến sau đăng nhập: super admin → Dashboard /super-admin;
    // admin → thẳng vào thao tác quản trị (/admin/users, admin không còn Dashboard);
    // cổng user → trang chủ (hoặc ?next=).
    const adminHome = role === "super_admin" ? "/super-admin" : "/admin/users";
    // Cổng user: giảng viên vào thẳng khu Giảng viên, học viên về trang chủ.
    const userHome = role === "instructor" ? "/studio" : "/";
    const destination = explicitNext ?? (APP_MODE === "admin" ? adminHome : userHome);

    router.refresh();
    router.push(destination);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Mật khẩu</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="pr-10"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
      </Button>

      <div className="flex justify-between text-sm text-muted-foreground">
        <Link href="/forgot-password" className="hover:underline">
          Quên mật khẩu?
        </Link>
        <Link href="/register" className="hover:underline">
          Chưa có tài khoản? Đăng ký
        </Link>
      </div>

      {APP_MODE === "admin" ? (
        <div className="pt-3 border-t space-y-2">
          <p className="text-[11px] text-center text-muted-foreground font-medium">Tài khoản demo quản trị:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemo("admin@demo.local", "123456")}
              className="rounded-lg border border-purple-200 bg-purple-50/80 px-2.5 py-1.5 text-xs font-semibold text-purple-800 hover:bg-purple-100 transition-colors cursor-pointer"
            >
              🛡️ Điền Admin
            </button>
            <button
              type="button"
              onClick={() => fillDemo("superadmin@demo.local", "123456")}
              className="rounded-lg border border-indigo-200 bg-indigo-50/80 px-2.5 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              👑 Điền Super Admin
            </button>
          </div>
        </div>
      ) : (
        <div className="pt-3 border-t space-y-2">
          <p className="text-[11px] text-center text-muted-foreground font-medium">Tài khoản demo kiểm thử nhanh:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemo("gv@demo.local", "123456")}
              className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              👨‍🏫 Điền Giảng viên
            </button>
            <button
              type="button"
              onClick={() => fillDemo("hva@demo.local", "123456")}
              className="rounded-lg border border-blue-200 bg-blue-50/80 px-2.5 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              🎓 Điền Học viên A
            </button>
          </div>
        </div>
      )}
    </form>
  );
}