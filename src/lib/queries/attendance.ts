/**
 * Module: Điểm danh tự động và Báo cáo chuyên cần (Attendance Queries)
 * Thành viên phụ trách: M2 - DATA (Học tập & Đánh giá)
 *
 * Hợp đồng Data ↔ App (Mục 6 & Mục 8 PHAN_CONG.md):
 * Hệ thống điểm danh hoàn toàn TỰ ĐỘNG, không cho phép thao tác điểm danh thủ công:
 * 1. Điểm danh Video: Trigger `trg_attendance_on_video` tự động ghi nhận khi học viên xem >= 95% video.
 * 2. Điểm danh Học trực tiếp: Hàm `fn_join_live_session` ghi nhận có mặt TRƯỚC rồi mới trả đường link Google Meet.
 * 3. Báo cáo điểm danh: View `view_attendance` phục vụ trang cá nhân học viên và bảng theo dõi của giảng viên.
 */

import { createClient } from "@/lib/supabase/client";

/**
 * Kiểu dữ liệu bản ghi điểm danh đầy đủ thông tin cho giao diện.
 * Được ánh xạ tự động từ view_attendance (snake_case) sang TypeScript (camelCase).
 */
export interface AttendanceRecord {
  id: string;                   // UUID của bản ghi điểm danh
  userId: string;               // UUID của học viên
  studentName: string;          // Họ tên đầy đủ của học viên
  courseId: string;             // UUID của khóa học
  courseTitle: string;          // Tên khóa học
  source: "video" | "live";     // Nguồn điểm danh: qua video bài giảng hay qua buổi học trực tiếp
  lessonId: string | null;      // UUID bài học (nếu điểm danh qua video)
  lessonTitle: string | null;   // Tên bài học (nếu có)
  liveSessionId: string | null; // UUID buổi học trực tiếp (nếu điểm danh qua live)
  liveSessionTitle: string | null; // Tên buổi live (nếu có)
  scheduledAt: string | null;   // Thời gian buổi học được lên lịch
  attendedAt: string;           // Thời điểm hệ thống ghi nhận điểm danh (ISO string)
}

/**
 * Tham gia buổi học trực tiếp (Live Session) kèm điểm danh tự động.
 *
 * Nghiệp vụ chi tiết (Mục 8b PHAN_CONG.md):
 * - Được gọi khi học viên bấm nút "Vào học trực tiếp" tại màn hình học tập.
 * - Cơ chế bảo đảm tính trung thực:
 *   1. Hàm DB `fn_join_live_session` thực hiện ghi bản ghi `attendance(source='live')` vào DB trước.
 *   2. Sau khi ghi thành công, hàm mới trả về đường link `meet_url` để Frontend chuyển hướng sang Google Meet.
 *   3. Vì việc điểm danh gắn chặt vào thao tác lấy link, học viên không thể vào phòng học mà "quên" điểm danh.
 * - Ràng buộc UNIQUE `uq_attendance_once` bảo đảm nếu học viên bấm nút nhiều lần thì hệ thống cũng chỉ ghi nhận 1 lần duy nhất.
 *
 * @param liveId UUID của buổi học trực tiếp cần tham gia
 * @returns Đường link URL của phòng họp Google Meet để mở tab mới
 */
export async function joinLiveSession(liveId: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_join_live_session", {
    p_live: liveId,
  });

  if (error) throw new Error(`fn_join_live_session: ${error.message}`);
  if (!data) throw new Error("Không lấy được link Google Meet");

  return data as string;
}

/**
 * Lấy danh sách lịch sử điểm danh của chính học viên đang đăng nhập.
 *
 * Nghiệp vụ chi tiết:
 * - Được trang "Điểm danh của tôi" (M3: /student) sử dụng để người học theo dõi chuyên cần.
 * - Cơ chế RLS: View `view_attendance` tự động lọc theo `auth.uid()`, học viên không thể xem dữ liệu của người khác.
 *
 * @param courseId UUID của khóa học cần kiểm tra
 * @returns Danh sách các lần đã được điểm danh (cả qua video lẫn qua buổi live)
 */
export async function getMyAttendance(courseId: string): Promise<AttendanceRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("view_attendance")
    .select("*")
    .eq("course_id", courseId);

  if (error) throw new Error(`view_attendance (my): ${error.message}`);

  return mapAttendanceRows(data ?? []);
}

/**
 * Lấy toàn bộ danh sách điểm danh của một lớp học dành cho Giảng viên phụ trách.
 *
 * Nghiệp vụ chi tiết:
 * - Được màn hình Quản lý lớp của Giảng viên (M4: /instructor/live) sử dụng để tổng kết danh sách học viên có mặt.
 * - Cơ chế RLS: Giảng viên chỉ xem được danh sách điểm danh của các khóa học do chính mình giảng dạy.
 *
 * @param courseId UUID của khóa học cần xem báo cáo
 * @returns Toàn bộ danh sách điểm danh của các học viên trong khóa
 */
export async function getClassAttendance(courseId: string): Promise<AttendanceRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("view_attendance")
    .select("*")
    .eq("course_id", courseId);

  if (error) throw new Error(`view_attendance (class): ${error.message}`);

  return mapAttendanceRows(data ?? []);
}

/**
 * Hàm tiện ích nội bộ: Chuyển đổi định dạng dữ liệu từ snake_case của PostgreSQL sang camelCase của TypeScript.
 *
 * Quy chuẩn:
 * - Tuân thủ tuyệt đối quy ước B trong CONVENTIONS.md (tầng lib/queries có nhiệm vụ chuyển đổi để UI nhận camelCase sạch).
 *
 * @param rows Danh sách bản ghi thô từ view_attendance
 * @returns Mảng đối tượng AttendanceRecord chuẩn định dạng
 */
function mapAttendanceRows(
  rows: Array<Record<string, unknown>>,
): AttendanceRecord[] {
  return rows.map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    studentName: row.student_name as string,
    courseId: row.course_id as string,
    courseTitle: row.course_title as string,
    source: row.source as "video" | "live",
    lessonId: (row.lesson_id as string | null) ?? null,
    lessonTitle: (row.lesson_title as string | null) ?? null,
    liveSessionId: (row.live_session_id as string | null) ?? null,
    liveSessionTitle: (row.live_session_title as string | null) ?? null,
    scheduledAt: (row.scheduled_at as string | null) ?? null,
    attendedAt: row.attended_at as string,
  }));
}
