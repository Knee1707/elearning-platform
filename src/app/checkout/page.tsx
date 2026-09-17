import { getCartItems } from "@/features/checkout/queries";
import { CheckoutForm } from "@/features/checkout/CheckoutForm";

// Route: /checkout · Chủ: M4 · Thanh toán MÔ PHỎNG (không tiền thật).
export default async function CheckoutPage() {
  const items = await getCartItems();

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Thanh toán</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Giao diện mô phỏng cổng thanh toán — không xử lý tiền thật, dùng để demo luồng mua khóa học.
      </p>
      <CheckoutForm items={items} />
    </main>
  );
}