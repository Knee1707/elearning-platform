"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  MessageSquare,
  FileText,
  ListFilter,
  FileQuestion,
  GraduationCap,
  Sparkles,
  Award,
  Lock,
  RotateCcw,
  AlertCircle,
  Trophy,
  Loader2,
  Check,
} from "lucide-react";
import type { Lesson } from "@/types/domain";
import type { CourseDetail } from "@/lib/queries/courses";
import { LessonList } from "./LessonList";
import { VideoPlayer } from "./VideoPlayer";
import { LessonNotes } from "./LessonNotes";
import { LessonQa } from "./LessonQa";
import { markComplete, getCourseLessonsProgress } from "@/lib/queries/progress";
import {
  getQuizByLessonId,
  getQuizzesForLessons,
  submitLessonQuiz,
  type QuizData,
} from "@/lib/queries/quiz";
import { markComplete } from "@/lib/queries/progress";
import { createClient } from "@/lib/supabase/client";

export interface LearningWorkspaceProps {
  course: CourseDetail;
}

export function LearningWorkspace({ course }: LearningWorkspaceProps) {
  // Tập hợp danh sách phẳng toàn bộ bài học theo thứ tự chương
  const allLessons = useMemo(() => course.chapters.flatMap((c) => c.lessons), [course.chapters]);

  // Bài học đang xem
  const [currentLessonId, setCurrentLessonId] = useState<string>(() => {
    return allLessons[0]?.id ?? "";
  });

  // Danh sách các bài đã hoàn thành video (watched >= 95% hoặc bấm nút hoàn thành)
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`demo_completed_${course.id}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Bỏ qua
        }
      }
    }
    // Mặc định ban đầu chưa có bài nào hoàn thành, bài 1 bắt đầu học
    return [];
  });

  // Danh sách các bài đã vượt qua bài quiz (is_quiz_passed = true)
  const [quizPassedLessonIds, setQuizPassedLessonIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`demo_quiz_passed_${course.id}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Bỏ qua
        }
      }
    }
    return [];
  });

  // Bản đồ quiz đính kèm theo từng bài học { [lessonId]: { id, title, passScore } }
  const [quizzesMap, setQuizzesMap] = useState<
    Record<string, { id: string; title: string; passScore: number }>
  >({});

  // Cờ bypass mở khóa nếu là giảng viên phụ trách hoặc Admin
  const [isInstructorOrAdmin, setIsInstructorOrAdmin] = useState<boolean>(false);

  // Tab đang kích hoạt: "overview" | "quiz" | "notes" | "qa"
  const [activeTab, setActiveTab] = useState<"overview" | "quiz" | "notes" | "qa">("overview");

  // Vị trí giây hiện tại của video player để đồng bộ sang tab Ghi chú
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Mốc giây cần tua đến khi bấm từ ghi chú
  const [seekToTime, setSeekToTime] = useState<number | null>(null);

  // Đóng/mở sidebar trên màn hình nhỏ
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [finalExam, setFinalExam] = useState<{ examId: string; quizId: string; title: string; passScore: number } | null>(null);

  // Dữ liệu bài quiz của bài học đang chọn
  const [currentQuiz, setCurrentQuiz] = useState<QuizData | null>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState<boolean>(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState<boolean>(false);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    passScore: number;
    passed: boolean;
  } | null>(null);

  // Bài học hiện tại
  const currentLesson: Lesson | undefined = useMemo(() => {
    return allLessons.find((l) => l.id === currentLessonId) || allLessons[0];
  }, [allLessons, currentLessonId]);

  const currentIndex = useMemo(() => {
    return allLessons.findIndex((l) => l.id === currentLesson?.id);
  }, [allLessons, currentLesson?.id]);

  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
  const allLessonsCompleted = allLessons.length > 0 && allLessons.every((lesson) => completedLessonIds.includes(lesson.id));

  useEffect(() => {
    const supabase = createClient();
    async function loadFinalExam() {
      try {
        // 1. Thử truy vấn với cờ is_final nếu schema đã cập nhật
        let { data, error } = await supabase
          .from("exams")
          .select("id, quiz_id, title, pass_score")
          .eq("course_id", course.id)
          .eq("is_final", true)
          .maybeSingle();

        // 2. Nếu chưa có cờ is_final, tìm exam gắn với khóa học này
        if (!data || error) {
          const { data: exData } = await supabase
            .from("exams")
            .select("id, title, pass_score")
            .eq("course_id", course.id)
            .limit(1)
            .maybeSingle();

          if (exData) {
            setFinalExam({
              examId: String(exData.id),
              quizId: "50000000-0000-0000-0000-000000000002",
              title: String(exData.title),
              passScore: Number(exData.pass_score || 70),
            });
            return;
          }
        }

        if (data) {
          setFinalExam({
            examId: String(data.id),
            quizId: String(data.quiz_id || "50000000-0000-0000-0000-000000000002"),
            title: String(data.title),
            passScore: Number(data.pass_score || 70),
          });
        }
      } catch {}
    }

    loadFinalExam();
  }, [course.id]);

  // 1. Tải danh sách quiz và tiến độ thực tế từ Supabase khi mở khóa học
  useEffect(() => {
    let isMounted = true;
    const lessonIds = allLessons.map((l) => l.id);

    async function initCourseData() {
      // 1.1 Lấy thông tin các bài quiz gắn với các bài học
      try {
        const qMap = await getQuizzesForLessons(lessonIds);
        if (isMounted) {
          setQuizzesMap(qMap);
        }
      } catch {
        // Dự phòng
      }

      // 1.2 Lấy tiến độ học tập và điểm quiz đã lưu trên Database
      try {
        const progressMap = await getCourseLessonsProgress(lessonIds);
        if (isMounted) {
          const completedFromDb = Object.values(progressMap)
            .filter((p) => p.isCompleted || p.watchedPercent >= 95)
            .map((p) => p.lessonId);
          const quizPassedFromDb = Object.values(progressMap)
            .filter((p) => p.isQuizPassed)
            .map((p) => p.lessonId);

          if (completedFromDb.length > 0) {
            setCompletedLessonIds((prev) => [...new Set([...prev, ...completedFromDb])]);
          }
          if (quizPassedFromDb.length > 0) {
            setQuizPassedLessonIds((prev) => [...new Set([...prev, ...quizPassedFromDb])]);
          }
        }
      } catch {
        // Dự phòng
      }

      // 1.3 Kiểm tra vai trò Admin hoặc Giảng viên sở hữu khóa
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user && user.id === course.instructorId) {
          setIsInstructorOrAdmin(true);
        } else if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();
          if (profile?.role === "instructor" || profile?.role === "admin") {
            setIsInstructorOrAdmin(true);
          }
        }
      } catch {
        // Bỏ qua
      }
    }

    initCourseData();

    return () => {
      isMounted = false;
    };
  }, [course.id, course.instructorId, allLessons]);

  // 2. Tải chi tiết bài quiz khi chuyển sang bài học khác
  useEffect(() => {
    let isMounted = true;
    setQuizResult(null);
    setQuizAnswers({});

    if (!currentLesson?.id) {
      setCurrentQuiz(null);
      return;
    }

    const lessonId = currentLesson.id;

    async function loadQuiz() {
      setIsLoadingQuiz(true);
      try {
        const quiz = await getQuizByLessonId(lessonId);
        if (isMounted) {
          setCurrentQuiz(quiz);
        }
      } catch {
        if (isMounted) {
          setCurrentQuiz(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingQuiz(false);
        }
      }
    }

    loadQuiz();

    return () => {
      isMounted = false;
    };
  }, [currentLesson]);

  // 3. Lưu tiến độ vào localStorage để duy trì trạng thái mượt mà khi demo/offline
  useEffect(() => {
    if (typeof window !== "undefined" && course.id) {
      localStorage.setItem(`demo_completed_${course.id}`, JSON.stringify(completedLessonIds));
    }
  }, [completedLessonIds, course.id]);

  useEffect(() => {
    if (typeof window !== "undefined" && course.id) {
      localStorage.setItem(`demo_quiz_passed_${course.id}`, JSON.stringify(quizPassedLessonIds));
    }
  }, [quizPassedLessonIds, course.id]);

  // 4. TÍNH TOÁN DANH SÁCH BÀI HỌC ĐƯỢC MỞ KHÓA TUẦN TỰ (Sequential Unlock Computation)
  // - Bài 1 luôn được mở khóa.
  // - Bài N (N > 1) chỉ được mở khóa khi bài N-1:
  //   + Đã xem hết video (completedLessonIds)
  //   + Đã pass quiz (quizPassedLessonIds) nếu bài N-1 có quiz.
  // - Giảng viên / Admin mở khóa toàn bộ.
  const unlockedLessonIds = useMemo(() => {
    if (allLessons.length === 0) return [];
    if (isInstructorOrAdmin) return allLessons.map((l) => l.id);

    const unlocked: string[] = [allLessons[0].id];

    for (let i = 1; i < allLessons.length; i++) {
      const prev = allLessons[i - 1];
      const prevUnlocked = unlocked.includes(prev.id);
      const prevVideoDone = completedLessonIds.includes(prev.id);
      const prevHasQuiz = Boolean(quizzesMap[prev.id]) || prev.title.toLowerCase().includes("quiz");
      const prevQuizDone = quizPassedLessonIds.includes(prev.id);

      if (prevUnlocked && prevVideoDone && (!prevHasQuiz || prevQuizDone)) {
        unlocked.push(allLessons[i].id);
      } else {
        // Dừng mở khóa các bài tiếp theo nếu bài trước chưa hoàn thành
        break;
      }
    }

    return unlocked;
  }, [allLessons, completedLessonIds, quizPassedLessonIds, quizzesMap, isInstructorOrAdmin]);

  // Kiểm tra bài hiện tại có mở khóa hay không
  const isCurrentLessonUnlocked = unlockedLessonIds.includes(currentLesson?.id ?? "");

  // Lý do khóa chi tiết để hiển thị trên Player
  const currentLockReason = useMemo(() => {
    if (isCurrentLessonUnlocked || !prevLesson) return "";
    const prevVideoDone = completedLessonIds.includes(prevLesson.id);
    const prevHasQuiz = Boolean(quizzesMap[prevLesson.id]) || prevLesson.title.toLowerCase().includes("quiz");
    const prevQuizDone = quizPassedLessonIds.includes(prevLesson.id);

    if (!prevVideoDone) {
      return `Bạn cần xem hết video bài giảng trước ("${prevLesson.title}") để mở khóa bài học này.`;
    }
    if (prevHasQuiz && !prevQuizDone) {
      return `Bạn cần làm bài quiz và đạt điểm chuẩn bài trước ("${prevLesson.title}") để mở khóa bài học này.`;
    }
    return "Bài học này chưa được mở khóa theo lộ trình tuần tự.";
  }, [isCurrentLessonUnlocked, prevLesson, completedLessonIds, quizzesMap, quizPassedLessonIds]);

  // Cờ bài hiện tại có quiz và đã pass quiz chưa
  const currentLessonHasQuiz = Boolean(quizzesMap[currentLesson?.id ?? ""]) || Boolean(currentQuiz);
  const isCurrentQuizPassed = quizPassedLessonIds.includes(currentLesson?.id ?? "");

  // 5. Đánh dấu hoàn thành video bài học
  async function handleCompleteLesson() {
    if (!currentLesson) return;

    try {
      await markComplete(currentLesson.id);
    } catch {
      // Tiếp tục cập nhật UI khi offline
    }

    if (!completedLessonIds.includes(currentLesson.id)) {
      setCompletedLessonIds((prev) => [...prev, currentLesson.id]);
    }

    // Nếu bài này có quiz chưa làm pass, tự động mở tab Quiz để nhắc nhở học viên
    if (currentLessonHasQuiz && !isCurrentQuizPassed) {
      setActiveTab("quiz");
    } else if (nextLesson && unlockedLessonIds.includes(nextLesson.id)) {
      // Nếu không có quiz hoặc quiz đã pass và bài tiếp đã mở khóa, chuyển bài tiếp
      setCurrentLessonId(nextLesson.id);
    }
  }

  // 6. Xử lý nộp bài quiz bài học
  async function handleQuizSubmit() {
    if (!currentQuiz || !currentLesson) return;
    setIsSubmittingQuiz(true);

    try {
      const res = await submitLessonQuiz(currentQuiz.quizId, quizAnswers);
      setQuizResult({
        score: res.score,
        passScore: res.passScore,
        passed: res.passed,
      });

      if (res.passed) {
        if (!quizPassedLessonIds.includes(currentLesson.id)) {
          setQuizPassedLessonIds((prev) => [...prev, currentLesson.id]);
        }
      }
    } catch {
      // Dự phòng offline
      let correctCount = 0;
      if (quizAnswers["51000000-0000-0000-0000-000000000001"] === "52000000-0000-0000-0000-000000000001") correctCount++;
      if (quizAnswers["51000000-0000-0000-0000-000000000002"] === "52000000-0000-0000-0000-000000000005") correctCount++;
      if (quizAnswers["51000000-0000-0000-0000-000000000003"] === "52000000-0000-0000-0000-000000000009") correctCount++;

      const calculatedScore = Math.round(
        (correctCount / (currentQuiz.questions.length || 1)) * 100
      );
      const passed = calculatedScore >= currentQuiz.passScore;

      setQuizResult({
        score: calculatedScore,
        passScore: currentQuiz.passScore,
        passed,
      });

      if (passed) {
        if (!quizPassedLessonIds.includes(currentLesson.id)) {
          setQuizPassedLessonIds((prev) => [...prev, currentLesson.id]);
        }
      }
    } finally {
      setIsSubmittingQuiz(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-65px)] flex-col md:flex-row overflow-hidden bg-[#F8FAFC]">
      {/* 1. MỤC LỤC CHƯƠNG & BÀI HỌC (CỘT TRÁI TRÊN DESKTOP) */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-80 transform transition-transform duration-200 ease-in-out md:static md:w-80 lg:w-96 md:translate-x-0 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <LessonList
          courseId={course.id}
          courseTitle={course.title}
          courseSlug={course.slug}
          chapters={course.chapters}
          currentLessonId={currentLesson?.id}
          completedLessonIds={completedLessonIds}
          unlockedLessonIds={unlockedLessonIds}
          quizLessonIds={Object.keys(quizzesMap)}
          quizPassedLessonIds={quizPassedLessonIds}
          onSelectLesson={(id) => {
            setCurrentLessonId(id);
            setMobileSidebarOpen(false);
          }}
          className="h-full w-full shadow-sm"
        />
      </div>

      {/* Backdrop trên mobile khi mở sidebar */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* 2. KHÔNG GIAN HỌC TẬP CHÍNH (CỘT PHẢI) */}
      <main className="flex flex-1 flex-col overflow-y-auto">
        {/* Thanh bar điều khiển trên cùng */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur shadow-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 md:hidden hover:bg-slate-50 hover:text-blue-600 shadow-xs"
            >
              <ListFilter className="h-4 w-4 text-blue-600" />
              <span>Mục lục bài học</span>
            </button>
            <span className="hidden sm:inline-block text-xs font-semibold text-slate-400">
              Đang học:
            </span>
            <span className="max-w-[220px] truncate text-xs font-bold text-slate-900 sm:max-w-md">
              {currentLesson?.title ?? "Bài giảng"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Nút bài trước */}
            <button
              type="button"
              onClick={() => prevLesson && setCurrentLessonId(prevLesson.id)}
              disabled={!prevLesson}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 shadow-xs active:scale-95"
              title={prevLesson ? `Về bài: ${prevLesson.title}` : "Đây là bài đầu tiên"}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Bài trước</span>
            </button>

            {/* Nút đánh dấu hoàn thành video bài học */}
            <button
              type="button"
              onClick={handleCompleteLesson}
              disabled={!isCurrentLessonUnlocked}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 ${
                completedLessonIds.includes(currentLesson?.id ?? "")
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>
                {completedLessonIds.includes(currentLesson?.id ?? "") ? "Đã xong video" : "Hoàn thành video"}
              </span>
            </button>

            {/* Nút bài tiếp theo */}
            <button
              type="button"
              onClick={() => {
                if (nextLesson && unlockedLessonIds.includes(nextLesson.id)) {
                  setCurrentLessonId(nextLesson.id);
                }
              }}
              disabled={!nextLesson || !unlockedLessonIds.includes(nextLesson.id)}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 shadow-xs active:scale-95"
              title={
                !nextLesson
                  ? "Đây là bài cuối cùng"
                  : !unlockedLessonIds.includes(nextLesson.id)
                  ? "Bài tiếp theo đang bị khóa (cần xem hết video và làm pass quiz bài này)"
                  : `Tới bài: ${nextLesson.title}`
              }
            >
              <span className="hidden sm:inline">Bài tiếp</span>
              {nextLesson && !unlockedLessonIds.includes(nextLesson.id) ? (
                <Lock className="h-3.5 w-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Trình phát Video */}
        <div className="p-4 sm:p-6 max-w-5xl mx-auto w-full">
          {currentLesson ? (
            <VideoPlayer
              key={currentLesson.id}
              lessonId={currentLesson.id}
              isFree={currentLesson.isFree}
              isLocked={!isCurrentLessonUnlocked}
              lockReason={currentLockReason}
              onGoToPreviousLesson={() => prevLesson && setCurrentLessonId(prevLesson.id)}
              onTimeUpdate={(time) => setCurrentTime(time)}
              onEnded={handleCompleteLesson}
              seekToTime={seekToTime}
              onSeekComplete={() => setSeekToTime(null)}
            />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-xs">
              Không có bài học nào trong khóa học này.
            </div>
          )}

          {/* Banner thông báo Quiz mở khóa tuần tự */}
          {currentLesson && isCurrentLessonUnlocked && currentLessonHasQuiz && (
            <div
              className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 shadow-xs transition-all ${
                isCurrentQuizPassed
                  ? "border-emerald-200 bg-gradient-to-r from-emerald-50/90 to-teal-50/60"
                  : "border-blue-200 bg-gradient-to-r from-blue-50/90 to-indigo-50/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-sm ${
                    isCurrentQuizPassed
                      ? "bg-emerald-600 shadow-emerald-500/25"
                      : "bg-blue-600 shadow-blue-500/25"
                  }`}
                >
                  {isCurrentQuizPassed ? (
                    <Trophy className="h-5 w-5" />
                  ) : (
                    <FileQuestion className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">
                      {isCurrentQuizPassed
                        ? "Đã vượt qua bài kiểm tra quiz!"
                        : "Bài kiểm tra Quiz đánh giá bài học"}
                    </h4>
                    {isCurrentQuizPassed ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                        Đã mở khóa bài tiếp theo
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                        Bắt buộc để mở khóa
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-600 font-medium">
                    {isCurrentQuizPassed
                      ? "Bạn đã hoàn thành yêu cầu kiến thức bài này và có thể học tiếp bài sau."
                      : `Cần đạt tối thiểu ${
                          currentQuiz?.passScore ?? 60
                        }/100 điểm để mở khóa bài giảng tiếp theo.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("quiz")}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white shadow-sm transition-all active:scale-95 ${
                    isCurrentQuizPassed
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                      : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                  }`}
                >
                  <FileQuestion className="h-3.5 w-3.5" />
                  <span>{isCurrentQuizPassed ? "Xem lại bài Quiz" : "Làm bài Quiz ngay"}</span>
                </button>

                {isCurrentQuizPassed && nextLesson && (
                  <button
                    type="button"
                    onClick={() => setCurrentLessonId(nextLesson.id)}
                    className="flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-all active:scale-95"
                  >
                    <span>Bài tiếp</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <Link
                href={`/quiz/50000000-0000-0000-0000-000000000001?exam=60000000-0000-0000-0000-000000000001&course=${course.slug}`}
                className="flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
              >
                <span>Làm Quiz ngay</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {/* HỆ THỐNG CÁC TABS TƯƠNG TÁC (TỔNG QUAN / BÀI QUIZ / GHI CHÚ / HỎI ĐÁP) */}

          {finalExam && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-xs">
              <div>
                <h4 className="text-xs font-bold text-slate-900">{finalExam.title}</h4>
                <p className="mt-1 text-[11px] text-slate-500">Hoàn thành toàn bộ bài học và đạt từ {finalExam.passScore}/100 để gửi yêu cầu chứng nhận.</p>
              </div>
              {allLessonsCompleted ? <Link href={`/quiz/${finalExam.quizId}?exam=${finalExam.examId}`} className="rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600">Thi cuối khóa</Link> : <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-500">Chưa hoàn thành nội dung</span>}
            </div>
          )}

          {/* HỆ THỐNG CÁC TABS TƯƠNG TÁC (TỔNG QUAN / GHI CHÚ / HỎI ĐÁP) */}
          <div className="mt-8">
            {/* Header Tabs */}
            <div className="flex border-b border-slate-200 gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
                  activeTab === "overview"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Tổng quan bài học</span>
              </button>

              {currentLessonHasQuiz && (
                <button
                  type="button"
                  onClick={() => setActiveTab("quiz")}
                  className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
                    activeTab === "quiz"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <FileQuestion className="h-4 w-4" />
                  <span>Bài Quiz</span>
                  {isCurrentQuizPassed ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                      <Check className="h-3 w-3" />
                      Đạt
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                      Cần làm
                    </span>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab("notes")}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
                  activeTab === "notes"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <Bookmark className="h-4 w-4" />
                <span>Ghi chú cá nhân</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("qa")}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
                  activeTab === "qa"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                <span>Hỏi - Đáp (Q&A)</span>
              </button>
            </div>

            {/* Nội dung Tab */}
            <div className="py-6">
              {/* TAB 1: TỔNG QUAN */}
              {activeTab === "overview" && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{currentLesson?.title}</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Khóa học: <span className="font-semibold text-slate-800">{course.title}</span> • Giảng viên:{" "}
                      <span className="font-semibold text-slate-800">{course.instructorName}</span>
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Tóm tắt bài học & Mục tiêu
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-600">
                      {course.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200/60">
                        <GraduationCap className="h-3.5 w-3.5" />
                        Cấp độ: {course.level === "beginner" ? "Cơ bản" : course.level === "intermediate" ? "Trung cấp" : "Nâng cao"}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
                        <Award className="h-3.5 w-3.5" />
                        Có cấp chứng chỉ hoàn thành
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: BÀI QUIZ TRẮC NGHIỆM */}
              {activeTab === "quiz" && (
                <div className="space-y-6">
                  {isLoadingQuiz ? (
                    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      <p className="mt-3 text-xs font-medium text-slate-500">Đang tải đề thi quiz...</p>
                    </div>
                  ) : !currentQuiz ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                      <FileQuestion className="mx-auto h-10 w-10 text-slate-300" />
                      <h4 className="mt-3 text-sm font-bold text-slate-800">
                        Bài học này không có bài quiz kiểm tra
                      </h4>
                      <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                        Bạn chỉ cần xem hết video bài giảng để hệ thống tự động mở khóa bài học kế tiếp.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Tiêu đề Quiz & Yêu cầu */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                              Bài kiểm tra trắc nghiệm
                            </span>
                            <h3 className="mt-0.5 text-base font-black text-slate-900">
                              {currentQuiz.quizTitle}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                              Điểm chuẩn: {currentQuiz.passScore}/100
                            </span>
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                              {currentQuiz.questions.length} câu hỏi
                            </span>
                          </div>
                        </div>

                        {/* Kết quả sau khi nộp bài */}
                        {quizResult && (
                          <div
                            className={`mt-4 rounded-xl border p-4 text-xs ${
                              quizResult.passed
                                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                : "border-amber-200 bg-amber-50 text-amber-900"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {quizResult.passed ? (
                                <Trophy className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                              ) : (
                                <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <p className="font-bold text-sm">
                                  {quizResult.passed
                                    ? `🎉 Chúc mừng! Bạn đạt ${quizResult.score}/100 điểm (Đã Đạt)`
                                    : `Chưa đạt: Bạn đạt ${quizResult.score}/100 điểm (Yêu cầu: ${quizResult.passScore})`}
                                </p>
                                <p className="mt-1 leading-relaxed text-slate-700">
                                  {quizResult.passed
                                    ? "Bài học tiếp theo đã được mở khóa thành công. Bạn có thể bấm nút bên dưới để chuyển sang bài mới hoặc làm lại để cải thiện điểm."
                                    : "Bạn cần vượt qua bài quiz để mở khóa bài học tiếp theo. Hãy xem lại kỹ video bài giảng và thử làm lại nhé."}
                                </p>
                                <div className="mt-3 flex items-center gap-2">
                                  {quizResult.passed && nextLesson && (
                                    <button
                                      type="button"
                                      onClick={() => setCurrentLessonId(nextLesson.id)}
                                      className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all active:scale-95"
                                    >
                                      <span>Học tiếp bài sau</span>
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQuizAnswers({});
                                      setQuizResult(null);
                                    }}
                                    className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                    <span>Làm lại bài quiz</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Danh sách câu hỏi */}
                      <div className="space-y-4">
                        {currentQuiz.questions.map((q, qIndex) => (
                          <div
                            key={q.questionId}
                            className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs"
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                                {qIndex + 1}
                              </span>
                              <p className="text-xs font-bold text-slate-900 leading-relaxed pt-0.5">
                                {q.questionText}
                              </p>
                            </div>

                            <div className="mt-4 space-y-2 pl-8">
                              {q.options.map((opt) => {
                                const isSelected = quizAnswers[q.questionId] === opt.optionId;
                                return (
                                  <button
                                    key={opt.optionId}
                                    type="button"
                                    onClick={() => {
                                      if (quizResult?.passed) return;
                                      setQuizAnswers((prev) => ({
                                        ...prev,
                                        [q.questionId]: opt.optionId,
                                      }));
                                    }}
                                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-xs transition-all ${
                                      isSelected
                                        ? "border-blue-600 bg-blue-50/70 text-blue-900 font-semibold ring-2 ring-blue-500/20"
                                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                                    }`}
                                  >
                                    <div
                                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                        isSelected
                                          ? "border-blue-600 bg-blue-600 text-white"
                                          : "border-slate-300 bg-white"
                                      }`}
                                    >
                                      {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                    </div>
                                    <span className="flex-1">{opt.optionText}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Nút nộp bài */}
                      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                        <span className="text-xs text-slate-500 font-medium">
                          Đã chọn:{" "}
                          <strong className="text-slate-800">
                            {Object.keys(quizAnswers).length}/{currentQuiz.questions.length}
                          </strong>{" "}
                          câu
                        </span>

                        <button
                          type="button"
                          onClick={handleQuizSubmit}
                          disabled={
                            isSubmittingQuiz ||
                            Object.keys(quizAnswers).length === 0 ||
                            Boolean(quizResult?.passed)
                          }
                          className="flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
                        >
                          {isSubmittingQuiz ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Đang chấm điểm...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Nộp bài Quiz</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: GHI CHÚ */}
              {activeTab === "notes" && currentLesson && (
                <LessonNotes
                  lessonId={currentLesson.id}
                  currentTime={currentTime}
                  onSeek={(seconds) => setSeekToTime(seconds)}
                />
              )}

              {/* TAB 4: HỎI ĐÁP */}
              {activeTab === "qa" && currentLesson && (
                <LessonQa lessonId={currentLesson.id} />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
