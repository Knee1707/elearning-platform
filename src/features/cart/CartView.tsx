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
  Heart,
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

interface WishlistCourseItem {
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
  const [wishlistItems, setWishlistItems] = useState<WishlistCourseItem[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [couponCode, setCouponCode] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState<boolean>(false);
  const [purchasing, setPurchasing] = useState<boolean>(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<boolean>(false);
  const [flash, setFlash] = useState<string | null>(null);
  // Chọn từng khóa để thanh toán (không bắt buộc trả hết giỏ). Mặc định chọn tất cả.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (courseId: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  const allSelected = items.length > 0 && items.every((i) => selectedIds.has(i.courseId));
  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(items.map((i) => i.courseId)));
  const selectedItems = items.filter((i) => selectedIds.has(i.courseId));

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
          // Chưa đăng nhập: đọc từ localStorage demo_cart_items
          try {
            const demoIds: string[] = JSON.parse(localStorage.getItem("demo_cart_items") || "[]");
            if (demoIds.length > 0) {
              const { data: cData } = await supabase
                .from("courses")
                .select("id, title, slug, price, thumbnail_url, level")
                .in("id", demoIds);
              if (cData && cData.length > 0) {
                setItems(
                  cData.map((c: any) => ({
                    id: c.id,
                    courseId: c.id,
                    title: c.title,
                    slug: c.slug,
                    thumbnailUrl: c.thumbnail_url,
                    instructorName: "Giảng viên LMS",
                    level: c.level || "Cơ bản",
                    price: Number(c.price || 0),
                  }))
                );
                return;
              }
            }
          } catch {}
          setItems([]);
          return;
        }

        // Đã đăng nhập: Truy vấn bảng cart_item liên kết với bảng courses
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

        let mapped: CartCourseItem[] = [];
        if (!error && data && data.length > 0) {
          mapped = (data as any[]).map((row) => ({
            id: row.id,
            courseId: row.course_id,
            title: row.courses?.title || "Khóa học",
            slug: row.courses?.slug || "",
            thumbnailUrl: row.courses?.thumbnail_url || null,
            instructorName: "Giảng viên LMS",
            level: row.courses?.level || "Cơ bản",
            price: Number(row.courses?.price || 0),
          }));
        }

        // Đồng bộ thêm các khóa học từ localStorage (nếu vừa bấm thêm trước đó)
        try {
          const demoIds: string[] = JSON.parse(localStorage.getItem("demo_cart_items") || "[]");
          const existingIds = new Set(mapped.map((m) => m.courseId));
          const missingIds = demoIds.filter((id) => !existingIds.has(id));

          if (missingIds.length > 0) {
            const { data: missingCourses } = await supabase
              .from("courses")
              .select("id, title, slug, price, thumbnail_url, level")
              .in("id", missingIds);

            if (missingCourses && missingCourses.length > 0) {
              for (const c of missingCourses as any[]) {
                await supabase.rpc("fn_add_to_cart", { p_course: c.id });
                mapped.push({
                  id: c.id,
                  courseId: c.id,
                  title: c.title,
                  slug: c.slug,
                  thumbnailUrl: c.thumbnail_url,
                  instructorName: "Giảng viên LMS",
                  level: c.level || "Cơ bản",
                  price: Number(c.price || 0),
                });
              }
            }
          }
        } catch {}

        setItems(mapped);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    async function fetchWishlist() {
      setWishlistLoading(true);
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          const { data, error } = await supabase
            .from("wishlist")
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
                profiles!courses_instructor_id_fkey (full_name)
              )
            `)
            .eq("user_id", session.user.id);

          if (!error && data && data.length > 0) {
            const list: WishlistCourseItem[] = [];
            for (const row of data as any[]) {
              const c = row.courses;
              if (c) {
                list.push({
                  id: row.id,
                  courseId: c.id,
                  title: c.title,
                  slug: c.slug,
                  thumbnailUrl: c.thumbnail_url,
                  instructorName: c.profiles?.full_name || "Giảng viên LMS",
                  level: c.level || "Cơ bản",
                  price: Number(c.price || 0),
                });
              }
            }
            setWishlistItems(list);
            return;
          }
        }

        // Fallback demo từ localStorage
        try {
          const demoWishIds: string[] = JSON.parse(localStorage.getItem("demo_wishlist") || "[]");
          if (demoWishIds.length > 0) {
            const { data: cData } = await supabase
              .from("courses")
              .select("id, title, slug, price, thumbnail_url, level, profiles!courses_instructor_id_fkey(full_name)")
              .in("id", demoWishIds);

            if (cData && cData.length > 0) {
              setWishlistItems(
                cData.map((c: any) => ({
                  id: c.id,
                  courseId: c.id,
                  title: c.title,
                  slug: c.slug,
                  thumbnailUrl: c.thumbnail_url,
                  instructorName: c.profiles?.full_name || "Giảng viên LMS",
                  level: c.level || "Cơ bản",
                  price: Number(c.price || 0),
                }))
              );
              return;
            }
          }
        } catch {}

        setWishlistItems([]);
      } catch {
        setWishlistItems([]);
      } finally {
        setWishlistLoading(false);
      }
    }

    fetchCart();
    fetchWishlist();

    const handleCartUpdated = () => {
      fetchCart();
      fetchWishlist();
    };
    window.addEventListener("cart-updated", handleCartUpdated);
    return () => {
      window.removeEventListener("cart-updated", handleCartUpdated);
    };
  }, []);

  // Khi giỏ tải xong: mặc định chọn tất cả khóa để thanh toán.
  useEffect(() => {
    if (!loading) setSelectedIds(new Set(items.map((i) => i.courseId)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Chuyển khóa học từ Yêu thích vào Giỏ hàng
  async function handleMoveToCart(wishItem: WishlistCourseItem) {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        await supabase.rpc("fn_add_to_cart", { p_course: wishItem.courseId });
        await supabase.rpc("fn_toggle_wishlist", { p_course: wishItem.courseId });
      }

      try {
        const cartIds: string[] = JSON.parse(localStorage.getItem("demo_cart_items") || "[]");
        if (!cartIds.includes(wishItem.courseId)) {
          cartIds.push(wishItem.courseId);
          localStorage.setItem("demo_cart_items", JSON.stringify(cartIds));
        }
        const wishIds: string[] = JSON.parse(localStorage.getItem("demo_wishlist") || "[]");
        const nextWish = wishIds.filter((id) => id !== wishItem.courseId);
        localStorage.setItem("demo_wishlist", JSON.stringify(nextWish));
      } catch {}

      setWishlistItems((prev) => prev.filter((w) => w.courseId !== wishItem.courseId));
      setItems((prev) => {
        if (prev.some((it) => it.courseId === wishItem.courseId)) return prev;
        return [
          ...prev,
          {
            id: `cart-${wishItem.courseId}`,
            courseId: wishItem.courseId,
            title: wishItem.title,
            slug: wishItem.slug,
            thumbnailUrl: wishItem.thumbnailUrl,
            instructorName: wishItem.instructorName,
            level: wishItem.level,
            price: wishItem.price,
          },
        ];
      });

      setFlash(`Đã chuyển khóa học "${wishItem.title}" vào giỏ hàng!`);
      setTimeout(() => setFlash(null), 3500);
      window.dispatchEvent(new Event("cart-updated"));
    } catch {
      setFlash("Không thể chuyển vào giỏ hàng. Vui lòng thử lại.");
    }
  }

  // Xóa khỏi danh sách yêu thích
  async function handleRemoveWishlist(courseId: string) {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        await supabase.rpc("fn_toggle_wishlist", { p_course: courseId });
      }

      try {
        const wishIds: string[] = JSON.parse(localStorage.getItem("demo_wishlist") || "[]");
        const nextWish = wishIds.filter((id) => id !== courseId);
        localStorage.setItem("demo_wishlist", JSON.stringify(nextWish));
      } catch {}

      setWishlistItems((prev) => prev.filter((w) => w.courseId !== courseId));
      setFlash("Đã xóa khóa học khỏi danh sách yêu thích");
      setTimeout(() => setFlash(null), 3000);
    } catch {
      setWishlistItems((prev) => prev.filter((w) => w.courseId !== courseId));
    }
  }

  // Chuyển khóa học từ Giỏ hàng sang Danh sách yêu thích
  async function handleMoveToWishlist(item: CartCourseItem) {
    await handleRemoveItem(item.courseId, item.id);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        await supabase.rpc("fn_toggle_wishlist", { p_course: item.courseId });
      }

      try {
        const wishIds: string[] = JSON.parse(localStorage.getItem("demo_wishlist") || "[]");
        if (!wishIds.includes(item.courseId)) {
          wishIds.push(item.courseId);
          localStorage.setItem("demo_wishlist", JSON.stringify(wishIds));
        }
      } catch {}

      setWishlistItems((prev) => {
        if (prev.some((w) => w.courseId === item.courseId)) return prev;
        return [
          {
            id: `wish-${item.courseId}`,
            courseId: item.courseId,
            title: item.title,
            slug: item.slug,
            thumbnailUrl: item.thumbnailUrl,
            instructorName: item.instructorName,
            level: item.level,
            price: item.price,
          },
          ...prev,
        ];
      });

      setFlash(`Đã chuyển khóa học "${item.title}" vào Danh sách yêu thích`);
      setTimeout(() => setFlash(null), 3000);
    } catch {}
  }

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
      // Xóa khỏi demo_cart_items nếu có
      try {
        const stored = localStorage.getItem("demo_cart_items");
        if (stored) {
          const parsed = JSON.parse(stored);
          const filtered = Array.isArray(parsed) ? parsed.filter((id: string) => id !== courseId) : [];
          localStorage.setItem("demo_cart_items", JSON.stringify(filtered));
        }
      } catch {}
      // Báo Navbar cập nhật badge
      window.dispatchEvent(new Event("cart-updated"));
    } catch {
      setItems((prev) => prev.filter((item) => item.courseId !== courseId && item.id !== itemId));
      try {
        const stored = localStorage.getItem("demo_cart_items");
        if (stored) {
          const parsed = JSON.parse(stored);
          const filtered = Array.isArray(parsed) ? parsed.filter((id: string) => id !== courseId) : [];
          localStorage.setItem("demo_cart_items", JSON.stringify(filtered));
        }
      } catch {}
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
      const courseIds = selectedItems.map((i) => i.courseId);

      // Gọi RPC fn_apply_coupon trong DB (chỉ trên các khóa đang chọn)
      const { data, error } = await supabase.rpc("fn_apply_coupon", {
        p_code: code,
        p_course_ids: courseIds,
      });

      if (error || data === null) {
        // Fallback kiểm tra các mã mẫu trong seed nếu DB chưa chạy RPC
        if (code === "WELCOME10") {
          const subtotal = selectedItems.reduce((sum, item) => sum + item.price, 0);
          const disc = Math.round(subtotal * 0.1);
          setDiscountAmount(disc);
          setAppliedCoupon("WELCOME10 (Giảm 10%)");
          setCouponCode("");
        } else if (code === "SAVE100K") {
          const subtotal = selectedItems.reduce((sum, item) => sum + item.price, 0);
          const disc = Math.min(subtotal, 100000);
          setDiscountAmount(disc);
          setAppliedCoupon("SAVE100K (Giảm 100.000₫)");
          setCouponCode("");
        } else {
          setCouponError("Mã giảm giá không hợp lệ hoặc đã hết lượt sử dụng");
        }
      } else {
        const finalPrice = Number(data);
        const subtotal = selectedItems.reduce((sum, item) => sum + item.price, 0);
        if (finalPrice === 0 && subtotal > 0) {
          setCouponError("Mã giảm giá không áp dụng cho các khóa học hiện tại trong giỏ");
          setAppliedCoupon(null);
          setDiscountAmount(0);
        } else {
          const calculatedDiscount = Math.max(0, subtotal - finalPrice);
          setDiscountAmount(calculatedDiscount);
          setAppliedCoupon(code);
          setCouponCode("");
        }
      }
    } catch {
      // Fallback cho mã mẫu
      if (code === "WELCOME10") {
        const subtotal = selectedItems.reduce((sum, item) => sum + item.price, 0);
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

  // Thanh toán mô phỏng (Mock Purchase) — CHỈ các khóa đang chọn.
  async function handleMockPurchase() {
    const paidIds = selectedItems.map((i) => i.courseId);
    if (paidIds.length === 0) return;
    setPurchasing(true);
    try {
      const supabase = createClient();
      await supabase.rpc("fn_mock_purchase", {
        p_course_ids: paidIds,
        p_coupon_code: appliedCoupon ? appliedCoupon.split(" ")[0] : null,
      });

      // Dọn dẹp các khóa học đã mua khỏi bảng cart_item trong DB
      for (const cid of paidIds) {
        await supabase.rpc("fn_remove_from_cart", { p_course: cid });
      }
    } catch {
      // Cho phép hoàn tất mô phỏng ngay cả khi RPC chưa sẵn sàng (môi trường test).
    } finally {
      // Gỡ các khóa đã mua khỏi giỏ, giữ lại phần còn lại.
      const paid = new Set(paidIds);
      const remaining = items.filter((i) => !paid.has(i.courseId));
      setItems(remaining);
      setSelectedIds(new Set(remaining.map((i) => i.courseId)));
      setAppliedCoupon(null);
      setDiscountAmount(0);
      try {
        const stored = localStorage.getItem("demo_cart_items");
        if (stored) {
          const parsed = JSON.parse(stored);
          const filtered = Array.isArray(parsed) ? parsed.filter((id: string) => !paid.has(id)) : [];
          localStorage.setItem("demo_cart_items", JSON.stringify(filtered));
        }
      } catch {}
      window.dispatchEvent(new Event("cart-updated"));
      if (remaining.length === 0) setPurchaseSuccess(true);
      else setFlash(`Đã thanh toán ${paidIds.length} khóa. Còn ${remaining.length} khóa trong giỏ.`);
      setPurchasing(false);
    }
  }

  const subtotal = selectedItems.reduce((sum, item) => sum + item.price, 0);
  const total = Math.max(0, subtotal - discountAmount);

  // MÀN HÌNH THANH TOÁN THÀNH CÔNG
  if (purchaseSuccess) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-lg space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 animate-in zoom-in-75">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">
              Thanh toán thành công!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Chúc mừng bạn đã ghi danh thành công vào khóa học. Toàn bộ nội dung bài giảng, video và bài
              kiểm tra trắc nghiệm đã được kích hoạt trong tài khoản của bạn.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/my"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
            >
              <BookOpen className="h-4 w-4" />
              <span>Vào học ngay tại Góc học tập</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/courses"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all active:scale-95"
            >
              <span>Xem thêm khóa học khác</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pt-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* CỘT TRÁI: DANH SÁCH MÓN HÀNG */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
            <h2 className="text-base font-black text-slate-900">
              Khóa học trong giỏ ({items.length})
            </h2>
            {items.length > 0 && (
              <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-600">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="h-4 w-4 accent-blue-600" />
                <span>Chọn tất cả</span>
              </label>
            )}
          </div>

          {flash && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{flash}</span>
            </div>
          )}

          {loading ? (
            <div className="flex py-12 items-center justify-center text-slate-400 text-xs">
              <Loader2 className="h-5 w-5 animate-spin mr-2 text-blue-600" />
              <span>Đang tải giỏ hàng...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <ShoppingBag className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">Giỏ hàng của bạn đang trống</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Bạn chưa chọn khóa học nào. Hãy khám phá khóa học mới hoặc chọn từ danh sách yêu thích bên dưới!
                </p>
              </div>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
              >
                <span>Khám phá khóa học ngay</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border bg-white p-5 shadow-sm transition-all ${
                  selectedIds.has(item.courseId) ? "border-blue-300 ring-1 ring-blue-200" : "border-slate-200/90 hover:border-blue-300"
                }`}
              >
                {/* THUMBNAIL & INFO */}
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.courseId)}
                    onChange={() => toggleSelect(item.courseId)}
                    aria-label={`Chọn thanh toán khóa ${item.title}`}
                    className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                  />
                  <div className="h-16 w-24 shrink-0 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-800 flex items-center justify-center overflow-hidden text-white">
                    <BookOpen className="h-6 w-6 text-blue-200" />
                  </div>

                  <div className="space-y-1">
                    <Link
                      href={`/courses/${item.slug}`}
                      className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors line-clamp-1"
                    >
                      {item.title}
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-medium">
                        <User className="h-3 w-3 text-blue-600" />
                        {item.instructorName}
                      </span>
                      <span>•</span>
                      <span className="capitalize bg-slate-100 px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-600">
                        {item.level}
                      </span>
                    </div>
                  </div>
                </div>

                {/* PRICE & REMOVE BUTTON */}
                <div className="flex items-center justify-between sm:justify-end gap-3 border-t border-slate-100 sm:border-0 pt-2 sm:pt-0">
                  <span className="text-base font-black text-blue-600 font-mono">
                    {item.price > 0 ? formatPrice(item.price) : "Miễn phí"}
                  </span>

                  <button
                    onClick={() => handleMoveToWishlist(item)}
                    title="Chuyển vào danh sách yêu thích"
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 transition-colors px-2.5 py-1.5 rounded-full border border-slate-200 hover:border-rose-200 hover:bg-rose-50"
                  >
                    <Heart className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Lưu sau</span>
                  </button>

                  <button
                    onClick={() => handleRemoveItem(item.courseId, item.id)}
                    title="Xóa khỏi giỏ"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all"
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
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-5 sticky top-24">
          <h3 className="text-base font-black text-slate-900 pb-2 border-b border-slate-100">
            Tổng kết đơn hàng
          </h3>

          {/* Ô NHẬP MÃ COUPON */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-blue-600" />
              <span>Mã ưu đãi (Coupon)</span>
            </label>

            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700 font-bold">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Mã: {appliedCoupon}</span>
                </div>
                <button
                  onClick={handleRemoveCoupon}
                  className="hover:text-rose-600 transition-colors ml-2"
                  title="Hủy mã"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Nhập mã (VD: SAVE100K)"
                    className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase font-mono font-semibold"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={applyingCoupon || !couponCode.trim()}
                    className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-blue-600 disabled:opacity-50 transition-all shrink-0 active:scale-95"
                  >
                    {applyingCoupon ? "..." : "Áp dụng"}
                  </button>
                </div>

                {couponError && (
                  <p className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{couponError}</span>
                  </p>
                )}

                {/* GỢI Ý MÃ SẴN CÓ */}
                <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-slate-400 font-medium">Mã hot:</span>
                  <button
                    onClick={() => setCouponCode("SAVE100K")}
                    className="rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 font-mono font-bold text-blue-700 hover:bg-blue-100 transition-all"
                  >
                    SAVE100K (-100k)
                  </button>
                  <button
                    onClick={() => setCouponCode("WELCOME10")}
                    className="rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 font-mono font-bold text-blue-700 hover:bg-blue-100 transition-all"
                  >
                    WELCOME10 (-10%)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* BẢNG GIÁ */}
          <div className="border-t border-slate-100 pt-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-500 font-medium">
              <span>Tạm tính ({selectedItems.length} khóa đã chọn)</span>
              <span className="font-bold text-slate-800 font-mono">{formatPrice(subtotal)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Ưu đãi giảm giá</span>
                <span className="font-mono">-{formatPrice(discountAmount)}</span>
              </div>
            )}

            <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
              <span className="font-bold text-slate-900 text-sm">Tổng thanh toán</span>
              <span className="text-2xl font-black text-blue-600 font-mono tracking-tight">
                {formatPrice(total)}
              </span>
            </div>
          </div>

          {/* NÚT THANH TOÁN */}
          <button
            onClick={handleMockPurchase}
            disabled={purchasing || selectedItems.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 py-3.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
          >
            {purchasing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Đang xử lý đơn hàng...</span>
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                <span>
                  {selectedItems.length === 0
                    ? "Chọn khóa để thanh toán"
                    : `Thanh toán ${selectedItems.length} khóa đã chọn (Mô phỏng)`}
                </span>
              </>
            )}
          </button>

          {/* CAM KẾT */}
          <div className="pt-2 text-center">
            <p className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Thanh toán mô phỏng an toàn • Truy cập vĩnh viễn</span>
            </p>
          </div>
        </div>
      </div>
    </div>

      {/* KHỐI 2: DANH SÁCH KHÓA HỌC YÊU THÍCH (WISHLIST) */}
      <section id="wishlist" className="pt-8 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shadow-xs">
              <Heart className="h-5 w-5 fill-rose-500 text-rose-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Danh sách khóa học yêu thích (Wishlist)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Những khóa học bạn đã lưu tim để theo dõi hoặc chuẩn bị đăng ký học
              </p>
            </div>
          </div>

          <span className="self-start sm:self-auto rounded-full bg-slate-100 border border-slate-200/80 px-3 py-1 text-xs font-bold text-slate-700">
            {wishlistItems.length} khóa học
          </span>
        </div>

        {wishlistLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-xs font-medium">Đang tải danh sách yêu thích...</span>
          </div>
        ) : wishlistItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-400">
              <Heart className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">
              Danh sách yêu thích của bạn đang trống
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Khi xem các khóa học, bạn hãy bấm vào nút &quot;Lưu vào danh sách yêu thích&quot; để lưu lại các khóa học bạn quan tâm vào đây.
            </p>
            <div className="pt-1">
              <Link
                href="/courses"
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <span>Khám phá khóa học ngay</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {wishlistItems.map((wish) => {
              const inCart = items.some((it) => it.courseId === wish.courseId);
              return (
                <div
                  key={wish.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:shadow-md transition-all group"
                >
                  <div className="space-y-3">
                    <div className="relative aspect-video w-full rounded-xl bg-slate-100 overflow-hidden">
                      {wish.thumbnailUrl ? (
                        <img
                          src={wish.thumbnailUrl}
                          alt={wish.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-slate-100 to-rose-50 text-rose-500">
                          <Heart className="h-8 w-8 fill-rose-200 text-rose-400" />
                        </div>
                      )}
                      <span className="absolute top-2 left-2 rounded-full bg-slate-900/70 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-bold text-white uppercase">
                        {wish.level}
                      </span>
                    </div>

                    <div>
                      <Link
                        href={`/courses/${wish.slug}`}
                        className="font-bold text-sm text-slate-900 hover:text-blue-600 transition-colors line-clamp-2 leading-snug"
                      >
                        {wish.title}
                      </Link>
                      <p className="text-[11px] text-slate-400 mt-1 font-medium flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" />
                        <span>{wish.instructorName}</span>
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 mt-4 space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] text-slate-400 font-medium">Học phí</span>
                      <span className="text-base font-black text-blue-600 font-mono">
                        {wish.price === 0 ? "Miễn phí" : formatPrice(wish.price)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {inCart ? (
                        <div className="flex-1 text-center py-2 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-full border border-emerald-100">
                          ✓ Đã trong giỏ
                        </div>
                      ) : (
                        <button
                          onClick={() => handleMoveToCart(wish)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-blue-600 py-2 px-3 text-xs font-bold text-white hover:bg-blue-700 shadow-xs transition-all active:scale-95"
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />
                          <span>Chuyển vào giỏ</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleRemoveWishlist(wish.courseId)}
                        title="Bỏ thích"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all active:scale-95"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
