import { Award, CheckCircle2, XCircle } from "lucide-react";
import { requireRole } from "@/lib/queries/auth";
import { reviewInstructorCertificateAction } from "@/features/instructor/actions";
import { getInstructorCertificateCourses, getInstructorCertificateRequests } from "@/features/instructor/certificateQueries";

const dateTime = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" });

export default async function InstructorCertificatesPage({ searchParams }: { searchParams: { ok?: string; error?: string; courseId?: string } }) {
  await requireRole(["instructor"]);
  const courseId = searchParams.courseId;
  const [courses, certificates] = await Promise.all([
    getInstructorCertificateCourses(),
    getInstructorCertificateRequests(courseId),
  ]);
  const pending = certificates.filter((item) => item.status === "pending");
  const approved = certificates.filter((item) => item.status === "approved");
  const rejected = certificates.filter((item) => item.status === "rejected");
  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold"><Award className="h-6 w-6 text-amber-500" /> Yêu cầu chứng nhận</h1>
      <p className="mt-1 text-sm text-muted-foreground">Theo dõi học viên đã được cấp, đang chờ hoặc bị từ chối chứng nhận.</p>
      {searchParams.ok && <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{searchParams.ok}</p>}
      {searchParams.error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</p>}
      <section className="mt-6 rounded-lg border border-border bg-white p-4">
        <h2 className="font-semibold">Theo khóa học</h2>
        <form className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-sm"><span className="mb-1 block text-muted-foreground">Chọn khóa học</span><select name="courseId" defaultValue={courseId ?? ""} className="min-w-72 rounded border border-border bg-background px-3 py-2"><option value="">Tất cả khóa học</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
          <button className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Lọc</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">Chờ duyệt: {pending.length}</span><span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Đã cấp: {approved.length}</span><span className="rounded-full bg-red-100 px-3 py-1 text-red-700">Từ chối: {rejected.length}</span></div>
      </section>
      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-white">
        <table className="w-full text-sm"><thead className="border-b bg-muted/40 text-left"><tr><th className="p-3">Học viên</th><th className="p-3">Khóa học</th><th className="p-3">Ngày yêu cầu</th><th className="p-3">Trạng thái</th><th className="p-3">Thao tác</th></tr></thead>
          <tbody>{certificates.length ? certificates.map((request) => <tr key={request.id} className="border-b last:border-0"><td className="p-3 font-medium">{request.studentName ?? "—"}</td><td className="p-3">{request.courseTitle ?? "—"}</td><td className="p-3">{dateTime.format(new Date(request.requestedAt))}</td><td className="p-3">{request.status === "pending" ? <span className="text-amber-700">Chờ duyệt</span> : request.status === "approved" ? <span className="text-emerald-700">Đã cấp</span> : <span className="text-red-700">Từ chối</span>}</td><td className="p-3">{request.status === "pending" && <div className="flex gap-2"><form action={reviewInstructorCertificateAction}><input type="hidden" name="certificateId" value={request.id} /><input type="hidden" name="approve" value="true" /><button className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"><CheckCircle2 className="h-3.5 w-3.5" /> Duyệt</button></form><form action={reviewInstructorCertificateAction}><input type="hidden" name="certificateId" value={request.id} /><input type="hidden" name="approve" value="false" /><button className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-xs font-semibold text-red-600"><XCircle className="h-3.5 w-3.5" /> Từ chối</button></form></div>}</td></tr>) : <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Chưa có dữ liệu chứng nhận.</td></tr>}</tbody>
        </table>
      </div>
    </main>
  );
}
