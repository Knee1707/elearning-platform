import Link from "next/link";
import type { RefundStatus } from "@/types/domain";
import { getRefunds } from "@/features/super-admin/queries";
import { approveRefundAction } from "@/features/super-admin/actions";
import { FlashMessage, PageHeader, dateTime, money, param, type SearchParams } from "@/features/super-admin/ui";

const TABS: { status: RefundStatus; label: string }[] = [
  { status: "pending", label: "Chờ duyệt" },
  { status: "approved", label: "Đã duyệt" },
  { status: "rejected", label: "Từ chối" },
];

export default async function SuperAdminRefundsPage({ searchParams }: { searchParams: SearchParams }) {
  const requested = param(searchParams, "status");
  const status: RefundStatus = TABS.some((t) => t.status === requested) ? (requested as RefundStatus) : "pending";
  const refunds = await getRefunds(status);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <PageHeader
        title="Hoàn tiền"
        description="Duyệt yêu cầu hoàn tiền: giao dịch chuyển sang 'refunded' và học viên mất quyền truy cập khóa học."
      />
      <FlashMessage searchParams={searchParams} />

      <nav className="mt-6 flex gap-1 border-b border-border" aria-label="Lọc theo trạng thái">
        {TABS.map((tab) => (
          <Link
            key={tab.status}
            href={`/super-admin/refunds?status=${tab.status}`}
            aria-current={tab.status === status ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab.status === status
                ? "border-violet-600 text-violet-700 dark:border-violet-400 dark:text-violet-300"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="mt-4 space-y-3">
        {refunds.length ? (
          refunds.map((refund) => (
            <article key={refund.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
              <div className="min-w-0">
                <p className="font-medium">
                  {refund.studentName ?? "Học viên"} · {refund.courseTitle ?? "Khóa học"}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {money.format(refund.amount)} · Yêu cầu lúc {dateTime.format(new Date(refund.createdAt))}
                  {refund.resolvedAt && ` · Xử lý lúc ${dateTime.format(new Date(refund.resolvedAt))}`}
                </p>
                <p className="mt-1 text-sm">Lý do: {refund.reason || <span className="text-muted-foreground">không ghi</span>}</p>
              </div>
              {status === "pending" && (
                <form action={approveRefundAction}>
                  <input type="hidden" name="refundId" value={refund.id} />
                  <button type="submit" className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Duyệt hoàn tiền</button>
                </form>
              )}
            </article>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Không có yêu cầu nào.</p>
        )}
      </div>
    </main>
  );
}
