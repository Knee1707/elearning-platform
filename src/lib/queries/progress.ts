/**
 * Module: Quản lý tiến độ học tập (Progress Queries)
 * Thành viên phụ trách: M2 - DATA (Học tập & Đánh giá)
 *
 * Hợp đồng Data ↔ App (Mục 6 PHAN_CONG.md):
 * Cung cấp các hàm cập nhật và tra cứu tiến độ học tập của học viên.
 * Phía App (Client / Server Component) chỉ gọi qua các hàm này, không viết SQL trực tiếp.
 */

import { createClient } from "@/lib/supabase/client";

/**
 * Kiểu dữ liệu thông tin tiến độ tổng thể của một khóa học.
 * Tên các trường tuân thủ quy ước camelCase của TypeScript (khớp với view_course_progress ở DB).
 */
export interface CourseProgress {
  userId: string;          // UUID của học viên đang học
  courseId: string;        // UUID của khóa học
  courseTitle: string;     // Tên tiêu đề khóa học
  totalLessons: number;    // Tổng số lượng bài học trong toàn bộ khóa
  completedLessons: number;// Số bài học mà học viên đã hoàn thành (is_completed = true)
  progressPercent: number; // Phần trăm tiến độ khóa học (tính tự động từ 0 - 100%)
}

/**
 * Cập nhật phần trăm thời lượng video mà học viên đã xem.
 *
 * Nghiệp vụ chi tiết:
 * - Được Player video (M3) gọi định kỳ (ví dụ mỗi 5-10 giây) khi học viên xem bài giảng.
 * - Cơ chế bảo vệ: Hàm DB chỉ cho phép % TĂNG lên (giữ giá trị lớn nhất), không bao giờ bị giảm lùi.
 * - Điểm danh tự động: Khi watched_percent đạt ngưỡng (mặc định >= 95% theo system_setting),
 *   trigger `trg_attendance_on_video` ở Database sẽ tự động chèn điểm danh nguồn 'video'.
 *
 * @param lessonId UUID của bài học đang xem
 * @param percent Phần trăm thời lượng đã xem (từ 0 đến 100)
 */
export async function updateWatch(lessonId: string, percent: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("fn_update_watch", {
    p_lesson: lessonId,
    p_percent: Math.round(percent),
  });
  if (error) throw new Error(`fn_update_watch: ${error.message}`);
}

/**
 * Lưu lại số giây hiện tại học viên đang xem video để phục vụ tính năng "Học tiếp từ chỗ cũ".
 *
 * Nghiệp vụ chi tiết:
 * - Được Player gọi khi học viên tạm dừng video hoặc rời khỏi trang bài học.
 * - Lưu vị trí phát cuối cùng (last_position_seconds) vào bảng lesson_progress.
 *
 * @param lessonId UUID của bài học
 * @param seconds Vị trí thời gian hiện tại của video (đơn vị: giây)
 */
export async function savePosition(lessonId: string, seconds: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("fn_save_position", {
    p_lesson: lessonId,
    p_seconds: Math.floor(seconds),
  });
  if (error) throw new Error(`fn_save_position: ${error.message}`);
}

/**
 * Đánh dấu bài học là đã hoàn thành.
 *
 * Nghiệp vụ chi tiết:
 * - Được gọi khi học viên xem hết video hoặc chủ động bấm nút "Đánh dấu hoàn thành".
 * - Thiết lập cờ is_completed = true và watched_percent = 100%.
 * - Tác động trực tiếp đến view_course_progress để tính lại % tiến độ của cả khóa học.
 *
 * @param lessonId UUID của bài học cần hoàn thành
 */
export async function markComplete(lessonId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("fn_mark_complete", {
    p_lesson: lessonId,
  });
  if (error) throw new Error(`fn_mark_complete: ${error.message}`);
}

/**
 * Lấy phần trăm tiến độ và thống kê số bài hoàn thành của một khóa học cụ thể.
 *
 * Nghiệp vụ chi tiết:
 * - Truy vấn từ View `view_course_progress` (chạy với quyền security_invoker = true).
 * - Cơ chế RLS: Chỉ trả về tiến độ khóa học của chính học viên đang đăng nhập.
 * - Trả về null nếu học viên chưa từng học bài nào hoặc chưa kích hoạt ghi danh.
 *
 * @param courseId UUID của khóa học cần kiểm tra tiến độ
 * @returns Đối tượng CourseProgress hoặc null nếu không tìm thấy dữ liệu
 */
export async function getCourseProgress(courseId: string): Promise<CourseProgress | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("view_course_progress")
    .select("*")
    .eq("course_id", courseId)
    .maybeSingle();

  if (error) throw new Error(`view_course_progress: ${error.message}`);
  if (!data) return null;

  return {
    userId: data.user_id as string,
    courseId: data.course_id as string,
    courseTitle: data.course_title as string,
    totalLessons: data.total_lessons as number,
    completedLessons: data.completed_lessons as number,
    progressPercent: data.progress_percent as number,
  };
}

/**
 * Hàm tiện ích: Lấy lại vị trí giây cuối cùng học viên đã xem ở bài học này.
 *
 * Nghiệp vụ chi tiết:
 * - Dùng để Player tự động tua video đến đúng giây học viên đang xem dở ở lần học trước.
 * - Đọc trực tiếp từ bảng lesson_progress (chính sách RLS đảm bảo chỉ đọc dữ liệu của mình).
 *
 * @param lessonId UUID của bài học
 * @returns Số giây đã dừng lại lần trước (mặc định trả về 0 nếu chưa học)
 */
export async function getLastPosition(lessonId: string): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lesson_progress")
    .select("last_position_seconds")
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (error) throw new Error(`getLastPosition: ${error.message}`);
  return (data?.last_position_seconds as number) ?? 0;
}
