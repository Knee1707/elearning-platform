/**
 * Module: Ghi chú video, Hỏi - Đáp (Q&A) và Thông báo (Q&A and Notification Queries)
 * Thành viên phụ trách: M2 - DATA (Học tập & Đánh giá)
 *
 * Hợp đồng Data ↔ App (Mục 6 PHAN_CONG.md):
 * - fn_add_note: Ghi chú cá nhân gắn liền với mốc thời gian (timestamp) của video bài học.
 * - fn_ask_question: Học viên đặt câu hỏi thảo luận ngay dưới bài học.
 * - fn_answer_question: Giảng viên hoặc học viên khác trả lời thảo luận.
 * - trg_notify_on_answer: Trigger tự động tạo thông báo gửi đến người hỏi khi có người giải đáp.
 * - fn_mark_read: Đánh dấu thông báo đã xem.
 */

import { createClient } from "@/lib/supabase/client";

/**
 * Ghi chú bài học được lưu theo mốc thời gian phát của video.
 */
export interface LessonNote {
  id: string;               // UUID của ghi chú
  lessonId: string;         // UUID của bài học chứa ghi chú
  timestampSeconds: number; // Mốc thời gian trên thanh phát video (đơn vị: giây)
  content: string;          // Nội dung ghi chú cá nhân của học viên
  createdAt: string;        // Thời điểm tạo ghi chú (ISO string)
}

/**
 * Câu hỏi thảo luận dưới bài học kèm danh sách câu trả lời liên quan.
 */
export interface QaQuestion {
  id: string;            // UUID của câu hỏi
  lessonId: string;      // UUID bài học đặt câu hỏi
  userId: string;        // UUID người đặt câu hỏi
  content: string;       // Nội dung câu hỏi
  createdAt: string;     // Thời điểm đặt câu hỏi
  answers?: QaAnswer[];  // Danh sách các câu trả lời đính kèm (nếu có)
}

/**
 * Câu trả lời cho một câu hỏi thảo luận.
 */
export interface QaAnswer {
  id: string;         // UUID của câu trả lời
  questionId: string; // UUID của câu hỏi gốc
  userId: string;     // UUID người trả lời (giảng viên hoặc bạn học)
  content: string;    // Nội dung câu trả lời
  createdAt: string;  // Thời điểm trả lời
}

/**
 * Thông báo gửi tới người dùng trong ứng dụng.
 */
export interface Notification {
  id: string;                                          // UUID của thông báo
  type: "purchase" | "reply" | "system" | "reminder";  // Phân loại thông báo (theo enum notif_type)
  title: string;                                       // Tiêu đề ngắn gọn của thông báo
  body: string | null;                                 // Nội dung chi tiết thông báo
  isRead: boolean;                                     // Trạng thái đã đọc hay chưa (true: đã đọc)
  createdAt: string;                                   // Thời điểm phát sinh thông báo
}

/**
 * Thêm một ghi chú mới gắn liền với vị trí giây hiện tại của video bài giảng.
 *
 * Nghiệp vụ chi tiết:
 * - Được Player video (M3) gọi khi học viên bấm nút "Tạo ghi chú tại mốc này".
 * - Giúp học viên sau này khi xem lại danh sách ghi chú có thể bấm vào để tua ngay tới giây đó.
 *
 * @param lessonId UUID của bài học
 * @param seconds Vị trí giây trên video (không âm)
 * @param content Nội dung văn bản ghi chú
 * @returns UUID của bản ghi ghi chú vừa tạo thành công
 */
export async function addNote(
  lessonId: string,
  seconds: number,
  content: string,
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_add_note", {
    p_lesson: lessonId,
    p_seconds: Math.floor(seconds),
    p_content: content,
  });

  if (error) throw new Error(`fn_add_note: ${error.message}`);
  return data as string;
}

/**
 * Lấy toàn bộ danh sách ghi chú cá nhân của học viên tại một bài học cụ thể.
 *
 * Nghiệp vụ chi tiết:
 * - Danh sách ghi chú được sắp xếp tăng dần theo mốc thời gian phát video (timestamp_seconds).
 * - Chính sách RLS bảo đảm học viên chỉ nhìn thấy ghi chú riêng của chính mình.
 *
 * @param lessonId UUID của bài học cần lấy danh sách ghi chú
 * @returns Mảng các ghi chú theo thứ tự thời gian trên video
 */
export async function getMyNotes(lessonId: string): Promise<LessonNote[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lesson_note")
    .select("id, lesson_id, timestamp_seconds, content, created_at")
    .eq("lesson_id", lessonId)
    .order("timestamp_seconds");

  if (error) throw new Error(`getMyNotes: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    lessonId: row.lesson_id as string,
    timestampSeconds: row.timestamp_seconds as number,
    content: row.content as string,
    createdAt: row.created_at as string,
  }));
}

/**
 * Đăng một câu hỏi thảo luận mới dưới bài học.
 *
 * Nghiệp vụ chi tiết:
 * - Học viên đặt thắc mắc trong quá trình học tập.
 * - Lưu vào bảng `qa_question`, liên kết trực tiếp với bài học và người hỏi.
 *
 * @param lessonId UUID của bài học
 * @param content Nội dung câu hỏi thắc mắc
 * @returns UUID của câu hỏi vừa tạo
 */
export async function askQuestion(lessonId: string, content: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_ask_question", {
    p_lesson: lessonId,
    p_content: content,
  });

  if (error) throw new Error(`fn_ask_question: ${error.message}`);
  return data as string;
}

/**
 * Gửi câu trả lời cho một câu hỏi thảo luận.
 *
 * Nghiệp vụ chi tiết:
 * - Được Giảng viên hoặc học viên khác gọi khi giải đáp thắc mắc.
 * - Tự động phát sinh thông báo: Trigger `trg_notify_on_answer` ở Database sẽ tự động chèn một thông báo
 *   dạng 'reply' vào bảng `notification` của người đặt câu hỏi (nếu người trả lời không phải chính người hỏi).
 *
 * @param questionId UUID của câu hỏi cần giải đáp
 * @param content Nội dung câu trả lời
 * @returns UUID của câu trả lời vừa tạo
 */
export async function answerQuestion(questionId: string, content: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_answer_question", {
    p_question: questionId,
    p_content: content,
  });

  if (error) throw new Error(`fn_answer_question: ${error.message}`);
  return data as string;
}

/**
 * Lấy toàn bộ danh mục câu hỏi và câu trả lời trong khu vực thảo luận của bài học.
 *
 * Nghiệp vụ chi tiết:
 * - Truy vấn kết hợp lồng nhau giữa bảng `qa_question` và `qa_answer`.
 * - Sắp xếp câu hỏi mới nhất lên đầu để người học dễ theo dõi thảo luận gần đây.
 *
 * @param lessonId UUID của bài học
 * @returns Danh sách các câu hỏi kèm mảng câu trả lời tương ứng
 */
export async function getLessonQa(lessonId: string): Promise<QaQuestion[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("qa_question")
    .select(`
      id,
      lesson_id,
      user_id,
      content,
      created_at,
      qa_answer (
        id,
        question_id,
        user_id,
        content,
        created_at
      )
    `)
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getLessonQa: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    lessonId: row.lesson_id as string,
    userId: row.user_id as string,
    content: row.content as string,
    createdAt: row.created_at as string,
    answers: ((row.qa_answer as Array<Record<string, unknown>>) ?? []).map((a) => ({
      id: a.id as string,
      questionId: a.question_id as string,
      userId: a.user_id as string,
      content: a.content as string,
      createdAt: a.created_at as string,
    })),
  }));
}

/**
 * Đánh dấu một thông báo là đã đọc.
 *
 * Nghiệp vụ chi tiết:
 * - Được gọi khi người dùng bấm vào một thông báo cụ thể hoặc bấm "Đánh dấu đã đọc".
 * - Cập nhật trường `is_read = true` trong bảng `notification`.
 * - Cơ chế bảo mật: Chỉ cho phép cập nhật thông báo thuộc quyền sở hữu của chính người dùng đó.
 *
 * @param notificationId UUID của thông báo cần chuyển trạng thái
 */
export async function markRead(notificationId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("fn_mark_read", {
    p_notification: notificationId,
  });

  if (error) throw new Error(`fn_mark_read: ${error.message}`);
}

/**
 * Lấy danh sách thông báo gửi đến tài khoản của người dùng hiện tại.
 *
 * Nghiệp vụ chi tiết:
 * - Phục vụ menu quả chuông thông báo trên thanh điều hướng Navbar (M3/M4).
 * - Tự động sắp xếp thông báo mới nhất lên đầu tiên.
 *
 * @param onlyUnread Nếu đặt là true thì chỉ lọc ra các thông báo chưa đọc (is_read = false)
 * @returns Danh sách các thông báo thỏa mãn điều kiện
 */
export async function getMyNotifications(onlyUnread = false): Promise<Notification[]> {
  const supabase = createClient();
  let query = supabase
    .from("notification")
    .select("id, type, title, body, is_read, created_at")
    .order("created_at", { ascending: false });

  if (onlyUnread) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;
  if (error) throw new Error(`getMyNotifications: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    type: row.type as Notification["type"],
    title: row.title as string,
    body: (row.body as string | null) ?? null,
    isRead: row.is_read as boolean,
    createdAt: row.created_at as string,
  }));
}
