import Link from "next/link";
import { notFound } from "next/navigation";
import { FileQuestion, AlertCircle, CheckCircle2 } from "lucide-react";
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

  // Tổng hợp dữ liệu để kiểm tra 4 tiêu chuẩn gửi duyệt
  const allLessons = chapters.flatMap((c: any) => c.lessons ?? []);
  const lessonsWithVideo = allLessons.filter((l: any) => Boolean(l.video_url?.trim()));
  const allLessonIds = allLessons.map((l: any) => l.id);

  let quizzesLessonIds = new Set<string>();
  if (allLessonIds.length > 0) {
    const { data: qData } = await supabase
      .from("quizzes")
      .select("id, lesson_id")
      .in("lesson_id", allLessonIds);
    quizzesLessonIds = new Set((qData ?? []).map((q: any) => q.lesson_id));
  }

  const lessonsMissingQuiz = lessonsWithVideo.filter((l: any) => !quizzesLessonIds.has(l.id));

  // 4 tiêu chuẩn gửi duyệt:
  const condChapters = chapters.length >= 3;
  const condVideos = lessonsWithVideo.length >= 5;
  const condQuizzes = lessonsWithVideo.length > 0 && lessonsMissingQuiz.length === 0;
  const condFinalExam = Boolean(finalExam) && questionCount > 0;

  const passedConditionsCount = [condChapters, condVideos, condQuizzes, condFinalExam].filter(Boolean).length;
  const isReadyForReview = passedConditionsCount === 4;

  const status = String(course.status);
  const canSubmit = status === "draft" || status === "rejected";

  // Kiểm tra xem có bài học nào đang chờ duyệt video hoặc nội dung không
  const hasPendingItems = chapters.some((c) =>
    c.lessons.some(
      (l: any) => l.video_review === "pending" || l.content_review === "pending" || l.is_updated,
    ),
  ) || (course as any).update_status === "pending";

  // Calculate constraints
  const numChapters = chapters.length;
  const numLessons = chapters.reduce((sum, c) => sum + (c.lessons?.length || 0), 0);
  const hasFinalExam = !!finalExam;
  
  const lessonIds = chapters.flatMap((c: any) => c.lessons.map((l: any) => l.id));
  const lessonIdsString = lessonIds.length > 0 ? lessonIds.join(',') : '00000000-0000-0000-0000-000000000000';
  
  const { data: allQuizzes } = await supabase
    .from("quizzes")
    .select("id")
    .or(`course_id.eq.${params.courseId},lesson_id.in.(${lessonIdsString})`);
    
  const normalQuizzesCount = (allQuizzes || []).filter((q: any) => q.id !== finalExam?.quiz_id).length;
  const hasMinQuizzes = normalQuizzesCount >= 1;

  const canPublishNow = numChapters >= 3 && numLessons >= 5 && hasFinalExam && hasMinQuizzes;

  return (
    <main className="mx-auto max-w-4xl p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Biên soạn khóa học</h1>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLOR[status] ?? STATUS_COLOR.draft}`}>
          {STATUS_LABEL[status] ?? status}
        </span>
      </div>

      {/* Thông báo nếu khóa bị từ chối */}
      {status === "rejected" && (course as any).moderation_note && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
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
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
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

      {/* KHỐI CHECKLIST TIÊU CHUẨN GỬI DUYỆT KHÓA HỌC */}
      {canSubmit ? (
        <section className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className={`h-4 w-4 ${isReadyForReview ? "text-emerald-600" : "text-amber-500"}`} />
                <span>Tiêu chuẩn gửi duyệt khóa học</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    isReadyForReview
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {passedConditionsCount}/4 tiêu chuẩn đạt
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Khóa học cần đạt đủ 4 điều kiện dưới đây trước khi có thể gửi yêu cầu phê duyệt tới Ban quản trị.
              </p>
            </div>

            <form action={submitForReview}>
              <input type="hidden" name="courseId" value={String(course.id)} />
              <button
                type="submit"
                disabled={!isReadyForReview}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                  isReadyForReview
                    ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm cursor-pointer"
                    : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                }`}
              >
                <span>Gửi duyệt khóa học</span>
              </button>
            </form>
          </div>

          {/* 4 TIÊU CHUẨN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Tiêu chuẩn 1: Chương */}
            <div
              className={`rounded-lg border p-3 flex items-start gap-2.5 ${
                condChapters
                  ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                  : "border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/50"
              }`}
            >
              <span
                className={`mt-0.5 rounded-full p-0.5 shrink-0 ${
                  condChapters
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-300 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                }`}
              >
                {condChapters ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              </span>
              <div>
                <p className="font-semibold text-foreground">1. Cấu trúc: Ít nhất 3 chương</p>
                <p className="text-muted-foreground mt-0.5">
                  {condChapters
                    ? `Đạt yêu cầu (hiện có ${chapters.length}/3 chương)`
                    : `Chưa đạt: Hiện có ${chapters.length}/3 chương (cần thêm ít nhất ${3 - chapters.length} chương)`}
                </p>
              </div>
            </div>

            {/* Tiêu chuẩn 2: Video bài giảng */}
            <div
              className={`rounded-lg border p-3 flex items-start gap-2.5 ${
                condVideos
                  ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                  : "border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/50"
              }`}
            >
              <span
                className={`mt-0.5 rounded-full p-0.5 shrink-0 ${
                  condVideos
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-300 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                }`}
              >
                {condVideos ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              </span>
              <div>
                <p className="font-semibold text-foreground">2. Nội dung: Ít nhất 5 video bài giảng</p>
                <p className="text-muted-foreground mt-0.5">
                  {condVideos
                    ? `Đạt yêu cầu (hiện có ${lessonsWithVideo.length}/5 video bài giảng)`
                    : `Chưa đạt: Hiện có ${lessonsWithVideo.length}/5 video (cần thêm ít nhất ${5 - lessonsWithVideo.length} video)`}
                </p>
              </div>
            </div>

            {/* Tiêu chuẩn 3: Quiz sau video */}
            <div
              className={`rounded-lg border p-3 flex items-start gap-2.5 ${
                condQuizzes
                  ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                  : "border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/50"
              }`}
            >
              <span
                className={`mt-0.5 rounded-full p-0.5 shrink-0 ${
                  condQuizzes
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-300 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                }`}
              >
                {condQuizzes ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              </span>
              <div>
                <p className="font-semibold text-foreground">3. Kiểm tra: Mỗi video phải có Quiz</p>
                <p className="text-muted-foreground mt-0.5">
                  {condQuizzes
                    ? `Đạt yêu cầu (100% video đều có bài quiz kiểm tra)`
                    : lessonsWithVideo.length === 0
                      ? "Cần đăng tải video bài học trước"
                      : `Chưa đạt: Còn ${lessonsMissingQuiz.length} video chưa có bài quiz kiểm tra`}
                </p>
              </div>
            </div>

            {/* Tiêu chuẩn 4: Bài thi cuối khóa */}
            <div
              className={`rounded-lg border p-3 flex items-start gap-2.5 ${
                condFinalExam
                  ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                  : "border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/50"
              }`}
            >
              <span
                className={`mt-0.5 rounded-full p-0.5 shrink-0 ${
                  condFinalExam
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-300 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                }`}
              >
                {condFinalExam ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              </span>
              <div>
                <p className="font-semibold text-foreground">4. Đánh giá: Có bài test cuối khóa</p>
                <p className="text-muted-foreground mt-0.5">
                  {condFinalExam
                    ? `Đạt yêu cầu (Đã có đề thi với ${questionCount} câu hỏi)`
                    : finalExam
                      ? "Chưa đạt: Cần thêm câu hỏi vào bài thi cuối kỳ"
                      : "Chưa đạt: Cần tạo bài thi cuối kỳ để cấp chứng nhận"}
                </p>
              </div>
            </div>
          </div>

          {!isReadyForReview && (
            <p className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-lg p-2.5">
              ⚠️ Nút <strong>Gửi duyệt khóa học</strong> sẽ tự động được kích hoạt khi khóa học của bạn hoàn thành đầy đủ cả 4 tiêu chuẩn trên.
            </p>
          )}
        </section>
      ) : (
        <section className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
          {status === "pending" && "Khóa học đang chờ quản trị viên xét duyệt xuất bản. Trong thời gian này, bạn vẫn có thể xem lại cấu trúc nội dung."}
          {status === "published" && "Khóa học đã được phê duyệt và đang hiển thị công khai trên hệ thống."}
          {status === "hidden" && "Khóa học đang bị ẩn bởi quản trị viên."}
        </section>
      )}
      <section className="mt-4 flex flex-col gap-3 rounded-lg border border-dashed border-border p-4">
        {canSubmit ? (
          <>
            <div className="text-sm">
              <p className="font-semibold mb-2">Điều kiện xuất bản khóa học:</p>
              <ul className="space-y-1">
                <li className={`flex items-center gap-2 ${numChapters >= 3 ? 'text-emerald-600' : 'text-red-600'}`}>
                  <span>{numChapters >= 3 ? '✅' : '❌'}</span> Ít nhất 3 chương (Hiện tại: {numChapters})
                </li>
                <li className={`flex items-center gap-2 ${numLessons >= 5 ? 'text-emerald-600' : 'text-red-600'}`}>
                  <span>{numLessons >= 5 ? '✅' : '❌'}</span> Ít nhất 5 bài giảng (Hiện tại: {numLessons})
                </li>
                <li className={`flex items-center gap-2 ${hasMinQuizzes ? 'text-emerald-600' : 'text-red-600'}`}>
                  <span>{hasMinQuizzes ? '✅' : '❌'}</span> Ít nhất 1 bài quiz kiểm tra (Hiện tại: {normalQuizzesCount})
                </li>
                <li className={`flex items-center gap-2 ${hasFinalExam ? 'text-emerald-600' : 'text-red-600'}`}>
                  <span>{hasFinalExam ? '✅' : '❌'}</span> Ít nhất 1 bài test cuối khóa (Final exam)
                </li>
              </ul>
            </div>
            
            <div className="flex items-center justify-between mt-2 pt-2 border-t">
              <p className="text-sm text-muted-foreground">Khi đã đạt đủ điều kiện, hãy gửi khóa học để quản trị viên xét duyệt.</p>
              <form action={submitForReview} className="ml-auto">
                <input type="hidden" name="courseId" value={String(course.id)} />
                <button 
                  type="submit" 
                  disabled={!canPublishNow}
                  className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Gửi duyệt khóa học
                </button>
              </form>
            </div>
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
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground font-medium hover:opacity-90 cursor-pointer">
            Lưu thay đổi {status === "published" ? "(và gửi duyệt thay đổi)" : ""}
          </button>
          <Link
            href={`/studio/${course.id}/exam`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 hover:border-amber-400 transition-colors shadow-2xs"
          >
            <FileQuestion className="h-3.5 w-3.5 text-amber-600" />
            <span>{finalExam ? `Kỳ thi cuối khóa (${questionCount} câu)` : "Tạo bài thi cuối kỳ"}</span>
          </Link>
        </div>
      </form>

      <ChapterManager courseId={String(course.id)} initialChapters={chapters} />
    </main>
  );
}
