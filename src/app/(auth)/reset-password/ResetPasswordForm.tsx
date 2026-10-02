"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const resetSchema = z
  .object({
    password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu nhập lại không khớp",
    path: ["confirmPassword"],
  });
type ResetInput = z.infer<typeof resetSchema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    let mounted = true;

    async function checkRecoverySession() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!mounted) return;

        if (session) {
          setIsReady(true);
          return;
        }

        // Nếu URL chưa kèm token khôi phục, Supabase sẽ emit event PASSWORD_RECOVERY sau khi parse URL.
        const hasRecoveryToken =
          typeof window !== "undefined" &&
          (window.location.hash.includes("type=recovery") ||
            window.location.hash.includes("access_token") ||
            new URLSearchParams(window.location.search).get("code") !== null);

        if (!hasRecoveryToken) {
          setServerError("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại.");
          return;
        }

        const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
          if (!mounted) return;

          if (event === "PASSWORD_RECOVERY" && nextSession) {
            setIsReady(true);
            setServerError(null);
            sub.subscription.unsubscribe();
          }
        });

        return () => {
          sub.subscription.unsubscribe();
        };
      } catch (error) {
        if (!mounted) return;
        setServerError("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại.");
      }
    }

    checkRecoverySession();

    return () => {
      mounted = false;
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetInput>({ resolver: zodResolver(resetSchema) });

  async function onSubmit(values: ResetInput) {
    setServerError(null);

    if (!isReady) {
      setServerError("Liên kết đặt lại mật khẩu chưa được xác thực. Vui lòng mở lại link trong email.");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: values.password });

    if (error) {
      setServerError("Liên kết đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu lại.");
      return;
    }

    router.push("/login");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {!isReady && !serverError && (
        <p className="text-sm text-muted-foreground">Đang xác thực liên kết đặt lại mật khẩu...</p>
      )}

      <div className="space-y-2">
        <Label htmlFor="password">Mật khẩu mới</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
          disabled={!isReady}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Nhập lại mật khẩu mới</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
          disabled={!isReady}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting || !isReady}>
        {isSubmitting ? "Đang lưu..." : "Đặt mật khẩu mới"}
      </Button>
    </form>
  );
}