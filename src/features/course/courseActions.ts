"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/queries/auth";

const editorPath = (courseId: string) => `/studio/${courseId}`;

export async function addChapter(formData: FormData) {
  const courseId = String(formData.get("courseId"));
  const supabase = createClient();
  const { data } = await supabase
    .from("chapters")
    .select("position")
    .eq("course_id", courseId)
    .order("position", { ascending: false })
    .limit(1);
  const { error } = await supabase.from("chapters").insert({
    course_id: courseId,
    title: String(formData.get("title")).trim(),
    position: Number(data?.[0]?.position ?? 0) + 1,
  });
  if (error) throw error;
  revalidatePath(editorPath(courseId));
}

export async function addLesson(formData: FormData) {
  const courseId = String(formData.get("courseId"));
  const chapterId = String(formData.get("chapterId"));
  const supabase = createClient();
  const { data } = await supabase
    .from("lessons")
    .select("position")
    .eq("chapter_id", chapterId)
    .order("position", { ascending: false })
    .limit(1);
  const { error } = await supabase.from("lessons").insert({
    chapter_id: chapterId,
    title: String(formData.get("title")).trim(),
    video_url: String(formData.get("videoUrl")).trim() || null,
    duration_seconds: Number(formData.get("durationSeconds") || 0),
    is_free: formData.get("isFree") === "on",
    position: Number(data?.[0]?.position ?? 0) + 1,
  });
  if (error) throw error;
  revalidatePath(editorPath(courseId));
}

export async function updateCourse(formData: FormData) {
  const courseId = String(formData.get("courseId"));
  const supabase = createClient();
  const { error } = await supabase
    .from("courses")
    .update({
      title: String(formData.get("title")).trim(),
      description: String(formData.get("description")).trim(),
      price: Number(formData.get("price")),
    })
    .eq("id", courseId);
  if (error) throw error;
  revalidatePath(editorPath(courseId));
  revalidatePath("/studio");
}

export async function submitForReview(formData: FormData) {
  const courseId = String(formData.get("courseId"));
  const profile = await requireRole(["instructor", "admin"]);
  const supabase = createClient();

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, instructor_id, status")
    .eq("id", courseId)
    .single();
  if (courseError) throw courseError;
  if (!course || (course.instructor_id !== profile.id && profile.role !== "admin")) {
    throw new Error("Không có quyền thực hiện.");
  }
  if (!["draft", "rejected"].includes(String(course.status))) {
    throw new Error("Chỉ gửi duyệt được khi khóa đang ở trạng thái Nháp hoặc Bị từ chối.");
  }

  const { data: chapterRows } = await supabase.from("chapters").select("id").eq("course_id", courseId);
  const chapterIds = (chapterRows ?? []).map((row) => row.id);
  if (chapterIds.length === 0) throw new Error("Cần ít nhất 1 chương trước khi gửi duyệt.");

  const { count: lessonCount } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .in("chapter_id", chapterIds);
  if (!lessonCount) throw new Error("Cần ít nhất 1 bài học trước khi gửi duyệt.");

  const { error: updateError } = await supabase.from("courses").update({ status: "pending" }).eq("id", courseId);
  if (updateError) throw updateError;

  revalidatePath(editorPath(courseId));
  revalidatePath("/studio");
}
export async function updateChapterTitle(chapterId: string, courseId: string, title: string) {
  await requireRole(["instructor", "admin"]);
  const supabase = createClient();
  const { error } = await supabase.from("chapters").update({ title: title.trim() }).eq("id", chapterId);
  if (error) throw error;
  revalidatePath(editorPath(courseId));
}

export async function deleteChapter(chapterId: string, courseId: string) {
  await requireRole(["instructor", "admin"]);
  const supabase = createClient();

  // Xóa bài học con trước (chưa có ON DELETE CASCADE xác nhận) — an toàn dù có cascade hay không.
  const { error: lessonsError } = await supabase.from("lessons").delete().eq("chapter_id", chapterId);
  if (lessonsError) throw lessonsError;

  const { error: chapterError } = await supabase.from("chapters").delete().eq("id", chapterId);
  if (chapterError) throw chapterError;

  revalidatePath(editorPath(courseId));
}

export async function updateLesson(
  lessonId: string,
  courseId: string,
  input: { title: string; videoUrl: string | null; durationSeconds: number; isFree: boolean },
) {
  await requireRole(["instructor", "admin"]);
  const supabase = createClient();
  const { error } = await supabase
    .from("lessons")
    .update({
      title: input.title.trim(),
      video_url: input.videoUrl,
      duration_seconds: input.durationSeconds,
      is_free: input.isFree,
    })
    .eq("id", lessonId);
  if (error) throw error;
  revalidatePath(editorPath(courseId));
}

export async function deleteLesson(lessonId: string, courseId: string) {
  await requireRole(["instructor", "admin"]);
  const supabase = createClient();
  // TODO: chưa xóa file video trong Storage lẫn quiz/questions liên kết (nếu có) — chỉ xóa dòng lessons.
  // Nếu DB báo lỗi ràng buộc khóa ngoại (questions.lesson_id → lessons.id), cần hỏi M2 cách xử lý.
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) throw error;
  revalidatePath(editorPath(courseId));
}