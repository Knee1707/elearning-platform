// Route: /checkout · Chủ: M4 · Thanh toán MÔ PHỎNG (không tiền thật).
// Điền: màn xác nhận → gọi mockPurchase(courseIds, coupon) (commerce.ts/L) → mở khóa + email biên nhận.
export default function CheckoutPage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Thanh toán</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        TODO(M4): xác nhận giỏ + nút "Thanh toán (mock)" → mockPurchase → trang thành công.
      </p>
    </main>
  );
}
