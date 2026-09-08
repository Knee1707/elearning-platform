import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { CartView } from "@/features/cart/CartView";

// Route: /cart · Chủ: M3 · Giỏ hàng + wishlist + nhập mã giảm.
export default function CartPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 pb-16">
        {/* HEADER & BREADCRUMB */}
        <div className="border-b border-border/50 bg-muted/20 py-8">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
              <Link href="/" className="hover:text-foreground transition-colors">
                Trang chủ
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground font-medium">Giỏ hàng của bạn</span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Giỏ hàng
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Kiểm tra các khóa học bạn đã chọn, áp dụng mã giảm giá và thanh toán
              </p>
            </div>
          </div>
        </div>

        {/* CART VIEW COMPONENT */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <CartView />
        </div>
      </main>
    </div>
  );
}
