import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES } from "@/lib/utils";
import { getCertificates } from "@/features/admin/queries";
import { restoreCertificateAction, revokeCertificateAction } from "@/features/admin/actions";
import { FlashMessage, PageHeader, ReasonAction, buildHref, dateTime, param, type SearchParams } from "@/features/admin/ui";

export default async function AdminCertificatesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(ADMIN_ROLES);
  const keyword = param(searchParams, "q") ?? "";
  const revokedOnly = param(searchParams, "status") === "revoked";
  const certificates = await getCertificates({ keyword, revokedOnly });
  const here = buildHref("/admin/certificates", { q: keyword, status: revokedOnly ? "revoked" : undefined });

  return (
    <main className="mx-auto max-w-5xl p-8">
      <PageHeader
        title="Chứng chỉ"
        description="Tra cứu chứng chỉ theo mã hoặc tên học viên. Thu hồi khi phát hiện gian lận — trang xác thực công khai sẽ báo chứng chỉ đã bị thu hồi."
      />
      <FlashMessage searchParams={searchParams} />

      <form className="mt-6 flex flex-wrap items-end gap-3" role="search">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Mã hoặc tên học viên</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input name="q" defaultValue={keyword} placeholder="CERT-… hoặc tên" className="w-64 rounded border border-border bg-background py-2 pl-9 pr-3" />
          </span>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Trạng thái</span>
          <select name="status" defaultValue={revokedOnly ? "revoked" : ""} className="rounded border border-border bg-background px-3 py-2">
            <option value="">Tất cả</option>
            <option value="revoked">Đã thu hồi</option>
          </select>
        </label>
        <button type="submit" className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Lọc</button>
        {(keyword || revokedOnly) && <Link href="/admin/certificates" className="px-2 py-2 text-sm underline">Bỏ lọc</Link>}
      </form>
      <p className="mt-2 text-xs text-muted-foreground">Hiển thị tối đa 50 chứng chỉ mới nhất khớp bộ lọc.</p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left">
            <tr>
              <th className="p-3">Mã</th>
              <th className="p-3">Học viên</th>
              <th className="p-3">Khóa học</th>
              <th className="p-3">Cấp lúc</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {certificates.length ? (
              certificates.map((cert) => (
                <tr key={cert.id} className="border-b border-border align-top last:border-0">
                  <td className="p-3">
                    <a href={`/verify/${cert.code}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs hover:underline">
                      {cert.code} <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="p-3">
                    <Link href={`/admin/users/${cert.studentId}`} className="hover:underline">{cert.studentName ?? "Học viên"}</Link>
                  </td>
                  <td className="p-3">{cert.courseTitle ?? "—"}</td>
                  <td className="whitespace-nowrap p-3 text-muted-foreground">{dateTime.format(new Date(cert.issuedAt))}</td>
                  <td className="p-3">
                    {cert.revokedAt ? (
                      <span className="text-red-600 dark:text-red-400">
                        Đã thu hồi
                        <span className="block text-xs text-muted-foreground">{dateTime.format(new Date(cert.revokedAt))}</span>
                        {cert.revokedReason && <span className="block text-xs text-muted-foreground">Lý do: {cert.revokedReason}</span>}
                      </span>
                    ) : (
                      "Hiệu lực"
                    )}
                  </td>
                  <td className="p-3">
                    {cert.revokedAt ? (
                      <form action={restoreCertificateAction}>
                        <input type="hidden" name="id" value={cert.id} />
                        <input type="hidden" name="returnTo" value={here} />
                        <button type="submit" className="underline">Khôi phục</button>
                      </form>
                    ) : (
                      <ReasonAction
                        action={revokeCertificateAction}
                        label="Thu hồi"
                        submitLabel="Xác nhận thu hồi"
                        placeholder="Lý do thu hồi (học viên sẽ thấy)…"
                        hidden={{ id: cert.id, returnTo: here }}
                      />
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="p-4 text-muted-foreground">Không có chứng chỉ nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
