import { getPayouts, getSettings } from "@/features/super-admin/queries";
import { generatePayoutAction } from "@/features/super-admin/actions";
import { FlashMessage, PageHeader, money, param, type SearchParams } from "@/features/super-admin/ui";

export default async function SuperAdminPayoutsPage({ searchParams }: { searchParams: SearchParams }) {
  const requested = param(searchParams, "period");
  const period = requested && /^\d{4}-(0[1-9]|1[0-2])$/.test(requested) ? requested : undefined;
  const [payouts, settings] = await Promise.all([getPayouts(period), getSettings()]);
  const fee = settings.find((s) => s.key === "platform_fee_percent")?.value;

  const totals = payouts.reduce(
    (sum, p) => ({ gross: sum.gross + p.gross, fee: sum.fee + p.platformFee, net: sum.net + p.net }),
    { gross: 0, fee: 0, net: 0 },
  );
  const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  const defaultPeriod = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;

  return (
    <main className="mx-auto max-w-5xl p-8">
      <PageHeader
        title="Payout giảng viên"
        description="Gom doanh thu đã thanh toán theo kỳ (tháng) và trừ phí nền tảng. Tạo lại một kỳ chỉ cập nhật các dòng còn ở trạng thái nháp."
      />
      <FlashMessage searchParams={searchParams} />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border p-5">
          <h2 className="font-semibold">Tạo payout theo kỳ</h2>
          <p className="mt-1 text-sm text-muted-foreground">Phí nền tảng hiện tại: {fee === undefined ? "20% (mặc định)" : `${String(fee)}%`}</p>
          <form action={generatePayoutAction} className="mt-4 flex gap-3">
            <input name="period" type="month" required defaultValue={defaultPeriod} aria-label="Kỳ" className="rounded border border-border bg-background px-3 py-2" />
            <button className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Tạo payout</button>
          </form>
        </section>

        <section className="rounded-lg border border-border p-5">
          <h2 className="font-semibold">Lọc theo kỳ</h2>
          <form className="mt-4 flex gap-3">
            <input name="period" type="month" defaultValue={period} aria-label="Kỳ cần xem" className="rounded border border-border bg-background px-3 py-2" />
            <button className="rounded border border-border px-3 py-2 text-sm hover:bg-muted">Xem</button>
          </form>
        </section>
      </div>

      <section className="mt-8 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left">
            <tr>
              <th className="p-3">Kỳ</th>
              <th className="p-3">Giảng viên</th>
              <th className="p-3 text-right">Doanh thu</th>
              <th className="p-3 text-right">Phí nền tảng</th>
              <th className="p-3 text-right">Thực nhận</th>
              <th className="p-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {payouts.length ? (
              payouts.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="p-3">{p.period}</td>
                  <td className="p-3">{p.instructorName ?? "—"}</td>
                  <td className="p-3 text-right tabular-nums">{money.format(p.gross)}</td>
                  <td className="p-3 text-right tabular-nums">{money.format(p.platformFee)}</td>
                  <td className="p-3 text-right font-medium tabular-nums">{money.format(p.net)}</td>
                  <td className="p-3">
                    {p.status === "paid" ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Đã chi trả</span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">Nháp</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-4 text-muted-foreground">Chưa có payout{period ? ` cho kỳ ${period}` : ""}.</td>
              </tr>
            )}
          </tbody>
          {payouts.length > 0 && (
            <tfoot className="border-t border-border bg-muted/40 font-semibold">
              <tr>
                <td className="p-3" colSpan={2}>Tổng</td>
                <td className="p-3 text-right tabular-nums">{money.format(totals.gross)}</td>
                <td className="p-3 text-right tabular-nums">{money.format(totals.fee)}</td>
                <td className="p-3 text-right tabular-nums">{money.format(totals.net)}</td>
                <td className="p-3" />
              </tr>
            </tfoot>
          )}
        </table>
      </section>
    </main>
  );
}
