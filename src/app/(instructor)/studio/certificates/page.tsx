import { Award } from "lucide-react";
import { requireRole } from "@/lib/queries/auth";
import { getInstructorCertificateCourses, getInstructorCertificateRequests } from "@/features/instructor/certificateQueries";

const dateTime = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" });

export default async function InstructorCertificatesPage({ searchParams }: { searchParams: { ok?: string; error?: string; courseId?: string; sortBy?: "name" | "time"; sortDir?: "asc" | "desc" } }) {
  await requireRole(["instructor"]);
  const courseId = searchParams.courseId;
  const sortBy = searchParams.sortBy === "name" ? "name" : "time";
  const sortDir = searchParams.sortDir === "asc" ? "asc" : "desc";
  const [courses, certificates] = await Promise.all([
    getInstructorCertificateCourses(),
    getInstructorCertificateRequests(courseId, sortBy, sortDir),
  ]);
  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold"><Award className="h-6 w-6 text-amber-500" /> Yêu cầu chứng nhận</h1>
      <p className="mt-1 text-sm text-muted-foreground">Theo dõi chứng chỉ được cấp tự động cho học viên theo từng khóa học.</p>
      {searchParams.ok && <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{searchParams.ok}</p>}
      {searchParams.error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</p>}
      <section className="mt-6 rounded-lg border border-border bg-white p-4">
        <h2 className="font-semibold">Theo khóa học</h2>
        <form className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-sm"><span className="mb-1 block text-muted-foreground">Chọn khóa học</span><select name="courseId" defaultValue={courseId ?? ""} className="min-w-72 rounded border border-border bg-background px-3 py-2"><option value="">Tất cả khóa học</option>{courses.map((course: { id: string; title: string }) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
          <label className="text-sm"><span className="mb-1 block text-muted-foreground">Sắp xếp theo</span><select name="sortBy" defaultValue={sortBy} className="rounded border border-border bg-background px-3 py-2"><option value="time">Thời gian cấp</option><option value="name">Tên học viên</option></select></label>
          <label className="text-sm"><span className="mb-1 block text-muted-foreground">Thứ tự</span><select name="sortDir" defaultValue={sortDir} className="rounded border border-border bg-background px-3 py-2"><option value="desc">Giảm dần</option><option value="asc">Tăng dần</option></select></label>
          <button className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Lọc</button>
        </form>
        <div className="mt-4 rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-700">Chứng chỉ được cấp ngay khi học viên đạt kỳ thi cuối khóa. Không còn bước giảng viên duyệt.</div>
      </section>
      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-white">
        <table className="w-full text-sm"><thead className="border-b bg-muted/40 text-left"><tr><th className="p-3">Học viên</th><th className="p-3">Khóa học</th><th className="p-3">Ngày cấp</th><th className="p-3">Trạng thái</th></tr></thead>
          <tbody>{certificates.length ? certificates.map((request) => <tr key={request.id} className="border-b last:border-0"><td className="p-3 font-medium">{request.studentName ?? "—"}</td><td className="p-3">{request.courseTitle ?? "—"}</td><td className="p-3">{dateTime.format(new Date(request.requestedAt))}</td><td className="p-3 text-emerald-700">Đã cấp tự động</td></tr>) : <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Chưa có chứng chỉ nào được cấp.</td></tr>}</tbody>
        </table>
      </div>
    </main>
  );
}
