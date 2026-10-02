"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/auth";

export interface ReviewFormState {
  ok?: string;
  error?: string;
}

// Viết hoặc sửa review của chính mình (1 người 1 review / khóa).
// RLS reviews_insert_enrolled bắt buộc đã ghi danh; trigger trg_reviews_guard_status
// đưa review về 'pending' để admin duyệt trước khi hiển thị.
export async function submitReviewAction(_prev: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  const courseId = String(formData.get("courseId") ?? "");
  const coursePath = String(formData.get("coursePath") ?? "");
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Vui lòng chọn số sao từ 1 đến 5." };
  if (comment.length > 2000) return { error: "Nhận xét tối đa 2000 ký tự." };

  const user = await getCurrentUser();
  if (!user) return { error: "Vui lòng đăng nhập để đánh giá." };

  const supabase = createClient();
  const { error } = await supabase
    .from("reviews")
    .upsert({ course_id: courseId, user_id: user.id, rating, comment: comment || null }, { onConflict: "course_id,user_id" });
  if (error) {
    // 42501 = vi phạm RLS → chưa ghi danh (hoặc ghi danh đã bị hoàn tiền).
    return { error: error.code === "42501" ? "Bạn cần ghi danh khóa học này để đánh giá." : error.message };
  }

  if (coursePath.startsWith("/courses/")) revalidatePath(coursePath);
  return { ok: "Cảm ơn bạn! Đánh giá sẽ hiển thị sau khi được quản trị viên duyệt." };
}
