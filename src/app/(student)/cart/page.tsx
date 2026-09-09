import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { CartView } from "@/features/cart/CartView";

// Route: /cart · Chủ: M3 · Giỏ hàng + wishlist + nhập mã giảm.
export default function CartPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 pb-16">
        {/* HEADER & BREADCRUMB */}
        <div className="border-b border-slate-200 bg-white py-8 shadow-xs">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3 font-medium">
              <Link href="/" className="hover:text-blue-600 transition-colors">
                Trang chủ
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-slate-700 font-bold">Giỏ hàng của bạn</span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Giỏ hàng
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                Kiểm tra các khóa học bạn đã chọn, áp dụng mã giảm giá và thanh toán mô phỏng an toàn
              </p>
            </div>
          </div>
        </div>

        {/* CART VIEW COMPONENT */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6 mt-6">
          <CartView />
        </div>
      </main>
    </div>
  );
}
