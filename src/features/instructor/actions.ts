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

// Giảng viên gửi nhận xét quá trình học cho 1 học viên (fn_send_feedback kiểm quyền).
export async function sendFeedbackAction(formData: FormData) {
  let msg = "";
  let err: string | null = null;
  try {
    const supabase = createClient();
    const { error } = await supabase.rpc("fn_send_feedback", {
      p_course: String(formData.get("courseId")),
      p_student: String(formData.get("studentId")),
      p_content: String(formData.get("content") ?? ""),
    });
    if (error) throw error;
    msg = "Đã gửi nhận xét cho học viên.";
  } catch (e) {
    err = e instanceof Error ? e.message : "Có lỗi xảy ra.";
  }
  revalidatePath("/studio/students");
  redirect(`/studio/students?${err ? "error=" + encodeURIComponent(err) : "ok=" + encodeURIComponent(msg)}`);
}

// Giảng viên đề xuất cảnh cáo/đình chỉ/đuổi học; admin phê duyệt tại khu quản trị.
export async function requestStudentDisciplineAction(formData: FormData) {
  let msg = "";
  let err: string | null = null;
  try {
    const supabase = createClient();
    const { error } = await supabase.rpc("fn_request_student_discipline", {
      p_enrollment: String(formData.get("enrollmentId")),
      p_action: String(formData.get("action")),
      p_reason: String(formData.get("reason") ?? ""),
    });
    if (error) throw error;
    msg = "Đã gửi đề xuất xử lý học viên cho admin.";
  } catch (e) {
    err = e instanceof Error ? e.message : "Có lỗi xảy ra.";
  }
  revalidatePath("/studio/students");
  redirect(`/studio/students?${err ? "error=" + encodeURIComponent(err) : "ok=" + encodeURIComponent(msg)}`);
}
