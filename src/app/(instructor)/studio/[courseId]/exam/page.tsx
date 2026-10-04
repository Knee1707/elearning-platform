import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES, isAdminRole } from "@/lib/utils";
import { FinalExamManager, type ExamQuestion } from "@/features/quiz/author/FinalExamManager";
import { FinalExamGrading, type PendingExamAttempt } from "@/features/quiz/author/FinalExamGrading";

type PageProps = { params: { courseId: string } };

export default async function CourseFinalExamPage({ params }: PageProps) {
  const profile = await requireRole(["instructor", ...ADMIN_ROLES]);
  const supabase = createClient();

  // 1. Kiểm tra khóa học & quyền sở hữu
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, instructor_id, status")
    .eq("id", params.courseId)
    .single();

  if (!course || (course.instructor_id !== profile.id && !isAdminRole(profile.role))) {
    notFound();
  }

  // 2. Tra cứu kỳ thi cuối khóa đã thiết lập (nếu có)
  const { data: examData } = await supabase
    .from("exams")
    .select("id, title, time_limit_minutes, pass_score, quiz_id, is_published")
    .eq("course_id", params.courseId)
    .eq("is_final", true)
    .maybeSingle();

  let initialQuestions: ExamQuestion[] = [];

  // 3. Nếu đã có quiz_id, tải toàn bộ danh sách câu hỏi và phương án
  if (examData?.quiz_id) {
    const { data: qRows } = await supabase
      .from("questions")
      .select("id, content, position, options(id, content, is_correct)")
      .eq("quiz_id", examData.quiz_id)
      .order("position", { ascending: true });

    if (qRows) {
      initialQuestions = qRows.map((q: any) => ({
        id: String(q.id),
        content: String(q.content),
        position: Number(q.position || 0),
        options: (q.options ?? []).map((o: any) => ({
          id: String(o.id),
          content: String(o.content),
          isCorrect: Boolean(o.is_correct),
        })),
      }));
    }
  }

  const initialExam = examData
    ? {
        id: String(examData.id),
        quizId: String(examData.quiz_id),
        title: String(examData.title),
        timeLimitMinutes: Number(examData.time_limit_minutes || 60),
        passScore: Number(examData.pass_score || 70),
        isPublished: Boolean(examData.is_published),
      }
    : null;

  let pendingAttempts: PendingExamAttempt[] = [];
  if (examData) {
    const { data: attempts } = await supabase
      .from("exam_attempts")
      .select("id, submitted_at, is_time_expired, profiles(full_name), answers(answer_text, questions(content))")
      .eq("exam_id", examData.id)
      .eq("status", "pending_grading")
      .order("submitted_at", { ascending: true });
    pendingAttempts = (attempts ?? []).map((attempt: any) => ({
      id: String(attempt.id),
      studentName: String(attempt.profiles?.full_name ?? "Học viên"),
      submittedAt: attempt.submitted_at,
      isTimeExpired: Boolean(attempt.is_time_expired),
      answers: (attempt.answers ?? []).map((answer: any) => ({
        question: String(answer.questions?.content ?? "Câu hỏi tự luận"),
        answer: String(answer.answer_text ?? ""),
      })),
    }));
  }

  return (
    <main className="min-h-screen bg-slate-50/50 pb-16">
      <FinalExamManager
        courseId={course.id}
        courseTitle={course.title}
        initialExam={initialExam}
        initialQuestions={initialQuestions}
      />
      <FinalExamGrading attempts={pendingAttempts} />
    </main>
  );
}
