"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import type { Lesson } from "@/types/domain";
import type { CourseDetail } from "@/lib/queries/courses";
import { LessonList } from "./LessonList";
import { VideoPlayer } from "./VideoPlayer";
import { LessonNotes } from "./LessonNotes";
import { LessonQa } from "./LessonQa";
import { markComplete } from "@/lib/queries/progress";
import { createClient } from "@/lib/supabase/client";

export interface LearningWorkspaceProps {
  course: CourseDetail;
}

export function LearningWorkspace({ course }: LearningWorkspaceProps) {
  // Tập hợp danh sách phẳng toàn bộ bài học theo thứ tự chương
  const allLessons = course.chapters.flatMap((c) => c.lessons);

  // Bài học đang xem
  const [currentLessonId, setCurrentLessonId] = useState<string>(() => {
    return allLessons[0]?.id ?? "";
  });

  // Danh sách các bài đã hoàn thành
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
    // Mặc định bài 1 hoàn thành mẫu
    return allLessons.length > 0 ? [allLessons[0].id] : [];
  });

  // Tab đang kích hoạt: "overview" | "notes" | "qa"
  const [activeTab, setActiveTab] = useState<"overview" | "notes" | "qa">("overview");

  // Vị trí giây hiện tại của video player để đồng bộ sang tab Ghi chú
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Mốc giây cần tua đến khi bấm từ ghi chú
  const [seekToTime, setSeekToTime] = useState<number | null>(null);

  // Đóng/mở sidebar trên màn hình nhỏ
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [finalExam, setFinalExam] = useState<{ examId: string; quizId: string; title: string; passScore: number } | null>(null);
  const [currentLessonQuiz, setCurrentLessonQuiz] = useState<{ id: string; title: string; passScore: number } | null>(null);

  // Bài học hiện tại
  const currentLesson: Lesson | undefined = allLessons.find((l) => l.id === currentLessonId) || allLessons[0];
  const currentIndex = allLessons.findIndex((l) => l.id === currentLesson?.id);
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

  // Tải tiến độ các bài học đã hoàn thành từ Database (Supabase)
  useEffect(() => {
    const supabase = createClient();
    async function loadLessonProgress() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) return;

        const lessonIds = allLessons.map((l) => l.id);
        if (lessonIds.length === 0) return;

        const { data, error } = await supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("user_id", session.user.id)
          .eq("is_completed", true)
          .in("lesson_id", lessonIds);

        if (!error && data && data.length > 0) {
          const dbCompletedIds = data.map((d: any) => String(d.lesson_id));
          setCompletedLessonIds((prev) => {
            const merged = Array.from(new Set([...prev, ...dbCompletedIds]));
            return merged;
          });
        }
      } catch {
        // Dự phòng offline
      }
    }

    loadLessonProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id]);

  // Tra cứu quiz gắn riêng với bài học hiện tại (nếu có)
  useEffect(() => {
    if (!currentLesson?.id) {
      setCurrentLessonQuiz(null);
      return;
    }
    const supabase = createClient();
    supabase
      .from("quizzes")
      .select("id, title, pass_score")
      .eq("lesson_id", currentLesson.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setCurrentLessonQuiz({
            id: String(data.id),
            title: String(data.title),
            passScore: Number(data.pass_score),
          });
        } else {
          setCurrentLessonQuiz(null);
        }
      });
  }, [currentLesson?.id]);

  // Lưu danh sách bài đã hoàn thành vào localStorage để giữ state mượt mà khi test
  useEffect(() => {
    if (typeof window !== "undefined" && course.id) {
      localStorage.setItem(`demo_completed_${course.id}`, JSON.stringify(completedLessonIds));
    }
  }, [completedLessonIds, course.id]);

  // Đánh dấu hoàn thành bài học
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

    // Tự động chuyển sang bài tiếp theo nếu có
    if (nextLesson) {
      setCurrentLessonId(nextLesson.id);
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

            {/* Nút đánh dấu hoàn thành */}
            <button
              type="button"
              onClick={handleCompleteLesson}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold shadow-xs transition-all active:scale-95 ${
                completedLessonIds.includes(currentLesson?.id ?? "")
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>
                {completedLessonIds.includes(currentLesson?.id ?? "") ? "Đã xong bài" : "Hoàn thành bài"}
              </span>
            </button>

            {/* Nút bài tiếp theo */}
            <button
              type="button"
              onClick={() => nextLesson && setCurrentLessonId(nextLesson.id)}
              disabled={!nextLesson}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 shadow-xs active:scale-95"
              title={nextLesson ? `Tới bài: ${nextLesson.title}` : "Đây là bài cuối cùng"}
            >
              <span className="hidden sm:inline">Bài tiếp</span>
              <ChevronRight className="h-3.5 w-3.5" />
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

          {/* Gợi ý bài thi Quiz nếu bài học có quiz đính kèm */}
          {currentLesson && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/90 to-indigo-50/50 p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-500/25">
                  <FileQuestion className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {currentLessonQuiz ? currentLessonQuiz.title : "Kiểm tra kiến thức với Quiz trắc nghiệm"}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {currentLessonQuiz
                      ? `Điểm đạt yêu cầu: ${currentLessonQuiz.passScore}/100`
                      : "Củng cố lý thuyết của bài học này trước khi bước sang nội dung tiếp theo"}
                  </p>
                </div>
              </div>

              <Link
                href={`/quiz/${currentLessonQuiz?.id || "50000000-0000-0000-0000-000000000001"}?exam=${finalExam?.examId || "60000000-0000-0000-0000-000000000001"}&course=${course.slug}`}
                className="flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
              >
                <span>{currentLessonQuiz ? "Làm Quiz bài học" : "Làm Quiz ngay"}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {finalExam && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-xs">
              <div>
                <h4 className="text-xs font-bold text-slate-900">{finalExam.title}</h4>
                <p className="mt-1 text-[11px] text-slate-500">Hoàn thành toàn bộ bài học và đạt từ {finalExam.passScore}/100 để gửi yêu cầu chứng nhận.</p>
              </div>
              {allLessonsCompleted ? (
                <Link
                  href={`/quiz/${finalExam.quizId}?exam=${finalExam.examId}&course=${course.slug}`}
                  className="rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 shadow-sm transition-all active:scale-95"
                >
                  Thi cuối khóa
                </Link>
              ) : (
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
                  Chưa hoàn thành nội dung
                </span>
              )}
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

              {activeTab === "notes" && currentLesson && (
                <LessonNotes
                  lessonId={currentLesson.id}
                  currentTime={currentTime}
                  onSeek={(seconds) => setSeekToTime(seconds)}
                />
              )}

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
