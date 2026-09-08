import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Cho phép chế độ Test Login (HV) truy cập các trang protected trong khi chờ M4
  if (request.cookies.get("demo_logged_in")?.value === "true") {
    return NextResponse.next();
  }
  return await updateSession(request);
}

export const config = {
  // Bỏ qua static assets & ảnh.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
