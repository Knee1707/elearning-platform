import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES } from "@/lib/utils";
import { getCertificateCourseOptions, getCertificates } from "@/features/admin/queries";
import { restoreCertificateAction, revokeCertificateAction } from "@/features/admin/actions";
import { FlashMessage, PageHeader, ReasonAction, buildHref, dateTime, param, type SearchParams } from "@/features/admin/ui";

export default async function AdminCertificatesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(ADMIN_ROLES);
  const keyword = param(searchParams, "q") ?? "";
  const revokedOnly = param(searchParams, "status") === "revoked";
  const courseId = param(searchParams, "courseId") ?? "";
  const sortBy = param(searchParams, "sortBy") === "name" ? "name" : "time";
  const sortDir = param(searchParams, "sortDir") === "asc" ? "asc" : "desc";
  const [courses, certificates] = await Promise.all([
    getCertificateCourseOptions(),
    getCertificates({ keyword, revokedOnly, courseId: courseId || undefined, sortBy, sortDir }),
  ]);
  const here = buildHref("/admin/certificates", { q: keyword || undefined, status: revokedOnly ? "revoked" : undefined, courseId: courseId || undefined, sortBy, sortDir });

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 sm:p-8">
      <PageHeader title="Chứng chỉ" description="Theo dõi chứng chỉ được cấp tự động theo từng khóa học; admin có thể tra cứu, thu hồi hoặc khôi phục." />
      <FlashMessage searchParams={searchParams} />
      <form method="GET" className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-white p-4">
        <label className="text-sm"><span className="mb-1 block text-muted-foreground">Tên học viên hoặc mã</span><span className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input name="q" defaultValue={keyword} placeholder="CERT-… hoặc tên" className="w-64 rounded border border-border bg-background py-2 pl-9 pr-3" /></span></label>
        <label className="text-sm"><span className="mb-1 block text-muted-foreground">Khóa học</span><select name="courseId" defaultValue={courseId} className="min-w-64 rounded border border-border bg-background px-3 py-2"><option value="">Tất cả khóa học</option>{courses.map((course: { id: string; title: string }) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
        <label className="text-sm"><span className="mb-1 block text-muted-foreground">Sắp xếp theo</span><select name="sortBy" defaultValue={sortBy} className="rounded border border-border bg-background px-3 py-2"><option value="time">Thời gian cấp</option><option value="name">Tên học viên</option></select></label>
        <label className="text-sm"><span className="mb-1 block text-muted-foreground">Thứ tự</span><select name="sortDir" defaultValue={sortDir} className="rounded border border-border bg-background px-3 py-2"><option value="desc">Giảm dần</option><option value="asc">Tăng dần</option></select></label>
        <label className="text-sm"><span className="mb-1 block text-muted-foreground">Trạng thái</span><select name="status" defaultValue={revokedOnly ? "revoked" : ""} className="rounded border border-border bg-background px-3 py-2"><option value="">Tất cả</option><option value="revoked">Đã thu hồi</option></select></label>
        <button className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground">Lọc</button>
      </form>
      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Chứng chỉ được cấp tự động khi học viên đạt kỳ thi cuối khóa. Không còn bước duyệt.</p>
      <div className="overflow-x-auto rounded-lg border border-border bg-white">
        <table className="w-full text-sm"><thead className="border-b bg-muted/40 text-left"><tr><th className="p-3">Mã</th><th className="p-3">Học viên</th><th className="p-3">Khóa học</th><th className="p-3">Ngày cấp</th><th className="p-3">Trạng thái</th><th className="p-3">Thao tác</th></tr></thead>
          <tbody>{certificates.length ? certificates.map((cert) => <tr key={cert.id} className="border-b last:border-0"><td className="p-3"><a href={`/verify/${cert.code}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs hover:underline">{cert.code}<ExternalLink className="h-3 w-3" /></a></td><td className="p-3 font-medium"><Link href={`/admin/users/${cert.studentId}`} className="hover:underline">{cert.studentName ?? "Học viên"}</Link></td><td className="p-3">{cert.courseTitle ?? "—"}</td><td className="whitespace-nowrap p-3 text-muted-foreground">{dateTime.format(new Date(cert.issuedAt))}</td><td className="p-3">{cert.revokedAt ? <span className="text-red-600">Đã thu hồi</span> : <span className="text-emerald-700">Hiệu lực</span>}</td><td className="p-3">{cert.revokedAt ? <form action={restoreCertificateAction}><input type="hidden" name="id" value={cert.id} /><input type="hidden" name="returnTo" value={here} /><button className="underline">Khôi phục</button></form> : <ReasonAction action={revokeCertificateAction} label="Thu hồi" submitLabel="Xác nhận thu hồi" placeholder="Lý do thu hồi…" hidden={{ id: cert.id, returnTo: here }} />}</td></tr>) : <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Không có chứng chỉ phù hợp.</td></tr>}</tbody>
        </table>
      </div>
    </main>
  );
}
