import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES, isAdminRole } from "@/lib/utils";
import { updateCourse, submitForReview } from "@/features/course/courseActions";
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
    .select("id, instructor_id, title, description, price, status, chapters(id, title, position, lessons(id, title, video_url, duration_seconds, is_free, position, attachments(id, name, file_url)))")
    .eq("id", params.courseId)
    .single();
  if (!course || (course.instructor_id !== profile.id && !isAdminRole(profile.role))) notFound();

  const chapters = (course.chapters ?? [])
    .map((c) => ({ ...c, lessons: [...(c.lessons ?? [])].sort((a, b) => a.position - b.position) }))
    .sort((a, b) => a.position - b.position);

  const status = String(course.status);
  const canSubmit = status === "draft" || status === "rejected";

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Biên soạn khóa học</h1>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLOR[status] ?? STATUS_COLOR.draft}`}>
          {STATUS_LABEL[status] ?? status}
        </span>
      </div>

      <section className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border p-4">
        {canSubmit ? (
          <>
            <p className="text-sm text-muted-foreground">Khi sẵn sàng, gửi khóa học để quản trị viên xét duyệt.</p>
            <form action={submitForReview} className="ml-auto">
              <input type="hidden" name="courseId" value={String(course.id)} />
              <button type="submit" className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground">Gửi duyệt</button>
            </form>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {status === "pending" && "Khóa học đang chờ quản trị viên xét duyệt."}
            {status === "published" && "Khóa học đã publish, đang hiển thị công khai."}
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
        <button className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground">Lưu thay đổi</button>
      </form>

      <ChapterManager courseId={String(course.id)} initialChapters={chapters} />
    </main>
  );
}