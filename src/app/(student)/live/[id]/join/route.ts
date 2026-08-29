import { NextResponse, type NextRequest } from "next/server";

// Route: /live/[id]/join · Chủ: M3
// TODO(M3): gọi joinLiveSession(id) (lib/queries/attendance.ts → fn_join_live_session),
//           ghi điểm danh 'live' rồi redirect sang meet_url trả về.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json(
    { todo: "M3: joinLiveSession → ghi attendance(live) rồi redirect meet_url", liveId: params.id },
    { status: 501 },
  );
}
