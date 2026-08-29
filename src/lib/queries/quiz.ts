// Chủ: M2. Quiz/thi + chấm điểm phía DB + chứng chỉ. (Migration 0005.)
// TODO(M2): điền thân. LƯU Ý chống gian lận: KHÔNG trả is_correct cho học viên.

export async function getQuiz(_quizId: string) {
  // TODO(M2): supabase.rpc("fn_get_quiz", { p_quiz }) — trả câu hỏi + đáp án KHÔNG kèm is_correct
  throw new Error("TODO(M2): fn_get_quiz chưa được hiện thực (migration 0005).");
}

export async function submitAttempt(_examId: string, _answers: Record<string, string>): Promise<number> {
  // TODO(M2): supabase.rpc("fn_submit_attempt", { p_exam, p_answers }) — chấm phía DB, trả điểm
  throw new Error("TODO(M2): fn_submit_attempt chưa được hiện thực (migration 0005).");
}

export async function verifyCertificate(_code: string) {
  // TODO(M2): supabase.rpc("fn_verify_certificate", { p_code })
  throw new Error("TODO(M2): fn_verify_certificate chưa được hiện thực (migration 0005).");
}
