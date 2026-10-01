import { CheckCircle2, AlertTriangle, Users, Clock } from "lucide-react";
import { getInstructorClassData } from "@/features/course/queries";
import { reviewEnrollAction, sendFeedbackAction } from "@/features/instructor/actions";

const dt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" });

export default async function StudioStudentsPage({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string };
}) {
  const { pending, students } = await getInstructorClassData();

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-bold">Lớp &amp; Học viên</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Duyệt yêu cầu vào lớp (khóa miễn phí) và theo dõi điểm danh, điểm thi của học viên.
      </p>

      {searchParams.ok && (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> {searchParams.ok}
        </p>
      )}
      {searchParams.error && (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" /> {searchParams.error}
        </p>
      )}

      {/* Yêu cầu chờ duyệt */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 font-semibold">
          <Clock className="h-4 w-4 text-amber-500" /> Yêu cầu vào lớp chờ duyệt
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{pending.length}</span>
        </h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left">
              <tr>
                <th className="p-3">Học viên</th>
                <th className="p-3">Khóa học</th>
                <th className="p-3">Ngày xin</th>
                <th className="p-3">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pending.length ? (
                pending.map((m) => (
                  <tr key={m.enrollmentId} className="border-b last:border-0">
                    <td className="p-3 font-medium">{m.studentName}</td>
                    <td className="p-3">{m.courseTitle}</td>
                    <td className="p-3">{dt.format(new Date(m.at))}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <form action={reviewEnrollAction}>
                          <input type="hidden" name="enrollmentId" value={m.enrollmentId} />
                          <input type="hidden" name="approve" value="true" />
                          <button className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700">Duyệt</button>
                        </form>
                        <form action={reviewEnrollAction}>
                          <input type="hidden" name="enrollmentId" value={m.enrollmentId} />
                          <input type="hidden" name="approve" value="false" />
                          <button className="rounded border px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Từ chối</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-muted-foreground">Không có yêu cầu nào đang chờ.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Học viên đang học */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 font-semibold">
          <Users className="h-4 w-4 text-emerald-600" /> Học viên đang học
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">{students.length}</span>
        </h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left">
              <tr>
                <th className="p-3">Học viên</th>
                <th className="p-3">Khóa học</th>
                <th className="p-3">Điểm danh</th>
                <th className="p-3">Điểm thi cao nhất</th>
                <th className="p-3">Vào lớp từ</th>
                <th className="p-3">Nhận xét</th>
              </tr>
            </thead>
            <tbody>
              {students.length ? (
                students.map((m) => (
                  <tr key={m.enrollmentId} className="border-b align-top last:border-0">
                    <td className="p-3 font-medium">{m.studentName}</td>
                    <td className="p-3">{m.courseTitle}</td>
                    <td className="p-3">{m.attendance} buổi</td>
                    <td className="p-3">{m.bestScore === null ? "—" : `${m.bestScore}/100`}</td>
                    <td className="p-3">{dt.format(new Date(m.at))}</td>
                    <td className="p-3">
                      <details>
                        <summary className="cursor-pointer list-none text-xs font-semibold text-emerald-700 underline [&::-webkit-details-marker]:hidden">
                          Gửi nhận xét
                        </summary>
                        <form action={sendFeedbackAction} className="mt-2 w-64 space-y-2 rounded-lg border border-border bg-white p-3 shadow-sm">
                          <input type="hidden" name="courseId" value={m.courseId} />
                          <input type="hidden" name="studentId" value={m.userId} />
                          <textarea
                            name="content"
                            required
                            minLength={3}
                            maxLength={500}
                            rows={3}
                            placeholder="Nhận xét quá trình học của học viên…"
                            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                          />
                          <button className="w-full rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                            Gửi cho học viên
                          </button>
                        </form>
                      </details>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground">Chưa có học viên nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
