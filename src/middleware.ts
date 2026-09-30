import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { APP_MODE } from "@/lib/appMode";

// Các đường dẫn được phép ở CỔNG ADMIN (còn lại đẩy về /admin).
const ADMIN_ALLOWED = ["/admin", "/login", "/forgot-password", "/reset-password", "/verify", "/api", "/auth"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (APP_MODE === "admin") {
    // CỔNG ADMIN: chỉ cho trang quản trị + trang đăng nhập. Còn lại (kể cả "/") → /admin.
    const allowed = ADMIN_ALLOWED.some((p) => path.startsWith(p));
    if (!allowed) {
      const r = request.nextUrl.clone();
      r.pathname = "/admin";
      r.search = "";
      return NextResponse.redirect(r);
    }
  } else {
    // CỔNG USER: chặn hoàn toàn trang admin.
    if (path.startsWith("/admin")) {
      const r = request.nextUrl.clone();
      r.pathname = "/";
      r.search = "";
      return NextResponse.redirect(r);
    }
    // Chế độ Test Login (HV) chỉ dùng ở cổng user.
    if (request.cookies.get("demo_logged_in")?.value === "true") {
      return NextResponse.next();
    }
  }

  return await updateSession(request);
}

export const config = {
  // Bỏ qua static assets & ảnh.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
