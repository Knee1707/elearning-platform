import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ReceiptText, Undo2 } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { getCurrentUser } from "@/lib/queries/auth";
import { getMyPurchases, getRefundWindowDays, refundEligibility } from "@/features/refund/queries";
import { requestRefundAction } from "@/features/refund/actions";
import { FlashMessage, dateTime, money, type SearchParams } from "@/features/admin/ui";
import type { PaymentStatus, RefundStatus } from "@/types/domain";

const PAYMENT_BADGE: Record<PaymentStatus, { label: string; className: string }> = {
  paid: { label: "Đã thanh toán", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending: { label: "Chờ thanh toán", className: "bg-amber-50 text-amber-700 border-amber-200" },
  refunded: { label: "Đã hoàn tiền", className: "bg-slate-100 text-slate-600 border-slate-200" },
};
const REFUND_LABEL: Record<RefundStatus, string> = {
  pending: "Yêu cầu hoàn tiền đang chờ duyệt",
  approved: "Yêu cầu hoàn tiền đã được duyệt",
  rejected: "Yêu cầu hoàn tiền bị từ chối",
};

export default async function MyPurchasesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/my/purchases");

  const [purchases, windowDays] = await Promise.all([getMyPurchases(user.id), getRefundWindowDays()]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-slate-900">
      <Navbar />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <Link href="/my" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600">
          <ArrowLeft className="h-3.5 w-3.5" /> Khóa học của tôi
        </Link>
        <div className="mt-3 border-b border-slate-200 pb-6">
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl">
            <ReceiptText className="h-7 w-7 text-blue-600" />
            Lịch sử mua &amp; hoàn tiền
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Bạn có thể yêu cầu hoàn tiền trong <strong>{windowDays} ngày</strong> kể từ khi mua. Khi được duyệt, bạn sẽ không còn quyền
            truy cập khóa học đó. Kết quả được gửi vào mục Thông báo.
          </p>
        </div>
        <FlashMessage searchParams={searchParams} />

        <div className="mt-6 space-y-4">
          {purchases.length ? (
            purchases.map((purchase) => {
              const badge = PAYMENT_BADGE[purchase.status];
              const latest = purchase.refunds[0];
              const eligibility = refundEligibility(purchase, windowDays);
              return (
                <article key={purchase.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      {purchase.courseSlug ? (
                        <Link href={`/courses/${purchase.courseSlug}`} className="font-bold text-slate-900 hover:text-blue-600">
                          {purchase.courseTitle}
                        </Link>
                      ) : (
                        <p className="font-bold text-slate-900">{purchase.courseTitle ?? "Khóa học không còn hiển thị"}</p>
                      )}
                      <p className="mt-0.5 text-xs text-slate-500">
                        {money.format(purchase.amount)} · Mua lúc {dateTime.format(new Date(purchase.createdAt))}
                      </p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
                  </div>

                  {latest && (
                    <p
                      className={`mt-3 rounded-xl px-3 py-2 text-xs ${
                        latest.status === "rejected" ? "bg-red-50 text-red-700" : latest.status === "approved" ? "bg-slate-100 text-slate-700" : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      <strong>{REFUND_LABEL[latest.status]}</strong> · gửi lúc {dateTime.format(new Date(latest.createdAt))}
                      {latest.resolvedAt && ` · xử lý lúc ${dateTime.format(new Date(latest.resolvedAt))}`}
                      {latest.status === "rejected" && <span className="block">Lý do từ chối đã được gửi vào mục Thông báo của bạn.</span>}
                    </p>
                  )}

                  {eligibility.eligible ? (
                    <details className="group mt-3">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                        <Undo2 className="h-3.5 w-3.5" />
                        {latest?.status === "rejected" ? "Gửi lại yêu cầu hoàn tiền" : "Yêu cầu hoàn tiền"}
                      </summary>
                      <form action={requestRefundAction} className="mt-3 space-y-2">
                        <input type="hidden" name="paymentId" value={purchase.id} />
                        <textarea
                          name="reason"
                          required
                          minLength={5}
                          maxLength={1000}
                          rows={3}
                          aria-label="Lý do hoàn tiền"
                          placeholder="Cho chúng tôi biết lý do bạn muốn hoàn tiền…"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-400">Hạn cuối: {dateTime.format(eligibility.deadline)}</span>
                          <button type="submit" className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700">
                            Gửi yêu cầu
                          </button>
                        </div>
                      </form>
                    </details>
                  ) : (
                    eligibility.reason && <p className="mt-3 text-xs text-slate-400">{eligibility.reason}</p>
                  )}
                </article>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              Bạn chưa mua khóa học nào.{" "}
              <Link href="/courses" className="font-semibold text-blue-600 hover:underline">
                Khám phá khóa học
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
