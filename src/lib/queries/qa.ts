// Chủ: M2. Hỏi–đáp dưới bài + ghi chú theo mốc + thông báo. (Migration 0005.)
// TODO(M2): điền thân.

export async function addNote(_lessonId: string, _seconds: number, _content: string) {
  // TODO(M2): supabase.rpc("fn_add_note", { p_lesson, p_seconds, p_content })
  throw new Error("TODO(M2): fn_add_note chưa được hiện thực (migration 0005).");
}

export async function askQuestion(_lessonId: string, _content: string) {
  // TODO(M2): supabase.rpc("fn_ask_question", { p_lesson, p_content })
  throw new Error("TODO(M2): fn_ask_question chưa được hiện thực (migration 0005).");
}

export async function answerQuestion(_questionId: string, _content: string) {
  // TODO(M2): supabase.rpc("fn_answer_question", { p_question, p_content })
  throw new Error("TODO(M2): fn_answer_question chưa được hiện thực (migration 0005).");
}

export async function markRead(_notificationId: string) {
  // TODO(M2): supabase.rpc("fn_mark_read", { p_notification })
  throw new Error("TODO(M2): fn_mark_read chưa được hiện thực (migration 0005).");
}
