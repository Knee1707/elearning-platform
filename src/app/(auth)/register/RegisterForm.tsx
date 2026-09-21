"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { registerSchema, type RegisterInput } from "../schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function mapAuthError(message: string): string {
  if (message.includes("User already registered")) {
    return "Email này đã được đăng ký.";
  }
  if (message.includes("Password should be")) {
    return "Mật khẩu chưa đủ mạnh.";
  }
  return "Đăng ký thất bại. Vui lòng thử lại.";
}

export function RegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        // TODO(M4): xác nhận với L đúng key trigger DB đọc để insert profiles.full_name.
        data: { full_name: values.fullName },
      },
    });

    if (error) {
      setServerError(mapAuthError(error.message));
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-md border border-border p-4 text-sm">
        <p className="font-medium">Đăng ký thành công!</p>
        <p className="mt-1 text-muted-foreground">
          Vui lòng kiểm tra email để xác nhận tài khoản trước khi đăng nhập.
        </p>
        <Link href="/login" className="mt-3 inline-block text-sm underline">
          Về trang đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Họ và tên</Label>
        <Input id="fullName" autoComplete="name" {...register("fullName")} />
        {errors.fullName && (
          <p className="text-sm text-destructive">{errors.fullName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Mật khẩu</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Nhập lại mật khẩu</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Đang đăng ký..." : "Đăng ký"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Đã có tài khoản?{" "}
        <Link href="/login" className="hover:underline">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}