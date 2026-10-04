import { ForgotPasswordForm } from "./ForgotPasswordForm";

// Route: /forgot-password · Chủ: M4 · Quên mật khẩu.
export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold">Quên mật khẩu</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.
      </p>
      <ForgotPasswordForm />
    </main>
  );
}
