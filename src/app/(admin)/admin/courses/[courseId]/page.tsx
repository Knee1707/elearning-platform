import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { Pencil, Sparkles, Video, CheckCircle2, AlertCircle, BookOpen, Award, HelpCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES } from "@/lib/utils";
import {
  moderateCourseAction,
  reviewVideoAction,
  reviewLessonContentAction,
  adminDeleteCourseAction,
} from "@/features/admin/actions";
import { FlashMessage, ReasonAction, ConfirmAction, param, type SearchParams } from "@/features/admin/ui";
import { getLessonVideoPreviewUrl } from "@/lib/queries/courses";
import { getYouTubeEmbedUrl } from "@/lib/video";
import { LessonHighlightScroll } from "@/features/admin/LessonHighlightScroll";

type PageProps = { params: { courseId: string }; searchParams: SearchParams };

const STATUS_LABEL: Record<string, string> = {
  draft: "Nháp",
  pending: "Chờ duyệt",
  published: "Đang bán",
  rejected: "Bị từ chối",
  hidden: "Đã ẩn",
};

async function adminUpdatePrice(formData: FormData) {
  "use server";
  await requireRole(ADMIN_ROLES);
  const courseId = String(formData.get("courseId"));
  const supabase = createClient();
  const { error } = await supabase
    .from("courses")
    .update({ price: Number(formData.get("price")) })
    .eq("id", courseId);
  if (error) throw error;
  revalidatePath(`/admin/courses/${courseId}`);
}

async function adminToggleLessonFree(formData: FormData) {
  "use server";
  await requireRole(ADMIN_ROLES);
  const courseId = String(formData.get("courseId"));
  const lessonId = String(formData.get("lessonId"));
  const nextValue = formData.get("nextValue") === "true";
  const supabase = createClient();
  const { error } = await supabase.from("lessons").update({ is_free: nextValue }).eq("id", lessonId);
  if (error) throw error;
  revalidatePath(`/admin/courses/${courseId}`);
}

export default async function AdminCourseDetailPage({ params, searchParams }: PageProps) {
  await requireRole(ADMIN_ROLES);
  const supabase = createClient();

  const highlightLesson = param(searchParams, "highlightLesson");
  const highlightType = param(searchParams, "type");

  const { data: course } = await supabase
    .from("courses")
    .select(
      "id, title, price, status, profiles!courses_instructor_id_fkey(full_name), chapters(id, title, position, lessons(id, title, is_free, position, video_url, video_review, video_review_reason, content_review, content_review_reason, is_updated, duration_seconds))",
    )
    .eq("id", params.courseId)
    .single();

  if (!course) notFound();

  // Lấy thêm danh sách nhiều giảng viên từ course_instructors (nếu có)
  let instructorNames: string[] = [];
  try {
    const { data: ciData } = await supabase
      .from("course_instructors")
      .select("profiles(full_name)")
      .eq("course_id", params.courseId);
    if (ciData && ciData.length > 0) {
      instructorNames = ciData.map((row: any) => row.profiles?.full_name).filter(Boolean);
    }
  } catch {
    // Bỏ qua nếu bảng chưa tạo
  }

  const primaryInstructorName = (course as any).profiles?.full_name ?? "Không rõ";
  const displayInstructor = instructorNames.length > 0
    ? instructorNames.join(", ")
    : primaryInstructorName;

  const chapters = (course.chapters ?? [])
    .map((c: any) => ({ ...c, lessons: [...(c.lessons ?? [])].sort((a: any, b: any) => a.position - b.position) }))
    .sort((a: any, b: any) => a.position - b.position);

  // Lấy video preview url cho bài học được highlight (nếu có video)
  let highlightedVideoUrl: string | null = null;
  if (highlightLesson) {
    highlightedVideoUrl = await getLessonVideoPreviewUrl(highlightLesson).catch(() => null);
  }

  const here = `/admin/courses/${course.id}${
    highlightLesson ? `?highlightLesson=${highlightLesson}${highlightType ? `&type=${highlightType}` : ""}` : ""
  }`;



  // Đánh giá 4 tiêu chuẩn bắt buộc của khóa học
  const allLessons = chapters.flatMap((c: any) => c.lessons ?? []);
  const videoLessons = allLessons.filter((l: any) => !!l.video_url);
  const lessonIds = allLessons.map((l: any) => l.id);

  let lessonQuizCount = 0;
  if (lessonIds.length > 0) {
    const { data: quizzesData } = await supabase
      .from("quizzes")
      .select("lesson_id")
      .in("lesson_id", lessonIds);
    const quizLessonIds = new Set((quizzesData ?? []).map((q: any) => q.lesson_id));
    lessonQuizCount = videoLessons.filter((l: any) => quizLessonIds.has(l.id)).length;
  }

  const { data: finalExam } = await supabase
    .from("exams")
    .select("id, title, quiz_id")
    .eq("course_id", params.courseId)
    .eq("is_final", true)
    .maybeSingle();

  let finalQuestionCount = 0;
  if (finalExam?.quiz_id) {
    const { count } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", finalExam.quiz_id);
    finalQuestionCount = count ?? 0;
  }

  const condChapters = chapters.length >= 3;
  const condVideos = videoLessons.length >= 5;
  const condQuizzes = videoLessons.length > 0 && lessonQuizCount === videoLessons.length;
  const condFinalExam = !!finalExam && finalQuestionCount > 0;
  const allCriteriaMet = condChapters && condVideos && condQuizzes && condFinalExam;

  return (
    <main className="mx-auto max-w-4xl p-8">
      {/* Tự động cuộn đến bài học được highlight */}
      <LessonHighlightScroll targetId={highlightLesson ? `lesson-${highlightLesson}` : undefined} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{String(course.title)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Giảng viên: <strong className="text-foreground">{displayInstructor}</strong> {instructorNames.length > 1 && `(${instructorNames.length} giảng viên)`} · Trạng thái: {STATUS_LABEL[String(course.status)] ?? String(course.status)}
          </p>
        </div>
        <Link
          href={`/admin/courses/${course.id}/edit`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <Pencil className="h-4 w-4" /> Chỉnh sửa đầy đủ
        </Link>
      </div>

      {/* Hộp kiểm tra 4 Tiêu chuẩn bắt buộc trước khi Duyệt xuất bản */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs">
              QC
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Đối soát tiêu chuẩn nội dung khóa học (Quy chuẩn hệ thống)
              </h2>
              <p className="text-xs text-slate-500">
                Quy trình: Admin mở khóa &rarr; Giảng viên biên soạn &rarr; Đạt 4 tiêu chuẩn &rarr; Admin duyệt &amp; Public cho học viên.
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              allCriteriaMet
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            {allCriteriaMet ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Đủ điều kiện xuất bản
              </>
            ) : (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                Chưa đủ tiêu chuẩn
              </>
            )}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {/* Tiêu chuẩn 1 */}
          <div
            className={`rounded-lg border p-3 ${
              condChapters ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-slate-500" /> Số chương
              </span>
              {condChapters ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600" />
              )}
            </div>
            <p className="mt-2 text-base font-bold text-slate-800">
              {chapters.length} <span className="text-xs font-normal text-slate-500">/ tối thiểu 3</span>
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {condChapters ? "✅ Đạt chuẩn cấu trúc" : "⚠️ Cần thêm chương"}
            </p>
          </div>

          {/* Tiêu chuẩn 2 */}
          <div
            className={`rounded-lg border p-3 ${
              condVideos ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5 text-slate-500" /> Video bài giảng
              </span>
              {condVideos ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600" />
              )}
            </div>
            <p className="mt-2 text-base font-bold text-slate-800">
              {videoLessons.length} <span className="text-xs font-normal text-slate-500">/ tối thiểu 5</span>
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {condVideos ? "✅ Đạt số lượng video" : "⚠️ Thiếu video bài học"}
            </p>
          </div>

          {/* Tiêu chuẩn 3 */}
          <div
            className={`rounded-lg border p-3 ${
              condQuizzes ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-slate-500" /> Quiz sau video
              </span>
              {condQuizzes ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600" />
              )}
            </div>
            <p className="mt-2 text-base font-bold text-slate-800">
              {lessonQuizCount} <span className="text-xs font-normal text-slate-500">/ {videoLessons.length} video</span>
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {condQuizzes ? "✅ Mỗi video có 1 quiz" : "⚠️ Có video chưa gắn quiz"}
            </p>
          </div>

          {/* Tiêu chuẩn 4 */}
          <div
            className={`rounded-lg border p-3 ${
              condFinalExam ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-slate-500" /> Test cấp chứng chỉ
              </span>
              {condFinalExam ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600" />
              )}
            </div>
            <p className="mt-2 text-base font-bold text-slate-800">
              {condFinalExam ? `${finalQuestionCount} câu hỏi` : "Chưa có"}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {condFinalExam ? "✅ Sẵn sàng cấp chứng nhận" : "⚠️ Cần bài thi cuối khóa"}
            </p>
          </div>
        </div>
      </div>

      {/* Kiểm duyệt khóa học (toàn bộ) */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(course.status === "draft" || course.status === "pending" || course.status === "hidden") && (
          <form action={moderateCourseAction}>
            <input type="hidden" name="courseId" value={String(course.id)} />
            <input type="hidden" name="status" value="published" />
            <input type="hidden" name="returnTo" value={`/admin/courses/${course.id}`} />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors cursor-pointer"
            >
              {course.status === "pending" ? "Duyệt xuất bản khóa học" : course.status === "draft" ? "Xuất bản ngay lên Khám phá" : "Hiển thị lại"}
            </button>
          </form>
        )}
        {course.status === "pending" && (
          <ReasonAction
            action={moderateCourseAction}
            label="Từ chối khóa học"
            submitLabel="Xác nhận từ chối"
            placeholder="Lý do từ chối (giảng viên sẽ thấy feedback này)…"
            hidden={{ courseId: String(course.id), status: "rejected", returnTo: `/admin/courses/${course.id}` }}
          />
        )}
        {course.status === "published" && (
          <ReasonAction
            action={moderateCourseAction}
            label="Ẩn khóa học"
            submitLabel="Xác nhận ẩn"
            placeholder="Lý do ẩn (giảng viên sẽ thấy feedback này)…"
            hidden={{ courseId: String(course.id), status: "hidden", returnTo: `/admin/courses/${course.id}` }}
          />
        )}
        <ConfirmAction
          action={adminDeleteCourseAction}
          label="Xóa khóa học"
          message={`Xóa vĩnh viễn khóa học "${course.title}"? Dữ liệu liên quan sẽ bị xóa và không thể hoàn tác.`}
          submitLabel="Xác nhận xóa khóa học"
          variant="button"
          hidden={{ courseId: String(course.id), returnTo: "/admin/courses" }}
        />
      </div>
      <FlashMessage searchParams={searchParams} />

      <section className="mt-6 rounded-lg border border-border p-5">
        <h2 className="font-semibold">Chi phí khóa học</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Quản trị viên có thể điều chỉnh giá khóa học trực tiếp, ghi đè giá do giảng viên đặt.
        </p>
        <form action={adminUpdatePrice} className="mt-3 flex items-center gap-3">
          <input type="hidden" name="courseId" value={String(course.id)} />
          <input
            name="price"
            type="number"
            min="0"
            step="1000"
            defaultValue={Number(course.price)}
            className="w-48 rounded border bg-background px-3 py-2"
          />
          <span className="text-sm text-muted-foreground">VNĐ</span>
          <button className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground">Lưu giá</button>
        </form>
      </section>

      <section className="mt-6 rounded-lg border border-border p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Nội dung khóa học &amp; Kiểm duyệt bài học</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Xem chi tiết các chương, bài học, video và duyệt trực tiếp các bài học được cập nhật.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-6">
          {chapters.map((chapter: any) => (
            <div key={chapter.id} className="rounded-lg border border-border/70 p-4 bg-muted/20">
              <p className="text-base font-semibold text-foreground">{chapter.title}</p>
              <div className="mt-3 space-y-3">
                {chapter.lessons.map((lesson: any) => {
                  const isHighlighted = highlightLesson === lesson.id;
                  const isUpdated =
                    lesson.is_updated ||
                    lesson.video_review === "pending" ||
                    lesson.content_review === "pending" ||
                    isHighlighted;

                  return (
                    <div
                      key={lesson.id}
                      id={`lesson-${lesson.id}`}
                      className={`rounded-lg border p-4 transition-all ${
                        isHighlighted
                          ? "border-amber-400 bg-amber-50/50 shadow-md dark:border-amber-600 dark:bg-amber-950/20"
                          : "border-border bg-background"
                      }`}
                    >
                      {/* Tag nhỏ Updated phía trên nếu bài học có update hoặc được highlight */}
                      {isUpdated && (
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            <Sparkles className="h-3 w-3" />
                            Updated
                          </span>
                          <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                            {lesson.video_review === "pending"
                              ? "Video bài giảng mới chờ duyệt"
                              : lesson.content_review === "pending"
                              ? "Nội dung bài học có thay đổi chờ duyệt"
                              : "Phần vừa được cập nhật"}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-medium text-sm sm:text-base">{lesson.title}</h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Thời lượng: {Math.round(Number(lesson.duration_seconds || 0) / 60)} phút ·{" "}
                            {lesson.is_free ? "Học thử miễn phí" : "Trả phí"}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <form action={adminToggleLessonFree}>
                            <input type="hidden" name="courseId" value={String(course.id)} />
                            <input type="hidden" name="lessonId" value={lesson.id} />
                            <input type="hidden" name="nextValue" value={String(!lesson.is_free)} />
                            <button
                              type="submit"
                              className={
                                lesson.is_free
                                  ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 hover:opacity-90"
                                  : "rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80"
                              }
                            >
                              {lesson.is_free ? "Miễn phí" : "Trả phí"}
                            </button>
                          </form>
                        </div>
                      </div>

                      {/* Nếu là bài học có video chờ duyệt hoặc được highlight xem video */}
                      {(lesson.video_review === "pending" || (isHighlighted && highlightedVideoUrl)) && (
                        <div className="mt-4 pt-3 border-t border-border/60">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">
                            <Video className="h-4 w-4" />
                            Xem trước video cần duyệt:
                          </div>

                          <div className="overflow-hidden rounded-md border border-border bg-black max-w-xl">
                            {highlightedVideoUrl && getYouTubeEmbedUrl(highlightedVideoUrl) ? (
                              <iframe
                                title={`Xem trước ${lesson.title}`}
                                src={getYouTubeEmbedUrl(highlightedVideoUrl) ?? undefined}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="aspect-video w-full"
                              />
                            ) : highlightedVideoUrl ? (
                              <video
                                controls
                                preload="metadata"
                                src={highlightedVideoUrl}
                                className="max-h-[280px] w-full"
                              />
                            ) : lesson.video_url ? (
                              <p className="p-4 text-xs text-center text-muted-foreground">
                                Video URL: {lesson.video_url}
                              </p>
                            ) : null}
                          </div>

                          {/* Nút duyệt và từ chối video */}
                          {lesson.video_review === "pending" && (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <form action={reviewVideoAction}>
                                <input type="hidden" name="lessonId" value={lesson.id} />
                                <input type="hidden" name="approve" value="true" />
                                <input type="hidden" name="returnTo" value={here} />
                                <button className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
                                  Duyệt video này
                                </button>
                              </form>
                              <ReasonAction
                                action={reviewVideoAction}
                                label="Từ chối video"
                                submitLabel="Xác nhận từ chối video"
                                placeholder="Lý do từ chối video (giảng viên sẽ nhận được feedback này)…"
                                hidden={{ lessonId: lesson.id, approve: "false", returnTo: here }}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Nếu là bài học có nội dung chờ duyệt */}
                      {lesson.content_review === "pending" && (
                        <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap items-center gap-2">
                          <form action={reviewLessonContentAction}>
                            <input type="hidden" name="lessonId" value={lesson.id} />
                            <input type="hidden" name="approve" value="true" />
                            <input type="hidden" name="returnTo" value={here} />
                            <button className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
                              Duyệt nội dung bài này
                            </button>
                          </form>
                          <ReasonAction
                            action={reviewLessonContentAction}
                            label="Từ chối cập nhật"
                            submitLabel="Xác nhận từ chối"
                            placeholder="Lý do từ chối nội dung bài học (giảng viên sẽ nhận feedback này)…"
                            hidden={{ lessonId: lesson.id, approve: "false", returnTo: here }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}