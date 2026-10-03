import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES } from "@/lib/utils";
import { updateCourse, submitForReview, adminPublishCourseDirectly } from "@/features/course/courseActions";
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

// Quản trị chỉnh sửa đầy đủ khóa học (thông tin + chương/bài). RLS cho phép
// admin/super_admin sửa mọi khóa (courses_update_owner: ... or fn_is_admin()).
export default async function AdminEditCoursePage({ params }: PageProps) {
  await requireRole(ADMIN_ROLES);
  const supabase = createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, description, price, status, profiles!courses_instructor_id_fkey(full_name), chapters(id, title, position, lessons(id, title, video_url, video_review, video_review_reason, duration_seconds, is_free, position, attachments(id, name, file_url)))")
    .eq("id", params.courseId)
    .single();
  if (!course) notFound();

  const chapters = (course.chapters ?? [])
    .map((c: any) => ({ ...c, lessons: [...(c.lessons ?? [])].sort((a: any, b: any) => a.position - b.position) }))
    .sort((a: any, b: any) => a.position - b.position);

  const status = String(course.status);
  const canSubmit = status === "draft" || status === "rejected";
  const instructorName = (course as any).profiles?.full_name ?? "Không rõ";

  return (
    <main className="mx-auto max-w-4xl p-8">
      <Link href="/admin/courses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Danh sách khóa học
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Chỉnh sửa khóa học</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Phụ trách: {instructorName}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLOR[status] ?? STATUS_COLOR.draft}`}>
          {STATUS_LABEL[status] ?? status}
        </span>
      </div>

      <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border p-4 bg-slate-50/50">
        {status !== "published" ? (
          <>
            <div>
              <p className="text-sm font-semibold text-slate-900">Phát hành khóa học</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Khóa học hiện đang ở trạng thái <b>{STATUS_LABEL[status] ?? status}</b>. Quản trị viên có thể xuất bản ngay để hiển thị lên phần Khám phá khóa học.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canSubmit && (
                <form action={submitForReview}>
                  <input type="hidden" name="courseId" value={String(course.id)} />
                  <button type="submit" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                    Gửi duyệt
                  </button>
                </form>
              )}
              <form action={adminPublishCourseDirectly}>
                <input type="hidden" name="courseId" value={String(course.id)} />
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all active:scale-95 cursor-pointer"
                >
                  Xuất bản ngay lên Khám phá
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Khóa học đã được xuất bản công khai và đang hiển thị trên trang chủ &amp; trang Khám phá khóa học.</span>
          </div>
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
          <input id="price" name="price" type="number" min="0" step="1000" defaultValue={Number(course.price)} className="mt-1 w-full rounded border bg-background px-3 py-2" />
        </div>
        <button className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground">Lưu thay đổi</button>
      </form>

      <ChapterManager courseId={String(course.id)} initialChapters={chapters} />
    </main>
  );
}
