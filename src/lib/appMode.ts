// Cờ xác định "cổng" (host) đang chạy:
//   - "admin": chỉ cho tài khoản admin đăng nhập, chỉ hiện trang quản trị.
//   - "user" : cho giảng viên + học viên, KHÔNG vào được trang admin.
// Đặt qua biến môi trường NEXT_PUBLIC_APP_MODE khi deploy (mặc định "user").
// Cả 2 cổng dùng CHUNG một Supabase (cùng NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).
export type AppMode = "admin" | "user";

export const APP_MODE: AppMode =
  process.env.NEXT_PUBLIC_APP_MODE === "admin" ? "admin" : "user";

export const IS_ADMIN_HOST = APP_MODE === "admin";
