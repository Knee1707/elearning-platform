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

  // Bài học hiện tại
  const currentLesson: Lesson | undefined = allLessons.find((l) => l.id === currentLessonId) || allLessons[0];
  const currentIndex = allLessons.findIndex((l) => l.id === currentLesson?.id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

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
    <div className="flex h-[calc(100vh-65px)] flex-col md:flex-row overflow-hidden bg-background">
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
          className="h-full w-full"
        />
      </div>

      {/* Backdrop trên mobile khi mở sidebar */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
        />
      )}

      {/* 2. KHÔNG GIAN HỌC TẬP CHÍNH (CỘT PHẢI) */}
      <main className="flex flex-1 flex-col overflow-y-auto">
        {/* Thanh bar điều khiển trên cùng */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium md:hidden hover:bg-muted"
            >
              <ListFilter className="h-4 w-4 text-primary" />
              <span>Mục lục bài học</span>
            </button>
            <span className="hidden sm:inline-block text-xs font-medium text-muted-foreground">
              Đang học bài:
            </span>
            <span className="max-w-[240px] truncate text-xs font-semibold text-foreground sm:max-w-md">
              {currentLesson?.title ?? "Bài giảng"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Nút bài trước */}
            <button
              type="button"
              onClick={() => prevLesson && setCurrentLessonId(prevLesson.id)}
              disabled={!prevLesson}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
              title={prevLesson ? `Về bài: ${prevLesson.title}` : "Đây là bài đầu tiên"}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Bài trước</span>
            </button>

            {/* Nút đánh dấu hoàn thành */}
            <button
              type="button"
              onClick={handleCompleteLesson}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium shadow-sm transition-colors ${
                completedLessonIds.includes(currentLesson?.id ?? "")
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>
                {completedLessonIds.includes(currentLesson?.id ?? "") ? "Đã xong" : "Hoàn thành bài"}
              </span>
            </button>

            {/* Nút bài tiếp theo */}
            <button
              type="button"
              onClick={() => nextLesson && setCurrentLessonId(nextLesson.id)}
              disabled={!nextLesson}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
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
            <div className="rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
              Không có bài học nào trong khóa học này.
            </div>
          )}

          {/* Gợi ý bài thi Quiz nếu bài học có quiz đính kèm */}
          {currentLesson && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <FileQuestion className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">
                    Kiểm tra kiến thức với Quiz trắc nghiệm
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Củng cố lý thuyết của bài học này trước khi bước sang nội dung tiếp theo
                  </p>
                </div>
              </div>

              <Link
                href="/quiz/50000000-0000-0000-0000-000000000001"
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                <span>Làm Quiz ngay</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {/* HỆ THỐNG CÁC TABS TƯƠNG TÁC (TỔNG QUAN / GHI CHÚ / HỎI ĐÁP) */}
          <div className="mt-8">
            {/* Header Tabs */}
            <div className="flex border-b border-border">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
                  activeTab === "overview"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Tổng quan bài học</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("notes")}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
                  activeTab === "notes"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bookmark className="h-4 w-4" />
                <span>Ghi chú cá nhân</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("qa")}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
                  activeTab === "qa"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                <span>Hỏi - Đáp (Q&A)</span>
              </button>
            </div>

            {/* Nội dung Tab */}
            <div className="py-6">
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{currentLesson?.title}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Khóa học: <span className="font-medium text-foreground">{course.title}</span> • Giảng viên:{" "}
                      <span className="font-medium text-foreground">{course.instructorName}</span>
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Tóm tắt bài học & Mục tiêu
                    </h3>
                    <p className="text-xs leading-relaxed text-foreground">
                      {course.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                        <GraduationCap className="h-3.5 w-3.5" />
                        Cấp độ: {course.level === "beginner" ? "Cơ bản" : course.level === "intermediate" ? "Trung cấp" : "Nâng cao"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground">
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
