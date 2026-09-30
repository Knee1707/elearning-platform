import Link from "next/link";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES } from "@/lib/utils";
import type { PaymentStatus } from "@/types/domain";
import { ADMIN_PAGE_SIZE, getPayments, getPendingRefunds } from "@/features/admin/queries";
import { PageHeader, Pagination, buildHref, dateTime, money, param, type SearchParams } from "@/features/admin/ui";

const STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "paid", label: "Đã thanh toán" },
  { value: "refunded", label: "Đã hoàn tiền" },
  { value: "pending", label: "Chờ thanh toán" },
];
const STATUS_TONE: Record<PaymentStatus, string> = {
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  refunded: "bg-muted text-muted-foreground",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

export default async function AdminPaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const me = await requireRole(ADMIN_ROLES);
  const statusParam = param(searchParams, "status");
  const status = STATUS_OPTIONS.find((o) => o.value === statusParam)?.value;
  const periodParam = param(searchParams, "period");
  const period = periodParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(periodParam) ? periodParam : undefined;
  const page = Math.max(1, Number(param(searchParams, "page")) || 1);

  const [{ payments, total }, refunds] = await Promise.all([getPayments({ status, period, page }), getPendingRefunds()]);
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const pageSum = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <PageHeader title="Giao dịch" description="Lịch sử thanh toán và các yêu cầu hoàn tiền đang chờ. Việc duyệt/từ chối hoàn tiền do super admin thực hiện." />

      <section className="mt-6 rounded-lg border border-border">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
          <h2 className="font-semibold">Yêu cầu hoàn tiền đang chờ ({refunds.length})</h2>
          {me.role === "super_admin" && (
            <Link href="/super-admin/refunds" className="text-sm text-violet-700 underline-offset-4 hover:underline dark:text-violet-300">
              Xử lý ở khu Super Admin
            </Link>
          )}
        </div>
        {refunds.length ? (
          <ul className="divide-y divide-border text-sm">
            {refunds.map((r) => (
              <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3">
                <span>
                  <span className="font-medium">{r.studentName ?? "Học viên"}</span> · {r.courseTitle ?? "Khóa học"} · {money.format(r.amount)}
                  <span className="block text-muted-foreground">Lý do: {r.reason || "không ghi"}</span>
                </span>
                <time className="text-xs text-muted-foreground">{dateTime.format(new Date(r.createdAt))}</time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-4 text-sm text-muted-foreground">Không có yêu cầu nào đang chờ.</p>
        )}
      </section>

      <form className="mt-8 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Trạng thái</span>
          <select name="status" defaultValue={status ?? ""} className="rounded border border-border bg-background px-3 py-2">
            <option value="">Tất cả</option>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Tháng</span>
          <input name="period" type="month" defaultValue={period} className="rounded border border-border bg-background px-3 py-2" />
        </label>
        <button type="submit" className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Lọc</button>
        {(status || period) && <Link href="/admin/payments" className="px-2 py-2 text-sm underline">Bỏ lọc</Link>}
      </form>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left">
            <tr>
              <th className="p-3">Thời gian</th>
              <th className="p-3">Học viên</th>
              <th className="p-3">Khóa học</th>
              <th className="p-3">Mã giảm</th>
              <th className="p-3 text-right">Số tiền</th>
              <th className="p-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {payments.length ? (
              payments.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap p-3 text-muted-foreground">{dateTime.format(new Date(p.createdAt))}</td>
                  <td className="p-3">{p.studentName ?? "—"}</td>
                  <td className="p-3">{p.courseTitle ?? "—"}</td>
                  <td className="p-3 font-mono text-xs">{p.couponCode ?? "—"}</td>
                  <td className="p-3 text-right tabular-nums">{money.format(p.amount)}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_TONE[p.status]}`}>
                      {STATUS_OPTIONS.find((o) => o.value === p.status)?.label ?? p.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="p-4 text-muted-foreground">Không có giao dịch nào.</td></tr>
            )}
          </tbody>
          {payments.length > 0 && (
            <tfoot className="border-t border-border bg-muted/40">
              <tr>
                <td colSpan={4} className="p-3 font-semibold">Tổng đã thanh toán (trang này)</td>
                <td className="p-3 text-right font-semibold tabular-nums">{money.format(pageSum)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Pagination page={page} pageCount={pageCount} total={total} hrefFor={(p) => buildHref("/admin/payments", { status, period, page: p })} />
    </main>
  );
}
