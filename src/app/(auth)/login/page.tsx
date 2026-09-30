import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
import { APP_MODE } from "@/lib/appMode";

export default function LoginPage() {
  const isAdmin = APP_MODE === "admin";
  return (
    <main className="mx-auto max-w-md p-8">
      {isAdmin && (
        <span className="mb-3 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
          Cổng Quản trị
        </span>
      )}
      <h1 className="text-2xl font-bold">{isAdmin ? "Đăng nhập Quản trị" : "Đăng nhập"}</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        {isAdmin
          ? "Chỉ tài khoản quản trị viên (admin) mới đăng nhập được ở đây."
          : "Đăng nhập để tiếp tục học tập (học viên / giảng viên)."}
      </p>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Đang tải biểu mẫu...</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}