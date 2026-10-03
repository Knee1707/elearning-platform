"use client";

import { useState } from "react";
import { ShoppingCart, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface QuickAddToCartProps {
  courseId: string;
  courseTitle?: string;
  price?: number;
}

export function QuickAddToCart({ courseId }: QuickAddToCartProps) {
  const [isAdded, setIsAdded] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (loading || isAdded) return;
    setLoading(true);

    try {
      // 1. Cập nhật localStorage demo_cart_items để Navbar và giỏ hàng nhận biết tức thì
      try {
        const stored = localStorage.getItem("demo_cart_items");
        const items: string[] = stored ? JSON.parse(stored) : [];
        if (!items.includes(courseId)) {
          items.push(courseId);
          localStorage.setItem("demo_cart_items", JSON.stringify(items));
        }
      } catch {}

      // 2. Thêm vào giỏ hàng Supabase nếu người dùng đã đăng nhập
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { error } = await supabase.rpc("fn_add_to_cart", { p_course: courseId });
        if (error) {
          // Fallback chèn trực tiếp vào bảng cart_item nếu RPC gặp lỗi
          await supabase.from("cart_item").upsert(
            {
              user_id: session.user.id,
              course_id: courseId,
            },
            { onConflict: "user_id,course_id" },
          );
        }
      }

      // 3. Bắn event cập nhật badge giỏ hàng trên thanh điều hướng
      window.dispatchEvent(new Event("cart-updated"));

      setIsAdded(true);
      setTimeout(() => {
        setIsAdded(false);
      }, 2500);
    } catch {
      // Bỏ qua lỗi mạng
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleAddToCart}
      disabled={loading}
      title={isAdded ? "Đã thêm vào giỏ hàng" : "Thêm khóa học vào giỏ hàng"}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all shadow-xs active:scale-95 ${
        isAdded
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20"
      }`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isAdded ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-600" />
          <span>Đã thêm</span>
        </>
      ) : (
        <>
          <ShoppingCart className="h-3.5 w-3.5" />
          <span>Thêm vào giỏ</span>
        </>
      )}
    </button>
  );
}
