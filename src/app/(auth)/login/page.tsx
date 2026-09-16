import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold">Đăng nhập</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Đăng nhập để tiếp tục học tập hoặc quản trị khóa học.
      </p>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Đang tải biểu mẫu...</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}