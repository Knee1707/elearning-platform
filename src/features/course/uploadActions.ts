"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES } from "@/lib/utils";

export async function uploadLessonVideo(formData: FormData) {
  const profile = await requireRole(["instructor", ...ADMIN_ROLES]);
  const supabase = createClient();

  const courseId = String(formData.get("courseId"));
  const lessonId = String(formData.get("lessonId"));
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    throw new Error("Vui lòng chọn file video.");
  }

  // Giới hạn 500MB — chỉnh lại nếu nhóm có quy định khác.
  if (file.size > 500 * 1024 * 1024) {
    throw new Error("File video vượt quá 500MB.");
  }

  const ext = file.name.split(".").pop() ?? "mp4";
  const path = `${profile.id}/${lessonId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("lesson-videos")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) throw uploadError;

  const { error: updateError } = await supabase
    .from("lessons")
    .update({ video_url: path, video_status: "ready" })
    .eq("id", lessonId);

  if (updateError) throw updateError;

  revalidatePath(`/studio/${courseId}`);
}
export async function uploadLessonAttachment(formData: FormData) {
  const profile = await requireRole(["instructor", ...ADMIN_ROLES]);
  const supabase = createClient();

  const courseId = String(formData.get("courseId"));
  const lessonId = String(formData.get("lessonId"));
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    throw new Error("Vui lòng chọn file tài liệu.");
  }
  if (file.type !== "application/pdf") {
    throw new Error("Chỉ chấp nhận file PDF.");
  }
  if (file.size > 50 * 1024 * 1024) {
    throw new Error("File PDF vượt quá 50MB.");
  }

  const path = `${profile.id}/${lessonId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("lesson-attachments")
    .upload(path, file, { contentType: "application/pdf", upsert: false });
  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage.from("lesson-attachments").getPublicUrl(path);
  // LƯU Ý: bucket là PRIVATE, getPublicUrl() ở đây chỉ dùng để LƯU đường dẫn tham chiếu vào cột
  // file_url — không phải URL truy cập được trực tiếp. Khi đọc lại, phải qua fn_get_attachment
  // (kiểm quyền phía DB) để đổi ra URL tạm thời (signed URL) thật sự truy cập được.

  const { error: insertError } = await supabase.from("attachments").insert({
    lesson_id: lessonId,
    name: file.name.replace(/\.pdf$/i, ""),
    file_url: publicUrlData.publicUrl,
    type: "pdf",
  });
  if (insertError) throw insertError;

  revalidatePath(`/studio/${courseId}`);
}

export async function deleteAttachment(attachmentId: string, courseId: string) {
  await requireRole(["instructor", ...ADMIN_ROLES]);
  const supabase = createClient();
  const { error } = await supabase.from("attachments").delete().eq("id", attachmentId);
  if (error) throw error;
  revalidatePath(`/studio/${courseId}`);
}