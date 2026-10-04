import { createClient } from "@/lib/supabase/client";
import { type Certificate } from "@/lib/queries/quiz";

export interface AutoCertificateResult {
  eligible: boolean;
  issued: boolean;
  certificate: Certificate | null;
  reason?: string;
}

/**
 * Lấy chứng chỉ lưu trữ cục bộ phân lập theo từng tài khoản học viên (tránh trùng dữ liệu giữa các tài khoản)
 */
function getLocalCertificates(userId?: string | null): Certificate[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = localStorage.getItem(`lms_approved_certificates_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Lưu chứng chỉ vào local storage theo userId của học viên
 */
function saveLocalCertificate(cert: Certificate, userId?: string | null) {
  if (typeof window === "undefined" || !userId) return;
  try {
    const existing = getLocalCertificates(userId);
    const updated = [cert, ...existing.filter((c) => c.courseId !== cert.courseId)];
    localStorage.setItem(`lms_approved_certificates_${userId}`, JSON.stringify(updated));
  } catch {}
}

export interface AutoCertificateOptions {
  courseTitle?: string;
  instructorName?: string;
  allVideosDone?: boolean;
  allQuizzesDone?: boolean;
  finalExamPassed?: boolean;
}

/**
 * Kiểm tra điều kiện và tự động cấp chứng chỉ:
 * - Điều kiện 1: Hoàn thành 100% video/bài học trong khóa học.
 * - Điều kiện 2: Vượt qua toàn bộ bài quiz bài học có trong khóa.
 * - Điều kiện 3:
 *   + Nếu KHÔNG có bài thi cuối khóa: tự động cấp chứng chỉ ngay khi thỏa điều kiện 1 & 2.
 *   + Nếu CÓ bài thi cuối khóa: phải thi đạt điểm chuẩn (score >= pass_score).
 */
export async function checkAndAutoIssueCertificate(
  courseId: string,
  optsOrTitle?: string | AutoCertificateOptions,
  maybeInstructorName?: string
): Promise<AutoCertificateResult> {
  const opts: AutoCertificateOptions =
    typeof optsOrTitle === "string"
      ? { courseTitle: optsOrTitle, instructorName: maybeInstructorName }
      : optsOrTitle || {};

  const courseTitle = opts.courseTitle;
  const instructorName = opts.instructorName;

  const supabase = createClient();

  // 1. Kiểm tra session người dùng
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  // 2. Kiểm tra xem đã có chứng chỉ 'approved' chưa
  if (userId) {
    try {
      const { data: existingCert } = await supabase
        .from("certificates")
        .select("id, code, issued_at, course_id, courses(title, profiles!courses_instructor_id_fkey(full_name))")
        .eq("user_id", userId)
        .eq("course_id", courseId)
        .eq("status", "approved")
        .maybeSingle();

      if (existingCert) {
        const cert: Certificate = {
          id: existingCert.id,
          code: existingCert.code,
          issuedAt: existingCert.issued_at,
          courseId: existingCert.course_id,
          courseTitle:
            (existingCert.courses as any)?.title || courseTitle || "Khóa học",
          instructorName:
            (existingCert.courses as any)?.profiles?.full_name ||
            instructorName ||
            "Giảng viên",
        };
        saveLocalCertificate(cert, userId);
        return { eligible: true, issued: false, certificate: cert };
      }
    } catch {
      // Bỏ qua lỗi kết nối
    }
  }

  // Kiểm tra trong local cache offline của chính user này
  const localCerts = getLocalCertificates(userId);
  const cached = localCerts.find((c) => c.courseId === courseId);
  if (cached) {
    return { eligible: true, issued: false, certificate: cached };
  }

  // 3. Kiểm tra điều kiện hoàn thành các bài học (videos)
  let allVideosDone = false;
  let allQuizzesDone = false;
  let finalExamPassed = true; // Mặc định true nếu khóa học không có bài thi cuối khóa

  try {
    // 3.1 Kiểm tra số bài học và tiến độ hoàn thành từ view_course_progress
    const { data: progressData } = await supabase
      .from("view_course_progress")
      .select("total_lessons, completed_lessons, progress_percent")
      .eq("course_id", courseId)
      .maybeSingle();

    if (progressData) {
      const total = Number(progressData.total_lessons || 0);
      const completed = Number(progressData.completed_lessons || 0);
      const percent = Number(progressData.progress_percent || 0);
      allVideosDone = total > 0 && (completed >= total || percent >= 100);
    }

    // 3.2 Kiểm tra bài quiz của các bài học
    const { data: lessons } = await supabase
      .from("lessons")
      .select("id, chapter_id, chapters!inner(course_id)")
      .eq("chapters.course_id", courseId);

    const lessonIds = (lessons ?? []).map((l: any) => l.id);

    if (lessonIds.length > 0) {
      // Tìm các bài quiz gắn với các lesson này
      const { data: quizzes } = await supabase
        .from("quizzes")
        .select("id, lesson_id, pass_score")
        .in("lesson_id", lessonIds);

      const quizLessonIds = (quizzes ?? [])
        .map((q: any) => q.lesson_id)
        .filter(Boolean);

      if (quizLessonIds.length === 0) {
        allQuizzesDone = true;
      } else if (userId) {
        const { data: lpData } = await supabase
          .from("lesson_progress")
          .select("lesson_id, is_quiz_passed, is_completed, watched_percent")
          .in("lesson_id", quizLessonIds)
          .eq("user_id", userId);

        const passedSet = new Set(
          (lpData ?? [])
            .filter((lp: any) => lp.is_quiz_passed)
            .map((lp: any) => lp.lesson_id)
        );

        allQuizzesDone = quizLessonIds.every((lid) => passedSet.has(lid));
      } else {
        allQuizzesDone = true;
      }
    } else {
      allVideosDone = true;
      allQuizzesDone = true;
    }

    // 3.3 Kiểm tra bài thi cuối khóa (final exam)
    const { data: finalExams } = await supabase
      .from("exams")
      .select("id, pass_score, is_final")
      .eq("course_id", courseId)
      .eq("is_final", true);

    if (finalExams && finalExams.length > 0) {
      const targetExam = finalExams[0];
      const passScore = Number(targetExam.pass_score || 70);

      if (userId) {
        const { data: attempts } = await supabase
          .from("exam_attempts")
          .select("score")
          .eq("exam_id", targetExam.id)
          .eq("user_id", userId)
          .gte("score", passScore);

        finalExamPassed = (attempts ?? []).length > 0;
      } else {
        finalExamPassed = false;
      }
    } else {
      // Khóa học không có bài thi cuối khóa
      finalExamPassed = true;
    }
  } catch {
    // Dự phòng fallback
    allVideosDone = true;
    allQuizzesDone = true;
    finalExamPassed = true;
  }

  // Ghi đè điều kiện nếu caller truyền trực tiếp
  if (opts.allVideosDone !== undefined) {
    allVideosDone = opts.allVideosDone;
  }
  if (opts.allQuizzesDone !== undefined) {
    allQuizzesDone = opts.allQuizzesDone;
  }
  if (opts.finalExamPassed !== undefined) {
    finalExamPassed = opts.finalExamPassed;
  }

  // Đánh giá tổng thể điều kiện
  if (!allVideosDone) {
    return {
      eligible: false,
      issued: false,
      certificate: null,
      reason: "Bạn cần hoàn thành toàn bộ video bài giảng trong khóa học.",
    };
  }

  if (!allQuizzesDone) {
    return {
      eligible: false,
      issued: false,
      certificate: null,
      reason: "Bạn cần hoàn thành và đạt tất cả các bài quiz trong khóa học.",
    };
  }

  if (!finalExamPassed) {
    return {
      eligible: false,
      issued: false,
      certificate: null,
      reason: "Bạn cần hoàn thành bài thi cuối khóa và đạt điểm chuẩn đặt ra.",
    };
  }

  // 4. ĐÃ ĐỦ ĐIỀU KIỆN! Tự động cấp chứng chỉ chính quy
  const randomHex = Math.random().toString(36).substring(2, 10).toUpperCase();
  const generatedCode = `CERT-${randomHex}-${Date.now().toString(36).toUpperCase()}`;
  const nowIso = new Date().toISOString();

  let finalCertificate: Certificate = {
    id: `cert-${Date.now()}`,
    code: generatedCode,
    courseId,
    courseTitle: courseTitle || "Khóa học chính quy",
    instructorName: instructorName || "Hội đồng đào tạo E7",
    issuedAt: nowIso,
  };

  if (userId) {
    try {
      const { data: newRow, error: insertError } = await supabase
        .from("certificates")
        .insert({
          user_id: userId,
          course_id: courseId,
          code: generatedCode,
          status: "approved",
          issued_at: nowIso,
        })
        .select("id, code, issued_at")
        .single();

      if (!insertError && newRow) {
        finalCertificate = {
          ...finalCertificate,
          id: newRow.id,
          code: newRow.code,
          issuedAt: newRow.issued_at,
        };
      }
    } catch {
      // Lưu offline
    }
  }

  saveLocalCertificate(finalCertificate);

  return {
    eligible: true,
    issued: true,
    certificate: finalCertificate,
  };
}
