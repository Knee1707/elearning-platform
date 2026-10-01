import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES } from "@/lib/utils";
import type { CourseStatus } from "@/types/domain";
import { getCoursesForModeration } from "@/features/admin/queries";
import { moderateCourseAction } from "@/features/admin/actions";
import { FilterTabs, FlashMessage, PageHeader, ReasonAction, buildHref, dateTime, money, param, type SearchParams } from "@/features/admin/ui";

const TABS: { value: CourseStatus | "all"; label: string }[] = [
  { value: "pending", label: "Chờ duyệt" },
  { value: "published", label: "Đang bán" },
  { value: "hidden", label: "Đã ẩn" },
  { value: "rejected", label: "Bị từ chối" },
  { value: "all", label: "Tất cả" },
];

const STATUS_LABEL: Record<CourseStatus, string> = {
  draft: "Nháp",
  pending: "Chờ duyệt",
  published: "Đang bán",
  rejected: "Bị từ chối",
  hidden: "Đã ẩn",
};

export default async function AdminCoursesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(ADMIN_ROLES);
  const requested = param(searchParams, "status");
  const status = TABS.find((t) => t.value === requested)?.value ?? "pending";
  const keyword = param(searchParams, "q") ?? "";
  const courses = await getCoursesForModeration(status, keyword);
  const here = buildHref("/admin/courses", { status, q: keyword });

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Khóa học"
          description="Tạo & chỉnh sửa khóa học; duyệt khóa chờ xuất bản, ẩn khóa vi phạm. Từ chối hoặc ẩn bắt buộc ghi lý do."
        />
        <Link
          href="/admin/courses/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Thêm khóa học
        </Link>
      </div>
      <FlashMessage searchParams={searchParams} />

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <FilterTabs label="Lọc theo trạng thái" tabs={TABS} active={status} hrefFor={(value) => buildHref("/admin/courses", { status: value, q: keyword })} />
        <form className="relative" role="search">
          <input type="hidden" name="status" value={status} />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input name="q" defaultValue={keyword} placeholder="Tìm theo tên khóa…" aria-label="Tìm khóa học" className="w-56 rounded border border-border bg-background py-2 pl-9 pr-3 text-sm" />
        </form>
      </div>

      <div className="mt-4 space-y-3">
        {courses.length ? (
          courses.map((course) => (
            <article key={course.id} className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border p-4">
              <div className="min-w-0">
                <h2 className="font-medium">{course.title}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {course.instructorName ?? "Không rõ giảng viên"} · {course.categoryName ?? "Chưa phân loại"} · {money.format(course.price)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {STATUS_LABEL[course.status]} · cập nhật {dateTime.format(new Date(course.updatedAt))}
                </p>
                <div className="mt-1 flex flex-wrap gap-3 text-xs">
                  <Link href={`/admin/courses/${course.id}/edit`} className="font-medium text-primary underline">
                    Chỉnh sửa (nội dung, chương/bài)
                  </Link>
                  <Link href={`/admin/courses/${course.id}`} className="text-muted-foreground underline">
                    Xem · chỉnh giá &amp; bài học thử
                  </Link>
                </div>
              </div>

              <div className="flex flex-wrap items-start gap-2">
                {(course.status === "pending" || course.status === "hidden") && (
                  <form action={moderateCourseAction}>
                    <input type="hidden" name="courseId" value={course.id} />
                    <input type="hidden" name="status" value="published" />
                    <input type="hidden" name="returnTo" value={here} />
                    <button className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">
                      {course.status === "pending" ? "Duyệt" : "Hiển thị lại"}
                    </button>
                  </form>
                )}
                {course.status === "pending" && (
                  <ReasonAction
                    action={moderateCourseAction}
                    label="Từ chối"
                    submitLabel="Xác nhận từ chối"
                    placeholder="Lý do từ chối (giảng viên sẽ thấy)…"
                    hidden={{ courseId: course.id, status: "rejected", returnTo: here }}
                  />
                )}
                {course.status === "published" && (
                  <ReasonAction
                    action={moderateCourseAction}
                    label="Ẩn khóa"
                    submitLabel="Xác nhận ẩn"
                    placeholder="Lý do ẩn (giảng viên sẽ thấy)…"
                    hidden={{ courseId: course.id, status: "hidden", returnTo: here }}
                  />
                )}
              </div>
            </article>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Không có khóa học nào{keyword ? ` khớp “${keyword}”` : ""}.</p>
        )}
      </div>
    </main>
  );
}
