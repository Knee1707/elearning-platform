import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES } from "@/lib/utils";
import { getPublishedCourseOptions } from "@/features/admin/queries";
import { getActivityLog } from "@/features/super-admin/queries";
import { broadcastAction } from "@/features/admin/actions";
import { FlashMessage, PageHeader, dateTime, type SearchParams } from "@/features/admin/ui";

const TARGET_LABEL: Record<string, string> = { student: "Học viên", instructor: "Giảng viên" };

export default async function AdminNotificationsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(ADMIN_ROLES);
  const [courses, history] = await Promise.all([
    getPublishedCourseOptions(),
    getActivityLog({ action: "broadcast_notification", pageSize: 15 }),
  ]);
  const courseTitle = new Map(courses.map((c) => [c.id, c.title]));

  return (
    <main className="mx-auto max-w-4xl p-8">
      <PageHeader
        title="Gửi thông báo"
        description="Gửi thông báo hệ thống tới chuông thông báo của người dùng. Tài khoản bị khóa không nhận; học viên đã hoàn tiền không tính là đang học."
      />
      <FlashMessage searchParams={searchParams} />

      <form action={broadcastAction} className="mt-6 space-y-4 rounded-lg border border-border p-5">
        <fieldset>
          <legend className="text-sm font-medium">Gửi tới</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {[
              { value: "all", label: "Tất cả người dùng" },
              { value: "student", label: "Tất cả học viên" },
              { value: "instructor", label: "Tất cả giảng viên" },
              { value: "course", label: "Học viên của một khóa học" },
            ].map((option, index) => (
              <label key={option.value} className="flex items-center gap-2 rounded border border-border px-3 py-2 text-sm has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-950/40">
                <input type="radio" name="target" value={option.value} defaultChecked={index === 0} />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block text-sm">
          <span className="font-medium">Khóa học</span> <span className="text-muted-foreground">(chỉ khi chọn “Học viên của một khóa học”)</span>
          <select name="courseId" defaultValue="" className="mt-1 w-full rounded border border-border bg-background px-3 py-2">
            <option value="">— Chọn khóa học —</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium">Tiêu đề</span>
          <input name="title" required maxLength={200} placeholder="VD: Bảo trì hệ thống tối nay 22:00" className="mt-1 w-full rounded border border-border bg-background px-3 py-2" />
        </label>

        <label className="block text-sm">
          <span className="font-medium">Nội dung</span> <span className="text-muted-foreground">(không bắt buộc)</span>
          <textarea name="body" rows={4} maxLength={2000} className="mt-1 w-full rounded border border-border bg-background px-3 py-2" />
        </label>

        <div className="flex justify-end">
          <button type="submit" className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground">Gửi thông báo</button>
        </div>
      </form>

      <section className="mt-8">
        <h2 className="font-semibold">Đã gửi gần đây</h2>
        {history.entries.length ? (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border text-sm">
            {history.entries.map((entry) => {
              const m = entry.metadata;
              const target = m.course_id
                ? `Khóa “${courseTitle.get(String(m.course_id)) ?? "đã ẩn"}”`
                : m.role
                ? TARGET_LABEL[String(m.role)] ?? String(m.role)
                : "Tất cả";
              return (
                <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
                  <span>
                    <span className="font-medium">{String(m.title ?? "")}</span>
                    <span className="text-muted-foreground"> · {target} · {String(m.recipients ?? 0)} người nhận</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {entry.actorName ?? "—"} · {dateTime.format(new Date(entry.createdAt))}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Chưa gửi thông báo nào.</p>
        )}
      </section>
    </main>
  );
}
