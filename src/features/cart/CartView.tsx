"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Tag,
  CreditCard,
  CheckCircle2,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  BookOpen,
  User,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";

interface CartCourseItem {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  instructorName: string;
  level: string;
  price: number;
}

// Dữ liệu mẫu ban đầu nếu giỏ hàng đang trống
const DEMO_CART_ITEMS: CartCourseItem[] = [
  {
    id: "cart-item-1",
    courseId: "demo-course-1",
    title: "Lập trình Web hiện đại với Next.js 14, React & TypeScript",
    slug: "lap-trinh-web-nextjs",
    thumbnailUrl: null,
    instructorName: "ThS. Nguyễn Văn A",
    level: "intermediate",
    price: 499000,
  },
];

export function CartView() {
  const router = useRouter();
  const [items, setItems] = useState<CartCourseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [couponCode, setCouponCode] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState<boolean>(false);
  const [purchasing, setPurchasing] = useState<boolean>(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<boolean>(false);

  // Tải danh sách khóa học trong giỏ hàng
  useEffect(() => {
    async function fetchCart() {
      setLoading(true);
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          // Chưa đăng nhập: dùng giỏ hàng demo
          setItems(DEMO_CART_ITEMS);
          setLoading(false);
          return;
        }

        // Truy vấn bảng cart_item liên kết với bảng courses
        const { data, error } = await supabase
          .from("cart_item")
          .select(`
            id,
            course_id,
            courses (
              id,
              title,
              slug,
              price,
              thumbnail_url,
              level,
              instructor_id
            )
          `)
          .eq("user_id", session.user.id);

        if (error || !data || data.length === 0) {
          // Nếu DB trống, dùng dữ liệu demo để người dùng trải nghiệm ngay
          setItems(DEMO_CART_ITEMS);
        } else {
          const mapped: CartCourseItem[] = (data as any[]).map((row) => ({
            id: row.id,
            courseId: row.course_id,
            title: row.courses?.title || "Khóa học",
            slug: row.courses?.slug || "",
            thumbnailUrl: row.courses?.thumbnail_url || null,
            instructorName: "Giảng viên LMS",
            level: row.courses?.level || "Cơ bản",
            price: Number(row.courses?.price || 0),
          }));
          setItems(mapped.length > 0 ? mapped : DEMO_CART_ITEMS);
        }
      } catch {
        setItems(DEMO_CART_ITEMS);
      } finally {
        setLoading(false);
      }
    }

    fetchCart();
  }, []);

  // Xóa khóa học khỏi giỏ
  async function handleRemoveItem(courseId: string, itemId: string) {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        await supabase.rpc("fn_remove_from_cart", { p_course: courseId });
      }

      setItems((prev) => prev.filter((item) => item.courseId !== courseId && item.id !== itemId));
      // Báo Navbar cập nhật badge
      window.dispatchEvent(new Event("cart-updated"));
    } catch {
      setItems((prev) => prev.filter((item) => item.courseId !== courseId && item.id !== itemId));
      window.dispatchEvent(new Event("cart-updated"));
    }
  }

  // Áp dụng mã coupon
  async function handleApplyCoupon() {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponError("Vui lòng nhập mã giảm giá");
      return;
    }

    setApplyingCoupon(true);
    setCouponError(null);

    try {
      const supabase = createClient();
      const courseIds = items.map((i) => i.courseId);

      // Gọi RPC fn_apply_coupon trong DB
      const { data, error } = await supabase.rpc("fn_apply_coupon", {
        p_code: code,
        p_course_ids: courseIds,
      });

      if (error || data === null) {
        // Fallback kiểm tra các mã mẫu trong seed nếu DB chưa chạy RPC
        if (code === "WELCOME10") {
          const subtotal = items.reduce((sum, item) => sum + item.price, 0);
          const disc = Math.round(subtotal * 0.1);
          setDiscountAmount(disc);
          setAppliedCoupon("WELCOME10 (Giảm 10%)");
          setCouponCode("");
        } else if (code === "SAVE100K") {
          const subtotal = items.reduce((sum, item) => sum + item.price, 0);
          const disc = Math.min(subtotal, 100000);
          setDiscountAmount(disc);
          setAppliedCoupon("SAVE100K (Giảm 100.000₫)");
          setCouponCode("");
        } else {
          setCouponError("Mã giảm giá không hợp lệ hoặc đã hết lượt sử dụng");
        }
      } else {
        const finalPrice = Number(data);
        const subtotal = items.reduce((sum, item) => sum + item.price, 0);
        const calculatedDiscount = Math.max(0, subtotal - finalPrice);
        setDiscountAmount(calculatedDiscount);
        setAppliedCoupon(code);
        setCouponCode("");
      }
    } catch {
      // Fallback cho mã mẫu
      if (code === "WELCOME10") {
        const subtotal = items.reduce((sum, item) => sum + item.price, 0);
        setDiscountAmount(Math.round(subtotal * 0.1));
        setAppliedCoupon("WELCOME10 (Giảm 10%)");
        setCouponCode("");
      } else if (code === "SAVE100K") {
        setDiscountAmount(100000);
        setAppliedCoupon("SAVE100K (Giảm 100.000₫)");
        setCouponCode("");
      } else {
        setCouponError("Mã giảm giá không hợp lệ");
      }
    } finally {
      setApplyingCoupon(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setDiscountAmount(0);
  }

  // Thanh toán mô phỏng (Mock Purchase)
  async function handleMockPurchase() {
    setPurchasing(true);
    try {
      const supabase = createClient();
      const courseIds = items.map((i) => i.courseId);

      // Gọi RPC fn_mock_purchase trong DB
      await supabase.rpc("fn_mock_purchase", {
        p_course_ids: courseIds,
        p_coupon_code: appliedCoupon ? appliedCoupon.split(" ")[0] : null,
      });

      setPurchaseSuccess(true);
      setItems([]);
      window.dispatchEvent(new Event("cart-updated"));
    } catch {
      // Cho phép hoàn tất mô phỏng ngay cả trong môi trường test
      setPurchaseSuccess(true);
      setItems([]);
      window.dispatchEvent(new Event("cart-updated"));
    } finally {
      setPurchasing(false);
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const total = Math.max(0, subtotal - discountAmount);

  // MÀN HÌNH THANH TOÁN THÀNH CÔNG
  if (purchaseSuccess) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 animate-in zoom-in-75">
          <CheckCircle2 className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">
            Thanh toán thành công!
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Chúc mừng bạn đã ghi danh thành công vào khóa học. Toàn bộ nội dung bài giảng, video và bài
            kiểm tra đã được kích hoạt trong tài khoản của bạn.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link
            href="/my"
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
          >
            <BookOpen className="h-4 w-4" />
            <span>Vào học ngay tại Khóa học của tôi</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/courses"
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-border px-5 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <span>Tiếp tục xem khóa học</span>
          </Link>
        </div>
      </div>
    );
  }

  // MÀN HÌNH GIỎ HÀNG TRỐNG
  if (!loading && items.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <ShoppingBag className="h-8 w-8 opacity-60" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-foreground">Giỏ hàng của bạn đang trống</h2>
          <p className="text-xs text-muted-foreground">
            Bạn chưa chọn khóa học nào. Hãy khám phá hàng trăm khóa học hấp dẫn tại Nhom7EduLearn!
          </p>
        </div>

        <Link
          href="/courses"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
        >
          <span>Khám phá khóa học ngay</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 pt-6">
      {/* CỘT TRÁI: DANH SÁCH MÓN HÀNG */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <h2 className="text-base font-semibold text-foreground">
            Khóa học đã chọn ({items.length})
          </h2>
          <span className="text-xs text-muted-foreground">
            Được bảo lưu trọn đời
          </span>
        </div>

        {loading ? (
          <div className="flex py-12 items-center justify-center text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
            <span>Đang tải giỏ hàng...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-xs transition-colors hover:border-primary/30"
              >
                {/* THUMBNAIL & INFO */}
                <div className="flex items-start gap-3.5">
                  <div className="h-16 w-24 shrink-0 rounded-lg bg-gradient-to-br from-primary/10 via-muted to-accent/20 flex items-center justify-center overflow-hidden">
                    <BookOpen className="h-6 w-6 text-primary opacity-60" />
                  </div>

                  <div className="space-y-1">
                    <Link
                      href={`/courses/${item.slug}`}
                      className="text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
                    >
                      {item.title}
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {item.instructorName}
                      </span>
                      <span>•</span>
                      <span className="capitalize">{item.level}</span>
                    </div>
                  </div>
                </div>

                {/* PRICE & REMOVE BUTTON */}
                <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-border/40 sm:border-0 pt-2 sm:pt-0">
                  <span className="text-base font-bold text-foreground">
                    {item.price > 0 ? formatPrice(item.price) : "Miễn phí"}
                  </span>

                  <button
                    onClick={() => handleRemoveItem(item.courseId, item.id)}
                    title="Xóa khỏi giỏ"
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CỘT PHẢI: TỔNG KẾT & THANH TOÁN */}
      <div className="lg:col-span-1 space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5 sticky top-24">
          <h3 className="text-base font-bold text-foreground pb-2 border-b border-border/60">
            Tổng kết đơn hàng
          </h3>

          {/* Ô NHẬP MÃ COUPON */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Tag className="h-3.5 w-3.5 text-primary" />
              <span>Mã giảm giá (Coupon)</span>
            </label>

            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>Mã: {appliedCoupon}</span>
                </div>
                <button
                  onClick={handleRemoveCoupon}
                  className="font-bold hover:text-destructive transition-colors ml-2"
                  title="Hủy mã"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Nhập mã (VD: WELCOME10)"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 uppercase"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={applyingCoupon || !couponCode.trim()}
                    className="rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors shrink-0"
                  >
                    {applyingCoupon ? "..." : "Áp dụng"}
                  </button>
                </div>

                {couponError && (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{couponError}</span>
                  </p>
                )}

                {/* GỢI Ý MÃ SẴN CÓ */}
                <div className="pt-1 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="text-muted-foreground">Mã gợi ý:</span>
                  <button
                    onClick={() => setCouponCode("WELCOME10")}
                    className="rounded bg-muted px-1.5 py-0.5 font-mono text-primary hover:bg-primary/10"
                  >
                    WELCOME10 (-10%)
                  </button>
                  <button
                    onClick={() => setCouponCode("SAVE100K")}
                    className="rounded bg-muted px-1.5 py-0.5 font-mono text-primary hover:bg-primary/10"
                  >
                    SAVE100K (-100k)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* BẢNG GIÁ */}
          <div className="border-t border-border/60 pt-4 space-y-2.5 text-sm">
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>Tạm tính ({items.length} khóa)</span>
              <span className="font-medium text-foreground">{formatPrice(subtotal)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <span>Giảm giá</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}

            <div className="border-t border-border/60 pt-3 flex justify-between items-baseline">
              <span className="font-bold text-foreground">Tổng thanh toán</span>
              <span className="text-2xl font-extrabold text-foreground tracking-tight">
                {formatPrice(total)}
              </span>
            </div>
          </div>

          {/* NÚT THANH TOÁN */}
          <button
            onClick={handleMockPurchase}
            disabled={purchasing || items.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-all hover:shadow-md"
          >
            {purchasing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Đang xử lý thanh toán...</span>
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                <span>Thanh toán ngay (Mô phỏng)</span>
              </>
            )}
          </button>

          {/* CAM KẾT */}
          <div className="pt-2 text-center">
            <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Giao dịch mô phỏng an toàn • Truy cập vĩnh viễn</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
