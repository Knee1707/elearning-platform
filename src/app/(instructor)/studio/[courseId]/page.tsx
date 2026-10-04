import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, FileQuestion, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES, isAdminRole } from "@/lib/utils";
import { updateCourse, submitForReview, submitCourseUpdate } from "@/features/course/courseActions";
import { ChapterManager } from "@/features/course/ChapterManager";

type PageProps = { params: { courseId: string } };

const STATUS_LABEL: Record<string, string> = {
  draft: "Nháp", pending: "Chờ duyệt", published: "Đã publish", rejected: "Bị từ chối", hidden: "Đã ẩn",
};
const STATUS_COLOR: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  hidden: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export default async function EditCoursePage({ params }: PageProps) {
  const profile = await requireRole(["instructor", ...ADMIN_ROLES]);
  const supabase = createClient();
  const { data: course } = await supabase
    .from("courses")
    .select(
      "id, instructor_id, title, description, price, status, moderation_note, update_status, update_feedback, chapters(id, title, position, lessons(id, title, video_url, video_review, video_review_reason, content_review, content_review_reason, is_updated, duration_seconds, is_free, position, attachments(id, name, file_url)))",
    )
    .eq("id", params.courseId)
    .single();

  // Kiểm tra quyền chỉnh sửa: Chủ khóa, Giảng viên đồng phụ trách, hoặc Admin/Super Admin
  let isAuthorized = course ? (course.instructor_id === profile.id || isAdminRole(profile.role)) : false;
  if (course && !isAuthorized) {
    try {
      const { data: ci } = await supabase
        .from("course_instructors")
        .select("instructor_id")
        .eq("course_id", params.courseId)
        .eq("instructor_id", profile.id)
        .maybeSingle();
      if (ci) isAuthorized = true;
    } catch {
      // Bỏ qua nếu bảng chưa tạo
    }
  }

  if (!course || !isAuthorized) notFound();

  const chapters = (course.chapters ?? [])
    .map((c) => ({ ...c, lessons: [...(c.lessons ?? [])].sort((a, b) => a.position - b.position) }))
    .sort((a, b) => a.position - b.position);

  // Tra cứu kỳ thi cuối khóa nếu đã được tạo
  const { data: finalExam } = await supabase
    .from("exams")
    .select("id, title, time_limit_minutes, pass_score, quiz_id")
    .eq("course_id", params.courseId)
    .eq("is_final", true)
    .maybeSingle();

  let questionCount = 0;
  if (finalExam?.quiz_id) {
    const { count } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", finalExam.quiz_id);
    questionCount = count || 0;
  }

  const status = String(course.status);
  const canSubmit = status === "draft" || status === "rejected";

  // Kiểm tra xem có bài học nào đang chờ duyệt video hoặc nội dung không
  const hasPendingItems = chapters.some((c) =>
    c.lessons.some(
      (l: any) => l.video_review === "pending" || l.content_review === "pending" || l.is_updated,
    ),
  ) || (course as any).update_status === "pending";

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Biên soạn khóa học</h1>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLOR[status] ?? STATUS_COLOR.draft}`}>
          {STATUS_LABEL[status] ?? status}
        </span>
      </div>

      {/* Thông báo nếu khóa bị từ chối */}
      {status === "rejected" && (course as any).moderation_note && (
        <section className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
          <div className="flex items-start gap-2 text-sm text-red-800 dark:text-red-300">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
            <div>
              <p className="font-semibold">Khóa học bị từ chối kiểm duyệt</p>
              <p className="mt-1 text-xs text-red-700 dark:text-red-400">
                Phản hồi từ Admin: &quot;{(course as any).moderation_note}&quot;
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Thông báo và nút gửi duyệt cập nhật cho khóa đã xuất bản */}
      {status === "published" && hasPendingItems && (
        <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Có bài học hoặc nội dung cập nhật đang chờ Admin xét duyệt
              </p>
              <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400">
                Các bài học mới hoặc video/nội dung vừa chỉnh sửa sẽ hiển thị cho học viên sau khi được Admin phê duyệt.
              </p>
            </div>
            <form action={submitCourseUpdate}>
              <input type="hidden" name="courseId" value={String(course.id)} />
              <button
                type="submit"
                className="rounded bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 cursor-pointer"
              >
                Gửi yêu cầu duyệt thay đổi
              </button>
            </form>
          </div>
        </section>
      )}

      <section className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border p-4">
        {canSubmit ? (
          <>
            <p className="text-sm text-muted-foreground">Khi sẵn sàng, gửi khóa học để quản trị viên xét duyệt.</p>
            <form action={submitForReview} className="ml-auto">
              <input type="hidden" name="courseId" value={String(course.id)} />
              <button type="submit" className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground font-medium hover:opacity-90 cursor-pointer">
                Gửi duyệt khóa học
              </button>
            </form>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {status === "pending" && "Khóa học đang chờ quản trị viên xét duyệt xuất bản."}
            {status === "published" && "Khóa học đã publish, đang hiển thị công khai trên hệ thống."}
            {status === "hidden" && "Khóa học đang bị ẩn bởi quản trị viên."}
          </p>
        )}
      </section>

      <form action={updateCourse} className="mt-6 space-y-4 rounded-lg border p-5">
        <input type="hidden" name="courseId" value={String(course.id)} />
        <div>
          <label className="text-sm font-medium" htmlFor="title">Tên khóa học</label>
          <input id="title" name="title" defaultValue={String(course.title)} required className="mt-1 w-full rounded border bg-background px-3 py-2" />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="description">Mô tả</label>
          <textarea id="description" name="description" defaultValue={String(course.description)} required rows={4} className="mt-1 w-full rounded border bg-background px-3 py-2" />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="price">Giá (VNĐ)</label>
          <input id="price" name="price" type="number" min="0" defaultValue={Number(course.price)} className="mt-1 w-full rounded border bg-background px-3 py-2" />
        </div>
        <button className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground font-medium hover:opacity-90 cursor-pointer">
          Lưu thay đổi {status === "published" ? "(và gửi duyệt thay đổi)" : ""}
        </button>
      </form>

      <ChapterManager courseId={String(course.id)} initialChapters={chapters} />

      {/* KHỐI QUẢN LÝ KỲ THI CUỐI KHÓA */}
      <section className="mt-8 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                <Award className="h-3.5 w-3.5 text-amber-600" />
                Đánh giá &amp; Chứng nhận
              </span>
              {finalExam && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                  Đã có đề thi ({questionCount} câu)
                </span>
              )}
            </div>
            <h2 className="text-lg font-black text-slate-900">
              Kỳ thi cuối khóa (Trắc nghiệm &amp; Tự luận)
            </h2>
            <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
              {finalExam ? (
                <>
                  Đề thi: &quot;{finalExam.title}&quot; · Thời lượng: {finalExam.time_limit_minutes} phút · Điểm đạt: {finalExam.pass_score}%. Bấm nút bên cạnh để xem và chỉnh sửa nội dung câu hỏi.
                </>
              ) : (
                "Tạo đề thi gồm các câu hỏi trắc nghiệm và tự luận để học viên làm bài thi và nhận chứng chỉ hoàn thành khóa học."
              )}
            </p>
          </div>

          <Link
            href={`/studio/${course.id}/exam`}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-amber-600 hover:bg-amber-700 px-6 py-3 text-xs font-bold text-white shadow-md shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <FileQuestion className="h-4 w-4" />
            <span>{finalExam ? "Chỉnh sửa nội dung kỳ thi" : "Tạo kỳ thi cuối khóa"}</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
