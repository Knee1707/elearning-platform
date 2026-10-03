import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  GraduationCap,
  Search,
  Users,
  Wallet,
} from "lucide-react";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES } from "@/lib/utils";
import {
  ADMIN_PAGE_SIZE,
  getStudentOverallStats,
  getStudentsManagement,
  type StudentCourseRoadmapItem,
} from "@/features/admin/queries";
import {
  PageHeader,
  Pagination,
  buildHref,
  dateTime,
  money,
  param,
  type SearchParams,
} from "@/features/admin/ui";

const dt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" });

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole(ADMIN_ROLES);

  const keyword = param(searchParams, "q") ?? "";
  const statusParam = param(searchParams, "status");
  const banned =
    statusParam === "banned" ? true : statusParam === "active" ? false : undefined;
  const page = Math.max(1, Number(param(searchParams, "page")) || 1);

  const [{ students, total }, overall] = await Promise.all([
    getStudentsManagement({ keyword, banned, page, pageSize: ADMIN_PAGE_SIZE }),
    getStudentOverallStats(),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const filters = { q: keyword, status: statusParam };

  return (
    <main className="mx-auto max-w-6xl p-8">
      <PageHeader
        title="Quản lý học viên"
        description="Theo dõi danh sách học viên, số lượng khóa học đã đăng ký, tổng số tiền đã trả và lộ trình tiến độ học tập chi tiết."
      />

      {/* Thẻ thống kê tổng quan */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-blue-100 p-2.5 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Tổng học viên</p>
              <p className="text-2xl font-bold">{overall.totalStudents}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-violet-100 p-2.5 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Lượt đăng ký khóa</p>
              <p className="text-2xl font-bold">{overall.totalEnrollments}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-emerald-100 p-2.5 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Tổng học phí đã thu</p>
              <p className="text-2xl font-bold">{money.format(overall.totalRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-amber-100 p-2.5 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Hiển thị trên trang</p>
              <p className="text-2xl font-bold">{students.length} / {total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <form
        key={`${keyword}|${statusParam ?? ""}`}
        className="mt-6 flex flex-wrap items-end gap-3"
        role="search"
      >
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Họ tên học viên</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              defaultValue={keyword}
              placeholder="Tìm theo tên học viên…"
              className="w-64 rounded border border-border bg-background py-2 pl-9 pr-3 text-sm"
            />
          </span>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Trạng thái</span>
          <select
            name="status"
            defaultValue={statusParam ?? ""}
            className="rounded border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="banned">Đã khóa</option>
          </select>
        </label>

        <button
          type="submit"
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Lọc
        </button>

        {(keyword || statusParam) && (
          <a
            href="/admin/students"
            className="px-2 py-2 text-sm underline text-muted-foreground hover:text-foreground"
          >
            Bỏ lọc
          </a>
        )}
      </form>

      {/* Bảng danh sách học viên */}
      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
            <tr>
              <th className="p-3.5">Học viên</th>
              <th className="p-3.5">Trạng thái</th>
              <th className="p-3.5">Số khóa học</th>
              <th className="p-3.5">Tổng tiền đã trả</th>
              <th className="p-3.5">Lộ trình học tập</th>
              <th className="p-3.5 text-right">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.length ? (
              students.map((student) => {
                const initials = student.fullName
                  .split(" ")
                  .filter(Boolean)
                  .map((w) => w[0])
                  .slice(-2)
                  .join("")
                  .toUpperCase() || "HV";

                // Tính % tiến độ tổng thể của toàn bộ các khóa học
                const totalProgress =
                  student.roadmap.length > 0
                    ? Math.round(
                        student.roadmap.reduce((acc, r) => acc + r.progressPercent, 0) /
                          student.roadmap.length,
                      )
                    : 0;

                return (
                  <tr key={student.id} className="align-top hover:bg-muted/20">
                    {/* Thông tin học viên */}
                    <td className="p-3.5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials}
                        </div>
                        <div>
                          <Link
                            href={`/admin/users/${student.id}`}
                            className="font-medium text-foreground hover:underline"
                          >
                            {student.fullName}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            Tham gia: {dt.format(new Date(student.createdAt))}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Trạng thái */}
                    <td className="p-3.5">
                      {student.isBanned ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                          Đã khóa
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          Hoạt động
                        </span>
                      )}
                    </td>

                    {/* Số khóa học đăng ký */}
                    <td className="p-3.5">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-foreground">
                          {student.enrolledCount} khóa học
                        </span>
                        {student.enrolledCount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {student.completedCoursesCount > 0 && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                {student.completedCoursesCount} hoàn thành
                              </span>
                            )}
                            {student.completedCoursesCount > 0 &&
                              student.inProgressCoursesCount > 0 &&
                              " · "}
                            {student.inProgressCoursesCount > 0 && (
                              <span className="text-blue-600 dark:text-blue-400 font-medium">
                                {student.inProgressCoursesCount} đang học
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Số tiền đã trả cho tổng các khóa học */}
                    <td className="p-3.5">
                      <div>
                        <span className="font-semibold text-foreground">
                          {money.format(student.totalSpent)}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {student.totalSpent > 0 ? "Đã thanh toán" : "Khóa học miễn phí"}
                        </p>
                      </div>
                    </td>

                    {/* Lộ trình học của mỗi học viên */}
                    <td className="p-3.5 min-w-[280px]">
                      {student.roadmap.length === 0 ? (
                        <span className="inline-block rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                          Chưa đăng ký khóa nào
                        </span>
                      ) : (
                        <div className="space-y-2">
                          {/* Thanh tiến độ trung bình */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground font-medium">
                                Tiến độ trung bình
                              </span>
                              <span className="font-bold text-foreground">
                                {totalProgress}%
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  totalProgress === 100
                                    ? "bg-emerald-500"
                                    : "bg-primary"
                                }`}
                                style={{ width: `${totalProgress}%` }}
                              />
                            </div>
                          </div>

                          {/* Chi tiết từng khóa học trong lộ trình (Collapsible) */}
                          <details className="group">
                            <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-primary hover:underline [&::-webkit-details-marker]:hidden">
                              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-180" />
                              <span>Xem lộ trình {student.roadmap.length} khóa học</span>
                            </summary>

                            <div className="mt-2.5 space-y-2 rounded-lg border border-border bg-background p-2.5 shadow-sm">
                              {student.roadmap.map((item) => (
                                <RoadmapCourseItem key={item.enrollmentId} item={item} />
                              ))}
                            </div>
                          </details>
                        </div>
                      )}
                    </td>

                    {/* Thao tác xem chi tiết */}
                    <td className="p-3.5 text-right">
                      <Link
                        href={`/admin/users/${student.id}`}
                        className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                      >
                        Hồ sơ <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Không tìm thấy học viên nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <Pagination
          page={page}
          pageCount={pageCount}
          total={total}
          hrefFor={(p) => buildHref("/admin/students", { ...filters, page: p })}
        />
      </div>
    </main>
  );
}

function RoadmapCourseItem({ item }: { item: StudentCourseRoadmapItem }) {
  const isCompleted = item.progressPercent === 100;
  const isStarted = item.progressPercent > 0;

  return (
    <div className="border-b border-border/60 pb-2 text-xs last:border-0 last:pb-0">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/admin/courses/${item.courseId}`}
          className="font-medium text-foreground hover:underline line-clamp-1"
          title={item.courseTitle}
        >
          {item.courseTitle}
        </Link>
        {isCompleted ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" /> Hoàn thành
          </span>
        ) : isStarted ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <Clock className="h-3 w-3" /> Đang học
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Chưa bắt đầu
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full ${
              isCompleted ? "bg-emerald-500" : isStarted ? "bg-primary" : "bg-muted"
            }`}
            style={{ width: `${item.progressPercent}%` }}
          />
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">
          {item.completedLessons}/{item.totalLessons} bài ({item.progressPercent}%)
        </span>
      </div>

      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Ghi danh: {dt.format(new Date(item.purchasedAt))}</span>
        {item.status !== "active" && (
          <span className="font-semibold text-amber-600">Trạng thái: {item.status}</span>
        )}
      </div>
    </div>
  );
}
