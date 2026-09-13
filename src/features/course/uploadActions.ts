"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/queries/auth";

export async function uploadLessonVideo(formData: FormData) {
  const profile = await requireRole(["instructor", "admin"]);
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