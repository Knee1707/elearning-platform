"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Giảng viên duyệt / từ chối yêu cầu vào lớp (khóa miễn phí). DB (fn_review_enroll)
// kiểm quyền: chỉ chủ khóa hoặc admin. Trả về /studio/students kèm ?ok=/?error=.
export async function reviewEnrollAction(formData: FormData) {
  const approve = String(formData.get("approve")) === "true";
  let msg = "";
  let err: string | null = null;
  try {
    const supabase = createClient();
    const { error } = await supabase.rpc("fn_review_enroll", {
      p_enrollment: String(formData.get("enrollmentId")),
      p_approve: approve,
    });
    if (error) throw error;
    msg = approve ? "Đã duyệt học viên vào lớp." : "Đã từ chối yêu cầu.";
  } catch (e) {
    err = e instanceof Error ? e.message : "Có lỗi xảy ra.";
  }
  revalidatePath("/studio/students");
  redirect(`/studio/students?${err ? "error=" + encodeURIComponent(err) : "ok=" + encodeURIComponent(msg)}`);
}
