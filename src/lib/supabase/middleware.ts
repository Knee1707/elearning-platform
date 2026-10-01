import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refresh session + chặn route theo đăng nhập. Gọi từ middleware.ts gốc.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Các nhánh cần đăng nhập. Trang công khai: /, /courses, /login, /register, /verify.
  const PROTECTED = [
    "/my", "/learn", "/live", "/studio", "/admin", "/super-admin",
    "/cart", "/checkout", "/payout", "/certificates", "/notifications", "/profile",
  ];
  const path = request.nextUrl.pathname;
  const isDemo = request.cookies.get("demo_logged_in")?.value === "true";

  // Tài khoản bị khóa: đăng xuất ngay (Auth đã chặn đăng nhập mới qua banned_until,
  // bước này đá các phiên đang mở) rồi đưa về trang đăng nhập kèm thông báo.
  if (user && !path.startsWith("/login")) {
    const { data: profile } = await supabase.from("profiles").select("is_banned").eq("id", user.id).maybeSingle();
    if (profile?.is_banned) {
      await supabase.auth.signOut();
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/login";
      redirect.search = "?banned=1";
      const banned = NextResponse.redirect(redirect);
      // Giữ các cookie phiên đã bị xóa do signOut ghi vào response.
      response.cookies.getAll().forEach((cookie) => banned.cookies.set(cookie));
      return banned;
    }
  }

  if (!user && !isDemo && PROTECTED.some((p) => path.startsWith(p))) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", path);
    return NextResponse.redirect(redirect);
  }

  return response;
}
