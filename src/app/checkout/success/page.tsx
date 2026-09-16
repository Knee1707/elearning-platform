import Link from "next/link";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";

interface CheckoutSuccessPageProps {
  searchParams: { payments?: string };
}

export default function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const paymentIds = (searchParams.payments ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  const receiptValue = paymentIds.length > 0 ? `LMS-PAYMENT:${paymentIds.join(",")}` : "LMS-PAYMENT:COMPLETED";

  return (
    <main className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-2xl font-bold">Thanh toán thành công!</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Các khóa học đã được mở khóa. Bạn có thể bắt đầu học ngay.
      </p>
      <section className="mx-auto mt-6 w-fit rounded-lg border border-border bg-white p-4 shadow-sm" aria-label="Mã QR biên nhận thanh toán">
        <QRCodeSVG value={receiptValue} size={208} level="M" includeMargin />
        <p className="mt-3 text-xs text-muted-foreground">Quét mã để lưu biên nhận thanh toán</p>
      </section>
      {paymentIds.length > 0 && (
        <p className="mt-3 break-all text-xs text-muted-foreground">Mã giao dịch: {paymentIds.join(", ")}</p>
      )}
      <Link href="/my" className="mt-6 inline-block">
        <Button>Vào khóa học của tôi</Button>
      </Link>
    </main>
  );
}