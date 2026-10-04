import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES } from "@/lib/utils";
import { moderateCourseAction, adminDeleteCourseAction } from "@/features/admin/actions";
import { FlashMessage, ReasonAction, type SearchParams } from "@/features/admin/ui";

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

  const { data: course } = await supabase
    .from("courses")
    .select(
      "id, title, price, status, profiles!courses_instructor_id_fkey(full_name), chapters(id, title, position, lessons(id, title, is_free, position))",
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

  return (
    <main className="mx-auto max-w-4xl p-8">
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

      {/* Kiểm duyệt ngay sau khi xem nội dung (lý do bắt buộc khi từ chối/ẩn). */}
      <div className="mt-4 flex flex-wrap items-start gap-2">
        {(course.status === "draft" || course.status === "pending" || course.status === "hidden") && (
          <form action={moderateCourseAction}>
            <input type="hidden" name="courseId" value={String(course.id)} />
            <input type="hidden" name="status" value="published" />
            <input type="hidden" name="returnTo" value={`/admin/courses/${course.id}`} />
            <button className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground font-semibold">
              {course.status === "pending" ? "Duyệt xuất bản" : course.status === "draft" ? "Xuất bản ngay lên Khám phá" : "Hiển thị lại"}
            </button>
          </form>
        )}
        {course.status === "pending" && (
          <ReasonAction
            action={moderateCourseAction}
            label="Từ chối"
            submitLabel="Xác nhận từ chối"
            placeholder="Lý do từ chối (giảng viên sẽ thấy)…"
            hidden={{ courseId: String(course.id), status: "rejected", returnTo: `/admin/courses/${course.id}` }}
          />
        )}
        {course.status === "published" && (
          <ReasonAction
            action={moderateCourseAction}
            label="Ẩn khóa học"
            submitLabel="Xác nhận ẩn"
            placeholder="Lý do ẩn (giảng viên sẽ thấy)…"
            hidden={{ courseId: String(course.id), status: "hidden", returnTo: `/admin/courses/${course.id}` }}
          />
        )}
        <form action={adminDeleteCourseAction}>
          <input type="hidden" name="courseId" value={String(course.id)} />
          <input type="hidden" name="returnTo" value="/admin/courses" />
          <button
            type="submit"
            className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive font-semibold hover:bg-destructive/20 transition-colors cursor-pointer"
          >
            Xóa khóa học
          </button>
        </form>
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
        <h2 className="font-semibold">Học thử miễn phí theo bài</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Quyết định bài học nào cho xem miễn phí, ghi đè cài đặt của giảng viên.
        </p>

        <div className="mt-4 space-y-4">
          {chapters.map((chapter: any) => (
            <div key={chapter.id}>
              <p className="text-sm font-medium text-muted-foreground">{chapter.title}</p>
              <ul className="mt-2 space-y-2">
                {chapter.lessons.map((lesson: any) => (
                  <li
                    key={lesson.id}
                    className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"
                  >
                    <span>{lesson.title}</span>
                    <form action={adminToggleLessonFree}>
                      <input type="hidden" name="courseId" value={String(course.id)} />
                      <input type="hidden" name="lessonId" value={lesson.id} />
                      <input type="hidden" name="nextValue" value={String(!lesson.is_free)} />
                      <button
                        type="submit"
                        className={
                          lesson.is_free
                            ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                        }
                      >
                        {lesson.is_free ? "Miễn phí — bấm để đổi thành Trả phí" : "Trả phí — bấm để đổi thành Miễn phí"}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}