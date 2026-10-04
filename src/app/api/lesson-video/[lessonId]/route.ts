import { NextResponse } from "next/server";
import { getLessonVideo } from "@/lib/queries/courses";
import { createClient } from "@/lib/supabase/server";

// GET /api/lesson-video/[lessonId] → { url: string | null, reason?: string }
// Kiểm quyền cốt lõi nằm ở fn_get_lesson_video (phía DB).
// Khi url = null, phân loại lý do cụ thể (chờ duyệt / chưa có video / chưa ghi danh) để UI hiển thị chuẩn xác.
export async function GET(_req: Request, { params }: { params: { lessonId: string } }) {
  try {
    const url = await getLessonVideo(params.lessonId);
    if (url) {
      return NextResponse.json({ url });
    }

    const supabase = createClient();
    const { data: lesson } = await supabase
      .from("lessons")
      .select("video_review, video_url, is_free, chapters(course_id)")
      .eq("id", params.lessonId)
      .maybeSingle();

    if (lesson) {
      const courseId = (lesson.chapters as { course_id?: string } | null)?.course_id;
      let isEnrolled = false;
      if (courseId) {
        const { data: enr } = await supabase.rpc("fn_is_enrolled", { cid: courseId });
        isEnrolled = Boolean(enr);
      }

      if (isEnrolled || lesson.is_free) {
        if (lesson.video_review === "pending") {
          return NextResponse.json({ url: null, reason: "pending_review" });
        }
        if (lesson.video_review === "rejected") {
          return NextResponse.json({ url: null, reason: "rejected" });
        }
        if (!lesson.video_url) {
          return NextResponse.json({ url: null, reason: "no_video" });
        }
      }
    }

    return NextResponse.json({ url: null, reason: "not_enrolled" });
  } catch {
    return NextResponse.json({ url: null, error: true }, { status: 500 });
  }
}
