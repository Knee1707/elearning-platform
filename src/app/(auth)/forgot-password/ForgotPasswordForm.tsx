"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { forgotPasswordSchema, type ForgotPasswordInput } from "../schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordInput) {
    setServerError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setServerError("Không thể gửi email. Vui lòng thử lại sau.");
      return;
    }

    // Luôn báo thành công dù email có tồn tại hay không —
    // tránh lộ thông tin email nào đã đăng ký (user enumeration).
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-md border border-border p-4 text-sm">
        <p className="font-medium">Đã gửi email!</p>
        <p className="mt-1 text-muted-foreground">
          Nếu email tồn tại trong hệ thống, bạn sẽ nhận được liên kết đặt lại mật khẩu.
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
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Đang gửi..." : "Gửi liên kết đặt lại"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="hover:underline">
          Quay lại đăng nhập
        </Link>
      </p>
    </form>
  );
}