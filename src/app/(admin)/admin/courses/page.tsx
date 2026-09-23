import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/queries/auth";
import { moderateCourse } from "@/lib/queries/admin";

async function reviewCourse(formData: FormData) {
  "use server";
  await moderateCourse(
    String(formData.get("courseId")),
    String(formData.get("status")) as "published" | "rejected" | "hidden",
  );
  revalidatePath("/admin/courses");
  revalidatePath("/admin");
}

export default async function AdminCoursesPage() {
  await requireRole(["admin"]);
  const supabase = createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, status, price, profiles!courses_instructor_id_fkey(full_name)")
    .in("status", ["pending", "published"])
    .order("updated_at", { ascending: false });

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-bold">Duyệt khóa học</h1>
      <p className="mt-2 text-sm text-muted-foreground">Duyệt khóa chờ xuất bản hoặc ẩn khóa đã công khai.</p>

      <div className="mt-6 space-y-3">
        {courses?.length ? (
          courses.map((course) => (
            <article
              key={String(course.id)}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
            >
              <div>
                <h2 className="font-medium">{String(course.title)}</h2>
                <p className="text-sm text-muted-foreground">
                  Trạng thái: {String(course.status)} · {Number(course.price).toLocaleString("vi-VN")} ₫
                </p>
                <Link
                  href={`/admin/courses/${course.id}`}
                  className="mt-1 inline-block text-xs text-primary underline"
                >
                  Chỉnh sửa giá &amp; bài học miễn phí
                </Link>
              </div>

              <form action={reviewCourse} className="flex gap-2">
                <input type="hidden" name="courseId" value={String(course.id)} />
                {course.status === "pending" ? (
                  <>
                    <button
                      name="status"
                      value="published"
                      className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground"
                    >
                      Duyệt
                    </button>
                    <button name="status" value="rejected" className="rounded border px-3 py-2 text-sm">
                      Từ chối
                    </button>
                  </>
                ) : (
                  <button name="status" value="hidden" className="rounded border px-3 py-2 text-sm">
                    Ẩn
                  </button>
                )}
              </form>
            </article>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Không có khóa nào cần xử lý.</p>
        )}
      </div>
    </main>
  );
}