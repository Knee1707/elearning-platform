/**
 * Module: Quản lý Quiz, Bài thi, Chấm điểm và Chứng chỉ (Quiz Queries)
 * Thành viên phụ trách: M2 - DATA (Học tập & Đánh giá)
 *
 * Hợp đồng Data ↔ App (Mục 6 PHAN_CONG.md):
 * - fn_get_quiz: Lấy nội dung câu hỏi và các lựa chọn (bảo đảm KHÔNG lộ đáp án đúng về phía client).
 * - fn_submit_attempt: Nộp bài làm và chấm điểm hoàn toàn tại Database.
 * - fn_verify_certificate: Tra cứu thông tin chứng chỉ công khai không cần đăng nhập.
 * - view_certificate: Lấy danh sách chứng chỉ thuộc sở hữu của học viên.
 *
 * Nguyên tắc bảo mật chống gian lận:
 * Học viên không thể xem trước đáp án đúng qua API hay F12 Network;
 * Việc tính điểm chỉ diễn ra ở stored procedure phía Database.
 */

import { createClient } from "@/lib/supabase/client";

/**
 * Lựa chọn câu trả lời hiển thị cho học viên.
 * Lưu ý bảo mật: Trường kiểm tra đúng/sai bị loại bỏ có chủ đích để chống gian lận thi cử.
 */
export interface QuizOption {
  optionId: string;   // UUID của phương án trả lời
  optionText: string; // Nội dung văn bản của phương án
}

/**
 * Cấu trúc một câu hỏi trong bài quiz / bài thi.
 */
export interface QuizQuestion {
  questionId: string;     // UUID của câu hỏi
  questionText: string;   // Nội dung đề bài câu hỏi
  position: number;       // Thứ tự xuất hiện của câu hỏi trong đề
  options: QuizOption[];  // Danh sách các phương án trả lời để học viên chọn
}

/**
 * Toàn bộ dữ liệu đề quiz/bài thi hoàn chỉnh trả về cho giao diện làm bài (M3).
 */
export interface QuizData {
  quizId: string;              // UUID của bài quiz
  quizTitle: string;           // Tên bài quiz
  passScore: number;           // Điểm số tối thiểu cần đạt (thang 0-100)
  questions: QuizQuestion[];   // Danh sách tất cả câu hỏi kèm các lựa chọn
}

/**
 * Thông tin chứng chỉ tra cứu công khai bằng mã xác thực.
 */
export interface CertificateInfo {
  certificateCode: string; // Mã chứng chỉ duy nhất (ví dụ CERT-NEXTJS-2026-A1B2C3D4)
  studentName: string;     // Họ tên học viên được cấp chứng chỉ
  courseTitle: string;     // Tên khóa học đã hoàn thành
  issuedAt: string;        // Thời điểm cấp chứng chỉ (ISO string)
  revokedAt?: string | null; // Thời điểm bị thu hồi (null = còn hiệu lực) — 0014
}

/**
 * Thông tin chứng chỉ đầy đủ trong hồ sơ cá nhân của học viên.
 */
export interface Certificate {
  id: string;              // UUID bản ghi chứng chỉ
  code: string;            // Mã chứng chỉ để chia sẻ / xác minh
  issuedAt: string;        // Thời gian cấp
  courseId: string;        // UUID khóa học
  courseTitle: string;     // Tên khóa học
  instructorName: string;  // Tên giảng viên phụ trách khóa học
  revokedAt?: string | null; // Thời điểm bị thu hồi (null = còn hiệu lực) — 0014
}

/**
 * Lấy danh sách câu hỏi và phương án trả lời của một bài quiz.
 *
 * Nghiệp vụ và cơ chế bảo mật:
 * - Gọi hàm RPC `fn_get_quiz` (chạy với quyền security definer).
 * - Cơ chế chống gian lận: Database chỉ SELECT các cột nội dung và cố tình bỏ qua cờ kiểm tra đúng/sai.
 *   Học viên dù có mở DevTools kiểm tra response JSON cũng không thể thấy đáp án đúng trước khi nộp bài.
 * - Dữ liệu trả về dạng phẳng từ bảng SQL được gom nhóm tự động thành cấu trúc cây: Câu hỏi -> Danh sách lựa chọn.
 *
 * @param quizId UUID của bài quiz cần lấy đề
 * @returns Đối tượng QuizData đầy đủ câu hỏi và lựa chọn đã được sắp xếp theo thứ tự
 */
export async function getQuiz(quizId: string): Promise<QuizData> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_get_quiz", {
    p_quiz: quizId,
  });

  if (error) throw new Error(`fn_get_quiz: ${error.message}`);
  if (!data || (data as unknown[]).length === 0) {
    throw new Error("Không tìm thấy quiz");
  }

  // Chuyển đổi danh sách dòng kết quả phẳng từ DB thành cấu trúc phân cấp câu hỏi -> đáp án
  const rows = data as Array<{
    quiz_id: string;
    quiz_title: string;
    pass_score: number;
    question_id: string;
    question_text: string;
    position: number;
    option_id: string;
    option_text: string;
  }>;

  const first = rows[0];
  const questionsMap = new Map<string, QuizQuestion>();

  for (const row of rows) {
    if (!questionsMap.has(row.question_id)) {
      questionsMap.set(row.question_id, {
        questionId: row.question_id,
        questionText: row.question_text,
        position: row.position,
        options: [],
      });
    }
    questionsMap.get(row.question_id)!.options.push({
      optionId: row.option_id,
      optionText: row.option_text,
    });
  }

  return {
    quizId: first.quiz_id,
    quizTitle: first.quiz_title,
    passScore: first.pass_score,
    questions: Array.from(questionsMap.values()).sort((a, b) => a.position - b.position),
  };
}

/**
 * Nộp bài làm của kỳ thi để hệ thống chấm điểm tự động.
 *
 * Nghiệp vụ chi tiết:
 * - Toàn bộ logic so khớp đáp án và tính điểm được thực hiện hoàn toàn ở Stored Procedure `fn_submit_attempt`.
 * - Phía Frontend tuyệt đối không gửi điểm lên và không tự tính điểm để ngăn chặn nguy cơ sửa đổi gói tin HTTP.
 * - Quy trình tại Database:
 *   1. Tạo bản ghi lần thi mới trong bảng `exam_attempts`.
 *   2. Lưu chi tiết từng câu trả lời vào bảng `answers`.
 *   3. So khớp với đáp án đúng và tính điểm theo thang 100.
 *   4. Nếu điểm số đạt chuẩn (>= pass_score), trigger `trg_issue_certificate` sẽ tự động cấp chứng chỉ
 *      và gửi thông báo chúc mừng tới học viên.
 *
 * @param examId UUID của kỳ thi đang nộp
 * @param answers Map lưu câu trả lời dạng { [questionId]: optionId }
 * @returns Điểm số đạt được (thang 0 đến 100) do Database tính toán
 */
export async function submitAttempt(
  examId: string,
  answers: Record<string, string>,
): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_submit_attempt", {
    p_exam: examId,
    p_answers: answers,
  });

  if (error) throw new Error(`fn_submit_attempt: ${error.message}`);
  return data as number;
}

/**
 * Tra cứu và xác minh tính hợp lệ của một chứng chỉ học tập qua mã chứng chỉ.
 *
 * Nghiệp vụ chi tiết:
 * - Được trang kiểm tra công khai (M3: /verify/[code]) gọi để nhà tuyển dụng hoặc bên thứ 3 xác thực.
 * - Hàm DB `fn_verify_certificate` là public, người dùng không cần đăng nhập vẫn có thể tra cứu.
 *
 * @param code Mã chứng chỉ cần tra cứu (ví dụ CERT-NEXTJS-2026-A1B2C3D4)
 * @returns Thông tin chứng chỉ nếu mã hợp lệ, hoặc null nếu mã không tồn tại
 */
export async function verifyCertificate(code: string): Promise<CertificateInfo | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_verify_certificate", {
    p_code: code.toUpperCase(),
  });

  if (error) throw new Error(`fn_verify_certificate: ${error.message}`);
  if (!data || (data as unknown[]).length === 0) return null;

  const row = (data as Array<{
    certificate_code: string;
    student_name: string;
    course_title: string;
    issued_at: string;
    revoked_at: string | null;
  }>)[0];

  return {
    certificateCode: row.certificate_code,
    studentName: row.student_name,
    courseTitle: row.course_title,
    issuedAt: row.issued_at,
    revokedAt: row.revoked_at ?? null,
  };
}

/**
 * Lấy danh sách toàn bộ chứng chỉ mà học viên hiện tại đã xuất sắc đạt được.
 *
 * Nghiệp vụ chi tiết:
 * - Truy vấn từ View `view_certificate` (chứa tên học viên, tên khóa học, tên giảng viên).
 * - Được trang "Chứng chỉ của tôi" (M3: /certificates) sử dụng để hiển thị danh hiệu đã hoàn thành.
 *
 * @returns Danh sách các chứng chỉ của học viên đang đăng nhập
 */
export async function getMyCertificates(): Promise<Certificate[]> {
  const supabase = createClient();
  // Chỉ chứng chỉ ĐÃ DUYỆT (status='approved'); yêu cầu 'pending' không tính là đã có.
  const { data, error } = await supabase
    .from("certificates")
    .select("id, code, issued_at, revoked_at, course_id, courses(title, profiles!courses_instructor_id_fkey(full_name))")
    .eq("status", "approved")
    .order("issued_at", { ascending: false });

  if (error) throw new Error(`certificates: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    code: row.code,
    issuedAt: row.issued_at,
    courseId: row.course_id,
    courseTitle: row.courses?.title ?? "",
    instructorName: row.courses?.profiles?.full_name ?? "Giảng viên",
    revokedAt: row.revoked_at ?? null,
  }));
}
