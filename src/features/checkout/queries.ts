import { createClient } from "@/lib/supabase/server";

export interface CartItem {
  courseId: string;
  title: string;
  price: number;
  thumbnailUrl: string | null;
}

// LƯU Ý: chưa có query chính thức cho giỏ hàng trong commerce.ts (L chỉ có add/remove) —
// đọc trực tiếp cart_item + courses. Đọc dữ liệu, rủi ro thấp hơn ghi trực tiếp.
export async function getCartItems(): Promise<CartItem[]> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from("cart_item")
    .select("course_id, courses(title, price, thumbnail_url, status)")
    .eq("user_id", userData.user.id);

  if (error) throw error;

  return (data ?? [])
    .filter((row) => row.courses && (row.courses as any).status === "published")
    .map((row) => {
      const course = row.courses as any;
      return {
        courseId: String(row.course_id),
        title: String(course.title),
        price: Number(course.price),
        thumbnailUrl: typeof course.thumbnail_url === "string" ? course.thumbnail_url : null,
      };
    });
}