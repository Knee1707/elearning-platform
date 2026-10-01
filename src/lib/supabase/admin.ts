import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client quyền SERVICE ROLE — CHỈ dùng ở server (server action), KHÔNG bao giờ
// để lộ key ra client. Dùng cho thao tác cần bỏ qua RLS: tạo/xóa tài khoản auth.
// Mọi nơi gọi phải tự kiểm quyền (requireRole + luật nghiệp vụ) TRƯỚC khi dùng.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Thiếu cấu hình máy chủ (SUPABASE_SERVICE_ROLE_KEY).");
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
