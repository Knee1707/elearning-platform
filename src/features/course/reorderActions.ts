"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/queries/auth";

// LƯU Ý: chưa có fn_reorder (RPC) — update từng dòng position, workaround tạm.
// Cần đổi sang RPC 1 lệnh khi M1/L viết xong, để đảm bảo tính nguyên tử (atomic).
async function applyPositions(table: "chapters" | "lessons", orderedIds: string[]) {
  const supabase = createClient();
  const results = await Promise.all(
    orderedIds.map((id, index) => supabase.from(table).update({ position: index + 1 }).eq("id", id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

export async function reorderChapters(courseId: string, orderedChapterIds: string[]) {
  await requireRole(["instructor", "admin"]);
  await applyPositions("chapters", orderedChapterIds);
  revalidatePath(`/studio/${courseId}`);
}

export async function reorderLessons(courseId: string, orderedLessonIds: string[]) {
  await requireRole(["instructor", "admin"]);
  await applyPositions("lessons", orderedLessonIds);
  revalidatePath(`/studio/${courseId}`);
}