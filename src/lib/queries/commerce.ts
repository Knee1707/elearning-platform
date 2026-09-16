import { createClient } from "@/lib/supabase/server";

// Chủ: L. Giỏ hàng, wishlist, mua mô phỏng, hoàn tiền.
// Mỗi hàm gọi đúng function SQL trong migration 0006 (server-side).

export async function addToCart(courseId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("fn_add_to_cart", { p_course: courseId });
  if (error) throw error;
}

export async function removeFromCart(courseId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("fn_remove_from_cart", { p_course: courseId });
  if (error) throw error;
}

/** Trả về true nếu vừa THÊM vào wishlist, false nếu vừa BỎ. */
export async function toggleWishlist(courseId: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_toggle_wishlist", { p_course: courseId });
  if (error) throw error;
  return Boolean(data);
}

export async function mockPurchase(courseIds: string[], couponCode?: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_mock_purchase", {
    p_course_ids: courseIds,
    p_coupon_code: couponCode ?? null,
  });
  if (error) throw error;
  return Array.isArray(data) ? data.map(String) : [];
}

export async function requestRefund(paymentId: string, reason: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("fn_request_refund", {
    p_payment: paymentId,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function isEnrolled(courseId: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_is_enrolled", { cid: courseId });
  if (error) throw error;
  return Boolean(data);
}
