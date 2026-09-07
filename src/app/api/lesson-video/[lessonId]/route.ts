import { NextResponse } from "next/server";
import { getLessonVideo } from "@/lib/queries/courses";

// GET /api/lesson-video/[lessonId] → { url: string | null }
// url = null nghĩa là chưa đủ quyền (bài trả phí + chưa ghi danh) → UI hiện "Mua để xem".
// Kiểm quyền nằm ở fn_get_lesson_video (phía DB), không tin client.
export async function GET(_req: Request, { params }: { params: { lessonId: string } }) {
  try {
    const url = await getLessonVideo(params.lessonId);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ url: null, error: true }, { status: 500 });
  }
}
