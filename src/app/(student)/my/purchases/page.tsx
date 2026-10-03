import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ReceiptText, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { getCurrentUser } from "@/lib/queries/auth";
import { getMyPurchases } from "@/features/refund/queries";
import { FlashMessage, dateTime, money, type SearchParams } from "@/features/admin/ui";
import type { PaymentStatus } from "@/types/domain";

const PAYMENT_BADGE: Record<PaymentStatus, { label: string; className: string }> = {
  paid: { label: "Đã thanh toán", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending: { label: "Chờ thanh toán", className: "bg-amber-50 text-amber-700 border-amber-200" },
  refunded: { label: "Đã hoàn tiền", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

export default async function MyPurchasesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/my/purchases");

  const purchases = await getMyPurchases(user.id);

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
            Lịch sử mua khóa học
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Danh sách các khóa học bạn đã đăng ký và thanh toán trên nền tảng.
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-600">
            <ShieldCheck className="h-4 w-4 shrink-0 text-slate-500" />
            <span>Chính sách thanh toán: Khóa học một khi đã mua sẽ không áp dụng chính sách hoàn tiền.</span>
          </div>
        </div>
        <FlashMessage searchParams={searchParams} />

        <div className="mt-6 space-y-4">
          {purchases.length ? (
            purchases.map((purchase) => {
              const badge = PAYMENT_BADGE[purchase.status];
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
