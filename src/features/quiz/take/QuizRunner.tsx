"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileQuestion,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Trophy,
  RotateCcw,
  Clock,
  Award,
  Loader2,
} from "lucide-react";
import { getQuiz, submitAttempt, type QuizData } from "@/lib/queries/quiz";

// Đề thi mẫu khi DB chưa kết nối hoặc chạy thử nghiệm
const FALLBACK_QUIZ: QuizData = {
  quizId: "50000000-0000-0000-0000-000000000001",
  quizTitle: "Quiz: App Router & Server Components cơ bản",
  passScore: 60,
  questions: [
    {
      questionId: "51000000-0000-0000-0000-000000000001",
      questionText: "Trong Next.js 14, cấu trúc thư mục nào định nghĩa file-system routing cho App Router?",
      position: 1,
      options: [
        { optionId: "52000000-0000-0000-0000-000000000001", optionText: "Thư mục app/" },
        { optionId: "52000000-0000-0000-0000-000000000002", optionText: "Thư mục pages/" },
        { optionId: "52000000-0000-0000-0000-000000000003", optionText: "Thư mục routes/" },
        { optionId: "52000000-0000-0000-0000-000000000004", optionText: "Thư mục src/views/" },
      ],
    },
    {
      questionId: "51000000-0000-0000-0000-000000000002",
      questionText: "File nào đóng vai trò là UI công khai (entry point) đại diện cho một đường dẫn route cụ thể?",
      position: 2,
      options: [
        { optionId: "52000000-0000-0000-0000-000000000005", optionText: "page.tsx" },
        { optionId: "52000000-0000-0000-0000-000000000006", optionText: "index.tsx" },
        { optionId: "52000000-0000-0000-0000-000000000007", optionText: "layout.tsx" },
        { optionId: "52000000-0000-0000-0000-000000000008", optionText: "route.tsx" },
      ],
    },
    {
      questionId: "51000000-0000-0000-0000-000000000003",
      questionText: "Mặc định, các components trong thư mục app/ của Next.js 14 là loại nào?",
      position: 3,
      options: [
        { optionId: "52000000-0000-0000-0000-000000000009", optionText: "React Server Components (RSC)" },
        { optionId: "52000000-0000-0000-0000-000000000010", optionText: "Client Components" },
        { optionId: "52000000-0000-0000-0000-000000000011", optionText: "Static HTML Templates" },
        { optionId: "52000000-0000-0000-0000-000000000012", optionText: "Web Workers" },
      ],
    },
  ],
};

export interface QuizRunnerProps {
  quizId: string;
  courseSlug?: string;
}

export function QuizRunner({ quizId, courseSlug = "nextjs-co-ban-nang-cao" }: QuizRunnerProps) {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    async function loadQuiz() {
      try {
        const data = await getQuiz(quizId);
        if (isMounted) {
          setQuiz(data);
        }
      } catch {
        if (isMounted) {
          setQuiz(FALLBACK_QUIZ);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadQuiz();

    return () => {
      isMounted = false;
    };
  }, [quizId]);

  // Chọn phương án
  function handleSelectOption(questionId: string, optionId: string) {
    if (result) return;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  }

  // Nộp bài làm
  async function handleSubmit() {
    if (!quiz) return;
    setIsSubmitting(true);

    try {
      const score = await submitAttempt(quiz.quizId, answers);
      setResult({
        score,
        passed: score >= quiz.passScore,
      });
    } catch {
      // Chấm điểm dự phòng khi offline
      let correctCount = 0;
      // Đáp án đúng theo seed: 52...001, 52...005, 52...009
      if (answers["51000000-0000-0000-0000-000000000001"] === "52000000-0000-0000-0000-000000000001") correctCount++;
      if (answers["51000000-0000-0000-0000-000000000002"] === "52000000-0000-0000-0000-000000000005") correctCount++;
      if (answers["51000000-0000-0000-0000-000000000003"] === "52000000-0000-0000-0000-000000000009") correctCount++;

      const calculatedScore = Math.round((correctCount / quiz.questions.length) * 100);
      setResult({
        score: calculatedScore,
        passed: calculatedScore >= quiz.passScore,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Làm lại bài
  function handleRetake() {
    setAnswers({});
    setCurrentIndex(0);
    setResult(null);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-xs text-muted-foreground">Đang tải nội dung bài quiz...</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
        <h3 className="mt-3 text-base font-semibold">Không tìm thấy bài quiz</h3>
        <p className="mt-1 text-xs text-muted-foreground">Vui lòng kiểm tra lại đường dẫn bài kiểm tra.</p>
        <Link
          href={`/learn/${courseSlug}`}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          Quay lại khóa học
        </Link>
      </div>
    );
  }

  // Màn hình kết quả sau khi nộp
  if (result) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm animate-in fade-in zoom-in-95">
        <div className="text-center">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
              result.passed ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
            }`}
          >
            {result.passed ? <Trophy className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
          </div>

          <h2 className="mt-4 text-xl font-bold text-foreground">
            {result.passed ? "Chúc mừng bạn đã hoàn thành bài thi!" : "Chưa đạt điểm yêu cầu"}
          </h2>

          <p className="mt-1.5 text-xs text-muted-foreground">
            {result.passed
              ? "Bạn đã xuất sắc vượt qua bài kiểm tra trắc nghiệm với điểm số ấn tượng."
              : `Bạn cần tối thiểu ${quiz.passScore} điểm để vượt qua bài kiểm tra này.`}
          </p>

          {/* Hộp điểm */}
          <div className="my-6 inline-flex flex-col items-center justify-center rounded-2xl border border-border bg-muted/30 px-8 py-4">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Điểm số đạt được</span>
            <span
              className={`text-4xl font-extrabold ${
                result.passed ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
              }`}
            >
              {result.score} / 100
            </span>
            <span className="mt-1 text-[11px] text-muted-foreground">
              Điểm đạt yêu cầu: <strong>{quiz.passScore} điểm</strong>
            </span>
          </div>

          {/* Nút hành động */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleRetake}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-muted"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Làm lại bài thi</span>
            </button>

            {result.passed && (
              <Link
                href="/certificates"
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-600"
              >
                <Award className="h-4 w-4" />
                <span>Xem chứng chỉ hoàn thành</span>
              </Link>
            )}

            <Link
              href={`/learn/${courseSlug}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <span>Tiếp tục bài học</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isAllAnswered = answeredCount === quiz.questions.length;

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
      {/* Header Quiz */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            Kiểm tra kiến thức
          </span>
          <h2 className="text-base font-bold text-foreground">{quiz.quizTitle}</h2>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>Điểm đạt: {quiz.passScore}/100</span>
          </span>
          <span>•</span>
          <span className="font-semibold text-foreground">
            Đã làm {answeredCount}/{quiz.questions.length} câu
          </span>
        </div>
      </div>

      {/* Thanh tiến độ câu hỏi */}
      <div className="mt-4 flex gap-1.5">
        {quiz.questions.map((q, idx) => (
          <button
            key={q.questionId}
            type="button"
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 flex-1 rounded-full transition-all ${
              idx === currentIndex
                ? "bg-primary"
                : answers[q.questionId]
                ? "bg-primary/40"
                : "bg-muted"
            }`}
            title={`Câu ${idx + 1}`}
          />
        ))}
      </div>

      {/* Nội dung câu hỏi */}
      {currentQuestion && (
        <div className="mt-6 space-y-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <FileQuestion className="h-4 w-4 text-primary" />
              <span>Câu hỏi {currentIndex + 1} / {quiz.questions.length}</span>
            </div>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-foreground">
              {currentQuestion.questionText}
            </p>
          </div>

          {/* Danh sách lựa chọn */}
          <div className="space-y-2.5">
            {currentQuestion.options.map((option) => {
              const isSelected = answers[currentQuestion.questionId] === option.optionId;

              return (
                <button
                  key={option.optionId}
                  type="button"
                  onClick={() => handleSelectOption(currentQuestion.questionId, option.optionId)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-xs transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary font-medium ring-2 ring-primary/30"
                      : "border-border/70 bg-card hover:border-primary/40 hover:bg-muted/30 text-foreground"
                  }`}
                >
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {isSelected ? "✓" : ""}
                  </div>
                  <span className="leading-snug">{option.optionText}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Điều hướng câu hỏi & Nộp bài */}
      <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Câu trước</span>
        </button>

        <div className="flex items-center gap-2">
          {currentIndex < quiz.questions.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.min(quiz.questions.length - 1, prev + 1))}
              className="inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <span>Câu tiếp</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Đang chấm điểm...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Nộp bài chấm điểm</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
