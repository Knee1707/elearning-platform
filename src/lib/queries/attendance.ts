// Chủ: M2. Điểm danh video (tự động qua trigger) + join Meet + báo cáo. (Migration 0005.)
// TODO(M2): điền thân.

export async function joinLiveSession(_liveId: string): Promise<string> {
  // TODO(M2): supabase.rpc("fn_join_live_session", { p_live }) → ghi attendance(live) + trả meet_url
  throw new Error("TODO(M2): fn_join_live_session chưa được hiện thực (migration 0005).");
}

export async function getMyAttendance(_courseId: string) {
  // TODO(M2): select from view_attendance (lọc theo user hiện tại)
  throw new Error("TODO(M2): view_attendance chưa được hiện thực (migration 0005).");
}

export async function getClassAttendance(_courseId: string) {
  // TODO(M2): select from view_attendance (theo lớp — GV dùng)
  throw new Error("TODO(M2): view_attendance chưa được hiện thực (migration 0005).");
}
