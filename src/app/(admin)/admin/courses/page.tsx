import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES } from "@/lib/utils";
import type { CourseStatus } from "@/types/domain";
import { getUnifiedCoursesForModeration } from "@/features/admin/queries";
import { moderateCourseAction, reviewVideoAction, reviewLessonContentAction } from "@/features/admin/actions";

import { getCoursesForModeration } from "@/features/admin/queries";
import { moderateCourseAction, adminDeleteCourseAction } from "@/features/admin/actions";
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
  const courses = await getUnifiedCoursesForModeration(status, keyword);
  const here = buildHref("/admin/courses", { status, q: keyword });

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Duyệt khóa học"
          description="Xét duyệt khóa học mới, chỉnh sửa video hoặc cập nhật nội dung bài giảng. Khi từ chối bắt buộc ghi rõ lý do feedback gửi về cho giảng viên."
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
          courses.map((course) => {
            // Xác định URL khi click vào card
            const targetUrl =
              course.requestType === "update_video"
                ? `/admin/courses/${course.courseId}?highlightLesson=${course.targetLessonId}&type=video`
                : course.requestType === "update_content"
                ? `/admin/courses/${course.courseId}?highlightLesson=${course.targetLessonId}&type=content`
                : `/admin/courses/${course.courseId}`;

            return (
              <article
                key={course.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border p-4 transition-all hover:border-primary/50 hover:bg-muted/10"
              >
                {/* Khu vực thông tin card - clickable */}
                <Link href={targetUrl} className="group min-w-0 flex-1 cursor-pointer block">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-base group-hover:text-primary transition-colors">
                      {course.courseTitle}
                    </h2>
                    {status === "pending" && (
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border ${
                          course.requestType === "create_course"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                            : course.requestType === "update_video"
                            ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                            : "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                        }`}
                      >
                        {course.requestLabel}
                      </span>
                    )}
                  </div>

                  {status === "pending" && course.targetLessonTitle && (
                    <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                      Nội dung chờ duyệt: <span className="underline">{course.targetLessonTitle}</span>
                    </p>
                  )}

                  <p className="mt-1 text-sm text-muted-foreground">
                    {course.instructorName ?? "Không rõ giảng viên"} · {course.categoryName ?? "Chưa phân loại"} · {money.format(course.price)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {STATUS_LABEL[course.status]} · cập nhật {dateTime.format(new Date(course.updatedAt))}
                  </p>
                  <p className="mt-1.5 text-xs text-primary font-medium group-hover:underline">
                    👉 Bấm để xem chi tiết &amp; nội dung kiểm duyệt
                  </p>
                </Link>

                {/* Hai nút hành động: Duyệt và Từ chối */}
                <div className="flex flex-wrap items-start gap-2 shrink-0">
                  {status === "pending" && (
                    <>
                      {course.requestType === "create_course" && (
                        <>
                          <form action={moderateCourseAction}>
                            <input type="hidden" name="courseId" value={course.courseId} />
                            <input type="hidden" name="status" value="published" />
                            <input type="hidden" name="returnTo" value={here} />
                            <button className="rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                              Duyệt
                            </button>
                          </form>
                          <ReasonAction
                            action={moderateCourseAction}
                            label="Từ chối"
                            submitLabel="Xác nhận từ chối"
                            placeholder="Lý do từ chối (giảng viên sẽ thấy feedback này)…"
                            hidden={{ courseId: course.courseId, status: "rejected", returnTo: here }}
                          />
                        </>
                      )}

                      {course.requestType === "update_video" && (
                        <>
                          <form action={reviewVideoAction}>
                            <input type="hidden" name="lessonId" value={course.targetLessonId} />
                            <input type="hidden" name="approve" value="true" />
                            <input type="hidden" name="returnTo" value={here} />
                            <button className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                              Duyệt video
                            </button>
                          </form>
                          <ReasonAction
                            action={reviewVideoAction}
                            label="Từ chối"
                            submitLabel="Xác nhận từ chối"
                            placeholder="Lý do từ chối video (giảng viên sẽ thấy feedback này)…"
                            hidden={{ lessonId: course.targetLessonId ?? "", approve: "false", returnTo: here }}
                          />
                        </>
                      )}

                      {course.requestType === "update_content" && (
                        <>
                          <form action={reviewLessonContentAction}>
                            <input type="hidden" name="lessonId" value={course.targetLessonId} />
                            <input type="hidden" name="approve" value="true" />
                            <input type="hidden" name="returnTo" value={here} />
                            <button className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                              Duyệt nội dung
                            </button>
                          </form>
                          <ReasonAction
                            action={reviewLessonContentAction}
                            label="Từ chối"
                            submitLabel="Xác nhận từ chối"
                            placeholder="Lý do từ chối cập nhật (giảng viên sẽ thấy feedback này)…"
                            hidden={{ lessonId: course.targetLessonId ?? "", approve: "false", returnTo: here }}
                          />
                        </>
                      )}
                    </>
                  )}

                  {status !== "pending" && (
                    <>
                      {course.status === "hidden" && (
                        <form action={moderateCourseAction}>
                          <input type="hidden" name="courseId" value={course.courseId} />
                          <input type="hidden" name="status" value="published" />
                          <input type="hidden" name="returnTo" value={here} />
                          <button className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground font-medium">
                            Hiển thị lại
                          </button>
                        </form>
                      )}
                      {course.status === "published" && (
                        <ReasonAction
                          action={moderateCourseAction}
                          label="Ẩn khóa"
                          submitLabel="Xác nhận ẩn"
                          placeholder="Lý do ẩn (giảng viên sẽ thấy feedback này)…"
                          hidden={{ courseId: course.courseId, status: "hidden", returnTo: here }}
                        />
                      )}
                    </>
                  )}
                </div>
              </article>
            );
          })

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
                <form action={adminDeleteCourseAction}>
                  <input type="hidden" name="courseId" value={course.id} />
                  <input type="hidden" name="returnTo" value={here} />
                  <button
                    type="submit"
                    className="rounded-lg border border-red-200 bg-red-50/80 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
                  >
                    Xóa
                  </button>
                </form>
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
