"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { applyCoupon, mockPurchaseAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CartItem } from "./queries";

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

// Định dạng "1234 5678 9012 3456" khi gõ — chỉ để trông giống thật, không xử lý số thẻ thật.
function formatCardNumber(value: string): string {
  return value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function CheckoutForm({ items }: { items: CartItem[] }) {
  const router = useRouter();

  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState<string | null>(null);
  const [total, setTotal] = useState(items.reduce((sum, item) => sum + item.price, 0));
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const courseIds = items.map((item) => item.courseId);

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setCouponError(null);
    setIsApplyingCoupon(true);
    try {
      const newTotal = await applyCoupon(couponCode.trim(), courseIds);
      setTotal(newTotal);
      setCouponApplied(couponCode.trim());
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : "Mã giảm giá không hợp lệ.");
    } finally {
      setIsApplyingCoupon(false);
    }
  }

  async function handlePay(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPayError(null);

    if (cardNumber.replace(/\s/g, "").length < 16 || expiry.length < 5 || cvc.length < 3) {
      setPayError("Vui lòng nhập đầy đủ thông tin thẻ (mô phỏng — không cần thẻ thật).");
      return;
    }

    setIsPaying(true);
    // Giả lập độ trễ xử lý thanh toán cho giống trải nghiệm thật.
    await new Promise((resolve) => setTimeout(resolve, 900));

    try {
      const paymentIds = await mockPurchaseAction(courseIds, couponApplied ?? undefined);
      const paymentQuery = paymentIds.length > 0 ? `?payments=${encodeURIComponent(paymentIds.join(","))}` : "";
      router.push(`/checkout/success${paymentQuery}`);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Thanh toán thất bại. Vui lòng thử lại.");
      setIsPaying(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">Giỏ hàng của bạn đang trống.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* --- Tóm tắt đơn hàng --- */}
      <div className="space-y-3 rounded-lg border border-border p-5">
        <h2 className="font-semibold">Đơn hàng</h2>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.courseId} className="flex justify-between text-sm">
              <span>{item.title}</span>
              <span className="text-muted-foreground">{money.format(item.price)}</span>
            </li>
          ))}
        </ul>

        <div className="flex gap-2 border-t border-border pt-3">
          <Input
            placeholder="Mã giảm giá"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
          />
          <Button type="button" variant="outline" onClick={handleApplyCoupon} disabled={isApplyingCoupon}>
            {isApplyingCoupon ? "..." : "Áp dụng"}
          </Button>
        </div>
        {couponError && <p className="text-sm text-destructive">{couponError}</p>}
        {couponApplied && <p className="text-sm text-emerald-600 dark:text-emerald-400">Đã áp dụng mã {couponApplied}</p>}

        <div className="flex justify-between border-t border-border pt-3 font-semibold">
          <span>Tổng cộng</span>
          <span>{money.format(total)}</span>
        </div>
      </div>

      {/* --- Form thẻ kiểu Stripe Checkout (MÔ PHỎNG — không xử lý thẻ thật) --- */}
      <form onSubmit={handlePay} className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Thông tin thanh toán</h2>
          <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">Chế độ thử nghiệm</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cardNumber">Số thẻ</Label>
          <Input
            id="cardNumber"
            inputMode="numeric"
            placeholder="4242 4242 4242 4242"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="expiry">Ngày hết hạn</Label>
            <Input
              id="expiry"
              inputMode="numeric"
              placeholder="MM/YY"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cvc">CVC</Label>
            <Input
              id="cvc"
              inputMode="numeric"
              placeholder="123"
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </div>
        </div>

        {payError && <p className="text-sm text-destructive">{payError}</p>}

        <Button type="submit" className="w-full" disabled={isPaying}>
          {isPaying ? "Đang xử lý thanh toán..." : `Thanh toán ${money.format(total)}`}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Đây là môi trường mô phỏng — không có giao dịch tiền thật nào được thực hiện.
        </p>
      </form>
    </div>
  );
}