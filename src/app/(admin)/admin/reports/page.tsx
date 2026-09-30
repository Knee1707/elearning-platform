import Link from "next/link";
import { Star } from "lucide-react";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES } from "@/lib/utils";
import type { ReportStatus, ReviewStatus } from "@/types/domain";
import { getReports, getReviews } from "@/features/admin/queries";
import { moderateReviewAction, resolveReportAction } from "@/features/admin/actions";
import { ENTITY_LABELS, FilterTabs, FlashMessage, PageHeader, buildHref, dateTime, param, type SearchParams } from "@/features/admin/ui";

const REPORT_TABS: { value: ReportStatus; label: string }[] = [
  { value: "open", label: "Đang mở" },
  { value: "resolved", label: "Đã xử lý" },
  { value: "dismissed", label: "Đã bỏ qua" },
];
const REVIEW_TABS: { value: ReviewStatus; label: string }[] = [
  { value: "pending", label: "Chờ duyệt" },
  { value: "visible", label: "Đang hiển thị" },
  { value: "hidden", label: "Đã ẩn" },
];

// Link tới đối tượng bị báo cáo trong khu admin (review không có trang riêng).
const entityHref = (entity: string, id: string) =>
  entity === "course" ? `/admin/courses/${id}` : entity === "user" ? `/admin/users/${id}` : null;

export default async function AdminReportsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(ADMIN_ROLES);
  const reportStatus = REPORT_TABS.find((t) => t.value === param(searchParams, "report"))?.value ?? "open";
  const reviewStatus = REVIEW_TABS.find((t) => t.value === param(searchParams, "review"))?.value ?? "pending";
  const [reports, reviews] = await Promise.all([getReports(reportStatus), getReviews(reviewStatus)]);
  const here = buildHref("/admin/reports", { report: reportStatus, review: reviewStatus });

  return (
    <main className="mx-auto max-w-5xl p-8">
      <PageHeader title="Báo cáo & review" description="Xử lý báo cáo vi phạm từ người dùng và kiểm duyệt đánh giá khóa học." />
      <FlashMessage searchParams={searchParams} />

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Báo cáo vi phạm</h2>
        <div className="mt-3">
          <FilterTabs label="Lọc báo cáo" tabs={REPORT_TABS} active={reportStatus} hrefFor={(v) => buildHref("/admin/reports", { report: v, review: reviewStatus })} />
        </div>
        <div className="mt-3 space-y-3">
          {reports.length ? (
            reports.map((report) => {
              const href = entityHref(report.entity, report.entityId);
              const target = report.entityLabel ?? "(đối tượng đã bị xóa)";
              return (
                <article key={report.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-4">
                  <div className="min-w-0">
                    <p className="font-medium">
                      <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">{ENTITY_LABELS[report.entity] ?? report.entity}</span>
                      {href ? <Link href={href} className="hover:underline">{target}</Link> : <span>“{target}”</span>}
                    </p>
                    <p className="mt-1 text-sm">Lý do: {report.reason || <span className="text-muted-foreground">không ghi</span>}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Báo cáo bởi {report.reporterName ?? "người dùng"} · {dateTime.format(new Date(report.createdAt))}
                    </p>
                  </div>
                  {reportStatus === "open" && (
                    <form action={resolveReportAction} className="flex gap-2">
                      <input type="hidden" name="id" value={report.id} />
                      <input type="hidden" name="returnTo" value={here} />
                      <button name="status" value="resolved" className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Đã xử lý</button>
                      <button name="status" value="dismissed" className="rounded border border-border px-3 py-2 text-sm">Bỏ qua</button>
                    </form>
                  )}
                </article>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">Không có báo cáo nào.</p>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Review khóa học</h2>
        <div className="mt-3">
          <FilterTabs label="Lọc review" tabs={REVIEW_TABS} active={reviewStatus} hrefFor={(v) => buildHref("/admin/reports", { report: reportStatus, review: v })} />
        </div>
        <div className="mt-3 space-y-3">
          {reviews.length ? (
            reviews.map((review) => (
              <article key={review.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-1 font-medium">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {review.rating}/5 · {review.courseTitle ?? "Khóa học"}
                  </p>
                  <p className="mt-1 text-sm">{review.comment || <span className="text-muted-foreground">Không có bình luận</span>}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {review.authorName ?? "Học viên"} · {dateTime.format(new Date(review.createdAt))}
                  </p>
                </div>
                <form action={moderateReviewAction} className="flex gap-2">
                  <input type="hidden" name="id" value={review.id} />
                  <input type="hidden" name="returnTo" value={here} />
                  {review.status !== "visible" && (
                    <button name="status" value="visible" className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Hiển thị</button>
                  )}
                  {review.status !== "hidden" && (
                    <button name="status" value="hidden" className="rounded border border-border px-3 py-2 text-sm">Ẩn</button>
                  )}
                </form>
              </article>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Không có review nào.</p>
          )}
        </div>
      </section>
    </main>
  );
}
