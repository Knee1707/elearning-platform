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

function mapAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "Email hoặc mật khẩu không đúng.";
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

  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

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
        .select("role")
        .eq("id", signInData.user.id)
        .maybeSingle();
      role = (profile?.role as string | undefined) ?? null;
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

    // Điểm đến sau đăng nhập: cổng admin → /super-admin (super admin) hoặc /admin;
    // cổng user → trang chủ (hoặc ?next=).
    const adminHome = role === "super_admin" ? "/super-admin" : "/admin";
    const destination = explicitNext ?? (APP_MODE === "admin" ? adminHome : "/");

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
    </form>
  );
}