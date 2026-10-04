"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Award,
  Check,
  CheckCircle2,
  Clock,
  FileQuestion,
  FileText,
  HelpCircle,
  ListOrdered,
  Plus,
  Save,
  Sparkles,
  Trash2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface QuestionOption {
  id: string;
  content: string;
  isCorrect: boolean;
}

export interface ExamQuestion {
  id: string;
  content: string;
  position: number;
  options: QuestionOption[];
}

interface FinalExamManagerProps {
  courseId: string;
  courseTitle: string;
  initialExam: {
    id: string;
    quizId: string;
    title: string;
    timeLimitMinutes: number;
    passScore: number;
    isPublished: boolean;
  } | null;
  initialQuestions: ExamQuestion[];
}

export function FinalExamManager({
  courseId,
  courseTitle,
  initialExam,
  initialQuestions,
}: FinalExamManagerProps) {
  const router = useRouter();

  // Thông tin kỳ thi
  const [examId, setExamId] = useState<string | null>(initialExam?.id ?? null);
  const [quizId, setQuizId] = useState<string | null>(initialExam?.quizId ?? null);
  const [title, setTitle] = useState(initialExam?.title ?? `Kỳ thi cuối khóa: ${courseTitle}`);
  const [timeLimit, setTimeLimit] = useState(initialExam?.timeLimitMinutes ?? 60);
  const [passScore, setPassScore] = useState(initialExam?.passScore ?? 70);
  const [isPublished, setIsPublished] = useState(initialExam?.isPublished ?? false);

  // Danh sách câu hỏi
  const [questions, setQuestions] = useState<ExamQuestion[]>(initialQuestions);

  // Tab tạo câu hỏi: "multiple_choice" (Trắc nghiệm) | "essay" (Tự luận)
  const [questionType, setQuestionType] = useState<"multiple_choice" | "essay">("multiple_choice");

  // State câu hỏi trắc nghiệm
  const [mcContent, setMcContent] = useState("");
  const [mcOptions, setMcOptions] = useState(["", "", "", ""]);
  const [mcCorrectIndex, setMcCorrectIndex] = useState<number | null>(null);

  // State câu hỏi tự luận
  const [essayContent, setEssayContent] = useState("");
  const [essayGuide, setEssayGuide] = useState("");

  // Loading & Feedback
  const [isSavingExam, setIsSavingExam] = useState(false);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function showMessage(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  // 1. Tạo hoặc Cập nhật thông tin kỳ thi (Điều kiện kỳ thi)
  async function handleSaveExamSettings(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!title.trim()) {
      showMessage("error", "Vui lòng nhập tên kỳ thi.");
      return;
    }
    if (timeLimit <= 0) {
      showMessage("error", "Thời lượng làm bài phải lớn hơn 0 phút.");
      return;
    }
    if (passScore < 0 || passScore > 100) {
      showMessage("error", "Điểm đạt phải từ 0% đến 100%.");
      return;
    }

    setIsSavingExam(true);
    const supabase = createClient();

    try {
      if (!examId) {
        // Tạo kỳ thi mới qua RPC fn_create_final_exam
        const { data, error } = await supabase.rpc("fn_create_final_exam", {
          p_course: courseId,
          p_title: title.trim(),
          p_time_limit: timeLimit,
          p_pass_score: passScore,
        });

        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        const newExamId = String(row.exam_id);
        const newQuizId = String(row.quiz_id);
        setExamId(newExamId);
        setQuizId(newQuizId);
        showMessage("success", "Đã tạo kỳ thi thành công! Bây giờ bạn có thể thêm các câu hỏi.");
      } else {
        // Cập nhật kỳ thi đã có
        const { error: examError } = await supabase
          .from("exams")
          .update({
            title: title.trim(),
            time_limit_minutes: timeLimit,
            pass_score: passScore,
          })
          .eq("id", examId);

        if (examError) throw examError;

        if (quizId) {
          await supabase
            .from("quizzes")
            .update({
              title: title.trim(),
              pass_score: passScore,
            })
            .eq("id", quizId);
        }

        showMessage("success", "Đã cập nhật thông tin kỳ thi.");
      }
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể lưu kỳ thi.";
      showMessage("error", msg);
    } finally {
      setIsSavingExam(false);
    }
  }

  async function handlePublishExam() {
    if (!examId) {
      showMessage("error", "Hãy khởi tạo kỳ thi trước khi đăng đề.");
      return;
    }
    if (!window.confirm("Đăng đề thi cho học viên? Học viên đủ điều kiện sẽ nhìn thấy bài thi.")) return;
    setIsSavingExam(true);
    try {
      const { error } = await createClient().rpc("fn_publish_final_exam", { p_exam: examId });
      if (error) throw error;
      setIsPublished(true);
      showMessage("success", "Đã đăng đề thi cuối khóa cho học viên.");
      router.refresh();
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "Không thể đăng đề thi.");
    } finally {
      setIsSavingExam(false);
    }
  }

  // Helper đảm bảo có quiz_id trước khi thêm câu hỏi
  async function ensureQuiz(): Promise<string> {
    if (quizId) return quizId;

    const supabase = createClient();
    const { data, error } = await supabase.rpc("fn_create_final_exam", {
      p_course: courseId,
      p_title: title.trim() || `Kỳ thi cuối khóa: ${courseTitle}`,
      p_time_limit: timeLimit || 60,
      p_pass_score: passScore || 70,
    });

    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    const newExamId = String(row.exam_id);
    const newQuizId = String(row.quiz_id);
    setExamId(newExamId);
    setQuizId(newQuizId);
    return newQuizId;
  }

  // 2. Thêm câu hỏi Trắc nghiệm
  async function handleAddMultipleChoice(e: React.FormEvent) {
    e.preventDefault();
    if (!mcContent.trim()) {
      showMessage("error", "Vui lòng nhập nội dung câu hỏi trắc nghiệm.");
      return;
    }
    if (mcOptions.some((opt) => !opt.trim())) {
      showMessage("error", "Vui lòng điền đầy đủ 4 phương án lựa chọn.");
      return;
    }
    if (mcCorrectIndex === null) {
      showMessage("error", "Vui lòng chọn đáp án đúng sau khi đã nhập đủ 4 phương án.");
      return;
    }

    setIsAddingQuestion(true);
    const supabase = createClient();

    try {
      const targetQuizId = await ensureQuiz();
      const nextPos = questions.length + 1;

      // Lưu câu hỏi vào bảng questions
      const { data: qData, error: qError } = await supabase
        .from("questions")
        .insert({
          quiz_id: targetQuizId,
          content: mcContent.trim(),
          position: nextPos,
        })
        .select("id")
        .single();

      if (qError) throw qError;

      // Lưu 4 phương án vào bảng options
      const optionsToInsert = mcOptions.map((opt, idx) => ({
        question_id: qData.id,
        content: opt.trim(),
        is_correct: idx === mcCorrectIndex,
      }));

      const { data: oData, error: oError } = await supabase
        .from("options")
        .insert(optionsToInsert)
        .select("id, content, is_correct");

      if (oError) throw oError;

      const newQ: ExamQuestion = {
        id: qData.id,
        content: mcContent.trim(),
        position: nextPos,
        options: (oData || []).map((o: { id: string; content: string; is_correct: boolean }) => ({
          id: o.id,
          content: o.content,
          isCorrect: o.is_correct,
        })),
      };

      setQuestions((prev) => [...prev, newQ]);
      setMcContent("");
      setMcOptions(["", "", "", ""]);
      setMcCorrectIndex(null);
      showMessage("success", "Đã thêm câu hỏi trắc nghiệm thành công!");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi khi thêm câu hỏi trắc nghiệm.";
      showMessage("error", msg);
    } finally {
      setIsAddingQuestion(false);
    }
  }

  // 3. Thêm câu hỏi Tự luận
  async function handleAddEssay(e: React.FormEvent) {
    e.preventDefault();
    if (!essayContent.trim()) {
      showMessage("error", "Vui lòng nhập đề bài câu hỏi tự luận.");
      return;
    }

    setIsAddingQuestion(true);
    const supabase = createClient();

    try {
      const targetQuizId = await ensureQuiz();
      const nextPos = questions.length + 1;

      // Câu hỏi tự luận gắn tiền tố [Tự luận] để hệ thống và học viên nhận biết
      const fullContent = `[Tự luận] ${essayContent.trim()}`;

      const { data: qData, error: qError } = await supabase
        .from("questions")
        .insert({
          quiz_id: targetQuizId,
          content: fullContent,
          position: nextPos,
        })
        .select("id")
        .single();

      if (qError) throw qError;

      // Thêm option gợi ý chấm bài
      const guideText = essayGuide.trim()
        ? `[Gợi ý chấm] ${essayGuide.trim()}`
        : "[Tự luận] Nộp bài giải tự luận";

      const { data: oData, error: oError } = await supabase
        .from("options")
        .insert({
          question_id: qData.id,
          content: guideText,
          is_correct: true,
        })
        .select("id, content, is_correct");

      if (oError) throw oError;

      const newQ: ExamQuestion = {
        id: qData.id,
        content: fullContent,
        position: nextPos,
        options: (oData || []).map((o: { id: string; content: string; is_correct: boolean }) => ({
          id: o.id,
          content: o.content,
          isCorrect: o.is_correct,
        })),
      };

      setQuestions((prev) => [...prev, newQ]);
      setEssayContent("");
      setEssayGuide("");
      showMessage("success", "Đã thêm câu hỏi tự luận thành công!");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi khi thêm câu hỏi tự luận.";
      showMessage("error", msg);
    } finally {
      setIsAddingQuestion(false);
    }
  }

  // 4. Xóa câu hỏi khỏi kỳ thi
  async function handleDeleteQuestion(qId: string) {
    if (!window.confirm("Bạn có chắc chắn muốn xóa câu hỏi này khỏi kỳ thi?")) return;

    setDeletingQuestionId(qId);
    const supabase = createClient();

    try {
      const { error } = await supabase.from("questions").delete().eq("id", qId);
      if (error) throw error;

      setQuestions((prev) => prev.filter((q) => q.id !== qId));
      showMessage("success", "Đã xóa câu hỏi khỏi kỳ thi.");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể xóa câu hỏi.";
      showMessage("error", msg);
    } finally {
      setDeletingQuestionId(null);
    }
  }

  const mcCount = questions.filter((q) => !q.content.startsWith("[Tự luận]")).length;
  const essayCount = questions.filter((q) => q.content.startsWith("[Tự luận]")).length;

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8 space-y-8">
      {/* Toast thông báo */}
      {message && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl px-5 py-3.5 text-xs font-bold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-5 ${
            message.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-white" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Header Điều hướng & Tiêu đề */}
      <div className="space-y-3">
        <Link
          href={`/studio/${courseId}`}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại biên soạn khóa học</span>
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-3 py-0.5 text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                <Award className="h-3.5 w-3.5 text-amber-600" />
                Kỳ thi cuối khóa
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-medium text-slate-500 truncate max-w-sm">
                Khóa: <strong>{courseTitle}</strong>
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-black text-slate-900">
              Quản lý & Soạn đề thi cuối khóa
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Học viên hoàn thành toàn bộ bài học và đạt điểm kỳ thi này sẽ được tự động cấp chứng chỉ chính quy.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs">
              Tổng số: <strong>{questions.length} câu</strong> ({mcCount} trắc nghiệm, {essayCount} tự luận)
            </span>
            {examId && (
              <button type="button" onClick={() => void handlePublishExam()} disabled={isSavingExam || isPublished} className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60">
                {isPublished ? "Đã đăng cho học viên" : "Đăng đề thi cuối khóa"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KHỐI 1: ĐIỀU KIỆN KỲ THI (GIỮ NGUYÊN CÁC TIÊU CHÍ) */}
      <section className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <Clock className="h-5 w-5 text-blue-600" />
          <div>
            <h2 className="text-base font-black text-slate-900">Điều kiện & Thiết lập kỳ thi</h2>
            <p className="text-xs text-slate-500">
              Quy định thời lượng làm bài và ngưỡng điểm tối thiểu để được cấp chứng chỉ
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveExamSettings} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1 sm:col-span-1">
              <label className="text-xs font-bold text-slate-700">Tên kỳ thi</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Kỳ thi cuối khóa..."
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-semibold focus:border-blue-600 focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Thời lượng (phút)</label>
              <input
                type="number"
                min={1}
                max={300}
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-semibold focus:border-blue-600 focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Điểm đạt yêu cầu (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={passScore}
                onChange={(e) => setPassScore(Number(e.target.value))}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-semibold focus:border-blue-600 focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingExam}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              {isSavingExam ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{examId ? "Cập nhật điều kiện kỳ thi" : "Khởi tạo kỳ thi"}</span>
            </button>
          </div>
        </form>
      </section>

      {/* KHỐI 2: SOẠN CÂU HỎI MỚI (TRẮC NGHIỆM VÀ TỰ LUẬN) */}
      <section className="rounded-3xl border border-blue-200/80 bg-gradient-to-b from-blue-50/40 via-white to-white p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-blue-100">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-600" />
              <span>Thêm câu hỏi vào đề thi</span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Lựa chọn hình thức câu hỏi: Trắc nghiệm (tự chấm) hoặc Tự luận
            </p>
          </div>

          {/* Switch chọn hình thức câu hỏi */}
          <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-100/80 p-1">
            <button
              type="button"
              onClick={() => setQuestionType("multiple_choice")}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                questionType === "multiple_choice"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ListOrdered className="h-3.5 w-3.5" />
              <span>Trắc nghiệm (4 đáp án)</span>
            </button>

            <button
              type="button"
              onClick={() => setQuestionType("essay")}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                questionType === "essay"
                  ? "bg-white text-purple-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Tự luận (Đề mở)</span>
            </button>
          </div>
        </div>

        {/* 2A. Form Trắc nghiệm */}
        {questionType === "multiple_choice" && (
          <form onSubmit={handleAddMultipleChoice} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">
                Nội dung câu hỏi trắc nghiệm <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={mcContent}
                onChange={(e) => setMcContent(e.target.value)}
                placeholder="Nhập nội dung câu hỏi trắc nghiệm..."
                rows={2}
                required
                className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-xs font-medium focus:border-blue-600 focus:outline-none transition-all shadow-2xs"
              />
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  4 Phương án lựa chọn & Tích chọn đáp án đúng:
                </label>
                <span className="text-[11px] font-semibold text-blue-600">
                  (Bấm vào nút tròn để chọn đáp án đúng)
                </span>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {mcOptions.map((opt, idx) => {
                  const labelLetters = ["A", "B", "C", "D"];
                  const isChecked = mcCorrectIndex === idx;
                  const allOptionsFilled = mcOptions.every((option) => option.trim().length > 0);

                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 rounded-2xl border p-2.5 transition-all cursor-default ${
                        isChecked
                          ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => allOptionsFilled && setMcCorrectIndex(idx)}
                        disabled={!allOptionsFilled}
                        aria-label={allOptionsFilled ? `Chọn đáp án ${labelLetters[idx]}` : "Nhập đủ 4 đáp án trước"}
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                          isChecked
                            ? "bg-emerald-600 text-white"
                            : "border border-slate-300 bg-slate-50 text-slate-600"
                        }`}
                      >
                        {isChecked ? <Check className="h-4 w-4" /> : labelLetters[idx]}
                      </button>

                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMcOptions((prev) => prev.map((item, i) => (i === idx ? val : item)));
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder={`Phương án ${labelLetters[idx]}...`}
                        required
                        className="flex-1 bg-transparent text-xs font-medium focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isAddingQuestion}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                {isAddingQuestion ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span>Lưu câu hỏi trắc nghiệm</span>
              </button>
            </div>
          </form>
        )}

        {/* 2B. Form Tự luận */}
        {questionType === "essay" && (
          <form onSubmit={handleAddEssay} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">
                Đề bài câu hỏi tự luận <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={essayContent}
                onChange={(e) => setEssayContent(e.target.value)}
                placeholder="Nhập đề bài câu hỏi tự luận, yêu cầu bài tập hoặc câu hỏi giải thích..."
                rows={3}
                required
                className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-xs font-medium focus:border-purple-600 focus:outline-none transition-all shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">
                Hướng dẫn chấm / Đáp án gợi ý tham khảo (tùy chọn)
              </label>
              <textarea
                value={essayGuide}
                onChange={(e) => setEssayGuide(e.target.value)}
                placeholder="Gợi ý các ý chính cần trình bày hoặc đáp án mẫu..."
                rows={2}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-xs font-medium focus:border-purple-600 focus:outline-none transition-all shadow-2xs"
              />
              <p className="text-[11px] text-slate-400">
                Phần này dùng làm căn cứ đánh giá câu trả lời tự luận của học viên.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isAddingQuestion}
                className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-500/25 hover:bg-purple-700 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                {isAddingQuestion ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span>Lưu câu hỏi tự luận</span>
              </button>
            </div>
          </form>
        )}
      </section>

      {/* KHỐI 3: DANH SÁCH CÁC CÂU HỎI HIỆN CÓ TRONG KỲ THI */}
      <section className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900">
              Danh sách câu hỏi trong đề thi ({questions.length})
            </h2>
            <p className="text-xs text-slate-500">
              Xem lại toàn bộ câu hỏi trắc nghiệm và tự luận đã được lưu vào kỳ thi
            </p>
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-10 text-center">
            <FileQuestion className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700">Chưa có câu hỏi nào trong kỳ thi</p>
            <p className="mt-1 text-xs text-slate-400 max-w-sm">
              Hãy dùng biểu mẫu phía trên để thêm câu hỏi trắc nghiệm hoặc tự luận vào đề thi.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => {
              const isEssay = q.content.startsWith("[Tự luận]");
              const displayContent = isEssay ? q.content.replace(/^\[Tự luận\]\s*/i, "") : q.content;
              const isDeleting = deletingQuestionId === q.id;

              return (
                <div
                  key={q.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5 space-y-3 transition-all hover:bg-white hover:shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-black text-white">
                        {idx + 1}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isEssay
                                ? "bg-purple-100 text-purple-800 border border-purple-200"
                                : "bg-blue-100 text-blue-800 border border-blue-200"
                            }`}
                          >
                            {isEssay ? "Tự luận" : "Trắc nghiệm"}
                          </span>
                        </div>

                        <p className="mt-1.5 text-xs sm:text-sm font-bold text-slate-900 leading-relaxed">
                          {displayContent}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q.id)}
                      disabled={isDeleting}
                      title="Xóa câu hỏi này"
                      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Hiển thị chi tiết trắc nghiệm */}
                  {!isEssay && q.options && q.options.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2 pt-2 border-t border-slate-200/60 pl-8">
                      {q.options.map((opt, optIdx) => (
                        <div
                          key={opt.id}
                          className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold ${
                            opt.isCorrect
                              ? "bg-emerald-100/70 text-emerald-900 border border-emerald-300 font-bold"
                              : "bg-white text-slate-600 border border-slate-200"
                          }`}
                        >
                          <span className="shrink-0">{opt.isCorrect ? "✓" : "•"}</span>
                          <span className="truncate">{opt.content}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Hiển thị chi tiết tự luận */}
                  {isEssay && q.options && q.options[0]?.content && (
                    <div className="pt-2 border-t border-slate-200/60 pl-8 text-xs text-slate-600">
                      <span className="font-bold text-purple-700">Hướng dẫn chấm / Đáp án gợi ý: </span>
                      <span>{q.options[0].content.replace(/^\[Gợi ý chấm\]\s*/i, "")}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
