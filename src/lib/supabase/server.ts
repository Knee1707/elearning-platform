import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Supabase client dùng ở phía server (Server Components, Route Handlers, Server Actions).
// Next 14.2: cookies() đồng bộ (không await).
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Gọi từ Server Component: bỏ qua — middleware sẽ refresh session.
          }
        },
      },
    },
  );
}
