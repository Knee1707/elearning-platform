// Route: /admin/coupons · Chủ: M4 · Quản lý mã giảm giá toàn hệ thống.
// Điền: liệt kê/insert coupon (percent|fixed) + chạy payout kỳ (generatePayout — admin.ts/L).
export default function AdminCouponsPage() {
  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-bold">Mã giảm giá &amp; Payout</h1>
      <p className="mt-2 text-sm text-muted-foreground">TODO(M4): CRUD coupon + nút chạy payout.</p>
    </main>
  );
}
