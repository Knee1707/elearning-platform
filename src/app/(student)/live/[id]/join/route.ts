import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Route: /live/[id]/join · Chủ: M3 (L dựng khung gác quyền).
// Bấm "Vào học trực tiếp" → gọi fn_join_live_session:
//   - đã ghi danh → ghi điểm danh 'live' + trả meet_url → redirect sang Google Meet.
//   - chưa ghi danh → hàm raise exception → redirect về /cart (mua trước).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_join_live_session", { p_live: params.id });

  if (error || !data) {
    // Chưa ghi danh / lỗi → về giỏ hàng.
    return NextResponse.redirect(new URL("/cart", req.url));
  }

  // data = meet_url (URL tuyệt đối tới Google Meet).
  return NextResponse.redirect(String(data));
}
