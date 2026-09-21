import { RegisterForm } from "./RegisterForm";

// Route: /register · Chủ: M4.
export default function RegisterPage() {
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold">Đăng ký</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Tạo tài khoản để học hoặc giảng dạy trên nền tảng.
      </p>
      <RegisterForm />
    </main>
  );
}