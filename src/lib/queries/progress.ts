// Chủ: M2. Tiến độ học. (Gọi hàm/trigger ở migration 0005.)
// TODO(M2): điền thân.

export async function updateWatch(_lessonId: string, _percent: number) {
  // TODO(M2): supabase.rpc("fn_update_watch", { p_lesson, p_percent })
  throw new Error("TODO(M2): fn_update_watch chưa được hiện thực (migration 0005).");
}

export async function savePosition(_lessonId: string, _seconds: number) {
  // TODO(M2): supabase.rpc("fn_save_position", { p_lesson, p_seconds })
  throw new Error("TODO(M2): fn_save_position chưa được hiện thực (migration 0005).");
}

export async function markComplete(_lessonId: string) {
  // TODO(M2): supabase.rpc("fn_mark_complete", { p_lesson })
  throw new Error("TODO(M2): fn_mark_complete chưa được hiện thực (migration 0005).");
}

export async function getCourseProgress(_courseId: string): Promise<number> {
  // TODO(M2): select from view_course_progress
  throw new Error("TODO(M2): view_course_progress chưa được hiện thực (migration 0005).");
}
