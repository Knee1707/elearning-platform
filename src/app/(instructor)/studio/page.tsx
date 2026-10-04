import Link from "next/link";
import { BookOpen, CheckCircle2, Clock, Users, Star } from "lucide-react";
import { getMyCourses, getInstructorStats } from "@/features/course/queries";
import { Button } from "@/components/ui/button";

const STATUS_LABEL: Record<string, string> = {
  draft: "Nháp",
  pending: "Chờ duyệt",
  published: "Đã publish",
  rejected: "Bị từ chối",
  hidden: "Đã ẩn",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  hidden: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

// Route: /studio · Chủ: M4 · Danh sách khóa học của giảng viên đang đăng nhập.
export default async function StudioPage() {
  const [courses, stats] = await Promise.all([getMyCourses(), getInstructorStats()]);

  const cards = [
    { label: "Tổng khóa học", value: stats.totalCourses, icon: BookOpen },
    { label: "Đang bán", value: stats.publishedCourses, icon: CheckCircle2 },
    { label: "Chờ duyệt", value: stats.pendingCourses, icon: Clock },
    { label: "Học viên", value: stats.totalStudents, icon: Users },
    { label: "Đánh giá TB", value: stats.avgRating ? `★ ${stats.avgRating.toFixed(1)}` : "—", icon: Star },
  ];

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bảng điều khiển Giảng viên</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý nội dung, chương/bài, buổi live và doanh thu cho từng khóa.
          </p>
        </div>
        <Link href="/studio/new">
          <Button>+ Tạo khóa mới</Button>
        </Link>
      </div>

      {/* Thống kê nhanh */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-xl border border-border bg-white p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-4 w-4" />
                <span className="text-xs">{c.label}</span>
              </div>
              <p className="mt-1.5 text-2xl font-black text-slate-900">{c.value}</p>
            </div>
          );
        })}
      </div>

      <h2 className="mb-3 text-lg font-bold">Khóa học của tôi</h2>

      {courses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Bạn chưa có khóa học nào.</p>
          <Link href="/studio/new" className="mt-3 inline-block text-sm underline">
            Tạo khóa học đầu tiên
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {courses.map((course) => (
            <li key={course.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{course.title}</p>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    STATUS_COLOR[course.status] ?? STATUS_COLOR.draft
                  }`}
                >
                  {STATUS_LABEL[course.status] ?? course.status}
                </span>
                {(course.status === "rejected" || course.status === "hidden") && course.moderationNote && (
                  <p className="mt-2 max-w-xl rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                    <strong>Lý do từ quản trị viên:</strong> {course.moderationNote}
                    {course.status === "rejected" && " — chỉnh sửa rồi gửi duyệt lại."}
                  </p>
                )}
              </div>
              <Link href={`/studio/${course.id}`} className="text-sm underline">
                Chỉnh sửa
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
