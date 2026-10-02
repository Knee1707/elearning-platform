import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES } from "@/lib/utils";
import { getPendingStudentDiscipline } from "@/features/admin/queries";
import { reviewStudentDisciplineAction } from "@/features/admin/actions";
import { FlashMessage, PageHeader, dateTime, type SearchParams } from "@/features/admin/ui";

const labels: Record<string, string> = { warning: "Cảnh cáo", suspend: "Đình chỉ học", expel: "Đuổi học" };

export default async function StudentDisciplinePage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(ADMIN_ROLES);
  const requests = await getPendingStudentDiscipline();
  return (
    <main className="mx-auto max-w-5xl p-8">
      <PageHeader title="Xử lý học viên" description="Phê duyệt đề xuất cảnh cáo, đình chỉ hoặc đuổi học do giảng viên gửi." />
      <FlashMessage searchParams={searchParams} />
      <section className="mt-6 overflow-x-auto rounded-lg border border-border bg-white">
        <table className="w-full text-sm"><thead className="border-b bg-muted/40 text-left"><tr><th className="p-3">Học viên</th><th className="p-3">Khóa học</th><th className="p-3">Hình thức</th><th className="p-3">Lý do</th><th className="p-3">Ngày gửi</th><th className="p-3">Thao tác</th></tr></thead>
          <tbody>{requests.length ? requests.map((request) => <tr key={request.id} className="border-b align-top last:border-0"><td className="p-3 font-medium">{request.studentName ?? "—"}</td><td className="p-3">{request.courseTitle ?? "—"}</td><td className="p-3"><span className="inline-flex items-center gap-1 font-semibold text-red-700"><AlertTriangle className="h-4 w-4" /> {labels[request.action] ?? request.action}</span></td><td className="max-w-xs whitespace-pre-wrap p-3">{request.reason}</td><td className="whitespace-nowrap p-3 text-muted-foreground">{dateTime.format(new Date(request.createdAt))}</td><td className="p-3"><div className="flex gap-2"><form action={reviewStudentDisciplineAction}><input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="approve" value="true" /><button className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"><CheckCircle2 className="h-3.5 w-3.5" /> Duyệt</button></form><form action={reviewStudentDisciplineAction}><input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="approve" value="false" /><button className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-xs font-semibold text-red-600"><XCircle className="h-3.5 w-3.5" /> Từ chối</button></form></div></td></tr>) : <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Không có đề xuất nào đang chờ.</td></tr>}</tbody>
        </table>
      </section>
    </main>
  );
}
